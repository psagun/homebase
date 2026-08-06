"""Notifications endpoint — aggregates data from tasks, insurance, mortgages."""
import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.dependencies import get_current_user, get_db
from backend.services import notification_service
from backend.models.insurance_policy import InsurancePolicy
from backend.models.mortgage import Mortgage
from backend.models.property import Property
from backend.models.property_investor import PropertyInvestor
from backend.models.task import Task, TaskStatus
from backend.models.user import User

router = APIRouter()


def _get_visible_property_ids(db: Session, user: User) -> list:
    """Get property IDs visible to this user based on role."""
    # Normalize raw row values (hex32 str on SQLite) to uuid.UUID so the
    # ORM IN() binds work on both dialects
    def _as_uuid(value):
        return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))

    if user.role == "investor":
        rows = db.execute(
            text("SELECT property_id FROM property_investors WHERE user_id = :uid"),
            {"uid": _hex(user.id)},
        ).fetchall()
        return [_as_uuid(r[0]) for r in rows]
    else:
        rows = db.execute(
            text("SELECT id FROM properties WHERE user_id = :uid AND archived_at IS NULL"),
            {"uid": _hex(user.id)},
        ).fetchall()
        return [_as_uuid(r[0]) for r in rows]


def _hex(uid) -> str:
    """UUID as 32-char hex — portable bind/key format for raw SQL.

    SQLite stores UUID columns as hex-without-dashes; Postgres accepts
    bare hex too, so this form works on both dialects.
    """
    return str(uid).replace("-", "")


def _load_property_names(db: Session, ids: list) -> dict:
    """Batch-load property names in ONE query (avoids N+1 lookups)."""
    unique = {pid for pid in ids if pid}
    if not unique:
        return {}
    placeholders = ",".join([f":p{i}" for i in range(len(unique))])
    rows = db.execute(
        text(f"SELECT id, name FROM properties WHERE id IN ({placeholders})"),
        {f"p{i}": _hex(pid) for i, pid in enumerate(unique)},
    ).fetchall()
    return {_hex(r[0]): str(r[1]) for r in rows}


@router.get("/prefs")
def get_notification_prefs(
    current_user: User = Depends(get_current_user),
):
    """Return the user's email-notification category prefs."""
    return {"prefs": notification_service.get_prefs(current_user)}


@router.put("/prefs")
def update_notification_prefs(
    prefs: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Persist per-category email-notification toggles."""
    updated = notification_service.set_prefs(current_user, prefs)
    db.commit()
    return {"prefs": updated}


@router.post("/read")
def mark_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all notifications as read by updating the read timestamp."""
    current_user.notifications_read_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "ok"}


