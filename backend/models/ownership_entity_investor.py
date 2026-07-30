import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from backend.database import Base


class OwnershipEntityInvestor(Base):
    __tablename__ = "ownership_entity_investors"

    ownership_entity_id = Column(
        UUID(as_uuid=True),
        ForeignKey("ownership_entities.id", ondelete="CASCADE"),
        primary_key=True,
    )
    investor_id = Column(
        UUID(as_uuid=True),
        ForeignKey("investors.id", ondelete="CASCADE"),
        primary_key=True,
    )
    ownership_percentage = Column(Numeric(5, 2), nullable=False)

    entity = relationship("OwnershipEntity", back_populates="investors")
    investor = relationship("Investor", back_populates="entities")
