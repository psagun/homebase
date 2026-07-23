"""Vercel serverless entry point.

Vercel detects 'app' at this path and routes all /api/* traffic here.
The rewrites in vercel.json send /api/(.*) → /api, and FastAPI
routes internally from /api/v1/... based on the APIRouter prefix.
"""
import sys
from pathlib import Path

# Ensure the backend package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.main import app  # noqa: E402

# Ensure all tables are created on Vercel cold start
from backend.database import Base, engine  # noqa: E402
from backend.models import (  # noqa: E402
    User, Property, Mortgage, InsurancePolicy, Document,
    Task, Transaction, Contact, PropertyTax, Tenant,
    MaintenanceRecord, RecentlyViewed,
)
Base.metadata.create_all(bind=engine)
