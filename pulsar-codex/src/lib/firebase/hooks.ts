import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './config';
import { usePrivacyStore } from '@features/privacy/store';

/**
 * Hook to listen to user document in Firestore
 */
export const useUserDoc = (userId?: string) => {
  const [userData, setUserData] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setUserData(null);
      setIsLoading(false);
      return;
    }

    const docRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setUserData(snapshot.data());
        } else {
          setUserData(null);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching user doc:', error);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [userId]);

  return { userData, isLoading };
};

/**
 * Hook to check if user is on first visit
 */
export const useIsFirstVisit = (userId?: string) => {
  const { userData, isLoading } = useUserDoc(userId);
  const isFirstVisit = userData?.onboardingCompleted === false || !userData;

  return { isFirstVisit, isLoading };
};

/**
 * Hook to check if user has completed onboarding
 */
export const useOnboardingStatus = (userId?: string) => {
  const { userData, isLoading } = useUserDoc(userId);
  const onboardingCompleted = userData?.onboardingCompleted ?? false;

  return { onboardingCompleted, isLoading };
};

/**
 * Hook to toggle indicator name visibility. Privacy mode is intentionally
 * in-memory only: reopening the app always starts in abbreviations (spec 4.4).
 */
export const useNameRevealed = () => {
  const isNameRevealed = usePrivacyStore((state) => state.isNameRevealed);
  const toggleNameRevealed = usePrivacyStore((state) => state.toggleNames);
  return { isNameRevealed, toggleNameRevealed };
};
