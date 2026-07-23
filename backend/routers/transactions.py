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
    txns = db.query(Transaction).join(Property).filter(
        Property.user_id == current_user.id
    ).order_by(Transaction.transaction_date.desc()).limit(limit).all()

    result = []
    for t in txns:
        prop = db.query(Property).filter(Property.id == t.property_id).first()
        creator = db.query(User).filter(User.id == t.user_id).first()
        result.append({
            "id": str(t.id),
            "property_id": str(t.property_id),
            "property_name": prop.name if prop else "Unknown",
            "user_id": str(t.user_id),
            "user_name": creator.name if creator else "Unknown",
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
