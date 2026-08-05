"""CSV import endpoints — properties, transactions."""

import csv
import io
import uuid
from decimal import Decimal
from datetime import date, datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from backend.dependencies import get_current_user, get_db
from backend.models.user import User
from backend.models.property import Property, PropertyStatus, PropertyType
from backend.models.transaction import Transaction, TransactionCategory, TransactionType

router = APIRouter(prefix="/import", tags=["import"])

MONTH_NAMES = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}


def _parse_date(value: str) -> date | None:
    """Parse a date string in various common formats."""
    value = value.strip()
    if not value:
        return None

    # YYYY-MM-DD
    if len(value) == 10 and value[4] == "-":
        try:
            return date.fromisoformat(value)
        except ValueError:
            pass

    # MM/DD/YYYY or M/D/YYYY
    if "/" in value:
        parts = value.split("/")
        if len(parts) == 3:
            try:
                m, d, y = int(parts[0]), int(parts[1]), int(parts[2])
                if y < 100:
                    y += 2000
                return date(y, m, d)
            except ValueError:
                pass

    # "Jan 15, 2024" or "January 15, 2024"
    for fmt in ("%b %d, %Y", "%B %d, %Y", "%d-%b-%Y", "%d-%B-%Y"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue

    return None


def _parse_decimal(value: str) -> Decimal | None:
    value = value.strip().replace("$", "").replace(",", "").replace(" ", "")
    if not value:
        return None
    try:
        return Decimal(value)
    except Exception:
        return None


def _parse_int(value: str) -> int | None:
    value = value.strip()
    if not value:
        return None
    try:
        return int(value)
    except Exception:
        return None


def _normalize_header(header: str) -> str:
    """Normalize CSV column names to snake_case field names."""
    h = header.strip().lower().replace(" ", "_").replace("-", "_")
    # Common aliases
    aliases = {
        "address": "address_line_1",
        "address_1": "address_line_1",
        "address1": "address_line_1",
        "street": "address_line_1",
        "address_2": "address_line_2",
        "address2": "address_line_2",
        "unit": "address_line_2",
        "zip": "postal_code",
        "zip_code": "postal_code",
        "type": "property_type",
        "beds": "bedrooms",
        "bed": "bedrooms",
        "baths": "bathrooms",
        "bath": "bathrooms",
        "purchase_price": "purchase_price",
        "price": "purchase_price",
        "value": "current_value",
        "current_value": "current_value",
    }
    return aliases.get(h, h)


@router.post("/properties")
def import_properties(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Import properties from a CSV file.

    CSV columns (any order, case-insensitive):
    name, address_line_1, city, state, postal_code,
    property_type, status, purchase_price, current_value,
    lot_size, bedrooms, bathrooms, year_built, notes
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    content = file.file.read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))

    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV file is empty or has no header row")

    imported = 0
    skipped = 0
    errors: list[dict] = []

    # Preload the user's existing (name, address) pairs once — checking per
    # row with a query would be N queries on a large import.
    existing_pairs = {
        (r[0], r[1])
        for r in db.query(Property.name, Property.address_line_1).filter(
            Property.user_id == current_user.id,
            Property.archived_at.is_(None),
        ).all()
    }

    for row_idx, row in enumerate(reader, start=2):
        try:
            # Normalize keys
            normalized = {_normalize_header(k): v.strip() for k, v in row.items() if v and v.strip()}

            name = normalized.get("name")
            if not name:
                skipped += 1
                errors.append({"row": row_idx, "reason": "Missing required field: name"})
                continue

            address = normalized.get("address_line_1")
            city = normalized.get("city")
            state = normalized.get("state")
            postal = normalized.get("postal_code")
            if not all([address, city, state, postal]):
                skipped += 1
                errors.append({"row": row_idx, "reason": "Missing required fields: address_line_1, city, state, postal_code"})
                continue

            # Check for duplicate by name+address (in-memory set)
            if (name, address) in existing_pairs:
                skipped += 1
                errors.append({"row": row_idx, "reason": f"Duplicate property: {name}"})
                continue

            # A provided but unparsable price must fail the row loudly —
            # silently importing $0 corrupts portfolio totals.
            price_raw = normalized.get("purchase_price", "")
            value_raw = normalized.get("current_value", "")
            purchase_price = _parse_decimal(price_raw) if price_raw else Decimal("0")
            current_value = _parse_decimal(value_raw) if value_raw else Decimal("0")
            if (price_raw and purchase_price is None) or (value_raw and current_value is None):
                skipped += 1
                errors.append({"row": row_idx, "reason": f"Invalid price value: purchase_price={price_raw!r} current_value={value_raw!r}"})
                continue

            ptype = normalized.get("property_type", "Single Family")
            # Map to valid PropertyType enum
            ptype_map = {e.value.lower(): e for e in PropertyType}
            ptype_enum = ptype_map.get(ptype.lower(), PropertyType.SINGLE_FAMILY)

            status_val = normalized.get("status", "Vacant")
            status_map = {e.value.lower(): e for e in PropertyStatus}
            status_enum = status_map.get(status_val.lower(), PropertyStatus.VACANT)

            prop = Property(
                id=uuid.uuid4(),
                user_id=current_user.id,
                name=name,
                address_line_1=address,
                address_line_2=normalized.get("address_line_2"),
                city=city,
                state=state,
                postal_code=postal,
                country=normalized.get("country", "US"),
                property_type=ptype_enum,
                status=status_enum,
                purchase_date=_parse_date(normalized.get("purchase_date", "")),
                purchase_price=purchase_price,
                current_value=current_value,
                lot_size=_parse_decimal(normalized.get("lot_size", "")),
                bedrooms=_parse_int(normalized.get("bedrooms", "")),
                bathrooms=_parse_decimal(normalized.get("bathrooms", "")),
                year_built=_parse_int(normalized.get("year_built", "")),
                notes=normalized.get("notes"),
            )
            # SAVEPOINT per row: on Postgres one failed flush poisons the
            # whole transaction — roll back to the savepoint instead.
            try:
                with db.begin_nested():
                    db.add(prop)
                    db.flush()
            except Exception:
                db.expunge(prop)
                raise
            existing_pairs.add((name, address))
            imported += 1

        except Exception as e:
            skipped += 1
            errors.append({"row": row_idx, "reason": str(e)})

    db.commit()

    return {
        "imported": imported,
        "skipped": skipped,
        "errors": errors[:20],  # Return first 20 errors
    }


