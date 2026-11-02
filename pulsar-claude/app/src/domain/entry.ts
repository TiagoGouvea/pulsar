/**
 * Pure domain types and validation for Entry values.
 *
 * Matches the model described in arquitetura.md#3.3.
 * No Firebase, React or DOM dependencies.
 */

import type { IndicatorInput, OrdinalOption, ValueType } from './indicator';
import type { ValidationError, ValidationResult } from './validation';

export type EntryValueBoolean = { boolean: boolean };
export type EntryValueNumber = { number: number };
export type EntryValueOption = { optionId: string };
export type EntryValue = EntryValueBoolean | EntryValueNumber | EntryValueOption;

export interface Entry {
  id: string;
  indicatorId: string;
  localDate: string;
  recordedAt: string;
  valueType: ValueType;
  value: EntryValue;
  note: string | null;
}

interface ValueShapeCheck {
  valid: boolean;
  key?: string;
  error?: string;
}

function checkValueShape(value: unknown): ValueShapeCheck {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { valid: false, error: 'Value is required' };
  }

  const keys = Object.keys(value);
  if (keys.length !== 1) {
    return { valid: false, error: 'Value must contain exactly one key' };
  }

  return { valid: true, key: keys[0] };
}

function optionExists(options: OrdinalOption[] | null, optionId: string): boolean {
  return options !== null && options.some((option) => option.id === optionId);
}

/**
 * Validates that an entry value matches the indicator's value type and constraints.
 */
export function validateEntryValue(indicator: IndicatorInput, value: EntryValue): ValidationResult {
  const errors: ValidationError[] = [];

  const shape = checkValueShape(value);
  if (!shape.valid || !shape.key) {
    errors.push({ field: 'value', message: shape.error ?? 'Invalid value shape' });
    return { valid: false, errors };
  }

  const typedValue = value as Record<string, unknown>;

  if (indicator.valueType === 'boolean') {
    if (shape.key !== 'boolean' || typeof typedValue.boolean !== 'boolean') {
      errors.push({ field: 'value', message: 'Boolean value required' });
    }
  } else if (indicator.valueType === 'numeric' || indicator.valueType === 'scale') {
    const isScale = indicator.valueType === 'scale';
    const num = typedValue.number;
    if (shape.key !== 'number') {
      errors.push({ field: 'value', message: isScale ? 'Scale value required' : 'Numeric value required' });
    } else if (typeof num !== 'number' || !Number.isFinite(num)) {
      errors.push({ field: 'value', message: 'Finite number required' });
    } else if (isScale && indicator.scale && (num < indicator.scale.min || num > indicator.scale.max)) {
      errors.push({ field: 'value', message: 'Value outside scale range' });
    } else if (!isScale && indicator.numeric) {
      const { min, max } = indicator.numeric;
      if (min !== null && num < min) {
        errors.push({ field: 'value', message: 'Value below configured minimum' });
      }
      if (max !== null && num > max) {
        errors.push({ field: 'value', message: 'Value above configured maximum' });
      }
    }
  } else if (indicator.valueType === 'ordinal') {
    if (shape.key !== 'optionId') {
      errors.push({ field: 'value', message: 'Option ID value required' });
    } else {
      const optionId = typedValue.optionId;
      if (typeof optionId !== 'string' || optionId.length === 0) {
        errors.push({ field: 'value', message: 'Option ID is required' });
      } else if (!optionExists(indicator.options, optionId)) {
        errors.push({ field: 'value', message: 'Option ID does not exist' });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
