'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { deleteApplication } from '@/app/actions';
import type { ApplicationRow } from '@/lib/queries';
import { ApplicationForm } from './ApplicationForm';
import { ApplicationTable } from './ApplicationTable';

interface Props {
  rows: ApplicationRow[];
  knownPeople: { name: string; displayName: string }[];
}

/** Owns the add/edit dialog so the table itself stays a presentation concern. */
export function ApplicationsView({ rows, knownPeople }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<ApplicationRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleEdit = useCallback((row: ApplicationRow) => {
    setEditing(row);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (row: ApplicationRow) => {
      const confirmed = window.confirm(
        `Delete ${row.person}'s application to ${row.company} for ${row.role}?`,
      );
      if (!confirmed) return;
      await deleteApplication(row.id);
      router.refresh();
    },
    [router],
  );

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Applications</h1>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Add application
        </button>
      </div>

      <ApplicationTable rows={rows} onEdit={handleEdit} onDelete={handleDelete} />

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
