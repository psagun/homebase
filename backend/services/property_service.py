"""Property CRUD service with user scoping."""

from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.models.property import Property, PropertyStatus, PropertyType


def _parse_enum(enum_class, value: str):
    """Safely parse an enum value, returning None if invalid."""
    try:
        return enum_class(value)
    except (ValueError, TypeError):
        return None


def list_properties(
    db: Session,
    user_id,
    search: Optional[str] = None,
    status: Optional[str] = None,
    property_type: Optional[str] = None,
):
    """List all non-archived properties for a user with optional filters."""
    query = db.query(Property).filter(
        Property.user_id == user_id,
        Property.archived_at.is_(None),
    )

    if status:
        status_enum = _parse_enum(PropertyStatus, status)
        if status_enum:
            query = query.filter(Property.status == status_enum)

    if property_type:
        type_enum = _parse_enum(PropertyType, property_type)
        if type_enum:
            query = query.filter(Property.property_type == type_enum)

    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                Property.name.ilike(term),
                Property.address_line_1.ilike(term),
                Property.city.ilike(term),
            )
        )

    return query.order_by(Property.created_at.desc()).all()


def create_property(db: Session, user_id, data) -> Property:
    """Create a new property for the user."""
    status_enum = _parse_enum(PropertyStatus, data.status) or PropertyStatus.VACANT
    type_enum = _parse_enum(PropertyType, data.property_type) or PropertyType.SINGLE_FAMILY

    prop = Property(
        user_id=user_id,
        name=data.name,
        address_line_1=data.address_line_1,
        address_line_2=data.address_line_2,
        city=data.city,
        state=data.state,
        postal_code=data.postal_code,
        country=data.country or "US",
        property_type=type_enum,
        status=status_enum,
        purchase_date=data.purchase_date,
        purchase_price=data.purchase_price or 0,
        current_value=data.current_value or 0,
        lot_size=data.lot_size,
        bedrooms=data.bedrooms,
        bathrooms=data.bathrooms,
        year_built=data.year_built,
        notes=data.notes,
    )
    db.add(prop)
    db.commit()
    db.refresh(prop)
    return prop


def get_property(db: Session, user_id, property_id) -> Property:
    """Get a single property, verifying ownership."""
    prop = db.query(Property).filter(
        Property.id == property_id,
        Property.user_id == user_id,
        Property.archived_at.is_(None),
    ).first()

    if not prop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found",
        )
    return prop


def update_property(db: Session, user_id, property_id, data) -> Property:
    """Update a property, verifying ownership."""
    prop = get_property(db, user_id, property_id)

    update_data = data.model_dump(exclude_unset=True)

    # Parse enum fields if present
    if "status" in update_data:
        enum_val = _parse_enum(PropertyStatus, update_data["status"])
        if enum_val:
            update_data["status"] = enum_val
    if "property_type" in update_data:
        enum_val = _parse_enum(PropertyType, update_data["property_type"])
        if enum_val:
            update_data["property_type"] = enum_val

    for key, value in update_data.items():
        setattr(prop, key, value)

    db.commit()
    db.refresh(prop)
    return prop


def archive_property(db: Session, user_id, property_id) -> None:
    """Soft-delete a property by setting archived_at."""
    prop = get_property(db, user_id, property_id)
    prop.archived_at = datetime.now(timezone.utc)
    db.commit()
