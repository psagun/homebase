# HomeBase --- Property Portfolio Management Platform

**Document:** Product & Technical Specification\
**Version:** 1.0\
**Status:** MVP Development Specification\
**Primary Developer Tool:** Claude Code\
**Deployment Platform:** Vercel

------------------------------------------------------------------------

## 1. Product Overview

HomeBase is a personal real estate portfolio management application for
property owners who own multiple houses, condos, land, townhomes,
multi-family properties, or other real estate assets.

The core problem:

> Property information is scattered across spreadsheets, emails, lender
> portals, insurance portals, county websites, paper documents, and
> personal notes.

This causes the owner to:

-   Miss mortgage payment deadlines.
-   Forget insurance renewal dates.
-   Miss property tax deadlines.
-   Forget to collect rent.
-   Lose track of mortgage or insurance providers.
-   Lose important documents.
-   Forget maintenance history.
-   Spend too much time searching for basic property information.

### Product Goal

HomeBase provides one source of truth for every property.

For each property, the user should be able to quickly find:

-   Property details.
-   Mortgage information.
-   Insurance information.
-   Property taxes.
-   HOA information.
-   Tenant and lease information.
-   Documents.
-   Maintenance history.
-   Financial transactions.
-   Tasks and reminders.
-   Important contacts.

The system must proactively surface what requires attention.

The user should be able to answer:

> What do I own, who do I pay, what do I owe, when is it due, and where
> are the related documents?

without searching through spreadsheets or multiple systems.

------------------------------------------------------------------------

# 2. Product Design Direction

The UI should be based on the HomeBase prototype design.

## Visual Direction

-   Clean SaaS dashboard.
-   Dark navy left sidebar.
-   White or very light content area.
-   Blue primary action color.
-   Rounded cards.
-   Subtle borders.
-   Light shadows.
-   Clear typography.
-   Generous spacing.
-   Minimal visual clutter.
-   Strong information hierarchy.

## Core UX Principle

The application should not display every piece of information on one
screen.

The user should see:

### Dashboard

What needs attention across the entire portfolio.

### Property Overview

What is important about one specific property.

### Property Tabs

Detailed information for a specific domain.

``` text
Property
├── Overview
├── Mortgage
├── Insurance
├── Taxes
├── Tenants
├── Documents
├── Maintenance
└── Financials
```

Use progressive disclosure.

Do not create a giant form with dozens of fields.

------------------------------------------------------------------------

# 3. Technology Stack

## Frontend

-   Next.js
-   TypeScript
-   App Router
-   Tailwind CSS
-   shadcn/ui
-   Lucide React icons
-   TanStack Query
-   React Hook Form
-   Zod

Use TypeScript strict mode.

## Backend

-   Python 3.12+
-   FastAPI
-   Pydantic v2
-   SQLAlchemy 2.0
-   Alembic
-   PostgreSQL

## Deployment

The application MUST use Vercel as the primary deployment platform.

Required deployment model:

-   Next.js frontend deployed on Vercel.
-   FastAPI backend deployed using Vercel's Python runtime.
-   Backend API exposed through Vercel-compatible serverless functions.
-   Vercel Cron Jobs used for scheduled reminder processing.
-   Vercel environment variables used for secrets and configuration.
-   Git-based Vercel deployments supported.
-   Vercel preview deployments supported.

Do not design the application around a traditional always-running
backend server unless a specific technical limitation requires it.

The FastAPI application must remain compatible with Vercel's serverless
Python runtime.

## Database

Use PostgreSQL.

The database must be external to the Vercel runtime because serverless
functions are stateless.

Use SQLAlchemy 2.0 for database access.

Use Alembic for schema migrations.

## File Storage

Do not store uploaded documents directly inside PostgreSQL.

Store:

-   Document metadata in PostgreSQL.
-   Actual files in S3-compatible object storage.

The storage provider must be abstracted behind a service interface.

Example:

``` text
DocumentStorageService
├── upload()
├── download()
├── delete()
└── generate_presigned_url()
```

------------------------------------------------------------------------

# 4. Architecture

## High-Level Architecture

``` text
┌─────────────────────────────┐
│          Vercel             │
│                             │
│  Next.js Frontend           │
│                             │
│  FastAPI Python API         │
│                             │
│  Vercel Functions           │
│                             │
│  Vercel Cron Jobs           │
└──────────────┬──────────────┘
               │
               ▼
        PostgreSQL Database

               │
               ▼
       Object File Storage
```

## Frontend Flow

