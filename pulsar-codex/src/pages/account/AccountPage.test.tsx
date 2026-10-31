import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { User } from 'firebase/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AccountPage from './AccountPage';

const mocks = vi.hoisted(() => {
  const state = { account: {} as Record<string, unknown> };
  return {
    state,
    signInAnonymous: vi.fn(),
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

vi.mock('@lib/firebase/context', () => ({
  useFirebase: () => mocks.state.account
}));

function account(overrides: Record<string, unknown> = {}) {
  const user = {
    uid: 'anon-1234',
    isAnonymous: true,
    email: null,
    providerData: []
  } as unknown as User;
  return {
    user,
    isLoading: false,
    anonymous: true,
    initializationError: null,
    emailLinkPending: false,
    pendingEmail: '',
    signInAnonymous: mocks.signInAnonymous,
    linkGoogle: mocks.linkGoogle,
    loginGoogle: mocks.loginGoogle,
    sendEmailLink: mocks.sendEmailLink,
    completeEmailLink: mocks.completeEmailLink,
    dismissEmailLink: mocks.dismissEmailLink,
    reauthenticateGoogle: mocks.reauthenticateGoogle,
    signOutUser: mocks.signOutUser,
    deleteAccount: mocks.deleteAccount,
    ...overrides
  };
}

function renderPage(overrides: Record<string, unknown> = {}) {
  mocks.state.account = account(overrides);
  render(
    <MemoryRouter>
      <AccountPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.signOutUser.mockResolvedValue(undefined);
  mocks.deleteAccount.mockResolvedValue(undefined);
  mocks.linkGoogle.mockResolvedValue(undefined);
  mocks.sendEmailLink.mockResolvedValue(undefined);
  mocks.reauthenticateGoogle.mockResolvedValue(undefined);
});

describe('anonymous account entry and conversion', () => {
  it('explains the anonymous session risk and offers Google, email link, logout and deletion', () => {
    renderPage();

    expect(screen.getByText('Conta anônima ativa')).toBeInTheDocument();
    expect(screen.getByText(/perder o acesso.*irrecuperável/i)).toBeInTheDocument();
    expect(screen.getByTestId('account-uid')).toHaveTextContent('anon-1234');
    expect(screen.getByRole('button', { name: 'Vincular com Google' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar link mágico por e-mail' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excluir conta e todos os dados' })).toBeInTheDocument();
  });

  it('does not replace, sign out or delete anything when Google is already owned by another account', async () => {
    mocks.linkGoogle.mockRejectedValue({ code: 'auth/credential-already-in-use' });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Vincular com Google' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/já pertence a outra conta/i);
    });
    expect(screen.getByRole('alert')).toHaveTextContent(/sem mesclar, substituir ou apagar nada/i);
    expect(screen.getByTestId('account-uid')).toHaveTextContent('anon-1234');
    expect(mocks.loginGoogle).not.toHaveBeenCalled();
    expect(mocks.signOutUser).not.toHaveBeenCalled();
    expect(mocks.deleteAccount).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Continuar nesta conta' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByTestId('account-uid')).toHaveTextContent('anon-1234');
  });

  it('sends the magic link to the typed address without leaving the anonymous session', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Enviar link mágico por e-mail' }));
    fireEvent.change(screen.getByLabelText('Seu e-mail'), { target: { value: 'me@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }));

    await waitFor(() => {
      expect(mocks.sendEmailLink).toHaveBeenCalledWith('me@example.com', 'link');
    });
    expect(screen.getByTestId('account-uid')).toHaveTextContent('anon-1234');
    expect(mocks.signOutUser).not.toHaveBeenCalled();
  });
});

describe('account security actions', () => {
  it('confirms logout and keeps the anonymous risk visible until the user chooses to leave', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent(/perde o acesso aos dados/i);
    expect(mocks.signOutUser).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar saída' }));
    await waitFor(() => expect(mocks.signOutUser).toHaveBeenCalledTimes(1));
  });

  it('requires an explicit confirmation before deleting everything', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Excluir conta e todos os dados' }));
    expect(mocks.deleteAccount).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Excluir definitivamente' }));
    await waitFor(() => expect(mocks.deleteAccount).toHaveBeenCalledTimes(1));
  });

  it('offers reauthentication when the server requires a recent login, then asks for deletion again', async () => {
    mocks.deleteAccount.mockRejectedValueOnce({ code: 'functions/failed-precondition' });
    renderPage({
      anonymous: false,
      user: {
        uid: 'saved-1234',
        isAnonymous: false,
        email: 'me@example.com',
        providerData: [{ providerId: 'google.com' }]
      } as unknown as User
    });

    fireEvent.click(screen.getByRole('button', { name: 'Excluir conta e todos os dados' }));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir definitivamente' }));

    await waitFor(() => expect(screen.getByText(/confirme sua identidade novamente/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Confirmar com Google' })).toBeInTheDocument();
    expect(mocks.deleteAccount).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar com Google' }));
    await waitFor(() => expect(mocks.reauthenticateGoogle).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/Identidade confirmada/i)).toBeInTheDocument());
    // Reauthentication never deletes by itself: the user must confirm again.
    expect(mocks.deleteAccount).toHaveBeenCalledTimes(1);
  });

  it('shows the pending magic link confirmation and lets the user cancel without losing the session', () => {
    renderPage({ emailLinkPending: true, pendingEmail: 'me@example.com' });

    expect(screen.getByRole('heading', { name: 'Confirmar link mágico' })).toBeInTheDocument();
    expect(screen.getByText(/E-mail solicitado: me@example.com/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar link' }));
    expect(mocks.dismissEmailLink).toHaveBeenCalledTimes(1);
    expect(mocks.signOutUser).not.toHaveBeenCalled();
    expect(mocks.deleteAccount).not.toHaveBeenCalled();
  });
});
