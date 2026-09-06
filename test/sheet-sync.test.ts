import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  config: vi.fn(), read: vi.fn(),
  tx: {
    $queryRaw: vi.fn(),
    setting: { findUnique: vi.fn(), upsert: vi.fn() },
    person: { upsert: vi.fn() },
    application: { upsert: vi.fn(), deleteMany: vi.fn() },
  },
}));
vi.mock('../src/lib/db', () => ({ prisma: {
  $transaction: (fn: (tx: typeof mocks.tx) => unknown) => fn(mocks.tx),
} }));
vi.mock('../src/lib/google-sheet', async (original) => ({
  ...await original<typeof import('../src/lib/google-sheet')>(),
  getSheetConfig: mocks.config, readGoogleSheet: mocks.read,
}));
import { syncGoogleSheet } from '../src/lib/sheet-sync';

const headers = ['Person', 'Company', 'Role', 'Application Date', 'Response'];
beforeEach(() => {
  vi.resetAllMocks();
  mocks.config.mockReturnValue({ spreadsheetId: 'test', range: 'Sheet1!A:Z' });
  mocks.tx.$queryRaw.mockResolvedValue([{ acquired: true }]);
  mocks.tx.setting.findUnique.mockResolvedValue({ value: JSON.stringify({
    checkedAt: 0, syncedAt: 'previous', applicationIds: ['kept', 'removed'], error: null,
  }) });
  mocks.read.mockResolvedValue([headers, ['Ada', 'Acme', 'Engineer', '06/09/2026', 'Nothing Yet']]);
  mocks.tx.person.upsert.mockResolvedValue({ id: 'ada' });
  mocks.tx.application.upsert.mockResolvedValue({ id: 'kept' });
});

it('upserts sheet fields, preserves person aliases, and deletes only previously managed missing rows', async () => {
  const result = await syncGoogleSheet();
  expect(result.error).toBeNull();
  expect(mocks.tx.person.upsert.mock.calls[0][0].update).toEqual({});
  expect(mocks.tx.application.upsert.mock.calls[0][0]).toMatchObject({
    where: { importKey: { personId: 'ada', company: 'Acme', role: 'Engineer' } },
    update: { outcome: 'IN_PROGRESS', notes: null },
  });
  expect(mocks.tx.application.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['removed'] } } });
});

it('retains last successful data on invalid rows', async () => {
  mocks.read.mockResolvedValue([headers, ['Ada', 'Acme', 'Engineer', '', 'Mystery']]);
  const result = await syncGoogleSheet();
  expect(result.error).toBeTruthy();
  expect(result.syncedAt).toBe('previous');
  expect(mocks.tx.application.upsert).not.toHaveBeenCalled();
  expect(mocks.tx.application.deleteMany).not.toHaveBeenCalled();
});

it('skips Google reads when another instance holds the lock', async () => {
  mocks.tx.$queryRaw.mockResolvedValue([{ acquired: false }]);
  await syncGoogleSheet();
  expect(mocks.read).not.toHaveBeenCalled();
});

it('processes consecutive edits without dropping events to a cooldown', async () => {
  mocks.tx.setting.findUnique.mockResolvedValue({ value: JSON.stringify({ checkedAt: Date.now(), syncedAt: 'previous', applicationIds: [], error: null }) });
  await syncGoogleSheet();
  expect(mocks.read).toHaveBeenCalledOnce();
});

it('removes managed rows for a valid empty snapshot', async () => {
  mocks.read.mockResolvedValue([headers]);
  await syncGoogleSheet();
  expect(mocks.tx.application.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['kept', 'removed'] } } });
});
