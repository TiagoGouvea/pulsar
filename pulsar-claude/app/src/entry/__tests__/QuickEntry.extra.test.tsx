import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { deleteEntry, saveEntry } from '../../data/entries';
import type { StoredIndicator } from '../../data/indicators';
import type { Entry } from '../../domain/entry';
import { PrivacyProvider } from '../../privacy/PrivacyContext';
import { QuickEntry } from '../QuickEntry';

vi.mock('../../data/entries', () => ({ saveEntry: vi.fn(), deleteEntry: vi.fn() }));

const numeric: StoredIndicator = {
  id: 'numeric',
  group: 'factor',
  name: 'Nome particular',
  abbreviation: 'NUM',
  emoji: '☕',
  valueType: 'numeric',
  numeric: { unit: 'mg', min: 0, max: null, step: 1 },
  scale: null,
  options: null,
  desiredDirection: null,
  idealRange: null,
  frequency: 'single_per_day',
  dailyAggregation: null,
  sortOrder: 1,
  archivedAt: null,
  lockedAt: null,
  createdAt: null,
  updatedAt: null,
};
const existing: Entry = {
  id: 'existing',
  indicatorId: numeric.id,
  localDate: '2026-10-24',
  recordedAt: '2026-10-24T12:00:00Z',
  valueType: 'numeric',
  value: { number: 2 },
  note: null,
};

function show() {
  return render(
    <PrivacyProvider>
      <QuickEntry uid="user" indicators={[numeric]} entries={[existing]} onDone={() => {}} />
    </PrivacyProvider>,
  );
}

describe('Quick entry persistence and privacy', () => {
  it('passes only the visible entries when replacing an answer', async () => {
    const user = userEvent.setup();
    vi.mocked(saveEntry).mockResolvedValueOnce('replacement');
    show();
    const card = screen.getByTestId('quick-entry-card-numeric');
    const input = within(card).getByRole('textbox');
    await user.clear(input);
    await user.type(input, '3');
    await user.tab();
    expect(saveEntry).toHaveBeenCalledWith(
      'user',
      expect.objectContaining({ observedEntryIds: ['existing'], value: { number: 3 } }),
    );
  });

  it('does not modify the previous day after midnight', async () => {
    const user = userEvent.setup();
    vi.mocked(saveEntry).mockClear();
    vi.mocked(deleteEntry).mockClear();
    render(
      <PrivacyProvider>
        <QuickEntry
          uid="user"
          day="2000-01-01"
          indicators={[numeric]}
          entries={[existing]}
          onDone={() => {}}
        />
      </PrivacyProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Limpar' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(saveEntry).not.toHaveBeenCalled();
    expect(deleteEntry).not.toHaveBeenCalled();
  });

  it('explains a concurrent change and retains the last confirmed value', async () => {
    const user = userEvent.setup();
    const conflict = new Error('The answer changed on another device.');
    conflict.name = 'EntryConflictError';
    vi.mocked(saveEntry).mockRejectedValueOnce(conflict);
    show();
    const card = screen.getByTestId('quick-entry-card-numeric');
    const input = within(card).getByRole('textbox');
    await user.clear(input);
    await user.type(input, '3');
    await user.tab();
    expect(await screen.findByRole('alert')).toHaveTextContent(/outro dispositivo/i);
    await waitFor(() => expect(within(card).getByRole('textbox')).toHaveValue('2'));
  });

  it('keeps the confirmed value when a replacement fails', async () => {
    const user = userEvent.setup();
    vi.mocked(saveEntry).mockRejectedValueOnce(new Error('network'));
    show();
    const card = screen.getByTestId('quick-entry-card-numeric');
    const input = within(card).getByRole('textbox');
    await user.clear(input);
    await user.type(input, '3');
    await user.tab();
    await screen.findByRole('alert');
    await waitFor(() => expect(within(card).getByRole('textbox')).toHaveValue('2'));
  });

  it('does not expose a name or emoji in visible text or accessible control labels', () => {
    const { container } = show();
    expect(container.textContent).not.toContain('Nome particular');
    expect(container.textContent).not.toContain('☕');
    expect(container.querySelector('[aria-label*="Nome particular"]')).toBeNull();
    expect(screen.getByText('NUM')).toBeInTheDocument();
  });
});
