/**
 * Everything that knows about the *shape of the exported spreadsheet* lives
 * here. When the real Google Sheet export lands, this is the file to edit —
 * `import-sheet.ts` itself should not need to change.
 *
 * Two things are configured:
 *  1. COLUMN_ALIASES — which sheet headers feed which model field.
 *  2. STATUS_MAP     — how free-text status wording becomes (stage, outcome).
 *
 * Anything unrecognised is reported and its row is skipped. Nothing is ever
 * silently defaulted: a wrong guess here would quietly distort the Sankey.
 */
import type { OutcomeId, StageId } from '../src/lib/stages';

export type MappableField =
  | 'person'
  | 'company'
  | 'role'
  | 'source'
  | 'location'
  | 'workType'
  | 'jobUrl'
  | 'appliedDate'
  | 'lastActivity'
  | 'notes'
  | 'status'
  | 'stage'
  | 'outcome';

/** Header text is compared after lower-casing and stripping non-alphanumerics. */
export function normaliseHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export const COLUMN_ALIASES: Record<MappableField, string[]> = {
  person: ['person', 'name', 'applicant', 'who', 'user', 'candidate'],
  company: ['company', 'employer', 'organisation', 'organization', 'companyname'],
  role: ['role', 'position', 'title', 'jobtitle', 'jobrole'],
  source: ['source', 'via', 'channel', 'jobboard', 'appliedvia', 'where'],
  location: ['location', 'city', 'place', 'office'],
  workType: ['worktype', 'workmode', 'arrangement', 'remote', 'onsiteremote'],
  jobUrl: ['url', 'link', 'joblink', 'joburl', 'posting', 'postinglink'],
  appliedDate: ['applieddate', 'dateapplied', 'date', 'applicationdate', 'appliedon'],
  lastActivity: ['lastactivity', 'lastupdate', 'lastupdated', 'updated', 'lastcontact'],
  notes: ['notes', 'comments', 'note', 'remarks'],
  // A single free-text column covering both progress and result.
  status: ['status', 'progress', 'result', 'currentstatus', 'applicationstatus'],
  // Or two explicit columns, if the sheet separates them.
  stage: ['stage', 'furtheststage', 'stagereached', 'round'],
  outcome: ['outcome', 'finaloutcome', 'resultoutcome'],
};

export interface StatusMapping {
  furthestStage: StageId;
  outcome: OutcomeId;
}

/**
 * Free-text status wording to (furthest stage, outcome).
 *
 * Keys are normalised the same way headers are, so "Phone Screen" and
 * "phone-screen" both hit `phonescreen`.
 */
export const STATUS_MAP: Record<string, StatusMapping> = {
  // Applied, still open.
  applied: { furthestStage: 'APPLIED', outcome: 'IN_PROGRESS' },
  submitted: { furthestStage: 'APPLIED', outcome: 'IN_PROGRESS' },
  pending: { furthestStage: 'APPLIED', outcome: 'IN_PROGRESS' },
  inprogress: { furthestStage: 'APPLIED', outcome: 'IN_PROGRESS' },
  awaitingresponse: { furthestStage: 'APPLIED', outcome: 'IN_PROGRESS' },
  waiting: { furthestStage: 'APPLIED', outcome: 'IN_PROGRESS' },

  // Applied, closed without ever progressing.
  rejected: { furthestStage: 'APPLIED', outcome: 'REJECTED' },
  rejection: { furthestStage: 'APPLIED', outcome: 'REJECTED' },
  unsuccessful: { furthestStage: 'APPLIED', outcome: 'REJECTED' },
  noresponse: { furthestStage: 'APPLIED', outcome: 'GHOSTED' },
  ghosted: { furthestStage: 'APPLIED', outcome: 'GHOSTED' },
  noreply: { furthestStage: 'APPLIED', outcome: 'GHOSTED' },
  withdrawn: { furthestStage: 'APPLIED', outcome: 'WITHDRAWN' },
  withdrew: { furthestStage: 'APPLIED', outcome: 'WITHDRAWN' },

  // Screen.
  screen: { furthestStage: 'SCREEN', outcome: 'IN_PROGRESS' },
  phonescreen: { furthestStage: 'SCREEN', outcome: 'IN_PROGRESS' },
  recruiterscreen: { furthestStage: 'SCREEN', outcome: 'IN_PROGRESS' },
  recruitercall: { furthestStage: 'SCREEN', outcome: 'IN_PROGRESS' },
  screening: { furthestStage: 'SCREEN', outcome: 'IN_PROGRESS' },
  rejectedafterscreen: { furthestStage: 'SCREEN', outcome: 'REJECTED' },

  // Interview.
  interview: { furthestStage: 'INTERVIEW', outcome: 'IN_PROGRESS' },
  interviewing: { furthestStage: 'INTERVIEW', outcome: 'IN_PROGRESS' },
  technicalinterview: { furthestStage: 'INTERVIEW', outcome: 'IN_PROGRESS' },
  assessment: { furthestStage: 'INTERVIEW', outcome: 'IN_PROGRESS' },
  takehome: { furthestStage: 'INTERVIEW', outcome: 'IN_PROGRESS' },
  rejectedafterinterview: { furthestStage: 'INTERVIEW', outcome: 'REJECTED' },

  // Final round.
  final: { furthestStage: 'FINAL', outcome: 'IN_PROGRESS' },
  finalround: { furthestStage: 'FINAL', outcome: 'IN_PROGRESS' },
  onsite: { furthestStage: 'FINAL', outcome: 'IN_PROGRESS' },
  superday: { furthestStage: 'FINAL', outcome: 'IN_PROGRESS' },
  rejectedafterfinal: { furthestStage: 'FINAL', outcome: 'REJECTED' },

  // Offer.
  offer: { furthestStage: 'OFFER', outcome: 'IN_PROGRESS' },
  offerreceived: { furthestStage: 'OFFER', outcome: 'IN_PROGRESS' },
  accepted: { furthestStage: 'OFFER', outcome: 'ACCEPTED' },
  offeraccepted: { furthestStage: 'OFFER', outcome: 'ACCEPTED' },
  declined: { furthestStage: 'OFFER', outcome: 'DECLINED' },
  offerdeclined: { furthestStage: 'OFFER', outcome: 'DECLINED' },
};

