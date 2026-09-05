'use client';

import { useState } from 'react';
import { saveApplication, type ActionResult } from '@/app/actions';
import type { ApplicationRow } from '@/lib/queries';
import { OUTCOMES, STAGES, WORK_TYPES } from '@/lib/stages';

interface Props {
  /** Null when adding; the row being edited otherwise. */
  application: ApplicationRow | null;
  knownPeople: { name: string; displayName: string }[];
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Twelve fields was a wall. The six that every row needs are shown; the rest
 * are one click away, because they are usually empty and never block a save.
 */
export function ApplicationForm({ application, knownPeople, onClose, onSaved }: Props) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [saving, setSaving] = useState(false);
  // Open the extras when editing a row that already uses them, so nothing the
  // row contains is hidden behind a disclosure.
  const [showMore, setShowMore] = useState(
    Boolean(application?.source || application?.location || application?.workType || application?.jobUrl || application?.notes),
  );

  const fieldError = (field: string) => (result && !result.ok ? result.fieldErrors[field]?.[0] : undefined);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData(event.currentTarget);
      const outcome = await saveApplication(application?.id ?? null, formData);
      setResult(outcome);
      if (outcome.ok) onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={application ? 'Edit application' : 'Add application'}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-surface md:absolute md:z-40 md:bg-ink/[0.22] md:px-6 md:py-16"
    >
      {/*
        Full screen on a phone: adding a role is a task with its own Cancel /
        Save commitment, so it earns the whole screen rather than a sheet you
        might swipe away mid-entry. A centred dialog from md up.
      */}
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-[496px] flex-col rounded-none border-line bg-surface p-0 md:block md:rounded-2xl md:border md:p-[22px] md:shadow-[0_24px_60px_rgba(60,45,30,0.16)]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line2 bg-surface px-4 py-3 md:static md:mb-4 md:items-baseline md:border-0 md:px-0 md:py-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-none text-[15px] text-muted md:hidden"
          >
            Cancel
          </button>
          <h2 className="font-serif text-[19px] md:text-xl">
            {application ? 'Edit application' : 'New application'}
          </h2>
          <button
            type="submit"
            disabled={saving}
            className="flex-none text-[15px] font-medium text-[color:var(--accent)] disabled:opacity-60 md:hidden"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="hidden text-[15px] text-faint md:block"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col px-4 pb-8 pt-4 md:px-0 md:pb-0 md:pt-0">

        {result && !result.ok && result.formErrors.length > 0 && (
          <div role="alert" className="mb-4 rounded-[10px] border border-[#e8cfc9] bg-bad-bg px-3 py-2 text-[13px] text-bad-fg">
            {result.formErrors.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Company" error={fieldError('company')} className="col-span-2">
            <input name="company" defaultValue={application?.company ?? ''} required className={inputClass} />
          </Field>

          <Field label="Role" error={fieldError('role')} className="col-span-2">
            <input name="role" defaultValue={application?.role ?? ''} required className={inputClass} />
          </Field>

          <Field label="Person" error={fieldError('person')}>
            <input
              name="person"
              defaultValue={application?.person ?? ''}
              list="known-people"
              required
              className={inputClass}
            />
            <datalist id="known-people">
              {knownPeople.map((person) => (
                <option key={person.name} value={person.displayName} />
              ))}
            </datalist>
          </Field>

          <Field label="Applied" error={fieldError('appliedDate')} hint='Blank only for "Not yet applied".'>
            <input type="date" name="appliedDate" defaultValue={application?.appliedDate ?? ''} className={inputClass} />
          </Field>

          <Field label="Furthest stage" error={fieldError('furthestStage')}>
            <select name="furthestStage" defaultValue={application?.furthestStage ?? 'APPLIED'} className={inputClass}>
              {STAGES.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Outcome" error={fieldError('outcome')} hint="Accepted and Declined require the Offer stage.">
            <select name="outcome" defaultValue={application?.outcome ?? 'IN_PROGRESS'} className={inputClass}>
              {OUTCOMES.map((outcome) => (
                <option key={outcome.id} value={outcome.id}>
                  {outcome.label}
                </option>
              ))}
            </select>
          </Field>

          {/* Always mounted, so the extras post even while collapsed. */}
          <div className={showMore ? 'col-span-2 grid grid-cols-2 gap-3' : 'hidden'}>
            <Field label="Closing date" error={fieldError('closingDate')}>
              <input type="date" name="closingDate" defaultValue={application?.closingDate ?? ''} className={inputClass} />
            </Field>
            <Field label="Last activity" error={fieldError('lastActivity')}>
              <input type="date" name="lastActivity" defaultValue={application?.lastActivity ?? ''} className={inputClass} />
            </Field>
            <Field label="Source" error={fieldError('source')}>
              <input name="source" defaultValue={application?.source ?? ''} className={inputClass} />
            </Field>
            <Field label="Location" error={fieldError('location')}>
              <input name="location" defaultValue={application?.location ?? ''} className={inputClass} />
            </Field>
            <Field label="Work type" error={fieldError('workType')}>
              <select name="workType" defaultValue={application?.workType ?? ''} className={inputClass}>
                <option value="">—</option>
                {WORK_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Job URL" error={fieldError('jobUrl')}>
              <input name="jobUrl" defaultValue={application?.jobUrl ?? ''} className={inputClass} />
            </Field>
            <Field label="Notes" error={fieldError('notes')} className="col-span-2">
              <textarea name="notes" rows={3} defaultValue={application?.notes ?? ''} className={inputClass} />
            </Field>
          </div>
        </div>

        <div className="mt-[18px] flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between md:gap-3">
          <button
            type="button"
            onClick={() => setShowMore((open) => !open)}
            className="text-[13.5px] text-[color:var(--accent)] md:text-[12.5px]"
          >
            {showMore ? '− Fewer fields' : '+ Closing date, source, location, notes'}
          </button>
          {/* On mobile these live in the sticky header instead. */}
          <span className="hidden gap-2 md:flex">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[10px] border border-[#e5dcd0] bg-surface px-3.5 py-2.5 text-[13px] text-ink2 hover:border-[#cbbaa4]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-[10px] px-4 py-2.5 text-[13px] font-medium text-surface disabled:opacity-60"
              style={{ background: 'var(--accent)' }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </span>
        </div>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  'w-full rounded-[9px] border border-[#e5dcd0] bg-[#fffefb] px-2.5 py-2 text-[13.5px] outline-none focus:border-[#cbbaa4]';

function Field({
  label,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <span className="text-[11px] uppercase tracking-[0.06em] text-faint">{label}</span>
      {children}
      {hint && !error && <span className="text-[11px] text-faint">{hint}</span>}
      {error && <span className="text-[11px] text-bad-fg">{error}</span>}
    </label>
  );
}
