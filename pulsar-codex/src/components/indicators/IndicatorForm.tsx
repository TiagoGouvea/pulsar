import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { MaterialIcon } from '@components/ui/MaterialIcon';
import { SegmentedControl } from '@components/ui/SegmentedControl';
import {
  DAILY_AGGREGATION_EXAMPLES,
  DAILY_AGGREGATION_LABELS,
  MAX_OPTIONS,
  MIN_OPTIONS,
  allowedDailyAggregations,
  emptyFormState,
  hasFormErrors,
  indicatorInputFromForm,
  suggestedDailyAggregation,
  validateIndicatorForm,
  type IndicatorFormErrors,
  type IndicatorFormState
} from '@features/indicators/model';
import type { IndicatorInput, IndicatorValueType } from '@features/indicators/types';

const EMOJI_SUGGESTIONS = ['⚡', '🏋️', '☕', '🧠', '💤', '🎯'];

const UNIT_SUGGESTIONS = [
  { label: 'Sem unidade', value: '' },
  { label: 'xícaras', value: 'xícaras' },
  { label: 'comprimidos', value: 'comprimidos' },
  { label: 'doses', value: 'doses' },
  { label: 'minutos', value: 'minutos' },
  { label: 'horas', value: 'horas' },
  { label: 'mg', value: 'mg' },
  { label: 'kg', value: 'kg' }
];

const inputClass =
  'w-full h-12 bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/50 px-4 rounded-full font-body-lg text-body-lg focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container transition-all disabled:opacity-50 disabled:cursor-not-allowed';

const smallInputClass =
  'w-full min-h-[44px] bg-surface-container-low text-on-surface text-center px-2 py-2 rounded-full font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container transition-all disabled:opacity-50 disabled:cursor-not-allowed';

function SectionLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-space-sm px-1">
      <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">
        {children}
      </span>
      {hint && (
        <span className="font-label-code text-label-code text-primary font-bold text-right shrink-0">
          {hint}
        </span>
      )}
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <span id={id} role="alert" className="font-body-sm text-body-sm text-error px-1">
      {message}
    </span>
  );
}

interface IndicatorFormProps {
  initial?: IndicatorFormState;
  /** Structural fields are immutable after the first entry (spec 4.1). */
  frozen: boolean;
  submitLabel: string;
  pending: boolean;
  serverError: string;
  onSubmit: (input: IndicatorInput) => void;
  onCancel: () => void;
}

