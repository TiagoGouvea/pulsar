import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { watchEntriesForDay } from '../data/entries';
import { useIndicators } from '../data/indicators';
import type { Entry } from '../domain/entry';
import { QuickEntry } from '../entry/QuickEntry';
import { localDate } from '../lib/time';

export function QuickEntryPage() {
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const navigate = useNavigate();
  const { activeIndicators, loading, error } = useIndicators(uid);
  const [day, setDay] = useState(() => localDate());
  const [entriesState, setEntriesState] = useState<{ day: string; entries: Entry[]; error: boolean } | null>(
    null,
  );

  useEffect(() => {
    const refreshDay = () => setDay(localDate());
    const timer = window.setInterval(refreshDay, 30_000);
    document.addEventListener('visibilitychange', refreshDay);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshDay);
    };
  }, []);

  useEffect(() => {
    if (!uid) return;
    return watchEntriesForDay(
      uid,
      day,
      (entries) => setEntriesState({ day, entries, error: false }),
      () => setEntriesState({ day, entries: [], error: true }),
    );
  }, [uid, day]);

  if (error || (entriesState?.day === day && entriesState.error)) {
    return (
      <p role="alert" className="font-body-md text-body-md text-error">
        Não foi possível carregar os registros. Verifique sua conexão e tente novamente.
      </p>
    );
  }
  if (loading || entriesState?.day !== day)
    return (
      <p role="status" className="font-body-md text-body-md text-on-surface-variant">
        Carregando registros…
      </p>
    );
  return (
    <QuickEntry
      key={`${uid}-${day}`}
      uid={uid}
      indicators={activeIndicators}
      entries={entriesState.entries}
      day={day}
      onDone={() => navigate('/dashboard')}
    />
  );
}
