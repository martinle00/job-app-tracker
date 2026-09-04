/**
 * Closing dates only matter relative to today, so the table shows the gap
 * rather than the date: a row that closes this week should read as urgent
 * without the reader doing date arithmetic.
 */
export type Urgency = 'closed' | 'today' | 'soon' | 'later' | 'none';

export interface ClosingStatus {
  urgency: Urgency;
  label: string;
  /** Tailwind classes for the chip. */
  className: string;
  days: number | null;
}

const SOON_DAYS = 7;

export function closingStatus(closingDate: string | null, today = new Date()): ClosingStatus {
  if (!closingDate) {
    return { urgency: 'none', label: '—', className: 'text-[#b3a897]', days: null };
  }

  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const close = Date.parse(`${closingDate}T00:00:00Z`);
  const days = Math.round((close - start) / 86_400_000);

  if (days < 0) {
    return { urgency: 'closed', label: 'closed', className: 'bg-[#f4efe7] text-[#9a9084]', days };
  }
  if (days === 0) {
    return { urgency: 'today', label: 'closes today', className: 'bg-bad-bg text-bad-fg', days };
  }
  if (days <= SOON_DAYS) {
    return {
      urgency: 'soon',
      label: `in ${days} ${days === 1 ? 'day' : 'days'}`,
      className: 'bg-warn-bg text-warn-fg',
      days,
    };
  }
  return { urgency: 'later', label: formatDay(closingDate), className: 'bg-[#f4efe7] text-neutral-fg', days };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Dates are stored at UTC midnight, so format them in UTC to avoid drift. */
export function formatDay(day: string | null): string {
  if (!day) return '—';
  const date = new Date(`${day}T00:00:00Z`);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${String(date.getUTCFullYear()).slice(2)}`;
}

/** Days since a stored day, positive for the past. Null when there is no date. */
export function daysSince(day: string | null, today = new Date()): number | null {
  if (!day) return null;
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((start - Date.parse(`${day}T00:00:00Z`)) / 86_400_000);
}
