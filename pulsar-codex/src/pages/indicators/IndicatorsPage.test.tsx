import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePrivacyStore } from '@features/privacy/store';
import IndicatorsPage from './IndicatorsPage';

const mocks = vi.hoisted(() => ({
  archiveIndicator: vi.fn(),
  restoreIndicator: vi.fn(),
  reorderIndicators: vi.fn(),
  useIndicators: vi.fn()
}));

vi.mock('@lib/firebase/context', () => ({
  useFirebase: () => ({ user: { uid: 'anon-indicators' }, anonymous: true, isLoading: false })
}));

vi.mock('@features/indicators/useIndicators', () => ({
  useIndicators: mocks.useIndicators
}));

vi.mock('@features/indicators/repository', () => ({
  archiveIndicator: mocks.archiveIndicator,
  restoreIndicator: mocks.restoreIndicator,
  reorderIndicators: mocks.reorderIndicators
}));

type IndicatorSeed = {
  id: string;
  group: 'factor' | 'result';
  name: string;
  abbreviation: string;
  emoji?: string;
  valueType: 'boolean' | 'scale' | 'numeric' | 'ordinal';
  frequency: 'single_per_day' | 'multiple_per_day';
  dailyAggregation?: 'sum' | 'mean' | 'last' | 'any';
  sortOrder: number;
  archivedAt?: string | null;
  firstEntryAt?: string | null;
  numeric?: { unit: string; min: number | null; max: number | null; step: number };
  scale?: { min: number; max: number; step: number };
  desiredDirection?: 'neutral' | 'higher' | 'lower' | 'target_range';
  idealRange?: { min: number; max: number };
};

function seed(overrides: Partial<IndicatorSeed> & { id: string; name: string }): IndicatorSeed {
  return {
    group: 'factor',
    abbreviation: 'SIG',
    emoji: '',
    valueType: 'boolean',
    frequency: 'single_per_day',
    sortOrder: 10,
    archivedAt: null,
    firstEntryAt: null,
    ...overrides
  } as IndicatorSeed;
}

// Archived twelve days before “now” so the day count is deterministic in any clock.
const twelveDaysAgo = new Date(Date.now() - 12 * 86400000).toISOString();

const indicatorList: IndicatorSeed[] = [
  seed({ id: 'exe', name: 'Exercício Físico', abbreviation: 'EXE', sortOrder: 10 }),
  seed({
    id: 'caf',
    name: 'Café Expresso',
    abbreviation: 'CAF',
    valueType: 'numeric',
    frequency: 'multiple_per_day',
    dailyAggregation: 'sum',
    numeric: { unit: 'xícaras', min: 0, max: null, step: 0.5 },
    sortOrder: 20
  }),
  seed({
    id: 'ene',
    name: 'Nível de Energia',
    abbreviation: 'ENE',
    group: 'result',
    valueType: 'scale',
    scale: { min: 0, max: 10, step: 1 },
    desiredDirection: 'higher',
    frequency: 'multiple_per_day',
    dailyAggregation: 'mean',
    sortOrder: 30
  }),
  seed({
    id: 'acu',
    name: 'Consumo de Açúcar',
    abbreviation: 'AÇU',
    valueType: 'boolean',
    sortOrder: 40,
    archivedAt: twelveDaysAgo
  })
];

function renderPage(initialEntry = '/indicators') {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/indicators" element={<IndicatorsPage />} />
        <Route path="/indicators/new" element={<div>Novo indicador</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  usePrivacyStore.setState({ isNameRevealed: true });
  mocks.useIndicators.mockReturnValue(indicatorList);
  mocks.archiveIndicator.mockResolvedValue(undefined);
  mocks.restoreIndicator.mockResolvedValue(undefined);
  mocks.reorderIndicators.mockResolvedValue(undefined);
});

