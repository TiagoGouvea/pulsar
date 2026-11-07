import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { MaterialIcon } from '@components/ui/MaterialIcon';
import { EntryValueInput } from '@components/entries/EntryValueInput';
import { useFirebase } from '@lib/firebase/context';
import { useIndicators } from '@features/indicators/useIndicators';
import type { Indicator } from '@features/indicators/types';
import {
  aggregateDay,
  dailyAggregationLabel,
  formatDailyAggregate,
  formatEntryTime,
  formatLocalDateLabel,
  formatNumberValue,
  formatShortLocalDateLabel,
  noteByteLength,
  privacyEmoji,
  privacyLabel,
  validateEntryValue,
  validateNote,
  MAX_NOTE_BYTES
} from '@features/entries/model';
import {
  draftFromAggregate,
  draftToEntryValue,
  type EntryDraftMap,
  type EntryDraftValue
} from '@features/entries/draft';
import { deleteEntry, saveDailyEntries } from '@features/entries/repository';
import type { Entry, EntryPlan, EntryValue } from '@features/entries/types';
import { useEntries } from '@features/entries/useEntries';
import { useTodayLocalDate } from '@features/entries/useTodayLocalDate';
import { usePrivacyMode } from '@features/privacy/store';

function sortIndicators(list: Indicator[]): Indicator[] {
  return [...list].sort(
    (left, right) =>
      left.sortOrder - right.sortOrder || left.createdAt.localeCompare(right.createdAt)
  );
}

function entryDateLabel(entry: Entry, today: string): string {
  if (entry.localDate === today) return 'Hoje';
  return formatShortLocalDateLabel(entry.localDate);
}

function fallbackEntryValue(value: EntryValue): string {
  if ('boolean' in value) return value.boolean ? 'Sim' : 'Não';
  if ('optionId' in value) return value.optionId;
  return formatNumberValue(value.number);
}

