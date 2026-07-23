import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_serializer


class DocumentResponse(BaseModel):
    id: uuid.UUID
    property_id: uuid.UUID
    user_id: uuid.UUID
    name: str
    category: str
    storage_key: str
    file_type: str
    file_size: int
    expiration_date: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @field_serializer("id", "property_id", "user_id")
    def serialize_uuids(self, v: uuid.UUID) -> str:
        return str(v)
