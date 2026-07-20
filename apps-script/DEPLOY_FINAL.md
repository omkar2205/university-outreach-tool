# Final Apps Script upgrade

The live Apps Script deployment currently has the V1 `Code.gs`. The final Google Sheets schema and front-end have been built, but the advanced queue endpoints must be added to the bound Apps Script project before those modules can read/write live data.

## 1. Add FinalModules.gs

In the Apps Script project attached to **University Outreach Tool - Master Database**:

1. Click **+ > Script**.
2. Name it `FinalModules`.
3. Paste the complete contents of `apps-script/FinalModules.gs` from this repository.

## 2. Add these cases to `routeRequest_(action, params)` in Code.gs

Insert these cases before the existing `default:` block:

```javascript
    // FINAL ARCHITECTURE MODULES
    case 'listResearch':
      return listResearch_(params);

    case 'createResearchRequest':
      return createResearchRequest_(params);

    case 'listVerification':
      return listVerification_(params);

    case 'createVerificationRecord':
      return createVerificationRecord_(params);

    case 'listRankings':
      return listRankings_(params);

    case 'addRanking':
      return addRanking_(params);

    case 'listDocuments':
      return listDocuments_(params);

    case 'listEmails':
      return listEmails_(params);

    case 'logEmail':
      return logEmail_(params);

    case 'listNotifications':
      return listNotifications_(params);

    case 'getFinalSystemStatus':
      return getFinalSystemStatus_();
```

## 3. Redeploy

Use **Deploy > Manage deployments > Edit > New version > Deploy**.

Keep the existing web-app URL. The front end is already configured to use it.

## External integrations

These are deliberately feature-flagged until credentials/tenant permissions exist:

- **Automated university web research:** requires an approved search/research provider or server-side browsing service. Results should be written to `Research Queue` and require human approval before updating the master database.
- **Automatic contact monitoring:** requires a scheduled server-side job and compliant public-source checks. Results should be written to `Contact Verification` for review.
- **Microsoft 365 email:** requires Microsoft Graph app registration/tenant consent and mailbox permissions. Email metadata/summaries belong in `Email Log`.

Do not place API secrets in the public GitHub repository. Store secrets in Apps Script Script Properties or an approved secret manager.
