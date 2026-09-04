import { describe, expect, it } from 'vitest';
import { buildSankey, outcomeNodeId, type SankeyInput } from '../src/lib/sankey';
import { STAGES } from '../src/lib/stages';

const app = (furthestStage: string, outcome: string): SankeyInput => ({ furthestStage, outcome });

/** Sum of every link entering a node, and every link leaving it. */
function flows(links: { source: string; target: string; value: number }[], node: string) {
  const inflow = links.filter((l) => l.target === node).reduce((sum, l) => sum + l.value, 0);
  const outflow = links.filter((l) => l.source === node).reduce((sum, l) => sum + l.value, 0);
  return { inflow, outflow };
}

describe('buildSankey', () => {
  it('returns an empty graph for no applications', () => {
    const graph = buildSankey([]);
    expect(graph.nodes).toEqual([]);
    expect(graph.links).toEqual([]);
    expect(graph.total).toBe(0);
  });

  it('walks a single application up every rung and out to its outcome', () => {
    const graph = buildSankey([app('INTERVIEW_2', 'REJECTED')]);

    expect(graph.links).toEqual([
      { source: 'APPLIED', target: 'RESPONSE', value: 1 },
      { source: 'RESPONSE', target: 'ONLINE_ASSESSMENT', value: 1 },
      { source: 'ONLINE_ASSESSMENT', target: 'INTERVIEW_1', value: 1 },
      { source: 'INTERVIEW_1', target: 'INTERVIEW_2', value: 1 },
      { source: 'INTERVIEW_2', target: outcomeNodeId('REJECTED'), value: 1 },
    ]);
    expect(graph.total).toBe(1);
  });

  it('emits only an exit link when the application never got a response', () => {
    const graph = buildSankey([app('APPLIED', 'IN_PROGRESS')]);

    expect(graph.links).toEqual([
      { source: 'APPLIED', target: outcomeNodeId('IN_PROGRESS'), value: 1 },
    ]);
  });

  it('holds shortlisted roles out of the funnel and counts them separately', () => {
    const graph = buildSankey([
      app('APPLIED', 'NOT_APPLIED'),
      app('APPLIED', 'NOT_APPLIED'),
      app('OFFER', 'ACCEPTED'),
    ]);

    // The one real application is the whole funnel; the shortlist is not in it.
    expect(graph.total).toBe(1);
    expect(graph.notApplied).toBe(2);
    expect(graph.nodes.some((node) => node.id === outcomeNodeId('NOT_APPLIED'))).toBe(false);
    expect(graph.nodes.find((node) => node.id === 'APPLIED')?.value).toBe(1);
  });

  it('conserves flow: every stage node passes on everything it receives', () => {
    const graph = buildSankey([
      app('APPLIED', 'IN_PROGRESS'),
      app('APPLIED', 'REJECTED'),
      app('RESPONSE', 'IN_PROGRESS'),
      app('INTERVIEW_2', 'REJECTED'),
      app('OFFER', 'ACCEPTED'),
      app('OFFER', 'DECLINED'),
      app('APPLIED', 'NOT_APPLIED'),
    ]);

    // APPLIED has no inflow, so it is checked against the total instead.
    expect(flows(graph.links, 'APPLIED').outflow).toBe(graph.total);

    for (const stage of STAGES.slice(1)) {
      const { inflow, outflow } = flows(graph.links, stage.id);
      expect(outflow, `${stage.id} passes on everything it receives`).toBe(inflow);
    }
  });

  it('every application ends at exactly one outcome node', () => {
    const apps = [
      app('APPLIED', 'REJECTED'),
      app('RESPONSE', 'WITHDRAWN'),
      app('INTERVIEW_1', 'IN_PROGRESS'),
      app('OFFER', 'ACCEPTED'),
    ];
    const graph = buildSankey(apps);

    const intoOutcomes = graph.links
      .filter((link) => link.target.startsWith('OUTCOME_'))
      .reduce((sum, link) => sum + link.value, 0);

    expect(intoOutcomes).toBe(apps.length);
  });

  it('reports node totals as the number of applications passing through', () => {
    const graph = buildSankey([
      app('APPLIED', 'REJECTED'),
      app('INTERVIEW_2', 'REJECTED'),
      app('OFFER', 'ACCEPTED'),
    ]);

    const value = (id: string) => graph.nodes.find((node) => node.id === id)?.value;

    expect(value('APPLIED')).toBe(3);
    expect(value('RESPONSE')).toBe(2);
    expect(value('ONLINE_ASSESSMENT')).toBe(2);
    expect(value('INTERVIEW_1')).toBe(2);
    expect(value('INTERVIEW_2')).toBe(2);
    // Only the offer application climbed past the second round.
    expect(value('INTERVIEW_3')).toBe(1);
    expect(value('INTERVIEW_4')).toBe(1);
    expect(value('OFFER')).toBe(1);
    expect(value(outcomeNodeId('REJECTED'))).toBe(2);
    expect(value(outcomeNodeId('ACCEPTED'))).toBe(1);
  });

  it('omits stages nothing reached, so the layout has no orphan nodes', () => {
    const graph = buildSankey([app('RESPONSE', 'REJECTED')]);

    expect(graph.nodes.map((node) => node.id)).toEqual([
      'APPLIED',
      'RESPONSE',
      outcomeNodeId('REJECTED'),
    ]);
  });

  it('never emits a zero-weight link', () => {
    const graph = buildSankey([app('INTERVIEW_4', 'IN_PROGRESS'), app('APPLIED', 'REJECTED')]);
    expect(graph.links.every((link) => link.value > 0)).toBe(true);
  });

  it('counts unrecognised stages and outcomes as skipped rather than guessing', () => {
    const graph = buildSankey([
      app('APPLIED', 'REJECTED'),
      app('NOT_A_STAGE', 'REJECTED'),
      app('APPLIED', 'NOT_AN_OUTCOME'),
    ]);

    expect(graph.total).toBe(1);
    expect(graph.skipped).toBe(2);
  });
});
