export type IndicatorGroup = 'factor' | 'result';
export type IndicatorValueType = 'boolean' | 'scale' | 'numeric' | 'ordinal';
export type IndicatorFrequency = 'single_per_day' | 'multiple_per_day';
export type DailyAggregation = 'sum' | 'mean' | 'last' | 'any';
export type DesiredDirection = 'neutral' | 'higher' | 'lower' | 'target_range';

export interface NumericConfig {
  unit: string;
  min: number | null;
  max: number | null;
  step: number;
}

export interface ScaleConfig {
  min: number;
  max: number;
  step: number;
}

export interface IndicatorOption {
  id: string;
  label: string;
  order: number;
}

export interface IdealRange {
  min: number;
  max: number;
}

export interface IndicatorInput {
  group: IndicatorGroup;
  name: string;
  abbreviation: string;
  emoji: string;
  valueType: IndicatorValueType;
  numeric?: NumericConfig;
  scale?: ScaleConfig;
  options?: IndicatorOption[];
  desiredDirection?: DesiredDirection;
  idealRange?: IdealRange;
  frequency: IndicatorFrequency;
  dailyAggregation?: DailyAggregation;
  sortOrder: number;
}

/**
 * Editable patch for an existing indicator. `null` means the field must be
 * removed from the stored document (converted to `deleteField()` by the
 * repository); structural keys are ignored by the patch builder once the
 * indicator has its first entry (see `buildIndicatorPatch`).
 */
export interface IndicatorPatch {
  group?: IndicatorGroup;
  name?: string;
  abbreviation?: string;
  emoji?: string;
  valueType?: IndicatorValueType;
  numeric?: NumericConfig | null;
  scale?: ScaleConfig | null;
  options?: IndicatorOption[] | null;
  frequency?: IndicatorFrequency;
  dailyAggregation?: DailyAggregation | null;
  desiredDirection?: DesiredDirection | null;
  idealRange?: IdealRange | null;
  sortOrder?: number;
}

export interface Indicator extends IndicatorInput {
  id: string;
  /**
   * UTC timestamp of the first entry ever recorded for this indicator. Once
   * set it is never removed, and the structural fields (group, value type,
   * unit/scale/options configuration, frequency and daily aggregation) stay
   * frozen. Null while no entry exists.
   */
  firstEntryAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IndicatorSuggestion {
  key: string;
  name: string;
  abbreviation: string;
  emoji: string;
  group: IndicatorGroup;
  meta: string;
  valueSummary: string;
  input: IndicatorInput;
}
