"""External payment tracking — user-confirmed payments only.

HomeBase never processes payments. The user pays on an external provider
website, then explicitly confirms completion. This router records that
confirmation and advances the next due date based on payment frequency.
"""

import uuid
from datetime import date, datetime, timezone
from types import SimpleNamespace

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


def _hex(uid) -> str:
    """UUID as 32-char hex — the portable bind format for raw SQL.

    SQLite stores postgresql.UUID columns as hex-without-dashes, while
    Postgres accepts bare hex for uuid comparisons. Raw SQL must bind
    this form (dashed strings silently fail to match on SQLite).
    """
    return str(uid).replace("-", "")


def _as_uuid(value) -> uuid.UUID:
    """Normalize a raw row value (uuid object or storage-format str) to uuid.UUID."""
    return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))


def _as_date(value):
    """Normalize a raw row date (date object or ISO str on SQLite) to date."""
    if value is None or isinstance(value, date):
        return value
    return date.fromisoformat(str(value)[:10])


def _get_source_record(db: Session, user_id: uuid.UUID, payment_type: str, source_id: uuid.UUID):
    """Fetch the mortgage/insurance/tax record, verifying the user owns its property."""
    from backend.models.property import Property

    sid = _hex(source_id)
    # FOR UPDATE locks the source row so two concurrent confirmations of
    # the same cycle can't both pass the due-date guard. SQLite rejects
    # the clause, so it is added only on PostgreSQL.
    lock = " FOR UPDATE" if db.get_bind().dialect.name == "postgresql" else ""
    if payment_type == "mortgage":
        row = db.execute(
            text("SELECT m.id, m.property_id, m.next_due_date, m.payment_frequency FROM mortgages m WHERE m.id = :id" + lock),
            {"id": sid},
        ).first()
    elif payment_type == "insurance":
        row = db.execute(
            text("SELECT p.id, p.property_id, p.renewal_date, p.payment_frequency FROM insurance_policies p WHERE p.id = :id" + lock),
            {"id": sid},
        ).first()
    elif payment_type == "tax":
        row = db.execute(
            text("SELECT t.id, t.property_id, t.next_due_date, t.payment_frequency FROM property_taxes t WHERE t.id = :id" + lock),
            {"id": sid},
        ).first()
    else:
        raise HTTPException(status_code=400, detail="payment_type must be mortgage, insurance, or tax")

    if not row:
        raise HTTPException(status_code=404, detail=f"{payment_type} record not found")

    # Raw text() rows carry storage-format values (hex32 str on SQLite, uuid
    # on Postgres). Normalize the UUIDs so downstream ORM binds behave on both.
    row = SimpleNamespace(
        id=_as_uuid(row.id),
        property_id=_as_uuid(row.property_id),
        next_due_date=_as_date(getattr(row, "next_due_date", None)),
        renewal_date=_as_date(getattr(row, "renewal_date", None)),
        payment_frequency=row.payment_frequency,
    )

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

    # Update the source record's due date (dates as ISO str + hex UUID —
    # sqlite3's driver only accepts scalars in raw text() params)
    if payment_type == "mortgage":
        db.execute(
            text("UPDATE mortgages SET next_due_date = :nd WHERE id = :id"),
            {"nd": str(next_due), "id": _hex(source_id)},
        )
    elif payment_type == "insurance":
        db.execute(
            text("UPDATE insurance_policies SET renewal_date = :nd WHERE id = :id"),
            {"nd": str(next_due), "id": _hex(source_id)},
        )
    else:
        db.execute(
            text("UPDATE property_taxes SET next_due_date = :nd WHERE id = :id"),
            {"nd": str(next_due), "id": _hex(source_id)},
        )

    # Sync the related task: advance due date, reset status to Upcoming.
    # task_type is a PostgreSQL enum — use the enum member names.
    task_type_enum = {"mortgage": "MORTGAGE_PAYMENT", "insurance": "INSURANCE_RENEWAL", "tax": "PROPERTY_TAX"}[payment_type]
    db.execute(
        text(
            """
            UPDATE tasks
            SET due_date = :nd, status = 'UPCOMING'
            WHERE property_id = :pid AND task_type = :tt
              AND status IN ('OVERDUE', 'DUE_TODAY', 'UPCOMING')
            """
        ),
        {"nd": str(next_due), "pid": _hex(row.property_id), "tt": task_type_enum},
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
        "message": f"Payment recorded successfully. Your next payment is due on {next_due.strftime('%B %d, %Y').replace(' 0', ' ')}.",
        "next_due_date": str(next_due),
        "due_date": str(due),
        "source": "user_confirmed",
        "recorded_at": str(history.confirmed_at),
    }


def _load_source_amounts(db: Session, records: list) -> dict:
    """Batch-load the payment amount per source record (one query per type — no N+1).

    Returns {str(source_id): amount_or_None} using the payment-type's amount column.
    """
    amounts: dict = {}
    by_type: dict = {}
    for r in records:
        by_type.setdefault(r.payment_type, []).append(r.source_id)

    amount_cols = {
        "mortgage": ("mortgages", "monthly_payment"),
        "insurance": ("insurance_policies", "annual_premium"),
        "tax": ("property_taxes", "annual_tax"),
    }
    for ptype, ids in by_type.items():
        table, col = amount_cols.get(ptype, (None, None))
        if not table:
            continue
        placeholders = ",".join([f":p{i}" for i in range(len(ids))])
        rows = db.execute(
            text(f"SELECT id, {col} FROM {table} WHERE id IN ({placeholders})"),
            {f"p{i}": _hex(sid) for i, sid in enumerate(ids)},
        ).fetchall()
        for rid, amt in rows:
            amounts[_hex(rid)] = float(amt) if amt is not None else None
    return amounts


