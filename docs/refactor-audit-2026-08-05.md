# HomeBase Production-Grade Refactor Audit — 2026-08-05

Comprehensive audit of backend (FastAPI), frontend (Next.js 14), and global config.
81 verified findings: **2 CRITICAL / 18 HIGH / 41 MEDIUM / 20 LOW** (after dedup across 3 audit tracks).

---

## Phase 0 — Security-critical (do first, smallest surface)

| # | Severity | Issue | Location | Fix |
|---|----------|-------|----------|-----|
| 1 | CRITICAL | Self-registration creates `admin` users (`role` default `"admin"`, register never sets it; `api/index.py` cold-start forces `role='admin'` on every boot) | `backend/models/user.py:19`, `backend/services/auth_service.py:38-44`, `api/index.py:39-41` | Default role to non-privileged; remove cold-start role UPDATE |
| 2 | CRITICAL | JWT `secret_key` + `cron_secret` ship with publicly-known defaults, no startup validation → forged tokens, seed/cron takeover | `backend/config.py:22,31`, `backend/routers/cron.py:17`, `backend/routers/seed.py:926` | Fail fast at boot in production when defaults/empty |
| 3 | HIGH | CORS echoes credentialed headers to any origin containing "localhost" (substring match); real prod origin gets no CORS | `backend/main.py:26-39` | Exact-origin allowlist; no substring matching |
| 4 | HIGH | `GET /admin/investors/suggest-properties` 500s on every request — tuple bound to raw `IN :eids` without `expanding=True` | `backend/routers/admin.py:142-145` | ORM `IN` with list or `bindparam(expanding=True)` |
| 5 | HIGH | Dashboard summary runs task/mortgage/insurance queries with **no property filter** when user has zero properties → cross-tenant leak + full scans | `backend/services/dashboard_service.py:89-98,123-134` | Empty aggregates when `property_ids` empty; unconditional `IN` |
| 6 | HIGH | Ownership entities are global, no user scoping — any user lists/reads every entity (EIN disclosure); non-investors can PATCH/DELETE any | `backend/routers/ownership.py:57-153` | Add `user_id` scoping or admin-only read/mutate |
| 7 | HIGH | Avatar upload trusts client Content-Type + filename extension → `.html`/`.svg` served same-origin = stored XSS; also no size limit | `backend/routers/auth.py:53-67`, `backend/main.py:66-68` | Whitelist extension↔MIME pairs; enforce size |
| 8 | MEDIUM | Auth cookies lack `secure=True` | `backend/routers/auth.py:79-94` | `secure=environment == "production"` |
| 9 | MEDIUM | No rate limiting on `/login` `/register` `/refresh` (brute force + account enumeration via 409) | `backend/routers/auth.py:98-115` | slowapi limits on auth endpoints |
| 10 | MEDIUM | Seed secret passed as query param (access logs) | `backend/routers/seed.py:925-926` | Header auth like cron.py |

## Phase 1 — Broken in prod / user-visible crashes

