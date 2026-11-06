import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth } from '../lib/firebase';
import {
  completeOnboarding as persistOnboardingCompletion,
  ensureUserProfile,
  watchUserProfile,
  type UserProfile,
} from './userRepository';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  completeOnboarding: () => Promise<void>;
  refreshCurrentUser: () => void;
}

const initialState: AuthState = { user: null, profile: null, loading: true, error: null };
const AuthContext = createContext<AuthContextValue>({
  ...initialState,
  completeOnboarding: async () => {
    throw new Error('Authentication is still loading.');
  },
  refreshCurrentUser: () => {},
});

// Shared by every subscriber (e.g. StrictMode double effects) so a first visit never creates two anonymous accounts.
let pendingSignIn: Promise<unknown> | null = null;

function errorMessage(err: unknown): string {
  const code = (err as { code?: string } | null)?.code;
  return code === 'auth/network-request-failed' || code === 'unavailable'
    ? 'Sem conexão com a internet. Verifique sua rede e tente novamente.'
    : 'Não foi possível iniciar o Pulsar. Tente novamente.';
}

// First visit signs in anonymously (no signup screen); the SDK persists the session, so reloads keep the UID.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);

  useEffect(() => {
    // Each auth change starts a new generation; results and errors from older ones are ignored.
    let generation = 0;
    let stopProfile = () => {};
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const current = ++generation;
      const isCurrent = () => current === generation;
      const fail = (err: unknown) => {
        if (isCurrent()) setState({ user: null, profile: null, loading: false, error: errorMessage(err) });
      };
      stopProfile();
      stopProfile = () => {};
      setState(initialState);
      if (!user) {
        pendingSignIn ??= signInAnonymously(auth).finally(() => (pendingSignIn = null));
        pendingSignIn.catch(fail);
        return;
      }
      ensureUserProfile(user.uid).then((profile) => {
        if (!isCurrent()) return;
        // A transaction is server-confirmed; never release navigation from a cache-only snapshot.
        setState({ user, profile, loading: false, error: null });
        // A permanent listener would keep every app route network-active forever (browser gates wait for
        // network silence) and anonymous sessions already update their own flag locally. The live watch
        // only matters while a converted account can still complete onboarding elsewhere; it stops as
        // soon as that happens.
        if (user.isAnonymous !== true && !profile.onboardingCompleted) {
          stopProfile = watchUserProfile(
            user.uid,
            (profile) => {
              if (!isCurrent()) return;
              setState({ user, profile, loading: false, error: null });
              if (profile.onboardingCompleted) stopProfile();
            },
            fail,
          );
        }
      }, fail);
    });
    return () => {
      generation += 1;
      stopProfile();
      unsubscribe();
    };
  }, []);

  async function completeOnboarding(): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('An authenticated user is required to complete onboarding.');
    await persistOnboardingCompletion(user.uid);
    setState((current) =>
      current.user?.uid === user.uid && current.profile
        ? { ...current, profile: { ...current.profile, onboardingCompleted: true } }
        : current,
    );
  }

  function refreshCurrentUser(): void {
    const user = auth.currentUser;
    setState((current) => (user && current.user?.uid === user.uid ? { ...current, user } : current));
  }

  return (
    <AuthContext.Provider value={{ ...state, completeOnboarding, refreshCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
