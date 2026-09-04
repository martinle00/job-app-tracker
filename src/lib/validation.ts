import { z } from 'zod';
import {
  OUTCOME_IDS,
  STAGE_IDS,
  WORK_TYPES,
  isConsistent,
  type OutcomeId,
  type StageId,
} from './stages';

const trimmed = z.string().trim();
const optionalText = trimmed.max(2000).optional().or(z.literal('')).transform((v) => (v ? v : undefined));

/** Person names are matched case-insensitively with whitespace collapsed. */
export function normalisePersonName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function displayPersonName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

/**
 * Accepts the date shapes the export produces. Day-first throughout — the sheet
 * is written DD/MM/YYYY ("29/8/2026"), so a bare 08/04/2025 is 8 April, and
 * guessing per-row would silently mangle every date before the 13th.
 *
 * Returns undefined rather than an Invalid Date so callers can report the bad
 * row instead of writing garbage.
 */
export function parseDate(raw: string): Date | undefined {
  const value = raw.trim();
  if (!value) return undefined;

  const dayFirst = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dayFirst) {
    const [, d, m, y] = dayFirst;
    if (Number(m) > 12 || Number(d) > 31) return undefined;
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  // YYYY-MM-DD and full ISO timestamps, as produced by the date inputs.
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const [, y, m, d] = iso;
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
}

const optionalDateFromInput = z
  .string()
  .trim()
  .optional()
  .transform((value, ctx) => {
    if (!value) return undefined;
    const parsed = parseDate(value);
    if (!parsed) {
      ctx.addIssue({ code: 'custom', message: `Unrecognised date: "${value}"` });
      return z.NEVER;
    }
    return parsed;
  });

export const applicationInputSchema = z
  .object({
    person: trimmed.min(1, 'Who applied?').max(120),
    company: trimmed.min(1, 'Company is required').max(200),
    role: trimmed.min(1, 'Role is required').max(200),
    source: optionalText,
    location: optionalText,
    workType: z.enum(WORK_TYPES).optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
    jobUrl: trimmed.url('Must be a URL').optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
    appliedDate: optionalDateFromInput,
    closingDate: optionalDateFromInput,
    lastActivity: optionalDateFromInput,
    furthestStage: z.enum(STAGE_IDS as unknown as [StageId, ...StageId[]]),
    outcome: z.enum(OUTCOME_IDS as unknown as [OutcomeId, ...OutcomeId[]]),
    notes: optionalText,
  })
  .superRefine((value, ctx) => {
    if (!isConsistent(value.furthestStage, value.outcome)) {
      const message =
        value.outcome === 'NOT_APPLIED'
          ? 'A role you have not applied to yet cannot have reached a later stage.'
          : 'An offer outcome requires the application to have reached the Offer stage.';
      ctx.addIssue({ code: 'custom', path: ['outcome'], message });
    }

    // The applied date is what separates a sent application from a shortlisted
    // one, so the two have to agree.
    if (value.outcome === 'NOT_APPLIED' && value.appliedDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['appliedDate'],
        message: 'Remove the applied date, or change the outcome away from "Not yet applied".',
      });
    }
    if (value.outcome !== 'NOT_APPLIED' && !value.appliedDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['appliedDate'],
        message: 'An applied date is required unless the outcome is "Not yet applied".',
      });
    }

    if (value.lastActivity && value.appliedDate && value.lastActivity < value.appliedDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['lastActivity'],
        message: 'Last activity cannot be before the applied date.',
      });
    }
  });

export type ApplicationInput = z.infer<typeof applicationInputSchema>;