export const RegisterPage: React.FC = () => {
  const { user } = useFirebase();
  const uid = user?.uid;
  const indicators = useIndicators(uid);
  const { entries, loading: entriesLoading, error: entriesError } = useEntries(uid);
  const { isNameRevealed } = usePrivacyMode();
  const today = useTodayLocalDate();

  const [drafts, setDrafts] = useState<EntryDraftMap>({});
  const [note, setNote] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [noteError, setNoteError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [lastConfirmedAt, setLastConfirmedAt] = useState<string | null>(null);

  const activeIndicators = useMemo(
    () => sortIndicators(indicators.filter((indicator) => !indicator.archivedAt)),
    [indicators]
  );
  const factors = useMemo(
    () => activeIndicators.filter((indicator) => indicator.group === 'factor'),
    [activeIndicators]
  );
  const results = useMemo(
    () => activeIndicators.filter((indicator) => indicator.group === 'result'),
    [activeIndicators]
  );
  const indicatorsById = useMemo(
    () => new Map(indicators.map((indicator) => [indicator.id, indicator])),
    [indicators]
  );
  const aggregates = useMemo(() => {
    const map = new Map<string, ReturnType<typeof aggregateDay>>();
    for (const indicator of activeIndicators) {
      map.set(indicator.id, aggregateDay(indicator, entries, today));
    }
    return map;
  }, [activeIndicators, entries, today]);

  const draftCount = Object.keys(drafts).length;
  const noteLength = noteByteLength(note);
  const hasUnsavedChanges = draftCount > 0 || note.trim().length > 0;

  function displayDraft(indicator: Indicator): EntryDraftValue | undefined {
    if (drafts[indicator.id]) return drafts[indicator.id];
    if (indicator.frequency !== 'single_per_day') return undefined;
    const aggregate = aggregates.get(indicator.id);
    return aggregate ? draftFromAggregate(aggregate) : undefined;
  }

  function updateDraft(indicator: Indicator, value: EntryDraftValue | null) {
    setDrafts((current) => {
      const next = { ...current };
      if (value) next[indicator.id] = value;
      else delete next[indicator.id];
      return next;
    });
    setFieldErrors((current) => {
      if (!current[indicator.id]) return current;
      const next = { ...current };
      delete next[indicator.id];
      return next;
    });
    if (actionError) setActionError('');
    if (notice) setNotice('');
  }

  async function save() {
    if (!uid) {
      setActionError('Sua sessão ainda está sendo preparada. Tente novamente em instantes.');
      return;
    }
    if (draftCount === 0) {
      setActionError('Escolha ao menos um indicador para registrar. Nenhum campo é obrigatório.');
      setNotice('');
      return;
    }

    const nextErrors: Record<string, string> = {};
    const plans: EntryPlan[] = [];
    for (const [indicatorId, draft] of Object.entries(drafts)) {
      const indicator = indicatorsById.get(indicatorId);
      if (!indicator) continue;
      const value = draftToEntryValue(draft);
      if (!value) {
        nextErrors[indicatorId] = 'Informe um valor numérico válido.';
        continue;
      }
      const valueError = validateEntryValue(indicator, indicator.valueType, value);
      if (valueError) {
        nextErrors[indicatorId] = valueError;
        continue;
      }
      plans.push({ indicator, value, note: note.trim() });
    }

    const nextNoteError = validateNote(note.trim());
    setFieldErrors(nextErrors);
    setNoteError(nextNoteError ?? '');
    if (Object.keys(nextErrors).length > 0 || nextNoteError || plans.length === 0) {
      setActionError('Revise os valores destacados. Nada foi salvo.');
      setNotice('');
      return;
    }

    setSaving(true);
    setActionError('');
    setNotice('');
    try {
      await saveDailyEntries(uid, plans);
      setDrafts({});
      setNote('');
      setNoteError('');
      setLastConfirmedAt(new Date().toISOString());
      setNotice(
        plans.length === 1
          ? 'Registro salvo e confirmado pelo servidor.'
          : `${plans.length} registros salvos e confirmados pelo servidor.`
      );
    } catch {
      setActionError(
        'Não foi possível confirmar o salvamento. Nada é apresentado como salvo enquanto o servidor não confirmar; tente novamente.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeEntry(entry: Entry) {
    if (!uid || deletingId) return;
    setDeletingId(entry.id);
    setActionError('');
    setNotice('');
    try {
      await deleteEntry(uid, entry.id);
      setNotice('Registro excluído e confirmado pelo servidor.');
    } catch {
      setActionError('Não foi possível excluir o registro agora. Tente novamente.');
    } finally {
      setDeletingId(null);
    }
  }

  function renderCard(indicator: Indicator) {
    const aggregate = aggregates.get(indicator.id) ?? null;
    const indicatorLabel = privacyLabel(indicator, isNameRevealed);
    const emoji = privacyEmoji(indicator, isNameRevealed);
    const aggregation = dailyAggregationLabel(indicator);
    const isFactor = indicator.group === 'factor';
    return (
      <li
        key={indicator.id}
        className="rounded-lg bg-surface-container-lowest p-space-md shadow-sm flex flex-col gap-space-md"
      >
        <div className="flex items-start justify-between gap-space-sm">
          <div className="min-w-0 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              {isNameRevealed && (
                <span
                  className={clsx(
                    'px-2 py-0.5 rounded-md font-label-code text-label-code shrink-0',
                    isFactor
                      ? 'bg-secondary-fixed text-on-secondary-fixed'
                      : 'bg-primary-fixed text-on-primary-fixed'
                  )}
                >
                  {indicator.abbreviation.trim() || indicatorLabel}
                </span>
              )}
              <h3
                className={clsx(
                  'font-label-lg text-label-lg text-on-surface truncate',
                  !isNameRevealed &&
                    'px-2 py-0.5 rounded-md font-label-code text-label-code bg-surface-container-high text-on-surface'
                )}
              >
                {emoji ? `${emoji} ` : ''}
                {indicatorLabel}
              </h3>
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {indicator.frequency === 'multiple_per_day'
                ? 'Vários registros por dia'
                : 'Um registro por dia — o novo valor substitui o de hoje'}
            </span>
          </div>
          <div className="flex flex-col items-end gap-0.5 shrink-0 text-right">
            <span className="font-label-code text-label-code uppercase tracking-wider text-on-surface-variant">
              Hoje
            </span>
            <span
              aria-label={`Valor de hoje de ${indicatorLabel}`}
              className={clsx(
                'font-label-lg text-label-lg font-semibold',
                aggregate ? 'text-on-surface' : 'text-outline'
              )}
            >
              {aggregate ? formatDailyAggregate(indicator, aggregate) : 'Sem registro'}
            </span>
            {aggregate && aggregate.count > 1 && aggregation && (
              <span className="font-label-code text-label-code text-on-surface-variant">
                {aggregate.count} eventos · {aggregation}
              </span>
            )}
          </div>
        </div>

        <EntryValueInput
          indicator={indicator}
          label={indicatorLabel}
          value={displayDraft(indicator)}
          onChange={(value) => updateDraft(indicator, value)}
          disabled={saving}
        />

        {fieldErrors[indicator.id] && (
          <p role="alert" className="rounded-2xl bg-error-container text-on-error-container px-space-md py-space-sm font-body-sm text-body-sm">
            {fieldErrors[indicator.id]}
          </p>
        )}
      </li>
    );
  }

  function renderSection(
    id: string,
    title: string,
    subtitle: string,
    icon: 'input' | 'output',
    list: Indicator[],
    tone: 'factor' | 'result'
  ) {
    if (list.length === 0) return null;
    return (
      <section className="flex flex-col gap-space-md" aria-labelledby={`${id}-heading`}>
        <div className="flex items-center justify-between gap-space-sm px-1">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={clsx(
                'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                tone === 'factor'
                  ? 'bg-secondary-fixed text-secondary'
                  : 'bg-primary-fixed text-primary'
              )}
              aria-hidden="true"
            >
              <MaterialIcon name={icon} size={16} />
            </span>
            <div className="min-w-0">
              <h2 id={`${id}-heading`} className="font-headline-md text-headline-md text-on-surface">
                {title}
              </h2>
              <span className="block font-label-md text-label-md text-on-surface-variant">
                {subtitle}
              </span>
            </div>
          </div>
          <span
            className={clsx(
              'px-2.5 py-1 rounded-full font-label-code text-label-code uppercase tracking-wider shrink-0',
              tone === 'factor'
                ? 'bg-secondary text-on-secondary'
                : 'bg-primary-container text-on-primary'
            )}
          >
            {list.length}
          </span>
        </div>
        <ul className="flex flex-col gap-space-sm">{list.map(renderCard)}</ul>
      </section>
    );
  }

  if (!uid) {
    return (
      <div className="w-full max-w-xl mx-auto px-gutter pt-space-lg pb-10">
        <p role="status" className="font-body-md text-body-md text-on-surface-variant">
          Preparando sua sessão…
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto px-gutter pt-space-sm pb-10 flex flex-col gap-space-lg">
      <div className="flex items-center gap-space-sm pt-2">
        <Link
          to="/dashboard"
          aria-label="Voltar ao Dashboard"
          className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface shrink-0"
        >
          <MaterialIcon name="arrow_back" size={20} />
        </Link>
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-space-xs flex-wrap">
            <span className="w-2 h-2 rounded-full bg-tertiary" aria-hidden="true" />
            <span className="font-label-code text-label-code uppercase tracking-wider text-tertiary">
              Registro diário
            </span>
            <span className="font-label-code text-label-code uppercase tracking-wider text-outline">
              Sem lançamento retroativo
            </span>
          </div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface font-semibold tracking-tight">
            Registro de Hoje
          </h1>
          <p className="font-body-md text-body-md text-secondary font-medium">
            {formatLocalDateLabel(today)}
          </p>
        </div>
      </div>

      <section className="bg-surface-container-lowest p-space-lg rounded-lg shadow-sm flex flex-col gap-space-md">
        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-tertiary" aria-hidden="true" />
            <span className="font-label-code text-label-code uppercase tracking-wider text-tertiary">
              {saving
                ? 'Aguardando confirmação do servidor'
                : hasUnsavedChanges
                  ? 'Alterações ainda não salvas'
                  : lastConfirmedAt
                    ? `Confirmado às ${formatEntryTime(lastConfirmedAt)}`
                    : 'Nenhum envio pendente'}
            </span>
          </div>
          <span className="flex items-center gap-1 text-on-surface-variant font-label-code text-label-code bg-surface-container px-2 py-0.5 rounded-full">
            <MaterialIcon name={entriesLoading ? 'hourglass_top' : 'verified_user'} size={14} className="text-tertiary" />
            <span>{entriesLoading ? 'Carregando' : 'Sem campos obrigatórios'}</span>
          </span>
        </div>
        <div className="bg-surface-container-low p-3 rounded flex items-start gap-2.5">
          <MaterialIcon name="auto_awesome" size={18} className="text-primary shrink-0 mt-0.5" />
          <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
            Registre qualquer subconjunto de indicadores. O que ficar em branco permanece como
            ausência, diferente de zero e de “Não”. Você registra apenas o dia de hoje; registros
            anteriores ficam no histórico e podem ser excluídos.
          </p>
        </div>
        <p className="font-label-code text-label-code uppercase tracking-wider text-on-surface-variant">
          Modo de exibição: {isNameRevealed ? 'nomes e emojis visíveis' : 'siglas, sem emojis'}
        </p>
      </section>

      {entriesError && (
        <p role="alert" className="rounded-2xl bg-error-container text-on-error-container px-space-md py-space-sm font-body-sm text-body-sm">
          {entriesError}
        </p>
      )}
      {actionError && (
        <p role="alert" className="rounded-2xl bg-error-container text-on-error-container px-space-md py-space-sm font-body-sm text-body-sm">
          {actionError}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-2xl bg-tertiary-fixed text-on-tertiary-fixed px-space-md py-space-sm font-body-sm text-body-sm">
          {notice}
        </p>
      )}

      {activeIndicators.length === 0 ? (
        <section className="rounded-2xl bg-surface-container-low p-space-lg flex flex-col gap-space-md text-center">
          <span className="w-12 h-12 rounded-full bg-primary-fixed text-primary flex items-center justify-center mx-auto" aria-hidden="true">
            <MaterialIcon name="edit_note" size={26} />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="font-headline-md text-headline-md text-on-surface">
              Nenhum indicador ativo para registrar
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Crie ou restaure um indicador para preencher o registro de hoje. Indicadores
              arquivados não aparecem aqui.
            </p>
          </div>
          <Link
            to="/indicators/new"
            className="w-full min-h-[48px] rounded-full bg-primary text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-2"
          >
            <MaterialIcon name="add_circle" size={20} />
            <span>Criar indicador</span>
          </Link>
        </section>
      ) : (
        <>
          {renderSection(
            'entry-factors',
            'Fatores',
            'O que fiz, consumi ou vivi',
            'input',
            factors,
            'factor'
          )}
          {renderSection(
            'entry-results',
            'Resultados',
            'Como fiquei ou o que percebi',
            'output',
            results,
            'result'
          )}

          <section className="bg-surface-container-lowest p-space-lg rounded-lg shadow-sm flex flex-col gap-space-sm">
            <div className="flex items-center justify-between gap-space-sm">
              <label htmlFor="daily-note" className="font-label-lg text-label-lg text-on-surface flex items-center gap-2">
                <MaterialIcon name="edit" size={18} className="text-on-surface-variant" />
                <span>Observação do dia</span>
                <span className="text-xs text-on-surface-variant font-normal">(opcional)</span>
              </label>
              <span className="font-label-code text-label-code text-on-surface-variant uppercase tracking-wider">
                Privada
              </span>
            </div>
            <textarea
              id="daily-note"
              rows={3}
              value={note}
              disabled={saving}
              onChange={(event) => {
                setNote(event.target.value);
                if (noteError) setNoteError('');
              }}
              placeholder="Ex.: noite mais fria, reunião intensa pela manhã, tomei chá verde à tarde…"
              className="w-full bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/60 rounded p-3 text-body-md font-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all resize-none disabled:opacity-50"
            />
            <div className="flex items-start justify-between gap-space-sm">
              <p className="font-body-sm text-body-sm text-on-surface-variant flex items-start gap-1.5">
                <MaterialIcon name="info" size={15} className="text-outline shrink-0 mt-0.5" />
                <span>
                  A observação complementa os valores e não é usada no cálculo estatístico da V1.
                  Ela é salva junto dos indicadores respondidos neste envio.
                </span>
              </p>
              <span
                className={clsx(
                  'font-label-code text-label-code shrink-0',
                  noteLength > MAX_NOTE_BYTES ? 'text-error' : 'text-on-surface-variant'
                )}
              >
                {noteLength}/{MAX_NOTE_BYTES}
              </span>
            </div>
            {noteError && (
              <p role="alert" className="rounded-2xl bg-error-container text-on-error-container px-space-md py-space-sm font-body-sm text-body-sm">
                {noteError}
              </p>
            )}
          </section>

          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="w-full min-h-[52px] rounded-full bg-primary-container text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            <MaterialIcon name={saving ? 'hourglass_top' : 'check_circle'} size={20} />
            <span>{saving ? 'Aguardando confirmação do servidor…' : 'Salvar registro'}</span>
          </button>

          <section className="flex flex-col gap-space-sm" aria-labelledby="entry-history-heading">
            <div className="flex items-center justify-between gap-space-sm px-1">
              <h2
                id="entry-history-heading"
                className="font-label-code text-label-code uppercase tracking-wider text-on-surface-variant"
              >
                Histórico de registros
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-surface-container-high font-label-code text-label-code text-primary font-semibold">
                {entries.length}
              </span>
            </div>
            {entries.length === 0 ? (
              <p className="rounded-2xl bg-surface-container-low px-space-md py-space-sm font-body-sm text-body-sm text-on-surface-variant">
                Nenhum registro ainda. O primeiro registro de hoje aparecerá aqui.
              </p>
            ) : (
              <ul className="flex flex-col gap-space-sm">
                {entries.map((entry) => {
                  const indicator = indicatorsById.get(entry.indicatorId);
                  const label = indicator
                    ? privacyLabel(indicator, isNameRevealed)
                    : entry.indicatorId;
                  const dateLabel = entryDateLabel(entry, today);
                  const valueLabel = indicator
                    ? formatDailyAggregate(indicator, {
                        indicatorId: indicator.id,
                        localDate: entry.localDate,
                        valueType: entry.valueType,
                        value: entry.value,
                        count: 1
                      })
                    : fallbackEntryValue(entry.value);
                  const busy = deletingId === entry.id;
                  return (
                    <li
                      key={entry.id}
                      className="rounded-2xl bg-surface-container-lowest p-space-md shadow-sm flex flex-col gap-space-sm"
                    >
                      <div className="flex items-start justify-between gap-space-sm">
                        <div className="min-w-0 flex flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full bg-surface-container font-label-code text-label-code text-on-surface-variant uppercase tracking-wider">
                              {dateLabel}
                            </span>
                            <span className="font-label-code text-label-code text-outline">
                              {formatEntryTime(entry.recordedAt)}
                            </span>
                            <h3 className="font-label-lg text-label-lg text-on-surface truncate">
                              {label}
                            </h3>
                          </div>
                          <span className="font-headline-md text-headline-md text-on-surface">
                            {valueLabel}
                          </span>
                        </div>
                        <button
                          type="button"
                          aria-label={`Excluir registro de ${label} de ${dateLabel}`}
                          disabled={busy || deletingId !== null}
                          onClick={() => void removeEntry(entry)}
                          className="min-h-[40px] px-3 rounded-full bg-error-container text-on-error-container font-label-md text-label-md flex items-center gap-1 shrink-0 active:scale-95 disabled:opacity-60"
                        >
                          <MaterialIcon name={busy ? 'hourglass_top' : 'delete'} size={16} />
                          <span>{busy ? 'Excluindo…' : 'Excluir'}</span>
                        </button>
                      </div>
                      {entry.note && (
                        <p className="rounded-2xl bg-surface-container-low px-space-md py-space-sm font-body-sm text-body-sm text-on-surface-variant break-words">
                          <span className="font-semibold text-on-surface">Observação: </span>
                          {entry.note}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <Link
            to="/dashboard"
            className="w-full min-h-[48px] rounded-full bg-surface-container text-on-surface font-label-md text-label-md flex items-center justify-center gap-2"
          >
            <MaterialIcon name="arrow_back" size={18} />
            <span>Voltar ao Dashboard</span>
          </Link>
        </>
      )}
    </div>
  );
};

export default RegisterPage;
