import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AppShell } from '../AppShell';
import { PrivacyProvider } from '../../privacy/PrivacyContext';

function renderShell(path = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PrivacyProvider>
        <AppShell>
          <p>conteúdo</p>
        </AppShell>
      </PrivacyProvider>
    </MemoryRouter>,
  );
}

const tabs = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Registrar', path: '/register' },
  { label: 'Indicadores', path: '/indicators' },
  { label: 'Conclusões', path: '/saved-insights' },
];

describe('AppShell', () => {
  it('shows the brand, the global eye toggle and the profile shortcut', () => {
    renderShell();
    const banner = screen.getByRole('banner');
    expect(banner).toHaveTextContent('Pulsar');
    expect(screen.getByTestId('eye-toggle')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir configurações' })).toHaveAttribute('href', '/settings');
  });

  it('renders the bottom navigation with one icon per item', () => {
    renderShell();
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
    for (const tab of tabs) {
      const link = screen.getByRole('link', { name: tab.label });
      expect(nav).toContainElement(link);
      expect(link.querySelectorAll('svg')).toHaveLength(1);
    }
  });

  it('marks only the current route with aria-current=page', () => {
    renderShell('/indicators');
    for (const tab of tabs) {
      const link = screen.getByRole('link', { name: tab.label });
      if (tab.path === '/indicators') expect(link).toHaveAttribute('aria-current', 'page');
      else expect(link).not.toHaveAttribute('aria-current', 'page');
    }
  });

  it('keeps the eye state when navigating between tabs', async () => {
    const user = userEvent.setup();
    renderShell();
    const eye = screen.getByTestId('eye-toggle');
    const before = eye.getAttribute('aria-pressed');
    await user.click(eye);
    const after = eye.getAttribute('aria-pressed');
    expect(after).not.toBe(before);
    await user.click(screen.getByRole('link', { name: 'Indicadores' }));
    expect(screen.getByTestId('eye-toggle')).toHaveAttribute('aria-pressed', after ?? '');
  });
});
