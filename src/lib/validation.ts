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
