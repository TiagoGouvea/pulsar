/**
 * Acceptance tests for F-2.08 (Preenchimento rápido). Written before the implementation.
 *
 * Component contract under test (src/entry/QuickEntry.tsx):
 *  - `<QuickEntry uid indicators entries onDone />` renders the ACTIVE indicators
 *    (anything with `archivedAt != null` is filtered out) split into the "Fatores" and
 *    "Resultados" sections, preserving the order of the `indicators` array (spec 5.1).
 *  - Each indicator card exposes `data-testid={`quick-entry-card-${id}`}`; the sections
 *    expose `data-testid="quick-entry-factors"` / `"quick-entry-results"`; per-day events of
 *    multiple-per-day indicators render inside the card with `data-testid="entry-event"`.
 *  - No field is required: any subset of answers can be saved (spec 5.1, AC-09).
 *  - Boolean: "Sim"/"Não" chips (aria-pressed) + a "Limpar" control while answered; clearing
 *    a single-per-day answer DELETES today's record (absence, never a Não/0) (spec 5.2).
 *  - Scale: pill bar (Slider); ordinal: option chips; numeric: NumberInput with inputmode
 *    "decimal" that accepts the pt-BR comma separator (spec 7.2, AC-09).
 *  - Saving goes through `saveEntry` (src/data/entries); clearing through `deleteEntry`;
 *    the optional note field travels with the saved entry (spec 5.3).
 *  - `data-testid="save-feedback"` mirrors the last save: "Salvando…/pendente" while the
 *    write is in flight, "Salvo/Sincronizado" only after it persists, never success before
 *    that; failures surface as role="alert" (spec 5.4, AC-05).
 *  - No "faltando responder"/completeness alert is ever rendered (spec 5.4).
 *  - "Voltar ao Dashboard" returns with a single touch (spec 5.1.6).
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Timestamp } from 'firebase/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteEntry, saveEntry } from '../../data/entries';
import type { StoredIndicator } from '../../data/indicators';
import type { Entry, EntryValue } from '../../domain/entry';
import { PrivacyProvider } from '../../privacy/PrivacyContext';
import { QuickEntry } from '../QuickEntry';

vi.mock('../../data/entries', () => ({ saveEntry: vi.fn(), deleteEntry: vi.fn() }));

const saveEntryMock = vi.mocked(saveEntry);
const deleteEntryMock = vi.mocked(deleteEntry);

// Fixed, deterministic day: entries are injected through props, so no real clock is needed.
const TODAY = '2026-10-24';
const RECORDED_AT = '2026-10-24T15:00:00.000Z';
const ARCHIVED_AT = { seconds: 1, nanoseconds: 0 } as unknown as Timestamp;

function indicator(overrides: Partial<StoredIndicator> & Pick<StoredIndicator, 'id'>): StoredIndicator {
  return {
    group: 'factor',
    name: 'Indicador',
    abbreviation: null,
    emoji: null,
    valueType: 'boolean',
    numeric: null,
    scale: null,
    options: null,
    desiredDirection: null,
    idealRange: null,
    frequency: 'single_per_day',
    dailyAggregation: null,
    sortOrder: 0,
    archivedAt: null,
    lockedAt: null,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

const exercise = () =>
  indicator({
    id: 'ind_exercise',
    group: 'factor',
    name: 'Exercício',
    abbreviation: 'EXE',
    emoji: '🏃',
    sortOrder: 1000,
  });

const sleep = () =>
  indicator({
    id: 'ind_sleep',
    group: 'factor',
    name: 'Sono',
    abbreviation: 'SON',
    valueType: 'numeric',
    numeric: { unit: 'horas', min: 0, max: 24, step: 0.5 },
    sortOrder: 2000,
  });

const archivedQ10 = () =>
  indicator({
    id: 'ind_q10',
    group: 'factor',
    name: 'Coenzima Q10',
    abbreviation: 'Q10',
    sortOrder: 5000,
    archivedAt: ARCHIVED_AT,
  });

const energy = (frequency: 'single_per_day' | 'multiple_per_day' = 'single_per_day') =>
  indicator({
    id: 'ind_energy',
    group: 'result',
    name: 'Nível de energia',
    abbreviation: 'ENE',
    valueType: 'scale',
    scale: { min: 0, max: 10, step: 1 },
    desiredDirection: 'higher',
    frequency,
    dailyAggregation: frequency === 'multiple_per_day' ? 'mean' : null,
    sortOrder: 1000,
  });

const mood = () =>
  indicator({
    id: 'ind_mood',
    group: 'result',
    name: 'Humor',
    abbreviation: 'HUM',
    valueType: 'ordinal',
    options: [
      { id: 'bad', label: 'Ruim' },
      { id: 'fair', label: 'Regular' },
      { id: 'good', label: 'Bom' },
      { id: 'great', label: 'Excelente' },
    ],
    desiredDirection: 'neutral',
    sortOrder: 2000,
  });

function entryOf(indicatorId: string, value: EntryValue, overrides: Partial<Entry> = {}): Entry {
  return {
    id: `entry-${indicatorId}`,
    indicatorId,
    localDate: TODAY,
    recordedAt: RECORDED_AT,
    valueType: 'boolean',
    value,
    note: null,
    ...overrides,
  };
}

function renderQuickEntry(
  props: {
    uid?: string;
    indicators?: StoredIndicator[];
    entries?: Entry[];
  } = {},
) {
  const onDone = vi.fn();
  render(
    <PrivacyProvider>
      <QuickEntry
        uid={props.uid ?? 'user-1'}
        indicators={props.indicators ?? [exercise()]}
        entries={props.entries ?? []}
        onDone={onDone}
      />
    </PrivacyProvider>,
  );
  return { onDone };
}

describe('F-2.08 QuickEntry (preenchimento rápido)', () => {
  beforeEach(() => {
    saveEntryMock.mockReset();
    deleteEntryMock.mockReset();
  });

  it('renders Fatores and Resultados sections with the active indicators in order', () => {
    renderQuickEntry({
      indicators: [exercise(), sleep(), archivedQ10(), energy(), mood()],
    });

    expect(screen.getByRole('heading', { name: 'Fatores' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Resultados' })).toBeInTheDocument();

    // Archived indicators never appear, and each group keeps the given order.
    expect(screen.getAllByTestId(/^quick-entry-card-/).map((c) => c.getAttribute('data-testid'))).toEqual([
      'quick-entry-card-ind_exercise',
      'quick-entry-card-ind_sleep',
      'quick-entry-card-ind_energy',
      'quick-entry-card-ind_mood',
    ]);

    const factors = within(screen.getByTestId('quick-entry-factors'));
    expect(factors.getByTestId('quick-entry-card-ind_exercise')).toBeInTheDocument();
    expect(factors.getByTestId('quick-entry-card-ind_sleep')).toBeInTheDocument();
    expect(factors.queryByTestId('quick-entry-card-ind_energy')).toBeNull();

    const results = within(screen.getByTestId('quick-entry-results'));
    expect(results.getByTestId('quick-entry-card-ind_energy')).toBeInTheDocument();
    expect(results.getByTestId('quick-entry-card-ind_mood')).toBeInTheDocument();
    expect(results.queryByTestId('quick-entry-card-ind_exercise')).toBeNull();
  });

  it('saves a single factor answer (Sim) without requiring any result', async () => {
    const user = userEvent.setup();
    saveEntryMock.mockResolvedValue('new-entry');
    renderQuickEntry({ indicators: [exercise(), energy()] });

    const card = screen.getByTestId('quick-entry-card-ind_exercise');
    await user.click(within(card).getByRole('button', { name: 'Sim' }));

    expect(saveEntryMock).toHaveBeenCalledTimes(1);
    const [uid, input] = saveEntryMock.mock.calls[0]!;
    expect(uid).toBe('user-1');
    expect(input).toMatchObject({ indicatorId: 'ind_exercise', value: { boolean: true } });

    await waitFor(() =>
      expect(within(card).getByRole('button', { name: 'Sim' })).toHaveAttribute('aria-pressed', 'true'),
    );
    await waitFor(() =>
      expect(screen.getByTestId('save-feedback').textContent ?? '').toMatch(/salvo|sincronizado/i),
    );
  });

  it('saves a single result answer from the scale pills', async () => {
    const user = userEvent.setup();
    saveEntryMock.mockResolvedValue('new-entry');
    renderQuickEntry({ indicators: [exercise(), energy()] });

    const card = screen.getByTestId('quick-entry-card-ind_energy');
    await user.click(within(card).getByRole('radio', { name: '7' }));

    expect(saveEntryMock).toHaveBeenCalledTimes(1);
    expect(saveEntryMock.mock.calls[0]![1]).toMatchObject({
      indicatorId: 'ind_energy',
      value: { number: 7 },
    });
  });

  it('saves an explicit Não as boolean false (distinct from absence)', async () => {
    const user = userEvent.setup();
    saveEntryMock.mockResolvedValue('new-entry');
    renderQuickEntry({ indicators: [exercise()] });

    const card = screen.getByTestId('quick-entry-card-ind_exercise');
    await user.click(within(card).getByRole('button', { name: 'Não' }));

    expect(saveEntryMock).toHaveBeenCalledTimes(1);
    expect(saveEntryMock.mock.calls[0]![1]).toMatchObject({
      indicatorId: 'ind_exercise',
      value: { boolean: false },
    });
  });

  it('answers ordinal indicators with option chips', async () => {
    const user = userEvent.setup();
    saveEntryMock.mockResolvedValue('new-entry');
    renderQuickEntry({ indicators: [mood()] });

    const card = screen.getByTestId('quick-entry-card-ind_mood');
    await user.click(within(card).getByRole('button', { name: 'Bom' }));

    expect(saveEntryMock).toHaveBeenCalledTimes(1);
    expect(saveEntryMock.mock.calls[0]![1]).toMatchObject({
      indicatorId: 'ind_mood',
      value: { optionId: 'good' },
    });
  });

  it('uses the decimal keyboard on numeric fields and accepts a comma separator', async () => {
    const user = userEvent.setup();
    saveEntryMock.mockResolvedValue('new-entry');
    renderQuickEntry({ indicators: [sleep()] });

    const card = screen.getByTestId('quick-entry-card-ind_sleep');
    const input = within(card).getByRole('textbox');
    expect(input).toHaveAttribute('inputmode', 'decimal');

    await user.type(input, '7,5');
    await user.tab();

    expect(saveEntryMock).toHaveBeenCalledTimes(1);
    expect(saveEntryMock.mock.calls[0]![1]).toMatchObject({
      indicatorId: 'ind_sleep',
      value: { number: 7.5 },
    });
  });

  it('clearing a single-per-day answer deletes today record instead of saving Não/0', async () => {
    const user = userEvent.setup();
    deleteEntryMock.mockResolvedValue(undefined);
    renderQuickEntry({
      indicators: [exercise()],
      entries: [entryOf('ind_exercise', { boolean: true })],
    });

    const card = screen.getByTestId('quick-entry-card-ind_exercise');
    expect(within(card).getByRole('button', { name: 'Sim' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(within(card).getByRole('button', { name: /limpar/i }));

    // Absence: the existing record is deleted and nothing is written back.
    expect(deleteEntryMock).toHaveBeenCalledTimes(1);
    expect(deleteEntryMock).toHaveBeenCalledWith('user-1', 'entry-ind_exercise');
    expect(saveEntryMock).not.toHaveBeenCalled();

    await waitFor(() =>
      expect(within(card).getByRole('button', { name: 'Sim' })).toHaveAttribute('aria-pressed', 'false'),
    );
    await waitFor(() => expect(within(card).queryByRole('button', { name: /limpar/i })).toBeNull());
  });

  it('keeps the save pending (never "saved") until the write persists, then confirms', async () => {
    const user = userEvent.setup();
    let resolveWrite!: (id: string) => void;
    saveEntryMock.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveWrite = resolve;
      }),
    );
    renderQuickEntry({ indicators: [exercise()] });

    const card = screen.getByTestId('quick-entry-card-ind_exercise');
    await user.click(within(card).getByRole('button', { name: 'Sim' }));

    // While the write is in flight: pending state, never success (spec 5.4).
    const feedback = screen.getByTestId('save-feedback');
    expect(feedback.textContent ?? '').toMatch(/salvando|pendente/i);
    expect(feedback.textContent ?? '').not.toMatch(/salvo|sincronizado/i);

    resolveWrite('new-entry');
    await waitFor(() => expect(feedback.textContent ?? '').toMatch(/salvo|sincronizado/i));
  });

  it('shows an error (never success) when the write fails', async () => {
    const user = userEvent.setup();
    saveEntryMock.mockRejectedValue(new Error('network down'));
    renderQuickEntry({ indicators: [exercise()] });

    const card = screen.getByTestId('quick-entry-card-ind_exercise');
    await user.click(within(card).getByRole('button', { name: 'Sim' }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert').textContent ?? '').toMatch(/salvar|erro|falha|conex/i);
    expect(screen.getByTestId('save-feedback').textContent ?? '').not.toMatch(/salvo|sincronizado/i);
  });

  it('lists today events of multiple-per-day indicators and appends new ones', async () => {
    const user = userEvent.setup();
    saveEntryMock.mockResolvedValue('new-entry-2');
    renderQuickEntry({
      indicators: [energy('multiple_per_day')],
      entries: [entryOf('ind_energy', { number: 8 }, { valueType: 'scale', id: 'entry-energy-1' })],
    });

    const card = screen.getByTestId('quick-entry-card-ind_energy');
    const events = within(card).getAllByTestId('entry-event');
    expect(events).toHaveLength(1);
    expect(events[0]).toHaveTextContent(/8/);

    // A new answer on a multiple-per-day indicator adds a new event for today.
    await user.click(within(card).getByRole('radio', { name: '9' }));
    expect(saveEntryMock).toHaveBeenCalledTimes(1);
    expect(saveEntryMock.mock.calls[0]![1]).toMatchObject({
      indicatorId: 'ind_energy',
      value: { number: 9 },
    });

    await waitFor(() => expect(within(card).getAllByTestId('entry-event')).toHaveLength(2));
    expect(
      within(card)
        .getAllByTestId('entry-event')
        .some((e) => /9/.test(e.textContent ?? '')),
    ).toBe(true);
  });

  it('never alerts about missing answers; the optional note travels with the entry', async () => {
    const user = userEvent.setup();
    saveEntryMock.mockResolvedValue('new-entry');
    renderQuickEntry({ indicators: [exercise()] });

    // Partially filled day: no completeness alert anywhere (spec 5.4).
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText(/nenhum campo é obrigatório/i)).toBeInTheDocument();
    const remainingText = (document.body.textContent ?? '').replace(/nenhum campo é obrigatório/i, '');
    expect(remainingText).not.toMatch(/faltando|preencha|obrigat/i);

    // The observation is optional and complements the structured value (spec 5.3).
    await user.type(screen.getByLabelText(/observação/i), 'noite fria');

    const card = screen.getByTestId('quick-entry-card-ind_exercise');
    await user.click(within(card).getByRole('button', { name: 'Sim' }));

    expect(saveEntryMock).toHaveBeenCalledTimes(1);
    expect(saveEntryMock.mock.calls[0]![1]).toMatchObject({
      indicatorId: 'ind_exercise',
      value: { boolean: true },
      note: 'noite fria',
    });
  });

  it('returns to the dashboard in one touch', async () => {
    const user = userEvent.setup();
    const { onDone } = renderQuickEntry({ indicators: [exercise()] });

    await user.click(screen.getByRole('button', { name: /voltar ao dashboard/i }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
