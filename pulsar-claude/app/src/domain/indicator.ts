/**
 * Pure domain types and validation for Indicators.
 *
 * Matches the model described in arquitetura.md#3.2 and spec.md#4.1-4.3.
 * No Firebase, React or DOM dependencies.
 */

import type { ValidationResult, ValidationError } from './validation';

export type IndicatorGroup = 'factor' | 'result';
export type ValueType = 'boolean' | 'scale' | 'ordinal' | 'numeric';
export type DesiredDirection = 'neutral' | 'higher' | 'lower' | 'target_range';
export type Frequency = 'single_per_day' | 'multiple_per_day';
export type DailyAggregation = 'sum' | 'mean' | 'last' | 'any';

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

export interface OrdinalOption {
  id: string;
  label: string;
}

export interface IdealRange {
  min: number;
  max: number;
}

export interface IndicatorInput {
  group: IndicatorGroup;
  name: string;
  abbreviation: string | null;
  emoji: string | null;
  valueType: ValueType;
  numeric: NumericConfig | null;
  scale: ScaleConfig | null;
  options: OrdinalOption[] | null;
  desiredDirection: DesiredDirection | null;
  idealRange: IdealRange | null;
  frequency: Frequency;
  dailyAggregation: DailyAggregation | null;
}

export interface Indicator extends IndicatorInput {
  id: string;
  sortOrder: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const VALID_DIRECTIONS: DesiredDirection[] = ['neutral', 'higher', 'lower', 'target_range'];

/**
 * Suggests a daily aggregation based only on group/value type.
 * Deterministic and never uses the indicator name.
 */
export function suggestAggregation({
  group,
  valueType,
}: {
  group: IndicatorGroup;
  valueType: ValueType;
}): DailyAggregation {
  if (valueType === 'numeric') {
    return group === 'factor' ? 'sum' : 'last';
  }
  if (valueType === 'scale') {
    return 'mean';
  }
  if (valueType === 'boolean') {
    return 'any';
  }
  return 'last';
}

/**
 * Returns the list of aggregations that are valid for a value type when
 * frequency is multiple_per_day. Returns null for single_per_day.
 */
export function allowedAggregations(valueType: ValueType, frequency: Frequency): DailyAggregation[] | null {
  if (frequency === 'single_per_day') {
    return null;
  }

  if (valueType === 'numeric' || valueType === 'scale') {
    return ['sum', 'mean', 'last'];
  }
  if (valueType === 'boolean') {
    return ['any', 'last'];
  }
  return ['last'];
}

/**
 * Validates an IndicatorInput. Pure and side-effect free.
 */
export function validateIndicator(input: IndicatorInput): ValidationResult {
  const errors: ValidationError[] = [];

  // Name
  if (!input.name || input.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name is required' });
  }

  // Abbreviation
  if (input.abbreviation !== null && input.abbreviation.length > 4) {
    errors.push({ field: 'abbreviation', message: 'Abbreviation must be at most 4 characters' });
  }

  // Ordinal options
  if (input.valueType === 'ordinal') {
    const count = input.options?.length ?? 0;
    if (count < 2 || count > 7) {
      errors.push({ field: 'options', message: 'Ordinal indicators require 2 to 7 options' });
    }
  }

  // Scale config
  if (input.valueType === 'scale') {
    if (!input.scale || input.scale.min >= input.scale.max) {
      errors.push({ field: 'scale', message: 'Scale minimum must be less than maximum' });
    } else if (input.scale.step <= 0) {
      errors.push({ field: 'scale', message: 'Scale step must be greater than 0' });
    }
  }

  // Desired direction and ideal range
  if (input.group === 'result') {
    if (!input.desiredDirection || !VALID_DIRECTIONS.includes(input.desiredDirection)) {
      errors.push({ field: 'desiredDirection', message: 'Valid desired direction is required for results' });
    } else if (input.desiredDirection === 'target_range') {
      if (input.valueType !== 'numeric' && input.valueType !== 'scale') {
        errors.push({
          field: 'desiredDirection',
          message: 'Target range is only available for numeric or scale results',
        });
      }
      if (!input.idealRange || input.idealRange.min > input.idealRange.max) {
        errors.push({ field: 'idealRange', message: 'Ideal range requires min <= max' });
      }
    } else if (input.idealRange !== null) {
      errors.push({
        field: 'idealRange',
        message: 'Ideal range is only allowed with target_range direction',
      });
    }
  } else {
    if (input.desiredDirection !== null) {
      errors.push({ field: 'desiredDirection', message: 'Factors do not have a desired direction' });
    }
    if (input.idealRange !== null) {
      errors.push({ field: 'idealRange', message: 'Ideal range only allowed for numeric or scale results' });
    }
  }

  // Required config block for the chosen value type
  if (input.valueType === 'numeric' && input.numeric === null) {
    errors.push({ field: 'numeric', message: 'Numeric configuration is required' });
  }
  if (input.valueType === 'scale' && input.scale === null) {
    errors.push({ field: 'scale', message: 'Scale configuration is required' });
  }
  if (input.valueType === 'ordinal' && input.options === null) {
    errors.push({ field: 'options', message: 'Options are required for ordinal indicators' });
  }

  // Non-matching config blocks must be null
  if (input.valueType !== 'numeric' && input.numeric !== null) {
    errors.push({ field: 'numeric', message: 'Numeric configuration not allowed for this value type' });
  }
  if (input.valueType !== 'scale' && input.scale !== null) {
    errors.push({ field: 'scale', message: 'Scale configuration not allowed for this value type' });
  }
  if (input.valueType !== 'ordinal' && input.options !== null) {
    errors.push({ field: 'options', message: 'Options not allowed for this value type' });
  }

  // Daily aggregation against frequency and type
  if (input.frequency === 'single_per_day' && input.dailyAggregation !== null) {
    errors.push({
      field: 'dailyAggregation',
      message: 'Daily aggregation is not applicable for single-per-day indicators',
    });
  }
  if (input.frequency === 'multiple_per_day') {
    const allowed = allowedAggregations(input.valueType, input.frequency);
    if (!allowed || !input.dailyAggregation || !allowed.includes(input.dailyAggregation)) {
      errors.push({ field: 'dailyAggregation', message: 'Invalid daily aggregation for value type' });
    }
  }

  return { valid: errors.length === 0, errors };
}
