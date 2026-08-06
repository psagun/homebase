"""Regression tests for Phase 1 crash fixes."""

import io
import uuid as uuid_mod
from datetime import date, timedelta

from fastapi.testclient import TestClient


def _create_property(auth_client, name="P1 House"):
    resp = auth_client.post("/api/v1/properties", json={
        "name": name, "address_line_1": "123 Test St",
        "city": "Testville", "state": "TS", "postal_code": "12345",
        "property_type": "Single Family", "status": "Vacant",
    })
    assert resp.status_code == 201
    return resp.json()


def _create_mortgage(auth_client, pid, due):
    resp = auth_client.post(f"/api/v1/properties/{pid}/mortgage", json={
        "lender_name": "Bank", "loan_type": "30-Year Fixed",
        "interest_rate": 3.5, "original_amount": 300000,
        "monthly_payment": 1347, "payment_frequency": "Monthly",
        "next_due_date": str(due),
    })
    assert resp.status_code == 201, resp.text
    return resp.json()


def _confirm(auth_client, mid, due):
    resp = auth_client.post("/api/v1/payments/confirm", params={
        "payment_type": "mortgage", "source_id": mid, "due_date": str(due),
    })
    assert resp.status_code == 200


# ── #11: ownership raw SQL works on SQLite ──


def test_ownership_investor_crud_works_on_sqlite(auth_client):
    """add/update/remove entity investor used to 500 on SQLite (uuid binds)."""
    entity = auth_client.post("/api/v1/ownership-entities", json={"name": "LLC"}).json()
    inv = auth_client.post(f"/api/v1/ownership-entities/{entity['id']}/investors", json={
        "name": "Bob", "email": "bob@example.com", "ownership_percentage": 25,
    })
    assert inv.status_code == 201, inv.text
    inv_id = inv.json()["id"]

    resp = auth_client.patch(
        f"/api/v1/ownership-entities/{entity['id']}/investors/{inv_id}",
        json={"ownership_percentage": 30},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["ownership_percentage"] == 30.0

    investors = auth_client.get(f"/api/v1/ownership-entities/{entity['id']}/investors")
    assert investors.status_code == 200
    assert len(investors.json()) == 1

    resp = auth_client.delete(f"/api/v1/ownership-entities/{entity['id']}/investors/{inv_id}")
    assert resp.status_code == 204


# ── #12: reports validate dates ──


def test_reports_reject_invalid_dates(auth_client):
    """Malformed from_date must 422, not 500."""
    resp = auth_client.get("/api/v1/reports/pnl", params={"from_date": "2026-13-99"})
    assert resp.status_code == 422
    resp = auth_client.get("/api/v1/reports/cash-flow", params={"from_date": "not-a-date"})
    assert resp.status_code == 422
    resp = auth_client.get("/api/v1/reports/pnl")
    assert resp.status_code == 200


# ── #14: CSV import ──


def test_csv_import_skips_bad_price_and_imports_good_rows(auth_client):
    csv_data = (
        "name,address_line_1,city,state,postal_code,purchase_price,current_value\n"
        "Good House,1 Main St,Springfield,IL,62701,250000,300000\n"
        "Bad Price,2 Main St,Springfield,IL,62701,\"$abc\",100000\n"
        "Dup House,3 Main St,Springfield,IL,62701,100000,100000\n"
        "Dup House,3 Main St,Springfield,IL,62701,100000,100000\n"
    )
    resp = auth_client.post(
        "/api/v1/import/properties",
        files={"file": ("props.csv", io.BytesIO(csv_data.encode()), "text/csv")},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["imported"] == 2  # Good House + first Dup House
    assert data["skipped"] == 2  # bad price + duplicate
    reasons = " ".join(e["reason"] for e in data["errors"])
    assert "Invalid price" in reasons
    assert "Duplicate" in reasons


# ── #18: investor property ids validated ──


def test_create_investor_rejects_unknown_property(auth_client):
    resp = auth_client.post("/api/v1/admin/investors", json={
        "name": "Bad Investor", "email": "badinv@example.com",
        "property_ids": [str(uuid_mod.uuid4())],
    })
    assert resp.status_code == 400


# ── #19: contact property_ids typed ──


def test_contact_rejects_invalid_property_ids(auth_client):
    resp = auth_client.post("/api/v1/contacts", json={
        "name": "Contact", "email": "c@example.com",
        "property_ids": ["not-a-uuid"],
    })
    assert resp.status_code == 422


# ── #21: recently-viewed ownership check ──


def test_record_view_requires_access(client, auth_client):
    """A user cannot record views of another user's property."""
    prop = _create_property(auth_client)

    # Second user (non-admin, non-linked) registers and tries to view
    admin_headers = dict(auth_client.headers)
    client.post("/api/v1/auth/register", json={
        "email": "viewer@homebase.app", "password": "testpass123", "name": "Viewer",
    })
    from tests.conftest import verify_email
    verify_email("viewer@homebase.app")
    resp = client.post("/api/v1/auth/login", json={
        "email": "viewer@homebase.app", "password": "testpass123",
    })
    client.headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}

    resp = client.post(f"/api/v1/recently-viewed/{prop['id']}")
    assert resp.status_code == 404

    # Owner can still record a view
    client.headers = admin_headers
    resp = auth_client.post(f"/api/v1/recently-viewed/{prop['id']}")
    assert resp.status_code == 200


# ── #26: payment history pagination ──


def test_payment_history_pagination(auth_client):
    pid = _create_property(auth_client)["id"]
    due = date.today() + timedelta(days=30)
    m1 = _create_mortgage(auth_client, pid, due)
    _confirm(auth_client, m1["id"], due)
    due2 = date.today() + timedelta(days=60)
    m2 = _create_mortgage(auth_client, pid, due2)
    _confirm(auth_client, m2["id"], due2)

    resp = auth_client.get("/api/v1/payments/history", params={"property_id": pid, "limit": 1})
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    resp = auth_client.get("/api/v1/payments/history", params={"property_id": pid, "limit": 1, "offset": 1})
    assert len(resp.json()) == 1

    # Duplicate confirm of the same cycle still rejected (race guard intact)
    resp = auth_client.post("/api/v1/payments/confirm", params={
        "payment_type": "mortgage", "source_id": m1["id"], "due_date": str(due),
    })
    assert resp.status_code == 409
