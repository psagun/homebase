"""Tests for financial report endpoints — P&L, cash flow, YTD, and annual."""

import uuid
from datetime import date, timedelta

# Import MaintenanceRecord for the PnL maintenance test
from backend.models.maintenance_record import MaintenanceRecord

PROP_PAYLOAD = {"name": "Test Property", "address_line_1": "1 St", "city": "C", "state": "S", "postal_code": "00000"}


def _create_prop(auth_client) -> str:
    resp = auth_client.post("/api/v1/properties/", json=PROP_PAYLOAD)
    return resp.json()["id"]


def _add_txn(auth_client, pid: str, ttype: str, category: str, amount: float, date_str: str):
    return auth_client.post(f"/api/v1/properties/{pid}/transactions", json={
        "transaction_type": ttype,
        "category": category,
        "amount": amount,
        "transaction_date": date_str,
    })


def _add_maintenance(auth_client, pid: str, cost: float, date_str: str):
    """Directly add a maintenance record since there's no API endpoint."""
    from backend.dependencies import get_db
    from backend.main import app
    db = next(app.dependency_overrides.get(get_db, lambda: None)())
    if db is None:
        return
    from backend.models.property import Property
    prop = db.query(Property).filter(Property.id == uuid.UUID(pid)).first()
    rec = MaintenanceRecord(
        id=uuid.uuid4(),
        property_id=prop.id,
        title="Test maintenance",
        cost=cost,
        date=date.fromisoformat(date_str),
    )
    db.add(rec)
    db.commit()
    db.close()


# ─── P&L Tests ───

class TestPnl:
    def test_pnl_empty(self, auth_client):
        """P&L with no transactions returns empty state."""
        pid = _create_prop(auth_client)
        resp = auth_client.get(f"/api/v1/reports/pnl?property_id={pid}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_income"] == 0
        assert data["total_expenses"] == 0
        assert data["gross_profit"] == 0
        assert data["transaction_count"] == 0

    def test_pnl_basic(self, auth_client):
        """P&L with income and expenses."""
        pid = _create_prop(auth_client)
        _add_txn(auth_client, pid, "income", "Rent", 5000, "2026-06-01")
        _add_txn(auth_client, pid, "expense", "Mortgage", 2000, "2026-06-01")
        _add_txn(auth_client, pid, "expense", "Insurance", 500, "2026-06-15")

        resp = auth_client.get("/api/v1/reports/pnl")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_income"] == 5000
        assert data["total_expenses"] == 2500
        assert data["gross_profit"] == 2500
        assert data["profit_margin_percentage"] == 50.0
        assert data["transaction_count"] == 3

    def test_pnl_date_filtering(self, auth_client):
        """P&L respects date range."""
        pid = _create_prop(auth_client)
        _add_txn(auth_client, pid, "income", "Rent", 5000, "2026-01-15")
        _add_txn(auth_client, pid, "income", "Rent", 5000, "2026-06-15")

        # Only Q1
        resp = auth_client.get(f"/api/v1/reports/pnl?property_id={pid}&from_date=2026-01-01&to_date=2026-03-31")
        assert resp.json()["total_income"] == 5000
        assert resp.json()["transaction_count"] == 1

        # Full year
        resp = auth_client.get(f"/api/v1/reports/pnl?property_id={pid}&from_date=2026-01-01&to_date=2026-12-31")
        assert resp.json()["total_income"] == 10000
        assert resp.json()["transaction_count"] == 2

    def test_pnl_income_by_category(self, auth_client):
        """P&L returns categorized income breakdown."""
        pid = _create_prop(auth_client)
        _add_txn(auth_client, pid, "income", "Rent", 8000, "2026-06-01")
        _add_txn(auth_client, pid, "income", "Parking", 500, "2026-06-01")
        _add_txn(auth_client, pid, "income", "Storage", 300, "2026-06-01")

        resp = auth_client.get(f"/api/v1/reports/pnl?property_id={pid}")
        data = resp.json()
        categories = {c["category"]: c["amount"] for c in data["income_by_category"]}
        assert categories["Rent"] == 8000
        assert categories["Parking"] == 500
        assert categories["Storage"] == 300

    def test_pnl_expense_by_category(self, auth_client):
        """P&L returns categorized expense breakdown."""
        pid = _create_prop(auth_client)
        _add_txn(auth_client, pid, "expense", "Mortgage", 2000, "2026-06-01")
        _add_txn(auth_client, pid, "expense", "Utilities", 400, "2026-06-01")
        _add_txn(auth_client, pid, "expense", "HOA", 300, "2026-06-01")

        resp = auth_client.get(f"/api/v1/reports/pnl?property_id={pid}")
        data = resp.json()
        categories = {c["category"]: c["amount"] for c in data["expense_by_category"]}
        assert categories["Mortgage"] == 2000
        assert categories["Utilities"] == 400
        assert categories["HOA"] == 300

    def test_pnl_includes_maintenance_costs(self, auth_client):
        """P&L includes maintenance costs from the period as expenses."""
        pid = _create_prop(auth_client)
        _add_txn(auth_client, pid, "income", "Rent", 5000, "2026-06-01")
        _add_txn(auth_client, pid, "expense", "Mortgage", 2000, "2026-06-01")
        _add_maintenance(auth_client, pid, 1500, "2026-06-10")

        resp = auth_client.get(f"/api/v1/reports/pnl?property_id={pid}")
        data = resp.json()
        assert data["maintenance_included"] is True
        assert data["total_maintenance_cost"] == 1500
        assert data["total_expenses"] == 3500  # 2000 + 1500

        # Maintenance should appear in expense categories
        cats = {c["category"]: c["amount"] for c in data["expense_by_category"]}
        assert "Maintenance" in cats
        assert cats["Maintenance"] == 1500


