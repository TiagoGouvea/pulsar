import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePrivacyStore } from '@features/privacy/store';
import { AppShell } from './AppShell';

// Hermetic unit test: the shell does not depend on a live Firebase session.
vi.mock('@lib/firebase/context', () => ({
  useFirebase: () => ({
    user: null,
    isLoading: false,
    anonymous: true,
    initializationError: null,
    emailLinkPending: false,
    pendingEmail: '',
    signInAnonymous: vi.fn(),
    linkGoogle: vi.fn(),
    loginGoogle: vi.fn(),
    sendEmailLink: vi.fn(),
    completeEmailLink: vi.fn(),
    dismissEmailLink: vi.fn(),
    reauthenticateGoogle: vi.fn(),
    signOutUser: vi.fn(),
    deleteAccount: vi.fn()
  })
}));

const renderWithRouter = (ui: React.ReactElement) =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={ui}>
          <Route path="/" element={<p>conteúdo principal</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  usePrivacyStore.setState({ isNameRevealed: false });
});

describe('AppShell', () => {
  it('renders the fixed header and a full-width fluid main area', () => {
    renderWithRouter(<AppShell />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    const main = screen.getByRole('main');
    // Fluid width only: no fixed desktop max-width or exclusive desktop chrome.
    expect(main.className).toContain('w-full');
    expect(screen.getByText('conteúdo principal')).toBeInTheDocument();
  });

  it('starts in abbreviations and toggles the global privacy mode from the header', () => {
    renderWithRouter(<AppShell />);

    const toggle = screen.getByRole('button', { name: /Alternar modo discrição e siglas/i });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Siglas')).toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Nomes')).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.getByText('Siglas')).toBeInTheDocument();
  });

  it('keeps the same shell on wide screens (no desktop-only navigation)', () => {
    renderWithRouter(<AppShell />);
    // The shell has no hamburger/drawer or desktop-specific containers.
    expect(document.querySelector('[data-desktop-only]')).toBeNull();
  });
});