@router.get("")
def get_notifications(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    """Aggregate notifications from tasks, mortgages, and insurance."""
    today = date.today()
    prop_ids = _get_visible_property_ids(db, current_user)
    notifications = []

    if not prop_ids:
        return {"notifications": [], "unread_count": 0}

    # Helper: get property tasks by status(es)
    def _tasks_by_status(statuses: list[str]) -> list:
        return db.query(Task).filter(
            Task.property_id.in_(prop_ids),
            Task.user_id == current_user.id,
            Task.status.in_(statuses),
        ).all()

    # Helper: get upcoming tasks
    def _upcoming_tasks() -> list:
        excluded = [TaskStatus.COMPLETED, TaskStatus.DISMISSED,
                    TaskStatus.OVERDUE, TaskStatus.DUE_TODAY]
        return db.query(Task).filter(
            Task.property_id.in_(prop_ids),
            Task.user_id == current_user.id,
            Task.due_date >= today,
            Task.due_date <= today + timedelta(days=7),
            ~Task.status.in_(excluded),
        ).all()

    overdue_tasks = _tasks_by_status([TaskStatus.OVERDUE])
    due_today_tasks = _tasks_by_status([TaskStatus.DUE_TODAY])
    upcoming_tasks = _upcoming_tasks()
    mortgages = db.query(Mortgage).filter(
        Mortgage.property_id.in_(prop_ids),
        Mortgage.is_active == True,
        Mortgage.next_due_date.isnot(None),
    ).all()

    # Batch-load all property names in a single query
    all_prop_ids = (
        [t.property_id for t in overdue_tasks + due_today_tasks + upcoming_tasks]
        + [m.property_id for m in mortgages]
    )
    prop_names = _load_property_names(db, all_prop_ids)

    def name_of(pid, title=""):
        """Property name suffix; omitted when the title already carries it
        (seed titles follow the '<task> - <Property Name>' convention)."""
        name = prop_names.get(_hex(pid)) if pid else None
        if not name:
            return ""
        if title.endswith(f" - {name}"):
            return ""
        return f" — {name}"

    # Overdue tasks
    for t in overdue_tasks:
        notifications.append({
            "id": f"task-overdue-{t.id}",
            "title": f"Overdue: {t.title}{name_of(t.property_id, t.title)}",
            "type": "task_overdue", "severity": "error",
            "link": f"/properties/{t.property_id}" if t.property_id else "/tasks",
            "read": False, "date": str(t.due_date or ""),
        })

    # Due today
    for t in due_today_tasks:
        notifications.append({
            "id": f"task-today-{t.id}",
            "title": f"Due today: {t.title}{name_of(t.property_id, t.title)}",
            "type": "task_due_today", "severity": "warning",
            "link": f"/properties/{t.property_id}" if t.property_id else "/tasks",
            "read": False, "date": str(t.due_date or ""),
        })

    # Upcoming (next 7 days)
    for t in upcoming_tasks:
        notifications.append({
            "id": f"task-upcoming-{t.id}",
            "title": f"Upcoming: {t.title}{name_of(t.property_id, t.title)}",
            "type": "task_upcoming", "severity": "info",
            "link": f"/properties/{t.property_id}" if t.property_id else "/tasks",
            "read": False, "date": str(t.due_date or ""),
        })

    # Mortgage payments due within 30 days
    for m in mortgages:
        days = (m.next_due_date - today).days
        if 0 <= days <= 30:
            notifications.append({
                "id": f"mortgage-{m.id}",
                "title": f"Mortgage payment due in {days}d{name_of(m.property_id)}",
                "type": "mortgage_due", "severity": "info",
                "link": f"/properties/{m.property_id}/mortgage",
                "read": False, "date": str(m.next_due_date),
            })

    # Insurance renewals within 60 days
    policies = db.query(InsurancePolicy).filter(
        InsurancePolicy.property_id.in_(prop_ids),
        InsurancePolicy.is_active == True,
        InsurancePolicy.renewal_date.isnot(None),
    ).all()
    for p in policies:
        days = (p.renewal_date - today).days
        if 0 <= days <= 60:
            notifications.append({
                "id": f"insurance-{p.id}",
                "title": f"Insurance renews in {days}d{name_of(p.property_id)}",
                "type": "insurance_renewal",
                "severity": "warning" if days <= 14 else "info",
                "link": f"/properties/{p.property_id}/insurance",
                "read": False, "date": str(p.renewal_date),
            })

    # Sort by severity then date
    severity_order = {"error": 0, "warning": 1, "info": 2}
    notifications.sort(key=lambda n: (severity_order.get(n["severity"], 9), n.get("date", "")))

    # Read/unread tracking
    read_cutoff = current_user.notifications_read_at
    unread_count = 0
    for n in notifications:
        if read_cutoff and n.get("date"):
            try:
                nd = datetime.strptime(n["date"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
                n["read"] = nd <= read_cutoff
            except (ValueError, TypeError):
                n["read"] = False
        else:
            n["read"] = False
        if not n["read"]:
            unread_count += 1

    return {"notifications": notifications, "unread_count": unread_count}
