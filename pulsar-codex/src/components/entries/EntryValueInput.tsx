import clsx from 'clsx';
import { MaterialIcon } from '@components/ui/MaterialIcon';
import { formatNumberValue, optionLabel } from '@features/entries/model';
import type { EntryDraftValue } from '@features/entries/draft';
import type { Indicator } from '@features/indicators/types';

interface EntryValueInputProps {
  indicator: Indicator;
  label: string;
  value: EntryDraftValue | undefined;
  onChange: (value: EntryDraftValue | null) => void;
  disabled?: boolean;
}

function parseRaw(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function scaleValues(indicator: Indicator): number[] {
  const min = indicator.scale?.min ?? 0;
  const max = indicator.scale?.max ?? 10;
  const step = indicator.scale?.step ?? 1;
  if (!Number.isFinite(step) || step <= 0) return [];
  const count = Math.floor((max - min) / step) + 1;
  if (count < 1 || count > 11) return [];
  return Array.from({ length: count }, (_value, index) => Number((min + index * step).toFixed(6)));
}

const baseButton =
  'min-h-[44px] rounded-full font-label-md text-label-md flex items-center justify-center transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed';

export function EntryValueInput({
  indicator,
  label,
  value,
  onChange,
  disabled = false
}: EntryValueInputProps) {
  const answerLabel = `Resposta de ${label}`;
  const canClear = indicator.frequency === 'multiple_per_day';

  if (indicator.valueType === 'boolean') {
    const selected = value?.kind === 'boolean' ? value.value : null;
    const choose = (next: boolean) => {
      if (disabled) return;
      onChange(selected === next && canClear ? null : { kind: 'boolean', value: next });
    };
    return (
      <div className="flex flex-col gap-space-xs">
        <div role="group" aria-label={answerLabel} className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={selected === true}
            disabled={disabled}
            onClick={() => choose(true)}
            className={clsx(
              baseButton,
              'gap-1.5',
              selected === true
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container text-on-surface-variant'
            )}
          >
            <MaterialIcon name="check_circle" size={18} />
            <span>Sim</span>
          </button>
          <button
            type="button"
            aria-pressed={selected === false}
            disabled={disabled}
            onClick={() => choose(false)}
            className={clsx(
              baseButton,
              selected === false
                ? 'bg-secondary text-on-secondary shadow-sm'
                : 'bg-surface-container text-on-surface-variant'
            )}
          >
            <span>Não</span>
          </button>
        </div>
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          {selected === null
            ? 'Sem resposta: deixe em branco para não registrar este indicador.'
            : selected
              ? canClear
                ? 'Sim selecionado. Toque novamente para deixar sem resposta.'
                : 'Sim selecionado. Toque em outro valor para substituir o registro de hoje.'
              : 'Não selecionado. Um “Não” é diferente de ausência.'}
        </span>
      </div>
    );
  }

  if (indicator.valueType === 'ordinal') {
    const options = [...(indicator.options ?? [])].sort((left, right) => left.order - right.order);
    const selected = value?.kind === 'option' ? value.optionId : null;
    return (
      <div className="flex flex-col gap-space-xs">
        <div role="group" aria-label={answerLabel} className="grid grid-cols-2 gap-2">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected === option.id}
              disabled={disabled}
              onClick={() =>
                onChange(
                  selected === option.id && canClear
                    ? null
                    : { kind: 'option', optionId: option.id }
                )
              }
              className={clsx(
                baseButton,
                'px-2 truncate',
                selected === option.id
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container text-on-surface-variant'
              )}
            >
              {optionLabel(options, option.id)}
            </button>
          ))}
        </div>
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          {selected === null
            ? 'Sem resposta: nenhuma opção selecionada.'
            : canClear
              ? `${optionLabel(options, selected)} selecionado. Toque novamente para deixar sem resposta.`
              : `${optionLabel(options, selected)} selecionado. Toque em outra opção para substituir o registro de hoje.`}
        </span>
      </div>
    );
  }

  if (indicator.valueType === 'scale') {
    const values = scaleValues(indicator);
    const selected = value?.kind === 'number' ? parseRaw(value.raw) : null;
    if (values.length > 0) {
      const min = indicator.scale?.min ?? 0;
      const max = indicator.scale?.max ?? 10;
      return (
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center justify-between text-on-surface-variant font-label-code text-label-code px-1">
            <span>{formatNumberValue(min)} (mínimo)</span>
            <span>{formatNumberValue(max)} (máximo)</span>
          </div>
          <div
            role="group"
            aria-label={answerLabel}
            className="flex items-center gap-1 overflow-x-auto py-1"
            style={{ scrollbarWidth: 'none' }}
          >
            {values.map((option) => {
              const active = selected === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  disabled={disabled}
                  onClick={() =>
                    onChange(
                      active && canClear
                        ? null
                        : { kind: 'number', raw: String(option).replace('.', ',') }
                    )
                  }
                  className={clsx(
                    'w-9 h-11 rounded-full font-label-code text-label-code flex items-center justify-center shrink-0 transition-all active:scale-90 disabled:opacity-50',
                    active
                      ? 'bg-primary text-on-primary shadow-md font-bold scale-105'
                      : 'bg-surface-container text-on-surface-variant'
                  )}
                >
                  {formatNumberValue(option)}
                </button>
              );
            })}
          </div>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            {selected === null
              ? 'Sem resposta: nenhum valor selecionado.'
              : `${formatNumberValue(selected)} de ${formatNumberValue(max)} selecionado.`}
          </span>
        </div>
      );
    }
  }

  // Numeric value and scales with too many steps use the same exact field.
  const numericConfig = indicator.numeric;
  const scaleConfig = indicator.scale;
  const step = numericConfig?.step ?? scaleConfig?.step ?? 1;
  const min = indicator.valueType === 'scale'
    ? scaleConfig?.min ?? 0
    : numericConfig?.min ?? null;
  const max = indicator.valueType === 'scale'
    ? scaleConfig?.max ?? 10
    : numericConfig?.max ?? null;
  const raw = value?.kind === 'number' ? value.raw : '';
  const unit = indicator.valueType === 'numeric' ? numericConfig?.unit.trim() ?? '' : '';

  function updateRaw(next: string) {
    if (disabled) return;
    if (!next.trim()) {
      onChange(null);
      return;
    }
    onChange({ kind: 'number', raw: next });
  }

  function adjust(direction: -1 | 1) {
    const current = parseRaw(raw) ?? (direction > 0 ? (min ?? 0) - step : min ?? 0);
    const next = Number((current + direction * step).toFixed(6));
    const clamped =
      (min != null && next < min) || (max != null && next > max)
        ? current
        : next;
    updateRaw(String(clamped).replace('.', ','));
  }

  return (
    <div className="flex flex-col gap-space-xs">
      <div className="flex items-center justify-between gap-space-sm bg-surface-container-low p-1.5 rounded-full">
        <button
          type="button"
          aria-label={`Diminuir ${label}`}
          disabled={disabled}
          onClick={() => adjust(-1)}
          className="w-12 h-12 rounded-full bg-surface-container text-on-surface flex items-center justify-center shrink-0 active:scale-90 disabled:opacity-50"
        >
          <MaterialIcon name="remove" size={20} />
        </button>
        <div className="flex items-center justify-center gap-1.5 min-w-0 flex-1">
          <input
            aria-label={`${answerLabel} (valor numérico)`}
            inputMode="decimal"
            autoComplete="off"
            value={raw}
            disabled={disabled}
            onChange={(event) => updateRaw(event.target.value)}
            placeholder="—"
            className="w-20 min-w-0 bg-transparent text-center font-stat-display text-stat-display text-primary outline-none disabled:opacity-50"
          />
          {unit && (
            <span className="font-label-code text-label-code text-on-surface-variant uppercase truncate">
              {unit}
            </span>
          )}
        </div>
        <button
          type="button"
          aria-label={`Aumentar ${label}`}
          disabled={disabled}
          onClick={() => adjust(1)}
          className="w-12 h-12 rounded-full bg-secondary text-on-secondary flex items-center justify-center shrink-0 active:scale-90 disabled:opacity-50"
        >
          <MaterialIcon name="add" size={20} />
        </button>
      </div>
      <span className="font-body-sm text-body-sm text-on-surface-variant">
        {value?.kind === 'number' && raw.trim()
          ? 'Valor informado. Deixe em branco para não registrar este indicador.'
          : 'Sem resposta: nenhum valor informado. Zero é um valor válido e diferente de ausência.'}
      </span>
    </div>
  );
}

export default EntryValueInput;
