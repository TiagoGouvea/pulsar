import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

async function renderAppAt(path: string, emulatorsEnabled: boolean) {
  vi.resetModules();
  vi.doMock('../lib/env', () => ({ emulatorsEnabled }));
  window.history.pushState({}, '', path);
  const { App } = await import('../App');
  render(<App />);
}

describe('/_design route gating', () => {
  afterEach(() => {
    vi.doUnmock('../lib/env');
    window.history.pushState({}, '', '/');
  });

  it('renders the design catalog in emulator/dev builds', async () => {
    await renderAppAt('/_design', true);
    expect(await screen.findByRole('heading', { name: 'Design system' })).toBeTruthy();
  });

  it('does not exist in production builds', async () => {
    await renderAppAt('/_design', false);
    expect(screen.queryByRole('heading', { name: 'Design system' })).toBeNull();
  });
});
