"""Integration tests: due date sync when mortgage/insurance dates change.

When a mortgage's next_due_date or an insurance policy's renewal_date
is updated, any related UPCOMING/DUE_TODAY/OVERDUE task should have
its due_date synced to match.
"""

from datetime import date, timedelta

TODAY = date.today()

PROPERTY_PAYLOAD = {
    "name": "Test House",
    "address_line_1": "123 Test St",
    "city": "Testville", "state": "TS",
    "postal_code": "12345",
    "property_type": "Single Family",
    "status": "Vacant",
}

MORTGAGE_PAYLOAD = {
    "lender_name": "Test Bank",
    "loan_type": "30-Year Fixed",
    "interest_rate": 3.5,
    "original_amount": 300000,
    "monthly_payment": 1347,
    "next_due_date": str(TODAY + timedelta(days=30)),
}

INSURANCE_PAYLOAD = {
    "provider_name": "Test Insurance Co",
    "policy_type": "Landlord Insurance",
    "coverage_amount": 500000,
    "annual_premium": 1200,
    "renewal_date": str(TODAY + timedelta(days=60)),
}


def _create_property(auth_client):
    """Helper: create a property and return its id."""
    resp = auth_client.post("/api/v1/properties", json=PROPERTY_PAYLOAD)
    assert resp.status_code == 201
    return resp.json()["id"]


def _create_task(auth_client, property_id, task_type, due_date, status="Upcoming"):
    """Helper: create a task linked to a property."""
    resp = auth_client.post("/api/v1/tasks", json={
        "title": f"Test {task_type}",
        "property_id": property_id,
        "task_type": task_type,
        "due_date": str(due_date),
        "priority": "Medium",
    })
    assert resp.status_code == 201

    # Update status if needed (default API creates as UPCOMING)
    if status != "Upcoming":
        task_id = resp.json()["id"]
        auth_client.patch(f"/api/v1/tasks/{task_id}", json={"status": status})

    return resp.json()


# ── Mortgage → MORTGAGE_PAYMENT task sync ──


def test_mortgage_date_update_syncs_task(auth_client):
    """Updating mortgage next_due_date should update the MORTGAGE_PAYMENT task."""
    pid = _create_property(auth_client)
    task = _create_task(auth_client, pid, "Mortgage Payment", TODAY + timedelta(days=30))

    # Create mortgage
    resp = auth_client.post(f"/api/v1/properties/{pid}/mortgage", json=MORTGAGE_PAYLOAD)
    assert resp.status_code == 201
    mortgage_id = resp.json()["id"]

    # Update mortgage due date
    new_date = str(TODAY + timedelta(days=45))
    resp = auth_client.patch(f"/api/v1/mortgages/{mortgage_id}", json={"next_due_date": new_date})
    assert resp.status_code == 200

    # Check task due date was updated
    tasks = auth_client.get(f"/api/v1/tasks/?property_id={pid}").json()
    mortgage_tasks = [t for t in tasks if t["task_type"] == "Mortgage Payment"]
    assert len(mortgage_tasks) > 0
    assert mortgage_tasks[0]["due_date"] == new_date


def test_mortgage_update_other_field_does_not_sync(auth_client):
    """Updating a non-date mortgage field should NOT change the task due_date."""
    pid = _create_property(auth_client)
    original_date = str(TODAY + timedelta(days=30))
    task = _create_task(auth_client, pid, "Mortgage Payment", original_date)

    resp = auth_client.post(f"/api/v1/properties/{pid}/mortgage", json=MORTGAGE_PAYLOAD)
    mortgage_id = resp.json()["id"]

    # Update lender name (not the due date)
    resp = auth_client.patch(f"/api/v1/mortgages/{mortgage_id}", json={"lender_name": "New Bank"})
    assert resp.status_code == 200

    tasks = auth_client.get(f"/api/v1/tasks/?property_id={pid}").json()
    mortgage_tasks = [t for t in tasks if t["task_type"] == "Mortgage Payment"]
    assert mortgage_tasks[0]["due_date"] == original_date


def test_completed_task_not_updated_by_mortgage_change(auth_client):
    """A COMPLETED MORTGAGE_PAYMENT task should keep its due_date."""
    pid = _create_property(auth_client)
    old_date = str(TODAY + timedelta(days=30))
    task = _create_task(auth_client, pid, "Mortgage Payment", old_date, status="Completed")

    resp = auth_client.post(f"/api/v1/properties/{pid}/mortgage", json=MORTGAGE_PAYLOAD)
    mortgage_id = resp.json()["id"]

    new_date = str(TODAY + timedelta(days=45))
    auth_client.patch(f"/api/v1/mortgages/{mortgage_id}", json={"next_due_date": new_date})

    tasks = auth_client.get(f"/api/v1/tasks/?property_id={pid}").json()
    mortgage_tasks = [t for t in tasks if t["task_type"] == "Mortgage Payment"]
    assert mortgage_tasks[0]["due_date"] == old_date


