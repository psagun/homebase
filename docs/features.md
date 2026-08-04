I want to redesign the Ownership section of the application.

Current goal:
Move ownership management into each Property while keeping Ownership Entities as reusable records in the database.

Requirements

1. Property Details

Add a new "Ownership" tab inside every Property.

Property
├── Overview
├── Ownership
├── Mortgage
├── Insurance
├── Taxes
├── Tenants
├── Contacts
├── Documents
├── Maintenance
└── Financials

2. Ownership Tab

Display:

- Ownership Type
    - Individual
    - Business Entity

If Business Entity:

Display:

- Entity Name
- Entity Type
- EIN
- State of Formation
- Status
- View Entity button
- Edit Entity button

3. Investors

Inside the Ownership tab display an Investors table.

Columns:

- Investor Name
- Ownership %
- Email
- Phone
- Status

Allow:

- Add Investor
- Remove Investor
- Edit Ownership %

Ownership percentages must total 100%.

4. Documents

Display:

- Certificate of Formation
- Operating Agreement
- EIN Letter
- Tax Documents

Allow upload/download.

5. Ownership Entity

Ownership Entities are shared across properties.

One Ownership Entity may own many properties.

Example:

TY Investments LLC

├── Property A
├── Property B
├── Property C

Do NOT duplicate entity data inside every property.

Properties should reference ownership_entity_id.

6. Database

Use this relationship:

Property
--------
ownership_entity_id

OwnershipEntity
---------------
id
name
type
ein
state
status

Investor
--------
id
name
email
phone

OwnershipEntityInvestor
------------------------
ownership_entity_id
investor_id
ownership_percentage

7. Investor Portal

The Investor Portal must NOT store duplicate property records.

When an investor logs in:

Investor
→ Ownership Entity
→ Properties

Only properties linked through OwnershipEntityInvestor should be returned.

Filtering should happen on the backend.

The frontend simply renders the returned properties.

8. UI

The Ownership page should match the existing HomeBase design system.

Use cards and tables already used elsewhere.

Do not redesign unrelated screens.

Redesign the toggle for appearance on the dashboard somewhere visible and one clickable.