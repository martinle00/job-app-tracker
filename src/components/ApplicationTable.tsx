'use client';

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { stageColor } from '@/lib/chart-colors';
import type { ApplicationRow } from '@/lib/queries';
import { STAGES, isStageId, stageIndex, stageLabel } from '@/lib/stages';
import { closingStatus, formatDay } from '@/lib/urgency';
import { ApplicationCard } from './ApplicationCard';
import { OutcomeBadge } from './StatusBadge';

const columnHelper = createColumnHelper<ApplicationRow>();

interface Props {
  rows: ApplicationRow[];
  selectedId: string | null;
  onSelect: (row: ApplicationRow) => void;
}

/**
 * Nine columns was more than a glance can take, so the table now carries the
 * five things that answer "what do I chase today" — who, what, when it went,
 * when it closes, how far it got — and the rest lives in the detail drawer.
 */
export function ApplicationTable({ rows, selectedId, onSelect }: Props) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'appliedDate', desc: true }]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('person', {
        header: 'Person',
        cell: (info) => (
          <span className="flex items-center gap-2 whitespace-nowrap text-ink2">
            <span
              aria-hidden
              className="h-[7px] w-[7px] rounded-full"
              style={{ background: info.row.original.personColor ?? '#b3a897' }}
            />
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('company', {
        header: 'Role',
        cell: (info) => (
          <span className="flex flex-col">
            <span className="font-medium text-ink">{info.getValue()}</span>
            <span className="text-[12.5px] text-muted">{info.row.original.role}</span>
          </span>
        ),
      }),
      columnHelper.accessor('appliedDate', {
        header: 'Applied',
        cell: (info) => {
          const applied = info.getValue();
          // Never applied and the window is gone: a missed opportunity worth
          // flagging, unlike a closing date that passed after applying.
          const missed = !applied && closingStatus(info.row.original.closingDate).urgency === 'closed';
          const className = missed
            ? 'bg-bad-bg text-bad-fg'
            : applied
              ? 'bg-[#f4efe7] text-neutral-fg'
              : 'text-[#bdb2a2]';
          return (
            <span className={`inline-block rounded-[7px] px-2 py-0.5 text-xs ${className}`}>
              {applied ? formatDay(applied) : 'not sent'}
            </span>
          );
        },
      }),
      columnHelper.accessor('closingDate', {
        header: 'Closes',
        cell: (info) => {
          const status = closingStatus(info.getValue());
          return (
            <span className={`inline-block rounded-[7px] px-2 py-0.5 text-xs ${status.className}`}>
              {status.label}
            </span>
          );
        },
      }),
      columnHelper.accessor('furthestStage', {
        header: 'Progress',
        // Sort by ladder position rather than alphabetically, so the column
        // orders the way the funnel actually runs.
        sortingFn: (a, b) => ladderPosition(a.original.furthestStage) - ladderPosition(b.original.furthestStage),
        cell: (info) => {
          const row = info.row.original;
          const shortlisted = row.outcome === 'NOT_APPLIED';
          const reached = isStageId(row.furthestStage) ? stageIndex(row.furthestStage) + 1 : 0;
          return (
            <span className="flex min-w-[132px] flex-col gap-1.5">
              <span className="text-xs text-ink2">
                {shortlisted ? 'shortlisted' : stageLabel(row.furthestStage)}
              </span>
              <span className="flex h-1 w-full overflow-hidden rounded-sm bg-[#efe6d9]">
                <span
                  className="h-full rounded-sm"
                  style={{
                    width: shortlisted ? 0 : `${(reached / STAGES.length) * 100}%`,
                    background: stageColor(row.furthestStage),
                  }}
                />
              </span>
            </span>
          );
        },
      }),
      columnHelper.display({
        id: 'outcome',
        header: 'Outcome',
        cell: (info) => (
          <span className="flex items-center justify-end whitespace-nowrap">
            <OutcomeBadge outcome={info.row.original.outcome} />
          </span>
        ),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <>
      {/* Below md the same rows render as cards — see ApplicationCard. */}
      <div className="flex flex-col gap-3 md:hidden">
        {table.getRowModel().rows.map((row) => (
          <ApplicationCard
            key={row.id}
            row={row.original}
            onSelect={() => onSelect(row.original)}
          />
        ))}
        {rows.length === 0 && (
          <p className="rounded-card border border-dashed border-[#ded2c1] px-4 py-10 text-center text-[13px] text-faint">
            No applications match the current filters.
          </p>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-card border border-line bg-surface md:block">
      <table className="w-full border-collapse text-[13.5px]">
        <thead className="bg-surface2">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const sortable = header.column.getCanSort();
                const direction = header.column.getIsSorted();
                const last = header.column.id === 'outcome';
                return (
                  <th
                    key={header.id}
                    scope="col"
                    aria-sort={
                      direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : undefined
                    }
                    className={`border-b border-line2 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.07em] text-faint ${last ? 'text-right' : 'text-left'}`}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="flex items-center gap-1 hover:text-ink"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <span aria-hidden className="text-[#c4b8a6]">
                          {direction === 'asc' ? '▴' : direction === 'desc' ? '▾' : ''}
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
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onSelect(row.original)}
              className={`cursor-pointer border-b border-line3 last:border-0 hover:bg-surface2 ${selectedId === row.original.id ? 'bg-[#f7f1e8]' : ''}`}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3 align-middle">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-11 text-center text-[13px] text-faint">
                No applications match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </>
  );
}

/** Unknown stages sort last rather than colliding at position -1. */
function ladderPosition(stage: string): number {
  return isStageId(stage) ? stageIndex(stage) : Number.MAX_SAFE_INTEGER;
}
