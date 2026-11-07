import { useId, useState, type FormEvent, type ReactNode } from 'react';
import type { IndicatorInput, OrdinalOption, ValueType } from '../domain/indicator';
import { abbreviationOf } from '../privacy/label';
import { Button, Chip, Icon, type IconName } from '../design';
import { AggregationControl } from './AggregationControl';
import { suggestedAggregation } from './aggregation';
import {
  CUSTOM_UNIT,
  DIRECTION_OPTIONS,
  EMOJI_OPTIONS,
  UNIT_GROUPS,
  VALUE_TYPE_OPTIONS,
  isCustomUnit,
} from './catalog';
import {
  createOrdinalOption,
  draftToInput,
  validateDraft,
  type DraftErrorField,
  type DraftErrors,
  type IndicatorDraft,
} from './draft';

const TYPE_ICON: Record<ValueType, IconName> = {
  boolean: 'check_circle',
  scale: 'ssid_chart',
  numeric: 'vital_signs',
  ordinal: 'analytics',
};

interface IndicatorEditorProps {
  initial: IndicatorDraft;
  /** True when the indicator already has history: configuration fields become read-only (spec 4.1). */
  locked?: boolean;
  submitLabel: string;
  busy?: boolean;
  error?: string | null;
  onSubmit: (input: IndicatorInput) => void;
  onCancel: () => void;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="px-1 font-body-sm text-body-sm text-error">
      {message}
    </p>
  );
}

function SectionLabel({ step, children }: { step: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <span className="font-label-code text-label-code font-bold text-primary">{step}</span>
      <span className="font-label-md text-label-md font-semibold tracking-wider text-on-surface-variant uppercase">
        {children}
      </span>
    </div>
  );
}

