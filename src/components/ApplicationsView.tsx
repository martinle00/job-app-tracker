'use client';

import { useEffect, useState } from 'react';
import type { ApplicationRow } from '@/lib/queries';
import { ApplicationDrawer } from './ApplicationDrawer';
import { ApplicationTable } from './ApplicationTable';
import { useMobileChrome } from './MobileChrome';
import { PageHeader } from './PageHeader';

interface Props {
  rows: ApplicationRow[];
  totalRows: number;
  scope: string;
  /** Triage tiles, rendered on the server from the same filtered rows. */
  stats: React.ReactNode;
}

/** Owns the drawer so the table stays a presentation concern. Read-only — the sheet is the source of truth. */
export function ApplicationsView({ rows, totalRows, scope, stats }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { setResultCount } = useMobileChrome();

  const selected = rows.find((row) => row.id === selectedId) ?? null;

  // The filter sheet's confirm button states the result, and only this view
  // knows what the filters actually matched.
  useEffect(() => {
    setResultCount(rows.length);
    return () => setResultCount(null);
  }, [rows.length, setResultCount]);

  return (
    <>
      <PageHeader title="Applications" scope={scope} />

      <div className="flex-1 overflow-y-auto px-4 pb-10 pt-4 md:px-7 md:pt-5">
        {stats}
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-xs text-muted">
            {rows.length === totalRows ? `${totalRows} roles` : `${rows.length} of ${totalRows} roles`}
          </span>
          <span className="text-[11px] uppercase tracking-[0.06em] text-[#b3a897]">
            Sorted by applied · newest
          </span>
        </div>

        <ApplicationTable
          rows={rows}
          selectedId={selectedId}
          onSelect={(row) => setSelectedId(row.id)}
        />
      </div>

      {selected && <ApplicationDrawer row={selected} onClose={() => setSelectedId(null)} />}
    </>
  );
}
