"""Tests for authentication endpoints."""


def test_register(client):
    """Registration now requires email verification before login."""
    resp = client.post("/api/v1/auth/register", json={"email": "new@test.com", "password": "password123", "name": "New"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["needs_verification"] is True
    assert data["email"] == "new@test.com"

    # Unverified accounts cannot sign in
    resp = client.post("/api/v1/auth/login", json={"email": "new@test.com", "password": "password123"})
    assert resp.status_code == 403

    # Wrong code is rejected; the right code signs in
    resp = client.post("/api/v1/auth/verify", json={"email": "new@test.com", "code": "000000"})
    assert resp.status_code == 401

    from tests.conftest import verify_email
    verify_email("new@test.com")
    resp = client.post("/api/v1/auth/login", json={"email": "new@test.com", "password": "password123"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_register_duplicate(client):
    client.post("/api/v1/auth/register", json={"email": "dup@test.com", "password": "password123", "name": "Dup"})
    resp = client.post("/api/v1/auth/register", json={"email": "dup@test.com", "password": "password123", "name": "Dup2"})
    assert resp.status_code == 409


def test_login(auth_client):
    # auth_client registers and logs in, so a second login should work
    resp = auth_client.post("/api/v1/auth/login", json={"email": "test@homebase.app", "password": "testpass123"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_invalid_password(client):
    client.post("/api/v1/auth/register", json={"email": "fail@test.com", "password": "password123", "name": "Fail"})
    resp = client.post("/api/v1/auth/login", json={"email": "fail@test.com", "password": "wrongpass"})
    assert resp.status_code == 401


def test_me_authenticated(auth_client):
    resp = auth_client.get("/api/v1/auth/me")
    assert resp.status_code == 200
    assert resp.json()["email"] == "test@homebase.app"


def test_me_unauthenticated(client):
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401


def test_change_password(auth_client):
    resp = auth_client.post("/api/v1/auth/change-password", json={"current_password": "testpass123", "new_password": "newpass123"})
    assert resp.status_code == 200

    # Login with new password
    resp = auth_client.post("/api/v1/auth/login", json={"email": "test@homebase.app", "password": "newpass123"})
    assert resp.status_code == 200


def test_change_password_wrong_current(auth_client):
    resp = auth_client.post("/api/v1/auth/change-password", json={"current_password": "wrong", "new_password": "newpass123"})
    assert resp.status_code == 401


def test_protected_route_without_token(client):
    resp = client.get("/api/v1/properties/")
    assert resp.status_code == 401
