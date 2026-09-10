import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ sync: vi.fn(), status: vi.fn() }));
vi.mock('../src/lib/sheet-sync', () => ({ syncGoogleSheet: mocks.sync, getSheetSyncStatus: mocks.status }));
import { GET, POST } from '../src/app/api/sheets/sync/route';

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('GOOGLE_SHEETS_WEBHOOK_SECRET', 'test-secret');
  mocks.sync.mockResolvedValue({ configured: true, syncedAt: 'now', error: null });
});
afterEach(() => vi.unstubAllEnvs());
function request(token?: string) {
  return new NextRequest('https://tracker.example/api/sheets/sync', {
    method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}
it('rejects missing and incorrect secrets without touching the sheet', async () => {
  expect((await POST(request())).status).toBe(401);
  expect((await POST(request('wrong-secret'))).status).toBe(401);
  expect(mocks.sync).not.toHaveBeenCalled();
});
it('fails closed if the server has no secret configured', async () => {
  vi.stubEnv('GOOGLE_SHEETS_WEBHOOK_SECRET', '');
  expect((await POST(request('test-secret'))).status).toBe(401);
});
it('accepts authenticated Apps Script requests without a browser Origin header', async () => {
  expect((await POST(request('test-secret'))).status).toBe(200);
  expect(mocks.sync).toHaveBeenCalledOnce();
});
it('reports concurrent work as retryable and validation failures as errors', async () => {
  mocks.sync.mockResolvedValue({ configured: true, error: null, busy: true });
  expect((await POST(request('test-secret'))).status).toBe(409);
  mocks.sync.mockResolvedValue({ configured: true, error: 'Invalid rows' });
  expect((await POST(request('test-secret'))).status).toBe(422);
});
it('never leaks internal exceptions', async () => {
  mocks.sync.mockRejectedValue(new Error('private credential'));
  const response = await POST(request('test-secret'));
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain('private credential');
});
it('browser status polling does not trigger a Google read or database mutation', async () => {
  mocks.status.mockResolvedValue({ configured: true, syncedAt: 'now', error: null });
  const response = await GET();
  expect(await response.json()).toMatchObject({ syncedAt: 'now' });
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(mocks.sync).not.toHaveBeenCalled();
});
