'use client';

import { stageColor } from '@/lib/chart-colors';
import type { ApplicationRow } from '@/lib/queries';
import { STAGES, isStageId, stageIndex, stageLabel } from '@/lib/stages';
import { closingStatus, formatDay } from '@/lib/urgency';
import { OutcomeBadge } from './StatusBadge';

interface Props {
  row: ApplicationRow;
  onSelect: () => void;
}

/**
 * One role as a card, for screens with no room for six columns. Carries exactly
 * what the table carries — nothing is truncated and nothing scrolls sideways —
 * reordered so the thing you scan for (company) leads.
 */
export function ApplicationCard({ row, onSelect }: Props) {
  const shortlisted = row.outcome === 'NOT_APPLIED';
  const reached = isStageId(row.furthestStage) ? stageIndex(row.furthestStage) + 1 : 0;
  const closing = closingStatus(row.closingDate);

  // A calm list stays calm: the deadline chip appears only when the deadline is
  // actually near, or when the window closed on something never sent.
  const showUrgency =
    closing.urgency === 'today' ||
    closing.urgency === 'soon' ||
    (closing.urgency === 'closed' && !row.appliedDate);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full flex-col gap-2.5 rounded-card border border-line bg-surface px-4 py-3.5 text-left active:border-[#cbbaa4]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[15.5px] font-medium leading-5 text-ink">{row.company}</span>
          <span className="truncate text-[13.5px] text-muted">{row.role}</span>
        </div>
        <span className="flex-none">
          <OutcomeBadge outcome={row.outcome} />
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        <span className="flex-none text-[12.5px] text-ink2">
          {shortlisted ? 'Shortlisted' : stageLabel(row.furthestStage)}
        </span>
        <span className="flex h-1 flex-1 overflow-hidden rounded-sm bg-[#efe6d9]">
          <span
            className="h-full rounded-sm"
            style={{
              width: shortlisted ? 0 : `${(reached / STAGES.length) * 100}%`,
              background: stageColor(row.furthestStage),
            }}
          />
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-[13px] text-ink2">
          <span
            aria-hidden
            className="h-2 w-2 flex-none rounded-full"
            style={{ background: row.personColor ?? '#b3a897' }}
          />
          <span className="truncate">{row.person}</span>
        </span>

        <span className="flex flex-none items-center gap-1.5">
          <span
            className={`rounded-[7px] px-2 py-0.5 text-xs ${
              row.appliedDate ? 'bg-[#f4efe7] text-neutral-fg' : 'text-[#bdb2a2]'
            }`}
          >
            {row.appliedDate ? formatDay(row.appliedDate) : 'not sent'}
          </span>
          {showUrgency && (
            <span className={`rounded-[7px] px-2 py-0.5 text-xs ${closing.className}`}>
              {closing.label}
            </span>
          )}
        </span>
      </div>
    </button>
  );
}
