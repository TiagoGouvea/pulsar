import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback
} from 'react';
import {
  User,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  linkWithCredential,
  signOut,
  GoogleAuthProvider,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from './config';

interface FirebaseContextType {
  user: User | null;
  isLoading: boolean;
  anonymous: boolean;
  googleAvailable: boolean;
  emailAvailable: boolean;
  signInAnonymous: () => Promise<void>;
  signInGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  linkCredential: (credential: { provider: string }) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInAnonymous = useCallback(async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error('Failed to sign in anonymously:', error);
      throw error;
    }
  }, []);

  const signInGoogle = useCallback(async () => {
    try {
      await signInWithCredential(auth, GoogleAuthProvider.credential());
    } catch (error) {
      console.error('Failed to sign in with Google:', error);
      throw error;
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Failed to send password reset:', error);
      throw error;
    }
  }, []);

  const linkCredential = useCallback(async (credential: { provider: string }) => {
    try {
      if (!user) throw new Error('No user logged in');
      await linkWithCredential(user, { providerId: credential.provider } as any);
    } catch (error) {
      console.error('Failed to link credential:', error);
      throw error;
    }
  }, [user]);

  const signOutUser = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Failed to sign out:', error);
      throw error;
    }
  }, []);

  const value = {
    user,
    isLoading,
    anonymous: user?.isAnonymous ?? false,
    googleAvailable: true,
    emailAvailable: true,
    signInAnonymous,
    signInGoogle,
    sendPasswordReset,
    linkCredential,
    signOutUser
  };

  return <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>;
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};

export default FirebaseContext;
