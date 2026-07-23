"""Create transactions table"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0006"
down_revision = "0005"
branch_labels: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    sa.Enum("INCOME", "EXPENSE", name="transactiontype").create(op.get_bind())
    sa.Enum("RENT", "PARKING", "STORAGE", "OTHER_INCOME", "MORTGAGE", "INSURANCE",
            "TAXES", "HOA", "MAINTENANCE", "UTILITIES", "PROPERTY_MANAGEMENT",
            "OTHER_EXPENSE", name="transactioncategory").create(op.get_bind())

    op.create_table("transactions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("property_id", UUID(as_uuid=True), sa.ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("transaction_type", sa.Enum("INCOME", "EXPENSE", name="transactiontype"), nullable=False),
        sa.Column("category", sa.Enum("RENT", "PARKING", "STORAGE", "OTHER_INCOME", "MORTGAGE", "INSURANCE",
                                      "TAXES", "HOA", "MAINTENANCE", "UTILITIES", "PROPERTY_MANAGEMENT",
                                      "OTHER_EXPENSE", name="transactioncategory"), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("transaction_date", sa.Date(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("transactions")
    sa.Enum(name="transactiontype").drop(op.get_bind(), if_exists=True)
    sa.Enum(name="transactioncategory").drop(op.get_bind(), if_exists=True)
