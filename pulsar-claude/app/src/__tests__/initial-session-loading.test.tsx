import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { App } from '../App';

vi.mock('../auth/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({ loading: true, error: null, user: null, profile: null }),
}));

afterEach(() => vi.useRealTimers());

it('shows no visible text while the initial session is loading', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
  render(<App />);

  for (const element of screen.queryAllByText(/\S/)) {
    expect.soft(element).not.toBeVisible();
  }
});