| # | Severity | Issue | Location | Fix |
|---|----------|-------|----------|-----|
| 11 | HIGH | Ownership router binds raw `uuid.UUID` objects in ~17 `text()` queries — local dev (SQLite) 500s everywhere; latent on any non-PG db | `backend/routers/ownership.py` (138-139, 168-171, 224-243, 297-320, 339-346, 381-395, 421-424, 440-442, 464-467, 488-498, 507-519, 530-557, 576-578) | `_hex()` normalize pattern from payments.py |
| 12 | HIGH | Reports 500 on malformed dates (`from_date=2026-13-99`) — untyped str parsed with `date.fromisoformat` | `backend/services/report_service.py:21-29` | `date`-typed Query params (FastAPI 422) |
| 13 | HIGH | Payment confirm race: check-then-act cycle guard, no lock/unique constraint → double-confirm inserts duplicate rows | `backend/routers/payments.py:140-196` | `SELECT ... FOR UPDATE` or unique `(source_id, due_date)` |
| 14 | HIGH | CSV import: one bad row aborts the transaction on PG → every subsequent row fails, final 500; per-row duplicate check = 1 query/row; unparsable prices silently become `$0` | `backend/routers/csv_import.py:123,154-159,187-203` | SAVEPOINT per row, preloaded dup-check set, skip+report bad prices |
| 15 | HIGH | Avatar uploads + document local-storage fallback write to repo-root `uploads/` — serverless FS is read-only → avatar always 500s in prod; `StaticFiles` mount at import can crash cold start | `backend/routers/auth.py:57-67`, `backend/services/document_storage_service.py:97-99`, `backend/main.py:66-68` | Supabase Storage only; lazy dir creation; /tmp |
| 16 | HIGH | Document download serves `FileResponse` from local path while uploads go to Supabase Storage → every download 404s in prod; signed-URL path never used | `backend/routers/documents.py:59-63`, `backend/services/document_service.py:127-131` | Return signed URL when supabase configured |
| 17 | MEDIUM | `property_modules` create endpoints take untyped `dict` — `POST tenants {}` or `{"annual_tax":"abc"}` → 500 not 422 | `backend/routers/property_modules.py:69-138` | Pydantic schemas per module |
| 18 | MEDIUM | `create_investor`/`update_investor` don't validate `property_ids` exist → FK IntegrityError 500 | `backend/routers/admin.py:214-220,265-266` | Validate → 400 |
| 19 | MEDIUM | `contact_service` `uuid.UUID(id)` on untyped strings → ValueError 500 | `backend/services/contact_service.py:47` | `list[uuid.UUID]` in schema |
| 20 | MEDIUM | Removing a property's ownership entity deletes ALL investor links incl. manually granted ones | `backend/routers/ownership.py:576-579` | Delete only entity-derived links |
| 21 | MEDIUM | `record_view` verifies property existence but not ownership — enumerate/view any property | `backend/routers/recently_viewed.py:61-66` | Ownership/investor check |

## Phase 2 — Performance

| # | Severity | Issue | Location | Fix |
|---|----------|-------|----------|-----|
| 22 | MEDIUM | `list_all_transactions` 2 queries per row (up to 100/request) | `backend/routers/transactions.py:28-30` | joinedload + batch user lookup |
| 23 | MEDIUM | Ownership `portal_access` does 1 query per investor (3 endpoints) | `backend/routers/ownership.py:190-194,464-467,554-557` | Single `email IN (...)` batch |
| 24 | MEDIUM | All report/dashboard aggregations pull full transaction rowsets into Python and sum in loops | `backend/services/report_service.py:62,169,245,317`, `backend/services/transaction_service.py:81` | SQL `GROUP BY` / `func.sum` |
| 25 | MEDIUM | `record_view` loads all recently-viewed rows to trim | `backend/routers/recently_viewed.py:79-86` | One DELETE with subselect |
| 26 | MEDIUM | Payment history `.limit(50)` silent truncation, no pagination | `backend/routers/payments.py:251` | offset/limit params + `has_more` |
| 27 | LOW | `get_task`/`list_tasks` commit write-on-read | `backend/services/task_service.py:77-78,107-108` | Compute without persisting |

## Phase 3 — Schema & data integrity

| # | Severity | Issue | Location | Fix |
|---|----------|-------|----------|-----|
| 28 | HIGH | Alembic migrations cover 8 of 17 tables — 9 never migrated (investors, maintenance_records, ownership_*, payment_history, property_investors, property_taxes, recently_viewed, tenants, + role/avatar_url/ownership_entity_id/is_favorite/payment_frequency); tests use `create_all` so CI can't detect drift | `backend/alembic/versions/`, `tests/conftest.py:30-34` | Author full migration set; conftest runs alembic |
| 29 | HIGH | Prod schema held together by cold-start DDL hacks (create_all + 12 raw ALTERs, silently skipped by pooler) | `api/index.py:16-53` | Real migrations out-of-band; delete hack |
| 30 | MEDIUM | Concurrent mortgage/insurance create → two active rows (no partial unique index) | `backend/services/insurance_service.py:53-59`, `backend/services/mortgage_service.py:57-63` | Partial unique index or FOR UPDATE |
| 31 | MEDIUM | Ownership % >100 race (read-then-write total check) | `backend/routers/ownership.py:224-233` | FOR UPDATE on entity row |
| 32 | LOW | Invalid enum query params silently ignored → full unfiltered list | `backend/services/task_service.py:44-55`, `backend/services/property_service.py:46-54` | Raise 422 |

