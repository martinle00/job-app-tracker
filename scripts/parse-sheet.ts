/**
 * Pure CSV -> records translation. No filesystem, no database, so it can be
 * unit tested directly and reasoned about without a running app.
 *
 * Rows that cannot be mapped confidently are collected as errors rather than
 * coerced into a default — see the note in column-map.ts.
 */
import Papa from 'papaparse';
import { displayPersonName, normalisePersonName, parseDate } from '../src/lib/validation';
import { isConsistent, WORK_TYPES, type OutcomeId, type StageId } from '../src/lib/stages';
import {
  normaliseHeader,
  rawStatusText,
  resolveColumns,
  resolveStageAndOutcome,
  type MappableField,
} from './column-map';

export interface ParsedApplication {
  personName: string;
  personDisplayName: string;
  company: string;
  role: string;
  source?: string;
  location?: string;
  workType?: string;
  jobUrl?: string;
  appliedDate?: Date;
  closingDate?: Date;
  lastActivity?: Date;
  furthestStage: StageId;
  outcome: OutcomeId;
  notes?: string;
}

export interface RowError {
  /** 1-based row number as it appears in the spreadsheet, header included. */
  row: number;
  reason: string;
}

export interface ParseResult {
  records: ParsedApplication[];
  errors: RowError[];
  /** Distinct funnel-column wordings that had no mapping, for column-map.ts. */
  unmappedStatuses: string[];
  /** Model fields that no sheet column fed. */
  missingColumns: MappableField[];
  columns: Partial<Record<MappableField, string>>;
}

const REQUIRED_COLUMNS: MappableField[] = ['person', 'company', 'role'];

function cell(row: Record<string, string>, header: string | undefined): string {
  if (!header) return '';
  return (row[header] ?? '').trim();
}

export function parseSheet(csvText: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });

  const headers = parsed.meta.fields ?? [];
  const columns = resolveColumns(headers);

  const missingColumns = REQUIRED_COLUMNS.filter((field) => !columns[field]);
  const hasFunnelColumns = Boolean(
    columns.response || columns.stage || columns.offer || columns.accepted || columns.status,
  );
  if (!hasFunnelColumns) missingColumns.push('response');

  const records: ParsedApplication[] = [];
  const errors: RowError[] = [];
  const unmapped = new Set<string>();

  if (missingColumns.length > 0) {
    return { records, errors, unmappedStatuses: [], missingColumns, columns };
  }

  parsed.data.forEach((row, index) => {
    // +2: one for the header row, one to get from 0- to 1-based numbering.
    const rowNumber = index + 2;

    const personRaw = cell(row, columns.person);
    const company = cell(row, columns.company);
    const role = cell(row, columns.role);

    // The sheet carries a block of empty rows below the data; they are not
    // mistakes, so they are skipped without being reported.
    if (!personRaw && !company && !role) return;

    if (!personRaw || !company || !role) {
      errors.push({ row: rowNumber, reason: 'Missing person, company or role' });
      return;
    }

    const mapping = resolveStageAndOutcome(row, columns);
    if (!mapping) {
      const raw = rawStatusText(row, columns);
      unmapped.add(raw || '(blank)');
      errors.push({ row: rowNumber, reason: `Unmapped funnel values: ${raw || '(blank)'}` });
      return;
    }

    if (!isConsistent(mapping.furthestStage, mapping.outcome)) {
      errors.push({
        row: rowNumber,
        reason: `Outcome ${mapping.outcome} is not reachable from stage ${mapping.furthestStage}`,
      });
      return;
    }

    const dates: Record<string, Date | undefined> = {};
    let badDate = false;
    for (const field of ['appliedDate', 'closingDate', 'lastActivity'] as const) {
      const raw = cell(row, columns[field]);
      if (!raw) continue;
      const parsedDate = parseDate(raw);
      if (!parsedDate) {
        errors.push({ row: rowNumber, reason: `Unreadable ${field} date: "${raw}"` });
        badDate = true;
        break;
      }
      dates[field] = parsedDate;
    }
    if (badDate) return;

    // The applied date is what separates a sent application from a shortlisted
    // one, so a disagreement between the two is a data problem worth reporting.
    if (mapping.outcome === 'NOT_APPLIED' && dates.appliedDate) {
      errors.push({
        row: rowNumber,
        reason: 'Marked "not yet applied" but has an application date',
      });
      return;
    }
    if (mapping.outcome !== 'NOT_APPLIED' && !dates.appliedDate) {
      errors.push({
        row: rowNumber,
        reason: 'Has funnel progress but no application date',
      });
      return;
    }

    const workTypeRaw = normaliseHeader(cell(row, columns.workType));
    const workType = (WORK_TYPES as readonly string[]).includes(workTypeRaw) ? workTypeRaw : undefined;

    records.push({
      personName: normalisePersonName(personRaw),
      personDisplayName: displayPersonName(personRaw),
      company,
      role,
      source: cell(row, columns.source) || undefined,
      location: cell(row, columns.location) || undefined,
      workType,
      jobUrl: cell(row, columns.jobUrl) || undefined,
      appliedDate: dates.appliedDate,
      closingDate: dates.closingDate,
      lastActivity: dates.lastActivity,
      furthestStage: mapping.furthestStage,
      outcome: mapping.outcome,
      notes: cell(row, columns.notes) || undefined,
    });
  });

  return {
    records,
    errors,
    unmappedStatuses: [...unmapped].sort(),
    missingColumns,
    columns,
  };
}
