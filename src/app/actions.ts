'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
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

/** Both views are revalidated together so they never drift apart. */
function revalidateViews() {
  revalidatePath('/applications');
  revalidatePath('/sankey');
}

function toInput(formData: FormData) {
  return Object.fromEntries(
    ['person', 'company', 'role', 'source', 'location', 'workType', 'jobUrl', 'appliedDate', 'lastActivity', 'furthestStage', 'outcome', 'notes'].map(
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
    appliedDate: input.appliedDate,
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
    // The (person, company, role, appliedDate) uniqueness that makes the CSV
    // import idempotent also catches accidental duplicates entered by hand.
    if (isUniqueConstraintError(error)) {
      return invalid([
        'An application already exists for this person, company, role and applied date.',
      ]);
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

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  );
}
