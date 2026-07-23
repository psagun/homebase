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
from backend.database import Base, engine  # noqa: E402
from backend.models import User, Property, Mortgage, InsurancePolicy, Document, Task, Transaction, Contact, PropertyTax, Tenant, MaintenanceRecord, RecentlyViewed  # noqa: E402, F401

Base.metadata.create_all(bind=engine)
