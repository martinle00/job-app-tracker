'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { OUTCOMES, STAGES } from '@/lib/stages';

export interface PersonOption {
  /** Normalised key stored in the DB and used in the URL. */
  name: string;
  displayName: string;
  color: string | null;
  count: number;
}

interface Props {
  people: PersonOption[];
  sources: string[];
}

const chip = (selected: boolean) =>
  selected
    ? 'rounded-lg border border-[#d9c3ab] bg-[#f2e6da] px-2.5 py-1 text-xs text-clayDeep'
    : 'rounded-lg border border-[#e5dcd0] bg-surface px-2.5 py-1 text-xs text-ink2 hover:border-[#cbbaa4]';

/** Touch targets need more room than a cursor does. */
const sheetChip = (selected: boolean) =>
  selected
    ? 'rounded-[10px] border border-[#d9c3ab] bg-[#f2e6da] px-3.5 py-2.5 text-[14px] text-clayDeep'
    : 'rounded-[10px] border border-[#e5dcd0] bg-surface px-3.5 py-2.5 text-[14px] text-ink2';

/**
 * Everything that writes filter state. Filters live entirely in the URL, so the
 * table and the chart read the same source and a filtered view is a shareable
 * link — that contract is identical on desktop and mobile, and only the
 * chrome around these controls changes.
 */
export function useFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const selectedPeople = searchParams.getAll('person');
  const selectedOutcomes = searchParams.getAll('outcome');
  const selectedStages = searchParams.getAll('stage');

  const commit = (next: URLSearchParams) => {
    const query = next.toString();
    startTransition(() => router.push(query ? `?${query}` : '?', { scroll: false }));
  };

  const toggleMulti = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    const current = next.getAll(key);
    next.delete(key);
    for (const item of current) if (item !== value) next.append(key, item);
    if (!current.includes(value)) next.append(key, value);
    commit(next);
  };

  const setSingle = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    commit(next);
  };

  const clearAll = () => commit(new URLSearchParams());

  const activeCount =
    selectedPeople.length +
    selectedOutcomes.length +
    selectedStages.length +
    (searchParams.get('source') ? 1 : 0) +
    (searchParams.get('from') ? 1 : 0) +
    (searchParams.get('to') ? 1 : 0);

  return {
    searchParams,
    isPending,
    selectedPeople,
    selectedOutcomes,
    selectedStages,
    toggleMulti,
    setSingle,
    clearAll,
    activeCount,
  };
}

/**
 * The filter controls themselves, shared by the desktop sidebar and the mobile
 * sheet. `size` only changes tap-target geometry — never which filters exist,
 * so the two layouts can't drift apart in what they can express.
 */
export function FilterControls({
  people,
  sources,
  size = 'compact',
}: Props & { size?: 'compact' | 'roomy' }) {
  const roomy = size === 'roomy';
  const chipFor = roomy ? sheetChip : chip;
  const {
    searchParams,
    selectedPeople,
    selectedOutcomes,
    selectedStages,
    toggleMulti,
    setSingle,
  } = useFilters();

  return (
    <>
      <Group label="People">
        <div className="flex flex-col gap-1">
          {people.length === 0 && <p className="text-sm text-faint">No people yet.</p>}
          {people.map((person) => {
            const selected = selectedPeople.includes(person.name);
            const base = roomy
              ? 'flex items-center justify-between gap-2 rounded-[10px] border px-3.5 py-3 text-[15px]'
              : 'flex items-center justify-between gap-2 rounded-[9px] border px-2.5 py-1.5 text-[13px]';
            return (
              <button
                key={person.name}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleMulti('person', person.name)}
                className={`${base} ${
                  selected
                    ? 'border-[#d9c3ab] bg-[#f2e6da] text-clayDeep'
                    : 'border-[#e5dcd0] bg-surface text-ink2'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={`rounded-full ${roomy ? 'h-2.5 w-2.5' : 'h-[7px] w-[7px]'}`}
                    style={{ background: person.color ?? '#b3a897' }}
                  />
                  {person.displayName}
                </span>
                <span className="font-mono text-xs opacity-65">{person.count}</span>
              </button>
            );
          })}
        </div>
      </Group>

      <Group label="Outcome">
        <div className="flex flex-wrap gap-1.5">
          {OUTCOMES.map((outcome) => (
            <button
              key={outcome.id}
              type="button"
              aria-pressed={selectedOutcomes.includes(outcome.id)}
              onClick={() => toggleMulti('outcome', outcome.id)}
              className={chipFor(selectedOutcomes.includes(outcome.id))}
            >
              {outcome.label}
            </button>
          ))}
        </div>
      </Group>

      <Group label="Furthest stage">
        <div className="flex flex-wrap gap-1.5">
          {STAGES.map((stage) => (
            <button
              key={stage.id}
              type="button"
              aria-pressed={selectedStages.includes(stage.id)}
              onClick={() => toggleMulti('stage', stage.id)}
              className={chipFor(selectedStages.includes(stage.id))}
            >
              {stage.label}
            </button>
          ))}
        </div>
      </Group>

      <Group label="Applied between">
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            aria-label="Applied from"
            value={searchParams.get('from') ?? ''}
            onChange={(event) => setSingle('from', event.target.value)}
            className={`min-w-0 flex-1 rounded-lg border border-[#e5dcd0] bg-surface px-2 ${roomy ? 'py-2.5 text-[14px]' : 'py-1.5 text-xs'}`}
          />
          <span className="text-xs text-faint">to</span>
          <input
            type="date"
            aria-label="Applied to"
            value={searchParams.get('to') ?? ''}
            onChange={(event) => setSingle('to', event.target.value)}
            className={`min-w-0 flex-1 rounded-lg border border-[#e5dcd0] bg-surface px-2 ${roomy ? 'py-2.5 text-[14px]' : 'py-1.5 text-xs'}`}
          />
        </div>
      </Group>

      <Group label="Source">
        <select
          aria-label="Source"
          value={searchParams.get('source') ?? ''}
          onChange={(event) => setSingle('source', event.target.value)}
          className={`rounded-lg border border-[#e5dcd0] bg-surface px-2 ${roomy ? 'py-2.5 text-[15px]' : 'py-1.5 text-[13px]'}`}
        >
          <option value="">All sources</option>
          {sources.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>
      </Group>
    </>
  );
}

/** Desktop only: the sidebar shell around the shared controls. */
export function FilterSidebar({ people, sources }: Props) {
  const { isPending, activeCount, clearAll } = useFilters();

  return (
    <div
      aria-label="Filters"
      data-pending={isPending ? '' : undefined}
      className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 pb-6 data-[pending]:opacity-70"
    >
      {activeCount > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="self-start text-[11px] text-[color:var(--accent)]"
        >
          Clear {activeCount}
        </button>
      )}
      <FilterControls people={people} sources={sources} />
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-faint">{label}</h2>
      {children}
    </div>
  );
}
