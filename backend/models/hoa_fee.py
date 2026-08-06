import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Numeric, Date, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID

from backend.database import Base


class HoaFee(Base):
    """Homeowners association fee record for a property.

    Mirrors the tax-record shape (portal URL + frequency + next due date)
    so the pay-portal and payment-confirm patterns can be reused later.
    """

    __tablename__ = "hoa_fees"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True)
    association_name = Column(String(200), nullable=False)
    fee_amount = Column(Numeric(10, 2), nullable=True)
    payment_frequency = Column(String(50), nullable=True)
    next_due_date = Column(Date, nullable=True)
    portal_url = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
