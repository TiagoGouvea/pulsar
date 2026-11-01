import { useState } from 'react';

const ELIGIBLE_KEY = 'pulsar.accountSaveInvite.eligible';
const DISMISSED_KEY = 'pulsar.accountSaveInvite.dismissed';

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

function writeFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Preferences are best effort when storage is blocked.
  }
}

/** Clears the invitation state when the account (and its caches) is deleted. */
export function clearAccountSaveInvite(): void {
  try {
    localStorage.removeItem(ELIGIBLE_KEY);
    localStorage.removeItem(DISMISSED_KEY);
  } catch {
    // Preferences are best effort when storage is blocked.
  }
}

/**
 * The save-account invitation is earned by a useful action, never shown on the
 * first paint, and can be dismissed without interrupting the task at hand.
 */
export function useAccountSaveInvite(isAnonymous: boolean) {
  const [eligible, setEligible] = useState(() => readFlag(ELIGIBLE_KEY));
  const [dismissed, setDismissed] = useState(() => readFlag(DISMISSED_KEY));

  function markUsefulInteraction() {
    writeFlag(ELIGIBLE_KEY, true);
    setEligible(true);
  }

  function dismiss() {
    writeFlag(DISMISSED_KEY, true);
    setDismissed(true);
  }

  return {
    visible: isAnonymous && eligible && !dismissed,
    markUsefulInteraction,
    dismiss
  };
}
