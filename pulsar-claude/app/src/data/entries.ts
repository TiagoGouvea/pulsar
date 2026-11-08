import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
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
