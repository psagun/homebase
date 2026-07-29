"""Admin router — investor management endpoints, gated by admin role."""

import secrets
import uuid

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.dependencies import get_current_user, get_db
from backend.models.property_investor import PropertyInvestor
from backend.models.user import User
from backend.schemas.admin import InvestorCreate, InvestorResponse, InvestorUpdate

router = APIRouter()


def _require_admin(current_user: User) -> None:
    """Raise 403 if the current user is not an admin."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )


def _fetch_investors_with_properties(
    db: Session, user_ids: list[uuid.UUID] | None = None
) -> list[dict]:
    """Fetch investor user records and their assigned property IDs.

    Returns a list of dicts with keys: id, name, email, role, property_ids.
    """
    query = db.query(User).filter(User.role == "investor")
    if user_ids is not None:
        query = query.filter(User.id.in_(user_ids))

    users = query.all()

    # Batch-load property assignments for all matching users
    all_user_ids = [u.id for u in users]
    assignments = (
        db.query(PropertyInvestor)
        .filter(PropertyInvestor.user_id.in_(all_user_ids))
        .all()
    ) if all_user_ids else []

    property_map: dict[uuid.UUID, list[uuid.UUID]] = {}
    for a in assignments:
        property_map.setdefault(a.user_id, []).append(a.property_id)

    results = []
    for user in users:
        results.append(
            {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "property_ids": property_map.get(user.id, []),
            }
        )
    return results


def _generate_temp_password(length: int = 16) -> str:
    """Generate a cryptographically random temporary password."""
    return secrets.token_urlsafe(length)


@router.get("/investors", response_model=list[InvestorResponse])
def list_investors(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all investors with their property assignments."""
    _require_admin(current_user)
    return _fetch_investors_with_properties(db)


@router.post("/investors", response_model=InvestorResponse, status_code=status.HTTP_201_CREATED)
def create_investor(
    data: InvestorCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new investor user, assign properties, and return a temp password."""
    _require_admin(current_user)

    # Check for duplicate email
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    # Generate temporary password and create user
    temp_password = _generate_temp_password()
    user = User(
        id=uuid.uuid4(),
        name=data.name,
        email=data.email,
        password_hash=bcrypt.hashpw(
            temp_password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8"),
        role="investor",
    )
    db.add(user)
    db.flush()  # get the user ID before assigning properties

    # Assign properties
    if data.property_ids:
        for prop_id in data.property_ids:
            assignment = PropertyInvestor(
                property_id=prop_id, user_id=user.id
            )
            db.add(assignment)

    db.commit()
    db.refresh(user)

    # Build response
    response = InvestorResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        property_ids=data.property_ids,
    )
    # Attach the plain-text temp password so the admin can share it
    response.temp_password = temp_password
    return response


@router.patch("/investors/{investor_id}", response_model=InvestorResponse)
def update_investor(
    investor_id: uuid.UUID,
    data: InvestorUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an investor's name and/or property assignments."""
    _require_admin(current_user)

    user = db.query(User).filter(User.id == investor_id, User.role == "investor").first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investor not found",
        )

    if data.name is not None:
        user.name = data.name

    if data.property_ids is not None:
        # Remove existing assignments
        db.query(PropertyInvestor).filter(
            PropertyInvestor.user_id == user.id
        ).delete()

        # Add new assignments
        for prop_id in data.property_ids:
            db.add(PropertyInvestor(property_id=prop_id, user_id=user.id))

    db.commit()
    db.refresh(user)

    # Reload property IDs after update
    assigned = (
        db.query(PropertyInvestor)
        .filter(PropertyInvestor.user_id == user.id)
        .all()
    )
    property_ids = [a.property_id for a in assigned]

    return InvestorResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        property_ids=property_ids,
    )


@router.post("/investors/{investor_id}/reset-password")
def reset_investor_password(
    investor_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a new temporary password for an investor."""
    _require_admin(current_user)

    user = db.query(User).filter(User.id == investor_id, User.role == "investor").first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investor not found",
        )

    temp_password = _generate_temp_password()
    user.password_hash = bcrypt.hashpw(
        temp_password.encode("utf-8"), bcrypt.gensalt()
    ).decode("utf-8")
    db.commit()

    return {"temp_password": temp_password}


@router.delete("/investors/{investor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_investor(
    investor_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an investor and their property assignments."""
    _require_admin(current_user)

    user = db.query(User).filter(User.id == investor_id, User.role == "investor").first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investor not found",
        )

    # Property-investor assignments are cascade-deleted by the FK,
    # but we delete them explicitly for clarity.
    db.query(PropertyInvestor).filter(
        PropertyInvestor.user_id == user.id
    ).delete()

    db.delete(user)
    db.commit()

    return None
