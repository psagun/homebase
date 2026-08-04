HomeBase - Feature Enhancements & Bug Fixes Specification
Objective

Improve the stability, usability, and completeness of the HomeBase application by fixing existing issues, implementing missing CRUD functionality, adding document management, and improving recurring payment tracking.

1. Properties → Documents
Current Issue

Users are unable to upload documents.

Requirements

Implement a reusable document management system using Supabase Storage.

Storage
Store actual files in Supabase Storage.
Store only document metadata in PostgreSQL.
Use private storage buckets.
Generate signed URLs when users download or preview files.
Supported File Types
PDF
DOC / DOCX
XLS / XLSX
JPG / JPEG
PNG
Folder Structure
documents/
    properties/
        {propertyId}/
            mortgage.pdf
            insurance.pdf
            lease.pdf
            inspection.jpg
Document Metadata

Each document should store:

Property ID
Document Name
Category
File Type
File Size
Storage Path
Uploaded By
Upload Date
Last Updated
User Actions

Users should be able to:

Upload
Preview
Download
Replace
Rename
Delete

Display upload progress, loading indicators, and clear success/error messages.

2. Maintenance
Current Issue

Maintenance records cannot be edited.

Requirements

Implement full editing capability.

Editable fields include:

Title
Description
Vendor
Category
Priority
Status
Cost
Scheduled Date
Completed Date
Notes

Changes should update immediately without requiring recreation of the record.

3. Ownership
Current Issues
Document uploads are not supported.
Important financial information is missing.
Requirements
Document Uploads

Reuse the same document upload component created for Properties.

Suggested document categories:

Purchase Agreement
Closing Documents
Deed
HOA Documents
Tax Documents
Miscellaneous
Financial Fields

Add the following ownership fields:

Purchase Price
Rehab Cost
Current Market Value

Future calculations should be able to derive values such as Equity and ROI using these fields.

Current Market Value must remain editable.

4. Insurance
Current Issue

Insurance supports creating records only.

Users cannot edit or delete existing policies.

Requirements

Implement full CRUD.

Support:

Add
View
Edit
Delete

Deleting a policy must require confirmation.

5. External Payment Tracking
Objective

HomeBase does not process payments.

Mortgage, Insurance, HOA, Property Tax, and similar payments are completed on external provider websites.

Because payments occur outside HomeBase, the application must never assume that clicking "Pay" means the payment was completed.

Applies To
Mortgage
Insurance
HOA
Property Taxes
Any recurring payment that redirects to an external provider
New Workflow
Step 1

User clicks Pay Now.

Step 2

Open the provider's payment website in a new browser tab.

Examples:

Mortgage lender
Insurance company
HOA portal
County tax payment website
Step 3

When the user returns to HomeBase, the payment card should display a "Confirm Payment" action.

Selecting this action opens a confirmation dialog.

Confirmation Dialog

Title

Confirm Payment

Message

Did you successfully complete your payment on the provider's website?

Buttons:

Yes, Payment Completed
No, Not Yet
Cancel
If User Selects "Yes"

Record:

Confirmation timestamp
User
Payment cycle completion

Automatically calculate the next due date using the configured payment frequency.

Examples:

Monthly:

August 1 → September 1

Quarterly:

July 1 → October 1

Yearly:

January 1, 2026 → January 1, 2027

Update reminder status to:

Upcoming

Display a confirmation message:

"Payment recorded successfully. Your next payment is due on September 1."

If User Selects "No"

Do not update the reminder.

If today's date is beyond the due date:

Status:

Past Due

Otherwise:

Keep the current reminder status.

Important Rules
Never assume an external payment was successful.
Never update due dates automatically after opening the external payment website.
Payment completion is based only on explicit user confirmation.
Clearly indicate in the payment history that the payment was user-confirmed, not automatically verified.

Design the workflow so future API integrations can replace manual confirmation without requiring UI redesign.

6. Shared Document Component

Do not build separate upload systems for each module.

Create a reusable Document Manager component that can be shared across:

Properties
Ownership
Insurance
Maintenance
Mortgages
Investor Documents
Future modules

The component should support configurable document categories while sharing the same upload, preview, download, replace, rename, and delete functionality.

7. Confirmation Dialog Standards

Any destructive or irreversible action should require user confirmation.

Apply confirmation dialogs to:

Delete Document
Delete Insurance Policy
Delete Ownership Record
Delete Maintenance Record
Delete Future Records

Standard dialog:

Title

Confirm Action

Message

Are you sure you want to continue?

This action cannot be undone.

Buttons:

Cancel
Confirm
8. Technical Requirements
Use Supabase Storage for all uploaded files.
Store document metadata only in PostgreSQL.
Reuse shared UI components whenever possible.
Avoid duplicate business logic across modules.
Preserve the existing application design language.
Ensure all new functionality follows the existing permission model.
Implement proper loading, validation, success, and error states.
Keep the implementation modular, scalable, and easy to maintain.
Definition of Done

The feature is complete when:

Property document uploads work correctly.
Ownership document uploads work correctly.
Maintenance records can be edited.
Insurance records support full CRUD operations.
Purchase Price, Rehab Cost, and Current Market Value are available in Ownership.
External payment reminders correctly track user-confirmed payments.
Shared document functionality is reused across modules.
All confirmation dialogs behave consistently.
No existing functionality is broken.
The implementation is production-ready and follows modern React, Next.js, TypeScript, and Supabase best practices.