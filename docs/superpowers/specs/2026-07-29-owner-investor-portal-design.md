# Owner/Investor Portal — Design Spec

**Date:** 2026-07-29
**Status:** Approved design, awaiting implementation

## Overview

Add role-based access to HomeBase so property investors see only their own properties, P&L, and documents — while admins maintain full control. Mirrors the Buildium owner portal model: investors are invited, assigned to specific properties, and get a simplified dashboard.

---

## 1. User Model & Role System

### Role column (additive)

Add to `backend/models/user.py`:
```python
role = Column(String(20), default="admin", nullable=False)
```

Three roles:

| Role | Access |
|------|--------|
| `admin` | Full access — all properties, manage investors, all settings |
| `manager` | Same as admin but cannot manage users (reserved for future) |
| `investor` | Sees only assigned properties + their P&L, documents, tasks |

Existing users default to `"admin"` — no breakage. New `api/index.py` auto-migration adds the column to production.

### Property-Investor mapping table

New file `backend/models/property_investor.py`:
```python
class PropertyInvestor(Base):
    __tablename__ = "property_investors"
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
```

This is a standard many-to-many association table. An investor owns 1+ properties, a property has 1+ investors.

### JWT changes

Include `role` in the JWT payload so permission checks are fast (no DB round-trip):
```python
{
  "sub": "<user-uuid>",
  "type": "access",
  "role": "investor"
}
```

### Frontend User type

Add `role` to `lib/api/auth.ts`'s `User` interface, and return it from `GET /auth/me`.

---

## 2. Data Scoping

### Dashboard service fix

`backend/services/dashboard_service.py` — both `get_dashboard_summary` and `get_properties_list` now accept a `user` (User object) parameter and filter by role:

- **investor**: Query properties via `PropertyInvestor.user_id == user.id`
- **admin/manager**: Query properties via `Property.user_id == user.id`

### Other scoped endpoints

| Endpoint | Current | Fixed |
|----------|---------|-------|
| `GET /dashboard/summary` | Global | Scoped by role |
| `GET /dashboard/properties` | Global | Scoped by role |
| `GET /properties` | Already scoped (user_id) | Also checks investor assignments |
| `GET /reports/pnl` | Already scoped (user_id) | Also checks investor assignments |
| `GET /tasks` | Already scoped (user_id) | Also checks investor assignments |
| `GET /documents` | Already scoped (property_id) | Also checks investor assignments |

Pattern for extending existing scoped services: check `PropertyInvestor` table if the user is an investor.

---

## 3. Admin — Investor Management

### New router: `backend/routers/admin.py`

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/admin/investors` | List all investors with assigned properties |
| `POST /api/v1/admin/investors` | Create investor (name, email, properties) — returns temp password |
| `PATCH /api/v1/admin/investors/:id` | Update name, properties assignment |
| `POST /api/v1/admin/investors/:id/reset-password` | Generate new temp password |
| `DELETE /api/v1/admin/investors/:id` | Remove investor access |

All endpoints gated by `current_user.role == "admin"`.

### Frontend: Settings > Investors tab

New tab in the Settings page (`app/(dashboard)/settings/page.tsx`):
- List all investors with their assigned properties
- "Add Investor" button → modal with name, email, property checkboxes
- Shows generated temp password once (admin shares it with investor)
- Edit/Reset password/Remove actions

---

## 4. Investor Frontend

### Simplified sidebar

Investors see a reduced set of navigation items:

| Section | Items |
|---------|-------|
| Main | Dashboard, Properties |
| Reports | Documents, Reports |
| Account | Settings |

No Calendar, Transactions, Contacts, or Tasks & Reminders.

### Investor dashboard

Same layout as current dashboard but:
- Data is scoped to their assigned properties
- Top-right "Add Property" button is hidden
- No "Properties by Status" donut chart (too much data for a small number of properties)
- "Cash Flow This Month" shows only their properties' transactions

### Property page

Same property detail page, but:
- No Edit/Delete controls (read-only)
- Can view documents, P&L, maintenance history

---

## 5. Error & Edge Cases

| Scenario | Behavior |
|----------|----------|
| Investor with 0 properties | Empty state: "You haven't been assigned any properties yet" |
| Direct URL to unassigned property | 404 — already handled by existing `get_property` scoping |
| Investor reassigned/deassigned | Next page load reflects changes |
| Investor tries POST/PATCH/DELETE on property | 403 if role isn't admin — add guard `require_admin` dependency |
| Investor visits `/settings` | Profile tab only (no Security, Notifications, Appearance? Actually keep appearance — harmless) |

---

## 6. Files to Create

| File | Purpose |
|------|---------|
| `backend/models/property_investor.py` | Many-to-many association table |
| `backend/routers/admin.py` | Investor CRUD endpoints |
| `backend/schemas/admin.py` | Pydantic schemas for investor requests/responses |

## 7. Files to Modify

| File | Change |
|------|--------|
| `backend/models/user.py` | Add `role` column |
| `backend/database.py` | Import `PropertyInvestor` model |
| `backend/services/dashboard_service.py` | Add role-based scoping to both functions |
| `backend/routers/dashboard.py` | Pass `current_user` to service |
| `backend/routers/auth.py` | Return `role` in register + login response |
| `backend/services/auth_service.py` | Include `role` in JWT payload |
| `backend/schemas/auth.py` | Add `role` to `UserResponse` |
| `backend/routers/router.py` | Register `admin_router` |
| `api/index.py` | Import `PropertyInvestor`, add `role` auto-migration |
| `lib/api/auth.ts` | Add `role` to `User` interface |
| `lib/api/admin.ts` | **New frontend file** — admin API client |
| `lib/hooks/useAdmin.ts` | **New frontend file** — admin React Query hooks |
| `components/layout/Sidebar.tsx` | Accept `role`, render different nav items |
| `app/(dashboard)/layout.tsx` | Pass `user.role` to Sidebar |
| `app/(dashboard)/settings/page.tsx` | Add "Investors" tab (admin only) |
| `middleware.ts` | No change needed — cookie presence check is sufficient |

## 8. Testing

| Test file | What it covers |
|-----------|---------------|
| `tests/test_investor_portal.py` | **New** — Full investor flow: create investor, assign properties, verify scoped access, admin-only gate |
| `tests/test_dashboard_scoping.py` | **New** — Dashboard returns correct data for admin vs investor |

## 9. Verification

1. `pytest tests/ -v` — all tests pass (existing + new)
2. `ruff check backend/` — no lint issues
3. `npm run build` — frontend compiles
4. Manual: log in as admin → Settings → Investors → add investor → log out → log in as investor → verify only their properties show
