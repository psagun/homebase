import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field, field_serializer


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    property_id: Optional[str] = None
    task_type: str = "Custom"
    due_date: Optional[date] = None
    priority: str = "Medium"


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    property_id: Optional[str] = None
    task_type: Optional[str] = None
    due_date: Optional[date] = None
    priority: Optional[str] = None
    status: Optional[str] = None


class TaskResponse(BaseModel):
    id: uuid.UUID
    property_id: Optional[uuid.UUID] = None
    property_name: Optional[str] = None
    user_id: uuid.UUID
    title: str
    description: Optional[str] = None
    task_type: str
    due_date: Optional[date] = None
    priority: str
    status: str
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @field_serializer("id", "user_id", "property_id")
    def serialize_uuids(self, v):
        return str(v) if v else None
