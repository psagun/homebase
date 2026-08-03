import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Date, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from backend.database import Base


class PaymentHistory(Base):
    """Record of user-confirmed external payments.

    HomeBase never processes payments — the user pays on an external
    provider website and explicitly confirms completion here. This table
    records that confirmation so the app can advance the next due date
    without ever assuming a payment succeeded.
    """

    __tablename__ = "payment_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True)
    payment_type = Column(String(30), nullable=False)  # mortgage | insurance | tax
    source_id = Column(UUID(as_uuid=True), nullable=False, index=True)  # mortgage/insurance/tax record id
    due_date = Column(Date, nullable=False)
    next_due_date = Column(Date, nullable=True)
    confirmed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    source = Column(String(30), default="user_confirmed", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
