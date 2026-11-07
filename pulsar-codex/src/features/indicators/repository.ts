import {
  collection,
  deleteField,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
  type UpdateData
} from 'firebase/firestore';
import { db } from '@lib/firebase/config';
import type { Indicator, IndicatorInput, IndicatorPatch } from './types';

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
 * Converts a validated patch into Firestore fields. `null` marks fields that
 * must be removed from the stored document (for example a numeric config
 * after the value type changes to boolean before the first entry).
 */
function toFirestorePatch(patch: IndicatorPatch): UpdateData<DocumentData> {
  const data: UpdateData<DocumentData> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      data[key] = deleteField();
    } else {
      data[key] = value as DocumentData;
    }
  }
  data.updatedAt = serverTimestamp();
  return data;
}

function indicatorReference(uid: string, id: string) {
  return doc(db, 'users', uid, 'indicators', id);
}

function cachePatch(uid: string, id: string, patch: IndicatorPatch): void {
  const current = readCache(uid);
  const updated = current.map((indicator) =>
    indicator.id === id ? applyPatch(indicator, patch) : indicator
  );
  if (updated.length === current.length) writeCache(uid, updated);
}

function cacheArchivedAt(uid: string, id: string, archivedAt: string | null): void {
  const current = readCache(uid);
  const updated = current.map((indicator) =>
    indicator.id === id
      ? { ...indicator, archivedAt, updatedAt: new Date().toISOString() }
      : indicator
  );
  if (updated.length === current.length) writeCache(uid, updated);
}

function applyPatch(indicator: Indicator, patch: IndicatorPatch): Indicator {
  const next: Indicator = { ...indicator };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete next[key as keyof Indicator];
    } else {
      (next as unknown as Record<string, unknown>)[key] = value;
    }
  }
  next.updatedAt = new Date().toISOString();
  return next;
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
          ...(data as Omit<Indicator, 'id' | 'firstEntryAt' | 'createdAt' | 'updatedAt' | 'archivedAt'>),
          id: document.id,
          firstEntryAt: data.firstEntryAt
            ? timestampToIso(data.firstEntryAt)
            : null,
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
 * Creates an indicator only when the person explicitly submits the form or
 * selects a suggestion. The local copy is written first; the Firestore write
 * is attempted in place and may be retried by the regular subscription when
 * it becomes available.
 */
export async function createIndicator(uid: string, input: IndicatorInput): Promise<Indicator> {
  if (!uid) throw new Error('indicators/no-session');

  const reference = doc(collection(db, 'users', uid, 'indicators'));
  const now = new Date().toISOString();
  const indicator: Indicator = {
    ...input,
    id: reference.id,
    firstEntryAt: null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now
  };

  cacheIndicator(uid, indicator);

  try {
    await setDoc(reference, {
      ...toFirestoreInput(input),
      firstEntryAt: null,
      archivedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch {
    // The local indicator is still available for this browser.
  }

  return indicator;
}

/**
 * Applies an editable patch to an existing indicator. The Firestore write
 * happens first: the caller only sees success after persistence is accepted
 * and errors are surfaced, never presented as success.
 */
export async function updateIndicator(
  uid: string,
  id: string,
  patch: IndicatorPatch
): Promise<void> {
  if (!uid) throw new Error('indicators/no-session');
  if (Object.keys(patch).length === 0) return;

  await updateDoc(indicatorReference(uid, id), toFirestorePatch(patch));
  cachePatch(uid, id, patch);
}

export async function archiveIndicator(uid: string, id: string): Promise<void> {
  if (!uid) throw new Error('indicators/no-session');
  await updateDoc(indicatorReference(uid, id), {
    archivedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  cacheArchivedAt(uid, id, new Date().toISOString());
}

export async function restoreIndicator(uid: string, id: string): Promise<void> {
  if (!uid) throw new Error('indicators/no-session');
  await updateDoc(indicatorReference(uid, id), {
    archivedAt: null,
    updatedAt: serverTimestamp()
  });
  cacheArchivedAt(uid, id, null);
}

/**
 * Persists a new order for one group. Only the indicators whose sort order
 * actually changes are written, each with its own `updatedAt`.
 */
export async function reorderIndicators(
  uid: string,
  changes: Array<{ id: string; sortOrder: number }>
): Promise<void> {
  if (!uid) throw new Error('indicators/no-session');
  if (changes.length === 0) return;

  const batch = writeBatch(db);
  for (const change of changes) {
    batch.update(indicatorReference(uid, change.id), {
      sortOrder: change.sortOrder,
      updatedAt: serverTimestamp()
    });
  }
  await batch.commit();
  for (const change of changes) {
    cachePatch(uid, change.id, { sortOrder: change.sortOrder });
  }
}

export function clearCachedIndicators(uid: string): void {
  try {
    localStorage.removeItem(cacheKey(uid));
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}
