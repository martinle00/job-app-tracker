import { STAGE_IDS, isStageId, type OutcomeId, type StageId } from './stages';

/**
 * Colour for the funnel diagram, re-toned to the warm shell.
 *
 * Stage nodes use a single-hue *ordinal* clay ramp — the funnel is an ordered
 * progression, not a set of unrelated categories, so depth of colour encodes
 * how far along a rung is. These five steps keep lightness monotone with
 * adjacent gaps wide enough to read, and the light end still clears contrast
 * against the paper surface.
 *
 * The ladder has eight rungs but only five steps, because a single hue cannot
 * carry eight distinguishable ordinal levels. So colour encodes the *phase* and
 * the four interview rounds share a step: they are one phase, and the round is
 * carried by each node's own label and its position along the chart, which is
 * the primary encoding in a Sankey anyway.
 */
const PHASE_RAMP = ['#e6cdb4', '#d3ab86', '#bc8760', '#9d6741', '#7b4a2b'];

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
 * The pairs are muted into the warm shell but keep the good/critical
 * convention a funnel reader expects; identity is never left to hue alone, as
 * every node is directly labelled and a legend names each colour. Withdrew and
 * Declined share a neutral because they are the same class of ending — one you
 * chose — and their labels tell them apart.
 */
const OUTCOME_COLORS: Record<OutcomeId, string> = {
  IN_PROGRESS: '#6d6597', // iris: still live, and clearly not part of the clay ladder
  ACCEPTED: '#4f7a48', // status: good
  REJECTED: '#a8564c', // status: critical
  WITHDRAWN: '#9a9084', // neutral: you ended it
  DECLINED: '#9a9084', // neutral: you ended it
  // Never drawn — shortlisted roles are held out of the funnel — but it keeps
  // the record total and gives the backlog tile a colour to match.
  NOT_APPLIED: '#b3a897',
};

/** Dot colours offered per person in Settings. Same chroma, varied hue. */
export const PERSON_COLORS = ['#a3623f', '#8a6420', '#4f7a48', '#6d6597', '#8e463d', '#4d7080'];

/** Accent choices offered in Settings, with the names shown beside them. */
export const ACCENT_CHOICES = [
  { value: '#a3623f', label: 'Clay' },
  { value: '#8a6420', label: 'Ochre' },
  { value: '#4f7a48', label: 'Olive' },
  { value: '#6d6597', label: 'Iris' },
  { value: '#8e463d', label: 'Brick' },
  { value: '#2a2622', label: 'Ink' },
];

export const OUTCOME_NODE_PREFIX = 'OUTCOME_';

export function nodeColor(nodeId: string): string {
  if (isStageId(nodeId)) {
    return PHASE_RAMP[STAGE_PHASE[nodeId]] ?? PHASE_RAMP[PHASE_RAMP.length - 1];
  }
  const outcome = nodeId.replace(OUTCOME_NODE_PREFIX, '') as OutcomeId;
  return OUTCOME_COLORS[outcome] ?? '#9a9084';
}

/** The ramp step for a stage, for the table's progress track. */
export function stageColor(stage: string): string {
  return isStageId(stage) ? PHASE_RAMP[STAGE_PHASE[stage]] : '#efe6d9';
}

/** Fails loudly at import time if a new rung is added without a phase. */
export const EVERY_STAGE_HAS_A_PHASE = STAGE_IDS.every((id) => STAGE_PHASE[id] !== undefined);
