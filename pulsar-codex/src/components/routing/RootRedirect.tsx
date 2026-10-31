import { Navigate } from 'react-router-dom';
import { useFirebase } from '@lib/firebase/context';
import { useOnboardingStatus } from '@lib/firebase/hooks';
import { hasCompletedOnboardingLocally } from '@features/onboarding/completion';

export function RootRedirect() {
  const { user, isLoading } = useFirebase();
  const { onboardingCompleted, isLoading: profileLoading } = useOnboardingStatus(user?.uid);

  if (isLoading || (user && profileLoading)) {
    return <p role="status" className="px-gutter py-space-lg body-sm">Preparando seu laboratório…</p>;
  }

  const completed = onboardingCompleted || hasCompletedOnboardingLocally(user?.uid);
  return <Navigate to={completed ? '/dashboard' : '/onboarding'} replace />;
}

export default RootRedirect;
