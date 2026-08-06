import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(200), nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    role = Column(String(20), default="admin", nullable=False)
    avatar_url = Column(String(500), nullable=True)
    # Email verification (one-time, full gate for new password registrations)
    email_verified = Column(Boolean, default=True, nullable=False)
    verification_code_hash = Column(String(128), nullable=True)
    verification_expires_at = Column(DateTime(timezone=True), nullable=True)
    # Email notification prefs: JSON string of {"category": bool}; NULL = all on
    notification_prefs = Column(Text, nullable=True)
    notifications_read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    properties = relationship("Property", back_populates="user", cascade="all, delete-orphan")
