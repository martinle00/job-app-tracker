'use client';

import { useState, useSyncExternalStore } from 'react';
import type { SankeyGraph } from '@/lib/sankey';
import { SankeyChart } from './SankeyChart';
import { StageLadder } from './StageLadder';

interface Props {
  graph: SankeyGraph;
  /** The outcome legend, rendered on the server alongside the chart. */
  legend: React.ReactNode;
}

type Mode = 'ladder' | 'sankey';

const DESKTOP = '(min-width: 768px)';

/**
 * Switching on a media query rather than on `hidden md:block`, because the
 * Sankey measures its own container: a CSS-hidden copy reports zero width and
 * nivo then derives negative SVG dimensions from it. Only ever mount the one
 * that is actually visible.
 */
function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(DESKTOP);
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    },
    () => window.matchMedia(DESKTOP).matches,
    // Server render assumes the narrow layout — the safer default, since it
    // never mounts a chart into a container it cannot measure.
    () => false,
  );
}

/**
 * Two readings of the same funnel. The ladder leads on a phone because it
 * survives a narrow screen and answers "where do they drop out" directly; the
 * Sankey shows flows between rungs, which needs width, so it gets a
 * horizontally scrolling canvas rather than being squeezed into one.
 */
export function FunnelView({ graph, legend }: Props) {
  const [mode, setMode] = useState<Mode>('ladder');
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <>
        <SankeyChart graph={graph} />
        {legend}
        <div className="mt-5">
          <StageLadder graph={graph} />
        </div>
      </>
    );
  }

  return (
    <>
      <div
        role="tablist"
        aria-label="Funnel view"
        className="mb-4 flex gap-1 rounded-[12px] border border-line bg-surface p-1"
      >
        {(['ladder', 'sankey'] as const).map((option) => (
          <button
            key={option}
            role="tab"
            aria-selected={mode === option}
            onClick={() => setMode(option)}
            className={`flex-1 rounded-[9px] px-3 py-2.5 text-[14px] capitalize ${
              mode === option ? 'bg-[#f0e6d8] font-medium text-ink' : 'text-muted'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {mode === 'ladder' ? (
        <StageLadder graph={graph} />
      ) : (
        <section className="rounded-card border border-line bg-surface p-4">
          <h2 className="font-serif text-[18px]">Where they flow</h2>
          <p className="mt-1 text-[12.5px] leading-5 text-muted">
            Scroll sideways to follow the flow. Tap a bar to see those applications in the list.
          </p>
          {/* Keeps its desktop geometry and scrolls, rather than compressing to
              a width where the ribbons stop reading. */}
          <div className="-mx-4 mt-3 overflow-x-auto px-4">
            <div className="w-[920px]">
              <SankeyChart graph={graph} />
            </div>
          </div>
          <div className="mt-3">{legend}</div>
        </section>
      )}
    </>
  );
}
