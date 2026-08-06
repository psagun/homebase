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
