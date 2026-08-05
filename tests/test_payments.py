"""Tests for payment confirmation and undo (revert) flow.

Confirming a payment advances the source record's due date and syncs the
related task. Undoing (DELETE /payments/history/{id}) must reverse all of
that — restore the due date and recompute the task status — but only for
the most recent confirmation of a payment source.
"""

from datetime import date, timedelta

TODAY = date.today()

PROPERTY_PAYLOAD = {
    "name": "Test House",
    "address_line_1": "123 Test St",
    "city": "Testville", "state": "TS",
    "postal_code": "12345",
    "property_type": "Single Family",
    "status": "Vacant",
}

MORTGAGE_PAYLOAD = {
    "lender_name": "Test Bank",
    "loan_type": "30-Year Fixed",
    "interest_rate": 3.5,
    "original_amount": 300000,
    "monthly_payment": 1347,
    "payment_frequency": "Monthly",
    "next_due_date": str(TODAY + timedelta(days=30)),
}

INSURANCE_PAYLOAD = {
    "provider_name": "Test Insurance Co",
    "policy_type": "Landlord Insurance",
    "coverage_amount": 500000,
    "annual_premium": 1200,
    "payment_frequency": "Annual",
    "renewal_date": str(TODAY + timedelta(days=60)),
}


def _create_property(auth_client):
    resp = auth_client.post("/api/v1/properties", json=PROPERTY_PAYLOAD)
    assert resp.status_code == 201
    return resp.json()["id"]


def _create_task(auth_client, property_id, task_type, due_date, status="Upcoming"):
    resp = auth_client.post("/api/v1/tasks", json={
        "title": f"Test {task_type}",
        "property_id": property_id,
        "task_type": task_type,
        "due_date": str(due_date),
        "priority": "Medium",
    })
    assert resp.status_code == 201
    if status != "Upcoming":
        auth_client.patch(f"/api/v1/tasks/{resp.json()['id']}", json={"status": status})
    return resp.json()


def _confirm(auth_client, payment_type, source_id, due_date):
    resp = auth_client.post(
        "/api/v1/payments/confirm",
        params={"payment_type": payment_type, "source_id": source_id, "due_date": str(due_date)},
    )
    assert resp.status_code == 200
    return resp.json()


def _history(auth_client, property_id):
    return auth_client.get("/api/v1/payments/history", params={"property_id": property_id}).json()


# ── Mortgage undo ──


def test_undo_reverts_mortgage_due_date(auth_client):
    """Undo should delete the record and restore the source due date."""
    pid = _create_property(auth_client)
    resp = auth_client.post(f"/api/v1/properties/{pid}/mortgage", json=MORTGAGE_PAYLOAD)
    assert resp.status_code == 201
    mortgage_id = resp.json()["id"]
    original_due = MORTGAGE_PAYLOAD["next_due_date"]

    _confirm(auth_client, "mortgage", mortgage_id, original_due)

    # Due date advanced
    m = auth_client.get(f"/api/v1/properties/{pid}/mortgage").json()
    assert m["next_due_date"] != original_due

    history = _history(auth_client, pid)
    assert len(history) == 1

    resp = auth_client.delete(f"/api/v1/payments/history/{history[0]['id']}")
    assert resp.status_code == 200
    assert "undone" in resp.json()["message"].lower()

    assert _history(auth_client, pid) == []
    m = auth_client.get(f"/api/v1/properties/{pid}/mortgage").json()
    assert m["next_due_date"] == original_due


def test_undo_reverts_task_due_date(auth_client):
    """Undo should restore the synced task's due date."""
    pid = _create_property(auth_client)
    task = _create_task(auth_client, pid, "Mortgage Payment", TODAY + timedelta(days=30))

    resp = auth_client.post(f"/api/v1/properties/{pid}/mortgage", json=MORTGAGE_PAYLOAD)
    mortgage_id = resp.json()["id"]

    _confirm(auth_client, "mortgage", mortgage_id, MORTGAGE_PAYLOAD["next_due_date"])

    tasks = auth_client.get(f"/api/v1/tasks/?property_id={pid}").json()
    mtg_task = [t for t in tasks if t["id"] == task["id"]][0]
    assert mtg_task["due_date"] != MORTGAGE_PAYLOAD["next_due_date"]
    assert mtg_task["status"] == "Upcoming"

    history = _history(auth_client, pid)
    auth_client.delete(f"/api/v1/payments/history/{history[0]['id']}")

    tasks = auth_client.get(f"/api/v1/tasks/?property_id={pid}").json()
    mtg_task = [t for t in tasks if t["id"] == task["id"]][0]
    assert mtg_task["due_date"] == MORTGAGE_PAYLOAD["next_due_date"]
    assert mtg_task["status"] == "Upcoming"


