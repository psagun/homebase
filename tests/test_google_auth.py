"""Tests for Google sign-in via Supabase Auth (backend bridge)."""


class _FakeSupabaseUser:
    def __init__(self, email, name=None):
        self.email = email
        self.user_metadata = {"full_name": name} if name else {}


class _FakeAuth:
    def __init__(self, user):
        self._user = user

    def get_user(self, token):
        if token == "bad-token":
            raise Exception("invalid JWT")
        return type("Resp", (), {"user": self._user})()


class _FakeClient:
    def __init__(self, user):
        self.auth = _FakeAuth(user)


def _patch_client(monkeypatch, user):
    monkeypatch.setattr(
        "backend.services.document_storage_service.get_supabase_admin_client",
        lambda: _FakeClient(user),
    )


def test_google_auth_auto_creates_user(client, monkeypatch):
    """Unknown Google email creates an account with role 'user'."""
    _patch_client(monkeypatch, _FakeSupabaseUser("new.google.user@gmail.com", "New User"))

    resp = client.post("/api/v1/auth/google", json={"access_token": "valid-token"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["user"]["email"] == "new.google.user@gmail.com"
    assert resp.json()["user"]["role"] == "user"

    # The created account can be logged into via the app's own flow
    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "new.google.user@gmail.com"


def test_google_auth_matches_existing_user(client, monkeypatch, auth_client):
    """Existing email signs into the SAME account (role preserved)."""
    from backend.models.user import User
    from tests.conftest import TestingSessionLocal

    # Existing admin account (like bidtexasyeti@gmail.com)
    db = TestingSessionLocal()
    db.add(User(
        id=__import__("uuid").uuid4(),
        email="bidtexasyeti@gmail.com",
        password_hash="x",
        name="Real User",
        role="admin",
    ))
    db.commit()
    db.close()

    _patch_client(monkeypatch, _FakeSupabaseUser("bidtexasyeti@gmail.com", "Real User"))

    resp = client.post("/api/v1/auth/google", json={"access_token": "valid-token"})
    assert resp.status_code == 200
    assert resp.json()["user"]["email"] == "bidtexasyeti@gmail.com"
    assert resp.json()["user"]["role"] == "admin"  # not downgraded


def test_google_auth_rejects_invalid_token(client, monkeypatch):
    """A forged/expired Supabase token is rejected."""
    _patch_client(monkeypatch, _FakeSupabaseUser("someone@gmail.com"))
    resp = client.post("/api/v1/auth/google", json={"access_token": "bad-token"})
    assert resp.status_code == 401
