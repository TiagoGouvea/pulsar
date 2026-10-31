import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebase } from '@lib/firebase/context';
import { markOnboardingCompleted } from './completion';

export function useOnboardingCompletion() {
  const navigate = useNavigate();
  const { user } = useFirebase();
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState('');
  const running = useRef(false);

  async function complete() {
    if (running.current) return;
    running.current = true;
    setIsCompleting(true);
    setError('');

    try {
      await markOnboardingCompleted(user?.uid ?? null);
      navigate('/dashboard', { replace: true });
    } catch {
      setError('Não foi possível salvar a conclusão do tutorial. Tente novamente.');
    } finally {
      running.current = false;
      setIsCompleting(false);
    }
  }

  return { complete, isCompleting, error };
}
