"""Create users and properties tables

Revision ID: 0001
Revises:
Create Date: 2026-07-20

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # Create property_type and property_status enums
    sa.Enum("SINGLE_FAMILY", "CONDO", "TOWNHOUSE", "MULTI_FAMILY", "LAND", "COMMERCIAL", "OTHER",
            name="propertytype").create(op.get_bind())
    sa.Enum("OCCUPIED", "VACANT", "UNDER_MAINTENANCE", "FOR_SALE",
            name="propertystatus").create(op.get_bind())

    # Create properties table
    op.create_table(
        "properties",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("address_line_1", sa.String(255), nullable=False),
        sa.Column("address_line_2", sa.String(255), nullable=True),
        sa.Column("city", sa.String(100), nullable=False),
        sa.Column("state", sa.String(100), nullable=False),
        sa.Column("postal_code", sa.String(20), nullable=False),
        sa.Column("country", sa.String(100), nullable=False, server_default="US"),
        sa.Column("property_type", sa.Enum("SINGLE_FAMILY", "CONDO", "TOWNHOUSE", "MULTI_FAMILY", "LAND", "COMMERCIAL", "OTHER",
                                           name="propertytype"), nullable=False),
        sa.Column("status", sa.Enum("OCCUPIED", "VACANT", "UNDER_MAINTENANCE", "FOR_SALE",
                                    name="propertystatus"), nullable=False),
        sa.Column("purchase_date", sa.Date(), nullable=True),
        sa.Column("purchase_price", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("current_value", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("lot_size", sa.Numeric(10, 2), nullable=True),
        sa.Column("bedrooms", sa.Integer(), nullable=True),
        sa.Column("bathrooms", sa.Numeric(3, 1), nullable=True),
        sa.Column("year_built", sa.Integer(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # Note: properties.user_id is created with index=True above — its index
    # is emitted with the table, so only the status index is created here.
    op.create_index("ix_properties_status", "properties", ["status"])


def downgrade() -> None:
    op.drop_table("properties")
    sa.Enum(name="propertytype").drop(op.get_bind(), if_exists=True)
    sa.Enum(name="propertystatus").drop(op.get_bind(), if_exists=True)
    op.drop_table("users")