@router.get("/history")
def payment_history(
    property_id: uuid.UUID = Query(None, description="Filter to a property"),
    payment_type: str = Query(None, description="mortgage | insurance | tax"),
    offset: int = Query(0, ge=0, description="Skip this many records"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List user-confirmed payment history (paginated)."""
    query = db.query(PaymentHistory).filter(PaymentHistory.user_id == current_user.id)
    if property_id:
        query = query.filter(PaymentHistory.property_id == property_id)
    if payment_type:
        query = query.filter(PaymentHistory.payment_type == payment_type)

    records = (
        query.order_by(PaymentHistory.confirmed_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    prop_names = _load_property_names(db, [r.property_id for r in records])
    amounts = _load_source_amounts(db, records)
    return [
        {
            "id": str(r.id),
            "payment_type": r.payment_type,
            "property_id": str(r.property_id),
            "property_name": prop_names.get(_hex(r.property_id)),
            "source_id": str(r.source_id),
            "amount": amounts.get(_hex(r.source_id)),
            "due_date": str(r.due_date) if r.due_date else None,
            "next_due_date": str(r.next_due_date) if r.next_due_date else None,
            "confirmed_at": str(r.confirmed_at),
            "source": r.source,
        }
        for r in records
    ]


@router.delete("/history/{history_id}")
def undo_payment(
    history_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Undo a confirmed payment — removes it from history and reverts the
    source record's due date back to the confirmed cycle (and the task).

    Only the MOST RECENT confirmation for a payment source can be undone.
    Undoing an older cycle while a later one was already confirmed would
    corrupt the due-date chain (the later confirmation legitimately
    advanced the date further), so that case is rejected with a 409.
    """
    record = db.query(PaymentHistory).filter(
        PaymentHistory.id == history_id,
        PaymentHistory.user_id == current_user.id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Payment record not found")

    later_exists = db.query(PaymentHistory).filter(
        PaymentHistory.user_id == current_user.id,
        PaymentHistory.source_id == record.source_id,
        PaymentHistory.confirmed_at > record.confirmed_at,
    ).first()
    if later_exists:
        raise HTTPException(
            status_code=409,
            detail="This payment is not the most recent one — undo the most recent payment first.",
        )

    # Revert the source record's due date to the confirmed cycle
    # (dates as ISO str + hex UUID — sqlite3 only accepts scalars in raw params)
    sid = _hex(record.source_id)
    due_str = str(record.due_date)
    if record.payment_type == "mortgage":
        db.execute(
            text("UPDATE mortgages SET next_due_date = :d WHERE id = :sid"),
            {"d": due_str, "sid": sid},
        )
    elif record.payment_type == "insurance":
        db.execute(
            text("UPDATE insurance_policies SET renewal_date = :d WHERE id = :sid"),
            {"d": due_str, "sid": sid},
        )
    elif record.payment_type == "tax":
        db.execute(
            text("UPDATE property_taxes SET next_due_date = :d WHERE id = :sid"),
            {"d": due_str, "sid": sid},
        )

    # Re-sync the task: restore the due date and recompute status from today.
    # task_type is a PostgreSQL enum — use the enum member names.
    task_type_enum = {
        "mortgage": "MORTGAGE_PAYMENT",
        "insurance": "INSURANCE_RENEWAL",
        "tax": "PROPERTY_TAX",
    }[record.payment_type]
    today = date.today()
    if record.due_date < today:
        task_status = "OVERDUE"
    elif record.due_date == today:
        task_status = "DUE_TODAY"
    else:
        task_status = "UPCOMING"
    db.execute(
        text(
            """
            UPDATE tasks
            SET due_date = :d, status = :st
            WHERE property_id = :pid AND task_type = :tt
              AND status IN ('OVERDUE', 'DUE_TODAY', 'UPCOMING')
            """
        ),
        {"d": due_str, "st": task_status, "pid": _hex(record.property_id), "tt": task_type_enum},
    )

    db.delete(record)
    db.commit()

    return {
        "status": "ok",
        "message": f"Payment for {record.due_date} undone. Due date restored to {record.due_date}.",
        "due_date": str(record.due_date),
    }


def _load_property_names(db: Session, ids: list) -> dict:
    """Batch-load property names in ONE query (avoids N+1 lookups)."""
    unique = {pid for pid in ids if pid}
    if not unique:
        return {}
    placeholders = ",".join([f":p{i}" for i in range(len(unique))])
    rows = db.execute(
        text(f"SELECT id, name FROM properties WHERE id IN ({placeholders})"),
        {f"p{i}": _hex(pid) for i, pid in enumerate(unique)},
    ).fetchall()
    return {_hex(r[0]): str(r[1]) for r in rows}
