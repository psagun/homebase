import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Date, Numeric, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from backend.database import Base


class Mortgage(Base):
    __tablename__ = "mortgages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True)

    # Lender info
    lender_name = Column(String(200), nullable=False)
    loan_number = Column(String(100), nullable=True)
    loan_type = Column(String(100), nullable=True)
    portal_url = Column(String(500), nullable=True)

    # Financial
    interest_rate = Column(Numeric(5, 3), nullable=True)
    original_amount = Column(Numeric(12, 2), nullable=True)
    current_balance = Column(Numeric(12, 2), nullable=True)
    monthly_payment = Column(Numeric(10, 2), nullable=True)
    loan_term_months = Column(Numeric(5), nullable=True)

    # Dates
    start_date = Column(Date, nullable=True)
    maturity_date = Column(Date, nullable=True)
    next_due_date = Column(Date, nullable=True)

    # Flags
    autopay_enabled = Column(Boolean, default=False)

    # Historical tracking
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    ended_at = Column(Date, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    property = relationship("Property", backref="mortgages")
