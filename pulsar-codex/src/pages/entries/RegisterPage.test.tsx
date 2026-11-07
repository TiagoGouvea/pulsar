import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Indicator } from '@features/indicators/types';
import type { Entry } from '@features/entries/types';
import { formatLocalDate } from '@features/entries/model';
import { usePrivacyStore } from '@features/privacy/store';
import RegisterPage from './RegisterPage';

const mocks = vi.hoisted(() => ({
  useIndicators: vi.fn(),
  useEntries: vi.fn(),
  saveDailyEntries: vi.fn(),
  deleteEntry: vi.fn()
}));

vi.mock('@lib/firebase/context', () => ({
  useFirebase: () => ({
    user: { uid: 'anon-register' },
    anonymous: true,
    isLoading: false
  })
}));

vi.mock('@features/indicators/useIndicators', () => ({
  useIndicators: mocks.useIndicators
}));

vi.mock('@features/entries/useEntries', () => ({
  useEntries: mocks.useEntries
}));

vi.mock('@features/entries/repository', () => ({
  saveDailyEntries: mocks.saveDailyEntries,
  deleteEntry: mocks.deleteEntry
}));

const today = formatLocalDate();

function indicator(overrides: Partial<Indicator> & { id: string; name: string }): Indicator {
  return {
    group: 'factor',
    abbreviation: overrides.id.toUpperCase(),
    emoji: '',
    valueType: 'boolean',
    frequency: 'single_per_day',
    sortOrder: 10,
    firstEntryAt: null,
    archivedAt: null,
    createdAt: '2026-10-24T10:00:00.000Z',
    updatedAt: '2026-10-24T10:00:00.000Z',
    ...overrides
  };
}

const indicators: Indicator[] = [
  indicator({
    id: 'exe',
    name: 'Exercício Físico',
    abbreviation: 'EXE',
    emoji: '🏋️',
    sortOrder: 10
  }),
  indicator({
    id: 'caf',
    name: 'Café',
    abbreviation: 'CAF',
    emoji: '☕',
    valueType: 'numeric',
    numeric: { unit: 'xícaras', min: 0, max: null, step: 1 },
    frequency: 'multiple_per_day',
    dailyAggregation: 'sum',
    sortOrder: 20
  }),
  indicator({
    id: 'ene',
    name: 'Nível de Energia',
    abbreviation: 'ENE',
    emoji: '⚡',
    group: 'result',
    valueType: 'scale',
    scale: { min: 0, max: 10, step: 1 },
    desiredDirection: 'higher',
    sortOrder: 30
  }),
  indicator({
    id: 'hum',
    name: 'Humor',
    abbreviation: 'HUM',
    group: 'result',
    valueType: 'ordinal',
    options: [
      { id: 'low', label: 'Baixo', order: 0 },
      { id: 'high', label: 'Alto', order: 1 }
    ],
    sortOrder: 40
  })
];

function entry(overrides: Partial<Entry> & { id: string; indicatorId: string }): Entry {
  return {
    localDate: today,
    recordedAt: new Date().toISOString(),
    valueType: 'boolean',
    value: { boolean: true },
    note: '',
    ...overrides
  };
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/registrar']}>
      <Routes>
        <Route path="/registrar" element={<RegisterPage />} />
        <Route path="/dashboard" element={<div>dashboard</div>} />
        <Route path="/indicators/new" element={<div>novo indicador</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  usePrivacyStore.setState({ isNameRevealed: false });
  mocks.useIndicators.mockReturnValue(indicators);
  mocks.useEntries.mockReturnValue({ entries: [], loading: false, error: '' });
  mocks.saveDailyEntries.mockResolvedValue({
    localDate: today,
    count: 1,
    singleIndicatorIds: ['exe']
  });
  mocks.deleteEntry.mockResolvedValue(undefined);
});

