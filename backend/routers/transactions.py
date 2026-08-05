import uuid
from typing import Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session, joinedload

from backend.dependencies import get_current_user, get_db
from backend.models.user import User
from backend.models.property import Property
from backend.models.transaction import Transaction
from backend.schemas.transaction import TransactionCreate, TransactionResponse, TransactionUpdate
from backend.services import transaction_service

router = APIRouter()


@router.get("/all")
def list_all_transactions(
    limit: int = 50,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    """List recent transactions across all properties with user and property info."""
    # Investor-aware scoping: investors see their linked properties only
    from backend.models.property_investor import PropertyInvestor

    query = db.query(Transaction).join(Property)
    if current_user.role == "investor":
        query = query.join(PropertyInvestor, PropertyInvestor.property_id == Property.id).filter(
            PropertyInvestor.user_id == current_user.id,
            Property.archived_at.is_(None),
        )
    else:
        query = query.filter(
            Property.user_id == current_user.id,
            Property.archived_at.is_(None),
        )
    txns = query.order_by(Transaction.transaction_date.desc()).limit(limit).all()

    # Batch-load names - no per-row queries
    prop_ids = {t.property_id for t in txns}
    user_ids = {t.user_id for t in txns}
    prop_names = {
        p.id: p.name for p in db.query(Property).filter(Property.id.in_(prop_ids)).all()
    } if prop_ids else {}
    user_names = {
        u.id: u.name for u in db.query(User).filter(User.id.in_(user_ids)).all()
    } if user_ids else {}

    result = []
    for t in txns:
        result.append({
            "id": str(t.id),
            "property_id": str(t.property_id),
            "property_name": prop_names.get(t.property_id, "Unknown"),
            "user_id": str(t.user_id),
            "user_name": user_names.get(t.user_id, "Unknown"),
            "transaction_type": t.transaction_type.value if hasattr(t.transaction_type, "value") else str(t.transaction_type),
            "category": t.category.value if hasattr(t.category, "value") else str(t.category),
            "amount": float(t.amount),
            "transaction_date": str(t.transaction_date),
            "description": t.description,
            "created_at": str(t.created_at),
        })
    return result


@router.get("/properties/{property_id}/transactions", response_model=list[TransactionResponse])
def list_transactions(
    property_id: uuid.UUID,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    return transaction_service.list_transactions(db, current_user.id, property_id)


@router.get("/properties/{property_id}/transactions/cash-flow")
def cash_flow(
    property_id: uuid.UUID,
    year: Optional[int] = None,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    return transaction_service.get_cash_flow(db, current_user.id, property_id, year)


@router.post("/properties/{property_id}/transactions", response_model=TransactionResponse, status_code=201)
def create_transaction(
    property_id: uuid.UUID, data: TransactionCreate,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    return transaction_service.create_transaction(db, current_user.id, property_id, data)


@router.patch("/transactions/{txn_id}", response_model=TransactionResponse)
def update_transaction(
    txn_id: uuid.UUID, data: TransactionUpdate,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    return transaction_service.update_transaction(db, current_user.id, txn_id, data)


@router.delete("/transactions/{txn_id}", status_code=204)
def delete_transaction(
    txn_id: uuid.UUID,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    transaction_service.delete_transaction(db, current_user.id, txn_id)
