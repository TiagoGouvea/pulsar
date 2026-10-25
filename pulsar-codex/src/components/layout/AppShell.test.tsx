import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';

// Hermetic unit test: the shell does not depend on a live Firebase session.
vi.mock('@lib/firebase/context', () => ({
  useFirebase: () => ({
    user: null,
    isLoading: false,
    anonymous: true,
    googleAvailable: true,
    emailAvailable: true,
    signInAnonymous: vi.fn(),
    signInGoogle: vi.fn(),
    sendPasswordReset: vi.fn(),
    linkCredential: vi.fn(),
    signOutUser: vi.fn()
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

describe('AppShell', () => {
  it('renders the fixed header and a full-width fluid main area', () => {
    renderWithRouter(<AppShell />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    const main = screen.getByRole('main');
    // Fluid width only: no fixed desktop max-width or exclusive desktop chrome.
    expect(main.className).toContain('w-full');
    expect(screen.getByText('conteúdo principal')).toBeInTheDocument();
  });

  it('keeps the same shell on wide screens (no desktop-only navigation)', () => {
    renderWithRouter(<AppShell />);
    // The shell has no hamburger/drawer or desktop-specific containers.
    expect(document.querySelector('[data-desktop-only]')).toBeNull();
  });
});