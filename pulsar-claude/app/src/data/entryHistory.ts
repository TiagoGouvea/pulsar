/**
 * Read side of the entry history (spec 5.2 and 5.3).
 *
 * The list of records of an indicator is read through the Firestore REST API: the SDK's
 * `getDocs` sits on top of the watch stream, which stays open and keeps every route
 * network-active (the browser gates wait for network silence). The REST list is a unary
 * request, so the history screen stays quiet.
 *
 * Records are immutable (the Security Rules deny `update`): the only write allowed here is
 * the deletion, done by `deleteEntry` in `./entries`.
 */
import type { EntryValue } from '../domain/entry';
import type { ValueType } from '../domain/indicator';
import { listDocuments } from './firestoreRest';

export interface HistoryEntry {
  id: string;
  indicatorId: string;
  /** Day key (YYYY-MM-DD) computed by the browser when the record was saved. */
  localDate: string;
  /** Instant of the record, in UTC (as persisted). */
  recordedAt: string;
  valueType: ValueType;
  value: EntryValue | null;
  /** Optional observation (free text complementing the structured value). */
  note: string | null;
}

const VALUE_TYPES: ValueType[] = ['boolean', 'scale', 'ordinal', 'numeric'];

function parseValueType(raw: unknown): ValueType {
  return VALUE_TYPES.includes(raw as ValueType) ? (raw as ValueType) : 'numeric';
}

function parseValue(raw: unknown): EntryValue | null {
  if (raw === null || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.boolean === 'boolean') return { boolean: record.boolean };
  if (typeof record.number === 'number') return { number: record.number };
  if (typeof record.optionId === 'string') return { optionId: record.optionId };
  return null;
}

function parseEntry(id: string, fields: Record<string, unknown>): HistoryEntry {
  return {
    id,
    indicatorId: typeof fields.indicatorId === 'string' ? fields.indicatorId : '',
    localDate: typeof fields.localDate === 'string' ? fields.localDate : '',
    recordedAt: typeof fields.recordedAt === 'string' ? fields.recordedAt : '',
    valueType: parseValueType(fields.valueType),
    value: parseValue(fields.value),
    note: typeof fields.note === 'string' && fields.note.length > 0 ? fields.note : null,
  };
}

/**
 * Every record of an indicator, most recent first. The instant is persisted in UTC; the screen
 * shows it in the browser timezone.
 */
export async function listIndicatorEntries(uid: string, indicatorId: string): Promise<HistoryEntry[]> {
  const documents = await listDocuments(['users', uid, 'entries']);
  return documents
    .filter((document) => document.fields.indicatorId === indicatorId)
    .map((document) => parseEntry(document.id, document.fields))
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt) || b.id.localeCompare(a.id));
}
