import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.database import Base
from backend.dependencies import get_db
from backend.main import app

# Import ALL models so they register with Base.metadata
from backend.models import User, Property, Mortgage, InsurancePolicy, Document, Task, Transaction, Contact  # noqa: F401

engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture()
def client():
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def verify_email(email: str) -> None:
    """Mark an account verified in the test DB (bypasses the emailed code)."""
    from backend.models.user import User

    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == email).first()
    if user:
        user.email_verified = True
        user.verification_code_hash = None
        user.verification_expires_at = None
        db.commit()
    db.close()


@pytest.fixture()
def auth_client(client):
    """Register and login a test user, return client with auth headers.

    Self-registration defaults to role "user" (security). Tests that
    exercise admin surfaces promote the fixture user to admin directly in
    the DB — the register endpoint itself must never grant admin.
    """
    from backend.models.user import User

    client.post("/api/v1/auth/register", json={
        "email": "test@homebase.app", "password": "testpass123", "name": "Test User",
    })
    verify_email("test@homebase.app")
    resp = client.post("/api/v1/auth/login", json={
        "email": "test@homebase.app", "password": "testpass123",
    })
    token = resp.json()["access_token"]

    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "test@homebase.app").first()
    assert user
    user.role = "admin"
    db.commit()
    db.close()

    client.headers = {**client.headers, "Authorization": f"Bearer {token}"}
    return client
