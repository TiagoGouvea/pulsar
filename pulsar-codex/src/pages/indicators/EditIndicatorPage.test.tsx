import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EditIndicatorPage from './EditIndicatorPage';

const mocks = vi.hoisted(() => ({
  updateIndicator: vi.fn(),
  archiveIndicator: vi.fn(),
  restoreIndicator: vi.fn(),
  useIndicators: vi.fn()
}));

vi.mock('@lib/firebase/context', () => ({
  useFirebase: () => ({ user: { uid: 'anon-edit' }, anonymous: true, isLoading: false })
}));

vi.mock('@features/indicators/useIndicators', () => ({
  useIndicators: mocks.useIndicators
}));

vi.mock('@features/indicators/repository', () => ({
  updateIndicator: mocks.updateIndicator,
  archiveIndicator: mocks.archiveIndicator,
  restoreIndicator: mocks.restoreIndicator
}));

function buildIndicator(overrides: Record<string, unknown>) {
  return {
    id: 'indicator-1',
    group: 'result',
    name: 'Nível de Energia',
    abbreviation: 'ENE',
    emoji: '⚡',
    valueType: 'scale',
    scale: { min: 0, max: 10, step: 1 },
    desiredDirection: 'higher',
    frequency: 'single_per_day',
    sortOrder: 30,
    firstEntryAt: null,
    archivedAt: null,
    createdAt: '2026-11-01T12:00:00.000Z',
    updatedAt: '2026-11-01T12:00:00.000Z',
    ...overrides
  };
}

function renderPage(indicatorId = 'indicator-1') {
  return render(
    <MemoryRouter initialEntries={[`/indicators/${indicatorId}/edit`]}>
      <Routes>
        <Route path="/indicators/:id/edit" element={<EditIndicatorPage />} />
        <Route path="/indicators" element={<div>Lista de indicadores</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.updateIndicator.mockResolvedValue(undefined);
  mocks.archiveIndicator.mockResolvedValue(undefined);
  mocks.restoreIndicator.mockResolvedValue(undefined);
});

describe('edit indicator', () => {
  it('keeps structural fields editable before the first entry', async () => {
    mocks.useIndicators.mockReturnValue([buildIndicator({})]);
    renderPage();

    expect(screen.getByRole('button', { name: /Booleano/ })).toBeEnabled();
    expect(screen.getByRole('group', { name: 'Frequência diária' })).toBeEnabled();

    fireEvent.change(screen.getByLabelText(/Nome do Indicador/i), {
      target: { value: 'Disposição' }
    });
    fireEvent.click(screen.getByRole('button', { name: /Booleano/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(mocks.updateIndicator).toHaveBeenCalledTimes(1));
    expect(mocks.updateIndicator).toHaveBeenCalledWith(
      'anon-edit',
      'indicator-1',
      expect.objectContaining({
        name: 'Disposição',
        valueType: 'boolean',
        scale: null
      })
    );
  });

  it('freezes structural fields after the first entry but keeps name, emoji and direction editable', async () => {
    mocks.useIndicators.mockReturnValue([
      buildIndicator({ firstEntryAt: '2026-11-02T08:00:00.000Z' })
    ]);
    renderPage();

    expect(screen.getByText('Estrutura travada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Booleano/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Resultado/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /1x ao dia/ })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Nome do Indicador/i), {
      target: { value: 'Disposição Matinal' }
    });
    fireEvent.change(screen.getByLabelText(/Sigla/i), { target: { value: 'DSP' } });
    fireEvent.click(screen.getByRole('button', { name: /Menor é melhor/ }));

    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(mocks.updateIndicator).toHaveBeenCalledTimes(1));
    expect(mocks.updateIndicator).toHaveBeenCalledWith('anon-edit', 'indicator-1', {
      name: 'Disposição Matinal',
      abbreviation: 'DSP',
      desiredDirection: 'lower'
    });
  });

  it('archives and restores the indicator from the status row', async () => {
    mocks.useIndicators.mockReturnValue([
      buildIndicator({ archivedAt: '2026-11-01T12:00:00.000Z' })
    ]);
    renderPage();

    expect(screen.getByText('Arquivado')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar' }));
    await waitFor(() =>
      expect(mocks.restoreIndicator).toHaveBeenCalledWith('anon-edit', 'indicator-1')
    );
  });

  it('shows a not-found state for an unknown indicator', () => {
    mocks.useIndicators.mockReturnValue([buildIndicator({ id: 'other' })]);
    renderPage('missing');

    expect(screen.getByRole('heading', { name: 'Indicador não encontrado' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir para Meus Indicadores' })).toHaveAttribute(
      'href',
      '/indicators'
    );
  });
});
