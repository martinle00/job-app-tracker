import type { Prisma } from '@prisma/client';
import { OUTCOME_IDS, STAGE_IDS, type OutcomeId, type StageId } from './stages';
import { parseDate } from './validation';

/**
 * Filter state lives entirely in the URL, so the table and the chart read the
 * same source and a filtered view is a shareable link. `FilterBar` is the only
 * component that writes it.
 */
export interface Filters {
  people: string[];
  outcomes: OutcomeId[];
  stages: StageId[];
  sources: string[];
  from?: Date;
  to?: Date;
  q?: string;
}

/** Next passes repeated params as arrays and single ones as strings. */
export type SearchParams = Record<string, string | string[] | undefined>;

function toArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw.flatMap((v) => v.split(',')).map((v) => v.trim()).filter(Boolean);
}

function toSingle(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  const trimmed = first?.trim();
  return trimmed ? trimmed : undefined;
}

export function parseFilters(params: SearchParams): Filters {
  const outcomes = toArray(params.outcome).filter((v): v is OutcomeId =>
    (OUTCOME_IDS as readonly string[]).includes(v),
  );
  const stages = toArray(params.stage).filter((v): v is StageId =>
    (STAGE_IDS as readonly string[]).includes(v),
  );

  const from = toSingle(params.from);
  const to = toSingle(params.to);

  return {
    people: toArray(params.person),
    outcomes,
    stages,
    sources: toArray(params.source),
    from: from ? parseDate(from) : undefined,
    to: to ? parseDate(to) : undefined,
    q: toSingle(params.q),
  };
}

/** Builds the Prisma `where` both views query with, so they cannot disagree. */
export function toPrismaWhere(filters: Filters): Prisma.ApplicationWhereInput {
  const where: Prisma.ApplicationWhereInput = {};

  if (filters.people.length > 0) {
    where.person = { name: { in: filters.people } };
  }
  if (filters.outcomes.length > 0) {
    where.outcome = { in: filters.outcomes };
  }
  if (filters.stages.length > 0) {
    where.furthestStage = { in: filters.stages };
  }
  if (filters.sources.length > 0) {
    where.source = { in: filters.sources };
  }
  if (filters.from || filters.to) {
    where.appliedDate = {
      ...(filters.from ? { gte: filters.from } : {}),
      // `to` is an inclusive day, so extend it to the end of that day.
      ...(filters.to ? { lte: endOfDay(filters.to) } : {}),
    };
  }
  if (filters.q) {
    where.OR = [
      { company: { contains: filters.q } },
      { role: { contains: filters.q } },
      { notes: { contains: filters.q } },
      { location: { contains: filters.q } },
    ];
  }

  return where;
}

function endOfDay(date: Date): Date {
  return new Date(date.getTime() + 24 * 60 * 60 * 1000 - 1);
}

export function hasActiveFilters(filters: Filters): boolean {
  return (
    filters.people.length > 0 ||
    filters.outcomes.length > 0 ||
    filters.stages.length > 0 ||
    filters.sources.length > 0 ||
    filters.from !== undefined ||
    filters.to !== undefined ||
    filters.q !== undefined
  );
}

/** Serialises filter state back into a query string for links between views. */
export function toSearchParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();
  for (const person of filters.people) params.append('person', person);
  for (const outcome of filters.outcomes) params.append('outcome', outcome);
  for (const stage of filters.stages) params.append('stage', stage);
  for (const source of filters.sources) params.append('source', source);
  if (filters.from) params.set('from', toDateInput(filters.from));
  if (filters.to) params.set('to', toDateInput(filters.to));
  if (filters.q) params.set('q', filters.q);
  return params;
}

/** Dates are stored at UTC midnight, so format them in UTC to avoid drift. */
export function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}
