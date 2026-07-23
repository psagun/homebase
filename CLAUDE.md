# HomeBase — Claude Code Development Guide

## Architecture

- **Frontend:** Next.js 14+ (App Router) + TypeScript (strict) + Tailwind CSS + shadcn/ui
- **Backend:** FastAPI + SQLAlchemy 2.0 + PostgreSQL
- **Deployment:** Vercel (Next.js + FastAPI serverless)
- **Auth:** JWT (access + refresh tokens) via HTTP-only cookies

## Folder Structure

```
homebase/
├── app/              # Next.js App Router pages
├── components/       # React components
│   ├── ui/          # shadcn/ui primitives
│   ├── layout/      # Sidebar, Header
│   └── shared/      # Loading, Error, Empty states
├── lib/              # Frontend utilities, API client, hooks
├── backend/          # FastAPI Python backend
│   ├── models/      # SQLAlchemy models
│   ├── schemas/     # Pydantic v2 schemas
│   ├── routers/     # API route handlers (thin)
│   ├── services/    # Business logic
│   └── repositories/# Data access layer
├── api/index.py     # Vercel serverless entry point
└── tests/           # Pytest suite
```

## Development Rules

1. **Inspect before changing** — read existing files before modifying
2. **Work in phases** — implement one phase at a time
3. **Explain before implementing** — identify files to create/modify each phase
4. **Reuse existing patterns** — match the established conventions
5. **No unrelated refactoring** — only change what the phase requires
6. **Run tests after implementation** — ensure nothing breaks
7. **Run linting** — `ruff check backend/`
8. **Build verification** — `npm run build` succeeds after frontend changes
9. **Alembic migrations** — every schema change requires a migration
10. **No hardcoded mock data** in production code
11. **Strict TypeScript** — `strict: true`, `noUncheckedIndexedAccess: true`
12. **Validate all API input** with Pydantic
13. **Business logic** stays out of UI components and route handlers
14. **Every page needs** loading, error, empty, and success states
15. **No microservices** for MVP
16. **No unrequested features**
17. **User-scoped queries** — every property query scoped to authenticated user
18. **Derive user identity** from session/token, never from user input

## Data Model Pattern

- All models use UUID primary keys (`uuid.uuid4`)
- User has unique email, password_hash (bcrypt), name
- Property has user_id FK, soft-delete via archived_at
- All timestamps use `DateTime(timezone=True)` with `datetime.now(timezone.utc)`

## API Pattern

Router (HTTP) → Service (business logic) → Repository (data access) → DB
All endpoints under `/api/v1/`, all scoped to authenticated user.

## Local Development

```bash
# Backend
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000

# Frontend
npm install
npm run dev

# Database
docker compose up -d db
alembic upgrade head

# Tests
pytest tests/ -v
```
