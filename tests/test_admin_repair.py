"""Tests for the demo-data repair endpoint (admin)."""

PROPERTY_PAYLOAD = {
    "name": "My Property",
    "address_line_1": "123 Test St",
    "city": "Testville", "state": "TS",
    "postal_code": "12345",
    "property_type": "Single Family",
    "status": "Vacant",
}


def _create_property(auth_client, name="My Property"):
    resp = auth_client.post("/api/v1/properties", json={**PROPERTY_PAYLOAD, "name": name})
    assert resp.status_code == 201
    return resp.json()


def _swap_headers(client, email, password):
    saved = dict(client.headers)
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    token = resp.json()["access_token"]
    swapped = {k: v for k, v in saved.items() if k.lower() != "authorization"}
    swapped["Authorization"] = f"Bearer {token}"
    client.headers = swapped
    return saved


def test_repair_demo_data_dry_run_then_apply(client, auth_client):
    """Dry-run reports orphans/renames; apply deletes and retitles."""
    # Demo user with a real property
    client.post("/api/v1/auth/register", json={
        "email": "demo@homebase.app", "password": "testpass123", "name": "Demo",
    })
    saved = _swap_headers(client, "demo@homebase.app", "testpass123")
    demo_prop = _create_property(client, "Demo Home")
    client.headers = saved

    # Another user owns a property the demo user's tasks should NOT reference
    client.post("/api/v1/auth/register", json={
        "email": "foreign@homebase.app", "password": "testpass123", "name": "Foreign",
    })
    saved2 = _swap_headers(client, "foreign@homebase.app", "testpass123")
    foreign_prop = _create_property(client, "Foreign House")
    client.headers = saved2

    # Demo user's tasks: one well-linked, one foreign-linked, one mismatched title
    saved3 = _swap_headers(client, "demo@homebase.app", "testpass123")
    for title, pid in [
        ("Collect rent - Demo Home", demo_prop["id"]),
        ("HOA dues - Oakwood Townhomes", demo_prop["id"]),  # mismatched suffix
        ("Collect rent - Old Name", foreign_prop["id"]),    # orphaned
    ]:
        resp = client.post("/api/v1/tasks", json={
            "title": title, "property_id": pid,
            "task_type": "Custom", "due_date": "2030-01-01", "priority": "Medium",
        })
        assert resp.status_code == 201
    client.headers = saved3

    # Dry run — nothing changes
    resp = auth_client.post("/api/v1/admin/repair-demo-data")
    assert resp.status_code == 200
    rep = resp.json()["report"]
    assert rep["dry_run"] is True
    assert rep["tasks_orphaned"] == 1
    assert rep["tasks_retitled"] == 1

    saved4 = _swap_headers(client, "demo@homebase.app", "testpass123")
    tasks = client.get("/api/v1/tasks").json()
    assert len(tasks) == 3
    client.headers = saved4

    # Apply
    resp = auth_client.post("/api/v1/admin/repair-demo-data?apply=true")
    assert resp.status_code == 200
    rep = resp.json()["report"]
    assert rep["dry_run"] is False
    assert rep["tasks_orphaned"] == 1
    assert rep["tasks_retitled"] == 1

    saved5 = _swap_headers(client, "demo@homebase.app", "testpass123")
    tasks = client.get("/api/v1/tasks").json()
    client.headers = saved5
    assert len(tasks) == 2  # orphan deleted
    titles = {t["title"] for t in tasks}
    assert "Collect rent - Demo Home" in titles
    assert "HOA dues - Demo Home" in titles  # retitled to the linked property
    assert all(t["property_name"] == "Demo Home" for t in tasks)


def test_repair_requires_admin(client):
    """Non-admin users get 403."""
    import uuid

    import bcrypt

    from backend.models.user import User
    from tests.conftest import TestingSessionLocal

    db = TestingSessionLocal()
    db.add(User(
        id=uuid.uuid4(),
        email="investor@homebase.app",
        password_hash=bcrypt.hashpw(b"testpass123", bcrypt.gensalt()).decode("utf-8"),
        name="Investor",
        role="investor",
    ))
    db.commit()
    db.close()

    resp = client.post("/api/v1/auth/login", json={
        "email": "investor@homebase.app", "password": "testpass123",
    })
    client.headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}

    resp = client.post("/api/v1/admin/repair-demo-data")
    assert resp.status_code == 403