``` text
React Component
      ↓
TanStack Query Hook
      ↓
API Client
      ↓
FastAPI REST API
```

## Backend Flow

``` text
FastAPI Router
      ↓
Pydantic Validation
      ↓
Service Layer
      ↓
Repository / SQLAlchemy
      ↓
PostgreSQL
```

## Architecture Rules

1.  Do not put business logic inside React components.
2.  Do not put substantial business logic directly inside API route
    handlers.
3.  Do not put raw database queries directly inside route handlers.
4.  Use Pydantic schemas for API input and output validation.
5.  Every database schema change requires an Alembic migration.
6.  Every property query must be scoped to the authenticated user.
7.  Do not trust a user-provided `user_id`.
8.  Derive user identity from the authenticated session or token.
9.  Do not store uploaded files directly in PostgreSQL.
10. Do not use hardcoded mock data after real API integration is
    implemented.
11. Do not introduce microservices for the MVP.
12. Do not refactor unrelated features during feature implementation.

------------------------------------------------------------------------

# 5. Application Navigation

## Global Navigation

``` text
Dashboard
Properties
Tasks & Reminders
Calendar
Documents
Transactions
Reports
Contacts
Settings
```

## Property Navigation

``` text
Overview
Mortgage
Insurance
Taxes
Tenants
Documents
Maintenance
Financials
```

------------------------------------------------------------------------

# 6. Frontend Routes

Implement:

``` text
/dashboard

/properties
/properties/new
/properties/[id]

/properties/[id]/mortgage
/properties/[id]/insurance
/properties/[id]/taxes
/properties/[id]/tenants
/properties/[id]/documents
/properties/[id]/maintenance
/properties/[id]/financials

/tasks
/calendar
/documents
/transactions
/reports
/contacts
/settings
```

------------------------------------------------------------------------

# 7. Dashboard

Route:

``` text
/dashboard
```

The Dashboard is the portfolio-level command center.

## Header

Display:

-   Welcome message.
-   Search.
-   Notifications.
-   Add Property button.

## Metric Cards

Display:

-   Total Properties.
-   Total Portfolio Value.
-   Total Equity.
-   Monthly Rent.
-   Monthly Cash Flow.

These values must come from real database data.

Do not hardcode final dashboard metrics.

## Upcoming Reminders

Display the most urgent upcoming tasks.

Each item should show:

-   Task type.
-   Property.
-   Due date.
-   Days remaining.
-   Priority.
-   Status.

Example:

``` text
Insurance Renewal
123 Main Street

Expires in 18 days
```

Clicking a reminder must navigate to the relevant property or record.

## Cash Flow

Display monthly cash flow based on Transaction data.

## Property Status

Display properties by status:

-   Occupied.
-   Vacant.
-   Under Maintenance.
-   For Sale.

## Recent Properties

Display:

-   Property image.
-   Property name.
-   Address.
-   Status.

------------------------------------------------------------------------

# 8. Properties List

Route:

``` text
/properties
```

Display all properties in a clean table.

## Columns

-   Property.
-   Status.
-   Type.
-   Purchase Date.
-   Current Value.
-   Actions.

## Features

-   Search.
-   Filter.
-   Sort.
-   Add Property.
-   Edit Property.
-   Archive Property.
-   Open Property.

## Property Statuses

``` text
Occupied
Vacant
Under Maintenance
For Sale
```

## Property Types

``` text
Single Family
Condo
Townhouse
Multi-Family
Land
Commercial
Other
```

------------------------------------------------------------------------

# 9. Add Property

Route:

``` text
/properties/new
```

The initial form should be simple.

## Required Fields

-   Property Name.
-   Address.
-   Property Type.
-   Status.

## Optional Fields

-   Purchase Date.
-   Purchase Price.
-   Current Value.
-   Lot Size.
-   Bedrooms.
-   Bathrooms.
-   Year Built.
-   Notes.

Mortgage, insurance, tenant, and tax information should be added
separately.

The user must be able to create a property without completing every
module.

------------------------------------------------------------------------

# 10. Property Overview

Route:

``` text
/properties/[id]
```

This is the central workspace for a property.

## Header

Display:

-   Breadcrumb.
-   Property image.
-   Property name.
-   Address.
-   Status.
-   Edit Property.
-   More actions.

## Property Details

Display:

-   Property Type.
-   Purchase Price.
-   Purchase Date.
-   Current Value.
-   Estimated Equity.
-   Lot Size.
-   Bedrooms.
-   Bathrooms.
-   Year Built.

