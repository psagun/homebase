"""Ownership management — entities, investors, and property links."""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

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


@router.get("/ownership-entities/{entity_id}/investors", response_model=list[InvestorResponse])
def list_entity_investors(
    entity_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List investors in an ownership entity with their percentages."""
    entity = db.query(OwnershipEntity).filter(OwnershipEntity.id == entity_id).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    links = (
        db.query(OwnershipEntityInvestor)
        .options(joinedload(OwnershipEntityInvestor.investor))
        .filter(OwnershipEntityInvestor.ownership_entity_id == entity_id)
        .all()
    )

    return [
        InvestorResponse(
            id=link.investor.id,
            name=link.investor.name,
            email=link.investor.email,
            phone=link.investor.phone,
            ownership_percentage=float(link.ownership_percentage),
        )
        for link in links
    ]


@router.post("/ownership-entities/{entity_id}/investors", response_model=InvestorResponse, status_code=201)
def add_entity_investor(
    entity_id: uuid.UUID,
    data: InvestorCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add an investor to an ownership entity (creates or links investor)."""
    entity = db.query(OwnershipEntity).filter(OwnershipEntity.id == entity_id).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    # Check total ownership percentage
    existing_total = db.query(
        db.func.coalesce(db.func.sum(OwnershipEntityInvestor.ownership_percentage), 0)
    ).filter(
        OwnershipEntityInvestor.ownership_entity_id == entity_id
    ).scalar()

    if float(existing_total) + data.ownership_percentage > 100:
        raise HTTPException(
            status_code=400,
            detail=f"Total ownership would exceed 100%. Current total: {float(existing_total)}%",
        )

    # Create or reuse investor
    investor = Investor(
        id=uuid.uuid4(),
        name=data.name,
        email=data.email,
        phone=data.phone,
    )
    db.add(investor)
    db.flush()

    link = OwnershipEntityInvestor(
        ownership_entity_id=entity_id,
        investor_id=investor.id,
        ownership_percentage=data.ownership_percentage,
    )
    db.add(link)
    db.commit()

    return InvestorResponse(
        id=investor.id,
        name=investor.name,
        email=investor.email,
        phone=investor.phone,
        ownership_percentage=data.ownership_percentage,
    )


@router.patch("/ownership-entities/{entity_id}/investors/{investor_id}", response_model=InvestorResponse)
def update_entity_investor(
    entity_id: uuid.UUID,
    investor_id: uuid.UUID,
    data: InvestorUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an investor's details or ownership percentage."""
    link = db.query(OwnershipEntityInvestor).filter(
        OwnershipEntityInvestor.ownership_entity_id == entity_id,
        OwnershipEntityInvestor.investor_id == investor_id,
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Investor not found in this entity")

    investor = db.query(Investor).filter(Investor.id == investor_id).first()
    if not investor:
        raise HTTPException(status_code=404, detail="Investor not found")

    update_data = data.model_dump(exclude_unset=True)

    # Update percentage
    if "ownership_percentage" in update_data:
        # Calculate what other investors have
        other_total = db.query(
            db.func.coalesce(db.func.sum(OwnershipEntityInvestor.ownership_percentage), 0)
        ).filter(
            OwnershipEntityInvestor.ownership_entity_id == entity_id,
            OwnershipEntityInvestor.investor_id != investor_id,
        ).scalar()

        if float(other_total) + update_data["ownership_percentage"] > 100:
            raise HTTPException(
                status_code=400,
                detail=f"Total ownership would exceed 100%. Other investors total: {float(other_total)}%",
            )
        link.ownership_percentage = update_data.pop("ownership_percentage")

    # Update investor fields
    for key in ("name", "email", "phone"):
        if key in update_data:
            setattr(investor, key, update_data[key])

    db.commit()

    return InvestorResponse(
        id=investor.id,
        name=investor.name,
        email=investor.email,
        phone=investor.phone,
        ownership_percentage=float(link.ownership_percentage),
    )


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


@router.get("/properties/{property_id}/ownership", response_model=PropertyOwnershipResponse)
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

    entity = db.query(OwnershipEntity).filter(OwnershipEntity.id == prop.ownership_entity_id).first()
    if not entity:
        return PropertyOwnershipResponse(
            property_id=property_id,
            ownership_type="Individual",
        )

    links = (
        db.query(OwnershipEntityInvestor)
        .options(joinedload(OwnershipEntityInvestor.investor))
        .filter(OwnershipEntityInvestor.ownership_entity_id == entity.id)
        .all()
    )

    investors = [
        InvestorResponse(
            id=link.investor.id,
            name=link.investor.name,
            email=link.investor.email,
            phone=link.investor.phone,
            ownership_percentage=float(link.ownership_percentage),
        )
        for link in links
    ]

    return PropertyOwnershipResponse(
        property_id=property_id,
        ownership_type="Business Entity",
        entity=EntityResponse(
            id=entity.id,
            name=entity.name,
            entity_type=entity.entity_type,
            ein=entity.ein,
            state_of_formation=entity.state_of_formation,
            status=entity.status,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        ),
        investors=investors,
    )


@router.put("/properties/{property_id}/ownership/entity", response_model=PropertyOwnershipResponse)
def set_property_ownership_entity(
    property_id: uuid.UUID,
    data: SetPropertyEntityRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Set or change the ownership entity for a property."""
    prop = _get_property(current_user.id, property_id, db)

    entity = db.query(OwnershipEntity).filter(OwnershipEntity.id == data.ownership_entity_id).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    prop.ownership_entity_id = data.ownership_entity_id
    db.commit()
    db.refresh(prop)

    # Return updated ownership
    links = (
        db.query(OwnershipEntityInvestor)
        .options(joinedload(OwnershipEntityInvestor.investor))
        .filter(OwnershipEntityInvestor.ownership_entity_id == entity.id)
        .all()
    )

    investors = [
        InvestorResponse(
            id=link.investor.id,
            name=link.investor.name,
            email=link.investor.email,
            phone=link.investor.phone,
            ownership_percentage=float(link.ownership_percentage),
        )
        for link in links
    ]

    return PropertyOwnershipResponse(
        property_id=property_id,
        ownership_type="Business Entity",
        entity=EntityResponse(
            id=entity.id,
            name=entity.name,
            entity_type=entity.entity_type,
            ein=entity.ein,
            state_of_formation=entity.state_of_formation,
            status=entity.status,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        ),
        investors=investors,
    )


@router.delete("/properties/{property_id}/ownership/entity", status_code=204)
def remove_property_ownership_entity(
    property_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove the ownership entity link from a property (reverts to Individual)."""
    prop = _get_property(current_user.id, property_id, db)
    prop.ownership_entity_id = None
    db.commit()
