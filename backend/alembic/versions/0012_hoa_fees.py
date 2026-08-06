"""HOA fee records table."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0012"
down_revision = "0011"
branch_labels: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "hoa_fees" not in set(inspector.get_table_names()):
        op.create_table(
            "hoa_fees",
            sa.Column("id", UUID(as_uuid=True), primary_key=True),
            sa.Column("property_id", UUID(as_uuid=True), sa.ForeignKey("properties.id", ondelete="CASCADE"), nullable=False),
            sa.Column("association_name", sa.String(200), nullable=False),
            sa.Column("fee_amount", sa.Numeric(10, 2), nullable=True),
            sa.Column("payment_frequency", sa.String(50), nullable=True),
            sa.Column("next_due_date", sa.Date(), nullable=True),
            sa.Column("portal_url", sa.String(500), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        )


def downgrade() -> None:
    pass
