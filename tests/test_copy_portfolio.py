"""Tests for the portfolio copy helper (admin)."""

from datetime import date, timedelta


def _register(client, email):
    resp = client.post("/api/v1/auth/register", json={
        "email": email, "password": "testpass123", "name": email.split("@")[0],
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]


def _headers(client, token):
    return {k: v for k, v in dict(client.headers).items() if k.lower() != "authorization"} | {
        "Authorization": f"Bearer {token}"
    }


def _setup_demo(client, demo_token, target_token):
    """Demo user owns one property with mortgage/tenant/task/contact/payment."""
    demo = _headers(client, demo_token)
    client.headers = demo
    prop = client.post("/api/v1/properties", json={
        "name": "Copy House", "address_line_1": "9 Copy Ln",
        "city": "Testville", "state": "TS", "postal_code": "12345",
        "property_type": "Single Family", "status": "Vacant",
    }).json()
    mid = client.post(f"/api/v1/properties/{prop['id']}/mortgage", json={
        "lender_name": "Bank", "loan_type": "30-Year Fixed",
        "interest_rate": 3.5, "original_amount": 300000,
        "monthly_payment": 1347, "payment_frequency": "Monthly",
        "next_due_date": str(date.today() + timedelta(days=30)),
    }).json()["id"]
    # Confirm a payment so payment_history exists (source_id remap is tested)
    client.post("/api/v1/payments/confirm", params={
        "payment_type": "mortgage", "source_id": mid,
        "due_date": str(date.today() + timedelta(days=30)),
    })
    client.post(f"/api/v1/properties/{prop['id']}/tenants", json={
        "name": "Renter", "monthly_rent": 1200,
    })
    client.post("/api/v1/tasks", json={
        "title": "Collect rent", "property_id": prop["id"],
        "task_type": "Custom", "due_date": "2030-01-01", "priority": "Medium",
    })
    client.post("/api/v1/contacts", json={
        "name": "Lender Contact", "email": "lender@example.com",
        "contact_type": "Mortgage Lender", "property_ids": [prop["id"]],
    })
    return prop["id"]


def test_copy_portfolio_dry_run_then_apply(client, auth_client):
    demo_token = _register(client, "demo@homebase.app")
    target_token = _register(client, "bidtexasyeti@gmail.com")
    admin_headers = dict(auth_client.headers)

    demo_prop_id = _setup_demo(client, demo_token, target_token)

    # Dry run — reports counts, copies nothing
    client.headers = admin_headers
    resp = auth_client.post("/api/v1/admin/copy-portfolio", params={"target_email": "bidtexasyeti@gmail.com"})
    assert resp.status_code == 200, resp.text
    rep = resp.json()["report"]
    assert rep["dry_run"] is True
    entry = rep["properties"][0]
    assert entry["status"] == "would copy"
    assert entry["mortgages"] == 1
    assert entry["tenants"] == 1
    assert entry["tasks"] == 2  # manual + auto mortgage task
    assert entry["contacts"] == 1
    assert entry["payment_history"] == 1

    # Target still has nothing
    client.headers = _headers(client, target_token)
    assert client.get("/api/v1/properties").json() == []

    # Apply
    client.headers = admin_headers
    resp = auth_client.post("/api/v1/admin/copy-portfolio", params={
        "target_email": "bidtexasyeti@gmail.com", "apply": "true",
    })
    assert resp.status_code == 200, resp.text
    rep = resp.json()["report"]
    assert rep["dry_run"] is False
    assert rep["properties"][0]["status"] == "copied"

    # Target now has the full portfolio
    client.headers = _headers(client, target_token)
    props = client.get("/api/v1/properties").json()
    assert len(props) == 1
    pid = props[0]["id"]
    assert props[0]["name"] == "Copy House"

    mtg = client.get(f"/api/v1/properties/{pid}/mortgage").json()
    assert mtg["lender_name"] == "Bank"

    tenants = client.get(f"/api/v1/properties/{pid}/tenants").json()
    assert len(tenants) == 1 and tenants[0]["name"] == "Renter"

    tasks = client.get("/api/v1/tasks").json()
    assert len(tasks) == 2
    assert any(t["title"] == "Collect rent" for t in tasks)

    # Payment history exists with a REMAPPED source_id (matches the new mortgage)
    history = client.get("/api/v1/payments/history", params={"property_id": pid}).json()
    assert len(history) == 1
    assert history[0]["source_id"] == mtg["id"]

    # Contact copied and linked
    contacts = client.get("/api/v1/contacts").json()
    assert any(c["name"] == "Lender Contact" for c in contacts)

    # Second run skips the already-copied property
    client.headers = admin_headers
    resp = auth_client.post("/api/v1/admin/copy-portfolio", params={
        "target_email": "bidtexasyeti@gmail.com", "apply": "true",
    })
    assert resp.json()["report"]["properties"][0]["status"] == "skipped (exists on target)"
