import uuid
from datetime import datetime
from typing import Optional

import uuid

from pydantic import BaseModel, Field, field_serializer


class ContactCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    company: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    notes: Optional[str] = None
    contact_type: str = "Other"
    is_favorite: bool = False
    property_ids: Optional[list[uuid.UUID]] = None


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    notes: Optional[str] = None
    contact_type: Optional[str] = None
    is_favorite: Optional[bool] = None


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
    is_favorite: bool = False
    created_at: datetime
    updated_at: datetime
    property_ids: Optional[list[uuid.UUID]] = None

    model_config = {"from_attributes": True}

    @field_serializer("id", "user_id")
    def serialize_uuids(self, v):
        return str(v)
