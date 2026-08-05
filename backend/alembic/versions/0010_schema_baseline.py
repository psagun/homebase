"""Baseline migration — tables/columns created by Base.metadata.create_all
during development but missing from alembic.

Every step is guarded by an inspector check so this migration is safe to
run on: (a) a fresh database, (b) the create_all-era production database
where most objects already exist. It brings the schema to parity with the
models, not just for new deployments.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0010"
down_revision = "0008"
branch_labels: Union[str, Sequence[str], None] = None


def _missing_tables(inspector) -> set[str]:
    return set(inspector.get_table_names())


def _missing_columns(inspector, table: str) -> set[str]:
    return {c["name"] for c in inspector.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = _missing_tables(inspector)

    # ── Missing tables (9) ──
    if "tenants" not in tables:
        op.create_table(
            "tenants",
            sa.Column("id", UUID(as_uuid=True), primary_key=True),
            sa.Column("property_id", UUID(as_uuid=True), sa.ForeignKey("properties.id", ondelete="CASCADE"), nullable=False),
            sa.Column("name", sa.String(200), nullable=False),
            sa.Column("email", sa.String(255), nullable=True),
            sa.Column("phone", sa.String(20), nullable=True),
            sa.Column("move_in_date", sa.Date(), nullable=True),
            sa.Column("lease_start", sa.Date(), nullable=True),
            sa.Column("lease_end", sa.Date(), nullable=True),
            sa.Column("monthly_rent", sa.Numeric(10, 2), nullable=True),
            sa.Column("security_deposit", sa.Numeric(10, 2), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        )

    if "maintenance_records" not in tables:
        op.create_table(
            "maintenance_records",
            sa.Column("id", UUID(as_uuid=True), primary_key=True),
            sa.Column("property_id", UUID(as_uuid=True), sa.ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("title", sa.String(200), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("category", sa.String(50), nullable=True),
            sa.Column("priority", sa.String(20), nullable=True),
            sa.Column("status", sa.String(20), nullable=True),
            sa.Column("date", sa.Date(), nullable=True),
            sa.Column("scheduled_date", sa.Date(), nullable=True),
            sa.Column("completed_date", sa.Date(), nullable=True),
            sa.Column("cost", sa.Numeric(10, 2), nullable=True),
            sa.Column("contractor", sa.String(200), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("warranty_expiration", sa.Date(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        )

    if "ownership_entities" not in tables:
        op.create_table(
            "ownership_entities",
            sa.Column("id", UUID(as_uuid=True), primary_key=True),
            sa.Column("name", sa.String(200), nullable=False),
            sa.Column("entity_type", sa.String(50), nullable=True),
            sa.Column("ein", sa.String(20), nullable=True),
            sa.Column("state_of_formation", sa.String(100), nullable=True),
            sa.Column("status", sa.String(20), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        )

    if "investors" not in tables:
        op.create_table(
            "investors",
            sa.Column("id", UUID(as_uuid=True), primary_key=True),
            sa.Column("name", sa.String(200), nullable=False),
            sa.Column("email", sa.String(255), nullable=True),
            sa.Column("phone", sa.String(20), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        )

    if "ownership_entity_investors" not in tables:
        op.create_table(
            "ownership_entity_investors",
            sa.Column("ownership_entity_id", UUID(as_uuid=True), sa.ForeignKey("ownership_entities.id", ondelete="CASCADE"), primary_key=True),
            sa.Column("investor_id", UUID(as_uuid=True), sa.ForeignKey("investors.id", ondelete="CASCADE"), primary_key=True),
            sa.Column("ownership_percentage", sa.Numeric(5, 2), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )

    if "property_investors" not in tables:
        op.create_table(
            "property_investors",
            sa.Column("property_id", UUID(as_uuid=True), sa.ForeignKey("properties.id", ondelete="CASCADE"), primary_key=True),
            sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )

    if "property_taxes" not in tables:
        op.create_table(
            "property_taxes",
            sa.Column("id", UUID(as_uuid=True), primary_key=True),
            sa.Column("property_id", UUID(as_uuid=True), sa.ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("county", sa.String(100), nullable=True),
            sa.Column("tax_authority", sa.String(200), nullable=True),
            sa.Column("parcel_id", sa.String(100), nullable=True),
            sa.Column("portal_url", sa.String(500), nullable=True),
            sa.Column("annual_tax", sa.Numeric(10, 2), nullable=True),
            sa.Column("payment_frequency", sa.String(50), nullable=True),
            sa.Column("next_due_date", sa.Date(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        )

    if "recently_viewed" not in tables:
        op.create_table(
            "recently_viewed",
            sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
            sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("property_id", UUID(as_uuid=True), sa.ForeignKey("properties.id", ondelete="CASCADE"), nullable=False),
            sa.Column("viewed_at", sa.DateTime(timezone=True), nullable=False),
        )

    if "payment_history" not in tables:
        op.create_table(
            "payment_history",
            sa.Column("id", UUID(as_uuid=True), primary_key=True),
            sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("property_id", UUID(as_uuid=True), sa.ForeignKey("properties.id", ondelete="CASCADE"), nullable=False),
            sa.Column("payment_type", sa.String(30), nullable=False),
            sa.Column("source_id", UUID(as_uuid=True), nullable=False),
            sa.Column("due_date", sa.Date(), nullable=False),
            sa.Column("next_due_date", sa.Date(), nullable=True),
            sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("source", sa.String(30), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )

    # ── Missing columns on existing tables ──
    # Fresh inspector — the one above predates the create_table calls
    inspector = sa.inspect(bind)

    def _add_if_missing(table: str, column: sa.Column):
        if column.name not in _missing_columns(inspector, table):
            op.add_column(table, column)

    _add_if_missing("users", sa.Column("role", sa.String(20), nullable=False, server_default="user"))
    _add_if_missing("users", sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()))
    _add_if_missing("users", sa.Column("avatar_url", sa.String(500), nullable=True))
    _add_if_missing("properties", sa.Column("ownership_entity_id", UUID(as_uuid=True), nullable=True))
    _add_if_missing("mortgages", sa.Column("portal_url", sa.String(500), nullable=True))
    _add_if_missing("insurance_policies", sa.Column("portal_url", sa.String(500), nullable=True))
    _add_if_missing("contacts", sa.Column("is_favorite", sa.Boolean(), nullable=False, server_default=sa.false()))
    _add_if_missing("mortgages", sa.Column("payment_frequency", sa.String(20), nullable=True, server_default="Monthly"))
    _add_if_missing("insurance_policies", sa.Column("payment_frequency", sa.String(20), nullable=True, server_default="Annual"))
    _add_if_missing("maintenance_records", sa.Column("category", sa.String(50), nullable=True))
    _add_if_missing("maintenance_records", sa.Column("priority", sa.String(20), nullable=True))
    _add_if_missing("maintenance_records", sa.Column("status", sa.String(20), nullable=True))
    _add_if_missing("maintenance_records", sa.Column("scheduled_date", sa.Date(), nullable=True))
    _add_if_missing("maintenance_records", sa.Column("completed_date", sa.Date(), nullable=True))
    _add_if_missing("maintenance_records", sa.Column("notes", sa.Text(), nullable=True))

    # ── One active mortgage/insurance per property (race guard) ──
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_mortgages_one_active "
        "ON mortgages (property_id) WHERE is_active"
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_insurance_one_active "
        "ON insurance_policies (property_id) WHERE is_active"
    )


def downgrade() -> None:
    # Baseline migration — nothing to downgrade; schema parity is the goal.
    pass
