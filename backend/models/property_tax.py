import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Date, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from backend.database import Base

class PropertyTax(Base):
    __tablename__ = "property_taxes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True)
    county = Column(String(100), nullable=True)
    tax_authority = Column(String(200), nullable=True)
    parcel_id = Column(String(100), nullable=True)
    portal_url = Column(String(500), nullable=True)
    annual_tax = Column(Numeric(10, 2), nullable=True)
    payment_frequency = Column(String(50), default="Annual")
    next_due_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
