"""Tests for mortgage CRUD and lender history."""

PROP_PAYLOAD = {"name": "Test", "address_line_1": "1 St", "city": "C", "state": "S", "postal_code": "00000"}
MORTGAGE_PAYLOAD = {"lender_name": "Bank A", "loan_type": "Fixed 30yr", "interest_rate": 6.5, "monthly_payment": 2000}


def _create_prop(auth_client):
    resp = auth_client.post("/api/v1/properties/", json=PROP_PAYLOAD)
    return resp.json()["id"]


def test_create_mortgage(auth_client):
    pid = _create_prop(auth_client)
    resp = auth_client.post(f"/api/v1/properties/{pid}/mortgage", json=MORTGAGE_PAYLOAD)
    assert resp.status_code == 201
    assert resp.json()["lender_name"] == "Bank A"
    assert resp.json()["is_active"] == True


def test_get_active_mortgage(auth_client):
    pid = _create_prop(auth_client)
    auth_client.post(f"/api/v1/properties/{pid}/mortgage", json=MORTGAGE_PAYLOAD)
    resp = auth_client.get(f"/api/v1/properties/{pid}/mortgage")
    assert resp.status_code == 200
    assert resp.json()["lender_name"] == "Bank A"


def test_lender_history_on_change(auth_client):
    pid = _create_prop(auth_client)
    resp = auth_client.post(f"/api/v1/properties/{pid}/mortgage", json=MORTGAGE_PAYLOAD)
    mid = resp.json()["id"]

    # Change lender — old record should archive, new one created
    resp = auth_client.patch(f"/api/v1/mortgages/{mid}", json={"lender_name": "Bank B"})
    assert resp.status_code == 200
    assert resp.json()["lender_name"] == "Bank B"
    assert resp.json()["is_active"] == True

    # Active mortgage should be the new one
    resp = auth_client.get(f"/api/v1/properties/{pid}/mortgage")
    assert resp.json()["lender_name"] == "Bank B"


def test_no_mortgage_returns_null(auth_client):
    pid = _create_prop(auth_client)
    resp = auth_client.get(f"/api/v1/properties/{pid}/mortgage")
    assert resp.status_code == 200
    assert resp.json() is None


def test_delete_mortgage(auth_client):
    pid = _create_prop(auth_client)
    resp = auth_client.post(f"/api/v1/properties/{pid}/mortgage", json=MORTGAGE_PAYLOAD)
    mid = resp.json()["id"]
    resp = auth_client.delete(f"/api/v1/mortgages/{mid}")
    assert resp.status_code == 204
