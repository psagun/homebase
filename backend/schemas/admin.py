import uuid
from pydantic import BaseModel


class InvestorCreate(BaseModel):
    name: str
    email: str
    property_ids: list[uuid.UUID] = []


class InvestorUpdate(BaseModel):
    name: str | None = None
    property_ids: list[uuid.UUID] | None = None


class InvestorResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    role: str
    property_ids: list[uuid.UUID] = []
    temp_password: str | None = None

    model_config = {"from_attributes": True}
