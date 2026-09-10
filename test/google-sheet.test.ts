import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSheetConfig, parseSheetValues } from '../src/lib/google-sheet';

const headers = ['Person', 'Company', 'Role Title', 'Application Date', 'Response', 'Notes'];
const row = ['Ada', 'Acme', 'Engineer', '06/09/2026', 'Nothing Yet'];

afterEach(() => vi.unstubAllEnvs());

describe('Google sheet snapshots', () => {
  it('pads omitted trailing cells and preserves day-first dates and quoted content', () => {
    const [record] = parseSheetValues([headers, [...row, 'Hello, "team"\nNext line']]);
    expect(record.notes).toBe('Hello, "team"\nNext line');
    expect(record.appliedDate?.toISOString()).toBe('2026-09-06T00:00:00.000Z');
    expect(parseSheetValues([headers, row])[0].notes).toBeUndefined();
  });
  it('rejects an entire snapshot when a row has an unknown status', () => {
    expect(() => parseSheetValues([headers, row, ['Ada', 'Other', 'Engineer', '06/09/2026', 'Mystery']])).toThrow('3');
  });
  it('rejects duplicate normalized identities', () => {
    expect(() => parseSheetValues([headers, row, [' ADA ', ...row.slice(1)]])).toThrow('duplicate person');
  });
  it('allows a header-only snapshot but rejects a blank or malformed sheet', () => {
    expect(parseSheetValues([headers])).toEqual([]);
    expect(() => parseSheetValues([])).toThrow('header');
    expect(() => parseSheetValues([['Person', 'Company']])).toThrow('Missing');
    expect(() => parseSheetValues([[...headers, 'Person'], row])).toThrow('duplicate column');
    expect(() => parseSheetValues([headers, [...row, 'notes', 'extra']])).toThrow('without headers');
  });
  it('disables sync without an ID and rejects incomplete credentials', () => {
    vi.stubEnv('GOOGLE_SHEETS_ID', '');
    expect(getSheetConfig()).toBeNull();
    vi.stubEnv('GOOGLE_SHEETS_ID', 'abc');
    vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL', '');
    expect(() => getSheetConfig()).toThrow('environment');
  });
});
