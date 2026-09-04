import { PageHeader } from '@/components/PageHeader';
import { SankeyChart } from '@/components/SankeyChart';
import { nodeColor } from '@/lib/chart-colors';
import { parseFilters, type SearchParams } from '@/lib/filters';
import { getApplications, getFilterOptions } from '@/lib/queries';
import { buildSankey, outcomeNodeId, type SankeyGraph } from '@/lib/sankey';
import { FIRST_INTERVIEW_STAGE, OUTCOMES } from '@/lib/stages';

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
  const scope = selected.length === 0 ? 'Everyone combined' : selected.map((p) => p.displayName).join(', ');

  return (
    <>
      <PageHeader title="Application funnel" scope={scope} />

      <div className="flex-1 overflow-y-auto px-7 pb-10 pt-5">
        <Summary graph={graph} />

        <div className="mb-1 flex items-baseline justify-between gap-3">
          <p className="text-[12.5px] text-muted">
            Click a rung to see those applications in the table. Hover for conversion from the rung
            before.
          </p>
          <span className="text-[11px] uppercase tracking-[0.06em] text-[#b3a897]">
            {graph.total} applications sent
          </span>
        </div>

        <SankeyChart graph={graph} />

        <Legend graph={graph} />

        {graph.notApplied > 0 && (
          <p className="mt-3.5 max-w-[760px] text-[12.5px] leading-5 text-muted">
            {graph.notApplied} shortlisted {graph.notApplied === 1 ? 'role is' : 'roles are'} not on the
            funnel yet — nothing has been sent, so counting them as applications would drag every
            conversion rate down. They stay in the table with their closing dates.
          </p>
        )}

        {graph.skipped > 0 && (
          <p className="mt-3 text-[12.5px] text-warn-fg">
            {graph.skipped} application{graph.skipped === 1 ? '' : 's'} could not be placed on the funnel
            because of an unrecognised stage or outcome, and{' '}
            {graph.skipped === 1 ? 'is' : 'are'} excluded from the chart.
          </p>
        )}

        <FlowTable graph={graph} />
      </div>
    </>
  );
}

function Summary({ graph }: { graph: SankeyGraph }) {
  // Read straight off the graph so the tiles and the ribbons can never
  // disagree — the node value is exactly what flows through that rung.
  const atRung = (stage: string) => graph.nodes.find((n) => n.id === stage)?.value ?? 0;
  // Rates are of applications actually sent; the shortlist is not in the
  // denominator, or every conversion would read low for no reason.
  const rate = (part: number) => (graph.total > 0 ? `${Math.round((part / graph.total) * 100)}%` : '—');

  const tiles = [
    { label: 'Applied', value: graph.total },
    { label: 'Heard back', value: atRung('RESPONSE'), hint: rate(atRung('RESPONSE')) },
    { label: 'Interviewed', value: atRung(FIRST_INTERVIEW_STAGE), hint: rate(atRung(FIRST_INTERVIEW_STAGE)) },
    { label: 'Offers', value: atRung('OFFER'), hint: rate(atRung('OFFER')) },
    { label: 'Not yet applied', value: graph.notApplied },
  ];

  return (
    <dl className="mb-[18px] grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((tile) => (
        <div key={tile.label} className="flex flex-col gap-1.5 rounded-[13px] border border-line bg-surface px-4 py-3.5">
          <dt className="text-[11px] font-medium uppercase tracking-[0.07em] text-faint">{tile.label}</dt>
          <dd className="flex items-baseline gap-2">
            <span className="font-mono text-[25px] leading-7">{tile.value}</span>
            {tile.hint && <span className="text-xs text-faint">{tile.hint}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Colour never carries meaning alone: the nodes are labelled and so is this. */
function Legend({ graph }: { graph: SankeyGraph }) {
  const present = OUTCOMES.filter((outcome) =>
    graph.nodes.some((node) => node.id === outcomeNodeId(outcome.id)),
  );
  if (present.length === 0) return null;

  return (
    <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink2">
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-faint">Outcome</span>
      {present.map((outcome) => (
        <span key={outcome.id} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-[9px] w-[9px] rounded-[3px]"
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
    <details className="mt-6 rounded-card border border-line bg-surface">
      <summary className="cursor-pointer px-4 py-3 text-[13px] font-medium text-ink2">
        Flow table ({graph.links.length} flows)
      </summary>
      <div className="overflow-x-auto border-t border-line2">
        <table className="w-full border-collapse text-[13.5px]">
          <caption className="sr-only">
            Every flow in the application funnel, with counts and share of total.
          </caption>
          <thead className="bg-surface2">
            <tr>
              {['From', 'To', 'Applications', 'Share'].map((head, index) => (
                <th
                  key={head}
                  scope="col"
                  className={`px-4 py-2 text-[11px] font-medium uppercase tracking-[0.07em] text-faint ${index > 1 ? 'text-right' : 'text-left'}`}
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {graph.links.map((link) => (
              <tr key={`${link.source}-${link.target}`} className="border-b border-line3 last:border-0">
                <td className="px-4 py-2">{labelFor(link.source)}</td>
                <td className="px-4 py-2">{labelFor(link.target)}</td>
                <td className="px-4 py-2 text-right font-mono">{link.value}</td>
                <td className="px-4 py-2 text-right font-mono text-faint">
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