## Quick Summary Cards

Display:

-   Monthly Rent.
-   Mortgage Payment.
-   Insurance Renewal.
-   Property Tax.

Each card should link to the corresponding detailed module.

## Upcoming Reminders

Display property-specific tasks.

## Quick Actions

Provide:

-   Make Payment.
-   Add Document.
-   Record Expense.
-   Create Task.

The Overview page must remain clean and not become a giant information
dump.

------------------------------------------------------------------------

# 11. Mortgage Module

Route:

``` text
/properties/[id]/mortgage
```

## Mortgage Information

Display:

-   Lender.
-   Loan Number.
-   Loan Type.
-   Interest Rate.
-   Original Loan Amount.
-   Current Balance.
-   Monthly Payment.
-   Loan Term.
-   Start Date.
-   Maturity Date.
-   Autopay Status.
-   Next Due Date.

## Payment Schedule

Display:

-   Due Date.
-   Principal.
-   Interest.
-   Escrow.
-   Total.
-   Status.

## Actions

-   Edit Mortgage.
-   Record Payment.
-   Add Document.
-   Open Lender Portal.

## Lender History

Changing a lender must not destroy historical data.

Example:

``` text
Rocket Mortgage
January 2024 - December 2026

Example Bank
January 2027 - Present
```

The data model should support historical lender records.

------------------------------------------------------------------------

# 12. Insurance Module

Route:

``` text
/properties/[id]/insurance
```

## Policy Information

Display:

-   Provider.
-   Policy Number.
-   Policy Type.
-   Coverage Amount.
-   Deductible.
-   Annual Premium.
-   Renewal Date.
-   Effective Date.
-   Expiration Date.
-   Agent Name.
-   Agent Phone.
-   Agent Email.

## Coverage Summary

Support coverage categories such as:

-   Dwelling.
-   Personal Property.
-   Liability.
-   Medical Payments.

## Policy Documents

Display related documents.

## Renewal Reminders

The system must automatically create or calculate reminder events for
upcoming renewals.

Default reminder schedule:

-   90 days before.
-   60 days before.
-   30 days before.
-   14 days before.
-   7 days before.
-   1 day before.

------------------------------------------------------------------------

# 13. Property Taxes

Route:

``` text
/properties/[id]/taxes
```

Store:

-   County.
-   Tax Authority.
-   Parcel ID.
-   Annual Tax.
-   Payment Frequency.
-   Next Due Date.
-   Tax Website.
-   Account Number.

Features:

-   Tax deadline reminders.
-   Tax bill document upload.
-   Payment history.
-   Tax document storage.

------------------------------------------------------------------------

# 14. Tenants and Leases

Route:

``` text
/properties/[id]/tenants
```

## Tenant Information

Store:

-   Tenant Name.
-   Email.
-   Phone.
-   Move-In Date.
-   Lease Start.
-   Lease End.
-   Monthly Rent.
-   Security Deposit.
-   Payment Method.
-   Late Fee.

## Rent Tracking

Track:

-   Expected rent.
-   Paid rent.
-   Pending rent.
-   Overdue rent.

## Lease Features

-   Upload lease.
-   Track lease expiration.
-   Create renewal reminder.
-   Store addendums.
-   Track security deposit.
-   View rent history.

------------------------------------------------------------------------

# 15. Documents

Routes:

``` text
/properties/[id]/documents
/documents
```

## Categories

``` text
All Documents
Property
Mortgage
Insurance
Tax
Lease
Maintenance
HOA
Other
```

## Supported File Types

-   PDF.
-   DOCX.
-   XLSX.
-   JPG.
-   PNG.

## Document Metadata

Store:

-   Name.
-   Category.
-   Property.
-   Storage Key.
-   File Type.
-   File Size.
-   Upload Date.
-   Expiration Date.

## Features

-   Upload.
-   Search.
-   Filter.
-   Download.
-   Delete.
-   Preview where possible.

------------------------------------------------------------------------

# 16. Tasks and Reminders

Route:

``` text
/tasks
```

## Task Types

``` text
Mortgage Payment
Insurance Renewal
Property Tax
HOA Payment
Rent Collection
Lease Renewal
Maintenance
Document Expiration
Custom
```

## Task Fields

-   Title.
-   Description.
-   Property.
-   Task Type.
-   Due Date.
-   Priority.
-   Status.
-   Reminder Schedule.

## Statuses

``` text
Upcoming
Due Today
Overdue
Completed
Dismissed
```

