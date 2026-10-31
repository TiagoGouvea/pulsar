import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OnboardingStep1 from './OnboardingStep1';
import OnboardingStep2 from './OnboardingStep2';
import OnboardingStep3 from './OnboardingStep3';

const mocks = vi.hoisted(() => ({
  markOnboardingCompleted: vi.fn(),
  account: {} as Record<string, unknown>
}));

vi.mock('@features/onboarding/completion', () => ({
  markOnboardingCompleted: mocks.markOnboardingCompleted
}));

vi.mock('@lib/firebase/context', () => ({
  useFirebase: () => mocks.account
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.markOnboardingCompleted.mockResolvedValue({ local: true, remote: true });
  mocks.account = {
    user: { uid: 'anon-flow', isAnonymous: true },
    isLoading: false
  };
});

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/onboarding" element={<p>introdução</p>} />
        <Route path="/onboarding/1" element={<OnboardingStep1 />} />
        <Route path="/onboarding/2" element={<OnboardingStep2 />} />
        <Route path="/onboarding/3" element={<OnboardingStep3 />} />
        <Route path="/dashboard" element={<p>dashboard inicial</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('three-screen onboarding navigation', () => {
  it('moves forward and backward between factors and results', async () => {
    renderAt('/onboarding/1');

    fireEvent.click(screen.getByRole('button', { name: 'Próximo' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: /acompanhe como você se sente/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: /observe sua rotina/i })).toBeInTheDocument());
  });

  it('moves from results to associations and back', async () => {
    renderAt('/onboarding/2');

    fireEvent.click(screen.getByRole('button', { name: 'Próximo' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: /descubra associações reais/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: /acompanhe como você se sente/i })).toBeInTheDocument());
  });

  it('skips the remaining tutorial, persists completion and opens the dashboard', async () => {
    renderAt('/onboarding/1');

    fireEvent.click(screen.getByRole('button', { name: 'Pular' }));

    await waitFor(() => expect(screen.getByText('dashboard inicial')).toBeInTheDocument());
    expect(mocks.markOnboardingCompleted).toHaveBeenCalledWith('anon-flow');
  });

  it('returns from associations to results', async () => {
    renderAt('/onboarding/3');

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));

    await waitFor(() => expect(screen.getByRole('heading', { name: /acompanhe como você se sente/i })).toBeInTheDocument());
    expect(mocks.markOnboardingCompleted).not.toHaveBeenCalled();
  });

  it('persists completion from the third screen', async () => {
    renderAt('/onboarding/3');

    fireEvent.click(screen.getByRole('button', { name: 'Concluir' }));

    await waitFor(() => expect(screen.getByText('dashboard inicial')).toBeInTheDocument());
    expect(mocks.markOnboardingCompleted).toHaveBeenCalledWith('anon-flow');
  });

  it('also completes from the primary final action', async () => {
    renderAt('/onboarding/3');

    fireEvent.click(screen.getByRole('button', { name: /começar a explorar/i }));

    await waitFor(() => expect(screen.getByText('dashboard inicial')).toBeInTheDocument());
    expect(mocks.markOnboardingCompleted).toHaveBeenCalledTimes(1);
  });
});
