import { Suspense } from 'react';
import { FilterBar } from '@/components/FilterBar';
import { SankeyChart } from '@/components/SankeyChart';
import { nodeColor } from '@/lib/chart-colors';
import { parseFilters, type SearchParams } from '@/lib/filters';
import { getApplications, getFilterOptions } from '@/lib/queries';
import { buildSankey, outcomeNodeId, type SankeyGraph } from '@/lib/sankey';
import { OUTCOMES } from '@/lib/stages';

export const dynamic = 'force-dynamic';

export default async function SankeyPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const filters = parseFilters(await searchParams);
  const [rows, options] = await Promise.all([getApplications(filters), getFilterOptions()]);
  const graph = buildSankey(rows);

  const selected = options.people.filter((p) => filters.people.includes(p.name));
  const scope =
    selected.length === 0
      ? 'Everyone'
      : selected.map((p) => p.displayName).join(', ');

  return (
    <>
      <Suspense fallback={null}>
        <FilterBar people={options.people} sources={options.sources} />
      </Suspense>

      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h1 className="text-xl font-semibold">Application funnel</h1>
        <p className="text-sm text-slate-500">{scope}</p>
      </div>

      <Summary graph={graph} />

      <SankeyChart graph={graph} />

      <Legend graph={graph} />

      {graph.notApplied > 0 && (
        <p className="mt-3 text-sm text-slate-600">
          {graph.notApplied} shortlisted {graph.notApplied === 1 ? 'role is' : 'roles are'} not on
          the funnel yet — nothing has been sent, so counting them as applications would understate
          every conversion rate. They are in the table.
        </p>
      )}

      {graph.skipped > 0 && (
        <p className="mt-3 text-sm text-amber-700">
          {graph.skipped} application{graph.skipped === 1 ? '' : 's'} could not be placed on the
          funnel because of an unrecognised stage or outcome, and {graph.skipped === 1 ? 'is' : 'are'}{' '}
          excluded from the chart.
        </p>
      )}

      <FlowTable graph={graph} />
    </>
  );
}

function Summary({ graph }: { graph: SankeyGraph }) {
  // Read straight off the graph so the tiles and the ribbons can never
  // disagree — the node value is exactly what flows through that rung.
  const atRung = (stage: string) => graph.nodes.find((n) => n.id === stage)?.value ?? 0;
  const responded = atRung('RESPONSE');
  const interviewed = atRung('INTERVIEW');
  const offers = atRung('OFFER');

  // Rates are of applications actually sent; the shortlist is not in the
  // denominator, or every conversion would read low for no reason.
  const rate = (part: number) =>
    graph.total > 0 ? `${Math.round((part / graph.total) * 100)}%` : '—';

  return (
    <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
      <Stat label="Applied" value={String(graph.total)} />
      <Stat label="Heard back" value={String(responded)} hint={rate(responded)} />
      <Stat label="Interviewed" value={String(interviewed)} hint={rate(interviewed)} />
      <Stat label="Offers" value={String(offers)} hint={rate(offers)} />
      <Stat label="Not yet applied" value={String(graph.notApplied)} />
    </dl>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
        {hint && <span className="text-sm text-slate-500">{hint}</span>}
      </dd>
    </div>
  );
}

/** Colour never carries meaning alone: the nodes are labelled and so is this. */
function Legend({ graph }: { graph: SankeyGraph }) {
  // Only name the outcomes actually on screen. Each keeps its own fixed colour
  // regardless of which others are present, so filtering never repaints them.
  const present = OUTCOMES.filter((outcome) =>
    graph.nodes.some((node) => node.id === outcomeNodeId(outcome.id)),
  );

  if (present.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
      <span className="font-medium uppercase tracking-wide text-slate-500">Outcome</span>
      {present.map((outcome) => (
        <span key={outcome.id} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: nodeColor(outcomeNodeId(outcome.id)) }}
          />
          {outcome.label}
        </span>
      ))}
    </div>
  );
}

/** The chart restated as text — the accessible equivalent of the diagram. */
function FlowTable({ graph }: { graph: SankeyGraph }) {
  if (graph.links.length === 0) return null;

  const labelFor = (id: string) => graph.nodes.find((node) => node.id === id)?.label ?? id;

  return (
    <details className="mt-6 rounded-lg border border-slate-200 bg-white">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700">
        Flow table ({graph.links.length} flows)
      </summary>
      <div className="overflow-x-auto border-t border-slate-100">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            Every flow in the application funnel, with counts and share of total.
          </caption>
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                From
              </th>
              <th scope="col" className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                To
              </th>
              <th scope="col" className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Applications
              </th>
              <th scope="col" className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Share
              </th>
            </tr>
          </thead>
          <tbody>
            {graph.links.map((link) => (
              <tr key={`${link.source}-${link.target}`} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2">{labelFor(link.source)}</td>
                <td className="px-4 py-2">{labelFor(link.target)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{link.value}</td>
                <td className="px-4 py-2 text-right tabular-nums text-slate-500">
                  {graph.total > 0 ? `${Math.round((link.value / graph.total) * 100)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
