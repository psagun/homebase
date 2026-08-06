"""Admin router — investor management endpoints, gated by admin role."""

import secrets
import uuid

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.dependencies import get_current_user, get_db
from backend.models.property_investor import PropertyInvestor
from backend.models.user import User
from backend.schemas.admin import InvestorCreate, InvestorResponse, InvestorUpdate

router = APIRouter()


def _hex(uid) -> str:
    """UUID as 32-char hex — portable bind format for raw SQL."""
    return str(uid).replace("-", "")


@router.get("/db-info")
def db_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Diagnostic: show the database host the app is connected to (password masked)."""
    _require_admin(current_user)
    from urllib.parse import urlparse
    from backend.config import settings

    url = settings.database_url
    parsed = urlparse(url)
    # Mask credentials but reveal host/port/dbname so the user can locate the DB
    return {
        "dialect": parsed.scheme,
        "host": parsed.hostname,
        "port": parsed.port,
        "database": parsed.path.lstrip("/").split("?")[0],
        "username": parsed.username,
        "ssl_required": "sslmode=require" in url or "ssl" in parsed.scheme,
    }


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


@router.get("/investors/suggest-properties")
def suggest_properties_for_email(
    email: str = Query(..., description="Email to check ownership entity matches"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return properties an investor should have access to based on ownership entity membership.

    If this email is recorded as an investor in any ownership entity, all properties
    linked to those entities are suggested. This lets the admin pre-select the right
    properties when creating a portal account.
    """
    _require_admin(current_user)
    from sqlalchemy import text

    # Find entities where this email is an investor
    rows = db.execute(
        text("""
            SELECT DISTINCT e.id AS entity_id, e.name AS entity_name
            FROM ownership_entity_investors oei
            JOIN investors i ON i.id = oei.investor_id
            JOIN ownership_entities e ON e.id = oei.ownership_entity_id
            WHERE LOWER(i.email) = LOWER(:email)
        """),
        {"email": email},
    ).fetchall()

    if not rows:
        return {"entities": [], "property_ids": []}

    entity_ids = [r.entity_id for r in rows]
    entity_names = {str(r.entity_id): r.entity_name for r in rows}

    # Find properties linked to those entities. Build explicit placeholders —
    # binding a tuple to `IN :eids` makes the DBAPI driver reject the query.
    placeholders = ",".join([f":e{i}" for i in range(len(entity_ids))])
    props = db.execute(
        text(f"""
            SELECT id, name, ownership_entity_id
            FROM properties
            WHERE ownership_entity_id IN ({placeholders}) AND archived_at IS NULL
        """),
        {f"e{i}": _hex(eid) for i, eid in enumerate(entity_ids)},
    ).fetchall()

    return {
        "entities": [
            {"id": str(eid), "name": entity_names[str(eid)]}
            for eid in entity_ids
        ],
        "property_ids": [str(p.id) for p in props],
        "properties": [
            {
                "id": str(p.id),
                "name": p.name,
                "entity_id": str(p.ownership_entity_id),
                "entity_name": entity_names.get(str(p.ownership_entity_id), ""),
            }
            for p in props
        ],
    }


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

    # Assign properties — validate every id exists and belongs to the admin
    assigned_ids = set(data.property_ids or [])
    if assigned_ids:
        placeholders = ",".join([f":p{i}" for i in range(len(assigned_ids))])
        valid = {
            _hex(r[0])
            for r in db.execute(
                text(f"SELECT id FROM properties WHERE user_id = :u AND id IN ({placeholders})"),
                {"u": _hex(current_user.id), **{f"p{i}": _hex(pid) for i, pid in enumerate(assigned_ids)}},
            ).fetchall()
        }
        missing = {str(p) for p in assigned_ids if _hex(p) not in valid}
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown property ids: {', '.join(sorted(missing)[:5])}",
            )

    # Auto-link properties from ownership entity membership (email match)
    auto_rows = db.execute(
        text("""
            SELECT DISTINCT p.id AS prop_id
            FROM ownership_entity_investors oei
            JOIN investors i ON i.id = oei.investor_id
            JOIN properties p ON p.ownership_entity_id = oei.ownership_entity_id
            WHERE LOWER(i.email) = LOWER(:email) AND p.archived_at IS NULL
        """),
        {"email": data.email},
    ).fetchall()
    for row in auto_rows:
        assigned_ids.add(row.prop_id)

    for prop_id in assigned_ids:
        existing_link = db.query(PropertyInvestor).filter(
            PropertyInvestor.property_id == prop_id,
            PropertyInvestor.user_id == user.id,
        ).first()
        if not existing_link:
            db.add(PropertyInvestor(property_id=prop_id, user_id=user.id))

    db.commit()
    db.refresh(user)

    # Build response
    response = InvestorResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        property_ids=list(assigned_ids),
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
        # Validate every id exists and belongs to the admin
        if data.property_ids:
            placeholders = ",".join([f":p{i}" for i in range(len(data.property_ids))])
            valid = {
                _hex(r[0])
                for r in db.execute(
                    text(f"SELECT id FROM properties WHERE user_id = :u AND id IN ({placeholders})"),
                    {"u": _hex(current_user.id), **{f"p{i}": _hex(pid) for i, pid in enumerate(data.property_ids)}},
                ).fetchall()
            }
            missing = {str(p) for p in data.property_ids if _hex(p) not in valid}
            if missing:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unknown property ids: {', '.join(sorted(missing)[:5])}",
                )

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


