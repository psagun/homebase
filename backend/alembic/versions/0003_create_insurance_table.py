"""Create insurance_policies table

Revision ID: 0003
Revises: 0002
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0003"
down_revision = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table("insurance_policies",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("property_id", UUID(as_uuid=True), sa.ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("provider_name", sa.String(200), nullable=False),
        sa.Column("policy_number", sa.String(100), nullable=True),
        sa.Column("policy_type", sa.String(100), nullable=True),
        sa.Column("coverage_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("deductible", sa.Numeric(10, 2), nullable=True),
        sa.Column("annual_premium", sa.Numeric(10, 2), nullable=True),
        sa.Column("effective_date", sa.Date(), nullable=True),
        sa.Column("expiration_date", sa.Date(), nullable=True),
        sa.Column("renewal_date", sa.Date(), nullable=True),
        sa.Column("agent_name", sa.String(200), nullable=True),
        sa.Column("agent_phone", sa.String(20), nullable=True),
        sa.Column("agent_email", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False, index=True),
        sa.Column("ended_at", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    # property_id/is_active carry index=True above (implicit indexes);
    # only the composite active index needs creating here.
    op.create_index("ix_insurance_active", "insurance_policies", ["property_id", "is_active"])


def downgrade() -> None:
    op.drop_index("ix_insurance_active")
    op.drop_index("ix_insurance_property_id")
    op.drop_table("insurance_policies")
