/**
 * The single source of truth for the application funnel.
 *
 * STAGES is an *ordered ladder*: an application that reached index N is assumed
 * to have passed through every stage before it. That assumption is what lets the
 * Sankey chart be derived from a single `furthestStage` field per application
 * rather than a full event log.
 *
 * Order is positional and load-bearing. Inserting a stage in the middle changes
 * the meaning of stored data and needs a migration, not just a code edit.
 */
export const STAGES = [
  { id: 'APPLIED', label: 'Applied' },
  { id: 'SCREEN', label: 'Recruiter screen' },
  { id: 'INTERVIEW', label: 'Interview' },
  { id: 'FINAL', label: 'Final round' },
  { id: 'OFFER', label: 'Offer' },
] as const;

export type StageId = (typeof STAGES)[number]['id'];

export const STAGE_IDS = STAGES.map((s) => s.id) as readonly StageId[];

/**
 * How an application ended (or that it hasn't). Every application sits at
 * exactly one outcome, so these become the terminal nodes of the Sankey.
 */
export const OUTCOMES = [
  { id: 'IN_PROGRESS', label: 'Active', terminal: false, tone: 'active' },
  { id: 'REJECTED', label: 'Rejected', terminal: true, tone: 'negative' },
  { id: 'GHOSTED', label: 'No response', terminal: true, tone: 'muted' },
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
 * An application can only be ACCEPTED or DECLINED if it actually reached an
 * offer. Enforced at every write path so the Sankey can't be asked to draw a
 * flow that makes no sense.
 */
export function isConsistent(stage: StageId, outcome: OutcomeId): boolean {
  if (outcome === 'ACCEPTED' || outcome === 'DECLINED') return stage === 'OFFER';
  return true;
}
