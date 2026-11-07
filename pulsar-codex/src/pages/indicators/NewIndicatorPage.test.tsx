import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NewIndicatorPage from './NewIndicatorPage';

const mocks = vi.hoisted(() => ({
  createIndicator: vi.fn(),
  useIndicators: vi.fn()
}));

vi.mock('@lib/firebase/context', () => ({
  useFirebase: () => ({ user: { uid: 'anon-new' }, anonymous: true, isLoading: false })
}));

vi.mock('@features/indicators/useIndicators', () => ({
  useIndicators: mocks.useIndicators
}));

vi.mock('@features/indicators/repository', () => ({
  createIndicator: mocks.createIndicator
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/indicators/new']}>
      <Routes>
        <Route path="/indicators" element={<div>Lista de indicadores</div>} />
        <Route path="/indicators/new" element={<NewIndicatorPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useIndicators.mockReturnValue([]);
  mocks.createIndicator.mockImplementation(async (_uid: string, input: Record<string, unknown>) => ({
    ...input,
    id: 'new-indicator',
    firstEntryAt: null,
    archivedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
});

describe('new indicator form', () => {
  it('renders the numbered sections of the official creation flow', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Novo Indicador' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Classificação causal do indicador' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome do Indicador/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Booleano/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Escala/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Número \+ Unidade/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Opções Ordenadas/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar Indicador' })).toBeInTheDocument();
  });

  it('blocks the submission until the required name is filled', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Criar Indicador' }));

    expect(await screen.findByText('Informe o nome do indicador.')).toBeInTheDocument();
    expect(mocks.createIndicator).not.toHaveBeenCalled();
  });

  it('creates a boolean factor with a single daily record', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/Nome do Indicador/i), {
      target: { value: 'Meditação' }
    });
    fireEvent.change(screen.getByLabelText(/Sigla/i), { target: { value: 'MED' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar Indicador' }));

    await waitFor(() => expect(mocks.createIndicator).toHaveBeenCalledTimes(1));
    expect(mocks.createIndicator).toHaveBeenCalledWith(
      'anon-new',
      expect.objectContaining({
        group: 'factor',
        name: 'Meditação',
        abbreviation: 'MED',
        valueType: 'boolean',
        frequency: 'single_per_day',
        sortOrder: 10
      })
    );
  });

  it('creates a numeric factor with multiple records and the suggested sum aggregation', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/Nome do Indicador/i), {
      target: { value: 'Café' }
    });
    fireEvent.click(screen.getByRole('button', { name: /Número \+ Unidade/ }));
    fireEvent.click(screen.getByRole('button', { name: 'xícaras' }));
    fireEvent.click(screen.getByRole('button', { name: /Múltiplos/ }));

    const presence = screen.queryByRole('button', { name: /Presença/ });
    expect(presence).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Criar Indicador' }));

    await waitFor(() => expect(mocks.createIndicator).toHaveBeenCalledTimes(1));
    expect(mocks.createIndicator).toHaveBeenCalledWith(
      'anon-new',
      expect.objectContaining({
        valueType: 'numeric',
        numeric: { unit: 'xícaras', min: null, max: null, step: 1 },
        frequency: 'multiple_per_day',
        dailyAggregation: 'sum'
      })
    );
  });

  it('creates a scale result with an ideal range direction', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Resultado/ }));
    fireEvent.change(screen.getByLabelText(/Nome do Indicador/i), {
      target: { value: 'Foco' }
    });
    fireEvent.click(screen.getByRole('button', { name: /Escala 0 a 10/ }));
    fireEvent.click(screen.getByRole('button', { name: /Faixa ideal/ }));

    fireEvent.change(screen.getByLabelText('Mínimo ideal'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('Máximo ideal'), { target: { value: '10' } });

    fireEvent.click(screen.getByRole('button', { name: 'Criar Indicador' }));

    await waitFor(() => expect(mocks.createIndicator).toHaveBeenCalledTimes(1));
    expect(mocks.createIndicator).toHaveBeenCalledWith(
      'anon-new',
      expect.objectContaining({
        group: 'result',
        valueType: 'scale',
        scale: { min: 0, max: 10, step: 1 },
        desiredDirection: 'target_range',
        idealRange: { min: 7, max: 10 },
        frequency: 'single_per_day'
      })
    );
  });

  it('creates an ordinal result with ordered options', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Resultado/ }));
    fireEvent.change(screen.getByLabelText(/Nome do Indicador/i), {
      target: { value: 'Humor' }
    });
    fireEvent.click(screen.getByRole('button', { name: /Opções Ordenadas/ }));
    fireEvent.change(screen.getByLabelText('Opção 1'), { target: { value: 'Ruim' } });
    fireEvent.change(screen.getByLabelText('Opção 2'), { target: { value: 'Bom' } });

    fireEvent.click(screen.getByRole('button', { name: 'Criar Indicador' }));

    await waitFor(() => expect(mocks.createIndicator).toHaveBeenCalledTimes(1));
    expect(mocks.createIndicator).toHaveBeenCalledWith(
      'anon-new',
      expect.objectContaining({
        group: 'result',
        valueType: 'ordinal',
        options: [
          { id: 'o0', label: 'Ruim', order: 0 },
          { id: 'o1', label: 'Bom', order: 1 }
        ]
      })
    );
  });

  it('resets the aggregation to a compatible suggestion when the value type changes', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/Nome do Indicador/i), {
      target: { value: 'Café' }
    });
    fireEvent.click(screen.getByRole('button', { name: /Número \+ Unidade/ }));
    fireEvent.click(screen.getByRole('button', { name: 'xícaras' }));
    fireEvent.click(screen.getByRole('button', { name: /Múltiplos/ }));
    expect(screen.getByRole('button', { name: /Soma/ })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: /Opções Ordenadas/ }));
    expect(screen.getByRole('button', { name: /Último/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: /Soma/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Criar Indicador' }));
    expect(await screen.findByText('Cada opção precisa de um rótulo.')).toBeInTheDocument();
    expect(mocks.createIndicator).not.toHaveBeenCalled();
  });
});
