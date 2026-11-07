import type { Indicator, IndicatorValueType } from '@features/indicators/types';

/**
 * Structured answer stored for one indicator. Exactly one key is present,
 * matching the indicator value type. Absence of a document means "not
 * answered"; `false` and `0` are legitimate stored values and never mean
 * absence.
 */
export type EntryValueBoolean = { boolean: boolean };
export type EntryValueNumber = { number: number };
export type EntryValueOption = { optionId: string };

export type EntryValue = EntryValueBoolean | EntryValueNumber | EntryValueOption;

export interface Entry {
  id: string;
  indicatorId: string;
  /** Browser local date at the moment of the answer, in `YYYY-MM-DD`. */
  localDate: string;
  /** UTC timestamp persisted by the server clock. */
  recordedAt: string;
  valueType: IndicatorValueType;
  value: EntryValue;
  /** Optional observation; empty string when the person did not add one. */
  note: string;
}

/**
 * One answer to persist. A single save may carry any subset of indicators.
 * `note` is optional and complements the structured value; it never replaces
 * it.
 */
export interface EntryPlan {
  indicator: Indicator;
  value: EntryValue;
  note?: string;
}

export interface DailyAggregate {
  indicatorId: string;
  localDate: string;
  valueType: IndicatorValueType;
  value: EntryValue;
  /** Number of events that produced the consolidated value. */
  count: number;
}
