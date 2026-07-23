import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_serializer


class InsuranceCreate(BaseModel):
    provider_name: str = Field(..., min_length=1, max_length=200)
    policy_number: Optional[str] = None
    policy_type: Optional[str] = None
    portal_url: Optional[str] = None
    coverage_amount: Optional[Decimal] = None
    deductible: Optional[Decimal] = None
    annual_premium: Optional[Decimal] = None
    effective_date: Optional[date] = None
    expiration_date: Optional[date] = None
    renewal_date: Optional[date] = None
    agent_name: Optional[str] = None
    agent_phone: Optional[str] = None
    agent_email: Optional[str] = None


class InsuranceUpdate(BaseModel):
    provider_name: Optional[str] = None
    policy_number: Optional[str] = None
    policy_type: Optional[str] = None
    portal_url: Optional[str] = None
    coverage_amount: Optional[Decimal] = None
    deductible: Optional[Decimal] = None
    annual_premium: Optional[Decimal] = None
    effective_date: Optional[date] = None
    expiration_date: Optional[date] = None
    renewal_date: Optional[date] = None
    agent_name: Optional[str] = None
    agent_phone: Optional[str] = None
    agent_email: Optional[str] = None


class InsuranceResponse(BaseModel):
    id: uuid.UUID
    property_id: uuid.UUID
    provider_name: str
    policy_number: Optional[str] = None
    policy_type: Optional[str] = None
    portal_url: Optional[str] = None
    coverage_amount: Optional[Decimal] = None
    deductible: Optional[Decimal] = None
    annual_premium: Optional[Decimal] = None
    effective_date: Optional[date] = None
    expiration_date: Optional[date] = None
    renewal_date: Optional[date] = None
    agent_name: Optional[str] = None
    agent_phone: Optional[str] = None
    agent_email: Optional[str] = None
    is_active: bool = True
    ended_at: Optional[date] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @field_serializer("id", "property_id")
    def serialize_uuids(self, value: uuid.UUID) -> str:
        return str(value)
