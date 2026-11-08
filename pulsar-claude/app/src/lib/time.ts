/**
 * Time utilities for the app.
 *
 * Principles (see spec 5.2 and architecture 1.1/3.3):
 * - Timestamps are persisted in UTC (`toUtcIso`).
 * - Display uses the browser timezone with pt-BR formatting (`formatDate`, `formatDateTime`).
 * - `localDate` is the day key computed by the browser at record time; it rolls over at
 *   local midnight and changes if the device timezone changes (no trip correction).
 * - `brasiliaDateKey` is always computed in America/Sao_Paulo, regardless of the browser
 *   timezone (used for AI quota and reminders).
 * - No special handling for trips or timezone changes anywhere.
 */

/** Formats an instant into a YYYY-MM-DD day key in the given IANA timezone. */
function toDateKey(date: Date, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * Local day key (YYYY-MM-DD) in the browser timezone at the moment of recording.
 * Defaults to the current time. Rolls over at local midnight.
 */
export function localDate(date?: Date): string {
  return toDateKey(date ?? new Date());
}

/** UTC ISO timestamp for persistence (independent of the browser timezone). */
export function toUtcIso(date: Date): string {
  return date.toISOString();
}

/** Formats a date (or ISO string) as dd/mm/yyyy in the browser timezone. */
export function formatDate(input: Date | string): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/** Formats a date (or ISO string) as "dd/mm/yyyy hh:mm" (24h) in the browser timezone. */
export function formatDateTime(input: Date | string): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  const parts = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';
  const hours = get('hour');
  const minutes = get('minute');
  return `${formatDate(date)} ${hours}:${minutes}`;
}

/** Formats a date (or ISO string) as "hh:mm" (24h) in the browser timezone. */
export function formatTime(input: Date | string): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  const parts = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${get('hour')}:${get('minute')}`;
}

/**
 * Day key (YYYY-MM-DD) in America/Sao_Paulo, independent of the browser timezone.
 * Used for the AI quota and reminders.
 */
export function brasiliaDateKey(date?: Date): string {
  return toDateKey(date ?? new Date(), 'America/Sao_Paulo');
}

/** Adds calendar days to a YYYY-MM-DD key (UTC arithmetic, immune to browser DST). */
export function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateKey(date, 'UTC');
}

/**
 * Consecutive calendar days ending on `endDateKey` (inclusive), oldest first.
 * Defaults to the 30-day rolling window used by insights.
 */
export function windowDays(endDateKey: string, size = 30): string[] {
  const days: string[] = [];
  for (let i = size - 1; i >= 0; i--) {
    days.push(addDays(endDateKey, -i));
  }
  return days;
}
