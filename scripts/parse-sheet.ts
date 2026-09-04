/**
 * Pure CSV -> records translation. No filesystem, no database, so it can be
 * unit tested directly and reasoned about without a running app.
 *
 * Rows that cannot be mapped confidently are collected as errors rather than
 * coerced into a default — see the note in column-map.ts.
 */
import Papa from 'papaparse';
import {
  displayPersonName,
  normalisePersonName,
  parseDate,
} from '../src/lib/validation';
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
  appliedDate: Date;
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
  /** Distinct status wordings that had no mapping, for updating column-map.ts. */
  unmappedStatuses: string[];
  /** Model fields that no sheet column fed. */
  missingColumns: MappableField[];
  columns: Partial<Record<MappableField, string>>;
}

const REQUIRED_COLUMNS: MappableField[] = ['person', 'company', 'role', 'appliedDate'];

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
  const hasStatusSource = Boolean(columns.status || (columns.stage && columns.outcome));
  if (!hasStatusSource) missingColumns.push('status');

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

    // A trailing blank row in an export is not worth reporting.
    if (!personRaw && !company && !role) return;

    if (!personRaw || !company || !role) {
      errors.push({ row: rowNumber, reason: 'Missing person, company or role' });
      return;
    }

    const appliedDate = parseDate(cell(row, columns.appliedDate));
    if (!appliedDate) {
      errors.push({
        row: rowNumber,
        reason: `Unreadable applied date: "${cell(row, columns.appliedDate)}"`,
      });
      return;
    }

    const mapping = resolveStageAndOutcome(row, columns);
    if (!mapping) {
      const raw = rawStatusText(row, columns);
      unmapped.add(raw || '(blank)');
      errors.push({ row: rowNumber, reason: `Unmapped status: "${raw || '(blank)'}"` });
      return;
    }

    if (!isConsistent(mapping.furthestStage, mapping.outcome)) {
      errors.push({
        row: rowNumber,
        reason: `Outcome ${mapping.outcome} is not reachable from stage ${mapping.furthestStage}`,
      });
      return;
    }

    const lastActivityRaw = cell(row, columns.lastActivity);
    const lastActivity = lastActivityRaw ? parseDate(lastActivityRaw) : undefined;
    if (lastActivityRaw && !lastActivity) {
      errors.push({ row: rowNumber, reason: `Unreadable last-activity date: "${lastActivityRaw}"` });
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
      appliedDate,
      lastActivity,
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
