"""Financial report aggregation service — P&L, cash flow, YTD, and annual reports.

Aggregations run in SQL (GROUP BY / SUM) — the previous version pulled
every transaction into Python, which is O(N) rows transferred per report
request. Only the (small) grouped result set is iterated now.
"""

from datetime import date
from typing import Any

from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from backend.models.maintenance_record import MaintenanceRecord
from backend.models.property import Property
from backend.models.transaction import Transaction, TransactionType
from backend.models.user import User


def _get_date_range(
    from_date: date | None,
    to_date: date | None,
) -> tuple[date, date]:
    """Resolve from/to dates, defaulting to current year to-date.

    Dates arrive already parsed (FastAPI `date` query params → 422 on
    invalid input); this only applies defaults.
    """
    today = date.today()
    parsed_from = from_date or date(today.year, 1, 1)
    parsed_to = to_date or today
    return parsed_from, parsed_to


def _scoped_txn_query(db: Session, user: User, from_d: date, to_d: date, property_id=None):
    """Transaction query scoped to what this user can see.

    Investors see transactions of their linked properties; everyone else
    sees their own. Used by every report — keeps the scoping in one place.
    """
    from backend.models.property_investor import PropertyInvestor

    q = db.query(Transaction).join(Property)
    if user.role == "investor":
        q = q.join(PropertyInvestor, PropertyInvestor.property_id == Property.id).filter(
            PropertyInvestor.user_id == user.id,
            Property.archived_at.is_(None),
        )
    else:
        q = q.filter(
            Property.user_id == user.id,
            Property.archived_at.is_(None),
        )
    q = q.filter(
        Transaction.transaction_date >= from_d,
        Transaction.transaction_date <= to_d,
    )
    if property_id:
        q = q.filter(Transaction.property_id == property_id)
    return q


def _scoped_maint_query(db: Session, user: User, from_d: date, to_d: date, property_id=None):
    """Maintenance-cost query with the same scoping as transactions."""
    from backend.models.property_investor import PropertyInvestor

    q = db.query(MaintenanceRecord).join(Property)
    if user.role == "investor":
        q = q.join(PropertyInvestor, PropertyInvestor.property_id == Property.id).filter(
            PropertyInvestor.user_id == user.id,
            Property.archived_at.is_(None),
        )
    else:
        q = q.filter(
            Property.user_id == user.id,
            Property.archived_at.is_(None),
        )
    q = q.filter(
        MaintenanceRecord.date >= from_d,
        MaintenanceRecord.date <= to_d,
        MaintenanceRecord.cost.isnot(None),
    )
    if property_id:
        q = q.filter(MaintenanceRecord.property_id == property_id)
    return q


def get_pnl(
    db: Session,
    user: User,
    from_date: date | None = None,
    to_date: date | None = None,
    property_id: Any = None,
) -> dict[str, Any]:
    """Profit & Loss statement within a date range.

    Groups transactions by income/expense category, includes maintenance
    costs as expenses, and returns net income. Grouping happens in SQL.
    """
    from_date_parsed, to_date_parsed = _get_date_range(from_date, to_date)

    # SQL GROUP BY (category, type) — bounded result set regardless of
    # how many transactions exist in the range
    rows = (
        _scoped_txn_query(db, user, from_date_parsed, to_date_parsed, property_id)
        .with_entities(
            Transaction.category,
            Transaction.transaction_type,
            func.sum(Transaction.amount),
        )
        .group_by(Transaction.category, Transaction.transaction_type)
        .all()
    )

    income_by_category: dict[str, float] = {}
    expense_by_category: dict[str, float] = {}
    total_income = 0.0
    total_expenses = 0.0

    for cat, ttype, amt in rows:
        cat_label = cat.value if hasattr(cat, "value") else str(cat)
        amount = float(amt or 0)
        if ttype == TransactionType.INCOME:
            income_by_category[cat_label] = income_by_category.get(cat_label, 0) + amount
            total_income += amount
        else:
            expense_by_category[cat_label] = expense_by_category.get(cat_label, 0) + amount
            total_expenses += amount

    # Maintenance costs as expenses within the date range (SQL SUM)
    total_maintenance_cost = float(
        _scoped_maint_query(db, user, from_date_parsed, to_date_parsed, property_id)
        .with_entities(func.coalesce(func.sum(MaintenanceRecord.cost), 0))
        .scalar()
        or 0
    )

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
        "transaction_count": (
            _scoped_txn_query(db, user, from_date_parsed, to_date_parsed, property_id)
            .with_entities(func.count(Transaction.id))
            .scalar()
            or 0
        ),
        "maintenance_included": round(total_maintenance_cost, 2) > 0,
        "total_maintenance_cost": round(total_maintenance_cost, 2),
    }