## Priorities

``` text
Low
Medium
High
Critical
```

Overdue tasks must be visually obvious.

------------------------------------------------------------------------

# 17. Calendar

Route:

``` text
/calendar
```

Aggregate deadlines across all properties.

Support filtering by:

-   Mortgage.
-   Insurance.
-   Taxes.
-   Rent.
-   Maintenance.
-   Lease.
-   HOA.
-   Custom.

Clicking a calendar event should open the relevant task or property
record.

------------------------------------------------------------------------

# 18. Maintenance

Route:

``` text
/properties/[id]/maintenance
```

A maintenance record should support:

-   Title.
-   Description.
-   Date.
-   Cost.
-   Contractor.
-   Warranty expiration.
-   Related documents.
-   Notes.

Example:

``` text
HVAC Replacement
June 12, 2026
$4,200
ABC HVAC
Warranty: 5 years
```

Display maintenance history chronologically.

------------------------------------------------------------------------

# 19. Financials and Transactions

Route:

``` text
/properties/[id]/financials
```

Track income:

-   Rent.
-   Parking.
-   Storage.
-   Other income.

Track expenses:

-   Mortgage.
-   Insurance.
-   Taxes.
-   HOA.
-   Maintenance.
-   Utilities.
-   Property Management.
-   Other.

Display:

-   Monthly cash flow.
-   Annual cash flow.
-   Annual expenses.
-   Rental income.
-   Principal paid.
-   Estimated ROI.
-   Cap rate.
-   Equity growth.

Financial calculations should be based on actual Transaction records.

------------------------------------------------------------------------

# 20. Contacts

Contacts can be associated with one or multiple properties.

Contact types:

``` text
Mortgage Lender
Insurance Agent
Property Manager
Tenant
Contractor
Realtor
HOA
Tax Authority
Utility Provider
Attorney
Accountant
Other
```

Store:

-   Name.
-   Company.
-   Phone.
-   Email.
-   Website.
-   Notes.

------------------------------------------------------------------------

# 21. Notifications

Initial notification channels:

-   In-app notifications.
-   Email.

Future channels:

-   SMS.
-   Push notifications.

Example:

``` text
Your mortgage payment for 123 Main Street is due in 5 days.

Your insurance policy for 456 Oak Avenue expires in 30 days.

The lease for Beachside Condo expires in 60 days.

Property tax payment for 789 Pine Road is overdue.
```

------------------------------------------------------------------------

# 22. Vercel Cron Jobs

Use Vercel Cron Jobs for scheduled reminder processing.

Example flow:

``` text
Vercel Cron
      ↓
FastAPI scheduled endpoint
      ↓
Find upcoming deadlines
      ↓
Create notifications
      ↓
Send email reminders
```

The scheduled endpoint must be protected using a secret stored in an
environment variable.

The reminder process must be idempotent.

Running the same cron job multiple times must not create duplicate
notifications.

Reminder processing should identify:

-   Overdue items.
-   Due today.
-   Due in 1 day.
-   Due in 7 days.
-   Due in 14 days.
-   Due in 30 days.
-   Due in 60 days.
-   Due in 90 days.

------------------------------------------------------------------------

# 23. Database Models

## User

``` text
id
email
name
created_at
updated_at
```

## Property

``` text
id
user_id
name
address_line_1
address_line_2
city
state
postal_code
country
property_type
status
purchase_date
purchase_price
current_value
lot_size
bedrooms
bathrooms
year_built
notes
created_at
updated_at
```

## Mortgage

``` text
id
property_id
lender_name
loan_number
loan_type
interest_rate
original_amount
current_balance
monthly_payment
loan_term_months
start_date
maturity_date
next_due_date
autopay_enabled
created_at
updated_at
```

## InsurancePolicy

``` text
id
property_id
provider_name
policy_number
policy_type
coverage_amount
deductible
annual_premium
renewal_date
effective_date
expiration_date
agent_name
agent_phone
agent_email
created_at
updated_at
```

## Document

``` text
id
property_id
name
category
storage_key
file_type
file_size
expiration_date
created_at
updated_at
```

## Task

``` text
id
property_id
title
description
task_type
due_date
priority
status
completed_at
created_at
updated_at
```

## Transaction

``` text
id
property_id
transaction_type
category
amount
transaction_date
description
created_at
updated_at
```

------------------------------------------------------------------------

# 24. API Structure

Use REST APIs under:

``` text
/api/v1
```

## Properties

