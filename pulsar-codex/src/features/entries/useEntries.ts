import { useEffect, useState } from 'react';
import { subscribeEntries } from './repository';
import type { Entry } from './types';

export interface EntriesState {
  entries: Entry[];
  loading: boolean;
  error: string;
}

/**
 * Subscribes to the owner entries. There is no local cache by design: the
 * daily log must never present an unconfirmed answer as saved. While loading,
 * `loading` stays true; a listener failure becomes an explicit error state.
 */
export function useEntries(uid?: string): EntriesState {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(Boolean(uid));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!uid) {
      setEntries([]);
      setLoading(false);
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    return subscribeEntries(
      uid,
      (next) => {
        setEntries(next);
        setLoading(false);
      },
      () => {
        setLoading(false);
        setError('Não foi possível carregar seus registros. Verifique a conexão e tente novamente.');
      }
    );
  }, [uid]);

  return { entries, loading, error };
}
