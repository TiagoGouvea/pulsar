import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  waitForPendingWrites,
  writeBatch,
  type DocumentData,
  type DocumentReference
} from 'firebase/firestore';
import { db } from '@lib/firebase/config';
import type { IndicatorValueType } from '@features/indicators/types';
import {
  formatLocalDate,
  singleEntryId,
  validateEntryValue,
  validateNote
} from './model';
import type { Entry, EntryPlan, EntryValue } from './types';

function timestampToIso(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date(0).toISOString();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function toEntryValue(valueType: IndicatorValueType, raw: unknown): EntryValue | null {
  if (!isObject(raw)) return null;
  if (valueType === 'boolean') {
    return typeof raw.boolean === 'boolean' ? { boolean: raw.boolean } : null;
  }
  if (valueType === 'ordinal') {
    return typeof raw.optionId === 'string' ? { optionId: raw.optionId } : null;
  }
  return typeof raw.number === 'number' && Number.isFinite(raw.number)
    ? { number: raw.number }
    : null;
}

function toEntry(id: string, raw: DocumentData): Entry | null {
  const indicatorId = raw.indicatorId;
  const localDate = raw.localDate;
  const valueType = raw.valueType;
  if (typeof indicatorId !== 'string' || typeof localDate !== 'string') return null;
  if (
    valueType !== 'boolean' &&
    valueType !== 'scale' &&
    valueType !== 'numeric' &&
    valueType !== 'ordinal'
  ) {
    return null;
  }
  const value = toEntryValue(valueType, raw.value);
  if (!value) return null;
  return {
    id,
    indicatorId,
    localDate,
    recordedAt: timestampToIso(raw.recordedAt),
    valueType,
    value,
    note: typeof raw.note === 'string' ? raw.note : ''
  };
}

function sortEntries(entries: Entry[]): Entry[] {
  return [...entries].sort((left, right) => {
    if (left.localDate !== right.localDate) return right.localDate.localeCompare(left.localDate);
    const difference = Date.parse(right.recordedAt) - Date.parse(left.recordedAt);
    return difference !== 0 ? difference : right.id.localeCompare(left.id);
  });
}

/** Reads entries with their persisted, server-confirmed fields. */
export function subscribeEntries(
  uid: string,
  onChange: (entries: Entry[]) => void,
  onError?: (error: unknown) => void
): () => void {
  return onSnapshot(
    collection(db, 'users', uid, 'entries'),
    (snapshot) => {
      const entries = snapshot.docs
        .map((document) => toEntry(document.id, document.data()))
        .filter((entry): entry is Entry => entry != null);
      onChange(sortEntries(entries));
    },
    (error) => {
      onError?.(error);
    }
  );
}

function entryReference(uid: string, id: string): DocumentReference {
  return doc(db, 'users', uid, 'entries', id);
}

function indicatorReference(uid: string, id: string): DocumentReference {
  return doc(db, 'users', uid, 'indicators', id);
}

function toFirestoreEntry(
  indicatorId: string,
  localDate: string,
  plan: EntryPlan
): Record<string, unknown> {
  const note = plan.note?.trim() ?? '';
  const data: Record<string, unknown> = {
    indicatorId,
    localDate,
    recordedAt: serverTimestamp(),
    valueType: plan.indicator.valueType,
    value: plan.value
  };
  if (note) data.note = note;
  return data;
}

export interface SavedEntries {
  localDate: string;
  count: number;
  singleIndicatorIds: string[];
}

/**
 * Persists any subset of answers in one all-or-nothing batch. Single-frequency
 * indicators use the deterministic `indicatorId_localDate` document, so a new
 * answer for the current day replaces the previous value; multiple-frequency
 * indicators always create a new event. When an indicator has no entry yet,
 * `firstEntryAt` is written with the server clock in the same batch, activating
 * the structural freeze of REQ-2-001.
 *
 * The promise only resolves after Firestore confirms the server commit; a
 * queued or failed write is never reported as success by the caller.
 */
export async function saveDailyEntries(
  uid: string,
  plans: EntryPlan[]
): Promise<SavedEntries> {
  if (!uid) throw new Error('entries/no-session');
  if (plans.length === 0) throw new Error('entries/empty');

  for (const plan of plans) {
    const valueError = validateEntryValue(
      plan.indicator,
      plan.indicator.valueType,
      plan.value
    );
    if (valueError) throw new Error(valueError);
    const noteError = validateNote(plan.note ?? '');
    if (noteError) throw new Error(noteError);
  }

  const localDate = formatLocalDate();
  const batch = writeBatch(db);
  const firstEntryIndicators = new Set<string>();
  const singleIndicatorIds = new Set<string>();
  const uniqueIndicatorIds = [...new Set(plans.map((plan) => plan.indicator.id))];

  // Read the current ratchet instead of trusting the potentially stale local
  // indicator snapshot. A second tab may have created the first entry already.
  const firstEntryRatchet = new Map<string, boolean>();
  for (const indicatorId of uniqueIndicatorIds) {
    const snapshot = await getDoc(indicatorReference(uid, indicatorId));
    firstEntryRatchet.set(
      indicatorId,
      snapshot.exists() && (snapshot.data().firstEntryAt ?? null) == null
    );
  }

  for (const plan of plans) {
    const indicatorId = plan.indicator.id;
    if (plan.indicator.frequency === 'single_per_day') {
      singleIndicatorIds.add(indicatorId);
      batch.set(
        entryReference(uid, singleEntryId(indicatorId, localDate)),
        toFirestoreEntry(indicatorId, localDate, plan)
      );
    } else {
      batch.set(
        doc(collection(db, 'users', uid, 'entries')),
        toFirestoreEntry(indicatorId, localDate, plan)
      );
    }

    if (firstEntryRatchet.get(indicatorId)) firstEntryIndicators.add(indicatorId);
  }

  for (const indicatorId of firstEntryIndicators) {
    batch.update(indicatorReference(uid, indicatorId), {
      firstEntryAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  await batch.commit();
  await waitForPendingWrites(db);

  return {
    localDate,
    count: plans.length,
    singleIndicatorIds: [...singleIndicatorIds]
  };
}

/**
 * Deletes any entry the owner can see, including past days. The UI only offers
 * creation for the current local date, but deletion is intentionally timeless.
 */
export async function deleteEntry(uid: string, entryId: string): Promise<void> {
  if (!uid) throw new Error('entries/no-session');
  if (!entryId) throw new Error('entries/invalid-entry');
  await deleteDoc(entryReference(uid, entryId));
  await waitForPendingWrites(db);
}
