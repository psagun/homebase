import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, DateTime, Date, Numeric, Integer, Enum as SAEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from backend.database import Base
import enum


class PropertyStatus(str, enum.Enum):
    OCCUPIED = "Occupied"
    VACANT = "Vacant"
    UNDER_MAINTENANCE = "Under Maintenance"
    FOR_SALE = "For Sale"


class PropertyType(str, enum.Enum):
    SINGLE_FAMILY = "Single Family"
    CONDO = "Condo"
    TOWNHOUSE = "Townhouse"
    MULTI_FAMILY = "Multi-Family"
    LAND = "Land"
    COMMERCIAL = "Commercial"
    OTHER = "Other"


class Property(Base):
    __tablename__ = "properties"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # Address
    name = Column(String(200), nullable=False)
    address_line_1 = Column(String(255), nullable=False)
    address_line_2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    postal_code = Column(String(20), nullable=False)
    country = Column(String(100), nullable=False, default="US")

    # Classification
    property_type = Column(SAEnum(PropertyType), nullable=False, default=PropertyType.SINGLE_FAMILY)
    status = Column(SAEnum(PropertyStatus), nullable=False, default=PropertyStatus.VACANT)

    # Financial
    purchase_date = Column(Date, nullable=True)
    purchase_price = Column(Numeric(12, 2), nullable=False, default=0)
    current_value = Column(Numeric(12, 2), nullable=False, default=0)

    # Details
    lot_size = Column(Numeric(10, 2), nullable=True)
    bedrooms = Column(Integer, nullable=True)
    bathrooms = Column(Numeric(3, 1), nullable=True)
    year_built = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)

    # Soft delete
    archived_at = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Ownership
    ownership_entity_id = Column(UUID(as_uuid=True), ForeignKey("ownership_entities.id"), nullable=True, index=True)

    # Relationships
    user = relationship("User", back_populates="properties")
    ownership_entity = relationship("OwnershipEntity", backref="properties")
