import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.dependencies import get_current_user, get_db
from backend.models.user import User
from backend.schemas.insurance import InsuranceCreate, InsuranceResponse, InsuranceUpdate
from backend.services import insurance_service

router = APIRouter()


@router.get("/properties/{property_id}/insurance", response_model=InsuranceResponse | None)
def get_active_policy(
    property_id: uuid.UUID,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    return insurance_service.get_active_policy(db, current_user.id, property_id)


@router.get("/properties/{property_id}/insurance/history", response_model=list[InsuranceResponse])
def list_policy_history(
    property_id: uuid.UUID,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    return insurance_service.list_policy_history(db, current_user.id, property_id)


@router.post("/properties/{property_id}/insurance", response_model=InsuranceResponse, status_code=status.HTTP_201_CREATED)
def create_policy(
    property_id: uuid.UUID, data: InsuranceCreate,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    return insurance_service.create_policy(db, current_user.id, property_id, data)


@router.patch("/insurance/{policy_id}", response_model=InsuranceResponse)
def update_policy(
    policy_id: uuid.UUID, data: InsuranceUpdate,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    return insurance_service.update_policy(db, current_user.id, policy_id, data)


@router.delete("/insurance/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_policy(
    policy_id: uuid.UUID,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    insurance_service.delete_policy(db, current_user.id, policy_id)