``` text
GET    /api/v1/properties
POST   /api/v1/properties
GET    /api/v1/properties/{id}
PATCH  /api/v1/properties/{id}
DELETE /api/v1/properties/{id}
```

## Mortgage

``` text
GET    /api/v1/properties/{id}/mortgage
POST   /api/v1/properties/{id}/mortgage
PATCH  /api/v1/mortgages/{id}
DELETE /api/v1/mortgages/{id}
```

## Insurance

``` text
GET    /api/v1/properties/{id}/insurance
POST   /api/v1/properties/{id}/insurance
PATCH  /api/v1/insurance/{id}
DELETE /api/v1/insurance/{id}
```

## Documents

``` text
GET    /api/v1/properties/{id}/documents
POST   /api/v1/documents
DELETE /api/v1/documents/{id}
```

## Tasks

``` text
GET    /api/v1/tasks
POST   /api/v1/tasks
PATCH  /api/v1/tasks/{id}
DELETE /api/v1/tasks/{id}
```

## Dashboard

``` text
GET /api/v1/dashboard/summary
GET /api/v1/dashboard/upcoming-reminders
GET /api/v1/dashboard/cash-flow
```

------------------------------------------------------------------------

# 25. Security

Implement:

-   Authentication.
-   Authorization.
-   User ownership checks.

A user must never access another user's properties.

Every property-related query must be scoped to the authenticated user.

Do not trust a user-provided `user_id`.

Do not log:

-   Full loan numbers.
-   Sensitive account numbers.
-   Authentication tokens.
-   Private document contents.

Sensitive identifiers should be encrypted or masked where appropriate.

------------------------------------------------------------------------

# 26. Frontend Quality Requirements

Every data-driven page must include:

-   Loading state.
-   Error state.
-   Empty state.
-   Success state.

Example empty state:

``` text
You don't have any properties yet.

Add your first property to get started.

[Add Property]
```

Never show a blank screen when data is unavailable.

------------------------------------------------------------------------

# 27. Responsive Design

Desktop is the primary experience.

The application must also support:

-   Tablet.
-   Mobile.

Mobile behavior:

-   Sidebar becomes a drawer.
-   Tables become cards or horizontally scrollable.
-   Property tabs become horizontally scrollable.
-   Dashboard cards stack vertically.

------------------------------------------------------------------------

# 28. Project Structure

Use a structure appropriate for a Vercel-deployed Next.js + FastAPI
application.

A recommended structure is:

``` text
homebase/
├── app/
│   ├── dashboard/
│   ├── properties/
│   ├── tasks/
│   ├── calendar/
│   └── ...
│
├── components/
│   ├── ui/
│   ├── dashboard/
│   ├── properties/
│   ├── mortgage/
│   ├── insurance/
│   └── ...
│
├── lib/
│   ├── api/
│   ├── auth/
│   ├── query/
│   └── utils/
│
├── api/
│   ├── index.py
│   ├── routers/
│   ├── models/
│   ├── schemas/
│   ├── services/
│   ├── repositories/
│   └── database/
│
├── migrations/
├── public/
├── tests/
├── CLAUDE.md
├── vercel.json
├── package.json
├── pyproject.toml
├── alembic.ini
├── docker-compose.yml
└── .env.example
```

The exact structure may be adjusted if the existing repository has a
better established convention.

------------------------------------------------------------------------

# 29. CLAUDE CODE DEVELOPMENT RULES

Create and maintain a root-level `CLAUDE.md` file.

Claude Code must follow these rules:

1.  Inspect the existing repository before changing code.
2.  Do not implement the entire application in one step.
3.  Work in phases.
4.  Before each phase, explain the implementation plan.
5.  Identify files that will be created or modified.
6.  Reuse existing patterns.
7.  Do not refactor unrelated code.
8.  Run tests after implementation.
9.  Run linting and type checking.
10. Verify the application builds successfully.
11. Every schema change requires an Alembic migration.
12. Do not use hardcoded mock data in production components.
13. Use strict TypeScript.
14. Validate all API input with Pydantic.
15. Keep business logic out of UI components.
16. Keep database logic out of API route handlers.
17. Add loading, error, and empty states.
18. Do not introduce microservices.
19. Do not add unrequested features.
20. Explain architectural tradeoffs before making major architecture
    changes.

------------------------------------------------------------------------

# 30. Implementation Phases

## Phase 1 --- Foundation

Implement:

