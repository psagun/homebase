import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, String, Text, DateTime, ForeignKey, Enum as SAEnum, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from backend.database import Base


class ContactType(str, enum.Enum):
    MORTGAGE_LENDER = "Mortgage Lender"
    INSURANCE_AGENT = "Insurance Agent"
    PROPERTY_MANAGER = "Property Manager"
    TENANT = "Tenant"
    CONTRACTOR = "Contractor"
    REALTOR = "Realtor"
    HOA = "HOA"
    TAX_AUTHORITY = "Tax Authority"
    UTILITY_PROVIDER = "Utility Provider"
    ATTORNEY = "Attorney"
    ACCOUNTANT = "Accountant"
    OTHER = "Other"


# Association table: Contact <-> Property (M:N)
property_contacts = Table(
    "property_contacts",
    Base.metadata,
    Column("property_id", UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), primary_key=True),
    Column("contact_id", UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="CASCADE"), primary_key=True),
)


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    name = Column(String(200), nullable=False)
    company = Column(String(200), nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    website = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    contact_type = Column(SAEnum(ContactType), nullable=False, default=ContactType.OTHER)
    is_favorite = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # M:N with properties
    properties = relationship("Property", secondary=property_contacts, backref="contacts")
