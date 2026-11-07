import type { DailyAggregate, Entry, EntryValue } from './types';

export type EntryDraftValue =
  | { kind: 'boolean'; value: boolean }
  | { kind: 'number'; raw: string }
  | { kind: 'option'; optionId: string };

export type EntryDraftMap = Record<string, EntryDraftValue>;

function parseNumber(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function draftToEntryValue(draft: EntryDraftValue): EntryValue | null {
  if (draft.kind === 'boolean') return { boolean: draft.value };
  if (draft.kind === 'option') return { optionId: draft.optionId };
  const parsed = parseNumber(draft.raw);
  return parsed == null ? null : { number: parsed };
}

export function draftFromEntry(entry: Entry): EntryDraftValue {
  if ('boolean' in entry.value) return { kind: 'boolean', value: entry.value.boolean };
  if ('optionId' in entry.value) return { kind: 'option', optionId: entry.value.optionId };
  return { kind: 'number', raw: String(entry.value.number).replace('.', ',') };
}

export function draftFromAggregate(aggregate: DailyAggregate): EntryDraftValue {
  if ('boolean' in aggregate.value) {
    return { kind: 'boolean', value: aggregate.value.boolean };
  }
  if ('optionId' in aggregate.value) {
    return { kind: 'option', optionId: aggregate.value.optionId };
  }
  return {
    kind: 'number',
    raw: String(Number(aggregate.value.number.toFixed(6))).replace('.', ',')
  };
}

export function draftMatchesDraft(left: EntryDraftValue | undefined, right: EntryDraftValue | undefined): boolean {
  if (!left || !right) return left === right;
  if (left.kind !== right.kind) return false;
  if (left.kind === 'boolean' && right.kind === 'boolean') return left.value === right.value;
  if (left.kind === 'number' && right.kind === 'number') return left.raw === right.raw;
  if (left.kind === 'option' && right.kind === 'option') return left.optionId === right.optionId;
  return false;
}
