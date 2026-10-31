export type IndicatorGroup = 'factor' | 'result';
export type IndicatorValueType = 'boolean' | 'scale' | 'ordinal' | 'numeric';
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
  options?: Array<{ id: string; label: string; order: number }>;
  desiredDirection?: DesiredDirection;
  idealRange?: IdealRange;
  frequency: IndicatorFrequency;
  dailyAggregation?: DailyAggregation;
  sortOrder: number;
}

export interface Indicator extends IndicatorInput {
  id: string;
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
