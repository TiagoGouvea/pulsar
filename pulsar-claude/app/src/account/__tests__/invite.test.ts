import { describe, expect, it } from 'vitest';
import {
  SAVE_ACCOUNT_INVITE_MIN_DAYS,
  SAVE_ACCOUNT_INVITE_REAPPEAR_AFTER_DAYS,
  countDistinctEntryDays,
  shouldShowSaveAccountInvite,
} from '../invite';

describe('save account invite rule', () => {
  it('stays hidden below three distinct days with entries and shows on the third', () => {
    for (const days of [0, 1, 2]) {
      expect(
        shouldShowSaveAccountInvite({
          isAnonymous: true,
          distinctDaysWithEntries: days,
          dismissedDayCount: null,
        }),
      ).toBe(false);
    }
    expect(SAVE_ACCOUNT_INVITE_MIN_DAYS).toBe(3);
    expect(
      shouldShowSaveAccountInvite({
        isAnonymous: true,
        distinctDaysWithEntries: 3,
        dismissedDayCount: null,
      }),
    ).toBe(true);
  });

  it('comes back only after seven more distinct days with entries once dismissed', () => {
    expect(SAVE_ACCOUNT_INVITE_REAPPEAR_AFTER_DAYS).toBe(7);
    // Dismissed with three distinct days: the invite stays hidden until the tenth day.
    for (const days of [3, 4, 5, 6, 7, 8, 9]) {
      expect(
        shouldShowSaveAccountInvite({
          isAnonymous: true,
          distinctDaysWithEntries: days,
          dismissedDayCount: 3,
        }),
      ).toBe(false);
    }
    expect(
      shouldShowSaveAccountInvite({
        isAnonymous: true,
        distinctDaysWithEntries: 10,
        dismissedDayCount: 3,
      }),
    ).toBe(true);
  });

  it('counts the new days from the dismissal moment, not from the first invite', () => {
    // Dismissed later (five distinct days): the invite returns on the twelfth day.
    expect(
      shouldShowSaveAccountInvite({
        isAnonymous: true,
        distinctDaysWithEntries: 11,
        dismissedDayCount: 5,
      }),
    ).toBe(false);
    expect(
      shouldShowSaveAccountInvite({
        isAnonymous: true,
        distinctDaysWithEntries: 12,
        dismissedDayCount: 5,
      }),
    ).toBe(true);
  });

  it('never shows for an account that was already converted', () => {
    expect(
      shouldShowSaveAccountInvite({
        isAnonymous: false,
        distinctDaysWithEntries: 30,
        dismissedDayCount: null,
      }),
    ).toBe(false);
    expect(
      shouldShowSaveAccountInvite({
        isAnonymous: false,
        distinctDaysWithEntries: 30,
        dismissedDayCount: 3,
      }),
    ).toBe(false);
  });

  it('counts each day with entries only once', () => {
    expect(
      countDistinctEntryDays(['2026-03-01', '2026-03-01', '2026-03-02', '2026-03-03', '2026-03-03']),
    ).toBe(3);
    expect(countDistinctEntryDays([])).toBe(0);
  });
});
