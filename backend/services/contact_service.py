"""Contact CRUD with M:N property linking."""

import uuid
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.models.contact import Contact, ContactType, property_contacts
from backend.models.property import Property


def _parse_type(value: str) -> ContactType:
    try:
        return ContactType(value)
    except (ValueError, TypeError):
        return ContactType.OTHER


def list_contacts(db: Session, user_id, contact_type: Optional[str] = None) -> list[Contact]:
    query = db.query(Contact).filter(Contact.user_id == user_id)
    if contact_type:
        ct = _parse_type(contact_type)
        query = query.filter(Contact.contact_type == ct)
    return query.order_by(Contact.name).all()


def get_contact(db: Session, user_id, contact_id) -> Contact:
    contact = db.query(Contact).filter(Contact.id == contact_id, Contact.user_id == user_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


def create_contact(db: Session, user_id, data) -> Contact:
    contact = Contact(
        id=uuid.uuid4(), user_id=user_id, name=data.name,
        company=data.company, phone=data.phone, email=data.email,
        website=data.website, notes=data.notes,
        contact_type=_parse_type(data.contact_type),
    )
    db.add(contact)
    db.flush()

    if data.property_ids:
        props = db.query(Property).filter(
            Property.id.in_([uuid.UUID(id) for id in data.property_ids]),
            Property.user_id == user_id,
        ).all()
        contact.properties = props

    db.commit()
    db.refresh(contact)
    return contact


def update_contact(db: Session, user_id, contact_id, data) -> Contact:
    contact = get_contact(db, user_id, contact_id)
    update_data = data.model_dump(exclude_unset=True)
    if "contact_type" in update_data:
        update_data["contact_type"] = _parse_type(update_data["contact_type"])
    for key, value in update_data.items():
        setattr(contact, key, value)
    db.commit()
    db.refresh(contact)
    return contact


def delete_contact(db: Session, user_id, contact_id) -> None:
    contact = get_contact(db, user_id, contact_id)
    db.delete(contact)
    db.commit()


def get_contacts_for_property(db: Session, user_id, property_id) -> list[Contact]:
    prop = db.query(Property).filter(
        Property.id == property_id, Property.user_id == user_id, Property.archived_at.is_(None),
    ).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    return prop.contacts


def link_contact_to_property(db: Session, user_id, contact_id, property_id) -> None:
    contact = get_contact(db, user_id, contact_id)
    prop = db.query(Property).filter(
        Property.id == property_id, Property.user_id == user_id,
    ).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    if contact not in prop.contacts:
        prop.contacts.append(contact)
        db.commit()


def unlink_contact(db: Session, user_id, contact_id, property_id) -> None:
    contact = get_contact(db, user_id, contact_id)
    prop = db.query(Property).filter(
        Property.id == property_id, Property.user_id == user_id,
    ).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    if contact in prop.contacts:
        prop.contacts.remove(contact)
        db.commit()
