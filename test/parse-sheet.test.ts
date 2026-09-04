import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveColumns, resolveStageAndOutcome } from '../scripts/column-map';
import { parseSheet } from '../scripts/parse-sheet';

const SAMPLE = readFileSync(new URL('./fixtures/sample.csv', import.meta.url), 'utf8');

/** The sheet's own header names, so the mapping is tested against reality. */
const SHEET_COLUMNS = {
  person: 'Person',
  company: 'Company',
  role: 'Role Title',
  appliedDate: 'Application Date',
  closingDate: 'Closing Date',
  response: 'Response',
  stage: 'Stage',
  offer: 'Offer',
  accepted: 'Accepted',
};

describe('resolveColumns', () => {
  it('maps the sheet headers as written', () => {
    const columns = resolveColumns([
      'Person',
      'Company',
      'Role Title',
      'Application Date',
      'Closing Date',
      'Response',
      'Stage',
      'Offer',
      'Accepted',
    ]);

    expect(columns).toEqual(SHEET_COLUMNS);
  });

  it('matches headers regardless of case, spacing and punctuation', () => {
    const columns = resolveColumns(['  application date ', 'company', 'JOB-TITLE', 'Who']);

    expect(columns.appliedDate).toBe('  application date ');
    expect(columns.role).toBe('JOB-TITLE');
    expect(columns.person).toBe('Who');
  });

  it('ignores headers it does not recognise', () => {
    expect(resolveColumns(['Salary expectation'])).toEqual({});
  });
});

describe('resolveStageAndOutcome', () => {
  const resolve = (row: Record<string, string>) => resolveStageAndOutcome(row, SHEET_COLUMNS);

  it('treats "Nothing Yet" as applied and still open', () => {
    expect(resolve({ Response: 'Nothing Yet' })).toEqual({
      furthestStage: 'APPLIED',
      outcome: 'IN_PROGRESS',
    });
  });

  it('treats a positive response as a rung reached', () => {
    expect(resolve({ Response: 'Positive Email' })).toEqual({
      furthestStage: 'RESPONSE',
      outcome: 'IN_PROGRESS',
    });
    expect(resolve({ Response: 'Positive Phone Call', Stage: 'Waiting' })).toEqual({
      furthestStage: 'RESPONSE',
      outcome: 'IN_PROGRESS',
    });
  });

  it('maps every value in the sheet\'s Stage dropdown', () => {
    const at = (Stage: string) => resolve({ Response: 'Positive Email', Stage });

    expect(at('Waiting')).toEqual({ furthestStage: 'RESPONSE', outcome: 'IN_PROGRESS' });
    expect(at('Online Assessment')).toEqual({
      furthestStage: 'ONLINE_ASSESSMENT',
      outcome: 'IN_PROGRESS',
    });
    expect(at('1st Face-to-Face')).toEqual({ furthestStage: 'INTERVIEW_1', outcome: 'IN_PROGRESS' });
    expect(at('2nd Face-to-Face')).toEqual({ furthestStage: 'INTERVIEW_2', outcome: 'IN_PROGRESS' });
    expect(at('3rd Face-to-Face')).toEqual({ furthestStage: 'INTERVIEW_3', outcome: 'IN_PROGRESS' });
    expect(at('4th Face-to-Face')).toEqual({ furthestStage: 'INTERVIEW_4', outcome: 'IN_PROGRESS' });
    expect(at('Interview Failed')).toEqual({ furthestStage: 'INTERVIEW_1', outcome: 'REJECTED' });
    expect(at('Interview Declined')).toEqual({ furthestStage: 'RESPONSE', outcome: 'WITHDRAWN' });
  });

  it('reads the round regardless of how the sheet punctuates it', () => {
    expect(resolve({ Response: 'Positive Email', Stage: '1st face-to-face' })?.furthestStage).toBe(
      'INTERVIEW_1',
    );
  });

  it('does not let "Interview Declined" claim an interview happened', () => {
    // The candidate turned the process down; only the invitation is evidence,
    // and the Response column already accounts for that.
    expect(resolve({ Response: 'Positive Phone Call', Stage: 'Interview Declined' })).toEqual({
      furthestStage: 'RESPONSE',
      outcome: 'WITHDRAWN',
    });
  });

  it('reads "Offer: No" as a rejection at the furthest stage reached', () => {
    expect(resolve({ Response: 'Positive Email', Stage: '3rd Face-to-Face', Offer: 'No' })).toEqual({
      furthestStage: 'INTERVIEW_3',
      outcome: 'REJECTED',
    });
  });

  it('reads "Offer: Yes" as reaching the offer rung, still undecided', () => {
    expect(resolve({ Response: 'Positive Email', Offer: 'Yes' })).toEqual({
      furthestStage: 'OFFER',
      outcome: 'IN_PROGRESS',
    });
  });

  it('lets the Accepted column settle the outcome', () => {
    expect(resolve({ Response: 'Positive Email', Offer: 'Yes', Accepted: 'Yes' })).toEqual({
      furthestStage: 'OFFER',
      outcome: 'ACCEPTED',
    });
    expect(resolve({ Response: 'Positive Email', Offer: 'Yes', Accepted: 'No' })).toEqual({
      furthestStage: 'OFFER',
      outcome: 'DECLINED',
    });
  });

  it('holds "Not yet applied" at the start of the funnel', () => {
    expect(resolve({ Response: 'Not yet applied' })).toEqual({
      furthestStage: 'APPLIED',
      outcome: 'NOT_APPLIED',
    });
  });

  it('does not let a stray later column promote a row nobody has applied to', () => {
    expect(resolve({ Response: 'Not yet applied', Stage: '1st Face-to-Face', Offer: 'Yes' })).toEqual({
      furthestStage: 'APPLIED',
      outcome: 'NOT_APPLIED',
    });
  });

  it('returns null for wording it does not know, rather than defaulting', () => {
    expect(resolve({ Response: 'Coffee chat' })).toBeNull();
    expect(resolve({ Response: 'Nothing Yet', Stage: 'Hackathon' })).toBeNull();
    expect(resolve({ Response: 'Nothing Yet', Offer: 'Maybe' })).toBeNull();
  });

  it('treats a blank row as applied and open, since the sheet leaves them empty', () => {
    expect(resolve({})).toEqual({ furthestStage: 'APPLIED', outcome: 'IN_PROGRESS' });
  });
});

