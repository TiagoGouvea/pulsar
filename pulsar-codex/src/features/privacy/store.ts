import { create } from 'zustand';

/**
 * Global visual privacy mode.
 *
 * The default is always abbreviations (`isNameRevealed: false`). The state
 * lives only in memory: reloading or reopening the app starts hidden again, as
 * required by spec 4.4. It is never written to localStorage or Firestore.
 */
interface PrivacyState {
  isNameRevealed: boolean;
  setNamesRevealed: (revealed: boolean) => void;
  toggleNames: () => void;
  resetPrivacy: () => void;
}

export const usePrivacyStore = create<PrivacyState>((set) => ({
  isNameRevealed: false,
  setNamesRevealed: (revealed) => set({ isNameRevealed: revealed }),
  toggleNames: () => set((state) => ({ isNameRevealed: !state.isNameRevealed })),
  resetPrivacy: () => set({ isNameRevealed: false })
}));

export function usePrivacyMode() {
  const isNameRevealed = usePrivacyStore((state) => state.isNameRevealed);
  const toggleNames = usePrivacyStore((state) => state.toggleNames);
  return { isNameRevealed, toggleNames };
}
