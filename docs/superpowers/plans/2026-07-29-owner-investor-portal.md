# Owner/Investor Portal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add role-based access so investors see only their assigned properties, P&L, and documents — while admins have full control.

**Architecture:** Introduce a `role` column on User + a `property_investors` many-to-many table. Scope all existing dashboard/property queries by role. Add admin-only endpoints for investor CRUD. Use a simplified sidebar and read-only property views for investors.

**Tech Stack:** Python 3.14 / FastAPI / SQLAlchemy 2.0 / SQLite (dev) + PostgreSQL (prod), Next.js 14 / React Query / TypeScript

## Global Constraints

- `role` defaults to `"admin"` for existing users (zero breakage)
- JWT payload must include `"role"` claim
- Every data access change must check both `Property.user_id` (admin) and `PropertyInvestor.user_id` (investor)
- New auto-migration in `api/index.py` must use the existing `_migrate_add_column` pattern + `Base.metadata.create_all`
- Investor frontend must hide: Add Property button, Calendar, Transactions, Contacts, Tasks nav items
- All existing tests must continue to pass

---

### Task 1: Backend Model & Auth Changes

**Files:**
- Create: `backend/models/property_investor.py`
- Modify: `backend/models/user.py` — add `role` column
- Modify: `backend/database.py` — import new model
- Modify: `backend/schemas/auth.py` — add `role` to UserResponse
- Modify: `backend/services/auth_service.py` — include `role` in JWT + response
- Modify: `backend/routers/auth.py` — verify role flows through

**Interfaces:**
- Produces: User.role column, PropertyInvestor model, JWT with role claim, UserResponse with role

- [ ] **Step 1: Add `role` column to User model**

In `backend/models/user.py`, add after `is_admin`:
```python
role = Column(String(20), default="admin", nullable=False)
```

- [ ] **Step 2: Create PropertyInvestor model**

Write `backend/models/property_investor.py`:
```python
import uuid
from sqlalchemy import Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from backend.database import Base


class PropertyInvestor(Base):
    __tablename__ = "property_investors"

    property_id = Column(
        UUID(as_uuid=True),
        ForeignKey("properties.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
```

- [ ] **Step 3: Add `role` to auth schema**

In `backend/schemas/auth.py`, add to `UserResponse`:
```python
role: str = "admin"
```

- [ ] **Step 4: Include `role` in JWT payload**

In `backend/services/auth_service.py` `_generate_tokens`, add `"role": str(user.role)` to access and refresh token payloads. Also add `"role": user.role` to the user response dicts in `register` and `login`.

- [ ] **Step 5: Verify existing tests pass**

```bash
cd /c/dev/homebase && python -m pytest tests/ -v
```

- [ ] **Step 6: Commit**

```bash
cd /c/dev/homebase && git add backend/models/user.py backend/models/property_investor.py backend/database.py backend/schemas/ backend/services/ backend/routers/
git commit -m "feat: add role column to User and PropertyInvestor model"
```

---

### Task 2: Dashboard Data Scoping

**Files:**
- Modify: `backend/services/dashboard_service.py`
- Modify: `backend/routers/dashboard.py`

**Interfaces:**
- Consumes: User.role, PropertyInvestor model
- Produces: get_dashboard_summary(db, user) and get_properties_list(db, user) — both filter by role

- [ ] **Step 1: Update dashboard router to pass current_user**

Add `current_user: User = Depends(get_current_user)` to both endpoints in `backend/routers/dashboard.py`. Pass `current_user` to service calls.

- [ ] **Step 2: Update dashboard service to filter by role**

In `backend/services/dashboard_service.py`, add `user` parameter to both functions. Replace property queries with role-based filtering:

```python
if user.role == "investor":
    properties = db.query(Property).join(PropertyInvestor).filter(
        PropertyInvestor.user_id == user.id,
        Property.archived_at.is_(None),
    ).all()
else:
    properties = db.query(Property).filter(
        Property.user_id == user.id,
        Property.archived_at.is_(None),
    ).all()
```

Also scope tasks/mortgage/insurance queries the same way for investors (join through PropertyInvestor).

- [ ] **Step 3: Run tests**

```bash
cd /c/dev/homebase && python -m pytest tests/ -v
```

- [ ] **Step 4: Commit**

```bash
cd /c/dev/homebase && git add backend/routers/dashboard.py backend/services/dashboard_service.py
git commit -m "feat: scope dashboard data by user role"
```

---