def test_undo_reverts_overdue_task_status(auth_client):
    """Undo of an overdue cycle should restore the OVERDUE status."""
    pid = _create_property(auth_client)
    past_due = TODAY - timedelta(days=5)
    task = _create_task(auth_client, pid, "Mortgage Payment", past_due, status="Overdue")

    payload = {**MORTGAGE_PAYLOAD, "next_due_date": str(past_due)}
    resp = auth_client.post(f"/api/v1/properties/{pid}/mortgage", json=payload)
    mortgage_id = resp.json()["id"]

    _confirm(auth_client, "mortgage", mortgage_id, past_due)

    tasks = auth_client.get(f"/api/v1/tasks/?property_id={pid}").json()
    mtg_task = [t for t in tasks if t["id"] == task["id"]][0]
    assert mtg_task["status"] == "Upcoming"

    history = _history(auth_client, pid)
    auth_client.delete(f"/api/v1/payments/history/{history[0]['id']}")

    tasks = auth_client.get(f"/api/v1/tasks/?property_id={pid}").json()
    mtg_task = [t for t in tasks if t["id"] == task["id"]][0]
    assert mtg_task["due_date"] == str(past_due)
    assert mtg_task["status"] == "Overdue"


def test_undo_only_most_recent(auth_client):
    """An older confirmation in the chain cannot be undone — 409."""
    pid = _create_property(auth_client)
    resp = auth_client.post(f"/api/v1/properties/{pid}/mortgage", json=MORTGAGE_PAYLOAD)
    mortgage_id = resp.json()["id"]
    due1 = MORTGAGE_PAYLOAD["next_due_date"]

    _confirm(auth_client, "mortgage", mortgage_id, due1)
    due2 = auth_client.get(f"/api/v1/properties/{pid}/mortgage").json()["next_due_date"]
    _confirm(auth_client, "mortgage", mortgage_id, due2)

    history = _history(auth_client, pid)
    assert len(history) == 2

    # Oldest first in time = last in the newest-first list
    oldest = history[-1]
    resp = auth_client.delete(f"/api/v1/payments/history/{oldest['id']}")
    assert resp.status_code == 409

    # The most recent one can be undone
    newest = history[0]
    resp = auth_client.delete(f"/api/v1/payments/history/{newest['id']}")
    assert resp.status_code == 200

    # Now the older one can be undone too
    oldest = _history(auth_client, pid)[0]
    resp = auth_client.delete(f"/api/v1/payments/history/{oldest['id']}")
    assert resp.status_code == 200


# ── Cross-user / ownership ──


def test_undo_other_users_record_404(client, auth_client):
    """A user cannot undo another user's payment record."""
    # Second user confirms a payment on their own property
    client.post("/api/v1/auth/register", json={
        "email": "other@homebase.app", "password": "testpass123", "name": "Other User",
    })
    resp = client.post("/api/v1/auth/login", json={
        "email": "other@homebase.app", "password": "testpass123",
    })
    other_headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}

    # Reuse the same TestClient with the Authorization header replaced
    # (merging dicts creates a duplicate header key that httpx sends
    # comma-joined, and the server uses the first one)
    saved = dict(client.headers)
    swapped = {k: v for k, v in saved.items() if k.lower() != "authorization"}
    swapped["Authorization"] = other_headers["Authorization"]
    client.headers = swapped
    pid = _create_property(client)
    resp = client.post(f"/api/v1/properties/{pid}/mortgage", json=MORTGAGE_PAYLOAD)
    mortgage_id = resp.json()["id"]
    _confirm(client, "mortgage", mortgage_id, MORTGAGE_PAYLOAD["next_due_date"])
    history = _history(client, pid)
    client.headers = saved

    resp = auth_client.delete(f"/api/v1/payments/history/{history[0]['id']}")
    assert resp.status_code == 404

    # First user's undo attempt must not affect the record — it still
    # exists for its owner (the second user)
    client.headers = swapped
    assert len(_history(client, pid)) == 1


# ── Insurance undo ──


def test_undo_reverts_insurance_renewal_date(auth_client):
    """Undo should restore the insurance renewal date."""
    pid = _create_property(auth_client)
    resp = auth_client.post(f"/api/v1/properties/{pid}/insurance", json=INSURANCE_PAYLOAD)
    assert resp.status_code == 201
    policy_id = resp.json()["id"]
    original = INSURANCE_PAYLOAD["renewal_date"]

    _confirm(auth_client, "insurance", policy_id, original)

    p = auth_client.get(f"/api/v1/properties/{pid}/insurance").json()
    assert p["renewal_date"] != original

    history = _history(auth_client, pid)
    resp = auth_client.delete(f"/api/v1/payments/history/{history[0]['id']}")
    assert resp.status_code == 200

    p = auth_client.get(f"/api/v1/properties/{pid}/insurance").json()
    assert p["renewal_date"] == original
