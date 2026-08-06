"""Pydantic schemas for property sub-modules (taxes, tenants, maintenance).

These give FastAPI real 422 validation on the create/update endpoints
instead of untyped `dict` bodies that crash with 500 on bad input.
"""

from datetime import date
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class _EmptyStrToNone(BaseModel):
    """Frontends submit empty strings for unset fields — coerce to None
    before type validation ("" for a date/number would otherwise 422)."""

    @field_validator("*", mode="before")
    @classmethod
    def _empty_to_none(cls, v):
        if isinstance(v, str) and v.strip() == "":
            return None
        return v


class TaxCreate(_EmptyStrToNone):
    county: Optional[str] = None
    tax_authority: Optional[str] = None
    parcel_id: Optional[str] = None
    portal_url: Optional[str] = None
    annual_tax: Optional[float] = None
    payment_frequency: Optional[str] = None
    next_due_date: Optional[date] = None


class TaxUpdate(TaxCreate):
    pass


class TenantCreate(_EmptyStrToNone):
    name: str = Field(..., min_length=1, max_length=200)
    email: Optional[str] = None
    phone: Optional[str] = None
    move_in_date: Optional[date] = None
    lease_start: Optional[date] = None
    lease_end: Optional[date] = None
    monthly_rent: Optional[float] = None
    security_deposit: Optional[float] = None


class TenantUpdate(TenantCreate):
    name: Optional[str] = Field(None, min_length=1, max_length=200)


class MaintenanceCreate(_EmptyStrToNone):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    date: Optional[date] = None
    scheduled_date: Optional[date] = None
    completed_date: Optional[date] = None
    cost: Optional[float] = None
    contractor: Optional[str] = None
    notes: Optional[str] = None
    warranty_expiration: Optional[date] = None


class MaintenanceUpdate(MaintenanceCreate):
    title: Optional[str] = Field(None, min_length=1, max_length=200)


class HoaFeeCreate(_EmptyStrToNone):
    association_name: str = Field(..., min_length=1, max_length=200)
    fee_amount: Optional[float] = None
    payment_frequency: Optional[str] = None
    next_due_date: Optional[date] = None
    portal_url: Optional[str] = None
    notes: Optional[str] = None


class HoaFeeUpdate(HoaFeeCreate):
    association_name: Optional[str] = Field(None, min_length=1, max_length=200)
