import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OnboardingPage from './OnboardingPage';

const mocks = vi.hoisted(() => {
  const state = { account: {} as Record<string, unknown> };
  return { state, signInAnonymous: vi.fn() };
});

vi.mock('@lib/firebase/context', () => ({
  useFirebase: () => mocks.state.account
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.signInAnonymous.mockResolvedValue(undefined);
  mocks.state.account = {
    user: null,
    isLoading: false,
    anonymous: true,
    initializationError: null,
    emailLinkPending: false,
    pendingEmail: '',
    signInAnonymous: mocks.signInAnonymous,
    linkGoogle: vi.fn(),
    loginGoogle: vi.fn(),
    sendEmailLink: vi.fn(),
    completeEmailLink: vi.fn(),
    dismissEmailLink: vi.fn(),
    reauthenticateGoogle: vi.fn(),
    signOutUser: vi.fn(),
    deleteAccount: vi.fn()
  };
});

describe('first anonymous access', () => {
  it('starts without permanent registration and explains the anonymous session risk', async () => {
    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <OnboardingPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/pode tornar seus dados inacessíveis/i)).toBeInTheDocument();
    expect(screen.getByText(/sem mudar seu UID/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Começar agora' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Já tenho uma conta salva' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Começar agora' }));
    await waitFor(() => expect(mocks.signInAnonymous).toHaveBeenCalledTimes(1));
  });

  it('does not hide the risk while the anonymous session is being restored', () => {
    mocks.state.account = {
      ...(mocks.state.account as Record<string, unknown>),
      isLoading: true
    };
    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <OnboardingPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/pode tornar seus dados inacessíveis/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preparando sessão…' })).toBeDisabled();
  });
});
