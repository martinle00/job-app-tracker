import { describe, expect, it } from 'vitest';
import { hasActiveFilters, parseFilters, toPrismaWhere, toSearchParams } from '../src/lib/filters';

describe('parseFilters', () => {
  it('reads repeated and comma-separated params as multi-select', () => {
    expect(parseFilters({ person: ['alex chen', 'sam okafor'] }).people).toEqual([
      'alex chen',
      'sam okafor',
    ]);
    expect(parseFilters({ person: 'alex chen,sam okafor' }).people).toEqual([
      'alex chen',
      'sam okafor',
    ]);
  });

  it('drops values that are not part of the vocabulary', () => {
    const filters = parseFilters({ outcome: ['REJECTED', 'NONSENSE'], stage: 'ALSO_NONSENSE' });

    expect(filters.outcomes).toEqual(['REJECTED']);
    expect(filters.stages).toEqual([]);
  });

  it('treats an empty search as no search at all', () => {
    expect(parseFilters({ q: '   ' }).q).toBeUndefined();
    expect(hasActiveFilters(parseFilters({}))).toBe(false);
  });
});

describe('toPrismaWhere', () => {
  it('omits clauses for filters that are not set', () => {
    expect(toPrismaWhere(parseFilters({}))).toEqual({});
  });

  it('makes the end of the date range inclusive of that whole day', () => {
    const where = toPrismaWhere(parseFilters({ from: '2025-01-01', to: '2025-01-31' }));
    const range = where.appliedDate as { gte: Date; lte: Date };

    expect(range.gte.toISOString()).toBe('2025-01-01T00:00:00.000Z');
    // An application made at any time on the 31st still falls inside the range.
    expect(range.lte.toISOString()).toBe('2025-01-31T23:59:59.999Z');
  });

  it('filters people by their normalised key', () => {
    const where = toPrismaWhere(parseFilters({ person: 'alex chen' }));
    expect(where.person).toEqual({ name: { in: ['alex chen'] } });
  });
});

describe('toSearchParams', () => {
  it('round-trips filter state through the URL', () => {
    const original = parseFilters({
      person: ['alex chen', 'sam okafor'],
      outcome: 'REJECTED',
      stage: 'OFFER',
      from: '2025-01-01',
      to: '2025-06-30',
      q: 'canva',
    });

    const roundTripped = parseFilters(
      Object.fromEntries(
        [...toSearchParams(original).keys()].map((key) => [
          key,
          toSearchParams(original).getAll(key),
        ]),
      ),
    );

    expect(roundTripped).toEqual(original);
  });
});
