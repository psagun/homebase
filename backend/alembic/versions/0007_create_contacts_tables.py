"""Create contacts and property_contacts tables"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0007"
down_revision = "0006"
branch_labels: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    sa.Enum("MORTGAGE_LENDER", "INSURANCE_AGENT", "PROPERTY_MANAGER", "TENANT", "CONTRACTOR",
            "REALTOR", "HOA", "TAX_AUTHORITY", "UTILITY_PROVIDER", "ATTORNEY", "ACCOUNTANT",
            "OTHER", name="contacttype").create(op.get_bind())

    op.create_table("contacts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("company", sa.String(200), nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("website", sa.String(500), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("contact_type", sa.Enum("MORTGAGE_LENDER", "INSURANCE_AGENT", "PROPERTY_MANAGER",
                                          "TENANT", "CONTRACTOR", "REALTOR", "HOA", "TAX_AUTHORITY",
                                          "UTILITY_PROVIDER", "ATTORNEY", "ACCOUNTANT", "OTHER",
                                          name="contacttype"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table("property_contacts",
        sa.Column("property_id", UUID(as_uuid=True), sa.ForeignKey("properties.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("contact_id", UUID(as_uuid=True), sa.ForeignKey("contacts.id", ondelete="CASCADE"), primary_key=True),
    )


def downgrade() -> None:
    op.drop_table("property_contacts")
    op.drop_table("contacts")
    sa.Enum(name="contacttype").drop(op.get_bind(), if_exists=True)
