import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_serializer


class ContactCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    company: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    notes: Optional[str] = None
    contact_type: str = "Other"
    property_ids: Optional[list[str]] = None


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    notes: Optional[str] = None
    contact_type: Optional[str] = None


class ContactResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    company: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    notes: Optional[str] = None
    contact_type: str
    created_at: datetime
    updated_at: datetime
    property_ids: Optional[list[str]] = None

    model_config = {"from_attributes": True}

    @field_serializer("id", "user_id")
    def serialize_uuids(self, v):
        return str(v)
