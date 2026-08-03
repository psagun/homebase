import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_serializer


class MortgageCreate(BaseModel):
    lender_name: str = Field(..., min_length=1, max_length=200)
    loan_number: Optional[str] = None
    loan_type: Optional[str] = None
    portal_url: Optional[str] = None
    interest_rate: Optional[Decimal] = None
    original_amount: Optional[Decimal] = None
    current_balance: Optional[Decimal] = None
    monthly_payment: Optional[Decimal] = None
    payment_frequency: Optional[str] = None
    loan_term_months: Optional[int] = None
    start_date: Optional[date] = None
    maturity_date: Optional[date] = None
    next_due_date: Optional[date] = None
    autopay_enabled: bool = False


class MortgageUpdate(BaseModel):
    lender_name: Optional[str] = None
    loan_number: Optional[str] = None
    loan_type: Optional[str] = None
    portal_url: Optional[str] = None
    interest_rate: Optional[Decimal] = None
    original_amount: Optional[Decimal] = None
    current_balance: Optional[Decimal] = None
    monthly_payment: Optional[Decimal] = None
    payment_frequency: Optional[str] = None
    loan_term_months: Optional[int] = None
    start_date: Optional[date] = None
    maturity_date: Optional[date] = None
    next_due_date: Optional[date] = None
    autopay_enabled: Optional[bool] = None


class MortgageResponse(BaseModel):
    id: uuid.UUID
    property_id: uuid.UUID
    lender_name: str
    loan_number: Optional[str] = None
    loan_type: Optional[str] = None
    portal_url: Optional[str] = None
    interest_rate: Optional[Decimal] = None
    original_amount: Optional[Decimal] = None
    current_balance: Optional[Decimal] = None
    monthly_payment: Optional[Decimal] = None
    payment_frequency: Optional[str] = None
    loan_term_months: Optional[int] = None
    start_date: Optional[date] = None
    maturity_date: Optional[date] = None
    next_due_date: Optional[date] = None
    autopay_enabled: bool = False
    is_active: bool = True
    ended_at: Optional[date] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @field_serializer("id", "property_id")
    def serialize_uuids(self, value: uuid.UUID) -> str:
        return str(value)
