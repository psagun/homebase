import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, Date, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from backend.database import Base


class TaskType(str, enum.Enum):
    MORTGAGE_PAYMENT = "Mortgage Payment"
    INSURANCE_RENEWAL = "Insurance Renewal"
    PROPERTY_TAX = "Property Tax"
    HOA_PAYMENT = "HOA Payment"
    RENT_COLLECTION = "Rent Collection"
    LEASE_RENEWAL = "Lease Renewal"
    MAINTENANCE = "Maintenance"
    DOCUMENT_EXPIRATION = "Document Expiration"
    CUSTOM = "Custom"


class TaskPriority(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class TaskStatus(str, enum.Enum):
    UPCOMING = "Upcoming"
    DUE_TODAY = "Due Today"
    OVERDUE = "Overdue"
    COMPLETED = "Completed"
    DISMISSED = "Dismissed"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    task_type = Column(SAEnum(TaskType), nullable=False, default=TaskType.CUSTOM)
    due_date = Column(Date, nullable=True)
    priority = Column(SAEnum(TaskPriority), nullable=False, default=TaskPriority.MEDIUM)
    status = Column(SAEnum(TaskStatus), nullable=False, default=TaskStatus.UPCOMING)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    property = relationship("Property", backref="tasks")