-   Next.js.
-   TypeScript.
-   Tailwind CSS.
-   shadcn/ui.
-   FastAPI.
-   PostgreSQL.
-   SQLAlchemy.
-   Alembic.
-   Docker Compose.
-   Environment configuration.
-   Vercel-compatible configuration.

Deliverable:

The frontend and FastAPI backend can communicate successfully.

## Phase 2 --- Authentication

Implement:

-   Registration.
-   Login.
-   Logout.
-   Protected routes.
-   Session persistence.
-   Authenticated API requests.

## Phase 3 --- Properties

Implement:

-   Property list.
-   Add property.
-   Edit property.
-   Property details.
-   Archive property.
-   Search.
-   Filtering.

## Phase 4 --- Property Overview

Implement the prototype-inspired overview page:

-   Header.
-   Property image.
-   Property details.
-   Quick summary cards.
-   Upcoming reminders.
-   Quick actions.

## Phase 5 --- Mortgage

Implement:

-   Mortgage data.
-   Lender history.
-   Payment schedule.
-   Payment records.
-   Mortgage documents.

## Phase 6 --- Insurance

Implement:

-   Policy data.
-   Coverage summary.
-   Renewal dates.
-   Agent information.
-   Policy documents.
-   Renewal reminders.

## Phase 7 --- Documents

Implement:

-   Upload.
-   Storage.
-   Metadata.
-   Categories.
-   Search.
-   Download.
-   Delete.

## Phase 8 --- Tasks and Reminders

Implement:

-   Task creation.
-   Due dates.
-   Priorities.
-   Statuses.
-   Reminder schedules.
-   Overdue detection.

## Phase 9 --- Calendar

Implement:

-   Calendar view.
-   Aggregated deadlines.
-   Filters.
-   Event navigation.

## Phase 10 --- Dashboard

Build dashboard aggregation from real data:

-   Properties.
-   Mortgages.
-   Insurance.
-   Tasks.
-   Transactions.

## Phase 11 --- Financials

Implement:

-   Transactions.
-   Income.
-   Expenses.
-   Cash flow.
-   Basic portfolio metrics.

## Phase 12 --- Production Hardening

Implement:

-   Tests.
-   Error handling.
-   Security review.
-   Database indexes.
-   Performance improvements.
-   Vercel deployment validation.
-   Environment variable validation.

------------------------------------------------------------------------

# 31. MVP Completion Criteria

The MVP is complete when the user can:

1.  Create an account.
2.  Log in.
3.  Add a property.
4.  View the property.
5.  Add mortgage information.
6.  Add insurance information.
7.  Add tax information.
8.  Upload documents.
9.  Create tasks and reminders.
10. See upcoming deadlines.
11. See overdue tasks.
12. View the property from one central workspace.
13. Update a mortgage or insurance provider.
14. Preserve relevant historical information.
15. Access the application through Vercel deployment.

The core product is not complete until the user can reliably answer:

> What properties do I own?

> Who do I pay?

> What do I owe?

> When is it due?

> What documents are associated with it?

> What needs my attention today?

------------------------------------------------------------------------

# 32. Explicitly Out of Scope for MVP

Do not implement these until the core MVP is stable:

-   AI assistant.
-   Bank integrations.
-   Automatic mortgage payments.
-   Automatic insurance renewal.
-   Tenant portal.
-   Complex accounting.
-   Multi-user SaaS billing.
-   Mobile native application.
-   Advanced investment analytics.
-   OCR document extraction.
-   AI document analysis.

These can be added later.

------------------------------------------------------------------------

# 33. Future AI Layer

The future AI layer may support questions such as:

``` text
Which properties have insurance expiring this month?

Which mortgage has the highest interest rate?

Show me all documents related to 123 Main Street.

Which properties are currently losing money?

What payments are due this week?
```

Potential architecture:

``` text
Document Upload
      ↓
Text Extraction / OCR
      ↓
Document Chunking
      ↓
Embeddings
      ↓
Vector Database
      ↓
AI Retrieval
      ↓
Natural Language Answers
```

Do not implement this during the initial MVP.

------------------------------------------------------------------------

# 34. First Claude Code Task

Before writing application code:

1.  Inspect the current repository.
2.  Identify the existing project structure.
3.  Identify existing technologies.
4.  Identify existing reusable code.
5.  Identify conflicts with this specification.
6.  Propose the implementation architecture.
7.  Propose the folder structure.
8.  Identify required environment variables.
9.  Identify the Vercel deployment configuration.
10. Propose the implementation phases.

Do not implement features yet.

Wait for approval before proceeding with Phase 1.