### Task 3: Admin Investor Management API

**Files:**
- Create: `backend/routers/admin.py`
- Create: `backend/schemas/admin.py`
- Modify: `backend/routers/router.py`

**Interfaces:**
- Produces: Full CRUD for investors scoped to admin role

- [ ] **Step 1: Create admin schemas**

Write `backend/schemas/admin.py`:
```python
import uuid
from pydantic import BaseModel


class InvestorCreate(BaseModel):
    name: str
    email: str
    property_ids: list[uuid.UUID] = []


class InvestorUpdate(BaseModel):
    name: str | None = None
    property_ids: list[uuid.UUID] | None = None


class InvestorResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    role: str
    property_ids: list[uuid.UUID] = []
    temp_password: str | None = None

    model_config = {"from_attributes": True}
```

- [ ] **Step 2: Create admin router**

Write `backend/routers/admin.py` with endpoints:
- `GET /api/v1/admin/investors` — list investors with property assignments
- `POST /api/v1/admin/investors` — create investor, gen temp password, assign properties
- `PATCH /api/v1/admin/investors/:id` — update name/properties
- `POST /api/v1/admin/investors/:id/reset-password` — new temp password
- `DELETE /api/v1/admin/investors/:id` — remove investor + assignments

All gated by `_require_admin(current_user)` helper that checks `current_user.role != "admin"`.

- [ ] **Step 3: Register admin router**

In `backend/routers/router.py`, add import and `include_router`.

- [ ] **Step 4: Verify**

```bash
cd /c/dev/homebase && python -c "from backend.main import app; print('OK')"
```

- [ ] **Step 5: Commit**

```bash
cd /c/dev/homebase && git add backend/routers/admin.py backend/schemas/admin.py backend/routers/router.py
git commit -m "feat: add admin investor management API"
```

---

### Task 4: Production Auto-Migration

**Files:**
- Modify: `api/index.py`

Add `PropertyInvestor` to the imports, and add role column auto-migration:
```python
_migrate_add_column(engine, "users", "role", "VARCHAR(20)")
with engine.connect() as conn:
    conn.execute(text("UPDATE users SET role = 'admin' WHERE role IS NULL"))
    conn.commit()
```

Verify: `python -c "import api.index; print('OK')"`

Commit: `git add api/index.py && git commit -m "feat: add role column auto-migration for production"`

---

### Task 5: Frontend Auth Types & API Client

**Files:**
- Modify: `lib/api/auth.ts` — add `role: string` to User interface
- Create: `lib/api/admin.ts` — admin API client with Investor types
- Create: `lib/hooks/useAdmin.ts` — React Query hooks for investors

Commit: `git add lib/api/ lib/hooks/ && git commit -m "feat: add role to frontend User type and admin API client"`

---

### Task 6: Admin Settings — Investors Tab

**Files:**
- Modify: `app/(dashboard)/settings/page.tsx`

Add "Investors" tab with full CRUD UI:
- Tab visible only when `user.role === "admin"`
- Add Investor form (name, email, property checkboxes)
- Edits investor name/properties
- Reset password button
- Remove with confirm dialog
- Show temp password once after creation/reset

Verify: `npm run build`

Commit: `git add app/\(dashboard\)/settings/page.tsx && git commit -m "feat: add Investors management tab to Settings page"`

---

### Task 7: Role-Based Sidebar

**Files:**
- Modify: `components/layout/Sidebar.tsx`
- Modify: `app/(dashboard)/layout.tsx`

Add `role` prop to Sidebar, define `INVESTOR_NAV_SECTIONS` (Dashboard, Properties, Documents, Reports, Settings). Pass `user?.role` from layout.

Verify: `npm run build`

Commit: related files.

---

### Task 8: Tests

**Files:**
- Create: `tests/test_investor_portal.py`

Tests to write:
- Admin can create investor with property assignments
- Duplicate email returns 409
- Non-admin gets 403 for admin endpoints
- Investor dashboard shows only assigned properties
- Investor gets 404 for unassigned property
- Admin can reset investor password
- Admin can delete investor

Verify: `pytest tests/test_investor_portal.py -v && pytest tests/ -v`

Commit: `git add tests/test_investor_portal.py && git commit -m "test: add investor portal tests"`

---

### Verification

1. `pytest tests/ -v` — all pass
2. `ruff check backend/` — clean
3. `npm run build` — compiles
4. Manual: admin creates investor → investor logs in → sees only their properties, simplified sidebar
