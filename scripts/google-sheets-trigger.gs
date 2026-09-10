/** Paste into Extensions > Apps Script in your spreadsheet.
 * Set Script Properties TRACKER_WEBHOOK_URL and TRACKER_WEBHOOK_SECRET,
 * then run installTrackerTriggers once and approve Google's authorization.
 * The backend reads its configured sheet/range; this script sends no cell data.
 */
function installTrackerTriggers() {
  trackerConfig_();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Run this from the Apps Script project bound to your spreadsheet.');
  const handlers = ['trackerEdited', 'trackerChanged', 'syncTracker'];
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (handlers.indexOf(trigger.getHandlerFunction()) !== -1) ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('trackerEdited').forSpreadsheet(spreadsheet).onEdit().create();
  ScriptApp.newTrigger('trackerChanged').forSpreadsheet(spreadsheet).onChange().create();
  // Repairs failed deliveries and catches formula/API/script-driven changes.
  ScriptApp.newTrigger('syncTracker').timeBased().everyMinutes(5).create();
  syncTracker();
}

function trackerEdited(e) {
  syncTracker();
}

function trackerChanged(e) {
  if (!e || e.changeType !== 'EDIT') syncTracker();
}

function trackerConfig_() {
  const properties = PropertiesService.getScriptProperties();
  const url = properties.getProperty('TRACKER_WEBHOOK_URL');
  const secret = properties.getProperty('TRACKER_WEBHOOK_SECRET');
  if (!url || !/^https:\/\//.test(url) || !secret) {
    throw new Error('Set HTTPS TRACKER_WEBHOOK_URL and TRACKER_WEBHOOK_SECRET in Script Properties.');
  }
  return { url: url, secret: secret };
}

function syncTracker() {
  const config = trackerConfig_();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('Tracker sync busy; the five-minute trigger will retry.');
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      let response;
      try {
        response = UrlFetchApp.fetch(config.url, {
          method: 'post', contentType: 'application/json',
          headers: { Authorization: 'Bearer ' + config.secret },
          payload: JSON.stringify({ event: 'sheet-changed' }),
          muteHttpExceptions: true, followRedirects: false,
        });
      } catch (_) {
        if (attempt === 2) throw new Error('Tracker request failed; check backend availability.');
        Utilities.sleep(2000 * (attempt + 1));
        continue;
      }
      const code = response.getResponseCode();
      if (code === 200) {
        let result;
        try { result = JSON.parse(response.getContentText()); } catch (_) {}
        if (result && result.configured && result.syncedAt && !result.error && !result.busy) return;
        throw new Error('Tracker returned an unexpected response. Check the webhook URL and deployment access.');
      }
      if ((code === 409 || code === 429 || code >= 500) && attempt < 2) {
        Utilities.sleep(2000 * (attempt + 1));
        continue;
      }
      // Do not log response bodies, secrets, or spreadsheet contents.
      throw new Error('Tracker sync returned HTTP ' + code + '. Check app sync status and backend configuration.');
    }
  } finally {
    lock.releaseLock();
  }
}
