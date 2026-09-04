import { STAGE_IDS, isStageId, type OutcomeId, type StageId } from './stages';

/**
 * Colour for the funnel diagram.
 *
 * Stage nodes use a single-hue *ordinal* blue ramp — the funnel is an ordered
 * progression, not a set of unrelated categories, so depth of colour encodes
 * how far along a rung is. These five steps pass the ordinal gates (monotone
 * lightness, adjacent-step gaps >= 0.06, light end clearing 2:1 on a white
 * surface).
 *
 * The ladder has eight rungs but only five steps, because a single hue cannot
 * carry eight distinguishable ordinal levels — squeezing eight steps into the
 * usable range puts adjacent pairs below the lightness gate. So colour encodes
 * the *phase* and the four interview rounds share a step: they are one phase,
 * and the round is carried by each node's own label and its position along the
 * chart, which is the primary encoding in a Sankey anyway.
 */
const PHASE_RAMP = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281'];

const STAGE_PHASE: Record<StageId, number> = {
  APPLIED: 0,
  RESPONSE: 1,
  ONLINE_ASSESSMENT: 2,
  INTERVIEW_1: 3,
  INTERVIEW_2: 3,
  INTERVIEW_3: 3,
  INTERVIEW_4: 3,
  OFFER: 4,
};

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
  WITHDRAWN: '#6f6d66', // neutral: you ended it
  DECLINED: '#6f6d66', // neutral: you ended it
  // Never drawn — shortlisted roles are held out of the funnel — but it keeps
  // the record total and gives the backlog tile a colour to match.
  NOT_APPLIED: '#a8a69d',
};

export const OUTCOME_NODE_PREFIX = 'OUTCOME_';

export function nodeColor(nodeId: string): string {
  if (isStageId(nodeId)) {
    return PHASE_RAMP[STAGE_PHASE[nodeId]] ?? PHASE_RAMP[PHASE_RAMP.length - 1];
  }
  const outcome = nodeId.replace(OUTCOME_NODE_PREFIX, '') as OutcomeId;
  return OUTCOME_COLORS[outcome] ?? '#6f6d66';
}

/** Fails loudly at import time if a new rung is added without a phase. */
export const EVERY_STAGE_HAS_A_PHASE = STAGE_IDS.every((id) => STAGE_PHASE[id] !== undefined);