@router.post("/transactions")
def import_transactions(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Import transactions from a CSV file.

    CSV columns (any order, case-insensitive):
    property_name, transaction_type, category, amount, transaction_date, description

    property_name must match an existing property name owned by the user.
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    content = file.file.read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))

    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV file is empty or has no header row")

    # Build property name → id lookup
    properties = db.query(Property).filter(
        Property.user_id == current_user.id,
        Property.archived_at.is_(None),
    ).all()
    prop_by_name: dict[str, uuid.UUID] = {p.name.lower().strip(): p.id for p in properties}

    imported = 0
    skipped = 0
    errors: list[dict] = []

    for row_idx, row in enumerate(reader, start=2):
        try:
            normalized = {_normalize_header(k): v.strip() for k, v in row.items() if v and v.strip()}

            prop_name = normalized.get("property_name")
            if not prop_name:
                skipped += 1
                errors.append({"row": row_idx, "reason": "Missing required field: property_name"})
                continue

            prop_id = prop_by_name.get(prop_name.lower().strip())
            if not prop_id:
                skipped += 1
                errors.append({"row": row_idx, "reason": f"Property not found: {prop_name}"})
                continue

            ttype = normalized.get("transaction_type", "").lower()
            if ttype not in ("income", "expense"):
                skipped += 1
                errors.append({"row": row_idx, "reason": f"Invalid transaction_type: {ttype}. Must be 'income' or 'expense'"})
                continue

            category = normalized.get("category", "")
            if not category:
                skipped += 1
                errors.append({"row": row_idx, "reason": "Missing required field: category"})
                continue

            amount = _parse_decimal(normalized.get("amount", ""))
            if amount is None or amount <= 0:
                skipped += 1
                errors.append({"row": row_idx, "reason": f"Invalid amount: {normalized.get('amount', '')}"})
                continue

            txn_date = _parse_date(normalized.get("transaction_date", ""))
            if txn_date is None:
                skipped += 1
                errors.append({"row": row_idx, "reason": f"Invalid or missing transaction_date: {normalized.get('transaction_date', '')}"})
                continue

            # Map category to enum if possible
            cat_map = {e.value.lower(): e for e in TransactionCategory}
            cat_enum = cat_map.get(category.lower())
            if not cat_enum:
                skipped += 1
                errors.append({"row": row_idx, "reason": f"Invalid category: {category}"})
                continue

            txn = Transaction(
                id=uuid.uuid4(),
                property_id=prop_id,
                user_id=current_user.id,
                transaction_type=TransactionType.INCOME if ttype == "income" else TransactionType.EXPENSE,
                category=cat_enum,
                amount=amount,
                transaction_date=txn_date,
                description=normalized.get("description"),
            )
            db.add(txn)
            db.flush()
            imported += 1

        except Exception as e:
            skipped += 1
            errors.append({"row": row_idx, "reason": str(e)})

    db.commit()

    return {
        "imported": imported,
        "skipped": skipped,
        "errors": errors[:20],
    }
