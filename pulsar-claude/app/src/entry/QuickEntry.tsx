import { useEffect, useRef, useState } from 'react';
import { deleteEntry, saveEntry } from '../data/entries';
import type { StoredIndicator } from '../data/indicators';
import { Button, Card, Chip, Icon, IndicatorLabel, NumberInput, Slider } from '../design';
import type { Entry, EntryValue } from '../domain/entry';
import { localDate } from '../lib/time';

interface QuickEntryProps {
  uid: string;
  indicators: StoredIndicator[];
  entries: Entry[];
  day?: string;
  onDone: () => void;
}

type Feedback = 'idle' | 'pending' | 'saved' | 'error' | 'conflict';

function valueText(indicator: StoredIndicator, value: EntryValue): string {
  if ('boolean' in value) return value.boolean ? 'Sim' : 'Não';
  if ('number' in value)
    return `${String(value.number).replace('.', ',')}${indicator.numeric?.unit ? ` ${indicator.numeric.unit}` : ''}`;
  return indicator.options?.find((option) => option.id === value.optionId)?.label ?? 'Opção';
}

function latest(entries: Entry[]): Entry | undefined {
  return [...entries].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt) || b.id.localeCompare(a.id))[0];
}

export function QuickEntry({ uid, indicators, entries, day, onDone }: QuickEntryProps) {
  const [currentEntries, setCurrentEntries] = useState(entries);
  const [note, setNote] = useState('');
  const [feedback, setFeedback] = useState<Feedback>('idle');
  const [resetVersion, setResetVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [draftNumbers, setDraftNumbers] = useState<Record<string, number | null>>({});
  const draftNumbersRef = useRef(draftNumbers);

  useEffect(() => setCurrentEntries(entries), [entries]);

  async function persist(indicator: StoredIndicator, value: EntryValue | null) {
    if (busyRef.current) return;
    const existing = currentEntries.filter((entry) => entry.indicatorId === indicator.id);
    if (value === null && (indicator.frequency !== 'single_per_day' || existing.length === 0)) return;
    busyRef.current = true;
    setBusy(true);
    setFeedback('pending');
    try {
      if (day && day !== localDate()) throw new Error('The local day changed.');
      if (value === null) {
        // Delete only the records the user saw, never unseen records from another device.
        for (const entry of existing) await deleteEntry(uid, entry.id);
        setCurrentEntries((current) =>
          current.filter((entry) => !existing.some((old) => old.id === entry.id)),
        );
      } else {
        const savedNote = note.trim();
        const id = await saveEntry(uid, {
          indicatorId: indicator.id,
          value,
          ...(indicator.frequency === 'single_per_day'
            ? { observedEntryIds: existing.map((entry) => entry.id) }
            : {}),
          ...(savedNote ? { note: savedNote } : {}),
        });
        const now = new Date();
        const added: Entry = {
          id,
          indicatorId: indicator.id,
          localDate: localDate(now),
          recordedAt: now.toISOString(),
          valueType: indicator.valueType,
          value,
          note: savedNote || null,
        };
        setCurrentEntries((current) => [
          ...current.filter(
            (entry) =>
              entry.id !== id &&
              (indicator.frequency !== 'single_per_day' || !existing.some((old) => old.id === entry.id)),
          ),
          added,
        ]);
        if (indicator.frequency === 'multiple_per_day' && indicator.valueType === 'numeric') {
          draftNumbersRef.current = { ...draftNumbersRef.current, [indicator.id]: null };
          setDraftNumbers(draftNumbersRef.current);
        }
      }
      setFeedback('saved');
    } catch (error) {
      setResetVersion((version) => version + 1);
      setFeedback(error instanceof Error && error.name === 'EntryConflictError' ? 'conflict' : 'error');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function renderCard(indicator: StoredIndicator) {
    const todayEntries = currentEntries.filter((entry) => entry.indicatorId === indicator.id);
    const multiple = indicator.frequency === 'multiple_per_day';
    const current = multiple ? undefined : latest(todayEntries);
    const selected = current?.value;
    const number = selected && 'number' in selected ? selected.number : null;
    const setNumber = (value: number | null) => {
      if (multiple) {
        draftNumbersRef.current = { ...draftNumbersRef.current, [indicator.id]: value };
        setDraftNumbers(draftNumbersRef.current);
      } else if (value === null ? Boolean(current) : value !== number) {
        void persist(indicator, value === null ? null : { number: value });
      }
    };
    return (
      <Card key={indicator.id} data-testid={`quick-entry-card-${indicator.id}`}>
        <div className="flex items-center justify-between gap-2">
          <IndicatorLabel indicator={indicator} variant="badge" group={indicator.group} />
          {current && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void persist(indicator, null)}
              className="min-h-11 rounded-full px-3 font-label-md text-label-md text-on-surface-variant"
            >
              Limpar
            </button>
          )}
        </div>
        {multiple && todayEntries.length > 0 && (
          <div className="flex flex-wrap gap-2 font-body-sm text-body-sm text-on-surface-variant">
            {todayEntries.map((entry) => (
              <span
                key={entry.id}
                data-testid="entry-event"
                className="rounded-full bg-surface-container-low px-3 py-1"
              >
                {valueText(indicator, entry.value)} ·{' '}
                {new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(
                  new Date(entry.recordedAt),
                )}
              </span>
            ))}
          </div>
        )}
        <fieldset disabled={busy} className="min-w-0 disabled:opacity-60">
          {indicator.valueType === 'boolean' && (
            <div className="grid grid-cols-2 gap-2">
              {[true, false].map((answer) => (
                <Chip
                  key={String(answer)}
                  tone={indicator.group}
                  selected={Boolean(selected && 'boolean' in selected && selected.boolean === answer)}
                  onClick={() =>
                    void persist(
                      indicator,
                      !multiple && selected && 'boolean' in selected && selected.boolean === answer
                        ? null
                        : { boolean: answer },
                    )
                  }
                >
                  {answer ? 'Sim' : 'Não'}
                </Chip>
              ))}
            </div>
          )}
          {indicator.valueType === 'ordinal' && (
            <div className="flex flex-wrap gap-2">
              {indicator.options?.map((option) => (
                <Chip
                  key={option.id}
                  tone={indicator.group}
                  selected={Boolean(selected && 'optionId' in selected && selected.optionId === option.id)}
                  onClick={() =>
                    void persist(
                      indicator,
                      !multiple && selected && 'optionId' in selected && selected.optionId === option.id
                        ? null
                        : { optionId: option.id },
                    )
                  }
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          )}
          {indicator.valueType === 'scale' && indicator.scale && (
            <Slider
              label="Valor da escala"
              tone={indicator.group}
              min={indicator.scale.min}
              max={indicator.scale.max}
              step={indicator.scale.step}
              value={number}
              onChange={(value) => void persist(indicator, { number: value })}
              minLabel={String(indicator.scale.min)}
              maxLabel={String(indicator.scale.max)}
            />
          )}
          {indicator.valueType === 'numeric' && indicator.numeric && (
            <div className="flex flex-col gap-2">
              <NumberInput
                key={resetVersion}
                label="Valor numérico"
                value={multiple ? (draftNumbers[indicator.id] ?? null) : number}
                onChange={setNumber}
                unit={indicator.numeric.unit}
                step={indicator.numeric.step}
                min={indicator.numeric.min ?? undefined}
                max={indicator.numeric.max ?? undefined}
              />
              {multiple && (
                <Button
                  variant="neutral"
                  onClick={() => {
                    const value = draftNumbersRef.current[indicator.id];
                    if (value != null) void persist(indicator, { number: value });
                  }}
                >
                  Adicionar registro
                </Button>
              )}
            </div>
          )}
        </fieldset>
      </Card>
    );
  }

  const active = indicators.filter((indicator) => indicator.archivedAt == null);
  const date = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(),
  );
  return (
    <div className="flex flex-col gap-space-xl pb-10">
      <Card className="gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-label-code text-label-code tracking-wider text-tertiary uppercase">
            Salvamento automático ativo
          </span>
          <span
            data-testid="save-feedback"
            role={feedback === 'error' || feedback === 'conflict' ? 'alert' : 'status'}
            className={`rounded-full bg-surface-container px-2 py-1 font-label-md text-label-md ${feedback === 'error' || feedback === 'conflict' ? 'text-error' : 'text-on-surface-variant'}`}
          >
            {feedback === 'idle'
              ? 'Pronto para registrar'
              : feedback === 'pending'
                ? 'Salvando…'
                : feedback === 'saved'
                  ? 'Salvo'
                  : feedback === 'conflict'
                    ? 'A resposta mudou em outro dispositivo. Confira e tente novamente.'
                    : 'Erro ao salvar. Verifique sua conexão e tente novamente.'}
          </span>
        </div>
        <div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
            Registro de Hoje
          </h1>
          <p className="font-body-md text-body-md text-secondary">{date}</p>
        </div>
        <p className="rounded bg-surface-container-low p-3 font-body-sm text-body-sm text-on-surface-variant">
          {feedback === 'saved'
            ? 'Obrigado por registrar seu dia. Volte quando quiser.'
            : 'Nenhum campo é obrigatório. Responda apenas o que quiser registrar agora em poucos toques.'}
        </p>
      </Card>
      {(['factor', 'result'] as const).map((group) => (
        <section
          key={group}
          data-testid={group === 'factor' ? 'quick-entry-factors' : 'quick-entry-results'}
          className="flex flex-col gap-space-md"
        >
          <div className="flex items-center gap-2 px-1">
            <span
              className={`flex size-7 items-center justify-center rounded-full ${group === 'factor' ? 'bg-secondary-fixed text-secondary' : 'bg-primary-fixed text-primary'}`}
            >
              <Icon name={group === 'factor' ? 'input' : 'insights'} className="text-[18px]" />
            </span>
            <div>
              <h2 className="font-headline-md text-headline-md">
                {group === 'factor' ? 'Fatores' : 'Resultados'}
              </h2>
              <p className="font-label-md text-label-md text-on-surface-variant">
                {group === 'factor' ? 'O que fiz, consumi ou vivi' : 'Como fiquei ou o que percebi/medi'}
              </p>
            </div>
          </div>
          {active.filter((indicator) => indicator.group === group).map(renderCard)}
        </section>
      ))}
      <Card className="gap-2.5">
        <label htmlFor="entry-note" className="font-label-lg text-label-lg">
          Observação do dia{' '}
          <span className="font-body-sm text-body-sm text-on-surface-variant">(opcional)</span>
        </label>
        <textarea
          id="entry-note"
          maxLength={500}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          placeholder="Ex: noite mais fria, reunião intensa pela manhã..."
          className="w-full resize-none rounded bg-surface-container-low p-3 font-body-md text-body-md focus:ring-2 focus:ring-primary focus:outline-none"
        />
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          A observação acompanha os próximos registros e não afeta o cálculo estatístico.
        </p>
      </Card>
      <Button variant="neutral" fullWidth onClick={onDone}>
        Voltar ao Dashboard
      </Button>
    </div>
  );
}
