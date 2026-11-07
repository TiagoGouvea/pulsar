import { useId, useState } from 'react';
import { Icon } from '../design';
import type { DailyAggregation, Frequency, IndicatorGroup, ValueType } from '../domain/indicator';
import {
  aggregationChoices,
  aggregationExample,
  aggregationLabel,
  suggestedAggregation,
} from './aggregation';

interface AggregationControlProps {
  group: IndicatorGroup;
  valueType: ValueType;
  frequency: Frequency;
  value: DailyAggregation;
  onChange: (value: DailyAggregation) => void;
  /** Locked after the first record (spec 4.1). */
  disabled?: boolean;
}

/**
 * Daily aggregation selector (spec 4.1.1). Hidden for single-per-day indicators, where the
 * day simply uses its only value. Advanced settings only list aggregations valid for the type
 * and explain their effect with an example.
 */
export function AggregationControl({
  group,
  valueType,
  frequency,
  value,
  onChange,
  disabled = false,
}: AggregationControlProps) {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const choices = aggregationChoices(valueType, frequency);

  // A disabled control (locked indicator) still shows the configured choice, without opening.
  const showChoices = (open || disabled) && choices !== null;

  if (frequency !== 'multiple_per_day' || choices === null) return null;

  const suggested = suggestedAggregation(group, valueType);

  return (
    <div
      data-testid="aggregation-control"
      className="flex flex-col gap-2 rounded-lg bg-surface-container-low p-3.5"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Icon name="analytics" className="text-[18px] text-secondary" />
          <span className="font-body-sm text-body-sm font-medium text-on-surface">
            Agregação para correlações
          </span>
        </div>
        <span
          data-testid="aggregation-suggested"
          className="shrink-0 rounded-full bg-surface-container-highest px-2.5 py-1 font-label-code text-label-code font-bold tracking-wider text-secondary uppercase"
        >
          {aggregationLabel(suggested)}
        </span>
      </div>
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        Sugestão automática pelo tipo. Ajuste antes do primeiro registro se preferir.
      </p>
      <button
        type="button"
        aria-expanded={showChoices}
        aria-controls={`${labelId}-choices`}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex min-h-11 items-center gap-1 self-start rounded-full px-1 font-label-md text-label-md text-primary disabled:opacity-60"
      >
        Configurações avançadas
        <Icon name={showChoices ? 'remove' : 'add'} className="text-[16px]" />
      </button>
      {showChoices && (
        <div id={`${labelId}-choices`} className="flex flex-col gap-2">
          <div role="radiogroup" aria-label="Agregação diária" className="flex flex-wrap gap-2">
            {choices.map((aggregation) => {
              const selected = value === aggregation;
              return (
                <button
                  key={aggregation}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={disabled}
                  onClick={() => onChange(aggregation)}
                  className={`inline-flex h-11 min-w-11 items-center justify-center rounded-full px-4 font-label-md text-label-md transition-transform active:scale-95 disabled:opacity-60 ${
                    selected
                      ? 'bg-secondary text-on-secondary shadow-sm'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  {aggregationLabel(aggregation)}
                </button>
              );
            })}
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            <span className="font-medium text-on-surface">{aggregationLabel(value)}:</span>{' '}
            {aggregationExample(valueType, value)}
          </p>
          {disabled && (
            <p className="font-label-code text-label-code tracking-wider text-on-surface-variant uppercase">
              Travada após o primeiro registro
            </p>
          )}
        </div>
      )}
    </div>
  );
}
