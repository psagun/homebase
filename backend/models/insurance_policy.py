import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Date, Numeric, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from backend.database import Base


class InsurancePolicy(Base):
    __tablename__ = "insurance_policies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True)

    # Policy info
    provider_name = Column(String(200), nullable=False)
    policy_number = Column(String(100), nullable=True)
    policy_type = Column(String(100), nullable=True)
    portal_url = Column(String(500), nullable=True)

    # Coverage
    coverage_amount = Column(Numeric(12, 2), nullable=True)
    deductible = Column(Numeric(10, 2), nullable=True)
    annual_premium = Column(Numeric(10, 2), nullable=True)

    # Dates
    effective_date = Column(Date, nullable=True)
    expiration_date = Column(Date, nullable=True)
    renewal_date = Column(Date, nullable=True)

    # Agent info
    agent_name = Column(String(200), nullable=True)
    agent_phone = Column(String(20), nullable=True)
    agent_email = Column(String(255), nullable=True)

    # Historical tracking
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    ended_at = Column(Date, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    property = relationship("Property", backref="insurance_policies")
