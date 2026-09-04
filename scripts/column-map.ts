/**
 * Everything that knows about the *shape of the exported spreadsheet* lives
 * here. `import-sheet.ts` and `parse-sheet.ts` should not need to change when
 * the sheet grows a column or a new dropdown value.
 *
 * The sheet tracks progress across four columns rather than one status:
 *
 *   Person | Company | Role Title | Application Date | Closing Date
 *          | Response | Stage | Offer | Accepted
 *
 * Response says whether they heard back, Stage which interview round they got
 * to, and Offer/Accepted how it ended. `resolveStageAndOutcome` reads all four
 * and returns the furthest rung plus the outcome.
 *
 * Anything unrecognised is reported and its row is skipped. Nothing is ever
 * silently defaulted: a wrong guess here would quietly distort the funnel.
 */
import { stageIndex, type OutcomeId, type StageId } from '../src/lib/stages';

export type MappableField =
  | 'person'
  | 'company'
  | 'role'
  | 'source'
  | 'location'
  | 'workType'
  | 'jobUrl'
  | 'appliedDate'
  | 'closingDate'
  | 'lastActivity'
  | 'notes'
  | 'response'
  | 'stage'
  | 'offer'
  | 'accepted'
  | 'status';

/** Header and cell text are compared after lower-casing and stripping punctuation. */
export function normaliseHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export const COLUMN_ALIASES: Record<MappableField, string[]> = {
  person: ['person', 'name', 'applicant', 'who', 'user', 'candidate'],
  company: ['company', 'employer', 'organisation', 'organization', 'companyname'],
  role: ['roletitle', 'role', 'position', 'title', 'jobtitle', 'jobrole'],
  source: ['source', 'via', 'channel', 'jobboard', 'appliedvia', 'where'],
  location: ['location', 'city', 'place', 'office'],
  workType: ['worktype', 'workmode', 'arrangement', 'onsiteremote'],
  jobUrl: ['url', 'link', 'joblink', 'joburl', 'posting', 'postinglink'],
  appliedDate: ['applicationdate', 'applieddate', 'dateapplied', 'appliedon', 'date'],
  closingDate: ['closingdate', 'closes', 'closedate', 'deadline', 'applicationsclose'],
  lastActivity: ['lastactivity', 'lastupdate', 'lastupdated', 'updated', 'lastcontact'],
  notes: ['notes', 'comments', 'note', 'remarks'],

  // The four funnel columns.
  response: ['response', 'reply', 'responsereceived'],
  stage: ['stage', 'round', 'interviewstage', 'stagereached', 'furtheststage'],
  offer: ['offer', 'offerreceived', 'offermade'],
  accepted: ['accepted', 'acceptedoffer', 'didaccept'],

  // Fallback for a sheet that uses a single free-text status column instead.
  status: ['status', 'progress', 'currentstatus', 'applicationstatus'],
};

export interface StatusMapping {
  furthestStage: StageId;
  outcome: OutcomeId;
}

/**
 * `Response` values.
 *
 * `stage` is the furthest rung the response alone proves. `outcome` is what it
 * says about how things ended — undefined means "no verdict yet", leaving the
 * Offer and Accepted columns to decide.
 */
export const RESPONSE_MAP: Record<string, { stage: StageId; outcome?: OutcomeId }> = {
  notyetapplied: { stage: 'APPLIED', outcome: 'NOT_APPLIED' },
  notapplied: { stage: 'APPLIED', outcome: 'NOT_APPLIED' },
  toapply: { stage: 'APPLIED', outcome: 'NOT_APPLIED' },

  nothingyet: { stage: 'APPLIED' },
  noresponse: { stage: 'APPLIED' },
  noreply: { stage: 'APPLIED' },
  awaitingresponse: { stage: 'APPLIED' },
  waiting: { stage: 'APPLIED' },

  positiveemail: { stage: 'RESPONSE' },
  positivephonecall: { stage: 'RESPONSE' },
  positivecall: { stage: 'RESPONSE' },
  positiveresponse: { stage: 'RESPONSE' },
  positive: { stage: 'RESPONSE' },

  // A rejection at the response stage: they replied, and it was a no.
  rejectionemail: { stage: 'APPLIED', outcome: 'REJECTED' },
  rejection: { stage: 'APPLIED', outcome: 'REJECTED' },
  rejected: { stage: 'APPLIED', outcome: 'REJECTED' },
  negativeemail: { stage: 'APPLIED', outcome: 'REJECTED' },
  unsuccessful: { stage: 'APPLIED', outcome: 'REJECTED' },

  withdrawn: { stage: 'APPLIED', outcome: 'WITHDRAWN' },
  withdrew: { stage: 'APPLIED', outcome: 'WITHDRAWN' },
};

