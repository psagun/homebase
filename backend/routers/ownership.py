"""Ownership management — entities, investors, and property links."""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.dependencies import get_current_user, get_db
from backend.models.user import User
from backend.models.property import Property
from backend.models.ownership_entity import OwnershipEntity
from backend.models.investor import Investor
from backend.models.ownership_entity_investor import OwnershipEntityInvestor
from backend.schemas.ownership import (
    EntityCreate,
    EntityUpdate,
    EntityResponse,
    InvestorCreate,
    InvestorUpdate,
    InvestorResponse,
    EntityWithInvestorsResponse,
    PropertyOwnershipResponse,
    SetPropertyEntityRequest,
)

router = APIRouter(tags=["ownership"])


def _get_property(user_id: uuid.UUID, property_id: uuid.UUID, db: Session) -> Property:
    from backend.models.property_investor import PropertyInvestor
    # Check investor access first
    link = db.query(PropertyInvestor).filter(
        PropertyInvestor.property_id == property_id,
        PropertyInvestor.user_id == user_id,
    ).first()
    if link:
        prop = db.query(Property).filter(
            Property.id == property_id,
            Property.archived_at.is_(None),
        ).first()
        if prop:
            return prop
    prop = db.query(Property).filter(
        Property.id == property_id,
        Property.user_id == user_id,
        Property.archived_at.is_(None),
    ).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    return prop


# ─── Ownership Entity CRUD ───


