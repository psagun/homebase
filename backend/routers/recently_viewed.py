"""Track recently viewed properties per user."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from backend.dependencies import get_current_user, get_db
from backend.models.user import User
from backend.models.property import Property
from backend.models.recently_viewed import RecentlyViewed

router = APIRouter()
MAX_ITEMS = 20


def _serialize_property(p: Property) -> dict:
    pt = p.property_type.value if hasattr(p.property_type, "value") else str(p.property_type)
    st = p.status.value if hasattr(p.status, "value") else str(p.status)
    return {
        "id": str(p.id),
        "name": p.name,
        "city": p.city,
        "state": p.state,
        "property_type": pt,
        "status": st,
        "current_value": float(p.current_value or 0),
    }


@router.get("/")
def list_recently_viewed(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get recently viewed properties for the authenticated user."""
    rows = (
        db.query(RecentlyViewed)
        .options(joinedload(RecentlyViewed.property))
        .filter(RecentlyViewed.user_id == current_user.id)
        .order_by(RecentlyViewed.viewed_at.desc())
        .limit(6)
        .all()
    )
    return [_serialize_property(r.property) for r in rows if r.property and not getattr(r.property, "archived_at", None)]


@router.post("/{property_id}")
def record_view(
    property_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record that a user viewed a property."""
    # Verify property exists
    try:
        pid = uuid.UUID(property_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid property ID")

    prop = db.query(Property).filter(
        Property.id == pid,
        Property.archived_at.is_(None),
    ).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    # Delete old entries for this property by this user (upsert behavior)
    db.query(RecentlyViewed).filter(
        RecentlyViewed.user_id == current_user.id,
        RecentlyViewed.property_id == pid,
    ).delete()

    # Insert new record
    rv = RecentlyViewed(user_id=current_user.id, property_id=pid, viewed_at=datetime.now(timezone.utc))
    db.add(rv)

    # Keep only the last MAX_ITEMS
    all_rows = (
        db.query(RecentlyViewed)
        .filter(RecentlyViewed.user_id == current_user.id)
        .order_by(RecentlyViewed.viewed_at.desc())
        .all()
    )
    for old in all_rows[MAX_ITEMS:]:
        db.delete(old)

    db.commit()
    return {"status": "ok"}
