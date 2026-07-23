import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, Date, Numeric, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from backend.database import Base


class TransactionType(str, enum.Enum):
    INCOME = "income"
    EXPENSE = "expense"


class TransactionCategory(str, enum.Enum):
    # Income
    RENT = "Rent"
    PARKING = "Parking"
    STORAGE = "Storage"
    OTHER_INCOME = "Other Income"
    # Expenses
    MORTGAGE = "Mortgage"
    INSURANCE = "Insurance"
    TAXES = "Taxes"
    HOA = "HOA"
    MAINTENANCE = "Maintenance"
    UTILITIES = "Utilities"
    PROPERTY_MANAGEMENT = "Property Management"
    OTHER_EXPENSE = "Other"


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    transaction_type = Column(SAEnum(TransactionType), nullable=False)
    category = Column(SAEnum(TransactionCategory), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    transaction_date = Column(Date, nullable=False)
    description = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    property = relationship("Property", backref="transactions")
