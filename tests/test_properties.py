"""Tests for property CRUD."""

PROPERTY_PAYLOAD = {
    "name": "Test House", "address_line_1": "123 Test St", "city": "Testville",
    "state": "TS", "postal_code": "12345", "property_type": "Single Family", "status": "Vacant",
}


def test_create_property(auth_client):
    resp = auth_client.post("/api/v1/properties/", json=PROPERTY_PAYLOAD)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Test House"
    assert data["city"] == "Testville"


def test_list_properties(auth_client):
    auth_client.post("/api/v1/properties/", json=PROPERTY_PAYLOAD)
    resp = auth_client.get("/api/v1/properties/")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_get_property(auth_client):
    resp = auth_client.post("/api/v1/properties/", json=PROPERTY_PAYLOAD)
    prop_id = resp.json()["id"]
    resp = auth_client.get(f"/api/v1/properties/{prop_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Test House"


def test_update_property(auth_client):
    resp = auth_client.post("/api/v1/properties/", json=PROPERTY_PAYLOAD)
    prop_id = resp.json()["id"]
    resp = auth_client.patch(f"/api/v1/properties/{prop_id}", json={"current_value": 350000})
    assert resp.status_code == 200
    assert float(resp.json()["current_value"]) == 350000


def test_delete_property(auth_client):
    resp = auth_client.post("/api/v1/properties/", json=PROPERTY_PAYLOAD)
    prop_id = resp.json()["id"]
    resp = auth_client.delete(f"/api/v1/properties/{prop_id}")
    assert resp.status_code == 204
    resp = auth_client.get(f"/api/v1/properties/{prop_id}")
    assert resp.status_code == 404


def test_property_not_found(auth_client):
    resp = auth_client.get("/api/v1/properties/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


def test_user_scoping(auth_client, client):
    # User A creates property
    auth_client.post("/api/v1/properties/", json=PROPERTY_PAYLOAD)

    # User B registers and lists
    client.post("/api/v1/auth/register", json={"email": "b@test.com", "password": "pass12345", "name": "B"})
    resp = client.post("/api/v1/auth/login", json={"email": "b@test.com", "password": "pass12345"})
    token = resp.json()["access_token"]
    resp = client.get("/api/v1/properties/", headers={"Authorization": f"Bearer {token}"})
    assert len(resp.json()) == 0


def test_search_properties(auth_client):
    auth_client.post("/api/v1/properties/", json={**PROPERTY_PAYLOAD, "name": "Lake House"})
    auth_client.post("/api/v1/properties/", json={**PROPERTY_PAYLOAD, "name": "Mountain Cabin", "city": "Hilltown"})
    resp = auth_client.get("/api/v1/properties/?search=Lake")
    assert len(resp.json()) == 1