## Phase 4 — Frontend: fake data, styling, patterns

| # | Severity | Issue | Location | Fix |
|---|----------|-------|----------|-----|
| 33 | HIGH | Dashboard shows fabricated figures: hardcoded "+12% from last month"; cash-flow chart is a hand-drawn SVG with fake labels; Quick Summary cards always show "$0 / Not set up"; Settings "Save profile" is a fake `setTimeout`; notification prefs toggles persist nowhere | `app/(dashboard)/dashboard/page.tsx:79,133-138`, `app/(dashboard)/properties/[id]/page.tsx:146-173`, `app/(dashboard)/settings/page.tsx:76-81,229-271` | Compute from real data or remove; wire cards to hooks; real PATCH /auth/me; persist prefs |
| 34 | HIGH | Dark mode broken: hardcoded light-only hex (`#e8eaed`, `#8b8fa3`, `#eef2ff`, `#10b981`...) in dashboard, reports, settings; `PayPortalButton` brand-green arbitrary value; auth pages hardcode grays on dark navy layout | `app/(dashboard)/dashboard/page.tsx:92,134,138,158,182`, `app/(dashboard)/reports/page.tsx:184-193,247-254,284,355-427,490-550,587`, `app/(dashboard)/settings/page.tsx:112,133,218,244,261,265,288,302,448,547,558,601`, `components/shared/PayPortalButton.tsx:33`, `app/globals.css:67-68`, `app/(auth)/login/page.tsx:47,56,63` | Semantic tokens (`border-border`, `bg-muted`, `text-muted-foreground`, `bg-emerald-500/10` variants) |
| 35 | HIGH | Sidebar "Documents" links to `/documents` — no page exists → 404 | `lib/constants.ts:85`, `app/(dashboard)/documents/` (empty) | Add page or redirect |
| 36 | MEDIUM | Raw-fetch pages duplicating React Query hooks (no retry, silent `.catch`, stale caches): property overview, taxes, maintenance, tenants, transactions, Header notifications, Sidebar badge, DocumentManager, TransactionForm, useRecentlyViewed | `app/(dashboard)/properties/[id]/page.tsx:50-94`, `.../taxes/page.tsx`, `.../maintenance/page.tsx`, `.../tenants/page.tsx`, `app/(dashboard)/transactions/page.tsx:38-57`, `components/layout/Header.tsx:37-42,79-82`, `components/layout/Sidebar.tsx:73-78`, `components/documents/DocumentManager.tsx:53-67`, `components/transactions/TransactionForm.tsx:41-54`, `lib/hooks/useRecentlyViewed.ts:48-81` | Use existing hooks; create `lib/api/taxes.ts`/`maintenance.ts`/`tenants.ts` |
| 37 | MEDIUM | Pervasive `any` typing on dashboard/reports payloads (strict mode effectively off) | dashboard/page.tsx, reports/page.tsx, financials/page.tsx, properties/[id]/page.tsx, PropertyForm.tsx | Type from lib/api interfaces |
| 38 | MEDIUM | Silent-failure catches with zero user feedback (delete/upload/investor actions) | settings/page.tsx:95,393-425; mortgage/insurance/contacts delete; Header:41,82; Sidebar:77; overview page:66 | Surface error messages (taxes-page `msg` pattern) |
| 39 | MEDIUM | a11y: table rows navigate via `window.location.href` (no keyboard); `<label>` wrapping `<button role="switch">`; TaskList icon buttons no aria-label, delete without confirm; EditPropertySheet no dialog semantics | `app/(dashboard)/properties/page.tsx:160-161`, `settings/page.tsx:261-271`, `components/tasks/TaskList.tsx:90,110,114`, `components/properties/EditPropertySheet.tsx:41-80` | Link/role+keyboard, proper label/control, aria-labels + ActionsMenu confirm |
| 40 | LOW | Unused imports (Percent, ExternalLink, `use`); unused deps (date-fns, react-hook-form, zod, @hookform/resolvers, class-variance-authority); `useUpdateTransaction` dynamic import + wrong invalidation key | `app/(dashboard)/dashboard/page.tsx:15`, `properties/[id]/page.tsx:5`, `mortgage/page.tsx:3`, `package.json:14-29`, `lib/hooks/useTransactions.ts:29-39` | Remove; static import; fix query key |
| 41 | LOW | Ownership page `ownership!.entity!.name` crash risk; reminder without due_date renders as "due today" | `ownership/page.tsx:118-121`, `dashboard/page.tsx:95-99` | Guards |