export const IndicatorForm: React.FC<IndicatorFormProps> = ({
  initial,
  frozen,
  submitLabel,
  pending,
  serverError,
  onSubmit,
  onCancel
}) => {
  const [state, setState] = useState<IndicatorFormState>(() => initial ?? emptyFormState());
  const [errors, setErrors] = useState<IndicatorFormErrors>({});

  const groupCaption =
    state.group === 'factor'
      ? 'Fatores são suas intervenções: hábitos, suplementos e rotinas.'
      : 'Resultados alimentam o eixo vertical de sintomas, foco e biomarcadores.';

  const allowedAggregations = useMemo(
    () => allowedDailyAggregations(state.valueType),
    [state.valueType]
  );

  function update<K extends keyof IndicatorFormState>(key: K, value: IndicatorFormState[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  function selectGroup(group: IndicatorFormState['group']) {
    if (frozen) return;
    setState((current) =>
      group === 'factor'
        ? { ...current, group, desiredDirection: 'neutral' }
        : { ...current, group }
    );
  }

  function selectValueType(valueType: IndicatorValueType) {
    if (frozen) return;
    setState((current) => {
      const next: IndicatorFormState = { ...current, valueType };
      if (current.dailyAggregation && !allowedDailyAggregations(valueType).includes(current.dailyAggregation)) {
        next.dailyAggregation = suggestedDailyAggregation(current.group, valueType);
      }
      if (current.desiredDirection === 'target_range' && valueType !== 'scale' && valueType !== 'numeric') {
        next.desiredDirection = 'neutral';
      }
      return next;
    });
  }

  function selectFrequency(frequency: IndicatorFormState['frequency']) {
    if (frozen) return;
    setState((current) => ({
      ...current,
      frequency,
      dailyAggregation:
        frequency === 'multiple_per_day'
          ? current.dailyAggregation ?? suggestedDailyAggregation(current.group, current.valueType)
          : null
    }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateIndicatorForm(state);
    setErrors(validation);
    if (hasFormErrors(validation)) return;
    onSubmit(indicatorInputFromForm(state));
  }

  const optionCount = state.optionDrafts.length;
  const rangeEditable = state.valueType === 'scale' || state.valueType === 'numeric';

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-space-lg" aria-label="Formulário de indicador">
      {/* 1. Classificação causal */}
      <section className="flex flex-col gap-2" aria-labelledby="indicator-group-label">
        <SectionLabel hint={frozen ? 'Imutável' : undefined}>1. Classificação causal</SectionLabel>
        <SegmentedControl
          ariaLabel="Classificação causal do indicador"
          value={state.group}
          disabled={frozen}
          onChange={selectGroup}
          options={[
            {
              value: 'factor',
              label: 'Fator',
              caption: 'O que causei/ingeri',
              icon: <MaterialIcon name="input" size={18} />,
              activeClassName: 'bg-secondary text-on-secondary shadow-sm'
            },
            {
              value: 'result',
              label: 'Resultado',
              caption: 'O que percebi/medi',
              icon: <MaterialIcon name="output" size={18} />,
              activeClassName: 'bg-primary-container text-on-primary shadow-sm'
            }
          ]}
        />
        <p className="font-body-sm text-body-sm text-primary font-medium px-1 flex items-center gap-1.5">
          <MaterialIcon name="info" size={15} />
          {groupCaption}
        </p>
      </section>

      {/* 2. Identificação */}
      <section className="flex flex-col gap-3" aria-labelledby="indicator-name-label">
        <SectionLabel>2. Identificação</SectionLabel>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between px-1">
            <label htmlFor="indicator-name" className="font-label-md text-label-md text-on-surface font-medium">
              Nome do Indicador *
            </label>
            <span className="font-label-code text-label-code text-on-surface-variant">Obrigatório</span>
          </div>
          <input
            id="indicator-name"
            type="text"
            className={clsx(inputClass, errors.name && 'focus:ring-error')}
            placeholder="Ex: Meditação, Creatina, Ansiedade"
            value={state.name}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'indicator-name-error' : undefined}
            onChange={(event) => update('name', event.target.value)}
          />
          <FieldError id="indicator-name-error" message={errors.name} />
        </div>

        <div className="grid grid-cols-2 gap-space-sm">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between px-1">
              <label htmlFor="indicator-abbreviation" className="font-label-md text-label-md text-on-surface font-medium">
                Sigla
              </label>
              <span className="font-label-code text-label-code text-primary">Modo Siglas</span>
            </div>
            <input
              id="indicator-abbreviation"
              type="text"
              maxLength={8}
              className={clsx(
                inputClass,
                'font-stat-display text-center uppercase tracking-widest text-body-lg',
                errors.abbreviation && 'focus:ring-error'
              )}
              placeholder="EX: DIS"
              value={state.abbreviation}
              aria-invalid={Boolean(errors.abbreviation)}
              aria-describedby={errors.abbreviation ? 'indicator-abbreviation-error' : undefined}
              onChange={(event) => update('abbreviation', event.target.value)}
            />
            <FieldError id="indicator-abbreviation-error" message={errors.abbreviation} />
            <span className="font-label-code text-[10px] text-on-surface-variant px-1 leading-tight">
              Usa as 3 primeiras letras do nome se vazia.
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between px-1">
              <label htmlFor="indicator-emoji" className="font-label-md text-label-md text-on-surface font-medium">
                Ícone / Emoji
              </label>
              <span className="font-label-code text-label-code text-on-surface-variant">Opcional</span>
            </div>
            <input
              id="indicator-emoji"
              type="text"
              className={clsx(inputClass, 'text-center text-body-lg', errors.emoji && 'focus:ring-error')}
              placeholder="⚡"
              value={state.emoji}
              aria-invalid={Boolean(errors.emoji)}
              aria-describedby={errors.emoji ? 'indicator-emoji-error' : undefined}
              onChange={(event) => update('emoji', event.target.value)}
            />
            <FieldError id="indicator-emoji-error" message={errors.emoji} />
            <div className="flex flex-wrap gap-1 px-1" aria-label="Emojis sugeridos">
              {EMOJI_SUGGESTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  aria-label={`Usar emoji ${emoji}`}
                  aria-pressed={state.emoji === emoji}
                  onClick={() => update('emoji', state.emoji === emoji ? '' : emoji)}
                  className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center text-[18px] transition-all',
                    state.emoji === emoji
                      ? 'bg-primary-fixed text-primary shadow-sm scale-105'
                      : 'hover:bg-surface-container'
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Tipo de resposta */}
      <section className="flex flex-col gap-2" aria-labelledby="indicator-type-label">
        <SectionLabel hint="Imutável após o 1º registro">3. Tipo de resposta</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'boolean' as const, label: 'Booleano', description: 'Sim / Não (ex: treinou?)', icon: 'toggle_on' as const, tone: 'text-secondary' },
            { value: 'scale' as const, label: 'Escala', description: '0 a 10, percepção', icon: 'linear_scale' as const, tone: 'text-primary' },
            { value: 'numeric' as const, label: 'Número + Unidade', description: 'mg, horas, bpm, ml', icon: 'speed' as const, tone: 'text-tertiary' },
            { value: 'ordinal' as const, label: 'Opções Ordenadas', description: 'Ruim → Excelente', icon: 'segment' as const, tone: 'text-on-surface-variant' }
          ].map((option) => {
            const active = state.valueType === option.value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={frozen}
                aria-pressed={active}
                onClick={() => selectValueType(option.value)}
                className={clsx(
                  'p-3 rounded-lg text-left flex flex-col gap-1 transition-all active:scale-[0.98] disabled:cursor-not-allowed',
                  active
                    ? 'bg-primary-fixed/40 shadow-sm'
                    : 'bg-surface-container-low disabled:opacity-50',
                  frozen && !active && 'opacity-60'
                )}
              >
                <span className="flex items-center justify-between w-full">
                  <MaterialIcon name={option.icon} size={20} className={option.tone} />
                  {active && (
                    <span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <MaterialIcon name="check" size={12} className="text-on-primary" />
                    </span>
                  )}
                </span>
                <span className={clsx('font-label-lg text-label-lg', active ? 'text-primary font-bold' : 'text-on-surface')}>
                  {option.label}
                </span>
                <span className="font-body-sm text-[11px] text-on-surface-variant">{option.description}</span>
              </button>
            );
          })}
        </div>

        {state.valueType === 'scale' && (
          <div className="p-3 bg-surface-container-low rounded-lg flex flex-col gap-2">
            <span className="font-label-md text-label-md text-on-surface font-semibold">
              Configuração da escala
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="scale-min" className="font-label-md text-label-md text-on-surface-variant text-center">
                  Mínimo
                </label>
                <input
                  id="scale-min"
                  type="text"
                  inputMode="decimal"
                  className={clsx(smallInputClass, errors.scaleMin && 'focus:ring-error')}
                  value={state.scaleMin}
                  aria-invalid={Boolean(errors.scaleMin)}
                  disabled={frozen}
                  onChange={(event) => update('scaleMin', event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="scale-max" className="font-label-md text-label-md text-on-surface-variant text-center">
                  Máximo
                </label>
                <input
                  id="scale-max"
                  type="text"
                  inputMode="decimal"
                  className={clsx(smallInputClass, errors.scaleMax && 'focus:ring-error')}
                  value={state.scaleMax}
                  aria-invalid={Boolean(errors.scaleMax)}
                  disabled={frozen}
                  onChange={(event) => update('scaleMax', event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="scale-step" className="font-label-md text-label-md text-on-surface-variant text-center">
                  Passo
                </label>
                <input
                  id="scale-step"
                  type="text"
                  inputMode="decimal"
                  className={clsx(smallInputClass, errors.scaleStep && 'focus:ring-error')}
                  value={state.scaleStep}
                  aria-invalid={Boolean(errors.scaleStep)}
                  disabled={frozen}
                  onChange={(event) => update('scaleStep', event.target.value)}
                />
              </div>
            </div>
            <FieldError id="scale-error" message={errors.scaleMin ?? errors.scaleMax ?? errors.scaleStep} />
          </div>
        )}

        {state.valueType === 'numeric' && (
          <div className="p-3 bg-surface-container-low rounded-lg flex flex-col gap-2">
            <label htmlFor="indicator-unit" className="font-label-md text-label-md text-on-surface font-semibold">
              Unidade de medida
            </label>
            <div className="flex flex-wrap gap-1.5" aria-label="Unidades sugeridas">
              {UNIT_SUGGESTIONS.map((unit) => (
                <button
                  key={unit.value || 'none'}
                  type="button"
                  disabled={frozen}
                  aria-pressed={state.unit === unit.value}
                  onClick={() => update('unit', unit.value)}
                  className={clsx(
                    'px-3 min-h-[36px] rounded-full font-label-md text-label-md transition-all disabled:opacity-50',
                    state.unit === unit.value
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-surface-container-lowest text-on-surface-variant'
                  )}
                >
                  {unit.label}
                </button>
              ))}
            </div>
            <input
              id="indicator-unit"
              type="text"
              maxLength={24}
              className={clsx(inputClass, errors.unit && 'focus:ring-error')}
              placeholder="Ou digite uma unidade personalizada"
              value={state.unit}
              aria-invalid={Boolean(errors.unit)}
              aria-describedby={errors.unit ? 'indicator-unit-error' : undefined}
              disabled={frozen}
              onChange={(event) => update('unit', event.target.value)}
            />
            <FieldError id="indicator-unit-error" message={errors.unit} />
            <span className="grid grid-cols-3 gap-2">
              <label className="flex flex-col gap-1">
                <span className="font-label-md text-label-md text-on-surface-variant text-center">Mínimo</span>
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label="Mínimo permitido"
                  className={clsx(smallInputClass, errors.numericMin && 'focus:ring-error')}
                  placeholder="opcional"
                  value={state.numericMin}
                  disabled={frozen}
                  onChange={(event) => update('numericMin', event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-label-md text-label-md text-on-surface-variant text-center">Máximo</span>
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label="Máximo permitido"
                  className={clsx(smallInputClass, errors.numericMax && 'focus:ring-error')}
                  placeholder="opcional"
                  value={state.numericMax}
                  disabled={frozen}
                  onChange={(event) => update('numericMax', event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-label-md text-label-md text-on-surface-variant text-center">Passo</span>
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label="Passo de variação"
                  className={clsx(smallInputClass, errors.numericStep && 'focus:ring-error')}
                  value={state.numericStep}
                  disabled={frozen}
                  onChange={(event) => update('numericStep', event.target.value)}
                />
              </label>
            </span>
            <FieldError id="numeric-error" message={errors.numericMin ?? errors.numericMax ?? errors.numericStep} />
          </div>
        )}

        {state.valueType === 'ordinal' && (
          <div className="p-3 bg-surface-container-low rounded-lg flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-on-surface font-semibold">Opções ordenadas</span>
              <span className="font-label-code text-label-code text-on-surface-variant">
                {optionCount}/{MAX_OPTIONS}
              </span>
            </div>
            <ol className="flex flex-col gap-1.5">
              {state.optionDrafts.map((draft, index) => (
                <li key={draft.id} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-surface-container text-on-surface font-label-code text-label-code flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    aria-label={`Opção ${index + 1}`}
                    className={clsx(smallInputClass, 'text-left px-4')}
                    placeholder="Ex.: Ruim"
                    value={draft.label}
                    disabled={frozen}
                    onChange={(event) =>
                      update(
                        'optionDrafts',
                        state.optionDrafts.map((item) =>
                          item.id === draft.id ? { ...item, label: event.target.value } : item
                        )
                      )
                    }
                  />
                  <button
                    type="button"
                    aria-label={`Remover opção ${index + 1}`}
                    disabled={frozen || optionCount <= MIN_OPTIONS}
                    onClick={() => update('optionDrafts', state.optionDrafts.filter((item) => item.id !== draft.id))}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <MaterialIcon name="close" size={18} />
                  </button>
                </li>
              ))}
            </ol>
            <button
              type="button"
              disabled={frozen || optionCount >= MAX_OPTIONS}
              onClick={() =>
                update('optionDrafts', [
                  ...state.optionDrafts,
                  { id: `draft-${Date.now()}-${optionCount}`, label: '' }
                ])
              }
              className="w-full min-h-[44px] rounded-full bg-surface-container-lowest text-on-surface font-label-lg text-label-lg flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MaterialIcon name="add" size={18} />
              Adicionar opção
            </button>
            <FieldError id="options-error" message={errors.optionDrafts} />
            <span className="font-body-sm text-[11px] text-on-surface-variant px-1">
              De {MIN_OPTIONS} a {MAX_OPTIONS} opções, sempre na ordem em que aparecerão.
            </span>
          </div>
        )}
      </section>

      {/* 4. Frequência e agregação */}
      <section className="p-3.5 bg-surface-container-low rounded-lg flex flex-col gap-3" aria-labelledby="frequency-label">
        <div className="flex flex-col">
          <span id="frequency-label" className="font-label-md text-label-md text-on-surface font-semibold">
            Frequência diária
          </span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            Quantas vezes você avalia no dia?
          </span>
        </div>
        <SegmentedControl
          ariaLabel="Frequência diária"
          value={state.frequency}
          disabled={frozen}
          onChange={selectFrequency}
          options={[
            { value: 'single_per_day', label: '1x ao dia', caption: 'Único' },
            { value: 'multiple_per_day', label: 'Múltiplos', caption: 'registros' }
          ]}
        />
        {state.frequency === 'multiple_per_day' && (
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface font-medium">
                <MaterialIcon name="functions" size={18} className="text-secondary" />
                Agregação p/ correlações:
              </span>
              <span className="font-label-code text-label-code text-on-surface-variant uppercase tracking-wider">
                Imutável após o 1º registro
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Agregação diária">
              {allowedAggregations.map((aggregation) => {
                const active = state.dailyAggregation === aggregation;
                const suggested = suggestedDailyAggregation(state.group, state.valueType) === aggregation;
                return (
                  <button
                    key={aggregation}
                    type="button"
                    disabled={frozen}
                    aria-pressed={active}
                    onClick={() => update('dailyAggregation', aggregation)}
                    className={clsx(
                      'px-3 min-h-[44px] rounded-full font-label-md text-label-md transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                      active ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-lowest text-on-surface-variant'
                    )}
                  >
                    {DAILY_AGGREGATION_LABELS[aggregation]}
                    {suggested && (
                      <span className="ml-1 font-label-code text-[10px] uppercase tracking-wider opacity-80">
                        sugerida
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {state.dailyAggregation && (
              <span className="font-body-sm text-[11px] text-on-surface-variant px-1">
                {DAILY_AGGREGATION_EXAMPLES[state.dailyAggregation]}
              </span>
            )}
            <FieldError id="aggregation-error" message={errors.dailyAggregation} />
          </div>
        )}
      </section>

      {/* 5. Direção desejável (apenas Resultados) */}
      {state.group === 'result' && (
        <section className="flex flex-col gap-2" aria-labelledby="direction-label">
          <SectionLabel hint="Otimização">5. Direção desejável</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'higher' as const, label: 'Maior é melhor', caption: 'Energia, humor, foco', icon: 'trending_up' as const, tone: 'bg-tertiary-fixed text-on-tertiary-fixed' },
              { value: 'lower' as const, label: 'Menor é melhor', caption: 'Fadiga, dor, ansiedade', icon: 'trending_down' as const, tone: 'bg-surface-container text-on-surface-variant' },
              { value: 'neutral' as const, label: 'Sem preferência', caption: 'Neutro / exploratório', icon: 'horizontal_rule' as const, tone: 'bg-surface-container text-on-surface-variant' },
              {
                value: 'target_range' as const,
                label: 'Faixa ideal',
                caption: rangeEditable ? 'Ex: 7 a 9 pontos' : 'Só escala ou número',
                icon: 'tune' as const,
                tone: 'bg-surface-container text-on-surface-variant'
              }
            ].map((option) => {
              const active = state.desiredDirection === option.value;
              const disabled = option.value === 'target_range' && !rangeEditable;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  disabled={disabled}
                  onClick={() => update('desiredDirection', option.value)}
                  className={clsx(
                    'p-3 rounded-lg text-left flex items-start gap-2.5 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed',
                    active ? 'bg-tertiary/10' : 'bg-surface-container-low'
                  )}
                >
                  <span className={clsx('w-7 h-7 rounded-full flex items-center justify-center shrink-0', active && option.value === 'higher' ? 'bg-tertiary-fixed text-on-tertiary-fixed' : option.tone)}>
                    <MaterialIcon name={option.icon} size={18} />
                  </span>
                  <span className="flex flex-col">
                    <span className={clsx('font-label-md text-label-md', active ? 'text-tertiary font-bold' : 'text-on-surface font-medium')}>
                      {option.label}
                    </span>
                    <span className="font-label-code text-[10px] text-on-surface-variant leading-tight">
                      {option.caption}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {state.desiredDirection === 'target_range' && rangeEditable && (
            <div className="p-3 bg-surface-container-low rounded-lg flex flex-col gap-2">
              <span className="font-label-md text-label-md text-on-surface font-semibold">Faixa ideal</span>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="font-label-md text-label-md text-on-surface-variant text-center">Mínimo ideal</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className={clsx(smallInputClass, errors.idealMin && 'focus:ring-error')}
                    value={state.idealMin}
                    aria-invalid={Boolean(errors.idealMin)}
                    onChange={(event) => update('idealMin', event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-label-md text-label-md text-on-surface-variant text-center">Máximo ideal</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className={clsx(smallInputClass, errors.idealMax && 'focus:ring-error')}
                    value={state.idealMax}
                    aria-invalid={Boolean(errors.idealMax)}
                    onChange={(event) => update('idealMax', event.target.value)}
                  />
                </label>
              </div>
              <FieldError id="ideal-error" message={errors.idealMin ?? errors.idealMax ?? errors.desiredDirection} />
            </div>
          )}
        </section>
      )}

      {/* 6. Aviso de integridade metodológica */}
      <aside className="p-3 bg-surface-container-high/60 rounded-lg flex items-start gap-2.5">
        <span className="w-7 h-7 rounded-full bg-surface-container-lowest text-primary flex items-center justify-center shrink-0 shadow-xs">
          <MaterialIcon name="verified_user" size={18} />
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="font-label-md text-label-md text-on-surface font-semibold">
            Trava de integridade científica
          </span>
          <p className="font-body-sm text-[11px] text-on-surface-variant leading-relaxed">
            Tipo de resposta, unidade e agregação tornam-se <strong>definitivos após o primeiro
            registro</strong> para preservar o rigor da análise. Nome, sigla, ordem e direção podem ser
            atualizados a qualquer momento.
          </p>
        </div>
      </aside>

      {serverError && (
        <p role="alert" className="rounded-2xl bg-error-container text-on-error-container px-space-md py-space-sm font-body-sm text-body-sm">
          {serverError}
        </p>
      )}

      {/* 7. Ações */}
      <div className="flex flex-col gap-2 pt-2 pb-6">
        <button
          type="submit"
          disabled={pending}
          className="w-full min-h-[48px] rounded-full bg-primary text-on-primary font-label-lg text-label-lg shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <MaterialIcon name={pending ? 'hourglass_top' : 'add_circle'} size={20} />
          {pending ? 'Salvando…' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full min-h-[44px] rounded-full bg-surface-container text-on-surface-variant font-label-lg text-label-lg hover:text-on-surface active:scale-[0.98] transition-all flex items-center justify-center"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
};

export default IndicatorForm;
