from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.dependencies import get_db
from backend.services.dashboard_service import get_dashboard_summary, get_properties_list

router = APIRouter()


@router.get("/summary")
def dashboard_summary(db: Session = Depends(get_db)):
    """Portfolio-level summary metrics."""
    return get_dashboard_summary(db)


@router.get("/properties")
def dashboard_properties(db: Session = Depends(get_db)):
    """All properties for the dashboard table view."""
    return get_properties_list(db)
