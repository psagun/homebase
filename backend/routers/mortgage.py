import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.dependencies import get_current_user, get_db
from backend.models.user import User
from backend.schemas.mortgage import MortgageCreate, MortgageResponse, MortgageUpdate
from backend.services import mortgage_service

router = APIRouter()


@router.get("/properties/{property_id}/mortgage", response_model=MortgageResponse | None)
def get_active_mortgage(
    property_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the active mortgage for a property."""
    return mortgage_service.get_active_mortgage(db, current_user.id, property_id)


@router.get("/properties/{property_id}/mortgage/history", response_model=list[MortgageResponse])
def list_mortgage_history(
    property_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all mortgage records for a property (historical + active)."""
    return mortgage_service.list_mortgage_history(db, current_user.id, property_id)


@router.post("/properties/{property_id}/mortgage", response_model=MortgageResponse, status_code=status.HTTP_201_CREATED)
def create_mortgage(
    property_id: uuid.UUID,
    data: MortgageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new mortgage for a property."""
    return mortgage_service.create_mortgage(db, current_user.id, property_id, data)


@router.patch("/mortgages/{mortgage_id}", response_model=MortgageResponse)
def update_mortgage(
    mortgage_id: uuid.UUID,
    data: MortgageUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a mortgage. Changing the lender creates a historical record."""
    return mortgage_service.update_mortgage(db, current_user.id, mortgage_id, data)


@router.delete("/mortgages/{mortgage_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mortgage(
    mortgage_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a mortgage record."""
    mortgage_service.delete_mortgage(db, current_user.id, mortgage_id)