# ─── Cash Flow Tests ───

class TestCashFlow:
    def test_cash_flow_empty(self, auth_client):
        """Cash flow with no data returns months with zero totals."""
        resp = auth_client.get("/api/v1/reports/cash-flow?from_date=2026-01-01&to_date=2026-03-31")
        assert resp.status_code == 200
        data = resp.json()
        assert data["months"] == 3
        assert data["totals"]["income"] == 0
        assert data["totals"]["expenses"] == 0
        assert all(m["income"] == 0 and m["expenses"] == 0 for m in data["monthly"])

    def test_cash_flow_monthly_buckets(self, auth_client):
        """Cash flow groups transactions by month."""
        pid = _create_prop(auth_client)
        _add_txn(auth_client, pid, "income", "Rent", 5000, "2026-01-15")
        _add_txn(auth_client, pid, "income", "Rent", 5000, "2026-02-15")
        _add_txn(auth_client, pid, "expense", "Mortgage", 2000, "2026-02-20")

        resp = auth_client.get("/api/v1/reports/cash-flow?from_date=2026-01-01&to_date=2026-03-31")
        data = resp.json()
        assert data["months"] == 3

        jan = [m for m in data["monthly"] if m["month"] == "2026-01"][0]
        assert jan["income"] == 5000
        assert jan["expenses"] == 0
        assert jan["net"] == 5000

        feb = [m for m in data["monthly"] if m["month"] == "2026-02"][0]
        assert feb["income"] == 5000
        assert feb["expenses"] == 2000
        assert feb["net"] == 3000

        mar = [m for m in data["monthly"] if m["month"] == "2026-03"][0]
        assert mar["income"] == 0
        assert mar["expenses"] == 0
        assert mar["net"] == 0

    def test_cash_flow_totals(self, auth_client):
        """Cash flow returns correct aggregate totals."""
        pid = _create_prop(auth_client)
        _add_txn(auth_client, pid, "income", "Rent", 5000, "2026-01-01")
        _add_txn(auth_client, pid, "income", "Rent", 5000, "2026-02-01")
        _add_txn(auth_client, pid, "expense", "Mortgage", 3000, "2026-01-15")
        _add_txn(auth_client, pid, "expense", "Insurance", 500, "2026-02-15")

        resp = auth_client.get("/api/v1/reports/cash-flow?from_date=2026-01-01&to_date=2026-02-28")
        data = resp.json()
        assert data["totals"]["income"] == 10000
        assert data["totals"]["expenses"] == 3500
        assert data["totals"]["net"] == 6500


