# Apps Script browser transport fix

The GitHub front end now uses JSONP for Apps Script reads and normal CRUD responses because Apps Script ContentService redirects output to `script.googleusercontent.com`, which can cause cross-origin browser `fetch()` failures.

## Replace only `doGet(e)` in Code.gs

Replace the existing `doGet(e)` function with:

```javascript
function doGet(e) {
  const params = e && e.parameter ? Object.assign({}, e.parameter) : {};
  const callback = params.callback || params.prefix || '';

  try {
    const action = params.action || 'health';

    if (action !== 'health') {
      validateApiKey_(params);
    }

    const result = routeRequest_(action, params);

    return webResponse_({
      success: true,
      action: action,
      data: result
    }, callback);

  } catch (error) {
    console.error(error);

    return webResponse_({
      success: false,
      error: error.message || String(error)
    }, callback);
  }
}
```

## Add this helper anywhere in Code.gs

```javascript
function webResponse_(object, callback) {
  const json = JSON.stringify(object);

  if (callback) {
    const safeCallback = String(callback).trim();

    if (!/^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(safeCallback)) {
      throw new Error('Invalid JSONP callback.');
    }

    return ContentService
      .createTextOutput(safeCallback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
```

Do not remove `doPost(e)` or `jsonResponse_()`.

## Deployment

1. Save the Apps Script project.
2. Deploy > Manage deployments.
3. Edit the existing web-app deployment.
4. Select New version.
5. Execute as: Me / user deploying.
6. Access must allow the GitHub-hosted browser app to reach the endpoint. For an anonymous public GitHub Pages front end, this means anonymous web-app access must be permitted by your Google Workspace policy.
7. Deploy.
8. Keep the same `/exec` URL.
9. Hard refresh the GitHub app.

## Existing route still required

Keep this in `routeRequest_(action, params)` before `default:`:

```javascript
case 'bulkImportUniversities':
  return bulkImportUniversities_(params);
```
