'use client';

import { useState, useTransition } from 'react';
import { deleteApplication } from '@/app/actions';
import { stageColor } from '@/lib/chart-colors';
import type { ApplicationRow } from '@/lib/queries';
import { OUTCOMES, STAGES, isStageId, stageIndex } from '@/lib/stages';
import { formatDay } from '@/lib/urgency';
import { OutcomeBadge } from './StatusBadge';

interface Props {
  row: ApplicationRow;
  onClose: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}

/**
 * The columns the table dropped, plus the row's history. The tracker stores one
 * furthest stage rather than an event log, so the activity list is honest about
 * that: rungs it passed are listed as reached, and only the three dates we
 * actually store carry dates.
 */
export function ApplicationDrawer({ row, onClose, onEdit, onDeleted }: Props) {
  const shortlisted = row.outcome === 'NOT_APPLIED';
  const reached = isStageId(row.furthestStage) ? stageIndex(row.furthestStage) : -1;
  const outcome = OUTCOMES.find((o) => o.id === row.outcome);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const confirmDelete = () => {
    startTransition(async () => {
      await deleteApplication(row.id);
      onDeleted();
    });
  };

  const facts = [
    { label: 'Applied', value: row.appliedDate ? formatDay(row.appliedDate) : 'not sent yet' },
    { label: 'Closes', value: formatDay(row.closingDate) },
    { label: 'Last activity', value: formatDay(row.lastActivity) },
    { label: 'Source', value: row.source ?? '—' },
    { label: 'Location', value: row.location ?? '—' },
    { label: 'Work type', value: row.workType ?? '—' },
  ];

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 z-20 bg-ink/[0.18]"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${row.company} — ${row.role}`}
        className="absolute inset-y-0 right-0 z-30 flex w-[392px] flex-col border-l border-line bg-surface shadow-[-18px_0_40px_rgba(60,45,30,0.09)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line2 px-5 pb-3.5 pt-5">
          <div className="flex flex-col gap-1">
            <span className="font-serif text-xl leading-6">{row.company}</span>
            <span className="text-[13px] text-muted">{row.role}</span>
            <span className="mt-1 flex items-center gap-2">
              <OutcomeBadge outcome={row.outcome} />
              <span className="text-xs text-faint">{row.person}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-7 w-7 flex-none rounded-lg border border-line bg-surface leading-none text-muted hover:text-ink"
          >
            ×
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 pb-7 pt-4">
          <dl className="grid grid-cols-2 gap-3">
            {facts.map((fact) => (
              <div key={fact.label} className="flex flex-col gap-0.5">
                <dt className="text-[11px] uppercase tracking-[0.06em] text-faint">{fact.label}</dt>
                <dd className="text-[13px]">{fact.value}</dd>
              </div>
            ))}
          </dl>

          {row.jobUrl && (
            <a
              href={row.jobUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[13px] text-[color:var(--accent)] underline underline-offset-2"
            >
              Open the job ad
            </a>
          )}

          <div className="flex flex-col gap-3">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-faint">Activity</h3>
            {shortlisted ? (
              <p className="text-[13px] text-muted">
                Shortlisted, nothing sent yet
                {row.closingDate ? ` — applications close ${formatDay(row.closingDate)}.` : '.'}
              </p>
            ) : (
              <ol className="flex flex-col">
                {STAGES.slice(0, reached + 1).map((stage, index) => (
                  <li key={stage.id} className="grid grid-cols-[18px_1fr] gap-3">
                    <span className="flex flex-col items-center gap-1">
                      <span
                        aria-hidden
                        className="mt-1 h-[9px] w-[9px] rounded-full"
                        style={{ background: stageColor(stage.id) }}
                      />
                      <span aria-hidden className="w-px flex-1 bg-line2" />
                    </span>
                    <span className="flex flex-col gap-0.5 pb-4">
                      <span className="text-[13px]">{stage.label}</span>
                      <span className="font-mono text-[11.5px] text-faint">
                        {index === 0 ? formatDay(row.appliedDate) : 'reached'}
                      </span>
                    </span>
                  </li>
                ))}
                <li className="grid grid-cols-[18px_1fr] gap-3">
                  <span className="flex flex-col items-center">
                    <span
                      aria-hidden
                      className="mt-1 h-[9px] w-[9px] rounded-full bg-[#e0d5c6]"
                    />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[13px]">
                      {row.outcome === 'IN_PROGRESS' ? 'Waiting' : outcome?.label ?? row.outcome}
                    </span>
                    <span className="font-mono text-[11.5px] text-faint">
                      {row.lastActivity ? `last update ${formatDay(row.lastActivity)}` : 'no update recorded'}
                    </span>
                  </span>
                </li>
              </ol>
            )}
          </div>

          {row.notes && (
            <div className="flex flex-col gap-2">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-faint">Notes</h3>
              <p className="whitespace-pre-line text-[13px] leading-5 text-ink2">{row.notes}</p>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-[10px] px-3 py-2.5 text-[13px] font-medium text-surface"
              style={{ background: 'var(--accent)' }}
            >
              Edit
            </button>

            {confirmingDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-[12.5px] text-muted">Delete this application?</span>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={pending}
                  className="rounded-[8px] bg-bad-fg px-2.5 py-1.5 text-[12.5px] font-medium text-surface disabled:opacity-50"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="text-[12.5px] text-faint"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="text-[12.5px] text-bad-fg"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
