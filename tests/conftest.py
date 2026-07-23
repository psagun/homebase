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


@pytest.fixture()
def auth_client(client):
    """Register and login a test user, return client with auth headers."""
    client.post("/api/v1/auth/register", json={
        "email": "test@homebase.app", "password": "testpass123", "name": "Test User",
    })
    resp = client.post("/api/v1/auth/login", json={
        "email": "test@homebase.app", "password": "testpass123",
    })
    token = resp.json()["access_token"]
    client.headers = {**client.headers, "Authorization": f"Bearer {token}"}
    return client
