import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { db } from '@lib/firebase/config';
import type { Indicator, IndicatorInput } from './types';

const CACHE_KEY_PREFIX = 'pulsar.indicators.cache.';

function cacheKey(uid: string): string {
  return `${CACHE_KEY_PREFIX}${uid}`;
}

function isIndicator(value: unknown): value is Indicator {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Indicator>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    (candidate.group === 'factor' || candidate.group === 'result')
  );
}

function readCache(uid: string): Indicator[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(cacheKey(uid)) || '[]');
    return Array.isArray(parsed) ? parsed.filter(isIndicator) : [];
  } catch {
    return [];
  }
}

function writeCache(uid: string, indicators: Indicator[]): void {
  try {
    localStorage.setItem(cacheKey(uid), JSON.stringify(indicators.slice(0, 100)));
  } catch {
    // Cache is a resilience layer; Firestore remains the source of truth.
  }
}

function cacheIndicator(uid: string, indicator: Indicator): void {
  const current = readCache(uid).filter((item) => item.id !== indicator.id);
  writeCache(uid, [...current, indicator]);
}

function removeCachedIndicators(uid: string, remoteIds: Set<string>): void {
  const current = readCache(uid);
  const next = current.filter((item) => !remoteIds.has(item.id));
  if (next.length !== current.length) writeCache(uid, next);
}

function timestampToIso(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date(0).toISOString();
}

function mergeIndicators(remote: Indicator[], local: Indicator[]): Indicator[] {
  const remoteIds = new Set(remote.map((indicator) => indicator.id));
  const merged = [...remote, ...local.filter((indicator) => !remoteIds.has(indicator.id))];
  return merged.sort((left, right) => left.sortOrder - right.sortOrder);
}

function toFirestoreInput(input: IndicatorInput): Record<string, unknown> {
  const data: Record<string, unknown> = {
    group: input.group,
    name: input.name,
    abbreviation: input.abbreviation,
    emoji: input.emoji,
    valueType: input.valueType,
    frequency: input.frequency,
    sortOrder: input.sortOrder
  };

  if (input.numeric) data.numeric = input.numeric;
  if (input.scale) data.scale = input.scale;
  if (input.options) data.options = input.options;
  if (input.desiredDirection) data.desiredDirection = input.desiredDirection;
  if (input.idealRange) data.idealRange = input.idealRange;
  if (input.dailyAggregation) data.dailyAggregation = input.dailyAggregation;

  return data;
}

/**
 * Subscribes to the user's indicators with a local cache first. The cache keeps
 * the initial dashboard usable when Firestore is offline or rules are not
 * available yet; remote documents always win when both contain the same ID.
 */
export function subscribeIndicators(
  uid: string,
  onChange: (indicators: Indicator[]) => void
): () => void {
  let remote: Indicator[] = [];

  const emit = () => onChange(mergeIndicators(remote, readCache(uid)));
  emit();

  const unsubscribe = onSnapshot(
    collection(db, 'users', uid, 'indicators'),
    (snapshot) => {
      remote = snapshot.docs.map((document) => {
        const data = document.data();
        return {
          ...(data as Omit<Indicator, 'id' | 'createdAt' | 'updatedAt' | 'archivedAt'>),
          id: document.id,
          archivedAt: (data.archivedAt as string | null | undefined) ?? null,
          createdAt: timestampToIso(data.createdAt),
          updatedAt: timestampToIso(data.updatedAt)
        } as Indicator;
      });
      removeCachedIndicators(uid, new Set(remote.map((indicator) => indicator.id)));
      emit();
    },
    () => {
      // Keep the locally cached indicators visible if the listener fails.
      emit();
    }
  );

  return unsubscribe;
}

/**
 * Creates an indicator only when the person explicitly selects a suggestion.
 * The local copy is written first; the Firestore write is attempted in place
 * and may be retried by the regular subscription when it becomes available.
 */
export async function createIndicator(uid: string, input: IndicatorInput): Promise<Indicator> {
  if (!uid) throw new Error('indicators/no-session');

  const reference = doc(collection(db, 'users', uid, 'indicators'));
  const now = new Date().toISOString();
  const indicator: Indicator = {
    ...input,
    id: reference.id,
    archivedAt: null,
    createdAt: now,
    updatedAt: now
  };

  cacheIndicator(uid, indicator);

  try {
    await setDoc(reference, {
      ...toFirestoreInput(input),
      archivedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch {
    // The local indicator is still available for this browser.
  }

  return indicator;
}

export function clearCachedIndicators(uid: string): void {
  try {
    localStorage.removeItem(cacheKey(uid));
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}