def _clone_row(model, src, **overrides):
    """Copy a row's column values into a new instance with a fresh id.

    Enum members, decimals, and dates carry over via the ORM; id and
    created/updated timestamps are regenerated.
    """
    data = {
        c.name: getattr(src, c.name)
        for c in model.__table__.columns
        if c.name not in ("id", "created_at", "updated_at")
    }
    data.update(overrides)
    data["id"] = uuid.uuid4()
    return model(**data)


@router.post("/copy-portfolio")
def copy_portfolio(
    target_email: str = Query(..., description="Email of the account receiving the portfolio"),
    apply: bool = Query(False, description="Apply the copy; default is a dry-run report"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Copy the demo portfolio (6 properties + all records) to another account.

    One-off migration helper. Clones properties, mortgages, insurance,
    taxes, tenants, maintenance, transactions, tasks, contacts, documents
    (metadata only) and payment history. Ownership entities are global, so
    links carry over untouched; investor portal links are NOT copied.
    Existing properties on the target (same name+address) are skipped.
    """
    _require_admin(current_user)
    from backend.models.contact import Contact, property_contacts
    from backend.models.document import Document
    from backend.models.insurance_policy import InsurancePolicy
    from backend.models.maintenance_record import MaintenanceRecord
    from backend.models.mortgage import Mortgage
    from backend.models.payment_history import PaymentHistory
    from backend.models.property import Property
    from backend.models.property_tax import PropertyTax
    from backend.models.task import Task
    from backend.models.tenant import Tenant
    from backend.models.transaction import Transaction

    source = db.query(User).filter(User.email == "demo@homebase.app").first()
    target = db.query(User).filter(User.email == target_email).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source account (demo@homebase.app) not found")
    if not target:
        raise HTTPException(status_code=404, detail="Target account not found")

    report = {"target": target.email, "dry_run": not apply, "properties": []}
    existing_names = {
        (r[0], r[1])
        for r in db.query(Property.name, Property.address_line_1).filter(
            Property.user_id == target.id, Property.archived_at.is_(None)
        ).all()
    }

    source_props = (
        db.query(Property)
        .filter(Property.user_id == source.id, Property.archived_at.is_(None))
        .order_by(Property.created_at)
        .all()
    )

    for sp in source_props:
        if (sp.name, sp.address_line_1) in existing_names:
            report["properties"].append({"name": sp.name, "status": "skipped (exists on target)"})
            continue

        # Plan counts for the dry run
        plan = {
            "mortgages": db.query(Mortgage).filter(Mortgage.property_id == sp.id).count(),
            "insurance": db.query(InsurancePolicy).filter(InsurancePolicy.property_id == sp.id).count(),
            "taxes": db.query(PropertyTax).filter(PropertyTax.property_id == sp.id).count(),
            "tenants": db.query(Tenant).filter(Tenant.property_id == sp.id).count(),
            "maintenance": db.query(MaintenanceRecord).filter(MaintenanceRecord.property_id == sp.id).count(),
            "transactions": db.query(Transaction).filter(Transaction.property_id == sp.id).count(),
            "tasks": db.query(Task).filter(Task.property_id == sp.id, Task.user_id == source.id).count(),
            "payment_history": db.query(PaymentHistory).filter(PaymentHistory.property_id == sp.id).count(),
            "contacts": db.query(property_contacts).filter(property_contacts.c.property_id == sp.id).count(),
            "documents": db.query(Document).filter(Document.property_id == sp.id).count(),
        }

        if not apply:
            report["properties"].append({"name": sp.name, "status": "would copy", **plan})
            continue

        # ── Apply: clone the property and everything attached ──
        np = _clone_row(Property, sp, user_id=target.id)
        db.add(np)
        db.flush()

        source_id_map = {}  # (model, old_id) -> new_id for payment_history.source_id
        for model in (Mortgage, InsurancePolicy, PropertyTax):
            for row in db.query(model).filter(model.property_id == sp.id).all():
                clone = _clone_row(model, row, property_id=np.id)
                db.add(clone)
                db.flush()
                source_id_map[(model.__name__, row.id)] = clone.id

        for row in db.query(Tenant).filter(Tenant.property_id == sp.id).all():
            db.add(_clone_row(Tenant, row, property_id=np.id))
        for row in db.query(MaintenanceRecord).filter(MaintenanceRecord.property_id == sp.id).all():
            db.add(_clone_row(MaintenanceRecord, row, property_id=np.id))
        for row in db.query(Transaction).filter(Transaction.property_id == sp.id).all():
            db.add(_clone_row(Transaction, row, property_id=np.id, user_id=target.id))
        for row in db.query(Task).filter(Task.property_id == sp.id, Task.user_id == source.id).all():
            db.add(_clone_row(Task, row, property_id=np.id, user_id=target.id))

        # Payment history — remap source_id to the cloned mortgage/insurance/tax
        for row in db.query(PaymentHistory).filter(PaymentHistory.property_id == sp.id).all():
            model_name = {"mortgage": "Mortgage", "insurance": "InsurancePolicy", "tax": "PropertyTax"}.get(row.payment_type)
            new_source = source_id_map.get((model_name, row.source_id), row.source_id)
            db.add(_clone_row(PaymentHistory, row, property_id=np.id, user_id=target.id, source_id=new_source))

        # Contacts — clone once per source contact, then link
        contact_map = {}
        link_rows = db.execute(
            text("SELECT contact_id FROM property_contacts WHERE property_id = :pid"),
            {"pid": _hex(sp.id)},
        ).fetchall()
        for link in link_rows:
            src_contact = db.query(Contact).filter(Contact.id == uuid.UUID(str(link.contact_id))).first()
            if not src_contact:
                continue
            if src_contact.id not in contact_map:
                contact_map[src_contact.id] = _clone_row(Contact, src_contact, user_id=target.id)
                db.add(contact_map[src_contact.id])
                db.flush()
            db.execute(
                text("INSERT INTO property_contacts (property_id, contact_id) VALUES (:pid, :cid)"),
                {"pid": _hex(np.id), "cid": _hex(contact_map[src_contact.id].id)},
            )

        # Documents — metadata only (same storage key, files untouched)
        for row in db.query(Document).filter(Document.property_id == sp.id).all():
            db.add(_clone_row(Document, row, property_id=np.id, user_id=target.id))

        existing_names.add((sp.name, sp.address_line_1))
        report["properties"].append({"name": sp.name, "status": "copied", **plan})

    if apply:
        db.commit()

    report["total"] = len(report["properties"])
    return {"status": "ok", "report": report}


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
