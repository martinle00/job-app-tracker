import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveColumns, resolveStageAndOutcome } from '../scripts/column-map';
import { parseSheet } from '../scripts/parse-sheet';

const SAMPLE = readFileSync(new URL('./fixtures/sample.csv', import.meta.url), 'utf8');

describe('resolveColumns', () => {
  it('matches headers regardless of case, spacing and punctuation', () => {
    const columns = resolveColumns(['  Date Applied ', 'company', 'JOB-TITLE', 'Who']);

    expect(columns.appliedDate).toBe('  Date Applied ');
    expect(columns.company).toBe('company');
    expect(columns.role).toBe('JOB-TITLE');
    expect(columns.person).toBe('Who');
  });

  it('ignores headers it does not recognise', () => {
    expect(resolveColumns(['Salary expectation'])).toEqual({});
  });
});

describe('resolveStageAndOutcome', () => {
  const statusColumns = { status: 'Status' };

  it('maps free-text statuses onto the ladder', () => {
    expect(resolveStageAndOutcome({ Status: 'Phone Screen' }, statusColumns)).toEqual({
      furthestStage: 'SCREEN',
      outcome: 'IN_PROGRESS',
    });
    expect(resolveStageAndOutcome({ Status: 'Offer Accepted' }, statusColumns)).toEqual({
      furthestStage: 'OFFER',
      outcome: 'ACCEPTED',
    });
  });

  it('returns null for wording it does not know, rather than defaulting', () => {
    expect(resolveStageAndOutcome({ Status: 'Coffee chat' }, statusColumns)).toBeNull();
    expect(resolveStageAndOutcome({ Status: '' }, statusColumns)).toBeNull();
  });

  it('prefers explicit stage and outcome columns when the sheet has both', () => {
    const columns = { stage: 'Stage', outcome: 'Outcome' };
    expect(resolveStageAndOutcome({ Stage: 'Final round', Outcome: 'Rejected' }, columns)).toEqual({
      furthestStage: 'FINAL',
      outcome: 'REJECTED',
    });
  });
});

describe('parseSheet', () => {
  it('reads the sample export in full', () => {
    const result = parseSheet(SAMPLE);

    expect(result.missingColumns).toEqual([]);
    expect(result.errors).toEqual([]);
    expect(result.records).toHaveLength(15);

    const first = result.records[0];
    expect(first.personDisplayName).toBe('Alex Chen');
    expect(first.company).toBe('Atlassian');
    expect(first.appliedDate.toISOString().slice(0, 10)).toBe('2025-01-14');
    expect(first.furthestStage).toBe('APPLIED');
    expect(first.outcome).toBe('REJECTED');
  });

  it('normalises person names so casing and spacing do not split a person in two', () => {
    const csv = 'Name,Company,Role,Date Applied,Status\n  alex   CHEN ,Canva,Dev,2025-01-01,Applied\n';
    const [record] = parseSheet(csv).records;

    expect(record.personName).toBe('alex chen');
    expect(record.personDisplayName).toBe('alex CHEN');
  });

  it('reports missing columns instead of importing a partial row', () => {
    const result = parseSheet('Company,Role\nCanva,Dev\n');

    expect(result.records).toEqual([]);
    expect(result.missingColumns).toContain('person');
    expect(result.missingColumns).toContain('appliedDate');
    expect(result.missingColumns).toContain('status');
  });

  it('collects unmapped statuses for the maintainer instead of dropping them silently', () => {
    const csv =
      'Name,Company,Role,Date Applied,Status\n' +
      'Alex,Canva,Dev,2025-01-01,Coffee chat\n' +
      'Alex,Figma,Dev,2025-01-02,Applied\n';
    const result = parseSheet(csv);

    expect(result.records).toHaveLength(1);
    expect(result.unmappedStatuses).toEqual(['Coffee chat']);
    expect(result.errors[0].row).toBe(2);
  });

  it('accepts the date formats a spreadsheet export tends to produce', () => {
    const csv =
      'Name,Company,Role,Date Applied,Status\n' +
      'Alex,A,Dev,14/03/2025,Applied\n' +
      'Alex,B,Dev,2025-03-14,Applied\n';
    const dates = parseSheet(csv).records.map((r) => r.appliedDate.toISOString().slice(0, 10));

    expect(dates).toEqual(['2025-03-14', '2025-03-14']);
  });

  it('reports an unreadable date rather than importing the row', () => {
    const csv = 'Name,Company,Role,Date Applied,Status\nAlex,Canva,Dev,sometime,Applied\n';
    const result = parseSheet(csv);

    expect(result.records).toEqual([]);
    expect(result.errors[0].reason).toContain('Unreadable applied date');
  });

  it('rejects an outcome that could not have happened at that stage', () => {
    const csv =
      'Name,Company,Role,Date Applied,Stage,Outcome\nAlex,Canva,Dev,2025-01-01,Interview,Accepted\n';
    const result = parseSheet(csv);

    expect(result.records).toEqual([]);
    expect(result.errors[0].reason).toContain('not reachable');
  });

  it('skips trailing blank rows without reporting them', () => {
    const csv = 'Name,Company,Role,Date Applied,Status\nAlex,Canva,Dev,2025-01-01,Applied\n,,,,\n';
    const result = parseSheet(csv);

    expect(result.records).toHaveLength(1);
    expect(result.errors).toEqual([]);
  });
});
