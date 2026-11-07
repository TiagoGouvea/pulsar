import { doc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { emulators } from '../../firebase.json';
import { auth, db, firebaseApp } from '../lib/firebase';
import { emulatorsEnabled } from '../lib/env';

export interface SaveAccountInviteDismissal {
  /** Server timestamp of the dismissal (null when the invite was never dismissed). */
  dismissedAt: unknown;
  /** Distinct days with entries when the invite was dismissed (null when never dismissed). */
  dayCount: number | null;
}

/**
 * Host of the Firestore REST API. The emulator answers on its own port; production uses the public
 * endpoint.
 */
const firestoreRestHost = emulatorsEnabled
  ? `http://${window.location.hostname}:${emulators.firestore.port}`
  : 'https://firestore.googleapis.com';

/**
 * Lists the days (YYYY-MM-DD) that have entries, through the Firestore REST API.
 *
 * The SDK's `getDocs`/`getDoc` are implemented on top of the watch stream, which stays open and
 * keeps every route network-active (the browser gates wait for network silence). The REST list is a
 * unary request, so the dashboard stays quiet, exactly like the read-only transactions used by
 * `src/data/indicators.ts`.
 */
async function listEntryDays(uid: string): Promise<string[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const token = await user.getIdToken();
  const base = `${firestoreRestHost}/v1/projects/${firebaseApp.options.projectId}/databases/(default)/documents/users/${uid}/entries`;
  const days = new Set<string>();
  let pageToken = '';
  do {
    const query = new URLSearchParams({ pageSize: '300', 'mask.fieldPaths': 'localDate' });
    if (pageToken) query.set('pageToken', pageToken);
    const response = await fetch(`${base}?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Could not read the entries of the user.');
    const body = (await response.json()) as {
      documents?: { fields?: { localDate?: { stringValue?: string } } }[];
      nextPageToken?: string;
    };
    body.documents?.forEach((document) => {
      const day = document.fields?.localDate?.stringValue;
      if (day) days.add(day);
    });
    pageToken = body.nextPageToken ?? '';
  } while (pageToken);
  return [...days];
}

/** Counts the distinct days with entries of the given user. */
export async function countDistinctEntryDays(uid: string): Promise<number> {
  const days = await listEntryDays(uid);
  return days.length;
}

/**
 * Reads the dismissal state stored in users/{uid} (see DECISOES > Login). A read-only transaction
 * uses a unary request, so the route does not keep Firestore's watch stream open.
 */
export async function readSaveAccountInviteDismissal(uid: string): Promise<SaveAccountInviteDismissal> {
  const snapshot = await runTransaction(db, (transaction) => transaction.get(doc(db, 'users', uid)));
  const data = snapshot.data() as
    { saveAccountInviteDismissedAt?: unknown; saveAccountInviteDismissedDayCount?: unknown } | undefined;
  const dayCount = data?.saveAccountInviteDismissedDayCount;
  return {
    dismissedAt: data?.saveAccountInviteDismissedAt ?? null,
    dayCount: typeof dayCount === 'number' && Number.isInteger(dayCount) ? dayCount : null,
  };
}

/**
 * Stores the dismissal in users/{uid}: the server timestamp of the dismissal and the number of
 * distinct days with entries at that moment, so the invite can come back after seven more days.
 */
export async function dismissSaveAccountInvite(uid: string, dayCount: number): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    {
      saveAccountInviteDismissedAt: serverTimestamp(),
      saveAccountInviteDismissedDayCount: dayCount,
    },
    { merge: true },
  );
}
