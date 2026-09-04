'use client';

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import type { ApplicationRow } from '@/lib/queries';
import { OUTCOMES, isStageId, stageIndex, stageLabel } from '@/lib/stages';
import { OutcomeBadge, StageBadge } from './StatusBadge';

const columnHelper = createColumnHelper<ApplicationRow>();

interface Props {
  rows: ApplicationRow[];
  onEdit: (row: ApplicationRow) => void;
  onDelete: (row: ApplicationRow) => void;
}

export function ApplicationTable({ rows, onEdit, onDelete }: Props) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'appliedDate', desc: true }]);
  const [search, setSearch] = useState('');

  const columns = useMemo(
    () => [
      columnHelper.accessor('person', { header: 'Person' }),
      columnHelper.accessor('company', { header: 'Company' }),
      columnHelper.accessor('role', { header: 'Role' }),
      columnHelper.accessor('appliedDate', { header: 'Applied' }),
      columnHelper.accessor('furthestStage', {
        header: 'Furthest stage',
        // Sort by ladder position rather than alphabetically, so the column
        // orders the way the funnel actually runs.
        sortingFn: (a, b) => ladderPosition(a.original.furthestStage) - ladderPosition(b.original.furthestStage),
        cell: (info) => <StageBadge stage={info.getValue()} />,
      }),
      columnHelper.accessor('outcome', {
        header: 'Outcome',
        cell: (info) => <OutcomeBadge outcome={info.getValue()} />,
      }),
      columnHelper.accessor('source', {
        header: 'Source',
        cell: (info) => info.getValue() ?? <span className="text-slate-400">—</span>,
      }),
      columnHelper.accessor('location', {
        header: 'Location',
        cell: (info) => info.getValue() ?? <span className="text-slate-400">—</span>,
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <div className="flex justify-end gap-2 whitespace-nowrap">
            <button
              type="button"
              onClick={() => onEdit(info.row.original)}
              className="text-xs font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(info.row.original)}
              className="text-xs font-medium text-rose-600 underline underline-offset-2 hover:text-rose-800"
            >
              Delete
            </button>
          </div>
        ),
      }),
    ],
    [onEdit, onDelete],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter: search },
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,
    // Search the text a person would actually recognise, including the human
    // labels rather than the stored ids.
    globalFilterFn: (row, _columnId, filterValue) => {
      const needle = String(filterValue).toLowerCase();
      const app = row.original;
      const haystack = [
        app.person,
        app.company,
        app.role,
        app.source,
        app.location,
        app.notes,
        stageLabel(app.furthestStage),
        OUTCOMES.find((o) => o.id === app.outcome)?.label,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const visibleRows = table.getRowModel().rows;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-4">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search company, role, notes…"
          aria-label="Search applications"
          className="w-72 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
        <p className="text-sm text-slate-500">
          {visibleRows.length} of {rows.length} shown
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sortable = header.column.getCanSort() && header.column.id !== 'actions';
                  const direction = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={
                        direction === 'asc'
                          ? 'ascending'
                          : direction === 'desc'
                            ? 'descending'
                            : undefined
                      }
                      className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-1 hover:text-slate-900"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <span aria-hidden className="text-slate-400">
                            {direction === 'asc' ? '▲' : direction === 'desc' ? '▼' : '↕'}
                          </span>
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-center text-sm text-slate-500">
                  No applications match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Unknown stages sort last rather than colliding at position -1. */
function ladderPosition(stage: string): number {
  return isStageId(stage) ? stageIndex(stage) : Number.MAX_SAFE_INTEGER;
}