def get_cash_flow(
    db: Session,
    user: User,
    from_date: date | None = None,
    to_date: date | None = None,
    property_id: Any = None,
) -> dict[str, Any]:
    """Monthly cash flow data for charting.

    Returns income, expenses, and net per month within the date range.
    Months are bucketed in SQL (extract works on both SQLite and Postgres).
    """
    from_date_parsed, to_date_parsed = _get_date_range(from_date, to_date)

    rows = (
        _scoped_txn_query(db, user, from_date_parsed, to_date_parsed, property_id)
        .with_entities(
            extract("year", Transaction.transaction_date),
            extract("month", Transaction.transaction_date),
            Transaction.transaction_type,
            func.sum(Transaction.amount),
        )
        .group_by(
            extract("year", Transaction.transaction_date),
            extract("month", Transaction.transaction_date),
            Transaction.transaction_type,
        )
        .all()
    )

    # Bucket by year-month
    monthly: dict[str, dict[str, float]] = {}
    for y, m, ttype, amt in rows:
        key = f"{int(y):04d}-{int(m):02d}"
        entry = monthly.setdefault(key, {"income": 0.0, "expenses": 0.0})
        amount = float(amt or 0)
        if ttype == TransactionType.INCOME:
            entry["income"] += amount
        else:
            entry["expenses"] += amount

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
    user: User,
    property_id: Any = None,
) -> dict[str, Any]:
    """Year-to-date summary vs prior year."""
    today = date.today()
    ytd_start = date(today.year, 1, 1)

    # Prior year range
    py_start = date(today.year - 1, 1, 1)
    py_end = date(today.year - 1, today.month, today.day)

    def _aggregate(from_d: date, to_d: date) -> dict[str, float]:
        rows = (
            _scoped_txn_query(db, user, from_d, to_d, property_id)
            .with_entities(Transaction.transaction_type, func.sum(Transaction.amount))
            .group_by(Transaction.transaction_type)
            .all()
        )
        income = 0.0
        expenses = 0.0
        for ttype, amt in rows:
            amount = float(amt or 0)
            if ttype == TransactionType.INCOME:
                income += amount
            else:
                expenses += amount
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
    user: User,
    year: int | None = None,
    property_id: Any = None,
) -> dict[str, Any]:
    """Full-year monthly P&L breakdown (SQL GROUP BY month/category/type)."""
    if year is None:
        year = date.today().year

    q = _scoped_txn_query(
        db, user, date(year, 1, 1), date(year, 12, 31), property_id
    ).filter(extract("year", Transaction.transaction_date) == year)

    rows = (
        q.with_entities(
            extract("month", Transaction.transaction_date),
            Transaction.category,
            Transaction.transaction_type,
            func.sum(Transaction.amount),
            func.count(Transaction.id),
        )
        .group_by(
            extract("month", Transaction.transaction_date),
            Transaction.category,
            Transaction.transaction_type,
        )
        .all()
    )

    # Bucket by month — bounded result set (12 months × categories)
    monthly_raw: dict[int, dict[str, Any]] = {}
    for m, cat, ttype, amt, cnt in rows:
        entry = monthly_raw.setdefault(
            int(m),
            {
                "income": 0.0,
                "expenses": 0.0,
                "income_by_category": {},
                "expense_by_category": {},
                "count": 0,
            },
        )
        cat_label = cat.value if hasattr(cat, "value") else str(cat)
        amount = float(amt or 0)
        if ttype == TransactionType.INCOME:
            entry["income"] += amount
            entry["income_by_category"][cat_label] = entry["income_by_category"].get(cat_label, 0) + amount
        else:
            entry["expenses"] += amount
            entry["expense_by_category"][cat_label] = entry["expense_by_category"].get(cat_label, 0) + amount
        entry["count"] += int(cnt or 0)

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
