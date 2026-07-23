import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Date, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from backend.database import Base

class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    date = Column(Date, nullable=True)
    cost = Column(Numeric(10, 2), nullable=True)
    contractor = Column(String(200), nullable=True)
    warranty_expiration = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