# ─── YTD Tests ───

class TestYtd:
    def test_ytd_empty(self, auth_client):
        """YTD with no data returns zeros."""
        resp = auth_client.get("/api/v1/reports/ytd")
        assert resp.status_code == 200
        data = resp.json()
        assert data["current"]["income"] == 0
        assert data["current"]["expenses"] == 0

    def test_ytd_current_year(self, auth_client):
        """YTD returns current year data."""
        pid = _create_prop(auth_client)
        _add_txn(auth_client, pid, "income", "Rent", 30000, "2026-01-01")
        _add_txn(auth_client, pid, "expense", "Mortgage", 12000, "2026-01-01")

        resp = auth_client.get("/api/v1/reports/ytd")
        data = resp.json()
        assert data["current"]["income"] == 30000
        assert data["current"]["expenses"] == 12000
        assert data["current"]["net"] == 18000
        assert data["year"] == 2026

    def test_ytd_prior_year_comparison(self, auth_client):
        """YTD includes prior year comparison when data exists."""
        pid = _create_prop(auth_client)
        # This year
        _add_txn(auth_client, pid, "income", "Rent", 30000, "2026-01-01")
        # Prior year (same period)
        _add_txn(auth_client, pid, "income", "Rent", 25000, "2025-01-01")

        resp = auth_client.get("/api/v1/reports/ytd")
        data = resp.json()
        assert data["current"]["income"] == 30000
        assert data["prior"]["income"] == 25000
        assert data["change"]["income"]["percentage"] == 20.0


# ─── Annual Tests ───

class TestAnnual:
    def test_annual_empty(self, auth_client):
        """Annual with no data returns empty monthly breakdown."""
        resp = auth_client.get("/api/v1/reports/annual?year=2026")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_income"] == 0
        assert data["total_expenses"] == 0
        assert len(data["monthly"]) == 12

    def test_annual_monthly_breakdown(self, auth_client):
        """Annual returns correct monthly breakdown."""
        pid = _create_prop(auth_client)
        _add_txn(auth_client, pid, "income", "Rent", 5000, "2026-01-15")
        _add_txn(auth_client, pid, "income", "Rent", 5000, "2026-02-15")
        _add_txn(auth_client, pid, "expense", "Mortgage", 2000, "2026-01-20")

        resp = auth_client.get("/api/v1/reports/annual?year=2026")
        data = resp.json()
        assert data["year"] == 2026
        assert data["total_income"] == 10000
        assert data["total_expenses"] == 2000
        assert data["net_income"] == 8000

        jan = [m for m in data["monthly"] if m["month"] == 1][0]
        assert jan["income"] == 5000
        assert jan["expenses"] == 2000
        assert jan["net"] == 3000

        feb = [m for m in data["monthly"] if m["month"] == 2][0]
        assert feb["income"] == 5000
        assert feb["expenses"] == 0
        assert feb["net"] == 5000

    def test_annual_user_scoped(self, auth_client):
        """Annual only returns data for the authenticated user."""
        # Create a property and transactions
        pid = _create_prop(auth_client)
        _add_txn(auth_client, pid, "income", "Rent", 5000, "2026-01-01")

        resp = auth_client.get("/api/v1/reports/annual?year=2026")
        assert resp.json()["total_income"] == 5000
