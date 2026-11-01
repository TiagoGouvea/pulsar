import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MATERIAL_SYMBOL_NAMES } from '@components/ui/MaterialIcon';
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
  const result = render(
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
  return result;
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

    fireEvent.click(screen.getByRole('button', { name: /começar a explorar/i }));

    await waitFor(() => expect(screen.getByText('dashboard inicial')).toBeInTheDocument());
    expect(mocks.markOnboardingCompleted).toHaveBeenCalledWith('anon-flow');
  });

  it('keeps a single start action on the last screen', () => {
    renderAt('/onboarding/3');

    expect(screen.queryByRole('button', { name: 'Pular' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Concluir' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /começar a explorar/i })).toHaveLength(1);
  });

  it('returns to the top of the page when moving between screens', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    renderAt('/onboarding/1');
    scrollTo.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Próximo' }));

    await waitFor(() => expect(screen.getByRole('heading', { name: /acompanhe como você se sente/i })).toBeInTheDocument());
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
  });

  it('shows the concentration chip with a real icon instead of raw markup', () => {
    const { container } = renderAt('/onboarding/2');

    const chip = screen.getByText('Concentração').closest('div');
    expect(chip).not.toBeNull();
    const chipIcons = Array.from(chip?.querySelectorAll('.material-symbols-outlined') ?? []).map((icon) => icon.textContent);
    expect(chipIcons).toEqual(['psychology']);

    const iconNames = Array.from(container.querySelectorAll('.material-symbols-outlined')).map((icon) => icon.textContent ?? '');
    expect(iconNames.length).toBeGreaterThan(0);
    iconNames.forEach((name) => expect(MATERIAL_SYMBOL_NAMES).toContain(name));
    expect(container.textContent).not.toContain('focus_center');
    expect(container.textContent).not.toContain('<span');
  });
});
