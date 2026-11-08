/**
 * One-shot reads through the Firestore REST API.
 *
 * The JS SDK answers a collection query with a streaming request whose connection stays open for
 * about a minute after the result (the client keeps the channel alive), so a screen that reads a
 * collection never reaches the browser's "network idle" state. The REST list is a single HTTP
 * request: the screen reads, renders and releases the connection right away.
 *
 * The requests carry the signed-in user's ID token, so the Security Rules are enforced exactly as
 * they are for the SDK.
 */
import { emulators } from '../../firebase.json';
import { auth, firebaseApp } from '../lib/firebase';
import { emulatorsEnabled } from '../lib/env';

/** Firestore value as the REST API encodes it. */
export type RestValue = Record<string, unknown>;

export interface RestDocument {
  id: string;
  fields: Record<string, unknown>;
}

export function decodeValue(value: RestValue): unknown {
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('timestampValue' in value) return value.timestampValue;
  if ('mapValue' in value) {
    const map = value.mapValue as { fields?: Record<string, RestValue> };
    return decodeFields(map.fields);
  }
  if ('arrayValue' in value) {
    const array = value.arrayValue as { values?: RestValue[] };
    return (array.values ?? []).map(decodeValue);
  }
  return undefined;
}

export function decodeFields(fields: Record<string, RestValue> = {}): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}

function restBaseUrl(): string {
  if (emulatorsEnabled) {
    const host = window.location.hostname || '127.0.0.1';
    return `http://${host}:${emulators.firestore.port}`;
  }
  return 'https://firestore.googleapis.com';
}

/** Lists every document of a collection, following the pagination of the API. */
export async function listDocuments(collectionPath: string[]): Promise<RestDocument[]> {
  const user = auth.currentUser;
  if (!user) throw new Error('There is no signed-in user.');
  const token = await user.getIdToken();
  const project = firebaseApp.options.projectId ?? 'demo-pulsar';
  const path = collectionPath.map(encodeURIComponent).join('/');
  const documents: RestDocument[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${restBaseUrl()}/v1/projects/${project}/databases/(default)/documents/${path}`);
    url.searchParams.set('pageSize', '300');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      throw new Error(`Firestore read failed with status ${response.status}.`);
    }
    const body = (await response.json()) as {
      documents?: { name: string; fields?: Record<string, RestValue> }[];
      nextPageToken?: string;
    };
    for (const document of body.documents ?? []) {
      documents.push({
        id: document.name.split('/').pop() ?? '',
        fields: decodeFields(document.fields),
      });
    }
    pageToken = body.nextPageToken;
  } while (pageToken);

  return documents;
}
