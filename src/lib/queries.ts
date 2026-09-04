import { prisma } from './db';
import { toPrismaWhere, type Filters } from './filters';

/** Shape both views render from; dates are serialised for the client boundary. */
export interface ApplicationRow {
  id: string;
  person: string;
  personKey: string;
  company: string;
  role: string;
  source: string | null;
  location: string | null;
  workType: string | null;
  jobUrl: string | null;
  appliedDate: string;
  lastActivity: string | null;
  furthestStage: string;
  outcome: string;
  notes: string | null;
}

export async function getApplications(filters: Filters): Promise<ApplicationRow[]> {
  const rows = await prisma.application.findMany({
    where: toPrismaWhere(filters),
    orderBy: [{ appliedDate: 'desc' }, { company: 'asc' }],
    include: { person: { select: { name: true, displayName: true } } },
  });

  return rows.map((row) => ({
    id: row.id,
    person: row.person.displayName,
    personKey: row.person.name,
    company: row.company,
    role: row.role,
    source: row.source,
    location: row.location,
    workType: row.workType,
    jobUrl: row.jobUrl,
    appliedDate: row.appliedDate.toISOString().slice(0, 10),
    lastActivity: row.lastActivity ? row.lastActivity.toISOString().slice(0, 10) : null,
    furthestStage: row.furthestStage,
    outcome: row.outcome,
    notes: row.notes,
  }));
}

/**
 * Options for the filter bar. Deliberately unfiltered: the choices on offer
 * should not disappear as you narrow the view, or filters become a dead end.
 */
export async function getFilterOptions() {
  const [people, sources] = await Promise.all([
    prisma.person.findMany({
      orderBy: { displayName: 'asc' },
      select: { name: true, displayName: true, _count: { select: { applications: true } } },
    }),
    prisma.application.findMany({
      where: { source: { not: null } },
      distinct: ['source'],
      select: { source: true },
      orderBy: { source: 'asc' },
    }),
  ]);

  return {
    people: people.map((person) => ({
      name: person.name,
      displayName: person.displayName,
      count: person._count.applications,
    })),
    sources: sources.map((row) => row.source).filter((s): s is string => Boolean(s)),
  };
}

export async function getPeople() {
  return prisma.person.findMany({
    orderBy: { displayName: 'asc' },
    select: { name: true, displayName: true },
  });
}
