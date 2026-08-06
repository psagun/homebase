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
from backend.models.hoa_fee import HoaFee
from backend.services import notification_service
from backend.schemas.property_modules import (
    TaxCreate, TaxUpdate, TenantCreate, TenantUpdate,
    MaintenanceCreate, MaintenanceUpdate, HoaFeeCreate, HoaFeeUpdate,
)

router = APIRouter()
MODEL_MAP = {"taxes": PropertyTax, "tenants": Tenant, "maintenance": MaintenanceRecord}


def _validate_portal_url(value):
    """Ensure portal URLs use a safe scheme (http/https only)."""
    if value is None:
        return
    parsed = urlparse(str(value))
    if parsed.scheme not in ("https", "http"):
        raise HTTPException(400, "portal_url must start with http:// or https://")


def _clean_values(model, data: dict) -> dict:
    """Normalize incoming values for a model:
    - Empty strings → None (DATE/NUMERIC columns reject '' in PostgreSQL)
    - Only keep fields that exist on the model
    - Drop id/property_id (never writable)
    """
    cleaned = {}
    for k, v in data.items():
        if k in ("id", "property_id") or not hasattr(model, k):
            continue
        if v == "":
            v = None
        cleaned[k] = v
    return cleaned

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
def create_tax(property_id: uuid.UUID, data: TaxCreate, cur=Depends(get_current_user), db: Session = Depends(get_db)):
    _get_prop(cur, property_id, db)
    _validate_portal_url(data.portal_url)
    t = PropertyTax(id=uuid.uuid4(), property_id=property_id, **_clean_values(PropertyTax, data.model_dump()))
    db.add(t); db.commit(); db.refresh(t)
    notification_service.maybe_send(db, cur.id, "property", "Tax record added", "A tax record was added to your property.")
    return t

@router.patch("/properties/{property_id}/taxes/{tax_id}")
def update_tax(property_id: uuid.UUID, tax_id: uuid.UUID, data: TaxUpdate, cur=Depends(get_current_user), db: Session = Depends(get_db)):
    _get_prop(cur, property_id, db)
    tax = db.query(PropertyTax).filter(PropertyTax.id == tax_id, PropertyTax.property_id == property_id).first()
    if not tax:
        raise HTTPException(404, "Tax record not found")
    _validate_portal_url(data.portal_url)
    for k, v in _clean_values(PropertyTax, data.model_dump(exclude_unset=True)).items():
        setattr(tax, k, v)
    db.commit(); db.refresh(tax)
    notification_service.maybe_send(db, cur.id, "property", "Tax record updated", "A tax record on your property was updated.")
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
def create_tenant(property_id: uuid.UUID, data: TenantCreate, cur=Depends(get_current_user), db: Session = Depends(get_db)):
    _get_prop(cur, property_id, db)
    t = Tenant(id=uuid.uuid4(), property_id=property_id, **_clean_values(Tenant, data.model_dump()))
    db.add(t); db.commit(); db.refresh(t)
    notification_service.maybe_send(db, cur.id, "tenant", "Tenant added", "{name} was added as a tenant.".format(name=t.name))
    return t

@router.patch("/properties/{property_id}/tenants/{tenant_id}")
def update_tenant(property_id: uuid.UUID, tenant_id: uuid.UUID, data: TenantUpdate, cur=Depends(get_current_user), db: Session = Depends(get_db)):
    _get_prop(cur, property_id, db)
    tenant = db.query(Tenant).filter(
        Tenant.id == tenant_id, Tenant.property_id == property_id
    ).first()
    if not tenant:
        raise HTTPException(404, "Tenant not found")
    for k, v in _clean_values(Tenant, data.model_dump(exclude_unset=True)).items():
        setattr(tenant, k, v)
    db.commit(); db.refresh(tenant)
    notification_service.maybe_send(db, cur.id, "tenant", "Tenant updated", "Tenant {name} was updated.".format(name=tenant.name))
    return tenant

@router.delete("/properties/{property_id}/tenants/{tenant_id}", status_code=204)
def delete_tenant(property_id: uuid.UUID, tenant_id: uuid.UUID, cur=Depends(get_current_user), db: Session = Depends(get_db)):
    _get_prop(cur, property_id, db)
    tenant = db.query(Tenant).filter(
        Tenant.id == tenant_id, Tenant.property_id == property_id
    ).first()
    if not tenant:
        raise HTTPException(404, "Tenant not found")
    db.delete(tenant); db.commit()

