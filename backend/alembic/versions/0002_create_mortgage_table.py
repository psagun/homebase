"""Create mortgages table

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-20

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "mortgages",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("property_id", UUID(as_uuid=True), sa.ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("lender_name", sa.String(200), nullable=False),
        sa.Column("loan_number", sa.String(100), nullable=True),
        sa.Column("loan_type", sa.String(100), nullable=True),
        sa.Column("interest_rate", sa.Numeric(5, 3), nullable=True),
        sa.Column("original_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("current_balance", sa.Numeric(12, 2), nullable=True),
        sa.Column("monthly_payment", sa.Numeric(10, 2), nullable=True),
        sa.Column("loan_term_months", sa.Integer(), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("maturity_date", sa.Date(), nullable=True),
        sa.Column("next_due_date", sa.Date(), nullable=True),
        sa.Column("autopay_enabled", sa.Boolean(), default=False),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False, index=True),
        sa.Column("ended_at", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_mortgages_property_id", "mortgages", ["property_id"])
    op.create_index("ix_mortgages_active", "mortgages", ["property_id", "is_active"])


def downgrade() -> None:
    op.drop_index("ix_mortgages_active")
    op.drop_index("ix_mortgages_property_id")
    op.drop_table("mortgages")
