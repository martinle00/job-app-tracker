'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { OUTCOMES, STAGES } from '@/lib/stages';

export interface PersonOption {
  /** Normalised key stored in the DB and used in the URL. */
  name: string;
  displayName: string;
  count: number;
}

interface Props {
  people: PersonOption[];
  sources: string[];
}

/**
 * The only component that writes filter state. Everything else reads it back
 * out of the URL, which keeps the table and the chart in lockstep and makes a
 * filtered view a shareable link.
 */
export function FilterBar({ people, sources }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const selectedPeople = searchParams.getAll('person');
  const selectedOutcomes = searchParams.getAll('outcome');
  const selectedStages = searchParams.getAll('stage');

  const commit = (next: URLSearchParams) => {
    const query = next.toString();
    startTransition(() => {
      router.push(query ? `?${query}` : '?', { scroll: false });
    });
  };

  const toggleMulti = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    const current = next.getAll(key);
    next.delete(key);
    for (const item of current) {
      if (item !== value) next.append(key, item);
    }
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
    (searchParams.get('to') ? 1 : 0) +
    (searchParams.get('q') ? 1 : 0);

  return (
    <section
      aria-label="Filters"
      data-pending={isPending ? '' : undefined}
      className="mb-6 rounded-lg border border-slate-200 bg-white p-4 data-[pending]:opacity-70"
    >
      <div className="mb-4">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">People</h2>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs font-medium text-slate-500 underline underline-offset-2 hover:text-slate-900"
            >
              Clear all filters ({activeCount})
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {people.length === 0 && <p className="text-sm text-slate-500">No people yet.</p>}
          {people.map((person) => {
            const selected = selectedPeople.includes(person.name);
            return (
              <button
                key={person.name}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleMulti('person', person.name)}
                className={
                  selected
                    ? 'rounded-full bg-slate-900 px-3 py-1 text-sm font-medium text-white'
                    : 'rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:border-slate-400'
                }
              >
                {person.displayName}
                <span className={selected ? 'ml-1.5 text-slate-300' : 'ml-1.5 text-slate-400'}>
                  {person.count}
                </span>
              </button>
            );
          })}
        </div>
        {selectedPeople.length === 0 && people.length > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            Showing everyone combined. Select one or more people to narrow it down.
          </p>
        )}
      </div>

      <div className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
        <FilterGroup label="Outcome">
          <div className="flex flex-wrap gap-1.5">
            {OUTCOMES.map((outcome) => (
              <Chip
                key={outcome.id}
                label={outcome.label}
                selected={selectedOutcomes.includes(outcome.id)}
                onClick={() => toggleMulti('outcome', outcome.id)}
              />
            ))}
          </div>
        </FilterGroup>

        <FilterGroup label="Furthest stage">
          <div className="flex flex-wrap gap-1.5">
            {STAGES.map((stage) => (
              <Chip
                key={stage.id}
                label={stage.label}
                selected={selectedStages.includes(stage.id)}
                onClick={() => toggleMulti('stage', stage.id)}
              />
            ))}
          </div>
        </FilterGroup>

        <FilterGroup label="Applied between">
          <div className="flex items-center gap-2">
            <input
              type="date"
              aria-label="Applied from"
              value={searchParams.get('from') ?? ''}
              onChange={(event) => setSingle('from', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              aria-label="Applied to"
              value={searchParams.get('to') ?? ''}
              onChange={(event) => setSingle('to', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
          </div>
        </FilterGroup>

        <FilterGroup label="Source">
          <select
            aria-label="Source"
            value={searchParams.get('source') ?? ''}
            onChange={(event) => setSingle('source', event.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">All sources</option>
            {sources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </FilterGroup>
      </div>
    </section>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</h3>
      {children}
    </div>
  );
}

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={
        selected
          ? 'rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white'
          : 'rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:border-slate-400'
      }
    >
      {label}
    </button>
  );
}
