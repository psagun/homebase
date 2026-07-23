import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_serializer


class PropertyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    address_line_1: str = Field(..., min_length=1, max_length=255)
    address_line_2: Optional[str] = None
    city: str = Field(..., min_length=1, max_length=100)
    state: str = Field(..., min_length=1, max_length=100)
    postal_code: str = Field(..., min_length=1, max_length=20)
    country: str = "US"
    property_type: str = "Single Family"
    status: str = "Vacant"
    purchase_date: Optional[date] = None
    purchase_price: Optional[Decimal] = None
    current_value: Optional[Decimal] = None
    lot_size: Optional[Decimal] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[Decimal] = None
    year_built: Optional[int] = None
    notes: Optional[str] = None


class PropertyUpdate(BaseModel):
    name: Optional[str] = None
    address_line_1: Optional[str] = None
    address_line_2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    property_type: Optional[str] = None
    status: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[Decimal] = None
    current_value: Optional[Decimal] = None
    lot_size: Optional[Decimal] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[Decimal] = None
    year_built: Optional[int] = None
    notes: Optional[str] = None


class PropertyResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    address_line_1: str
    address_line_2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str
    property_type: str
    status: str
    purchase_date: Optional[date] = None
    purchase_price: Optional[Decimal] = None
    current_value: Optional[Decimal] = None
    lot_size: Optional[Decimal] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[Decimal] = None
    year_built: Optional[int] = None
    notes: Optional[str] = None
    archived_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @field_serializer("id", "user_id")
    def serialize_uuids(self, value: uuid.UUID) -> str:
        return str(value)
