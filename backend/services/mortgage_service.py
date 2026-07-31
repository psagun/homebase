"""Mortgage CRUD service with user scoping and lender history."""

import uuid
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.models.mortgage import Mortgage
from backend.models.property import Property
from backend.models.task import Task, TaskPriority, TaskStatus, TaskType


def _get_property_or_404(db: Session, user_id, property_id) -> Property:
    """Verify the user owns this property (checks direct ownership and PropertyInvestor)."""
    from backend.models.property_investor import PropertyInvestor
    link = db.query(PropertyInvestor).filter(
        PropertyInvestor.property_id == property_id,
        PropertyInvestor.user_id == user_id,
    ).first()
    if link:
        prop = db.query(Property).filter(Property.id == property_id, Property.archived_at.is_(None)).first()
        if prop:
            return prop
    prop = db.query(Property).filter(
        Property.id == property_id,
        Property.user_id == user_id,
        Property.archived_at.is_(None),
    ).first()
    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")
    return prop


def get_active_mortgage(db: Session, user_id, property_id) -> Mortgage | None:
    """Get the currently active mortgage for a property."""
    _get_property_or_404(db, user_id, property_id)
    return db.query(Mortgage).filter(
        Mortgage.property_id == property_id,
        Mortgage.is_active == True,
    ).first()


def list_mortgage_history(db: Session, user_id, property_id) -> list[Mortgage]:
    """Get all mortgage records (active and historical) for a property."""
    _get_property_or_404(db, user_id, property_id)
    return db.query(Mortgage).filter(
        Mortgage.property_id == property_id,
    ).order_by(Mortgage.created_at.desc()).all()


def create_mortgage(db: Session, user_id, property_id, data) -> Mortgage:
    """Create a new mortgage for a property."""
    _get_property_or_404(db, user_id, property_id)

    # Deactivate any existing active mortgage
    existing = db.query(Mortgage).filter(
        Mortgage.property_id == property_id,
        Mortgage.is_active == True,
    ).all()
    for m in existing:
        m.is_active = False
        m.ended_at = data.start_date or date.today()

    mortgage = Mortgage(
        id=uuid.uuid4(),
        property_id=property_id,
        lender_name=data.lender_name,
        loan_number=data.loan_number,
        loan_type=data.loan_type,
        portal_url=data.portal_url,
        interest_rate=data.interest_rate,
        original_amount=data.original_amount,
        current_balance=data.current_balance,
        monthly_payment=data.monthly_payment,
        loan_term_months=data.loan_term_months,
        start_date=data.start_date,
        maturity_date=data.maturity_date,
        next_due_date=data.next_due_date,
        autopay_enabled=data.autopay_enabled,
        is_active=True,
    )
    db.add(mortgage)
    db.commit()
    _sync_task_due_date(db, user_id, mortgage.property_id, mortgage.next_due_date)
    db.commit()
    db.refresh(mortgage)
    return mortgage


def update_mortgage(db: Session, user_id, mortgage_id, data) -> Mortgage:
    """Update a mortgage. If lender_name changes, archive old and create new for history."""
    mortgage = db.query(Mortgage).filter(Mortgage.id == mortgage_id).first()
    if not mortgage:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mortgage not found")

    # Verify ownership through property
    _get_property_or_404(db, user_id, mortgage.property_id)

    update_data = data.model_dump(exclude_unset=True)

    # If lender changed, archive this record and create a new one
    if "lender_name" in update_data and update_data["lender_name"] != mortgage.lender_name:
        mortgage.is_active = False
        mortgage.ended_at = date.today()
        db.flush()

        new_mortgage = Mortgage(
            id=uuid.uuid4(),
            property_id=mortgage.property_id,
            lender_name=update_data["lender_name"],
            loan_number=update_data.get("loan_number", mortgage.loan_number),
            loan_type=update_data.get("loan_type", mortgage.loan_type),
            portal_url=update_data.get("portal_url", mortgage.portal_url),
            interest_rate=update_data.get("interest_rate", mortgage.interest_rate),
            original_amount=update_data.get("original_amount", mortgage.original_amount),
            current_balance=update_data.get("current_balance", mortgage.current_balance),
            monthly_payment=update_data.get("monthly_payment", mortgage.monthly_payment),
            loan_term_months=update_data.get("loan_term_months", mortgage.loan_term_months),
            start_date=update_data.get("start_date", mortgage.start_date),
            maturity_date=update_data.get("maturity_date", mortgage.maturity_date),
            next_due_date=update_data.get("next_due_date", mortgage.next_due_date),
            autopay_enabled=update_data.get("autopay_enabled", mortgage.autopay_enabled),
            is_active=True,
        )
        db.add(new_mortgage)
        db.commit()
        # Sync task due date
        _sync_task_due_date(db, user_id, new_mortgage.property_id, new_mortgage.next_due_date)
        db.commit()
        db.refresh(new_mortgage)
        return new_mortgage

    # Simple update without lender change
    for key, value in update_data.items():
        setattr(mortgage, key, value)
    db.commit()
    _sync_task_due_date(db, user_id, mortgage.property_id, mortgage.next_due_date)
    db.commit()
    db.refresh(mortgage)
    return mortgage


def _sync_task_due_date(db: Session, user_id, property_id, due_date):
    """Create or update a MORTGAGE_PAYMENT task for this property."""
    if not property_id or not due_date:
        return
    task = db.query(Task).filter(
        Task.property_id == property_id,
        Task.task_type == TaskType.MORTGAGE_PAYMENT,
        Task.status.in_([TaskStatus.UPCOMING, TaskStatus.DUE_TODAY, TaskStatus.OVERDUE]),
    ).first()
    if task:
        task.due_date = due_date
    else:
        # Auto-create a mortgage payment task
        prop = db.query(Property).filter(Property.id == property_id, Property.archived_at.is_(None)).first()
        prop_name = prop.name if prop else "Property"
        task = Task(
            id=uuid.uuid4(),
            user_id=user_id,
            property_id=property_id,
            title=f"Mortgage payment - {prop_name}",
            task_type=TaskType.MORTGAGE_PAYMENT,
            due_date=due_date,
            priority=TaskPriority.MEDIUM,
            status=TaskStatus.UPCOMING,
        )
        db.add(task)


def delete_mortgage(db: Session, user_id, mortgage_id) -> None:
    """Delete (hard) a mortgage record."""
    mortgage = db.query(Mortgage).filter(Mortgage.id == mortgage_id).first()
    if not mortgage:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mortgage not found")
    _get_property_or_404(db, user_id, mortgage.property_id)
    db.delete(mortgage)
    db.commit()
