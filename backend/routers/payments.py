"""External payment tracking — user-confirmed payments only.

HomeBase never processes payments. The user pays on an external provider
website, then explicitly confirms completion. This router records that
confirmation and advances the next due date based on payment frequency.
"""

import uuid
from datetime import date, datetime, timezone

from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.dependencies import get_current_user, get_db
from backend.models.user import User
from backend.models.payment_history import PaymentHistory

router = APIRouter(prefix="/payments", tags=["payments"])

FREQUENCY_MONTHS = {
    "Monthly": 1,
    "Quarterly": 3,
    "Semi-Annual": 6,
    "Annual": 12,
}


def _next_due(due: date, frequency: str) -> date:
    """Compute next due date from the configured payment frequency."""
    months = FREQUENCY_MONTHS.get(frequency or "Monthly", 1)
    return due + relativedelta(months=months)


def _get_source_record(db: Session, user_id: uuid.UUID, payment_type: str, source_id: uuid.UUID):
    """Fetch the mortgage/insurance/tax record, verifying the user owns its property."""
    from backend.models.property import Property

    if payment_type == "mortgage":
        row = db.execute(
            text("SELECT m.id, m.property_id, m.next_due_date, m.payment_frequency FROM mortgages m WHERE m.id = :id"),
            {"id": source_id},
        ).first()
    elif payment_type == "insurance":
        row = db.execute(
            text("SELECT p.id, p.property_id, p.renewal_date, p.payment_frequency FROM insurance_policies p WHERE p.id = :id"),
            {"id": source_id},
        ).first()
    elif payment_type == "tax":
        row = db.execute(
            text("SELECT t.id, t.property_id, t.next_due_date, t.payment_frequency FROM property_taxes t WHERE t.id = :id"),
            {"id": source_id},
        ).first()
    else:
        raise HTTPException(status_code=400, detail="payment_type must be mortgage, insurance, or tax")

    if not row:
        raise HTTPException(status_code=404, detail=f"{payment_type} record not found")

    prop = db.query(Property).filter(
        Property.id == row.property_id,
        Property.user_id == user_id,
        Property.archived_at.is_(None),
    ).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    return row


@router.post("/confirm")
def confirm_payment(
    payment_type: str = Query(..., description="mortgage | insurance | tax"),
    source_id: uuid.UUID = Query(..., description="ID of the mortgage/insurance/tax record"),
    due_date: date = Query(..., description="The payment cycle being confirmed (must match the record's current due date)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record a user-confirmed external payment and advance the next due date.

    Never called automatically — always the result of explicit user
    confirmation after paying on the provider's website.

    Idempotency guard: the caller must pass the exact due date of the cycle
    they are confirming. If the record has already advanced past that cycle
    (e.g. a double-confirm), the request is rejected — a payment cycle can
    only ever be confirmed once.
    """
    row = _get_source_record(db, current_user.id, payment_type, source_id)

    # Determine current due date for this payment type
    if payment_type == "mortgage":
        due = row.next_due_date
        frequency = row.payment_frequency or "Monthly"
    elif payment_type == "insurance":
        due = row.renewal_date
        frequency = row.payment_frequency or "Annual"
    else:
        due = row.next_due_date
        frequency = row.payment_frequency or "Annual"

    if not due:
        raise HTTPException(status_code=400, detail="No due date set for this record")

    # Cycle guard: the confirmed due date must match the record's current due date.
    # This prevents accidentally confirming the NEXT cycle (double-confirm).
    if str(due) != str(due_date):
        raise HTTPException(
            status_code=409,
            detail=f"This payment has already been confirmed. Current due date is {due}.",
        )

    next_due = _next_due(due, frequency)

    # Update the source record's due date
    if payment_type == "mortgage":
        db.execute(
            text("UPDATE mortgages SET next_due_date = :nd WHERE id = :id"),
            {"nd": next_due, "id": source_id},
        )
    elif payment_type == "insurance":
        db.execute(
            text("UPDATE insurance_policies SET renewal_date = :nd WHERE id = :id"),
            {"nd": next_due, "id": source_id},
        )
    else:
        db.execute(
            text("UPDATE property_taxes SET next_due_date = :nd WHERE id = :id"),
            {"nd": next_due, "id": source_id},
        )

    # Sync the related task: advance due date, reset status to Upcoming.
    # task_type is a PostgreSQL enum — use the enum member names.
    task_type_enum = {"mortgage": "MORTGAGE_PAYMENT", "insurance": "INSURANCE_RENEWAL", "tax": "PROPERTY_TAX"}[payment_type]
    db.execute(
        text(
            """
            UPDATE tasks
            SET due_date = :nd, status = 'Upcoming'
            WHERE property_id = :pid AND task_type = :tt
              AND status IN ('Overdue', 'Due Today', 'Upcoming')
            """
        ),
        {"nd": next_due, "pid": row.property_id, "tt": task_type_enum},
    )

    # Record payment history
    history = PaymentHistory(
        id=uuid.uuid4(),
        user_id=current_user.id,
        property_id=row.property_id,
        payment_type=payment_type,
        source_id=source_id,
        due_date=due,
        next_due_date=next_due,
        confirmed_at=datetime.now(timezone.utc),
        source="user_confirmed",
    )
    db.add(history)
    db.commit()

    return {
        "status": "ok",
        "message": f"Payment recorded successfully. Your next payment is due on {next_due.strftime('%B %-d, %Y').replace(' 0', ' ')}.",
        "next_due_date": str(next_due),
        "due_date": str(due),
        "source": "user_confirmed",
        "recorded_at": str(history.confirmed_at),
    }


@router.get("/history")
def payment_history(
    property_id: uuid.UUID = Query(None, description="Filter to a property"),
    payment_type: str = Query(None, description="mortgage | insurance | tax"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List user-confirmed payment history."""
    query = db.query(PaymentHistory).filter(PaymentHistory.user_id == current_user.id)
    if property_id:
        query = query.filter(PaymentHistory.property_id == property_id)
    if payment_type:
        query = query.filter(PaymentHistory.payment_type == payment_type)

    records = query.order_by(PaymentHistory.confirmed_at.desc()).limit(50).all()
    return [
        {
            "id": str(r.id),
            "payment_type": r.payment_type,
            "property_id": str(r.property_id),
            "source_id": str(r.source_id),
            "due_date": str(r.due_date) if r.due_date else None,
            "next_due_date": str(r.next_due_date) if r.next_due_date else None,
            "confirmed_at": str(r.confirmed_at),
            "source": r.source,
        }
        for r in records
    ]
