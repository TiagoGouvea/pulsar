import { beforeEach, describe, expect, it } from 'vitest';
import { usePrivacyStore } from './store';

beforeEach(() => {
  usePrivacyStore.setState({ isNameRevealed: false });
});

describe('privacy store', () => {
  it('starts with abbreviations and toggles globally between names and abbreviations', () => {
    expect(usePrivacyStore.getState().isNameRevealed).toBe(false);
    usePrivacyStore.getState().toggleNames();
    expect(usePrivacyStore.getState().isNameRevealed).toBe(true);
    usePrivacyStore.getState().toggleNames();
    expect(usePrivacyStore.getState().isNameRevealed).toBe(false);
  });

  it('can be reset when the app returns to the default mode', () => {
    usePrivacyStore.getState().setNamesRevealed(true);
    expect(usePrivacyStore.getState().isNameRevealed).toBe(true);
    usePrivacyStore.getState().resetPrivacy();
    expect(usePrivacyStore.getState().isNameRevealed).toBe(false);
  });
});
