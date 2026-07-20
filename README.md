# University Outreach Tool

Version 1 foundation for a centralised university outreach CRM.

## Front end

Static single-page application connected to the live Apps Script backend with:
- Live dashboard metrics
- Universities database with search and filters
- Add University with duplicate detection
- University profile view
- Contacts directory
- Follow-up queue
- Outreach activity timeline
- Analytics summary
- Backend connection status
- Settings/system information

The front end is configured to use the deployed Google Apps Script web app as its API. No credentials or private keys are committed to this repository.

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

## Apps Script backend

The deployed API supports:
- `health`
- `getLookups`
- `getDashboard`
- `listUniversities`
- `getUniversity`
- `createUniversity`
- `updateUniversity`
- `archiveUniversity`
- `bulkUpdateUniversities`
- `listContacts`
- `createContact`
- `updateContact`
- `markContactInactive`
- `listActivities`
- `createActivity`
- `listFollowUps`
- `createFollowUp`
- `updateFollowUp`
- `completeFollowUp`

## Version 1 remaining build steps

1. Add create/edit UI for contacts.
2. Add create/edit UI for outreach activity and follow-ups.
3. Add university edit and bulk-update controls.
4. Add CSV/XLSX import review and duplicate-resolution workflow.
5. Add filtered export.
6. Add authentication/authorisation before production use.

No credentials or secrets should be committed to this repository.