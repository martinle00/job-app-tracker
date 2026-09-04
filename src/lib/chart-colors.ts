import { STAGE_IDS, isStageId, stageIndex, type OutcomeId } from './stages';

/**
 * Colour for the funnel diagram.
 *
 * Stage nodes use a single-hue *ordinal* blue ramp — the funnel is an ordered
 * progression, not a set of unrelated categories, so magnitude of progress is
 * encoded by depth of colour. These five steps were checked against the
 * ordinal gates (monotone lightness, adjacent-step gaps >= 0.06, light end
 * clearing 2:1 on a white surface).
 */
const STAGE_RAMP = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281'];

/**
 * Outcome nodes are *states*, so they take the reserved status palette rather
 * than categorical hues — nothing here should read as "just another series".
 *
 * Green/red carries the good/critical convention a funnel reader expects, so
 * identity is deliberately never left to hue alone: every outcome node is
 * directly labelled with its name and count, a legend names each colour, and
 * the flow table below the chart restates the whole graph as text. Withdrew and
 * Declined share a neutral grey because they are the same class of ending — one
 * you chose — and their labels tell them apart; that also keeps the
 * hard-to-separate amber/orange pair off the screen together.
 */
const OUTCOME_COLORS: Record<OutcomeId, string> = {
  IN_PROGRESS: '#4a3aa7', // violet: still live, and clearly not part of the blue ladder
  ACCEPTED: '#0ca30c', // status: good
  REJECTED: '#d03b3b', // status: critical
  GHOSTED: '#ec835a', // status: serious
  WITHDRAWN: '#6f6d66', // neutral: you ended it
  DECLINED: '#6f6d66', // neutral: you ended it
};

export const OUTCOME_NODE_PREFIX = 'OUTCOME_';

export function nodeColor(nodeId: string): string {
  if (isStageId(nodeId)) {
    return STAGE_RAMP[stageIndex(nodeId)] ?? STAGE_RAMP[STAGE_RAMP.length - 1];
  }
  const outcome = nodeId.replace(OUTCOME_NODE_PREFIX, '') as OutcomeId;
  return OUTCOME_COLORS[outcome] ?? '#6f6d66';
}

/** Sanity check that the ramp keeps pace with the ladder if a stage is added. */
export const STAGE_RAMP_COVERS_LADDER = STAGE_RAMP.length >= STAGE_IDS.length;
