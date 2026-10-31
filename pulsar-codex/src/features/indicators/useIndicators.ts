import { useEffect, useState } from 'react';
import { subscribeIndicators } from './repository';
import type { Indicator } from './types';

export function useIndicators(uid?: string) {
  const [indicators, setIndicators] = useState<Indicator[]>([]);

  useEffect(() => {
    if (!uid) {
      setIndicators([]);
      return;
    }
    return subscribeIndicators(uid, setIndicators);
  }, [uid]);

  return indicators;
}
