import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface PrivacyState {
  isNameRevealed: boolean;
  toggleNames: () => void;
}

const PrivacyContext = createContext<PrivacyState | null>(null);

// Names start hidden on every app open and are never persisted (spec 4.4, arquitetura 2).
export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [isNameRevealed, setRevealed] = useState(false);
  const value = useMemo(
    () => ({ isNameRevealed, toggleNames: () => setRevealed((v) => !v) }),
    [isNameRevealed],
  );
  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePrivacy(): PrivacyState {
  const ctx = useContext(PrivacyContext);
  if (!ctx) throw new Error('usePrivacy must be used inside <PrivacyProvider>');
  return ctx;
}
