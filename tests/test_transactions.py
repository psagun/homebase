"""Tests for transaction CRUD and cash flow."""

PROP_PAYLOAD = {"name": "Test", "address_line_1": "1 St", "city": "C", "state": "S", "postal_code": "00000"}


def _create_prop(auth_client):
    resp = auth_client.post("/api/v1/properties/", json=PROP_PAYLOAD)
    return resp.json()["id"]


def test_create_income(auth_client):
    pid = _create_prop(auth_client)
    resp = auth_client.post(f"/api/v1/properties/{pid}/transactions", json={
        "transaction_type": "income", "category": "Rent", "amount": 5000, "transaction_date": "2026-07-01",
    })
    assert resp.status_code == 201
    assert resp.json()["category"] == "Rent"
    assert float(resp.json()["amount"]) == 5000


def test_create_expense(auth_client):
    pid = _create_prop(auth_client)
    resp = auth_client.post(f"/api/v1/properties/{pid}/transactions", json={
        "transaction_type": "expense", "category": "Mortgage", "amount": 2000, "transaction_date": "2026-07-01",
    })
    assert resp.status_code == 201


def test_list_transactions(auth_client):
    pid = _create_prop(auth_client)
    auth_client.post(f"/api/v1/properties/{pid}/transactions", json={
        "transaction_type": "income", "category": "Rent", "amount": 5000, "transaction_date": "2026-07-01",
    })
    resp = auth_client.get(f"/api/v1/properties/{pid}/transactions")
    assert len(resp.json()) == 1


def test_cash_flow(auth_client):
    pid = _create_prop(auth_client)
    auth_client.post(f"/api/v1/properties/{pid}/transactions", json={
        "transaction_type": "income", "category": "Rent", "amount": 5000, "transaction_date": "2026-07-01",
    })
    auth_client.post(f"/api/v1/properties/{pid}/transactions", json={
        "transaction_type": "expense", "category": "Mortgage", "amount": 2000, "transaction_date": "2026-07-01",
    })
    resp = auth_client.get(f"/api/v1/properties/{pid}/transactions/cash-flow")
    assert resp.json()["total_income"] == 5000
    assert resp.json()["total_expenses"] == 2000
    assert resp.json()["net_cash_flow"] == 3000


def test_delete_transaction(auth_client):
    pid = _create_prop(auth_client)
    resp = auth_client.post(f"/api/v1/properties/{pid}/transactions", json={
        "transaction_type": "income", "category": "Rent", "amount": 1000, "transaction_date": "2026-07-01",
    })
    txn_id = resp.json()["id"]
    resp = auth_client.delete(f"/api/v1/transactions/{txn_id}")
    assert resp.status_code == 204
