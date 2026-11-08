/**
 * pt-BR label of a recorded value, according to the type of the indicator (spec 5.2).
 * Pure helper: no React, no Firebase, no DOM.
 */
import type { EntryValue } from '../domain/entry';
import type { IndicatorInput } from '../domain/indicator';

type ValueSource = Pick<IndicatorInput, 'valueType' | 'numeric' | 'options'>;

/** "Sim"/"Não", "7", "7 xícaras" or the label of the chosen ordinal option. */
export function entryValueLabel(indicator: ValueSource, value: EntryValue | null): string {
  if (!value) return '—';
  if (indicator.valueType === 'boolean' && 'boolean' in value) {
    return value.boolean ? 'Sim' : 'Não';
  }
  if (indicator.valueType === 'ordinal' && 'optionId' in value) {
    const option = indicator.options?.find((entry) => entry.id === value.optionId);
    return option?.label ?? value.optionId;
  }
  if ('number' in value) {
    const unit = indicator.valueType === 'numeric' ? indicator.numeric?.unit : null;
    return unit ? `${value.number} ${unit}` : `${value.number}`;
  }
  return '—';
}
