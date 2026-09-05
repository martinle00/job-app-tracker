'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { nodeColor, stageColor } from '@/lib/chart-colors';
import { outcomeNodeId, type SankeyGraph } from '@/lib/sankey';
import { OUTCOMES, isStageId } from '@/lib/stages';

interface Props {
  graph: SankeyGraph;
}

/**
 * The funnel as a vertical ladder. A Sankey needs horizontal room to be read at
 * all, and at 390px there isn't any — so the phone default is the same numbers
 * as bars: length is share of applications sent, and the right-hand percentage
 * is conversion from the rung before, which is the number a funnel is read for.
 *
 * Rungs and outcomes both drill into the filtered list, exactly like clicking a
 * node on the diagram.
 */
export function StageLadder({ graph }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const stages = graph.nodes.filter((node) => node.kind === 'stage');

  const drillDown = (key: 'stage' | 'outcome', value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('stage');
    next.delete('outcome');
    next.append(key, value);
    router.push(`/applications?${next.toString()}`);
  };

  const share = (value: number) => (graph.total > 0 ? (value / graph.total) * 100 : 0);

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-card border border-line bg-surface p-4 md:p-5">
        <h2 className="font-serif text-[18px]">Stage by stage</h2>
        <p className="mt-1 text-[12.5px] leading-5 text-muted">
          Tap a rung to see those applications in the list. Percentages are conversion from the rung
          before.
        </p>

        <ol className="mt-4 flex flex-col gap-3.5">
          {stages.map((node, index) => {
            const previous = stages[index - 1];
            const conversion =
              previous && previous.value > 0 ? Math.round((node.value / previous.value) * 100) : null;
            return (
              <li key={node.id}>
                <button
                  type="button"
                  onClick={() => isStageId(node.id) && drillDown('stage', node.id)}
                  className="flex w-full flex-col gap-1.5 text-left"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="flex items-baseline gap-2">
                      <span className="text-[14.5px] text-ink">{node.label}</span>
                      <span className="font-mono text-[13px] text-muted">{node.value}</span>
                    </span>
                    <span className="font-mono text-[13px] text-clayDeep">
                      {index === 0 ? '100%' : conversion !== null ? `${conversion}%` : '—'}
                    </span>
                  </span>
                  <span className="flex h-2 w-full overflow-hidden rounded-full bg-[#efe6d9]">
                    <span
                      className="h-full rounded-full"
                      style={{ width: `${share(node.value)}%`, background: stageColor(node.id) }}
                    />
                  </span>
                </button>
              </li>
            );
          })}
          {stages.length === 0 && (
            <li className="py-6 text-center text-[13px] text-faint">
              No applications match the current filters.
            </li>
          )}
        </ol>
      </section>

      <OutcomeBreakdown graph={graph} onDrill={(id) => drillDown('outcome', id)} />
    </div>
  );
}

/** Where applications ended, as counts against the same denominator. */
function OutcomeBreakdown({
  graph,
  onDrill,
}: {
  graph: SankeyGraph;
  onDrill: (outcome: string) => void;
}) {
  const present = OUTCOMES.map((outcome) => {
    const node = graph.nodes.find((n) => n.id === outcomeNodeId(outcome.id));
    return node ? { ...outcome, value: node.value } : null;
  }).filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  if (present.length === 0) return null;

  const max = Math.max(...present.map((entry) => entry.value), 1);

  return (
    <section className="rounded-card border border-line bg-surface p-4 md:p-5">
      <h2 className="font-serif text-[18px]">Where they ended</h2>
      <ul className="mt-3.5 flex flex-col gap-3">
        {present.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => onDrill(entry.id)}
              className="flex w-full items-center gap-3 text-left"
            >
              <span
                aria-hidden
                className="h-2.5 w-2.5 flex-none rounded-full"
                style={{ background: nodeColor(outcomeNodeId(entry.id)) }}
              />
              <span className="w-[104px] flex-none truncate text-[14px] text-ink2">{entry.label}</span>
              <span className="flex h-2 flex-1 overflow-hidden rounded-full bg-[#efe6d9]">
                <span
                  className="h-full rounded-full"
                  style={{
                    width: `${(entry.value / max) * 100}%`,
                    background: nodeColor(outcomeNodeId(entry.id)),
                  }}
                />
              </span>
              <span className="w-6 flex-none text-right font-mono text-[13px] text-muted">
                {entry.value}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
