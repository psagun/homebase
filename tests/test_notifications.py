"""Tests for notification property-name resolution and dedupe."""

from datetime import date, timedelta

PROPERTY_PAYLOAD = {
    "name": "Maple Court",
    "address_line_1": "123 Test St",
    "city": "Testville", "state": "TS",
    "postal_code": "12345",
    "property_type": "Single Family",
    "status": "Vacant",
}


def _create_property(auth_client):
    resp = auth_client.post("/api/v1/properties", json=PROPERTY_PAYLOAD)
    assert resp.status_code == 201
    return resp.json()["id"]


def _create_task(auth_client, property_id, title, due_date, status="Overdue"):
    resp = auth_client.post("/api/v1/tasks", json={
        "title": title,
        "property_id": property_id,
        "task_type": "Custom",
        "due_date": str(due_date),
        "priority": "Medium",
    })
    assert resp.status_code == 201
    task_id = resp.json()["id"]
    if status != "Overdue":
        auth_client.patch(f"/api/v1/tasks/{task_id}", json={"status": status})
    return task_id


def test_notification_skips_duplicate_property_suffix(auth_client):
    """Title already ending with '- <Property>' should not get the name appended."""
    pid = _create_property(auth_client)
    _create_task(auth_client, pid, "Collect rent - Maple Court", date.today() - timedelta(days=2))

    resp = auth_client.get("/api/v1/notifications").json()
    titles = [n["title"] for n in resp["notifications"]]
    assert "Overdue: Collect rent - Maple Court" in titles
    assert all("— Maple Court" not in t for t in titles)


def test_notification_appends_property_name(auth_client):
    """Title without the property suffix gets ' — <Property>' appended."""
    pid = _create_property(auth_client)
    _create_task(auth_client, pid, "HOA dues", date.today() - timedelta(days=2))

    resp = auth_client.get("/api/v1/notifications").json()
    titles = [n["title"] for n in resp["notifications"]]
    assert "Overdue: HOA dues — Maple Court" in titles
