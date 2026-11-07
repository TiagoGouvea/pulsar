import { byteLength, displayAbbreviation } from '@features/indicators/model';
import type { Indicator, IndicatorOption, IndicatorValueType } from '@features/indicators/types';
import type { DailyAggregate, Entry, EntryValue } from './types';

/**
 * Pure daily-entry domain logic: local date keys, deterministic single-entry
 * IDs, server-compatible validation and daily aggregation. No Firebase imports
 * on purpose, so every rule here is unit tested without emulators.
 */

/** Observation limit mirrored by the Firestore rules (UTF-8 bytes). */
export const MAX_NOTE_BYTES = 500;
export const MAX_INDICATOR_ID_BYTES = 128;

const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Local calendar date in `YYYY-MM-DD`, using the browser timezone. */
export function formatLocalDate(date: Date = new Date()): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isLocalDate(value: string): boolean {
  const match = LOCAL_DATE_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

/** Local date label such as `24 de outubro`. */
export function formatLocalDateLabel(localDate: string): string {
  if (!isLocalDate(localDate)) return localDate;
  const [year, month, day] = localDate.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(year, month - 1, day));
}

export function formatShortLocalDateLabel(localDate: string): string {
  if (!isLocalDate(localDate)) return localDate;
  const [year, month, day] = localDate.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  }).format(new Date(year, month - 1, day));
}

export function formatEntryTime(recordedAt: string): string {
  const parsed = new Date(recordedAt);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(parsed);
}

/**
 * Deterministic document ID for `single_per_day`: one document per indicator
 * and local date, so a new answer for the current day replaces the stored one.
 * The same expression is enforced by the Firestore rules.
 */
export function singleEntryId(indicatorId: string, localDate: string): string {
  return `${indicatorId}_${localDate}`;
}

export function entriesForIndicator(entries: Entry[], indicatorId: string): Entry[] {
  return entries.filter((entry) => entry.indicatorId === indicatorId);
}

export function entriesForDate(entries: Entry[], localDate: string): Entry[] {
  return entries.filter((entry) => entry.localDate === localDate);
}

function recordedAtValue(entry: Entry): number {
  const parsed = Date.parse(entry.recordedAt);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Newest event first; the ID is the stable tiebreaker required by `last`. */
export function latestEntry(entries: Entry[]): Entry | null {
  if (entries.length === 0) return null;
  return [...entries].sort((left, right) => {
    const difference = recordedAtValue(right) - recordedAtValue(left);
    return difference !== 0 ? difference : right.id.localeCompare(left.id);
  })[0];
}

function numberFromEntry(entry: Entry): number | null {
  if ('number' in entry.value && typeof entry.value.number === 'number') {
    return entry.value.number;
  }
  return null;
}

function booleanFromEntry(entry: Entry): boolean | null {
  if ('boolean' in entry.value && typeof entry.value.boolean === 'boolean') {
    return entry.value.boolean;
  }
  return null;
}

function optionFromEntry(entry: Entry): string | null {
  if ('optionId' in entry.value && typeof entry.value.optionId === 'string') {
    return entry.value.optionId;
  }
  return null;
}

function aggregateNumbers(
  aggregate: NonNullable<Indicator['dailyAggregation']>,
  entries: Entry[]
): number | null {
  const values = entries
    .map(numberFromEntry)
    .filter((value): value is number => value != null);
  if (values.length === 0) return null;
  if (aggregate === 'sum') return values.reduce((total, value) => total + value, 0);
  if (aggregate === 'mean') {
    return values.reduce((total, value) => total + value, 0) / values.length;
  }
  const last = latestEntry(entries);
  return last ? numberFromEntry(last) : null;
}

/**
 * Consolidates the events of one indicator on one local date using the
 * aggregation configured in the indicator. Returns `null` when there is no
 * answer at all; never turns absence into `false` or `0`.
 */
export function aggregateDay(
  indicator: Indicator,
  entries: Entry[],
  localDate: string
): DailyAggregate | null {
  const daily = entries.filter(
    (entry) => entry.indicatorId === indicator.id && entry.localDate === localDate
  );
  if (daily.length === 0) return null;

  const base = {
    indicatorId: indicator.id,
    localDate,
    valueType: indicator.valueType,
    count: daily.length
  };

  if (indicator.valueType === 'boolean') {
    const aggregate = indicator.frequency === 'multiple_per_day'
      ? indicator.dailyAggregation ?? 'any'
      : 'last';
    if (aggregate === 'any') {
      const value = daily.some((entry) => booleanFromEntry(entry) === true);
      return { ...base, value: { boolean: value } };
    }
    const last = latestEntry(daily);
    return last ? { ...base, value: { boolean: booleanFromEntry(last) ?? false } } : null;
  }

  if (indicator.valueType === 'ordinal') {
    const last = latestEntry(daily);
    const optionId = last ? optionFromEntry(last) : null;
    return optionId != null ? { ...base, value: { optionId } } : null;
  }

  const aggregate = indicator.frequency === 'multiple_per_day'
    ? indicator.dailyAggregation ?? 'last'
    : 'last';
  const value = aggregateNumbers(aggregate, daily);
  return value != null ? { ...base, value: { number: value } } : null;
}

export function formatNumberValue(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 3
  }).format(value);
}

