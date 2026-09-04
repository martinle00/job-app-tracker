import { Suspense } from 'react';
import { ApplicationsView } from '@/components/ApplicationsView';
import { FilterBar } from '@/components/FilterBar';
import { parseFilters, type SearchParams } from '@/lib/filters';
import { getApplications, getFilterOptions, getPeople } from '@/lib/queries';

export const dynamic = 'force-dynamic';

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

  return (
    <>
      <Suspense fallback={null}>
        <FilterBar people={options.people} sources={options.sources} />
      </Suspense>

      {/* An empty database is a setup state, not an error — say how to fill it,
          but leave the Add button reachable underneath. */}
      {options.people.length === 0 && <ImportHint />}

      <ApplicationsView rows={rows} knownPeople={people} />
    </>
  );
}

function ImportHint() {
  return (
    <div className="mb-4 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
      <p className="text-sm font-medium text-slate-800">No applications yet</p>
      <p className="mx-auto mt-1 max-w-lg text-sm text-slate-600">
        Import a spreadsheet export with{' '}
        <code className="rounded bg-slate-100 px-1 py-0.5">npm run import</code>, load the sample
        data with <code className="rounded bg-slate-100 px-1 py-0.5">npm run db:seed</code>, or add
        one below.
      </p>
    </div>
  );
}
