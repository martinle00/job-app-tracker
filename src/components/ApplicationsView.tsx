'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ApplicationRow } from '@/lib/queries';
import { ApplicationDrawer } from './ApplicationDrawer';
import { ApplicationForm } from './ApplicationForm';
import { ApplicationTable } from './ApplicationTable';
import { useMobileChrome } from './MobileChrome';
import { PageHeader } from './PageHeader';

interface Props {
  rows: ApplicationRow[];
  totalRows: number;
  scope: string;
  knownPeople: { name: string; displayName: string }[];
  /** Triage tiles, rendered on the server from the same filtered rows. */
  stats: React.ReactNode;
}

/** Owns the drawer and the dialog so the table stays a presentation concern. */
export function ApplicationsView({ rows, totalRows, scope, knownPeople, stats }: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ApplicationRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setResultCount } = useMobileChrome();

  const selected = rows.find((row) => row.id === selectedId) ?? null;

  // The filter sheet's confirm button states the result, and only this view
  // knows what the filters actually matched.
  useEffect(() => {
    setResultCount(rows.length);
    return () => setResultCount(null);
  }, [rows.length, setResultCount]);

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Applications"
        scope={scope}
        action={
          <>
            <button
              type="button"
              onClick={openAdd}
              aria-label="Add application"
              className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] text-[20px] leading-none text-surface md:hidden"
              style={{ background: 'var(--accent)' }}
            >
              +
            </button>
            <button
              type="button"
              onClick={openAdd}
              className="hidden rounded-[10px] px-3.5 py-2.5 text-[13px] font-medium text-surface md:block"
              style={{ background: 'var(--accent)' }}
            >
              Add application
            </button>
          </>
        }
      />

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

      {selected && (
        <ApplicationDrawer
          row={selected}
          onClose={() => setSelectedId(null)}
          onEdit={() => {
            setEditing(selected);
            setDialogOpen(true);
          }}
          onDeleted={() => {
            setSelectedId(null);
            router.refresh();
          }}
        />
      )}

      {dialogOpen && (
        <ApplicationForm
          application={editing}
          knownPeople={knownPeople}
          onClose={() => setDialogOpen(false)}
          onSaved={() => {
            setDialogOpen(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
