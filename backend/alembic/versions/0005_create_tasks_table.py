"""Create tasks table"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0005"
down_revision = "0004"
branch_labels: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    sa.Enum("MORTGAGE_PAYMENT", "INSURANCE_RENEWAL", "PROPERTY_TAX", "HOA_PAYMENT",
            "RENT_COLLECTION", "LEASE_RENEWAL", "MAINTENANCE", "DOCUMENT_EXPIRATION",
            "CUSTOM", name="tasktype").create(op.get_bind())
    sa.Enum("LOW", "MEDIUM", "HIGH", "CRITICAL", name="taskpriority").create(op.get_bind())
    sa.Enum("UPCOMING", "DUE_TODAY", "OVERDUE", "COMPLETED", "DISMISSED", name="taskstatus").create(op.get_bind())

    op.create_table("tasks",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("property_id", UUID(as_uuid=True), sa.ForeignKey("properties.id", ondelete="SET NULL"), nullable=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("task_type", sa.Enum("MORTGAGE_PAYMENT", "INSURANCE_RENEWAL", "PROPERTY_TAX", "HOA_PAYMENT",
                                       "RENT_COLLECTION", "LEASE_RENEWAL", "MAINTENANCE", "DOCUMENT_EXPIRATION",
                                       "CUSTOM", name="tasktype"), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("priority", sa.Enum("LOW", "MEDIUM", "HIGH", "CRITICAL", name="taskpriority"), nullable=False),
        sa.Column("status", sa.Enum("UPCOMING", "DUE_TODAY", "OVERDUE", "COMPLETED", "DISMISSED", name="taskstatus"), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("tasks")
    sa.Enum(name="tasktype").drop(op.get_bind(), if_exists=True)
    sa.Enum(name="taskpriority").drop(op.get_bind(), if_exists=True)
    sa.Enum(name="taskstatus").drop(op.get_bind(), if_exists=True)