# ── Insurance → INSURANCE_RENEWAL task sync ──


def test_insurance_date_update_syncs_task(auth_client):
    """Updating insurance renewal_date should update the INSURANCE_RENEWAL task."""
    pid = _create_property(auth_client)
    task = _create_task(auth_client, pid, "Insurance Renewal", TODAY + timedelta(days=60))

    resp = auth_client.post(f"/api/v1/properties/{pid}/insurance", json=INSURANCE_PAYLOAD)
    assert resp.status_code == 201
    policy_id = resp.json()["id"]

    new_date = str(TODAY + timedelta(days=90))
    resp = auth_client.patch(f"/api/v1/insurance/{policy_id}", json={"renewal_date": new_date})
    assert resp.status_code == 200

    tasks = auth_client.get(f"/api/v1/tasks/?property_id={pid}").json()
    insurance_tasks = [t for t in tasks if t["task_type"] == "Insurance Renewal"]
    assert len(insurance_tasks) > 0
    assert insurance_tasks[0]["due_date"] == new_date


def test_insurance_update_other_field_does_not_sync(auth_client):
    """Updating a non-date insurance field should NOT change the task due_date."""
    pid = _create_property(auth_client)
    original_date = str(TODAY + timedelta(days=60))
    task = _create_task(auth_client, pid, "Insurance Renewal", original_date)

    resp = auth_client.post(f"/api/v1/properties/{pid}/insurance", json=INSURANCE_PAYLOAD)
    policy_id = resp.json()["id"]

    resp = auth_client.patch(f"/api/v1/insurance/{policy_id}", json={"provider_name": "New Ins Co"})
    assert resp.status_code == 200

    tasks = auth_client.get(f"/api/v1/tasks/?property_id={pid}").json()
    insurance_tasks = [t for t in tasks if t["task_type"] == "Insurance Renewal"]
    assert insurance_tasks[0]["due_date"] == original_date


def test_dismissed_task_not_updated_by_insurance_change(auth_client):
    """A DISMISSED INSURANCE_RENEWAL task should keep its due_date."""
    pid = _create_property(auth_client)
    old_date = str(TODAY + timedelta(days=60))
    task = _create_task(auth_client, pid, "Insurance Renewal", old_date, status="Dismissed")

    resp = auth_client.post(f"/api/v1/properties/{pid}/insurance", json=INSURANCE_PAYLOAD)
    policy_id = resp.json()["id"]

    auth_client.patch(f"/api/v1/insurance/{policy_id}", json={"renewal_date": str(TODAY + timedelta(days=90))})

    tasks = auth_client.get(f"/api/v1/tasks/?property_id={pid}").json()
    insurance_tasks = [t for t in tasks if t["task_type"] == "Insurance Renewal"]
    assert insurance_tasks[0]["due_date"] == old_date


# ── Both syncs work independently ──


def test_mortgage_and_insurance_sync_independently(auth_client):
    """Both sync paths should work on the same property without interfering."""
    pid = _create_property(auth_client)

    # Create both tasks
    _create_task(auth_client, pid, "Mortgage Payment", TODAY + timedelta(days=30))
    _create_task(auth_client, pid, "Insurance Renewal", TODAY + timedelta(days=60))

    # Create mortgage and insurance
    resp = auth_client.post(f"/api/v1/properties/{pid}/mortgage", json=MORTGAGE_PAYLOAD)
    mortgage_id = resp.json()["id"]
    resp = auth_client.post(f"/api/v1/properties/{pid}/insurance", json=INSURANCE_PAYLOAD)
    policy_id = resp.json()["id"]

    # Update both
    new_mtg_date = str(TODAY + timedelta(days=45))
    new_ins_date = str(TODAY + timedelta(days=100))
    auth_client.patch(f"/api/v1/mortgages/{mortgage_id}", json={"next_due_date": new_mtg_date})
    auth_client.patch(f"/api/v1/insurance/{policy_id}", json={"renewal_date": new_ins_date})

    tasks = auth_client.get(f"/api/v1/tasks/?property_id={pid}").json()
    mtg = [t for t in tasks if t["task_type"] == "Mortgage Payment"][0]
    ins = [t for t in tasks if t["task_type"] == "Insurance Renewal"][0]
    assert mtg["due_date"] == new_mtg_date
    assert ins["due_date"] == new_ins_date
