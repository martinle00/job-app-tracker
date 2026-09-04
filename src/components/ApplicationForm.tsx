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

export function ApplicationForm({ application, knownPeople, onClose, onSaved }: Props) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [saving, setSaving] = useState(false);

  const fieldError = (field: string) =>
    result && !result.ok ? result.fieldErrors[field]?.[0] : undefined;

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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-6"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-lg"
      >
        <h2 className="mb-4 text-lg font-semibold">
          {application ? 'Edit application' : 'Add application'}
        </h2>

        {result && !result.ok && result.formErrors.length > 0 && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
          >
            {result.formErrors.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
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

          <Field label="Company" error={fieldError('company')}>
            <input name="company" defaultValue={application?.company ?? ''} required className={inputClass} />
          </Field>

          <Field label="Role" error={fieldError('role')}>
            <input name="role" defaultValue={application?.role ?? ''} required className={inputClass} />
          </Field>

          <Field label="Applied date" error={fieldError('appliedDate')}>
            <input
              type="date"
              name="appliedDate"
              defaultValue={application?.appliedDate ?? ''}
              required
              className={inputClass}
            />
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

          <Field
            label="Outcome"
            error={fieldError('outcome')}
            hint="Accepted and Declined require the Offer stage."
          >
            <select name="outcome" defaultValue={application?.outcome ?? 'IN_PROGRESS'} className={inputClass}>
              {OUTCOMES.map((outcome) => (
                <option key={outcome.id} value={outcome.id}>
                  {outcome.label}
                </option>
              ))}
            </select>
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

          <Field label="Last activity" error={fieldError('lastActivity')}>
            <input
              type="date"
              name="lastActivity"
              defaultValue={application?.lastActivity ?? ''}
              className={inputClass}
            />
          </Field>

          <Field label="Job URL" error={fieldError('jobUrl')} className="sm:col-span-2">
            <input name="jobUrl" defaultValue={application?.jobUrl ?? ''} className={inputClass} />
          </Field>

          <Field label="Notes" error={fieldError('notes')} className="sm:col-span-2">
            <textarea name="notes" rows={3} defaultValue={application?.notes ?? ''} className={inputClass} />
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClass = 'w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm';

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
    <label className={`block text-sm ${className ?? ''}`}>
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  );
}
