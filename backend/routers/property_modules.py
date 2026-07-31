"""Generic CRUD for property sub-modules (taxes, tenants, maintenance)."""
import uuid
from datetime import date
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.dependencies import get_current_user, get_db
from backend.models.user import User
from backend.models.property import Property
from backend.models.property_tax import PropertyTax
from backend.models.tenant import Tenant
from backend.models.maintenance_record import MaintenanceRecord

router = APIRouter()
MODEL_MAP = {"taxes": PropertyTax, "tenants": Tenant, "maintenance": MaintenanceRecord}


def _validate_portal_url(value):
    """Ensure portal URLs use a safe scheme (http/https only)."""
    if value is None:
        return
    parsed = urlparse(str(value))
    if parsed.scheme not in ("https", "http"):
        raise HTTPException(400, "portal_url must start with http:// or https://")

def _get_prop(user, property_id, db):
    """Verify user has access to this property. Checks both direct ownership and PropertyInvestor."""
    from backend.models.property_investor import PropertyInvestor
    if user.role == "investor":
        link = db.query(PropertyInvestor).filter(
            PropertyInvestor.property_id == property_id,
            PropertyInvestor.user_id == user.id,
        ).first()
        if not link:
            raise HTTPException(404, "Property not found")
    else:
        prop = db.query(Property).filter(
            Property.id == property_id,
            Property.user_id == user.id,
            Property.archived_at.is_(None),
        ).first()
        if not prop:
            raise HTTPException(404, "Property not found")
    return True

@router.get("/properties/{property_id}/taxes")
def list_taxes(property_id: uuid.UUID, cur=Depends(get_current_user), db: Session = Depends(get_db)):
    _get_prop(cur, property_id, db)
    return db.query(PropertyTax).filter(PropertyTax.property_id == property_id).all()

@router.post("/properties/{property_id}/taxes")
def create_tax(property_id: uuid.UUID, data: dict, cur=Depends(get_current_user), db: Session = Depends(get_db)):
    _get_prop(cur, property_id, db)
    _validate_portal_url(data.get("portal_url"))
    t = PropertyTax(id=uuid.uuid4(), property_id=property_id, **{k: v for k, v in data.items() if hasattr(PropertyTax, k)})
    db.add(t); db.commit(); return t

@router.patch("/properties/{property_id}/taxes/{tax_id}")
def update_tax(property_id: uuid.UUID, tax_id: uuid.UUID, data: dict, cur=Depends(get_current_user), db: Session = Depends(get_db)):
    _get_prop(cur, property_id, db)
    tax = db.query(PropertyTax).filter(PropertyTax.id == tax_id, PropertyTax.property_id == property_id).first()
    if not tax:
        raise HTTPException(404, "Tax record not found")
    _validate_portal_url(data.get("portal_url"))
    for k, v in data.items():
        if hasattr(PropertyTax, k) and k != "id" and k != "property_id":
            setattr(tax, k, v)
    db.commit(); db.refresh(tax)
    return tax

@router.delete("/properties/{property_id}/taxes/{tax_id}", status_code=204)
def delete_tax(property_id: uuid.UUID, tax_id: uuid.UUID, cur=Depends(get_current_user), db: Session = Depends(get_db)):
    _get_prop(cur, property_id, db)
    tax = db.query(PropertyTax).filter(PropertyTax.id == tax_id, PropertyTax.property_id == property_id).first()
    if not tax:
        raise HTTPException(404, "Tax record not found")
    db.delete(tax); db.commit()

@router.get("/properties/{property_id}/tenants")
def list_tenants(property_id: uuid.UUID, cur=Depends(get_current_user), db: Session = Depends(get_db)):
    _get_prop(cur, property_id, db)
    return db.query(Tenant).filter(Tenant.property_id == property_id).all()

@router.post("/properties/{property_id}/tenants")
def create_tenant(property_id: uuid.UUID, data: dict, cur=Depends(get_current_user), db: Session = Depends(get_db)):
    _get_prop(cur, property_id, db)
    t = Tenant(id=uuid.uuid4(), property_id=property_id, **{k: v for k, v in data.items() if hasattr(Tenant, k)})
    db.add(t); db.commit(); return t

@router.get("/properties/{property_id}/maintenance")
def list_maintenance(property_id: uuid.UUID, cur=Depends(get_current_user), db: Session = Depends(get_db)):
    _get_prop(cur, property_id, db)
    return db.query(MaintenanceRecord).filter(MaintenanceRecord.property_id == property_id).order_by(MaintenanceRecord.date.desc()).all()

@router.post("/properties/{property_id}/maintenance")
def create_maintenance(property_id: uuid.UUID, data: dict, cur=Depends(get_current_user), db: Session = Depends(get_db)):
    _get_prop(cur, property_id, db)
    m = MaintenanceRecord(id=uuid.uuid4(), property_id=property_id, **{k: v for k, v in data.items() if hasattr(MaintenanceRecord, k)})
    db.add(m); db.commit(); return m
