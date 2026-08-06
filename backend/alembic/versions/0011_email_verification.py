"""Email verification + notification prefs columns.

New columns on users:
- email_verified (default TRUE so all existing accounts stay verified;
  new password registrations set it to FALSE until the code is entered)
- verification_code_hash / verification_expires_at (nullable)
- notification_prefs (nullable text; NULL = all categories on)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision = "0011"
down_revision = "0010"
branch_labels: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = {c["name"] for c in inspector.get_columns("users")}

    if "email_verified" not in cols:
        op.add_column(
            "users",
            sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.true()),
        )
    if "verification_code_hash" not in cols:
        op.add_column("users", sa.Column("verification_code_hash", sa.String(128), nullable=True))
    if "verification_expires_at" not in cols:
        op.add_column("users", sa.Column("verification_expires_at", sa.DateTime(timezone=True), nullable=True))
    if "notification_prefs" not in cols:
        op.add_column("users", sa.Column("notification_prefs", sa.Text(), nullable=True))


def downgrade() -> None:
    pass
