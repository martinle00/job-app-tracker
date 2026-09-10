import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it, vi } from 'vitest';

const script = readFileSync(new URL('../scripts/google-sheets-trigger.gs', import.meta.url), 'utf8');
function harness(codes: number[]) {
  const fetch = vi.fn(() => ({
    getResponseCode: () => codes.shift() ?? 200,
    getContentText: () => JSON.stringify({ configured: true, syncedAt: 'now', error: null }),
  }));
  const releaseLock = vi.fn();
  const sleep = vi.fn();
  const context = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (key: string) => key === 'TRACKER_WEBHOOK_URL' ? 'https://tracker.example/api/sheets/sync' : 'test-secret' }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock }) },
    UrlFetchApp: { fetch }, Utilities: { sleep },
  };
  runInNewContext(script, context);
  return { context, fetch, releaseLock, sleep };
}
it('Apps Script sends an authenticated POST and retries a busy backend', () => {
  const h = harness([409, 200]);
  runInNewContext('syncTracker()', h.context);
  expect(h.fetch).toHaveBeenCalledTimes(2);
  expect(h.fetch).toHaveBeenCalledWith('https://tracker.example/api/sheets/sync', expect.objectContaining({
    method: 'post', headers: { Authorization: 'Bearer test-secret' }, followRedirects: false,
  }));
  expect(h.releaseLock).toHaveBeenCalledOnce();
});
it('Apps Script reports validation failures and releases its lock', () => {
  const h = harness([422]);
  expect(() => runInNewContext('syncTracker()', h.context)).toThrow('HTTP 422');
  expect(h.fetch).toHaveBeenCalledOnce();
  expect(h.releaseLock).toHaveBeenCalledOnce();
});
it('Apps Script avoids a duplicate notification from the change trigger on cell edits', () => {
  const h = harness([200]);
  runInNewContext("trackerChanged({ changeType: 'EDIT' })", h.context);
  expect(h.fetch).not.toHaveBeenCalled();
  runInNewContext("trackerChanged({ changeType: 'REMOVE_ROW' })", h.context);
  expect(h.fetch).toHaveBeenCalledOnce();
});