describe('parseSheet', () => {
  it('reads the sample export in full', () => {
    const result = parseSheet(SAMPLE);

    expect(result.missingColumns).toEqual([]);
    expect(result.errors).toEqual([]);
    expect(result.records).toHaveLength(11);

    const accc = result.records[0];
    expect(accc.personDisplayName).toBe('Nushan');
    expect(accc.company).toBe('ACCC');
    expect(accc.furthestStage).toBe('INTERVIEW_1');
    expect(accc.outcome).toBe('REJECTED');
    // 08/04/2025 is day-first: 8 April, not 4 August.
    expect(accc.appliedDate?.toISOString().slice(0, 10)).toBe('2025-04-08');
  });

  it('leaves shortlisted rows without an applied date', () => {
    const shortlisted = parseSheet(SAMPLE).records.filter((r) => r.outcome === 'NOT_APPLIED');

    expect(shortlisted).toHaveLength(3);
    expect(shortlisted.every((r) => r.appliedDate === undefined)).toBe(true);
  });

  it('keeps the closing date where the sheet has one', () => {
    const ato = parseSheet(SAMPLE).records.find((r) => r.company === 'ATO');
    expect(ato?.closingDate?.toISOString().slice(0, 10)).toBe('2026-09-17');
  });

  it('reads dates day-first, including single-digit months', () => {
    const tfnsw = parseSheet(SAMPLE).records.find(
      (r) => r.role === 'Project Performance Reporting Analyst',
    );
    // "29/8/2026"
    expect(tfnsw?.appliedDate?.toISOString().slice(0, 10)).toBe('2026-08-29');
  });

  it('normalises person names so casing and spacing do not split a person in two', () => {
    const csv = 'Person,Company,Role Title,Application Date,Response\n  nushan   K ,Canva,Dev,01/02/2026,Nothing Yet\n';
    const [record] = parseSheet(csv).records;

    expect(record.personName).toBe('nushan k');
    expect(record.personDisplayName).toBe('nushan K');
  });

  it('reports missing columns instead of importing a partial row', () => {
    const result = parseSheet('Company,Role Title\nCanva,Dev\n');

    expect(result.records).toEqual([]);
    expect(result.missingColumns).toContain('person');
    expect(result.missingColumns).toContain('response');
  });

  it('collects unmapped values for the maintainer instead of dropping them silently', () => {
    const csv =
      'Person,Company,Role Title,Application Date,Response\n' +
      'Nushan,Canva,Dev,01/02/2026,Coffee chat\n' +
      'Nushan,Figma,Dev,02/02/2026,Nothing Yet\n';
    const result = parseSheet(csv);

    expect(result.records).toHaveLength(1);
    expect(result.unmappedStatuses).toEqual(['Response=Coffee chat']);
    expect(result.errors[0].row).toBe(2);
  });

  it('reports an unreadable date rather than importing the row', () => {
    const csv = 'Person,Company,Role Title,Application Date,Response\nNushan,Canva,Dev,sometime,Nothing Yet\n';
    const result = parseSheet(csv);

    expect(result.records).toEqual([]);
    expect(result.errors[0].reason).toContain('Unreadable appliedDate date');
  });

  it('flags a row that claims progress but has no application date', () => {
    const csv = 'Person,Company,Role Title,Application Date,Response\nNushan,Canva,Dev,,Positive Email\n';
    const result = parseSheet(csv);

    expect(result.records).toEqual([]);
    expect(result.errors[0].reason).toContain('no application date');
  });

  it('flags a row marked not-yet-applied that already has an application date', () => {
    const csv =
      'Person,Company,Role Title,Application Date,Response\nNushan,Canva,Dev,01/02/2026,Not yet applied\n';
    const result = parseSheet(csv);

    expect(result.records).toEqual([]);
    expect(result.errors[0].reason).toContain('has an application date');
  });

  it('skips the sheet\'s trailing empty rows without reporting them', () => {
    const csv =
      'Person,Company,Role Title,Application Date,Response\n' +
      'Nushan,Canva,Dev,01/02/2026,Nothing Yet\n' +
      ',,,,\n,,,,\n';
    const result = parseSheet(csv);

    expect(result.records).toHaveLength(1);
    expect(result.errors).toEqual([]);
  });
});
