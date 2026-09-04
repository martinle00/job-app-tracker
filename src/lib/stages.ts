/**
 * The single source of truth for the application funnel.
 *
 * The shape mirrors the tracking spreadsheet, which records progress across
 * four columns — Response, Stage, Offer, Accepted — rather than one status.
 * The Stage dropdown's rounds become their own rungs so the chart shows where
 * people drop out between interviews, not just that they interviewed:
 *
 *   Applied -> Response -> Online assessment -> 1st..4th round -> Offer
 *
 * Two of that dropdown's values — "Interview Failed" and "Interview Declined" —
 * are outcomes rather than rungs, and are mapped as such in column-map.ts.
 *
 * STAGES is an *ordered ladder*: an application that reached index N is assumed
 * to have passed through every stage before it. That assumption is what lets
 * the funnel chart be derived from a single `furthestStage` per application
 * rather than a full event log.
 *
 * Order is positional and load-bearing. Inserting a stage in the middle changes
 * the meaning of stored data and needs a migration, not just a code edit.
 */
export const STAGES = [
  { id: 'APPLIED', label: 'Applied' },
  { id: 'RESPONSE', label: 'Response' },
  { id: 'ONLINE_ASSESSMENT', label: 'Online assessment' },
  { id: 'INTERVIEW_1', label: '1st round' },
  { id: 'INTERVIEW_2', label: '2nd round' },
  { id: 'INTERVIEW_3', label: '3rd round' },
  { id: 'INTERVIEW_4', label: '4th round' },
  { id: 'OFFER', label: 'Offer' },
] as const;

export type StageId = (typeof STAGES)[number]['id'];

export const STAGE_IDS = STAGES.map((s) => s.id) as readonly StageId[];

/** The first interview round — the rung "did they interview at all" asks about. */
export const FIRST_INTERVIEW_STAGE: StageId = 'INTERVIEW_1';

/**
 * How an application ended, or that it hasn't — or, for NOT_APPLIED, that it
 * hasn't started. Every application sits at exactly one outcome, so these
 * become the terminal nodes of the funnel.
 */
export const OUTCOMES = [
  { id: 'NOT_APPLIED', label: 'Not yet applied', terminal: false, tone: 'muted' },
  { id: 'IN_PROGRESS', label: 'Active', terminal: false, tone: 'active' },
  { id: 'REJECTED', label: 'Rejected', terminal: true, tone: 'negative' },
  { id: 'WITHDRAWN', label: 'Withdrew', terminal: true, tone: 'muted' },
  { id: 'DECLINED', label: 'Declined offer', terminal: true, tone: 'neutral' },
  { id: 'ACCEPTED', label: 'Accepted', terminal: true, tone: 'positive' },
] as const;

export type OutcomeId = (typeof OUTCOMES)[number]['id'];

export const OUTCOME_IDS = OUTCOMES.map((o) => o.id) as readonly OutcomeId[];

export const WORK_TYPES = ['onsite', 'hybrid', 'remote'] as const;
export type WorkType = (typeof WORK_TYPES)[number];

export function stageIndex(id: StageId): number {
  return STAGE_IDS.indexOf(id);
}

export function stageLabel(id: string): string {
  return STAGES.find((s) => s.id === id)?.label ?? id;
}

export function outcomeLabel(id: string): string {
  return OUTCOMES.find((o) => o.id === id)?.label ?? id;
}

export function isStageId(value: unknown): value is StageId {
  return typeof value === 'string' && (STAGE_IDS as readonly string[]).includes(value);
}

export function isOutcomeId(value: unknown): value is OutcomeId {
  return typeof value === 'string' && (OUTCOME_IDS as readonly string[]).includes(value);
}

/**
 * Rows on the shortlist that have not been sent yet. They are real rows in the
 * tracker — with a closing date to work towards — but they are not part of the
 * funnel, because nothing has flowed through it yet.
 */
export function isApplied(outcome: string): boolean {
  return outcome !== 'NOT_APPLIED';
}

/**
 * Guards combinations the funnel could not draw honestly:
 * an offer outcome without an offer, or a shortlist row claiming progress.
 */
export function isConsistent(stage: StageId, outcome: OutcomeId): boolean {
  if (outcome === 'ACCEPTED' || outcome === 'DECLINED') return stage === 'OFFER';
  if (outcome === 'NOT_APPLIED') return stage === 'APPLIED';
  return true;
}
