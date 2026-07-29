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
from backend.models import User, Property, Mortgage, InsurancePolicy, Document, Task, Transaction, Contact, PropertyTax, Tenant, MaintenanceRecord, RecentlyViewed, PropertyInvestor  # noqa: E402, F401

Base.metadata.create_all(bind=engine)

# Auto-migrate: add new columns that may not exist yet
_migrate_add_column(engine, "users", "notifications_read_at", "TIMESTAMP WITH TIME ZONE")
_migrate_add_column(engine, "users", "role", "VARCHAR(20)")
with engine.connect() as conn:
    conn.execute(text("UPDATE users SET role = 'admin' WHERE role IS NULL"))
    conn.commit()
