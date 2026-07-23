"""Tests for insurance policy CRUD."""

PROP_PAYLOAD = {"name": "Test", "address_line_1": "1 St", "city": "C", "state": "S", "postal_code": "00000"}
POLICY_PAYLOAD = {"provider_name": "InsureCo", "policy_type": "HO-3", "coverage_amount": 500000}


def _create_prop(auth_client):
    resp = auth_client.post("/api/v1/properties/", json=PROP_PAYLOAD)
    return resp.json()["id"]


def test_create_policy(auth_client):
    pid = _create_prop(auth_client)
    resp = auth_client.post(f"/api/v1/properties/{pid}/insurance", json=POLICY_PAYLOAD)
    assert resp.status_code == 201
    assert resp.json()["provider_name"] == "InsureCo"


def test_get_active_policy(auth_client):
    pid = _create_prop(auth_client)
    auth_client.post(f"/api/v1/properties/{pid}/insurance", json=POLICY_PAYLOAD)
    resp = auth_client.get(f"/api/v1/properties/{pid}/insurance")
    assert resp.status_code == 200
    assert resp.json()["provider_name"] == "InsureCo"


def test_provider_history_on_change(auth_client):
    pid = _create_prop(auth_client)
    resp = auth_client.post(f"/api/v1/properties/{pid}/insurance", json=POLICY_PAYLOAD)
    pid_id = resp.json()["id"]
    resp = auth_client.patch(f"/api/v1/insurance/{pid_id}", json={"provider_name": "NewCo"})
    assert resp.status_code == 200
    assert resp.json()["provider_name"] == "NewCo"
    assert resp.json()["is_active"] == True


def test_no_policy_returns_null(auth_client):
    pid = _create_prop(auth_client)
    resp = auth_client.get(f"/api/v1/properties/{pid}/insurance")
    assert resp.status_code == 200
    assert resp.json() is None
