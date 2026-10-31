import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from './DashboardPage';

const mocks = vi.hoisted(() => ({
  createIndicator: vi.fn(),
  useIndicators: vi.fn(),
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

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
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
    expect(screen.getByRole('heading', { name: 'Café Expresso' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nível de Energia' })).toBeInTheDocument();
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
    expect(screen.getByRole('heading', { name: 'Café Expresso' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Quer manter seus indicadores/i })).not.toBeInTheDocument();
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
    expect(screen.getByRole('heading', { name: 'Nível de Energia' })).toBeInTheDocument();
  });
});
