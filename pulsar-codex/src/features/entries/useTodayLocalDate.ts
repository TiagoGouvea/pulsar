import { useEffect, useState } from 'react';
import { formatLocalDate } from './model';

/**
 * Recomputes the current local date while the screen stays open, so the daily
 * log never becomes retroactive after midnight.
 */
export function useTodayLocalDate(): string {
  const [today, setToday] = useState(() => formatLocalDate());
  useEffect(() => {
    const update = () => setToday(formatLocalDate());
    update();
    const interval = window.setInterval(update, 60_000);
    window.addEventListener('focus', update);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', update);
    };
  }, []);
  return today;
}