function TextField({
  id,
  label,
  hint,
  value,
  onChange,
  disabled = false,
  maxLength,
  inputMode,
  placeholder,
  error,
  center = false,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  maxLength?: number;
  inputMode?: 'text' | 'decimal';
  placeholder?: string;
  error?: string;
  center?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-center justify-between px-1">
        <label htmlFor={id} className="font-label-md text-label-md font-medium text-on-surface">
          {label}
        </label>
        {hint && <span className="font-label-code text-label-code text-on-surface-variant">{hint}</span>}
      </div>
      <input
        id={id}
        type="text"
        inputMode={inputMode ?? 'text'}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`h-12 w-full rounded-full bg-surface-container-low px-4 font-body-lg text-body-lg text-on-surface transition-all placeholder:text-on-surface-variant/50 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${center ? 'text-center font-stat-display text-stat-display tracking-wider' : ''}`}
      />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

/**
 * Form of the "Novo Indicador" sheet (design/novo_indicador_modal, spec 4.1-4.4).
 * Renders only the sheet body: the page wraps it in <Sheet>.
 */
export function IndicatorEditor({
  initial,
  locked = false,
  submitLabel,
  busy = false,
  error,
  onSubmit,
  onCancel,
}: IndicatorEditorProps) {
  const [draft, setDraft] = useState<IndicatorDraft>(initial);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [customUnit, setCustomUnit] = useState(() => isCustomUnit(initial.unit));
  const baseId = useId();

  const nameId = `${baseId}-name`;
  const abbreviationId = `${baseId}-abbreviation`;
  const unitId = `${baseId}-unit`;
  const customUnitId = `${baseId}-custom-unit`;
  const scaleMinId = `${baseId}-scale-min`;
  const scaleMaxId = `${baseId}-scale-max`;
  const scaleStepId = `${baseId}-scale-step`;
  const idealMinId = `${baseId}-ideal-min`;
  const idealMaxId = `${baseId}-ideal-max`;

  const isResult = draft.group === 'result';
  const isScale = draft.valueType === 'scale';
  const isNumeric = draft.valueType === 'numeric';
  const isOrdinal = draft.valueType === 'ordinal';
  const allowsIdealRange = draft.valueType === 'numeric' || draft.valueType === 'scale';
  const preview = abbreviationOf({ name: draft.name, abbreviation: draft.abbreviation });

  function update(patch: Partial<IndicatorDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function clearError(field: DraftErrorField) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function chooseGroup(group: IndicatorDraft['group']) {
    if (locked) return;
    update({
      group,
      dailyAggregation: suggestedAggregation(group, draft.valueType),
      desiredDirection: group === 'factor' ? 'neutral' : draft.desiredDirection,
    });
  }

  function chooseValueType(valueType: ValueType) {
    if (locked) return;
    const keepsIdealRange = valueType === 'numeric' || valueType === 'scale';
    update({
      valueType,
      dailyAggregation: suggestedAggregation(draft.group, valueType),
      desiredDirection:
        draft.desiredDirection === 'target_range' && !keepsIdealRange ? 'neutral' : draft.desiredDirection,
    });
  }

  function chooseUnit(value: string) {
    if (value === CUSTOM_UNIT) {
      setCustomUnit(true);
      update({ unit: '' });
      return;
    }
    setCustomUnit(false);
    update({ unit: value });
  }

  function updateOption(id: string, label: string) {
    update({
      options: draft.options.map((option) => (option.id === id ? { ...option, label } : option)),
    });
  }

  function addOption() {
    if (draft.options.length >= 7) return;
    update({ options: [...draft.options, createOrdinalOption(draft.options)] });
  }

  function removeOption(id: string) {
    if (draft.options.length <= 2) return;
    update({ options: draft.options.filter((option) => option.id !== id) });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const validation = validateDraft(draft);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    setErrors({});
    onSubmit(draftToInput(draft));
  }

  return (
    <form
      aria-label={locked ? 'Editar indicador' : 'Novo indicador'}
      noValidate
      onSubmit={handleSubmit}
      className="flex flex-col gap-space-lg"
    >
      {error && (
        <p
          role="alert"
          className="rounded-md bg-error-container px-3 py-2 font-body-sm text-body-sm text-on-error-container"
        >
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <SectionLabel step="1">Classificação causal</SectionLabel>
        <div
          role="radiogroup"
          aria-label="Grupo do indicador"
          className="grid grid-cols-2 gap-1 rounded-full bg-surface-container p-1"
        >
          {(
            [
              { value: 'factor', label: 'Fator', caption: 'O que causei/ingeri', icon: 'input' },
              { value: 'result', label: 'Resultado', caption: 'O que percebi/medi', icon: 'insights' },
            ] as const
          ).map((option) => {
            const selected = draft.group === option.value;
            const tone =
              option.value === 'factor'
                ? 'bg-secondary text-on-secondary'
                : 'bg-primary-container text-on-primary';
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={option.label}
                disabled={locked}
                onClick={() => chooseGroup(option.value)}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-full px-2 py-2 transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                  selected ? `${tone} shadow-sm` : 'text-on-surface-variant'
                }`}
              >
                <Icon name={option.icon} className="text-[18px]" />
                <span className="flex flex-col text-left">
                  <span className="font-label-lg text-label-lg leading-none">{option.label}</span>
                  <span className="pt-0.5 font-label-code text-[10px]">{option.caption}</span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="flex items-center gap-1.5 px-1 font-body-sm text-body-sm text-on-surface-variant">
          <Icon name="analytics" className="text-[15px]" />
          {isResult
            ? 'Resultados alimentam o eixo vertical de sintomas, foco e biomarcadores.'
            : 'Fatores são suas intervenções: hábitos, suplementos e rotinas.'}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <SectionLabel step="2">Identificação</SectionLabel>
        <div>
          <div className="mb-1 flex items-center justify-between px-1">
            <label htmlFor={nameId} className="font-label-md text-label-md font-medium text-on-surface">
              Nome do Indicador *
            </label>
            <span className="font-label-code text-label-code text-on-surface-variant">Obrigatório</span>
          </div>
          {/* Explicit editing shows the real name on purpose (spec 4.4). */}
          <input
            id={nameId}
            data-privacy-allow
            type="text"
            value={draft.name}
            maxLength={60}
            placeholder="Ex: Nível de Energia ou Coenzima Q10"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? `${nameId}-error` : undefined}
            onChange={(event) => {
              update({ name: event.target.value });
              clearError('name');
            }}
            className="h-12 w-full rounded-full bg-surface-container-low px-4 font-body-lg text-body-lg text-on-surface transition-all placeholder:text-on-surface-variant/50 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container focus:outline-none"
          />
          <FieldError id={`${nameId}-error`} message={errors.name} />
        </div>

        <div className="grid grid-cols-2 items-start gap-2">
          <TextField
            id={abbreviationId}
            label="Sigla"
            hint="Até 4"
            value={draft.abbreviation}
            maxLength={4}
            center
            placeholder="EX: DIS"
            error={errors.abbreviation}
            onChange={(value) => {
              update({ abbreviation: value });
              clearError('abbreviation');
            }}
          />
          <div className="flex min-w-0 flex-col gap-1">
            <span className="px-1 font-label-md text-label-md font-medium text-on-surface">Emoji</span>
            <div role="group" aria-label="Emoji" className="flex min-h-12 flex-wrap items-center gap-1">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  aria-label={`Emoji ${emoji}`}
                  aria-pressed={draft.emoji === emoji}
                  onClick={() => update({ emoji: draft.emoji === emoji ? null : emoji })}
                  className={`flex h-11 w-11 items-center justify-center rounded-full text-[18px] transition-transform active:scale-90 ${
                    draft.emoji === emoji
                      ? 'bg-primary-fixed text-on-primary-fixed shadow-sm'
                      : 'bg-surface-container-low'
                  }`}
                >
                  {emoji}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={draft.emoji === null}
                onClick={() => update({ emoji: null })}
                className={`flex h-11 items-center justify-center rounded-full px-3 font-label-md text-label-md transition-transform active:scale-95 ${
                  draft.emoji === null
                    ? 'bg-on-surface text-surface'
                    : 'bg-surface-container-low text-on-surface-variant'
                }`}
              >
                Sem emoji
              </button>
            </div>
          </div>
        </div>
        <p
          data-testid="abbreviation-preview"
          className="px-1 font-body-sm text-body-sm text-on-surface-variant"
        >
          Prévia no modo sigla:{' '}
          <span className="font-label-code text-label-code tracking-wider text-on-surface">{preview}</span>
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <SectionLabel step="3">Tipo de resposta</SectionLabel>
          <span className="shrink-0 font-label-code text-label-code font-bold text-primary">
            {locked ? 'Travado' : 'Imutável após 1º registro'}
          </span>
        </div>
        <div role="radiogroup" aria-label="Tipo de resposta" className="grid grid-cols-2 gap-2">
          {VALUE_TYPE_OPTIONS.map((option) => {
            const selected = draft.valueType === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={option.label}
                disabled={locked}
                onClick={() => chooseValueType(option.value)}
                className={`flex flex-col gap-1 rounded-lg p-3 text-left transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
                  selected ? 'bg-primary-fixed/40 shadow-sm' : 'bg-surface-container-low'
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <Icon
                    name={TYPE_ICON[option.value]}
                    className={`text-[20px] ${selected ? 'text-primary' : 'text-on-surface-variant'}`}
                  />
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full ${
                      selected ? 'bg-primary text-on-primary' : 'bg-surface-container'
                    }`}
                  >
                    {selected && <Icon name="check_circle" className="text-[12px]" />}
                  </span>
                </div>
                <span
                  className={`font-label-lg text-label-lg ${selected ? 'font-bold text-primary' : 'text-on-surface'}`}
                >
                  {option.label}
                </span>
                <span className="font-body-sm text-[11px] text-on-surface-variant">{option.caption}</span>
              </button>
            );
          })}
        </div>
      </div>

      {isScale && (
        <div className="flex flex-col gap-2">
          <span className="px-1 font-label-md text-label-md font-semibold tracking-wider text-on-surface-variant uppercase">
            Configuração da escala
          </span>
          <div className="grid grid-cols-3 gap-2">
            <TextField
              id={scaleMinId}
              label="Mínimo"
              value={draft.scaleMin}
              inputMode="decimal"
              disabled={locked}
              onChange={(value) => {
                update({ scaleMin: value });
                clearError('scale');
              }}
            />
            <TextField
              id={scaleMaxId}
              label="Máximo"
              value={draft.scaleMax}
              inputMode="decimal"
              disabled={locked}
              onChange={(value) => {
                update({ scaleMax: value });
                clearError('scale');
              }}
            />
            <TextField
              id={scaleStepId}
              label="Passo"
              value={draft.scaleStep}
              inputMode="decimal"
              disabled={locked}
              onChange={(value) => {
                update({ scaleStep: value });
                clearError('scale');
              }}
            />
          </div>
          <FieldError id={`${baseId}-scale-error`} message={errors.scale} />
        </div>
      )}

      {isNumeric && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <label htmlFor={unitId} className="font-label-md text-label-md font-medium text-on-surface">
              Unidade
            </label>
            <span className="font-label-code text-label-code text-on-surface-variant">
              Metadado, não é meta
            </span>
          </div>
          <select
            id={unitId}
            value={customUnit ? CUSTOM_UNIT : draft.unit}
            disabled={locked}
            onChange={(event) => {
              chooseUnit(event.target.value);
              clearError('unit');
            }}
            className="h-12 w-full rounded-full bg-surface-container-low px-4 font-body-lg text-body-lg text-on-surface focus:ring-2 focus:ring-primary-container focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">Sem unidade</option>
            {UNIT_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.units.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </optgroup>
            ))}
            <option value={CUSTOM_UNIT}>Outra unidade…</option>
          </select>
          {customUnit && (
            <input
              id={customUnitId}
              aria-label="Unidade personalizada"
              type="text"
              value={draft.unit}
              maxLength={20}
              disabled={locked}
              placeholder="Digite a unidade"
              onChange={(event) => {
                update({ unit: event.target.value });
                clearError('unit');
              }}
              className="h-12 w-full rounded-full bg-surface-container-low px-4 font-body-lg text-body-lg text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary-container focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
          )}
          <FieldError id={`${unitId}-error`} message={errors.unit} />
        </div>
      )}

      {isOrdinal && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="font-label-md text-label-md font-medium text-on-surface">Opções ordenadas</span>
            <span className="font-label-code text-label-code text-on-surface-variant">2 a 7</span>
          </div>
          <div className="flex flex-col gap-2">
            {draft.options.map((option: OrdinalOption, index) => (
              <div key={option.id} className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-center font-label-code text-label-code text-on-surface-variant">
                  {index + 1}
                </span>
                <input
                  aria-label={`Opção ${index + 1}`}
                  type="text"
                  value={option.label}
                  maxLength={30}
                  disabled={locked}
                  onChange={(event) => {
                    updateOption(option.id, event.target.value);
                    clearError('options');
                  }}
                  className="h-11 min-w-0 flex-1 rounded-full bg-surface-container-low px-4 font-body-lg text-body-lg text-on-surface focus:ring-2 focus:ring-primary-container focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                />
                <button
                  type="button"
                  aria-label={`Remover opção ${index + 1}`}
                  disabled={locked || draft.options.length <= 2}
                  onClick={() => removeOption(option.id)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-variant disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Icon name="remove" className="text-[20px]" />
                </button>
              </div>
            ))}
            <Button
              variant="neutral"
              icon="add"
              disabled={locked || draft.options.length >= 7}
              onClick={addOption}
              className="self-start"
            >
              Adicionar opção
            </Button>
          </div>
          <FieldError id={`${baseId}-options-error`} message={errors.options} />
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-lg bg-surface-container-low p-3.5">
        <div className="flex flex-col">
          <span className="font-label-md text-label-md font-semibold text-on-surface">Frequência diária</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            Quantas vezes você avalia no dia?
          </span>
        </div>
        <div
          role="group"
          aria-label="Frequência diária"
          className="grid grid-cols-2 gap-1 rounded-full bg-surface-container p-1"
        >
          <Chip
            selected={draft.frequency === 'single_per_day'}
            disabled={locked}
            onClick={() => update({ frequency: 'single_per_day' })}
            className="justify-center"
          >
            1x ao dia (Único)
          </Chip>
          <Chip
            selected={draft.frequency === 'multiple_per_day'}
            disabled={locked}
            onClick={() => update({ frequency: 'multiple_per_day' })}
            className="justify-center"
          >
            Múltiplos registros
          </Chip>
        </div>
        <AggregationControl
          group={draft.group}
          valueType={draft.valueType}
          frequency={draft.frequency}
          value={draft.dailyAggregation}
          onChange={(dailyAggregation) => update({ dailyAggregation })}
          disabled={locked}
        />
      </div>

      {isResult && (
        <div className="flex flex-col gap-2">
          <SectionLabel step="5">Direção desejável</SectionLabel>
          <div role="group" aria-label="Direção desejável" className="grid grid-cols-2 gap-2">
            {DIRECTION_OPTIONS.filter((option) => option.value !== 'target_range' || allowsIdealRange).map(
              (option) => (
                <Chip
                  key={option.value}
                  tone="result"
                  selected={draft.desiredDirection === option.value}
                  onClick={() => update({ desiredDirection: option.value })}
                  className="justify-center"
                >
                  {option.label}
                </Chip>
              ),
            )}
          </div>
          {draft.desiredDirection === 'target_range' && (
            <div className="grid grid-cols-2 gap-2">
              <TextField
                id={idealMinId}
                label="Mínimo ideal"
                value={draft.idealMin}
                inputMode="decimal"
                onChange={(value) => {
                  update({ idealMin: value });
                  clearError('idealRange');
                }}
              />
              <TextField
                id={idealMaxId}
                label="Máximo ideal"
                value={draft.idealMax}
                inputMode="decimal"
                onChange={(value) => {
                  update({ idealMax: value });
                  clearError('idealRange');
                }}
              />
            </div>
          )}
          <FieldError id={`${baseId}-ideal-error`} message={errors.idealRange} />
        </div>
      )}

      <div className="flex items-start gap-2.5 rounded-lg bg-surface-container-high/60 p-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-container-lowest text-primary shadow-level-1">
          <Icon name="verified" className="text-[18px]" />
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="font-label-md text-label-md font-semibold text-on-surface">
            Trava de integridade científica
          </span>
          {locked ? (
            <p data-testid="locked-notice" className="font-body-sm text-body-sm text-on-surface-variant">
              Este indicador já tem histórico. Grupo, tipo de resposta, configuração da escala/opções,
              unidade, frequência e agregação ficam desabilitados. Nome, sigla, emoji e direção continuam
              editáveis.
            </p>
          ) : (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Tipo de resposta, unidade, configuração e agregação tornam-se{' '}
              <strong className="text-on-surface">definitivos após o primeiro registro</strong>. Nome, sigla,
              emoji e direção podem ser atualizados a qualquer momento.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-1 pb-2">
        <Button type="submit" fullWidth icon="add_circle" disabled={busy}>
          {busy ? 'Salvando…' : submitLabel}
        </Button>
        <Button type="button" variant="neutral" fullWidth onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