export const STAGE_ALIASES: Record<string, StageId> = {
  applied: 'APPLIED',
  application: 'APPLIED',
  screen: 'SCREEN',
  phonescreen: 'SCREEN',
  recruiterscreen: 'SCREEN',
  interview: 'INTERVIEW',
  technical: 'INTERVIEW',
  final: 'FINAL',
  finalround: 'FINAL',
  onsite: 'FINAL',
  offer: 'OFFER',
};

export const OUTCOME_ALIASES: Record<string, OutcomeId> = {
  active: 'IN_PROGRESS',
  inprogress: 'IN_PROGRESS',
  open: 'IN_PROGRESS',
  pending: 'IN_PROGRESS',
  rejected: 'REJECTED',
  unsuccessful: 'REJECTED',
  ghosted: 'GHOSTED',
  noresponse: 'GHOSTED',
  withdrawn: 'WITHDRAWN',
  withdrew: 'WITHDRAWN',
  declined: 'DECLINED',
  accepted: 'ACCEPTED',
};

/** Maps the sheet's headers onto model fields; unknown headers are ignored. */
export function resolveColumns(headers: readonly string[]): Partial<Record<MappableField, string>> {
  const resolved: Partial<Record<MappableField, string>> = {};

  for (const header of headers) {
    const key = normaliseHeader(header);
    if (!key) continue;
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES) as [MappableField, string[]][]) {
      if (resolved[field]) continue;
      if (aliases.includes(key)) {
        resolved[field] = header;
        break;
      }
    }
  }

  return resolved;
}

/**
 * Resolves a row's stage and outcome, preferring explicit stage/outcome columns
 * over a single free-text status column. Returns null when the wording is not
 * recognised so the caller can report it.
 */
export function resolveStageAndOutcome(
  row: Record<string, string>,
  columns: Partial<Record<MappableField, string>>,
): StatusMapping | null {
  if (columns.stage && columns.outcome) {
    const stage = STAGE_ALIASES[normaliseHeader(row[columns.stage] ?? '')];
    const outcome = OUTCOME_ALIASES[normaliseHeader(row[columns.outcome] ?? '')];
    if (stage && outcome) return { furthestStage: stage, outcome };
    return null;
  }

  if (columns.status) {
    return STATUS_MAP[normaliseHeader(row[columns.status] ?? '')] ?? null;
  }

  return null;
}

/** The raw text a row used for its status, for reporting unmapped values. */
export function rawStatusText(
  row: Record<string, string>,
  columns: Partial<Record<MappableField, string>>,
): string {
  if (columns.stage && columns.outcome) {
    return `${row[columns.stage] ?? ''} / ${row[columns.outcome] ?? ''}`.trim();
  }
  if (columns.status) return (row[columns.status] ?? '').trim();
  return '';
}
