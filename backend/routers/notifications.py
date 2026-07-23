"""Notifications endpoint — aggregates data from tasks, insurance, mortgages."""
from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.dependencies import get_current_user, get_db
from backend.models.user import User
from backend.models.task import Task, TaskStatus
from backend.models.mortgage import Mortgage
from backend.models.insurance_policy import InsurancePolicy
from backend.models.property import Property

router = APIRouter()


@router.get("/")
def get_notifications(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    """Aggregate notifications from tasks, mortgages, and insurance."""
    today = date.today()
    notifications = []

    # Overdue tasks
    overdue_tasks = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status == TaskStatus.OVERDUE,
    ).all()
    for t in overdue_tasks:
        prop_name = ""
        if t.property_id:
            prop = db.query(Property).filter(Property.id == t.property_id).first()
            prop_name = f" — {prop.name}" if prop else ""
        notifications.append({
            "id": f"task-overdue-{t.id}",
            "title": f"Overdue: {t.title}{prop_name}",
            "type": "task_overdue",
            "severity": "error",
            "link": f"/properties/{t.property_id}" if t.property_id else "/tasks",
            "read": False,
            "date": str(t.due_date or ""),
        })

    # Due today tasks
    due_today = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status == TaskStatus.DUE_TODAY,
    ).all()
    for t in due_today:
        prop_name = ""
        if t.property_id:
            prop = db.query(Property).filter(Property.id == t.property_id).first()
            prop_name = f" — {prop.name}" if prop else ""
        notifications.append({
            "id": f"task-today-{t.id}",
            "title": f"Due today: {t.title}{prop_name}",
            "type": "task_due_today",
            "severity": "warning",
            "link": f"/properties/{t.property_id}" if t.property_id else "/tasks",
            "read": False,
            "date": str(t.due_date or ""),
        })

    # Upcoming tasks (due in 7 days)
    upcoming = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.due_date >= today,
        Task.due_date <= today + timedelta(days=7),
        Task.status.notin_([TaskStatus.COMPLETED, TaskStatus.DISMISSED, TaskStatus.OVERDUE, TaskStatus.DUE_TODAY]),
    ).all()
    for t in upcoming:
        prop_name = ""
        if t.property_id:
            prop = db.query(Property).filter(Property.id == t.property_id).first()
            prop_name = f" — {prop.name}" if prop else ""
        notifications.append({
            "id": f"task-upcoming-{t.id}",
            "title": f"Upcoming: {t.title}{prop_name}",
            "type": "task_upcoming",
            "severity": "info",
            "link": f"/properties/{t.property_id}" if t.property_id else "/tasks",
            "read": False,
            "date": str(t.due_date or ""),
        })

    # Mortgage payments due soon (within 30 days)
    active_mortgages = db.query(Mortgage).filter(Mortgage.is_active == True).all()
    for m in active_mortgages:
        if m.next_due_date:
            prop = db.query(Property).filter(Property.id == m.property_id).first()
            prop_name = f" — {prop.name}" if prop else ""
            days_until = (m.next_due_date - today).days
            if 0 <= days_until <= 30:
                notifications.append({
                    "id": f"mortgage-{m.id}",
                    "title": f"Mortgage payment due in {days_until}d{prop_name}",
                    "type": "mortgage_due",
                    "severity": "info",
                    "link": f"/properties/{m.property_id}/mortgage" if m.property_id else "#",
                    "read": False,
                    "date": str(m.next_due_date),
                })

    # Insurance renewals within 60 days
    active_policies = db.query(InsurancePolicy).filter(InsurancePolicy.is_active == True).all()
    for p in active_policies:
        if p.renewal_date:
            prop = db.query(Property).filter(Property.id == p.property_id).first()
            prop_name = f" — {prop.name}" if prop else ""
            days_until = (p.renewal_date - today).days
            if 0 <= days_until <= 60:
                notifications.append({
                    "id": f"insurance-{p.id}",
                    "title": f"Insurance renews in {days_until}d{prop_name}",
                    "type": "insurance_renewal",
                    "severity": days_until <= 14 and "warning" or "info",
                    "link": f"/properties/{p.property_id}/insurance" if p.property_id else "#",
                    "read": False,
                    "date": str(p.renewal_date),
                })

    # Sort by severity then date
    severity_order = {"error": 0, "warning": 1, "info": 2}
    notifications.sort(key=lambda n: (severity_order.get(n["severity"], 9), n.get("date", "")))

    unread_count = sum(1 for n in notifications if not n["read"])

    return {"notifications": notifications, "unread_count": unread_count}
