import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Date, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from backend.database import Base

class Tenant(Base):
    __tablename__ = "tenants"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    move_in_date = Column(Date, nullable=True)
    lease_start = Column(Date, nullable=True)
    lease_end = Column(Date, nullable=True)
    monthly_rent = Column(Numeric(10, 2), nullable=True)
    security_deposit = Column(Numeric(10, 2), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
