/**
 * Rule of the discreet "save your account" invite (spec 3 and DECISOES > Login).
 *
 * Pure and deterministic: no clock, no Firebase, no DOM. The caller passes the current numbers so
 * the rule can be tested without a server.
 */

/** Distinct days with entries needed before the invite shows up. */
export const SAVE_ACCOUNT_INVITE_MIN_DAYS = 3;

/** Extra distinct days with entries needed before a dismissed invite comes back. */
export const SAVE_ACCOUNT_INVITE_REAPPEAR_AFTER_DAYS = 7;

export interface SaveAccountInviteInput {
  /** True while the session still runs on the anonymous UID. */
  isAnonymous: boolean;
  /** Distinct days with at least one entry. */
  distinctDaysWithEntries: number;
  /** Distinct days counted when the invite was dismissed (null when it was never dismissed). */
  dismissedDayCount: number | null;
}

/**
 * True when the banner must be shown on the dashboard.
 *
 * - A converted (non anonymous) account never sees the invite.
 * - Fewer than three distinct days with entries never shows it.
 * - Once dismissed, it only comes back after seven more distinct days with entries.
 */
export function shouldShowSaveAccountInvite({
  isAnonymous,
  distinctDaysWithEntries,
  dismissedDayCount,
}: SaveAccountInviteInput): boolean {
  if (!isAnonymous) return false;
  if (distinctDaysWithEntries < SAVE_ACCOUNT_INVITE_MIN_DAYS) return false;
  if (dismissedDayCount === null) return true;
  return distinctDaysWithEntries >= dismissedDayCount + SAVE_ACCOUNT_INVITE_REAPPEAR_AFTER_DAYS;
}

/** Counts the distinct days (YYYY-MM-DD keys) that have at least one entry. */
export function countDistinctEntryDays(localDates: readonly string[]): number {
  return new Set(localDates).size;
}
