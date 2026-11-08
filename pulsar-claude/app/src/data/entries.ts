import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import { validateEntryValue, type EntryValue } from '../domain/entry';
import type { IndicatorInput } from '../domain/indicator';
import { db } from '../lib/firebase';
import { localDate } from '../lib/time';
import { listDocuments } from './firestoreRest';

export interface SaveEntryInput {
  indicatorId: string;
  value: EntryValue;
  note?: string;
  /** IDs of the current day's entries shown to the user before replacing an answer. */
  observedEntryIds?: readonly string[];
}

/** One-shot count for screens that must not keep a realtime channel open. */
export async function countEntries(uid: string): Promise<number> {
  const snapshot = await getCountFromServer(collection(db, 'users', uid, 'entries'));
  return snapshot.data().count;
}

/** Extract the fields needed to determine the dashboard state. */
export async function listEntryDates(uid: string): Promise<{ indicatorId: string; localDate: string }[]> {
  const documents = await listDocuments(['users', uid, 'entries']);
  return documents.flatMap(({ fields }) =>
    typeof fields.indicatorId === 'string' && typeof fields.localDate === 'string'
      ? [{ indicatorId: fields.indicatorId, localDate: fields.localDate }]
      : [],
  );
}

export async function saveEntry(uid: string, input: SaveEntryInput): Promise<string> {
  const day = localDate();
  const indicatorRef = doc(db, 'users', uid, 'indicators', input.indicatorId);
  const indicatorSnapshot = await getDoc(indicatorRef);
  if (!indicatorSnapshot.exists()) throw new Error('Indicator not found.');

  const indicator = indicatorSnapshot.data() as IndicatorInput & { lockedAt: unknown };
  if (!validateEntryValue(indicator, input.value).valid) throw new Error('Invalid entry value.');
  if (input.note !== undefined && (typeof input.note !== 'string' || input.note.length > 500)) {
    throw new Error('Invalid entry note.');
  }

  const entries = collection(db, 'users', uid, 'entries');
  const previous =
    indicator.frequency === 'single_per_day'
      ? await getDocs(
          query(entries, where('indicatorId', '==', input.indicatorId), where('localDate', '==', day)),
        )
      : null;
  if (localDate() !== day) throw new Error('The local day changed before the entry could be saved.');
  if (previous && input.observedEntryIds) {
    const observed = new Set(input.observedEntryIds);
    if (previous.docs.some((entry) => !observed.has(entry.id))) {
      const error = new Error('The answer changed on another device.');
      error.name = 'EntryConflictError';
      throw error;
    }
  }

  const entryRef = doc(entries);
  const batch = writeBatch(db);
  if (indicator.lockedAt == null) batch.update(indicatorRef, { lockedAt: serverTimestamp() });
  batch.set(entryRef, {
    indicatorId: input.indicatorId,
    localDate: day,
    recordedAt: serverTimestamp(),
    valueType: indicator.valueType,
    value: input.value,
    ...(input.note === undefined ? {} : { note: input.note }),
  });
  previous?.docs.forEach((entry) => batch.delete(entry.ref));
  await batch.commit();
  return entryRef.id;
}

export async function deleteEntry(uid: string, entryId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'entries', entryId));
}

/** Subscribe to the current day's server-confirmed entries. Pending local writes are not confirmations. */
export function watchEntriesForDay(
  uid: string,
  day: string,
  onEntries: (entries: import('../domain/entry').Entry[]) => void,
  onError: (error: Error) => void,
): () => void {
  const entries = collection(db, 'users', uid, 'entries');
  return onSnapshot(
    query(entries, where('localDate', '==', day)),
    { includeMetadataChanges: true },
    (snapshot) => {
      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
      onEntries(
        snapshot.docs.map((document) => {
          const data = document.data();
          return {
            id: document.id,
            indicatorId: data.indicatorId as string,
            localDate: data.localDate as string,
            recordedAt: (data.recordedAt as Timestamp).toDate().toISOString(),
            valueType: data.valueType as import('../domain/indicator').ValueType,
            value: data.value as EntryValue,
            note: (data.note as string | null | undefined) ?? null,
          };
        }),
      );
    },
    onError,
  );
}
