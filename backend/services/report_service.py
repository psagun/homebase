"""Financial report aggregation service — P&L, cash flow, YTD, and annual reports."""

import uuid
from datetime import date
from typing import Any

from sqlalchemy import extract
from sqlalchemy.orm import Session

from backend.models.maintenance_record import MaintenanceRecord
from backend.models.property import Property
from backend.models.transaction import Transaction, TransactionType


def _get_date_range(
    from_date: str | None,
    to_date: str | None,
) -> tuple[date, date]:
    """Resolve from/to dates, defaulting to current year to-date."""
    today = date.today()
    if from_date:
        parsed_from = date.fromisoformat(from_date)
    else:
        parsed_from = date(today.year, 1, 1)

    if to_date:
        parsed_to = date.fromisoformat(to_date)
    else:
        parsed_to = today

    return parsed_from, parsed_to


def get_pnl(
    db: Session,
    user_id: uuid.UUID,
    from_date: str | None = None,
    to_date: str | None = None,
    property_id: uuid.UUID | None = None,
) -> dict[str, Any]:
    """Profit & Loss statement within a date range.

    Groups transactions by income/expense category, includes maintenance
    costs as expenses, and returns net income.
    """
    from_date_parsed, to_date_parsed = _get_date_range(from_date, to_date)

    # Base query — user-scoped through properties
    base = (
        db.query(Transaction)
        .join(Property)
        .filter(
            Property.user_id == user_id,
            Property.archived_at.is_(None),
            Transaction.transaction_date >= from_date_parsed,
            Transaction.transaction_date <= to_date_parsed,
        )
    )
    if property_id:
        base = base.filter(Transaction.property_id == property_id)

    txns = base.order_by(Transaction.transaction_date.desc()).all()

    # Aggregate by category
    income_by_category: dict[str, float] = {}
    expense_by_category: dict[str, float] = {}
    total_income = 0.0
    total_expenses = 0.0

    for txn in txns:
        cat = (
            txn.category.value
            if hasattr(txn.category, "value")
            else str(txn.category)
        )
        amt = float(txn.amount)
        if txn.transaction_type == TransactionType.INCOME:
            income_by_category[cat] = income_by_category.get(cat, 0) + amt
            total_income += amt
        else:
            expense_by_category[cat] = expense_by_category.get(cat, 0) + amt
            total_expenses += amt

    # Include maintenance costs as expenses within the date range
    maint_base = (
        db.query(MaintenanceRecord)
        .join(Property)
        .filter(
            Property.user_id == user_id,
            Property.archived_at.is_(None),
            MaintenanceRecord.date >= from_date_parsed,
            MaintenanceRecord.date <= to_date_parsed,
            MaintenanceRecord.cost.isnot(None),
        )
    )
    if property_id:
        maint_base = maint_base.filter(
            MaintenanceRecord.property_id == property_id
        )

    total_maintenance_cost = 0.0
    for rec in maint_base.all():
        cost = float(rec.cost or 0)
        total_maintenance_cost += cost

    if total_maintenance_cost > 0:
        expense_by_category["Maintenance"] = (
            expense_by_category.get("Maintenance", 0) + total_maintenance_cost
        )
        total_expenses += total_maintenance_cost

    gross_profit = total_income - total_expenses

    return {
        "from_date": str(from_date_parsed),
        "to_date": str(to_date_parsed),
        "total_income": round(total_income, 2),
        "total_expenses": round(total_expenses, 2),
        "gross_profit": round(gross_profit, 2),
        "profit_margin_percentage": (
            round((gross_profit / total_income) * 100, 2)
            if total_income > 0
            else 0
        ),
        "income_by_category": [
            {"category": k, "amount": round(v, 2)}
            for k, v in sorted(
                income_by_category.items(), key=lambda x: -x[1]
            )
        ],
        "expense_by_category": [
            {"category": k, "amount": round(v, 2)}
            for k, v in sorted(
                expense_by_category.items(), key=lambda x: -x[1]
            )
        ],
        "transaction_count": len(txns),
        "maintenance_included": round(total_maintenance_cost, 2) > 0,
        "total_maintenance_cost": round(total_maintenance_cost, 2),
    }


def get_cash_flow(
    db: Session,
    user_id: uuid.UUID,
    from_date: str | None = None,
    to_date: str | None = None,
    property_id: uuid.UUID | None = None,
) -> dict[str, Any]:
    """Monthly cash flow data for charting.

    Returns income, expenses, and net per month within the date range.
    """
    from_date_parsed, to_date_parsed = _get_date_range(from_date, to_date)

    base = (
        db.query(Transaction)
        .join(Property)
        .filter(
            Property.user_id == user_id,
            Property.archived_at.is_(None),
            Transaction.transaction_date >= from_date_parsed,
            Transaction.transaction_date <= to_date_parsed,
        )
    )
    if property_id:
        base = base.filter(Transaction.property_id == property_id)

    txns = base.all()

    # Bucket by year-month
    monthly: dict[str, dict[str, float]] = {}
    for txn in txns:
        key = txn.transaction_date.strftime("%Y-%m")
        entry = monthly.setdefault(key, {"income": 0.0, "expenses": 0.0})
        amt = float(txn.amount)
        if txn.transaction_type == TransactionType.INCOME:
            entry["income"] += amt
        else:
            entry["expenses"] += amt

    # Fill in missing months between from/to
    monthly_data: list[dict[str, Any]] = []
    current = date(from_date_parsed.year, from_date_parsed.month, 1)
    while current <= to_date_parsed:
        key = current.strftime("%Y-%m")
        entry = monthly.get(key, {"income": 0.0, "expenses": 0.0})
        monthly_data.append({
            "month": key,
            "label": current.strftime("%b %Y"),
            "income": round(entry["income"], 2),
            "expenses": round(entry["expenses"], 2),
            "net": round(entry["income"] - entry["expenses"], 2),
        })
        # Advance by one month
        if current.month == 12:
            current = date(current.year + 1, 1, 1)
        else:
            current = date(current.year, current.month + 1, 1)

    totals = {"income": 0.0, "expenses": 0.0, "net": 0.0}
    for m in monthly_data:
        totals["income"] += m["income"]
        totals["expenses"] += m["expenses"]
        totals["net"] += m["net"]

    return {
        "from_date": str(from_date_parsed),
        "to_date": str(to_date_parsed),
        "monthly": monthly_data,
        "totals": {k: round(v, 2) for k, v in totals.items()},
        "months": len(monthly_data),
    }


