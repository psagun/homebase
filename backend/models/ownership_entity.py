import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from backend.database import Base


class OwnershipEntity(Base):
    __tablename__ = "ownership_entities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    entity_type = Column(String(50), nullable=True)
    ein = Column(String(20), nullable=True)
    state_of_formation = Column(String(100), nullable=True)
    status = Column(String(20), default="Active")

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    investors = relationship("OwnershipEntityInvestor", back_populates="entity", cascade="all, delete-orphan")
