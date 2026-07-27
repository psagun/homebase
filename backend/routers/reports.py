"""Financial report endpoints — P&L, cash flow, YTD, annual."""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.dependencies import get_current_user, get_db
from backend.models.user import User
from backend.services import report_service

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/pnl")
def get_pnl(
    from_date: Optional[str] = Query(None, description="Start date (ISO format, e.g. 2026-01-01)"),
    to_date: Optional[str] = Query(None, description="End date (ISO format, e.g. 2026-12-31)"),
    property_id: Optional[uuid.UUID] = Query(None, description="Filter to a single property"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Profit & Loss statement for a date range."""
    return report_service.get_pnl(
        db, current_user.id, from_date=from_date, to_date=to_date, property_id=property_id,
    )


@router.get("/cash-flow")
def get_cash_flow(
    from_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    to_date: Optional[str] = Query(None, description="End date (ISO format)"),
    property_id: Optional[uuid.UUID] = Query(None, description="Filter to a single property"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Monthly cash flow data for charting."""
    return report_service.get_cash_flow(
        db, current_user.id, from_date=from_date, to_date=to_date, property_id=property_id,
    )


@router.get("/ytd")
def get_ytd(
    property_id: Optional[uuid.UUID] = Query(None, description="Filter to a single property"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Year-to-date summary vs prior year."""
    return report_service.get_ytd(db, current_user.id, property_id=property_id)


@router.get("/annual")
def get_annual(
    year: Optional[int] = Query(None, description="Year (e.g. 2026). Defaults to current year."),
    property_id: Optional[uuid.UUID] = Query(None, description="Filter to a single property"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Full-year monthly P&L breakdown."""
    return report_service.get_annual(db, current_user.id, year=year, property_id=property_id)