/**
 * `Stage` values — the sheet's Stage dropdown, verbatim.
 *
 * `stage` is the rung the value proves, or null when it proves nothing beyond
 * whatever Response already established. Two of the options are outcomes
 * rather than rungs:
 *
 *  - "Interview Failed"   — the company said no *after* an interview, so it
 *                           also proves at least a first round happened.
 *  - "Interview Declined" — the candidate turned the process down. It claims
 *                           no interview took place, only that one was offered,
 *                           which the Response column already records.
 *
 * The Stage column holds a single value, so selecting either of those
 * overwrites which round was reached. "Interview Failed" therefore lands on the
 * *first* round — the least it can mean — rather than guessing higher.
 */
export const STAGE_MAP: Record<string, { stage: StageId | null; outcome?: OutcomeId }> = {
  waiting: { stage: null },
  na: { stage: null },
  none: { stage: null },

  onlineassessment: { stage: 'ONLINE_ASSESSMENT' },
  oa: { stage: 'ONLINE_ASSESSMENT' },

  '1stfacetoface': { stage: 'INTERVIEW_1' },
  '2ndfacetoface': { stage: 'INTERVIEW_2' },
  '3rdfacetoface': { stage: 'INTERVIEW_3' },
  '4thfacetoface': { stage: 'INTERVIEW_4' },

  interviewfailed: { stage: 'INTERVIEW_1', outcome: 'REJECTED' },
  interviewdeclined: { stage: null, outcome: 'WITHDRAWN' },

  offer: { stage: 'OFFER' },
};

/** Yes/no columns (`Offer`, `Accepted`). Blank means "not decided yet". */
export const YES_NO_MAP: Record<string, boolean> = {
  yes: true,
  y: true,
  true: true,
  received: true,
  no: false,
  n: false,
  false: false,
  declined: false,
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

function cell(row: Record<string, string>, header: string | undefined): string {
  if (!header) return '';
  return normaliseHeader(row[header] ?? '');
}

/**
 * Reads Response, Stage, Offer and Accepted together and returns the furthest
 * rung reached plus the outcome. Returns null when a value is not recognised,
 * so the caller can report it rather than assume.
 *
 * The columns are read as evidence and the furthest one wins: an Offer of "Yes"
 * proves the Offer rung whatever Stage says, because the sheet is filled in by
 * hand and a later column is the more recent truth.
 */
export function resolveStageAndOutcome(
  row: Record<string, string>,
  columns: Partial<Record<MappableField, string>>,
): StatusMapping | null {
  const responseText = cell(row, columns.response);
  const stageText = cell(row, columns.stage);
  const offerText = cell(row, columns.offer);
  const acceptedText = cell(row, columns.accepted);

  // A sheet with none of the funnel columns is not one we can read.
  if (!columns.response && !columns.stage && !columns.offer && !columns.accepted) return null;

  let stage: StageId = 'APPLIED';
  let outcome: OutcomeId | undefined;

  if (responseText) {
    const response = RESPONSE_MAP[responseText];
    if (!response) return null;
    stage = response.stage;
    outcome = response.outcome;
  }

  // A shortlisted row is not on the funnel at all; later columns cannot apply.
  if (outcome === 'NOT_APPLIED') return { furthestStage: 'APPLIED', outcome };

  if (stageText) {
    const mapped = STAGE_MAP[stageText];
    if (!mapped) return null;
    if (mapped.stage && rung(mapped.stage) > rung(stage)) stage = mapped.stage;
    // A later column is the more recent truth, so the Stage column's verdict
    // wins over one the Response column had already implied.
    if (mapped.outcome) outcome = mapped.outcome;
  }

  if (offerText) {
    const offered = YES_NO_MAP[offerText];
    if (offered === undefined) return null;
    if (offered) {
      stage = 'OFFER';
      // Still theirs to accept until the Accepted column says otherwise.
      outcome = outcome ?? 'IN_PROGRESS';
    } else {
      // An explicit "No" is a decision: they did not get it. A blank means the
      // question is still open, which is why only an explicit value lands here.
      outcome = 'REJECTED';
    }
  }

  if (acceptedText) {
    const accepted = YES_NO_MAP[acceptedText];
    if (accepted === undefined) return null;
    stage = 'OFFER';
    outcome = accepted ? 'ACCEPTED' : 'DECLINED';
  }

  return { furthestStage: stage, outcome: outcome ?? 'IN_PROGRESS' };
}

function rung(stage: StageId): number {
  return stageIndex(stage);
}

/** The raw text a row used, for reporting values that could not be mapped. */
export function rawStatusText(
  row: Record<string, string>,
  columns: Partial<Record<MappableField, string>>,
): string {
  const parts: string[] = [];
  const add = (label: string, header: string | undefined) => {
    const value = header ? (row[header] ?? '').trim() : '';
    if (value) parts.push(`${label}=${value}`);
  };
  add('Response', columns.response);
  add('Stage', columns.stage);
  add('Offer', columns.offer);
  add('Accepted', columns.accepted);
  return parts.join(', ');
}
