import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class EntityCreate(BaseModel):
    name: str
    entity_type: Optional[str] = None
    ein: Optional[str] = None
    state_of_formation: Optional[str] = None
    status: str = "Active"


class EntityUpdate(BaseModel):
    name: Optional[str] = None
    entity_type: Optional[str] = None
    ein: Optional[str] = None
    state_of_formation: Optional[str] = None
    status: Optional[str] = None


class EntityResponse(BaseModel):
    id: uuid.UUID
    name: str
    entity_type: Optional[str] = None
    ein: Optional[str] = None
    state_of_formation: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class InvestorCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    ownership_percentage: float = Field(..., gt=0, le=100)


class InvestorUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    ownership_percentage: Optional[float] = Field(None, gt=0, le=100)


class InvestorResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    ownership_percentage: float

    model_config = {"from_attributes": True}


class EntityWithInvestorsResponse(BaseModel):
    entity: Optional[EntityResponse] = None
    investors: list[InvestorResponse] = []
    ownership_type: str = "Individual"  # "Individual" or "Business Entity"


class PropertyOwnershipResponse(BaseModel):
    property_id: uuid.UUID
    ownership_type: str
    entity: Optional[EntityResponse] = None
    investors: list[InvestorResponse] = []


class SetPropertyEntityRequest(BaseModel):
    ownership_entity_id: uuid.UUID