describe('indicators list', () => {
  it('starts in abbreviations and hides full names and emojis', () => {
    usePrivacyStore.setState({ isNameRevealed: false });
    renderPage();

    expect(screen.getByRole('heading', { name: 'EXE' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'CAF' })).toBeInTheDocument();
    expect(screen.queryByText('Exercício Físico')).not.toBeInTheDocument();
    expect(screen.queryByText('Café Expresso')).not.toBeInTheDocument();
    expect(screen.queryByText('🏋️')).not.toBeInTheDocument();

    act(() => usePrivacyStore.getState().toggleNames());

    expect(screen.getByRole('heading', { name: /Exercício Físico/ })).toBeInTheDocument();
  });

  it('renders the active factors and results with their configuration chips', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Meus Indicadores' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fatores' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Resultados' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Exercício Físico' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Café Expresso' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nível de Energia' })).toBeInTheDocument();
    expect(screen.getByText('Booleano (Sim/Não)')).toBeInTheDocument();
    expect(screen.getByText('Numérico (xícaras)')).toBeInTheDocument();
    expect(screen.getByText('Escala 0–10')).toBeInTheDocument();
    expect(screen.getByText('Soma diária')).toBeInTheDocument();
    expect(screen.getByText('Média')).toBeInTheDocument();
    expect(screen.getByText('Quanto maior, melhor')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Novo Indicador/i })).toHaveAttribute(
      'href',
      '/indicators/new'
    );
  });

  it('shows the counts on the filter pills', () => {
    renderPage();

    expect(screen.getByRole('button', { name: /Todos 3/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fatores 2/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Resultados 1/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Arquivados 1/ })).toBeInTheDocument();
  });

  it('filters by group and by archived', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Resultados 1/ }));
    expect(screen.getByRole('heading', { name: 'Nível de Energia' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Exercício Físico' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Arquivados 1/ }));
    expect(screen.getByRole('heading', { name: 'Consumo de Açúcar' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Nível de Energia' })).not.toBeInTheDocument();
    expect(screen.getByText(/Desativado há 12 dias/)).toBeInTheDocument();
  });

  it('keeps archived indicators out of the active sections but restorable from the collapsible section', async () => {
    renderPage();

    expect(screen.queryByRole('heading', { name: 'Consumo de Açúcar' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Seção de arquivados' }));
    expect(screen.getByRole('heading', { name: 'Consumo de Açúcar' })).toBeInTheDocument();
    expect(
      screen.getByText(/histórico preservado nas análises/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Restaurar Consumo de Açúcar' }));
    await waitFor(() => expect(mocks.restoreIndicator).toHaveBeenCalledWith('anon-indicators', 'acu'));
  });

  it('archives an indicator from the options sheet', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Opções para Nível de Energia' }));
    expect(await screen.findByRole('dialog', { name: 'Opções do Indicador' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Arquivar indicador' }));
    await waitFor(() =>
      expect(mocks.archiveIndicator).toHaveBeenCalledWith('anon-indicators', 'ene')
    );
    expect(await screen.findByText(/Nível de Energia foi arquivado/i)).toBeInTheDocument();
  });

  it('reorders within a group and never across groups', async () => {
    renderPage();

    const moveDown = screen.getByRole('button', { name: 'Mover Exercício Físico para baixo' });
    fireEvent.click(moveDown);
    await waitFor(() => expect(mocks.reorderIndicators).toHaveBeenCalledTimes(1));
    expect(mocks.reorderIndicators).toHaveBeenCalledWith('anon-indicators', [
      { id: 'caf', sortOrder: 0 }
    ]);
  });

  it('shows the empty state when there are no indicators', () => {
    mocks.useIndicators.mockReturnValue([]);
    renderPage();

    expect(screen.getByRole('heading', { name: 'Nenhum indicador ainda' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Criar primeiro indicador/i })).toHaveAttribute(
      'href',
      '/indicators/new'
    );
  });

  it('renders the notice from location state', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/indicators', state: { notice: 'Criado com sucesso.' } }]}>
        <Routes>
          <Route path="/indicators" element={<IndicatorsPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Criado com sucesso.')).toBeInTheDocument();
  });
});
