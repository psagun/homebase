from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.dependencies import get_db, get_current_user
from backend.models.user import User
from backend.services.dashboard_service import get_dashboard_summary, get_properties_list

router = APIRouter()


@router.get("/summary")
def dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Portfolio-level summary metrics."""
    return get_dashboard_summary(db, current_user)


@router.get("/properties")
def dashboard_properties(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """All properties for the dashboard table view."""
    return get_properties_list(db, current_user)
