'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { isAccent, setAccent } from '@/lib/settings';
import {
  applicationInputSchema,
  displayPersonName,
  normalisePersonName,
} from '@/lib/validation';

export type ActionResult =
  | { ok: true }
  | { ok: false; formErrors: string[]; fieldErrors: Record<string, string[]> };

function invalid(formErrors: string[], fieldErrors: Record<string, string[]> = {}): ActionResult {
  return { ok: false, formErrors, fieldErrors };
}

/** Every view is revalidated together so they never drift apart. */
function revalidateViews() {
  revalidatePath('/applications');
  revalidatePath('/sankey');
  revalidatePath('/settings');
}

function toInput(formData: FormData) {
  return Object.fromEntries(
    ['person', 'company', 'role', 'source', 'location', 'workType', 'jobUrl', 'appliedDate', 'closingDate', 'lastActivity', 'furthestStage', 'outcome', 'notes'].map(
      (key) => [key, String(formData.get(key) ?? '')],
    ),
  );
}

export async function saveApplication(
  id: string | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = applicationInputSchema.safeParse(toInput(formData));

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return invalid(flat.formErrors, flat.fieldErrors as Record<string, string[]>);
  }

  const input = parsed.data;
  const personKey = normalisePersonName(input.person);

  const person = await prisma.person.upsert({
    where: { name: personKey },
    update: {},
    create: { name: personKey, displayName: displayPersonName(input.person) },
  });

  const data = {
    personId: person.id,
    company: input.company,
    role: input.role,
    source: input.source ?? null,
    location: input.location ?? null,
    workType: input.workType ?? null,
    jobUrl: input.jobUrl ?? null,
    appliedDate: input.appliedDate ?? null,
    closingDate: input.closingDate ?? null,
    lastActivity: input.lastActivity ?? null,
    furthestStage: input.furthestStage,
    outcome: input.outcome,
    notes: input.notes ?? null,
  };

  try {
    if (id) {
      await prisma.application.update({ where: { id }, data });
    } else {
      await prisma.application.create({ data });
    }
  } catch (error) {
    // The (person, company, role) uniqueness that makes the CSV import
    // idempotent also catches accidental duplicates entered by hand.
    if (isUniqueConstraintError(error)) {
      return invalid(['This person already has a row for that company and role.']);
    }
    throw error;
  }

  revalidateViews();
  return { ok: true };
}

export async function deleteApplication(id: string): Promise<ActionResult> {
  await prisma.application.delete({ where: { id } });
  revalidateViews();
  return { ok: true };
}

/**
 * Settings: the alias and dot colour shown for a person. The normalised `name`
 * is the identity and the import key, so it is never touched here — renaming
 * someone must not fork their rows or break a re-import.
 */
export async function updatePerson(
  id: string,
  values: { displayName?: string; color?: string | null },
): Promise<ActionResult> {
  const data: { displayName?: string; color?: string | null } = {};

  if (values.displayName !== undefined) {
    const displayName = displayPersonName(values.displayName);
    if (!displayName) return invalid(['A display name cannot be empty.'], { displayName: ['Required'] });
    if (displayName.length > 120) return invalid([], { displayName: ['Too long'] });
    data.displayName = displayName;
  }
  if (values.color !== undefined) data.color = values.color;

  await prisma.person.update({ where: { id }, data });
  revalidateViews();
  return { ok: true };
}

/**
 * Adding a person here is purely a settings-side convenience — the same
 * upsert-by-normalised-name that saveApplication does, so a person created
 * here and one created by typing their name into the form later resolve to
 * the same row instead of forking.
 */
export async function createPerson(name: string): Promise<ActionResult> {
  const displayName = displayPersonName(name);
  if (!displayName) return invalid(['A name is required.'], { name: ['Required'] });
  if (displayName.length > 120) return invalid([], { name: ['Too long'] });

  const personKey = normalisePersonName(name);
  const existing = await prisma.person.findUnique({ where: { name: personKey } });
  if (existing) return invalid(['Someone with that name already exists.']);

  await prisma.person.create({ data: { name: personKey, displayName } });
  revalidateViews();
  return { ok: true };
}

/**
 * Person deletion cascades to their applications at the schema level, so this
 * refuses to delete anyone with rows rather than silently wiping them —
 * deleting the rows first is a deliberate, separate action.
 */
export async function deletePerson(id: string): Promise<ActionResult> {
  const count = await prisma.application.count({ where: { personId: id } });
  if (count > 0) {
    return invalid([`Can't delete — this person still has ${count} application${count === 1 ? '' : 's'}.`]);
  }
  await prisma.person.delete({ where: { id } });
  revalidateViews();
  return { ok: true };
}

export async function updateAccent(value: string): Promise<ActionResult> {
  if (!isAccent(value)) return invalid(['That is not one of the accent colours.']);
  await setAccent(value);
  revalidateViews();
  return { ok: true };
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  );
}