export function optionLabel(
  options: IndicatorOption[] | undefined,
  optionId: string
): string {
  const option = options?.find((item) => item.id === optionId);
  return option?.label ?? optionId;
}

/**
 * Formats a structured answer for display. Indicator privacy only changes the
 * indicator name/abbreviation and emoji elsewhere; values and chart numbers are
 * always shown.
 */
export function formatEntryValue(indicator: Indicator, value: EntryValue): string {
  if ('boolean' in value) return value.boolean ? 'Sim' : 'Não';
  if ('optionId' in value) return optionLabel(indicator.options, value.optionId);
  if (indicator.valueType === 'scale') {
    const max = indicator.scale?.max ?? 10;
    return `${formatNumberValue(value.number)}/${formatNumberValue(max)}`;
  }
  const unit = indicator.numeric?.unit.trim();
  return unit ? `${formatNumberValue(value.number)} ${unit}` : formatNumberValue(value.number);
}

export function formatDailyAggregate(indicator: Indicator, aggregate: DailyAggregate): string {
  return formatEntryValue(indicator, aggregate.value);
}

/** Aggregation label shown next to multiple events. */
export function dailyAggregationLabel(indicator: Indicator): string | null {
  if (indicator.frequency !== 'multiple_per_day') return null;
  const labels = {
    sum: 'Soma',
    mean: 'Média',
    last: 'Último',
    any: 'Presença'
  } as const;
  return labels[indicator.dailyAggregation ?? 'last'];
}

export function noteByteLength(note: string): number {
  return byteLength(note);
}

export function validateNote(note: string): string | null {
  if (byteLength(note) > MAX_NOTE_BYTES) {
    return `A observação deve ter até ${MAX_NOTE_BYTES} bytes.`;
  }
  return null;
}

function numberInRange(value: number, min: number | null, max: number | null): boolean {
  if (!Number.isFinite(value)) return false;
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

/**
 * Validates one structured value against its indicator. Kept in sync with the
 * Firestore rules so the client never queues an answer the server would reject.
 */
export function validateEntryValue(
  indicator: Indicator,
  valueType: IndicatorValueType,
  value: EntryValue
): string | null {
  if (valueType !== indicator.valueType) return 'O tipo da resposta não corresponde ao indicador.';

  if (indicator.valueType === 'boolean') {
    return 'boolean' in value && typeof value.boolean === 'boolean'
      ? null
      : 'Informe Sim ou Não.';
  }

  if (indicator.valueType === 'ordinal') {
    if (!('optionId' in value) || typeof value.optionId !== 'string') {
      return 'Escolha uma das opções do indicador.';
    }
    const options = indicator.options ?? [];
    return options.some((option) => option.id === value.optionId)
      ? null
      : 'Escolha uma das opções do indicador.';
  }

  if (!('number' in value) || typeof value.number !== 'number' || !Number.isFinite(value.number)) {
    return 'Informe um valor numérico.';
  }

  if (indicator.valueType === 'scale') {
    const min = indicator.scale?.min ?? 0;
    const max = indicator.scale?.max ?? 10;
    return numberInRange(value.number, min, max)
      ? null
      : `Informe um valor entre ${formatNumberValue(min)} e ${formatNumberValue(max)}.`;
  }

  const min = indicator.numeric?.min ?? null;
  const max = indicator.numeric?.max ?? null;
  return numberInRange(value.number, min, max)
    ? null
    : 'O valor está fora dos limites do indicador.';
}

/** Accessible display label that follows the global privacy mode. */
export function privacyLabel(
  indicator: Pick<Indicator, 'name' | 'abbreviation'>,
  isNameRevealed: boolean
): string {
  return isNameRevealed ? indicator.name.trim() : displayAbbreviation(indicator);
}

/** Emoji is only visible when names are revealed; hidden mode never leaks it. */
export function privacyEmoji(
  indicator: Pick<Indicator, 'emoji'>,
  isNameRevealed: boolean
): string | null {
  if (!isNameRevealed) return null;
  const emoji = indicator.emoji.trim();
  return emoji || null;
}

export function privacyHeading(
  indicator: Pick<Indicator, 'name' | 'abbreviation' | 'emoji'>,
  isNameRevealed: boolean
): string {
  const label = privacyLabel(indicator, isNameRevealed);
  const emoji = privacyEmoji(indicator, isNameRevealed);
  return emoji ? `${emoji} ${label}` : label;
}

/** Label for an entry even when its indicator is not in the active list. */
export function entryIndicatorLabel(
  indicator: Indicator | undefined,
  entry: Entry,
  isNameRevealed: boolean
): string {
  if (!indicator) return entry.indicatorId;
  return privacyLabel(indicator, isNameRevealed);
}
