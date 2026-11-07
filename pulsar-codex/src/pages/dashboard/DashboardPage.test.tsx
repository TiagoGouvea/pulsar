import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePrivacyStore } from '@features/privacy/store';
import DashboardPage from './DashboardPage';

const mocks = vi.hoisted(() => ({
  createIndicator: vi.fn(),
  useIndicators: vi.fn(),
  useEntries: vi.fn(),
  account: {} as Record<string, unknown>
}));

vi.mock('@lib/firebase/context', () => ({
  useFirebase: () => mocks.account
}));

vi.mock('@features/indicators/useIndicators', () => ({
  useIndicators: mocks.useIndicators
}));

vi.mock('@features/indicators/repository', () => ({
  createIndicator: mocks.createIndicator
}));

vi.mock('@features/entries/useEntries', () => ({
  useEntries: mocks.useEntries
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  usePrivacyStore.setState({ isNameRevealed: true });
  mocks.useEntries.mockReturnValue({ entries: [], loading: false, error: '' });
  mocks.useIndicators.mockReturnValue([]);
  mocks.createIndicator.mockImplementation(async (uid: string, input: Record<string, unknown>) => ({
    ...input,
    id: `id-${uid}-${String(input.name)}`,
    archivedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
  mocks.account = {
    user: { uid: 'anon-dashboard', isAnonymous: true },
    anonymous: true,
    isLoading: false
  };
});

function renderDashboard() {
  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  );
}

describe('new account dashboard', () => {
  it('shows four optional suggestions and the custom-indicator action without creating anything', () => {
    renderDashboard();

    expect(screen.getByRole('heading', { name: 'Bem-vindo ao Pulsar' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Exercício Físico' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Café Expresso/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Nível de Energia/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Concentração / Foco' })).toBeInTheDocument();
    expect(screen.getByText(/nenhum auto-criado/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Criar meu próprio indicador/i })).toHaveAttribute('href', '/indicators/new');
    expect(screen.queryByText(/Quer manter seus indicadores/i)).not.toBeInTheDocument();
    expect(mocks.createIndicator).not.toHaveBeenCalled();
  });

  it('only creates an indicator after an explicit add and then reveals the non-blocking save invitation', async () => {
    renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar Exercício Físico' }));

    await waitFor(() => expect(mocks.createIndicator).toHaveBeenCalledTimes(1));
    expect(mocks.createIndicator).toHaveBeenCalledWith(
      'anon-dashboard',
      expect.objectContaining({ name: 'Exercício Físico', group: 'factor' })
    );
    expect(await screen.findByRole('heading', { name: /Quer manter seus indicadores/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Salvar minha conta' })).toHaveAttribute('href', '/account');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Agora não' }));
    expect(screen.queryByRole('heading', { name: /Quer manter seus indicadores/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar Café Expresso' }));
    await waitFor(() => expect(mocks.createIndicator).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('heading', { name: /Café Expresso/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Quer manter seus indicadores/i })).not.toBeInTheDocument();
  });

  it('starts in abbreviations and hides registered indicator names until names are revealed', () => {
    usePrivacyStore.setState({ isNameRevealed: false });
    mocks.useIndicators.mockReturnValue([
      {
        id: 'exe',
        group: 'factor',
        name: 'Exercício Físico',
        abbreviation: 'EXE',
        emoji: '🏋️',
        valueType: 'boolean',
        frequency: 'single_per_day',
        sortOrder: 10,
        firstEntryAt: null,
        archivedAt: null,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString()
      }
    ]);
    renderDashboard();

    expect(screen.getByRole('heading', { name: 'EXE' })).toBeInTheDocument();
    expect(screen.queryByText('Exercício Físico')).not.toBeInTheDocument();
    expect(screen.queryByText('🏋️')).not.toBeInTheDocument();

    act(() => usePrivacyStore.getState().toggleNames());

    expect(screen.getByRole('heading', { name: /🏋️ Exercício Físico/ })).toBeInTheDocument();
  });

  it('offers the quick registration action and shows today values without masking them', () => {
    mocks.useIndicators.mockReturnValue([
      {
        id: 'exe',
        group: 'factor',
        name: 'Exercício Físico',
        abbreviation: 'EXE',
        emoji: '',
        valueType: 'boolean',
        frequency: 'single_per_day',
        sortOrder: 10,
        firstEntryAt: null,
        archivedAt: null,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString()
      }
    ]);
    mocks.useEntries.mockReturnValue({
      entries: [
        {
          id: 'exe-today',
          indicatorId: 'exe',
          localDate: new Date().toLocaleDateString('sv-SE'),
          recordedAt: new Date().toISOString(),
          valueType: 'boolean',
          value: { boolean: false },
          note: ''
        }
      ],
      loading: false,
      error: ''
    });
    renderDashboard();

    expect(screen.getByRole('link', { name: /Registrar agora/i })).toHaveAttribute('href', '/registrar');
    expect(screen.getByText('Não')).toBeInTheDocument();
    expect(screen.queryByText('Sem registro')).not.toBeInTheDocument();
  });

  it('does not invite an already saved account to save again', async () => {
    mocks.account = {
      user: { uid: 'saved-dashboard', isAnonymous: false },
      anonymous: false,
      isLoading: false
    };
    renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar Nível de Energia' }));

    await waitFor(() => expect(mocks.createIndicator).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('heading', { name: /Quer manter seus indicadores/i })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Nível de Energia/ })).toBeInTheDocument();
  });
});
