"""Tests for task CRUD and overdue detection."""


def test_create_task(auth_client):
    resp = auth_client.post("/api/v1/tasks/", json={
        "title": "Pay mortgage", "task_type": "Mortgage Payment", "priority": "High",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Pay mortgage"
    assert data["status"] == "Upcoming"


def test_list_tasks(auth_client):
    auth_client.post("/api/v1/tasks/", json={"title": "Task A"})
    auth_client.post("/api/v1/tasks/", json={"title": "Task B"})
    resp = auth_client.get("/api/v1/tasks/")
    assert len(resp.json()) == 2


def test_update_task_status(auth_client):
    resp = auth_client.post("/api/v1/tasks/", json={"title": "Complete me"})
    tid = resp.json()["id"]
    resp = auth_client.patch(f"/api/v1/tasks/{tid}", json={"status": "Completed"})
    assert resp.json()["status"] == "Completed"


def test_delete_task(auth_client):
    resp = auth_client.post("/api/v1/tasks/", json={"title": "Delete me"})
    tid = resp.json()["id"]
    resp = auth_client.delete(f"/api/v1/tasks/{tid}")
    assert resp.status_code == 204


def test_filter_tasks_by_status(auth_client):
    resp = auth_client.post("/api/v1/tasks/", json={"title": "Task A", "due_date": "2020-01-01"})
    tid = resp.json()["id"]
    auth_client.post("/api/v1/tasks/", json={"title": "Task B"})
    # Task A should be auto-assigned Overdue (past due date)
    resp = auth_client.get("/api/v1/tasks/?status=Overdue")
    assert len(resp.json()) == 1


def test_overdue_detection(auth_client):
    # Create task with past due date
    resp = auth_client.post("/api/v1/tasks/", json={
        "title": "Past due", "due_date": "2020-01-01",
    })
    assert resp.json()["status"] == "Overdue"
