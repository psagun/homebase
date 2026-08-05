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

# Bootstrap tables for local/fresh deployments only. Production schema is
# managed by alembic migrations (applied out-of-band); create_all is an
# idempotent no-op once the tables exist and is wrapped so a pooler DDL
# rejection never crashes cold start.
try:
    from backend.database import Base, engine  # noqa: E402
    from backend.models import (  # noqa: E402, F401
        User, Property, Mortgage, InsurancePolicy, Document, Task, Transaction,
        Contact, PropertyTax, Tenant, MaintenanceRecord, RecentlyViewed,
        PropertyInvestor, OwnershipEntity, Investor, OwnershipEntityInvestor,
    )
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"[cold-start] schema sync skipped (non-fatal): {e}")
