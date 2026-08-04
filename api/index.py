"""Vercel serverless entry point for FastAPI backend."""
import sys
import os
from pathlib import Path

# Ensure the project root is importable
_root = str(Path(__file__).resolve().parent.parent)
if _root not in sys.path:
    sys.path.insert(0, _root)

# Change working directory to project root (Vercel cwd is often different)
os.chdir(_root)

from backend.main import app  # noqa: E402

# Auto-create tables on cold start


def _migrate_add_column(engine, table, column, coltype):
    """Add a column if it doesn't already exist (safe to run repeatedly)."""
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    if column not in [c["name"] for c in inspector.get_columns(table)]:
        with engine.connect() as conn:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {coltype}"))
            conn.commit()

from backend.database import Base, engine  # noqa: E402
from sqlalchemy import text  # noqa: E402
from backend.models import User, Property, Mortgage, InsurancePolicy, Document, Task, Transaction, Contact, PropertyTax, Tenant, MaintenanceRecord, RecentlyViewed, PropertyInvestor, OwnershipEntity, Investor, OwnershipEntityInvestor  # noqa: E402, F401

# Auto-create/migrate tables. Wrapped so a DDL failure (e.g. through a
# transaction pooler that rejects ALTER/CREATE) never crashes cold start —
# schema changes are applied out-of-band via the migration script.
try:
    Base.metadata.create_all(bind=engine)
    _migrate_add_column(engine, "users", "notifications_read_at", "TIMESTAMP WITH TIME ZONE")
    _migrate_add_column(engine, "users", "role", "VARCHAR(20)")
    with engine.connect() as conn:
        conn.execute(text("UPDATE users SET role = 'admin' WHERE role IS NULL"))
        conn.commit()
    _migrate_add_column(engine, "properties", "ownership_entity_id", "UUID")
    _migrate_add_column(engine, "contacts", "is_favorite", "BOOLEAN DEFAULT FALSE")
    _migrate_add_column(engine, "maintenance_records", "category", "VARCHAR(50)")
    _migrate_add_column(engine, "maintenance_records", "priority", "VARCHAR(20) DEFAULT 'Medium'")
    _migrate_add_column(engine, "maintenance_records", "status", "VARCHAR(20) DEFAULT 'Open'")
    _migrate_add_column(engine, "maintenance_records", "scheduled_date", "DATE")
    _migrate_add_column(engine, "maintenance_records", "completed_date", "DATE")
    _migrate_add_column(engine, "maintenance_records", "notes", "TEXT")
    _migrate_add_column(engine, "mortgages", "payment_frequency", "VARCHAR(20) DEFAULT 'Monthly'")
    _migrate_add_column(engine, "insurance_policies", "payment_frequency", "VARCHAR(20) DEFAULT 'Annual'")
except Exception as e:
    print(f"[cold-start] schema sync skipped (non-fatal): {e}")
