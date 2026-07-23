import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.dependencies import get_current_user, get_db
from backend.models.user import User
from backend.schemas.property import PropertyCreate, PropertyResponse, PropertyUpdate
from backend.services import property_service

router = APIRouter()


@router.get("/", response_model=list[PropertyResponse])
def list_properties(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    property_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all properties for the authenticated user."""
    return property_service.list_properties(
        db,
        current_user.id,
        search=search,
        status=status,
        property_type=property_type,
    )


@router.post("/", response_model=PropertyResponse, status_code=status.HTTP_201_CREATED)
def create_property(
    data: PropertyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new property."""
    return property_service.create_property(db, current_user.id, data)


@router.get("/{property_id}", response_model=PropertyResponse)
def get_property(
    property_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single property by ID."""
    return property_service.get_property(db, current_user.id, property_id)


@router.patch("/{property_id}", response_model=PropertyResponse)
def update_property(
    property_id: uuid.UUID,
    data: PropertyUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a property."""
    return property_service.update_property(db, current_user.id, property_id, data)


@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_property(
    property_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Archive (soft-delete) a property."""
    property_service.archive_property(db, current_user.id, property_id)
