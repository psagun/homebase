"""Dashboard aggregation service — pulls real data from all modules."""

from datetime import date, datetime
from typing import Any

from sqlalchemy.orm import Session

from backend.models.property import Property, PropertyStatus
from backend.models.mortgage import Mortgage
from backend.models.insurance_policy import InsurancePolicy
from backend.models.task import Task, TaskStatus
from backend.models.user import User
from backend.models.property_investor import PropertyInvestor


def _get_user_properties(db: Session, user: User) -> list[Property]:
    """Return the list of properties visible to the given user based on their role."""
    if user.role == "investor":
        return (
            db.query(Property)
            .join(PropertyInvestor)
            .filter(
                PropertyInvestor.user_id == user.id,
                Property.archived_at.is_(None),
            )
            .all()
        )
    else:
        return (
            db.query(Property)
            .filter(
                Property.user_id == user.id,
                Property.archived_at.is_(None),
            )
            .all()
        )


def get_dashboard_summary(db: Session, user: User) -> dict[str, Any]:
    """Aggregate portfolio-level metrics from all data sources."""
    properties = _get_user_properties(db, user)
    property_ids = [p.id for p in properties]

    # A user with no visible properties must get empty aggregates, NOT other
    # tenants' tasks/mortgages — the task/policy queries below are only safe
    # when scoped to the user's property ids.
    if not property_ids:
        return {
            "total_properties": 0,
            "total_value": 0,
            "total_equity": 0,
            "total_monthly_income": 0,
            "total_monthly_expenses": 0,
            "net_monthly_income": 0,
            "average_roi": 0,
            "occupancy_rate": 0,
            "value_change_percentage": 0,
            "occupied_count": 0,
            "vacant_count": 0,
            "total_purchase_price": 0,
            "properties_by_status": [],
            "value_by_type": [],
            "recent_properties": [],
            "reminders": [],
            "overdue_count": 0,
            "due_today_count": 0,
            "mortgage_count": 0,
            "total_monthly_mortgage_payment": 0,
            "next_insurance_renewal": None,
        }

    today = date.today()

    # ---- Property stats ----
    total_value = sum(float(p.current_value or 0) for p in properties)
    total_purchase = sum(float(p.purchase_price or 0) for p in properties)
    total_equity = total_value - total_purchase

    occupied_count = sum(1 for p in properties if p.status == PropertyStatus.OCCUPIED)
    vacant_count = sum(1 for p in properties if p.status == PropertyStatus.VACANT)

    rois = []
    for p in properties:
        purchase = float(p.purchase_price or 0)
        current = float(p.current_value or 0)
        if purchase > 0:
            appreciation = (current - purchase) / purchase * 100
            assumed_yield = 4.0
            rois.append(appreciation * 0.6 + assumed_yield * 0.4)

    avg_roi = round(sum(rois) / len(rois), 2) if rois else 0
    value_change_pct = round((total_value - total_purchase) / total_purchase * 100, 2) if total_purchase > 0 else 0
    occupancy_rate = round(occupied_count / len(properties) * 100, 1) if properties else 0

    # Value by type
    value_by_type: dict[str, float] = {}
    for p in properties:
        ptype = p.property_type.value if hasattr(p.property_type, "value") else str(p.property_type)
        value_by_type[ptype] = value_by_type.get(ptype, 0) + float(p.current_value or 0)

    # Status counts
    status_counts: dict[str, int] = {}
    for p in properties:
        s = p.status.value if hasattr(p.status, "value") else str(p.status)
        status_counts[s] = status_counts.get(s, 0) + 1

    # Recent properties
    recent = sorted(properties, key=lambda p: p.created_at or datetime.min, reverse=True)[:9]
    recent_props = [
        {"id": str(p.id), "name": p.name, "city": p.city, "state": p.state,
         "status": p.status.value if hasattr(p.status, "value") else str(p.status),
         "property_type": p.property_type.value if hasattr(p.property_type, "value") else str(p.property_type),
         "current_value": float(p.current_value or 0)}
        for p in recent
    ]

    # ---- Task reminders ----
    task_query = db.query(Task).filter(
        Task.status.notin_([TaskStatus.COMPLETED, TaskStatus.DISMISSED])
    )
    if property_ids:
        task_query = task_query.filter(Task.property_id.in_(property_ids))
    all_tasks = task_query.order_by(Task.due_date.asc()).all()

    overdue_tasks = [t for t in all_tasks if t.status == TaskStatus.OVERDUE or (t.due_date and t.due_date < today)]
    due_today_tasks = [t for t in all_tasks if t.status == TaskStatus.DUE_TODAY or (t.due_date and t.due_date == today)]
    upcoming_tasks = [t for t in all_tasks if t not in overdue_tasks and t not in due_today_tasks][:5]

    # Load property relationships for reminders
    from sqlalchemy.orm import joinedload
    task_ids = [t.id for t in (overdue_tasks[:5] + due_today_tasks[:5] + upcoming_tasks)]
    tasks_with_props = db.query(Task).options(joinedload(Task.property)).filter(
        Task.id.in_(task_ids)
    ).all() if task_ids else []
    prop_map = {str(t.id): t.property.name if t.property else None for t in tasks_with_props}

    reminders = [
        {
            "id": str(t.id),
            "title": t.title,
            "task_type": t.task_type.value if hasattr(t.task_type, "value") else str(t.task_type),
            "due_date": str(t.due_date) if t.due_date else None,
            "priority": t.priority.value if hasattr(t.priority, "value") else str(t.priority),
            "status": t.status.value if hasattr(t.status, "value") else str(t.status),
            "property_id": str(t.property_id) if t.property_id else None,
            "property_name": prop_map.get(str(t.id)),
        }
        for t in (overdue_tasks[:5] + due_today_tasks[:5] + upcoming_tasks)
    ]

    # ---- Mortgage summary ----
    mortgage_query = db.query(Mortgage).filter(Mortgage.is_active == True)
    if property_ids:
        mortgage_query = mortgage_query.filter(Mortgage.property_id.in_(property_ids))
    active_mortgages = mortgage_query.all()
    total_monthly_payment = sum(float(m.monthly_payment or 0) for m in active_mortgages)
    mortgage_count = len(active_mortgages)

    # ---- Insurance summary ----
    policy_query = db.query(InsurancePolicy).filter(InsurancePolicy.is_active == True)
    if property_ids:
        policy_query = policy_query.filter(InsurancePolicy.property_id.in_(property_ids))
    active_policies = policy_query.all()
    next_renewal = None
    for p in active_policies:
        if p.renewal_date and (next_renewal is None or p.renewal_date < next_renewal):
            next_renewal = p.renewal_date

    return {
        "total_properties": len(properties),
        "total_value": round(total_value, 2),
        "total_equity": round(total_equity, 2),
        "total_monthly_income": 0,
        "total_monthly_expenses": 0,
        "net_monthly_income": 0,
        "average_roi": avg_roi,
        "occupancy_rate": occupancy_rate,
        "value_change_percentage": value_change_pct,
        "occupied_count": occupied_count,
        "vacant_count": vacant_count,
        "total_purchase_price": round(total_purchase, 2),
        "properties_by_status": [{"status": k, "count": v} for k, v in sorted(status_counts.items())],
        "value_by_type": [{"type": k, "value": round(v, 2)} for k, v in sorted(value_by_type.items())],
        "recent_properties": recent_props,
        # Real data additions
        "reminders": reminders,
        "overdue_count": len(overdue_tasks),
        "due_today_count": len(due_today_tasks),
        "mortgage_count": mortgage_count,
        "total_monthly_mortgage_payment": round(total_monthly_payment, 2),
        "next_insurance_renewal": str(next_renewal) if next_renewal else None,
    }


def get_properties_list(db: Session, user: User) -> list[dict[str, Any]]:
    properties = _get_user_properties(db, user)
    result = []
    for p in properties:
        purchase = float(p.purchase_price or 0)
        current = float(p.current_value or 0)
        equity_change_pct = round((current - purchase) / purchase * 100, 2) if purchase > 0 else 0
        result.append({
            "id": str(p.id), "name": p.name, "address_line_1": p.address_line_1,
            "city": p.city, "state": p.state,
            "property_type": p.property_type.value if hasattr(p.property_type, "value") else str(p.property_type),
            "status": p.status.value if hasattr(p.status, "value") else str(p.status),
            "current_value": current, "purchase_price": purchase,
            "equity_change_percentage": equity_change_pct,
            "bedrooms": p.bedrooms, "bathrooms": float(p.bathrooms) if p.bathrooms else None,
            "year_built": p.year_built,
        })
    return result