def get_ytd(
    db: Session,
    user_id: uuid.UUID,
    property_id: uuid.UUID | None = None,
) -> dict[str, Any]:
    """Year-to-date summary vs prior year."""
    today = date.today()
    ytd_start = date(today.year, 1, 1)

    # Prior year range
    py_start = date(today.year - 1, 1, 1)
    py_end = date(today.year - 1, today.month, today.day)

    def _aggregate(from_d: date, to_d: date) -> dict[str, float]:
        base = (
            db.query(Transaction)
            .join(Property)
            .filter(
                Property.user_id == user_id,
                Property.archived_at.is_(None),
                Transaction.transaction_date >= from_d,
                Transaction.transaction_date <= to_d,
            )
        )
        if property_id:
            base = base.filter(Transaction.property_id == property_id)

        income = 0.0
        expenses = 0.0
        for txn in base.all():
            amt = float(txn.amount)
            if txn.transaction_type == TransactionType.INCOME:
                income += amt
            else:
                expenses += amt
        return {
            "income": round(income, 2),
            "expenses": round(expenses, 2),
            "net": round(income - expenses, 2),
        }

    current = _aggregate(ytd_start, today)
    prior = _aggregate(py_start, py_end)

    def _pct_change(current_val: float, prior_val: float) -> float:
        if prior_val == 0:
            return 0
        return round(
            (current_val - prior_val) / abs(prior_val) * 100, 2
        )

    return {
        "year": today.year,
        "prior_year": today.year - 1,
        "current": current,
        "prior": prior,
        "change": {
            "income": {
                "amount": round(current["income"] - prior["income"], 2),
                "percentage": _pct_change(
                    current["income"], prior["income"]
                ),
            },
            "expenses": {
                "amount": round(current["expenses"] - prior["expenses"], 2),
                "percentage": _pct_change(
                    current["expenses"], prior["expenses"]
                ),
            },
            "net": {
                "amount": round(current["net"] - prior["net"], 2),
                "percentage": _pct_change(
                    current["net"], prior["net"]
                ),
            },
        },
    }


def get_annual(
    db: Session,
    user_id: uuid.UUID,
    year: int | None = None,
    property_id: uuid.UUID | None = None,
) -> dict[str, Any]:
    """Full-year monthly P&L breakdown."""
    if year is None:
        year = date.today().year

    base = (
        db.query(Transaction)
        .join(Property)
        .filter(
            Property.user_id == user_id,
            Property.archived_at.is_(None),
            extract("year", Transaction.transaction_date) == year,
        )
    )
    if property_id:
        base = base.filter(Transaction.property_id == property_id)

    txns = base.all()

    # Bucket by month
    monthly_raw: dict[int, dict[str, Any]] = {}
    for txn in txns:
        m = txn.transaction_date.month
        entry = monthly_raw.setdefault(
            m,
            {
                "income": 0.0,
                "expenses": 0.0,
                "income_by_category": {},
                "expense_by_category": {},
                "count": 0,
            },
        )
        cat = (
            txn.category.value
            if hasattr(txn.category, "value")
            else str(txn.category)
        )
        amt = float(txn.amount)
        if txn.transaction_type == TransactionType.INCOME:
            entry["income"] += amt
            entry["income_by_category"][cat] = (
                entry["income_by_category"].get(cat, 0) + amt
            )
        else:
            entry["expenses"] += amt
            entry["expense_by_category"][cat] = (
                entry["expense_by_category"].get(cat, 0) + amt
            )
        entry["count"] += 1

    month_names = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ]
    monthly_data: list[dict[str, Any]] = []
    year_total_income = 0.0
    year_total_expenses = 0.0

    for i in range(12):
        m = i + 1
        default = {
            "income": 0.0,
            "expenses": 0.0,
            "income_by_category": {},
            "expense_by_category": {},
            "count": 0,
        }
        entry = monthly_raw.get(m, default)
        net = round(entry["income"] - entry["expenses"], 2)
        monthly_data.append({
            "month": m,
            "label": month_names[i],
            "income": round(entry["income"], 2),
            "expenses": round(entry["expenses"], 2),
            "net": net,
            "transaction_count": entry["count"],
            "income_by_category": [
                {"category": k, "amount": round(v, 2)}
                for k, v in sorted(
                    entry["income_by_category"].items(),
                    key=lambda x: -x[1],
                )
            ],
            "expense_by_category": [
                {"category": k, "amount": round(v, 2)}
                for k, v in sorted(
                    entry["expense_by_category"].items(),
                    key=lambda x: -x[1],
                )
            ],
        })
        year_total_income += entry["income"]
        year_total_expenses += entry["expenses"]

    return {
        "year": year,
        "total_income": round(year_total_income, 2),
        "total_expenses": round(year_total_expenses, 2),
        "net_income": round(year_total_income - year_total_expenses, 2),
        "monthly": monthly_data,
    }
