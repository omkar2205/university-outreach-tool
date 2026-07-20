# University Outreach Tool

Version 1 foundation for a centralised university outreach CRM.

## Front end

Static single-page application scaffold with:
- Dashboard
- Universities database
- Contacts
- Follow-ups
- Activity
- Import
- Analytics
- Settings
- Add University interaction
- Search/filter scaffolding

The current UI uses demo data only. The next step is to connect these views to the Google Sheets backend through a secure Apps Script/API layer.

## Google Drive backend

Project folder: **University Outreach Tool**

Structure:
- `01 - Database`
  - `University Outreach Tool - Master Database`
- `02 - Imports`
  - `Pending Review`
  - `Processed`
- `03 - Exports`
- `04 - University Documents`
- `05 - System & Logs`
- `99 - Archive`

### Master Database tabs

- `README`
- `Universities`
- `Contacts`
- `Outreach Activity`
- `Follow-Ups`
- `Users`
- `Import Log`
- `Audit Log`
- `Lookups`
- `System Config`

The schema is relational: university records are stored once and linked to contacts, activities and follow-ups using stable IDs.

## Version 1 next build steps

1. Create the Google Apps Script backend/API layer.
2. Connect dashboard metrics to live sheet data.
3. Connect University CRUD operations.
4. Build University Profile with Contacts, Outreach, Notes and Activity tabs.
5. Connect follow-up queue.
6. Add CSV/XLSX import review and duplicate detection.
7. Add bulk updates and filtered export.
8. Add authentication/authorisation before production use.

No credentials or secrets should be committed to this repository.