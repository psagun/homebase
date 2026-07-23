import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_serializer


class TransactionCreate(BaseModel):
    transaction_type: str = Field(..., pattern="^(income|expense)$")
    category: str = Field(..., min_length=1)
    amount: Decimal = Field(..., gt=0)
    transaction_date: date
    description: Optional[str] = None


class TransactionUpdate(BaseModel):
    category: Optional[str] = None
    amount: Optional[Decimal] = None
    transaction_date: Optional[date] = None
    description: Optional[str] = None


class TransactionResponse(BaseModel):
    id: uuid.UUID
    property_id: uuid.UUID
    user_id: uuid.UUID
    transaction_type: str
    category: str
    amount: Decimal
    transaction_date: date
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @field_serializer("id", "property_id", "user_id")
    def serialize_uuids(self, v):
        return str(v)
