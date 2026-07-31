"""Insurance policy CRUD with user scoping and provider history."""

import uuid
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.models.insurance_policy import InsurancePolicy
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


def get_active_policy(db: Session, user_id, property_id) -> InsurancePolicy | None:
    _get_property_or_404(db, user_id, property_id)
    return db.query(InsurancePolicy).filter(
        InsurancePolicy.property_id == property_id,
        InsurancePolicy.is_active == True,
    ).first()


def list_policy_history(db: Session, user_id, property_id) -> list[InsurancePolicy]:
    _get_property_or_404(db, user_id, property_id)
    return db.query(InsurancePolicy).filter(
        InsurancePolicy.property_id == property_id,
    ).order_by(InsurancePolicy.created_at.desc()).all()


def create_policy(db: Session, user_id, property_id, data) -> InsurancePolicy:
    _get_property_or_404(db, user_id, property_id)

    existing = db.query(InsurancePolicy).filter(
        InsurancePolicy.property_id == property_id,
        InsurancePolicy.is_active == True,
    ).all()
    for p in existing:
        p.is_active = False
        p.ended_at = data.effective_date or date.today()

    policy = InsurancePolicy(
        id=uuid.uuid4(),
        property_id=property_id,
        provider_name=data.provider_name,
        policy_number=data.policy_number,
        policy_type=data.policy_type,
        portal_url=data.portal_url,
        coverage_amount=data.coverage_amount,
        deductible=data.deductible,
        annual_premium=data.annual_premium,
        effective_date=data.effective_date,
        expiration_date=data.expiration_date,
        renewal_date=data.renewal_date,
        agent_name=data.agent_name,
        agent_phone=data.agent_phone,
        agent_email=data.agent_email,
        is_active=True,
    )
    db.add(policy)
    db.commit()
    _sync_task_due_date(db, user_id, policy.property_id, policy.renewal_date)
    db.commit()
    db.refresh(policy)
    return policy


def _sync_task_due_date(db: Session, user_id, property_id, due_date):
    """Create or update an INSURANCE_RENEWAL task for this property."""
    if not property_id or not due_date:
        return
    task = db.query(Task).filter(
        Task.property_id == property_id,
        Task.task_type == TaskType.INSURANCE_RENEWAL,
        Task.status.in_([TaskStatus.UPCOMING, TaskStatus.DUE_TODAY, TaskStatus.OVERDUE]),
    ).first()
    if task:
        task.due_date = due_date
    else:
        prop = db.query(Property).filter(Property.id == property_id, Property.archived_at.is_(None)).first()
        prop_name = prop.name if prop else "Property"
        task = Task(
            id=uuid.uuid4(),
            user_id=user_id,
            property_id=property_id,
            title=f"Renew insurance - {prop_name}",
            task_type=TaskType.INSURANCE_RENEWAL,
            due_date=due_date,
            priority=TaskPriority.MEDIUM,
            status=TaskStatus.UPCOMING,
        )
        db.add(task)


def update_policy(db: Session, user_id, policy_id, data) -> InsurancePolicy:
    policy = db.query(InsurancePolicy).filter(InsurancePolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Insurance policy not found")

    _get_property_or_404(db, user_id, policy.property_id)
    update_data = data.model_dump(exclude_unset=True)

    if "provider_name" in update_data and update_data["provider_name"] != policy.provider_name:
        policy.is_active = False
        policy.ended_at = date.today()
        db.flush()

        new_policy = InsurancePolicy(
            id=uuid.uuid4(),
            property_id=policy.property_id,
            provider_name=update_data["provider_name"],
            policy_number=update_data.get("policy_number", policy.policy_number),
            policy_type=update_data.get("policy_type", policy.policy_type),
            coverage_amount=update_data.get("coverage_amount", policy.coverage_amount),
            deductible=update_data.get("deductible", policy.deductible),
            annual_premium=update_data.get("annual_premium", policy.annual_premium),
            effective_date=update_data.get("effective_date", policy.effective_date),
            expiration_date=update_data.get("expiration_date", policy.expiration_date),
            renewal_date=update_data.get("renewal_date", policy.renewal_date),
            agent_name=update_data.get("agent_name", policy.agent_name),
            agent_phone=update_data.get("agent_phone", policy.agent_phone),
            agent_email=update_data.get("agent_email", policy.agent_email),
            is_active=True,
        )
        db.add(new_policy)
        db.commit()
        _sync_task_due_date(db, user_id, new_policy.property_id, new_policy.renewal_date)
        db.commit()
        db.refresh(new_policy)
        return new_policy

    for key, value in update_data.items():
        setattr(policy, key, value)
    db.commit()
    _sync_task_due_date(db, user_id, policy.property_id, policy.renewal_date)
    db.commit()
    db.refresh(policy)
    return policy


def delete_policy(db: Session, user_id, policy_id) -> None:
    policy = db.query(InsurancePolicy).filter(InsurancePolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Insurance policy not found")
    _get_property_or_404(db, user_id, policy.property_id)
    db.delete(policy)
    db.commit()
