import { createHash } from 'node:crypto';
import { prisma } from './db';
import { getSheetConfig, parseSheetValues, readGoogleSheet } from './google-sheet';

type SyncState = {
  checkedAt: number;
  syncedAt: string | null;
  applicationIds: string[];
  error: string | null;
};

function stateKey(config: { spreadsheetId: string; range: string }) {
  return 'sheet-sync:' + createHash('sha256')
    .update(JSON.stringify([config.spreadsheetId, config.range])).digest('hex');
}

export async function getSheetSyncStatus() {
  const config = getSheetConfig();
  if (!config) return { configured: false, syncedAt: null, error: null };
  const saved = await prisma.setting.findUnique({ where: { key: stateKey(config) } });
  const state: SyncState | null = saved ? JSON.parse(saved.value) : null;
  return { configured: true, syncedAt: state?.syncedAt ?? null, error: state?.error ?? null };
}

export async function syncGoogleSheet() {
  const config = getSheetConfig();
  if (!config) return { configured: false, syncedAt: null, error: null };
  const key = stateKey(config);

  return prisma.$transaction(async (tx) => {
    // Coordinate tabs and serverless instances using a transaction-scoped lock.
    const [lock] = await tx.$queryRaw<{ acquired: boolean }[]>`
      SELECT pg_try_advisory_xact_lock(726483901) AS acquired
    `;
    const saved = await tx.setting.findUnique({ where: { key } });
    const state: SyncState = saved ? JSON.parse(saved.value) : {
      checkedAt: 0, syncedAt: null, applicationIds: [], error: null,
    };
    const status = () => ({ configured: true, syncedAt: state.syncedAt, error: state.error });
    // Never acknowledge an event as synced when another transaction blocked it.
    if (!lock.acquired) return { ...status(), busy: true };

    state.checkedAt = Date.now();
    let records;
    try {
      records = parseSheetValues(await readGoogleSheet(config));
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Google Sheets sync failed.';
      await tx.setting.upsert({ where: { key }, create: { key, value: JSON.stringify(state) }, update: { value: JSON.stringify(state) } });
      return status();
    }

    const ids: string[] = [];
    for (const record of records) {
      const person = await tx.person.upsert({
        where: { name: record.personName },
        update: {}, // Preserve the display aliases and colours chosen in Settings.
        create: { name: record.personName, displayName: record.personDisplayName },
      });
      const importKey = { personId: person.id, company: record.company, role: record.role };
      const data = {
        source: record.source ?? null, location: record.location ?? null,
        workType: record.workType ?? null, jobUrl: record.jobUrl ?? null,
        appliedDate: record.appliedDate ?? null, closingDate: record.closingDate ?? null,
        lastActivity: record.lastActivity ?? null, furthestStage: record.furthestStage,
        outcome: record.outcome, notes: record.notes ?? null,
      };
      const app = await tx.application.upsert({
        where: { importKey }, create: { ...importKey, ...data }, update: data,
      });
      ids.push(app.id);
    }
    // Delete only records previously managed by this exact sheet and range.
    // Header-only sheets intentionally represent an empty snapshot.
    const currentIds = new Set(ids);
    const removed = state.applicationIds.filter((id) => !currentIds.has(id));
    if (removed.length) await tx.application.deleteMany({ where: { id: { in: removed } } });
    state.applicationIds = ids;
    state.syncedAt = new Date().toISOString();
    state.error = null;
    await tx.setting.upsert({ where: { key }, create: { key, value: JSON.stringify(state) }, update: { value: JSON.stringify(state) } });
    return status();
  }, { maxWait: 5000, timeout: 55000 });
}