describe('daily register', () => {
  it('starts in abbreviations, hides emojis and reveals names only after the global toggle', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'EXE' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'CAF' })).toBeInTheDocument();
    expect(screen.queryByText('Exercício Físico')).not.toBeInTheDocument();
    expect(screen.queryByText(/🏋️/)).not.toBeInTheDocument();

    act(() => usePrivacyStore.getState().toggleNames());

    expect(screen.getByRole('heading', { name: /🏋️ Exercício Físico/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /☕ Café/ })).toBeInTheDocument();
  });

  it('saves any subset with an optional observation and only reports success after confirmation', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Não' }));
    fireEvent.change(screen.getByLabelText('Resposta de CAF (valor numérico)'), {
      target: { value: '0' }
    });
    fireEvent.change(screen.getByLabelText(/Observação do dia/i), {
      target: { value: '  sem treino e sem café  ' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar registro' }));

    await waitFor(() => expect(mocks.saveDailyEntries).toHaveBeenCalledTimes(1));
    const [uid, plans] = mocks.saveDailyEntries.mock.calls[0];
    expect(uid).toBe('anon-register');
    expect(plans).toHaveLength(2);
    expect(plans[0]).toMatchObject({
      indicator: expect.objectContaining({ id: 'exe' }),
      value: { boolean: false },
      note: 'sem treino e sem café'
    });
    expect(plans[1]).toMatchObject({
      indicator: expect.objectContaining({ id: 'caf' }),
      value: { number: 0 },
      note: 'sem treino e sem café'
    });
    expect(await screen.findByRole('status')).toHaveTextContent(/2 registros salvos e confirmados/i);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('never presents a save failure as success', async () => {
    mocks.saveDailyEntries.mockRejectedValue(new Error('offline'));
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Sim' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar registro' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível confirmar/i);
    expect(screen.queryByText(/salvo e confirmado/i)).not.toBeInTheDocument();
  });

  it('keeps absence, zero and No as distinct displayed states', () => {
    mocks.useEntries.mockReturnValue({
      entries: [
        entry({ id: 'exe-today', indicatorId: 'exe', value: { boolean: false } }),
        entry({
          id: 'caf-today',
          indicatorId: 'caf',
          valueType: 'numeric',
          value: { number: 0 }
        }),
        entry({
          id: 'ene-today',
          indicatorId: 'ene',
          valueType: 'scale',
          value: { number: 7 }
        })
      ],
      loading: false,
      error: ''
    });
    renderPage();

    expect(screen.getByLabelText('Valor de hoje de EXE')).toHaveTextContent('Não');
    expect(screen.getByLabelText('Valor de hoje de CAF')).toHaveTextContent('0 xícaras');
    expect(screen.getByLabelText('Valor de hoje de ENE')).toHaveTextContent('7/10');
    expect(screen.getAllByText('Sem registro')).toHaveLength(1);
  });

  it('applies the chosen aggregation to multiple events in the day', () => {
    mocks.useEntries.mockReturnValue({
      entries: [
        entry({
          id: 'caf-1',
          indicatorId: 'caf',
          valueType: 'numeric',
          value: { number: 2 },
          recordedAt: '2026-10-24T09:00:00.000Z'
        }),
        entry({
          id: 'caf-2',
          indicatorId: 'caf',
          valueType: 'numeric',
          value: { number: 3 },
          recordedAt: '2026-10-24T11:00:00.000Z'
        })
      ],
      loading: false,
      error: ''
    });
    renderPage();

    expect(screen.getByLabelText('Valor de hoje de CAF')).toHaveTextContent('5 xícaras');
    expect(screen.getByText('2 eventos · Soma')).toBeInTheDocument();
  });

  it('allows deleting any past record after server confirmation', async () => {
    mocks.useEntries.mockReturnValue({
      entries: [
        entry({
          id: 'past',
          indicatorId: 'exe',
          localDate: '2026-10-01',
          value: { boolean: true },
          note: 'registro antigo'
        })
      ],
      loading: false,
      error: ''
    });
    renderPage();

    expect(screen.getByText('registro antigo')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Excluir registro de EXE de 01\/10\/26/i }));

    await waitFor(() => expect(mocks.deleteEntry).toHaveBeenCalledWith('anon-register', 'past'));
    expect(await screen.findByRole('status')).toHaveTextContent(/excluído e confirmado/i);
  });

  it('reports deletion failures without success feedback', async () => {
    mocks.deleteEntry.mockRejectedValue(new Error('failure'));
    mocks.useEntries.mockReturnValue({
      entries: [entry({ id: 'past', indicatorId: 'exe', localDate: '2026-10-01' })],
      loading: false,
      error: ''
    });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Excluir registro de EXE/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível excluir/i);
    expect(screen.queryByText(/excluído e confirmado/i)).not.toBeInTheDocument();
  });

  it('explains the empty state when no active indicator can be recorded', () => {
    mocks.useIndicators.mockReturnValue([]);
    renderPage();

    expect(screen.getByRole('heading', { name: /Nenhum indicador ativo/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Criar indicador/i })).toHaveAttribute(
      'href',
      '/indicators/new'
    );
  });
});
