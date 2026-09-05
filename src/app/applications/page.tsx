import { ApplicationsView } from '@/components/ApplicationsView';
import { parseFilters, type SearchParams } from '@/lib/filters';
import { getApplications, getFilterOptions, getPeople } from '@/lib/queries';
import { isStageId, stageIndex } from '@/lib/stages';
import { closingStatus, daysSince } from '@/lib/urgency';

export const dynamic = 'force-dynamic';

/** A row is worth chasing when it is live and nothing has happened in a while. */
const STALE_DAYS = 14;

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const filters = parseFilters(await searchParams);
  const [rows, options, people] = await Promise.all([
    getApplications(filters),
    getFilterOptions(),
    getPeople(),
  ]);

  const total = options.people.reduce((sum, person) => sum + person.count, 0);
  const selected = options.people.filter((p) => filters.people.includes(p.name));
  const scope = selected.length === 0 ? 'Everyone combined' : selected.map((p) => p.displayName).join(', ');

  const live = rows.filter((row) => row.outcome === 'IN_PROGRESS');
  const stale = live.filter((row) => {
    const since = daysSince(row.lastActivity ?? row.appliedDate);
    return since !== null && since > STALE_DAYS;
  }).length;
  const closingSoon = rows.filter((row) => {
    const status = closingStatus(row.closingDate);
    return status.urgency === 'soon' || status.urgency === 'today';
  }).length;
  const offers = rows.filter(
    (row) => isStageId(row.furthestStage) && stageIndex(row.furthestStage) >= stageIndex('OFFER'),
  ).length;

  return (
    <ApplicationsView
      rows={rows}
      totalRows={total}
      scope={scope}
      knownPeople={people}
      stats={
        // Keyed because this tree is built in a server component and handed to
        // a client one; serialising across that boundary loses React's
        // static-children marker, so the element reads as an unkeyed list item.
        <div key="stats" className="mb-4 grid grid-cols-2 gap-2.5 md:mb-[18px] md:gap-3 lg:grid-cols-4">
          <Tile label="Live applications" value={live.length} hint="still open" />
          <Tile label={`No reply in ${STALE_DAYS} days`} value={stale} hint="worth chasing" tone={stale > 0 ? 'warn' : undefined} />
          <Tile label="Closing this week" value={closingSoon} hint="deadline near" tone={closingSoon > 0 ? 'bad' : undefined} />
          <Tile label="Offers" value={offers} hint="reached the offer rung" tone="good" />
        </div>
      }
    />
  );
}

const TONES: Record<string, string> = {
  warn: 'text-warn-fg',
  bad: 'text-bad-fg',
  good: 'text-good-fg',
};

function Tile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  tone?: 'warn' | 'bad' | 'good';
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[13px] border border-line bg-surface px-3.5 py-3 md:gap-1.5 md:px-4 md:py-3.5">
      <span className="text-[11px] font-medium uppercase tracking-[0.07em] text-faint">{label}</span>
      <span className="flex items-baseline gap-2">
        <span className={`font-mono text-[22px] leading-6 md:text-[25px] md:leading-7 ${tone ? TONES[tone] : 'text-ink'}`}>
          {value}
        </span>
        <span className="text-xs text-faint">{hint}</span>
      </span>
    </div>
  );
}
