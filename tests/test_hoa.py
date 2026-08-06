"""HOA fee CRUD tests (mirror the taxes module pattern)."""

PROPERTY_PAYLOAD = {
    "name": "HOA House", "address_line_1": "5 Hoa Ln",
    "city": "Testville", "state": "TS", "postal_code": "12345",
    "property_type": "Single Family", "status": "Vacant",
}


def test_hoa_crud(auth_client):
    pid = auth_client.post("/api/v1/properties", json=PROPERTY_PAYLOAD).json()["id"]

    # Empty list initially
    assert auth_client.get(f"/api/v1/properties/{pid}/hoa").json() == []

    # Create
    resp = auth_client.post(f"/api/v1/properties/{pid}/hoa", json={
        "association_name": "Oakwood HOA", "fee_amount": "600",
        "payment_frequency": "Quarterly", "next_due_date": "2026-09-01",
    })
    assert resp.status_code == 200, resp.text
    fee = resp.json()
    assert fee["association_name"] == "Oakwood HOA"

    # Empty strings coerced to null (dates/numbers)
    resp = auth_client.post(f"/api/v1/properties/{pid}/hoa", json={
        "association_name": "Second HOA", "fee_amount": "",
        "next_due_date": "",
    })
    assert resp.status_code == 200
    assert resp.json()["next_due_date"] is None

    # Missing name -> 422
    assert auth_client.post(f"/api/v1/properties/{pid}/hoa", json={"fee_amount": 1}).status_code == 422

    # Update
    resp = auth_client.patch(f"/api/v1/properties/{pid}/hoa/{fee['id']}", json={
        "fee_amount": "750", "notes": "Covers landscaping",
    })
    assert resp.status_code == 200, resp.text
    assert resp.json()["fee_amount"] == 750.0

    # List shows both
    assert len(auth_client.get(f"/api/v1/properties/{pid}/hoa").json()) == 2

    # Delete
    resp = auth_client.delete(f"/api/v1/properties/{pid}/hoa/{fee['id']}")
    assert resp.status_code == 204
    assert len(auth_client.get(f"/api/v1/properties/{pid}/hoa").json()) == 1


def test_hoa_payment_confirm_and_undo(auth_client):
    """HOA fees participate in the payment confirm/undo flow."""
    from datetime import date, timedelta

    pid = auth_client.post("/api/v1/properties", json=PROPERTY_PAYLOAD).json()["id"]
    due = str(date.today() + timedelta(days=30))
    fee = auth_client.post(f"/api/v1/properties/{pid}/hoa", json={
        "association_name": "Oakwood HOA", "fee_amount": 600,
        "payment_frequency": "Quarterly", "next_due_date": due,
    }).json()

    resp = auth_client.post("/api/v1/payments/confirm", params={
        "payment_type": "hoa", "source_id": fee["id"], "due_date": due,
    })
    assert resp.status_code == 200, resp.text

    # Due date advanced, history recorded with amount
    updated = auth_client.get(f"/api/v1/properties/{pid}/hoa").json()[0]
    assert updated["next_due_date"] != due
    history = auth_client.get("/api/v1/payments/history", params={"property_id": pid}).json()
    assert len(history) == 1
    assert history[0]["payment_type"] == "hoa"
    assert history[0]["amount"] == 600.0

    # Undo restores the date
    resp = auth_client.delete(f"/api/v1/payments/history/{history[0]['id']}")
    assert resp.status_code == 200
    updated = auth_client.get(f"/api/v1/properties/{pid}/hoa").json()[0]
    assert updated["next_due_date"] == due
