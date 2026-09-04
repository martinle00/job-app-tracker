'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { createPerson, deletePerson, updateAccent, updatePerson } from '@/app/actions';
import { ACCENT_CHOICES, PERSON_COLORS } from '@/lib/chart-colors';
import { PageHeader } from './PageHeader';

interface Person {
  id: string;
  name: string;
  displayName: string;
  color: string | null;
}

interface Props {
  people: Person[];
  accent: string;
}

/** There are no accounts — everyone who has ever applied is just a row here. */
export function SettingsView({ people, accent }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState<Person | null>(null);

  const refresh = () => startTransition(() => router.refresh());

  return (
    <>
      <PageHeader title="Settings" scope="Names and colours for this tracker" searchable={false} />

      <div className="flex-1 overflow-y-auto px-7 pb-10 pt-5">
        <div className="flex max-w-[680px] flex-col gap-[18px]">
          <Card title="People" subtitle="Aliases and dot colours — shared, so everyone in this tracker sees the same names.">
            <div className="flex flex-col">
              {people.map((person) => (
                <PersonRow key={person.id} person={person} onEdit={() => setEditing(person)} />
              ))}
            </div>
            <AddPersonRow onSaved={refresh} />
          </Card>

          <Card title="Accent colour" subtitle="Used for buttons, links and the active view.">
            <div className="flex flex-wrap gap-2.5">
              {ACCENT_CHOICES.map((choice) => {
                const selected = choice.value === accent;
                return (
                  <button
                    key={choice.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={async () => {
                      await updateAccent(choice.value);
                      refresh();
                    }}
                    className={
                      selected
                        ? 'flex items-center gap-2.5 rounded-[10px] border border-[#cbbaa4] bg-[#f6efe5] py-2 pl-2.5 pr-3 text-[13px]'
                        : 'flex items-center gap-2.5 rounded-[10px] border border-[#e5dcd0] bg-surface py-2 pl-2.5 pr-3 text-[13px] hover:border-[#cbbaa4]'
                    }
                  >
                    <span
                      aria-hidden
                      className="h-4 w-4 rounded-[5px]"
                      style={{ background: choice.value }}
                    />
                    {choice.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-[18px] flex items-center gap-3 border-t border-line2 pt-4">
              <span className="text-xs text-faint">Preview</span>
              <span
                className="rounded-[10px] px-3.5 py-2.5 text-[13px] font-medium text-surface"
                style={{ background: 'var(--accent)' }}
              >
                Add application
              </span>
              <span className="text-[13px] text-[color:var(--accent)]">Clear filters</span>
            </div>
          </Card>
        </div>
      </div>

      {editing && (
        <EditPersonModal
          person={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
          onDeleted={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </>
  );
}

function PersonRow({ person, onEdit }: { person: Person; onEdit: () => void }) {
  return (
    <div className="flex items-center gap-3 border-b border-line2 py-2.5 last:border-b-0">
      <span
        aria-hidden
        className="h-3 w-3 flex-none rounded-full"
        style={{ background: person.color ?? PERSON_COLORS[0] }}
      />
      <span className="flex-1 truncate text-[14px]">{person.displayName}</span>
      <button
        type="button"
        onClick={onEdit}
        className="rounded-[8px] border border-[#e5dcd0] bg-surface px-2.5 py-1.5 text-[12.5px] text-ink2 hover:border-[#cbbaa4]"
      >
        Edit
      </button>
    </div>
  );
}

function AddPersonRow({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const value = name.trim();
    if (!value) return;
    startTransition(async () => {
      const result = await createPerson(value);
      if (!result.ok) {
        setError(result.formErrors[0] ?? 'Could not add that person.');
        return;
      }
      setError(null);
      setName('');
      onSaved();
    });
  };

  return (
    <div className="mt-4 flex flex-col gap-1.5 border-t border-line2 pt-4">
      <span className="text-[11px] uppercase tracking-[0.06em] text-faint">Add a person</span>
      <div className="flex max-w-[360px] gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="Name"
          aria-label="New person's name"
          className="w-full rounded-[9px] border border-[#e5dcd0] bg-[#fffefb] px-2.5 py-2 text-[14px] outline-none focus:border-[#cbbaa4]"
        />
        <button
          type="button"
          onClick={submit}
          disabled={pending || !name.trim()}
          className="shrink-0 rounded-[9px] bg-[color:var(--accent)] px-3.5 py-2 text-[13px] font-medium text-surface disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {error && <span className="text-[11px] text-bad-fg">{error}</span>}
    </div>
  );
}

function EditPersonModal({
  person,
  onClose,
  onSaved,
  onDeleted,
}: {
  person: Person;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [displayName, setDisplayName] = useState(person.displayName);
  const [color, setColor] = useState(person.color ?? PERSON_COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const save = () => {
    startTransition(async () => {
      const result = await updatePerson(person.id, { displayName, color });
      if (!result.ok) {
        setError(result.formErrors[0] ?? 'Could not save.');
        return;
      }
      onSaved();
    });
  };

  const confirmDelete = () => {
    startTransition(async () => {
      const result = await deletePerson(person.id);
      if (!result.ok) {
        setDeleteError(result.formErrors[0] ?? 'Could not delete.');
        setConfirmingDelete(false);
        return;
      }
      onDeleted();
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${person.displayName}`}
      className="absolute inset-0 z-40 flex items-start justify-center overflow-y-auto bg-ink/[0.22] px-6 py-16"
    >
      <div
        className="w-full max-w-[420px] rounded-2xl border border-line bg-surface p-[22px] shadow-[0_24px_60px_rgba(60,45,30,0.16)]"
      >
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-serif text-xl">Edit person</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-[15px] text-faint">
            ×
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.06em] text-faint">Display name</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoFocus
              className="w-full rounded-[9px] border border-[#e5dcd0] bg-[#fffefb] px-2.5 py-2 text-[14px] outline-none focus:border-[#cbbaa4]"
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-[11px] uppercase tracking-[0.06em] text-faint">Dot colour</span>
            <div className="flex gap-2">
              {PERSON_COLORS.map((c) => {
                const selected = color === c;
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={selected}
                    aria-label={`Set colour to ${c}`}
                    onClick={() => setColor(c)}
                    className={`flex h-[30px] w-[30px] items-center justify-center rounded-[9px] border-2 bg-surface ${selected ? 'border-[#cbbaa4]' : 'border-transparent'}`}
                  >
                    <span aria-hidden className="h-3.5 w-3.5 rounded-full" style={{ background: c }} />
                  </button>
                );
              })}
            </div>
          </div>

          {error && <span className="text-[11px] text-bad-fg">{error}</span>}

          <div className="flex items-center justify-between border-t border-line2 pt-4">
            {confirmingDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-[12.5px] text-muted">Delete {person.displayName}?</span>
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
                onClick={() => {
                  setDeleteError(null);
                  setConfirmingDelete(true);
                }}
                className="text-[12.5px] text-bad-fg"
              >
                Delete person
              </button>
            )}

            <button
              type="button"
              onClick={save}
              disabled={pending || !displayName.trim()}
              className="rounded-[9px] bg-[color:var(--accent)] px-3.5 py-2 text-[13px] font-medium text-surface disabled:opacity-50"
            >
              Save
            </button>
          </div>
          {deleteError && <span className="text-[11px] text-bad-fg">{deleteError}</span>}
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-line bg-surface p-5">
      <div className="mb-4 flex flex-col gap-0.5">
        <h2 className="font-serif text-[18px]">{title}</h2>
        <p className="text-[12.5px] text-muted">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}
