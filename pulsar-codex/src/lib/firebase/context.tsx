import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onIdTokenChanged, type User } from 'firebase/auth';
import { auth } from './config';
import * as session from '@features/auth/session';
import { accountErrorMessage } from '@features/auth/errors';

interface FirebaseContextType {
  user: User | null;
  isLoading: boolean;
  anonymous: boolean;
  initializationError: string | null;
  emailLinkPending: boolean;
  pendingEmail: string;
  signInAnonymous: typeof session.startAnonymousSession;
  linkGoogle: typeof session.linkGoogle;
  loginGoogle: typeof session.loginGoogle;
  sendEmailLink: typeof session.sendEmailLink;
  completeEmailLink: () => ReturnType<typeof session.completeEmailLink>;
  dismissEmailLink: () => void;
  reauthenticateGoogle: typeof session.reauthenticateGoogle;
  signOutUser: typeof session.logout;
  deleteAccount: typeof session.deleteAccount;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<{ user: User | null }>({ user: null });
  const [isLoading, setIsLoading] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [emailLinkPending, setEmailLinkPending] = useState(session.hasEmailLink);

  useEffect(() => {
    let active = true;
    const unsubscribe = onIdTokenChanged(auth, (user) => {
      if (active) setSnapshot({ user });
    });
    session.initializeSession().catch((error: unknown) => {
      if (active) setInitializationError(accountErrorMessage(error));
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const refresh = () => setSnapshot({ user: auth.currentUser });
  const value: FirebaseContextType = {
    user: snapshot.user,
    isLoading,
    anonymous: snapshot.user?.isAnonymous ?? false,
    initializationError,
    emailLinkPending,
    pendingEmail: session.getPendingEmailLink()?.email ?? '',
    signInAnonymous: async () => {
      await session.startAnonymousSession();
      setInitializationError(null);
      refresh();
    },
    linkGoogle: async () => { await session.linkGoogle(); refresh(); },
    loginGoogle: async () => { await session.loginGoogle(); refresh(); },
    sendEmailLink: session.sendEmailLink,
    completeEmailLink: async () => {
      const intent = await session.completeEmailLink();
      setEmailLinkPending(false);
      refresh();
      return intent;
    },
    dismissEmailLink: () => {
      session.dismissEmailLink();
      setEmailLinkPending(false);
    },
    reauthenticateGoogle: session.reauthenticateGoogle,
    signOutUser: async () => { await session.logout(); refresh(); },
    deleteAccount: async () => { await session.deleteAccount(); refresh(); }
  };

  return <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>;
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (!context) throw new Error('useFirebase must be used within a FirebaseProvider');
  return context;
}
