# University Outreach Tool

Centralised university outreach CRM and intelligence platform.

## Final application modules

### Live CRM
- Dashboard with outreach KPIs and pipeline
- University database with search/filtering
- University profile and outreach history
- Add/edit university
- Multiple contacts per university
- Outreach activity logging
- Follow-up scheduling and queue
- Duplicate university/contact protection
- Bulk stage updates
- CSV export
- CSV/XLS/XLSX import with preview and duplicate-safe insertion
- Analytics
- Audit-ready relational Google Sheets backend

### Final architecture modules
- Research Queue
- Contact Verification
- University Rankings
- Documents
- Email Log
- Notifications
- Saved Views

The Google Sheets schema is version **2.0.0**.

## Google Drive structure

`University Outreach Tool`
- `01 - Database`
  - `University Outreach Tool - Master Database`
- `02 - Imports`
  - `Pending Review`
  - `Processed`
- `03 - Exports`
  - `Reports`
- `04 - University Documents`
- `05 - System & Logs`
- `06 - Research & Verification`
- `07 - Email & Communications`
- `99 - Archive`

## Apps Script

The currently deployed V1 API handles the live CRM actions. The repository contains the final extension at:

- `apps-script/FinalModules.gs`
- `apps-script/DEPLOY_FINAL.md`

Deploy that extension to activate the advanced queue endpoints without changing the existing web-app URL.

## External integrations requiring separate authorization

The system does **not** fake these capabilities. Their database, UI and integration hooks are built, but execution stays feature-flagged until credentials/permissions are provided:

1. **Automated university research** — requires an approved server-side search/research provider. All researched updates should enter `Research Queue` and require human approval.
2. **Automatic contact monitoring** — requires a scheduled server-side verification job using compliant public sources. Changes enter `Contact Verification` for review; old contacts remain historical/inactive rather than being deleted.
3. **Microsoft 365 email integration** — requires Microsoft Graph app registration and tenant/mailbox permissions before send/receive/thread summarisation can be enabled.

Never commit API secrets, Microsoft client secrets or access tokens to this public repository. Use Apps Script Script Properties or an approved secret manager.