@router.get("/ownership-entities", response_model=list[EntityResponse])
def list_entities(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all ownership entities (accessible to all authenticated users)."""
    return db.query(OwnershipEntity).order_by(OwnershipEntity.name).all()


@router.post("/ownership-entities", response_model=EntityResponse, status_code=201)
def create_entity(
    data: EntityCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new ownership entity."""
    entity = OwnershipEntity(
        id=uuid.uuid4(),
        name=data.name,
        entity_type=data.entity_type,
        ein=data.ein,
        state_of_formation=data.state_of_formation,
        status=data.status,
    )
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


@router.get("/ownership-entities/{entity_id}", response_model=EntityResponse)
def get_entity(
    entity_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single ownership entity."""
    entity = db.query(OwnershipEntity).filter(OwnershipEntity.id == entity_id).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    return entity


@router.patch("/ownership-entities/{entity_id}", response_model=EntityResponse)
def update_entity(
    entity_id: uuid.UUID,
    data: EntityUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an ownership entity."""
    entity = db.query(OwnershipEntity).filter(OwnershipEntity.id == entity_id).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(entity, key, value)

    db.commit()
    db.refresh(entity)
    return entity


# ─── Entity Investors ───


@router.get("/ownership-entities/{entity_id}/investors")
def list_entity_investors(
    entity_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List investors in an ownership entity with their percentages."""
    from sqlalchemy import text

    entity = db.execute(
        text("SELECT 1 FROM ownership_entities WHERE id = :eid"),
        {"eid": entity_id},
    ).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    rows = db.execute(
        text("""
            SELECT i.id, i.name, i.email, i.phone, oei.ownership_percentage
            FROM ownership_entity_investors oei
            JOIN investors i ON i.id = oei.investor_id
            WHERE oei.ownership_entity_id = :eid
            ORDER BY oei.ownership_percentage DESC
        """),
        {"eid": entity_id},
    ).fetchall()

    result = []
    for row in rows:
        portal = False
        if row.email:
            portal_user = db.execute(
                text("SELECT 1 FROM users WHERE email = :email AND role = 'investor'"),
                {"email": row.email},
            ).first()
            portal = portal_user is not None
        result.append({
            "id": str(row.id),
            "name": row.name,
            "email": row.email,
            "phone": row.phone,
            "ownership_percentage": float(row.ownership_percentage),
            "portal_access": portal,
        })
    return result


@router.post("/ownership-entities/{entity_id}/investors", status_code=201)
def add_entity_investor(
    entity_id: uuid.UUID,
    data: InvestorCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add an investor to an ownership entity."""
    from decimal import Decimal
    from sqlalchemy import text

    entity = db.query(OwnershipEntity).filter(OwnershipEntity.id == entity_id).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    # Check total
    existing_total = db.execute(
        text("SELECT COALESCE(SUM(ownership_percentage), 0) FROM ownership_entity_investors WHERE ownership_entity_id = :eid"),
        {"eid": entity_id},
    ).scalar()

    if float(existing_total) + data.ownership_percentage > 100:
        raise HTTPException(
            status_code=400,
            detail=f"Total ownership would exceed 100%. Current total: {float(existing_total)}%",
        )

    inv_id = uuid.uuid4()
    db.execute(
        text("INSERT INTO investors (id, name, email, phone) VALUES (:id, :name, :email, :phone)"),
        {"id": inv_id, "name": data.name, "email": data.email, "phone": data.phone},
    )
    db.execute(
        text("INSERT INTO ownership_entity_investors (ownership_entity_id, investor_id, ownership_percentage) VALUES (:eid, :iid, :pct)"),
        {"eid": entity_id, "iid": inv_id, "pct": Decimal(str(data.ownership_percentage))},
    )

    # Auto-link portal access if email matches a User
    portal_user_id = None
    if data.email:
        portal_user = db.execute(
            text("SELECT id FROM users WHERE email = :email AND role = 'investor'"),
            {"email": data.email},
        ).first()
        if portal_user:
            portal_user_id = str(portal_user.id)
            # Get all properties linked to this entity
            prop_ids = db.execute(
                text("SELECT id FROM properties WHERE ownership_entity_id = :eid AND archived_at IS NULL"),
                {"eid": entity_id},
            ).fetchall()
            for prop_row in prop_ids:
                existing = db.execute(
                    text("SELECT 1 FROM property_investors WHERE property_id = :pid AND user_id = :uid"),
                    {"pid": prop_row[0], "uid": portal_user.id},
                ).first()
                if not existing:
                    db.execute(
                        text("INSERT INTO property_investors (property_id, user_id) VALUES (:pid, :uid)"),
                        {"pid": prop_row[0], "uid": portal_user.id},
                    )

    db.commit()

    return {
        "id": str(inv_id),
        "name": data.name,
        "email": data.email,
        "phone": data.phone,
        "ownership_percentage": float(data.ownership_percentage),
        "portal_access": portal_user_id is not None,
    }


@router.patch("/ownership-entities/{entity_id}/investors/{investor_id}")
def update_entity_investor(
    entity_id: uuid.UUID,
    investor_id: uuid.UUID,
    data: InvestorUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an investor's details or ownership percentage."""
    from decimal import Decimal
    from sqlalchemy import text

    # Verify link exists
    link = db.execute(
        text("SELECT * FROM ownership_entity_investors WHERE ownership_entity_id = :eid AND investor_id = :iid"),
        {"eid": entity_id, "iid": investor_id},
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Investor not found in this entity")

    update_data = data.model_dump(exclude_unset=True)

    if "ownership_percentage" in update_data:
        other_total = db.execute(
            text("SELECT COALESCE(SUM(ownership_percentage), 0) FROM ownership_entity_investors WHERE ownership_entity_id = :eid AND investor_id != :iid"),
            {"eid": entity_id, "iid": investor_id},
        ).scalar()

        if float(other_total) + update_data["ownership_percentage"] > 100:
            raise HTTPException(
                status_code=400,
                detail=f"Total would exceed 100%. Other investors total: {float(other_total)}%",
            )
        db.execute(
            text("UPDATE ownership_entity_investors SET ownership_percentage = :pct WHERE ownership_entity_id = :eid AND investor_id = :iid"),
            {"pct": Decimal(str(update_data["ownership_percentage"])), "eid": entity_id, "iid": investor_id},
        )

    # Build UPDATE for investors table
    set_clauses = []
    params = {"id": investor_id}
    for key in ("name", "email", "phone"):
        if key in update_data:
            set_clauses.append(f"{key} = :{key}")
            params[key] = update_data[key]

    if set_clauses:
        db.execute(
            text(f"UPDATE investors SET {', '.join(set_clauses)} WHERE id = :id"),
            params,
        )

    db.commit()

    # Fetch updated data
    inv = db.execute(
        text("SELECT id, name, email, phone FROM investors WHERE id = :id"),
        {"id": investor_id},
    ).first()
    pct = db.execute(
        text("SELECT ownership_percentage FROM ownership_entity_investors WHERE ownership_entity_id = :eid AND investor_id = :iid"),
        {"eid": entity_id, "iid": investor_id},
    ).scalar()

    return {
        "id": str(inv.id),
        "name": inv.name,
        "email": inv.email,
        "phone": inv.phone,
        "ownership_percentage": float(pct),
    }


@router.delete("/ownership-entities/{entity_id}/investors/{investor_id}", status_code=204)
def remove_entity_investor(
    entity_id: uuid.UUID,
    investor_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove an investor from an ownership entity."""
    link = db.query(OwnershipEntityInvestor).filter(
        OwnershipEntityInvestor.ownership_entity_id == entity_id,
        OwnershipEntityInvestor.investor_id == investor_id,
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Investor not found in this entity")
    db.delete(link)
    db.commit()


# ─── Property Ownership ───


@router.get("/properties/{property_id}/ownership")
def get_property_ownership(
    property_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get ownership details for a property."""
    prop = _get_property(current_user.id, property_id, db)

    if not prop.ownership_entity_id:
        return PropertyOwnershipResponse(
            property_id=property_id,
            ownership_type="Individual",
        )

    from sqlalchemy import text

    entity_row = db.execute(
        text("SELECT id, name, entity_type, ein, state_of_formation, status, created_at, updated_at FROM ownership_entities WHERE id = :eid"),
        {"eid": prop.ownership_entity_id},
    ).first()
    if not entity_row:
        return {
            "property_id": str(property_id),
            "ownership_type": "Individual",
            "entity": None,
            "investors": [],
        }

    investor_rows = db.execute(
        text("""
            SELECT i.id, i.name, i.email, i.phone, oei.ownership_percentage
            FROM ownership_entity_investors oei
            JOIN investors i ON i.id = oei.investor_id
            WHERE oei.ownership_entity_id = :eid
            ORDER BY oei.ownership_percentage DESC
        """),
        {"eid": prop.ownership_entity_id},
    ).fetchall()

    return {
        "property_id": str(property_id),
        "ownership_type": "Business Entity",
        "entity": {
            "id": str(entity_row.id),
            "name": entity_row.name,
            "entity_type": entity_row.entity_type,
            "ein": entity_row.ein,
            "state_of_formation": entity_row.state_of_formation,
            "status": entity_row.status,
            "created_at": str(entity_row.created_at),
            "updated_at": str(entity_row.updated_at),
        },
        "investors": [
            {
                "id": str(r.id),
                "name": r.name,
                "email": r.email,
                "phone": r.phone,
                "ownership_percentage": float(r.ownership_percentage),
                "portal_access": db.execute(
                    text("SELECT 1 FROM users WHERE email = :email AND role = 'investor'"),
                    {"email": r.email},
                ).first() is not None if r.email else False,
            }
            for r in investor_rows
        ],
    }


@router.put("/properties/{property_id}/ownership/entity")
def set_property_ownership_entity(
    property_id: uuid.UUID,
    data: SetPropertyEntityRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Set or change the ownership entity for a property."""
    if current_user.role == "investor":
        raise HTTPException(status_code=403, detail="Investors cannot modify ownership")
    from sqlalchemy import text

    prop = _get_property(current_user.id, property_id, db)

    entity_row = db.execute(
        text("SELECT id, name, entity_type, ein, state_of_formation, status, created_at, updated_at FROM ownership_entities WHERE id = :eid"),
        {"eid": data.ownership_entity_id},
    ).first()
    if not entity_row:
        raise HTTPException(status_code=404, detail="Entity not found")

    db.execute(
        text("UPDATE properties SET ownership_entity_id = :eid WHERE id = :pid"),
        {"eid": data.ownership_entity_id, "pid": property_id},
    )

    # Link this property to portal users who are investors in this entity
    portal_links = db.execute(
        text("""
            SELECT u.id AS user_id FROM ownership_entity_investors oei
            JOIN investors i ON i.id = oei.investor_id
            JOIN users u ON u.email = i.email AND u.role = 'investor'
            WHERE oei.ownership_entity_id = :eid
        """),
        {"eid": data.ownership_entity_id},
    ).fetchall()
    for link in portal_links:
        existing = db.execute(
            text("SELECT 1 FROM property_investors WHERE property_id = :pid AND user_id = :uid"),
            {"pid": property_id, "uid": link.user_id},
        ).first()
        if not existing:
            db.execute(
                text("INSERT INTO property_investors (property_id, user_id) VALUES (:pid, :uid)"),
                {"pid": property_id, "uid": link.user_id},
            )

    db.commit()

    investor_rows = db.execute(
        text("""
            SELECT i.id, i.name, i.email, i.phone, oei.ownership_percentage
            FROM ownership_entity_investors oei
            JOIN investors i ON i.id = oei.investor_id
            WHERE oei.ownership_entity_id = :eid
            ORDER BY oei.ownership_percentage DESC
        """),
        {"eid": data.ownership_entity_id},
    ).fetchall()

    return {
        "property_id": str(property_id),
        "ownership_type": "Business Entity",
        "entity": {
            "id": str(entity_row.id),
            "name": entity_row.name,
            "entity_type": entity_row.entity_type,
            "ein": entity_row.ein,
            "state_of_formation": entity_row.state_of_formation,
            "status": entity_row.status,
            "created_at": str(entity_row.created_at),
            "updated_at": str(entity_row.updated_at),
        },
        "investors": [
            {
                "id": str(r.id),
                "name": r.name,
                "email": r.email,
                "phone": r.phone,
                "ownership_percentage": float(r.ownership_percentage),
                "portal_access": db.execute(
                    text("SELECT 1 FROM users WHERE email = :email AND role = 'investor'"),
                    {"email": r.email},
                ).first() is not None if r.email else False,
            }
            for r in investor_rows
        ],
    }


@router.delete("/properties/{property_id}/ownership/entity", status_code=204)
def remove_property_ownership_entity(
    property_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove the ownership entity link from a property (reverts to Individual)."""
    if current_user.role == "investor":
        raise HTTPException(status_code=403, detail="Investors cannot modify ownership")
    prop = _get_property(current_user.id, property_id, db)
    prop.ownership_entity_id = None
    db.commit()
