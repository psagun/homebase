"""Transaction CRUD with cash flow aggregation."""

import uuid
from datetime import date
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func, extract
from sqlalchemy.orm import Session

from backend.models.transaction import Transaction, TransactionType
from backend.models.property import Property


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
        Property.id == property_id, Property.user_id == user_id, Property.archived_at.is_(None),
    ).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    return prop


def list_transactions(db: Session, user_id, property_id) -> list[Transaction]:
    _get_property_or_404(db, user_id, property_id)
    return db.query(Transaction).filter(Transaction.property_id == property_id).order_by(Transaction.transaction_date.desc()).all()


def create_transaction(db: Session, user_id, property_id, data) -> Transaction:
    _get_property_or_404(db, user_id, property_id)
    txn = Transaction(
        id=uuid.uuid4(), property_id=property_id, user_id=user_id,
        transaction_type=data.transaction_type,
        category=data.category, amount=data.amount,
        transaction_date=data.transaction_date, description=data.description,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return txn


def update_transaction(db: Session, user_id, txn_id, data) -> Transaction:
    txn = db.query(Transaction).filter(Transaction.id == txn_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    _get_property_or_404(db, user_id, txn.property_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(txn, key, value)
    db.commit()
    db.refresh(txn)
    return txn


def delete_transaction(db: Session, user_id, txn_id) -> None:
    txn = db.query(Transaction).filter(Transaction.id == txn_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    _get_property_or_404(db, user_id, txn.property_id)
    db.delete(txn)
    db.commit()


def get_cash_flow(db: Session, user_id, property_id, year: int | None = None) -> dict[str, Any]:
    """Aggregate cash flow for a property."""
    _get_property_or_404(db, user_id, property_id)
    query = db.query(Transaction).filter(Transaction.property_id == property_id)
    if year:
        query = query.filter(extract("year", Transaction.transaction_date) == year)

    # Aggregate in SQL - bounded result set regardless of row count
    rows = (
        query.with_entities(
            Transaction.category,
            Transaction.transaction_type,
            func.sum(Transaction.amount),
            func.count(Transaction.id),
        )
        .group_by(Transaction.category, Transaction.transaction_type)
        .all()
    )
    total_income = 0.0
    total_expenses = 0.0
    income_by_category: dict[str, float] = {}
    expense_by_category: dict[str, float] = {}
    txn_count = 0
    for cat, ttype, amt, cnt in rows:
        cat_label = cat.value if hasattr(cat, "value") else str(cat)
        amount = float(amt or 0)
        txn_count += int(cnt or 0)
        if ttype == TransactionType.INCOME:
            total_income += amount
            income_by_category[cat_label] = income_by_category.get(cat_label, 0) + amount
        else:
            total_expenses += amount
            expense_by_category[cat_label] = expense_by_category.get(cat_label, 0) + amount

    return {
        "total_income": round(total_income, 2),
        "total_expenses": round(total_expenses, 2),
        "net_cash_flow": round(total_income - total_expenses, 2),
        "income_by_category": [{"category": k, "amount": round(v, 2)} for k, v in sorted(income_by_category.items())],
        "expense_by_category": [{"category": k, "amount": round(v, 2)} for k, v in sorted(expense_by_category.items())],
        "transaction_count": txn_count,
    }
