"""Tests for the archived-property cleanup endpoint (admin)."""

from datetime import date, datetime, timedelta, timezone
import uuid

from backend.models.property import Property
from tests.conftest import TestingSessionLocal

PROPERTY_PAYLOAD = {
    "name": "Old Seeded House",
    "address_line_1": "123 Test St",
    "city": "Testville", "state": "TS",
    "postal_code": "12345",
    "property_type": "Single Family",
    "status": "Vacant",
}


def _create_property(auth_client, name="Old Seeded House"):
    resp = auth_client.post("/api/v1/properties", json={**PROPERTY_PAYLOAD, "name": name})
    assert resp.status_code == 201
    return resp.json()


def _archive(property_id):
    db = TestingSessionLocal()
    prop = db.query(Property).filter(Property.id == uuid.UUID(property_id)).first()
    assert prop
    prop.archived_at = datetime.now(timezone.utc)
    db.commit()
    db.close()


def test_cleanup_archived_properties(auth_client):
    """Dry-run reports; apply deletes the archived property + children only."""
    visible = _create_property(auth_client, "Visible House")
    archived = _create_property(auth_client, "Archived House")

    # Attach data to both properties
    for pid in (visible["id"], archived["id"]):
        auth_client.post(f"/api/v1/properties/{pid}/mortgage", json={
            "lender_name": "Bank", "next_due_date": str(date.today() + timedelta(days=30)),
        })
        auth_client.post("/api/v1/tasks", json={
            "title": "Task", "property_id": pid,
            "task_type": "Custom", "due_date": "2030-01-01", "priority": "Medium",
        })

    _archive(archived["id"])

    # Dry run — report only
    resp = auth_client.post("/api/v1/admin/cleanup-archived")
    assert resp.status_code == 200
    rep = resp.json()["report"]
    assert rep["dry_run"] is True
    assert rep["archived_properties"] == 1
    assert rep["properties"] == ["Archived House"]
    assert rep["mortgages"] == 1
    assert rep["tasks"] == 2  # manual task + auto-created MORTGAGE_PAYMENT task

    # Nothing deleted yet (API already hides the archived property)
    assert len(auth_client.get("/api/v1/properties").json()) == 1

    # Apply
    resp = auth_client.post("/api/v1/admin/cleanup-archived?apply=true")
    assert resp.status_code == 200
    rep = resp.json()["report"]
    assert rep["dry_run"] is False
    assert rep["archived_properties"] == 1

    props = auth_client.get("/api/v1/properties").json()
    assert [p["name"] for p in props] == ["Visible House"]

    # Visible property's data untouched
    mtg = auth_client.get(f"/api/v1/properties/{visible['id']}/mortgage").json()
    assert mtg is not None and mtg["lender_name"] == "Bank"
    tasks = auth_client.get("/api/v1/tasks").json()
    assert len(tasks) == 2  # manual + auto mortgage task
    assert all(t["property_id"] == visible["id"] for t in tasks)


def test_cleanup_empty_is_noop(auth_client):
    """No archived properties — clean report, nothing changes."""
    _create_property(auth_client)
    resp = auth_client.post("/api/v1/admin/cleanup-archived")
    assert resp.status_code == 200
    assert resp.json()["report"]["archived_properties"] == 0