@router.get("/properties/{property_id}/maintenance")
def list_maintenance(property_id: uuid.UUID, cur=Depends(get_current_user), db: Session = Depends(get_db)):
    _get_prop(cur, property_id, db)
    return db.query(MaintenanceRecord).filter(MaintenanceRecord.property_id == property_id).order_by(MaintenanceRecord.date.desc()).all()

@router.post("/properties/{property_id}/maintenance")
def create_maintenance(property_id: uuid.UUID, data: MaintenanceCreate, cur=Depends(get_current_user), db: Session = Depends(get_db)):
    _get_prop(cur, property_id, db)
    m = MaintenanceRecord(id=uuid.uuid4(), property_id=property_id, **_clean_values(MaintenanceRecord, data.model_dump()))
    db.add(m); db.commit(); db.refresh(m)
    notification_service.maybe_send(db, cur.id, "maintenance", "Maintenance record added", "Maintenance record {title} was added to your log.".format(title=m.title))
    return m

@router.patch("/properties/{property_id}/maintenance/{record_id}")
def update_maintenance(property_id: uuid.UUID, record_id: uuid.UUID, data: MaintenanceUpdate, cur=Depends(get_current_user), db: Session = Depends(get_db)):
    _get_prop(cur, property_id, db)
    rec = db.query(MaintenanceRecord).filter(
        MaintenanceRecord.id == record_id, MaintenanceRecord.property_id == property_id
    ).first()
    if not rec:
        raise HTTPException(404, "Maintenance record not found")
    for k, v in _clean_values(MaintenanceRecord, data.model_dump(exclude_unset=True)).items():
        setattr(rec, k, v)
    db.commit(); db.refresh(rec)
    notification_service.maybe_send(db, cur.id, "maintenance", "Maintenance record updated", "Maintenance record {title} was updated in your log.".format(title=rec.title))
    return rec

@router.delete("/properties/{property_id}/maintenance/{record_id}", status_code=204)
def delete_maintenance(property_id: uuid.UUID, record_id: uuid.UUID, cur=Depends(get_current_user), db: Session = Depends(get_db)):
    _get_prop(cur, property_id, db)
    rec = db.query(MaintenanceRecord).filter(
        MaintenanceRecord.id == record_id, MaintenanceRecord.property_id == property_id
    ).first()
    if not rec:
        raise HTTPException(404, "Maintenance record not found")
    db.delete(rec); db.commit()


@router.get("/properties/{property_id}/hoa")
def list_hoa_fees(property_id: uuid.UUID, cur=Depends(get_current_user), db: Session = Depends(get_db)):
    _get_prop(cur, property_id, db)
    return db.query(HoaFee).filter(HoaFee.property_id == property_id).order_by(HoaFee.next_due_date.asc().nullslast()).all()


@router.post("/properties/{property_id}/hoa")
def create_hoa_fee(property_id: uuid.UUID, data: HoaFeeCreate, cur=Depends(get_current_user), db: Session = Depends(get_db)):
    _get_prop(cur, property_id, db)
    _validate_portal_url(data.portal_url)
    h = HoaFee(id=uuid.uuid4(), property_id=property_id, **_clean_values(HoaFee, data.model_dump()))
    db.add(h); db.commit(); db.refresh(h)
    notification_service.maybe_send(db, cur.id, "bill", "HOA fee added", "HOA fee for {name} was added.".format(name=h.association_name))
    return h


@router.patch("/properties/{property_id}/hoa/{fee_id}")
def update_hoa_fee(property_id: uuid.UUID, fee_id: uuid.UUID, data: HoaFeeUpdate, cur=Depends(get_current_user), db: Session = Depends(get_db)):
    _get_prop(cur, property_id, db)
    fee = db.query(HoaFee).filter(HoaFee.id == fee_id, HoaFee.property_id == property_id).first()
    if not fee:
        raise HTTPException(404, "HOA fee record not found")
    _validate_portal_url(data.portal_url)
    for k, v in _clean_values(HoaFee, data.model_dump(exclude_unset=True)).items():
        setattr(fee, k, v)
    db.commit(); db.refresh(fee)
    notification_service.maybe_send(db, cur.id, "bill", "HOA fee updated", "HOA fee for {name} was updated.".format(name=fee.association_name))
    return fee


@router.delete("/properties/{property_id}/hoa/{fee_id}", status_code=204)
def delete_hoa_fee(property_id: uuid.UUID, fee_id: uuid.UUID, cur=Depends(get_current_user), db: Session = Depends(get_db)):
    _get_prop(cur, property_id, db)
    fee = db.query(HoaFee).filter(HoaFee.id == fee_id, HoaFee.property_id == property_id).first()
    if not fee:
        raise HTTPException(404, "HOA fee record not found")
    db.delete(fee); db.commit()
