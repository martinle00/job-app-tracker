import {
  OUTCOMES,
  STAGES,
  isOutcomeId,
  isStageId,
  stageIndex,
  type OutcomeId,
  type StageId,
} from './stages';

export interface SankeyInput {
  furthestStage: string;
  outcome: string;
}

export interface SankeyNode {
  id: string;
  label: string;
  kind: 'stage' | 'outcome';
  /** Applications passing through this node. */
  value: number;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyGraph {
  nodes: SankeyNode[];
  links: SankeyLink[];
  /** Applications that contributed to the graph, i.e. excluding skipped rows. */
  total: number;
  /** Rows dropped because their stage or outcome was not recognised. */
  skipped: number;
}

/** Outcome nodes are prefixed so they can never collide with a stage id. */
export function outcomeNodeId(outcome: OutcomeId): string {
  return `OUTCOME_${outcome}`;
}

const LINK_KEY_SEPARATOR = '>';

/**
 * Turns a flat list of applications into a Sankey graph.
 *
 * Each application contributes exactly one path: it walks up the stage ladder
 * from Applied to its furthest stage, then exits sideways into its outcome
 * node. That keeps inflow equal to outflow at every stage node, so ribbon
 * widths read as real counts.
 *
 * Pure and DB-free, so it can be unit tested and reused from anywhere.
 */
export function buildSankey(apps: readonly SankeyInput[]): SankeyGraph {
  const linkTotals = new Map<string, number>();
  const nodeTotals = new Map<string, number>();
  let total = 0;
  let skipped = 0;

  const addLink = (source: string, target: string) => {
    const key = `${source}${LINK_KEY_SEPARATOR}${target}`;
    linkTotals.set(key, (linkTotals.get(key) ?? 0) + 1);
  };

  const addNode = (id: string) => {
    nodeTotals.set(id, (nodeTotals.get(id) ?? 0) + 1);
  };

  for (const app of apps) {
    // Anything we cannot place on the ladder is counted, never guessed at.
    if (!isStageId(app.furthestStage) || !isOutcomeId(app.outcome)) {
      skipped += 1;
      continue;
    }

    const stage: StageId = app.furthestStage;
    const outcome: OutcomeId = app.outcome;
    const furthest = stageIndex(stage);
    total += 1;

    // Progression: every rung of the ladder up to the furthest stage reached.
    for (let i = 0; i <= furthest; i += 1) {
      addNode(STAGES[i].id);
      if (i < furthest) addLink(STAGES[i].id, STAGES[i + 1].id);
    }

    // Exit: the single sideways hop into a terminal node.
    const exitNode = outcomeNodeId(outcome);
    addLink(stage, exitNode);
    addNode(exitNode);
  }

  const links: SankeyLink[] = [];
  for (const [key, value] of linkTotals) {
    if (value <= 0) continue; // d3-sankey rejects zero-weight links
    const [source, target] = key.split(LINK_KEY_SEPARATOR);
    links.push({ source, target, value });
  }

  // Only emit nodes that take part in a link. An isolated node makes
  // d3-sankey's layout throw, and there is nothing meaningful to draw anyway.
  const linked = new Set<string>();
  for (const link of links) {
    linked.add(link.source);
    linked.add(link.target);
  }

  const nodes: SankeyNode[] = [];
  for (const stage of STAGES) {
    if (!linked.has(stage.id)) continue;
    nodes.push({
      id: stage.id,
      label: stage.label,
      kind: 'stage',
      value: nodeTotals.get(stage.id) ?? 0,
    });
  }
  for (const outcome of OUTCOMES) {
    const id = outcomeNodeId(outcome.id);
    if (!linked.has(id)) continue;
    nodes.push({
      id,
      label: outcome.label,
      kind: 'outcome',
      value: nodeTotals.get(id) ?? 0,
    });
  }

  return { nodes, links, total, skipped };
}
