import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.dependencies import get_current_user, get_db
from backend.models.user import User
from backend.schemas.contact import ContactCreate, ContactResponse, ContactUpdate
from backend.services import contact_service

router = APIRouter()


@router.get("", response_model=list[ContactResponse])
def list_contacts(
    contact_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    return contact_service.list_contacts(db, current_user.id, contact_type)


@router.post("", response_model=ContactResponse, status_code=201)
def create_contact(
    data: ContactCreate,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    return contact_service.create_contact(db, current_user.id, data)


@router.get("/{contact_id}", response_model=ContactResponse)
def get_contact(
    contact_id: uuid.UUID,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    return contact_service.get_contact(db, current_user.id, contact_id)


@router.patch("/{contact_id}", response_model=ContactResponse)
def update_contact(
    contact_id: uuid.UUID, data: ContactUpdate,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    return contact_service.update_contact(db, current_user.id, contact_id, data)


@router.delete("/{contact_id}", status_code=204)
def delete_contact(
    contact_id: uuid.UUID,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    contact_service.delete_contact(db, current_user.id, contact_id)


@router.get("/property/{property_id}", response_model=list[ContactResponse])
def property_contacts(
    property_id: uuid.UUID,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    return contact_service.get_contacts_for_property(db, current_user.id, property_id)


@router.post("/{contact_id}/link/{property_id}", response_model=ContactResponse)
def link_contact(
    contact_id: uuid.UUID, property_id: uuid.UUID,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    """Link an existing contact to a property."""
    contact_service.link_contact_to_property(db, current_user.id, contact_id, property_id)
    return contact_service.get_contact(db, current_user.id, contact_id)


@router.delete("/{contact_id}/unlink/{property_id}", status_code=204)
def unlink_contact(
    contact_id: uuid.UUID, property_id: uuid.UUID,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    """Unlink a contact from a property (contact record is kept)."""
    contact_service.unlink_contact(db, current_user.id, contact_id, property_id)