## Phase 5 — Tooling & deps

| # | Severity | Issue | Location | Fix |
|---|----------|-------|----------|-----|
| 42 | HIGH | Every Makefile target broken (missing `backend/requirements/dev.txt`, `app.main` vs `backend.main`, tests at root not `backend/tests/`, DBs at root) | `Makefile:4-21` | Rewrite against real layout |
| 43 | HIGH | Duplicate pyproject/requirements sources of truth (root vs backend) — Vercel installs from backend one, root one drifts | root `pyproject.toml`, root `requirements.txt:1-12` | Delete root copies; backend/pyproject single source |
| 44 | MEDIUM | `npm test` runs vitest with no config and zero JS tests → fails CI | `package.json:11` | Remove or configure |
| 45 | MEDIUM | alembic.ini hardcoded URL; env.py imports 2 models only → autogenerate omits 9 tables | `alembic.ini:3`, `backend/alembic/env.py:16` | Read DATABASE_URL; import all models |
| 46 | MEDIUM | `.env*` gitignore swallows `.env.example` (never tracked); SUPABASE_* vars undocumented in example; `.env.production` is a masked pull artifact; `DEBUG=true` in examples turns on SQL echo if copied to prod | `.gitignore:40`, `.env.example`, `backend/config.py` | `!.env.example`; document all vars; DEBUG=false default |
| 47 | MEDIUM | `next.config.mjs` rewrites to localhost:8001 unconditional; `vercel.json` dest lacks leading slash; no route for `/uploads` | `next.config.mjs:3-9`, `vercel.json:7`, `backend/main.py:66-68` | Guard to dev; `/api/index.py`; uploads routing |
| 48 | MEDIUM | Stale deployment surfaces: render.yaml (free Render host), docker-compose (db-only) | `render.yaml`, `docker-compose.yml` | Delete or document |
| 49 | LOW | No `engines` field; stale package.json `test` script; middleware only checks cookie presence | `package.json:21,44`, `middleware.ts:29-35` | engines field; accept cookie-presence |

---

## Suggested execution order

1. **Phase 0 (security)** — ~0.5-1 day; every item is small and independently testable. #1 and #2 are the only things that should block any public deployment.
2. **Phase 1 (crashes)** — ~1-2 days; #11 (ownership UUID binds) also unblocks local dev, #15/#16 fix broken prod avatar/document flows.
3. **Phase 3 (#28/#29, migrations)** — ~0.5-1 day; prerequisite for trusting any schema change; replaces the cold-start hack permanently.
4. **Phase 2 (performance)** — ~1 day; #24 (SQL aggregation) is the largest win for report pages.
5. **Phase 4 (frontend)** — ~2-3 days; #33 (fake data) and #34 (dark mode) are what users actually see every day.
6. **Phase 5 (tooling)** — half-day; mostly deletions + a Makefile rewrite.

Test-suite note: 83 tests pass but `conftest.py` uses `create_all`, so migration drift is invisible to CI — fixing #28/#29 makes the suite meaningful.
