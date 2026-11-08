import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StoredIndicator } from '../../data/indicators';
import { PrivacyProvider } from '../../privacy/PrivacyContext';
import { EntryHistorySheet } from '../EntryHistorySheet';

const { listIndicatorEntries } = vi.hoisted(() => ({ listIndicatorEntries: vi.fn() }));

vi.mock('../../data/entryHistory', () => ({ listIndicatorEntries }));
vi.mock('../../data/entries', () => ({ deleteEntry: vi.fn() }));

const indicator: StoredIndicator = {
  id: 'ind_energy',
  group: 'result',
  name: 'ZQX_ENERGIA_7F3',
  abbreviation: 'ENE',
  emoji: '⚡',
  valueType: 'scale',
  numeric: null,
  scale: { min: 0, max: 10, step: 1 },
  options: null,
  desiredDirection: 'higher',
  idealRange: null,
  frequency: 'multiple_per_day',
  dailyAggregation: 'mean',
  sortOrder: 1000,
  archivedAt: null,
  lockedAt: null,
  createdAt: null,
  updatedAt: null,
};

const observation = 'ZQX_OBS_NOTA_5T1 reunião longa pela manhã';

function renderSheet() {
  return render(
    <PrivacyProvider>
      <EntryHistorySheet indicator={indicator} uid="seed-user-0001" onClose={() => {}} />
    </PrivacyProvider>,
  );
}

describe('EntryHistorySheet: observations of the privacy mode', () => {
  beforeEach(() => {
    listIndicatorEntries.mockReset();
    listIndicatorEntries.mockResolvedValue([
      {
        id: 'entry-1',
        indicatorId: 'ind_energy',
        localDate: '2026-11-08',
        recordedAt: '2026-11-08T15:00:00Z',
        valueType: 'scale',
        value: { number: 7 },
        note: observation,
      },
    ]);
  });

  it('keeps the observation out of the page until the person opens it explicitly', async () => {
    renderSheet();
    const dialog = await screen.findByRole('dialog', { name: 'Histórico de registros' });
    expect(dialog).not.toHaveTextContent(observation);
    expect(screen.getByRole('button', { name: /ver observação/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /ver observação/i }));
    const note = screen.getByText(observation);
    expect(note).toBeVisible();
    // Revealed on purpose: the privacy guard must ignore this element.
    expect(note).toHaveAttribute('data-privacy-allow');
  });

  it('hides the observation again and keeps the indicator name in its acronym', async () => {
    renderSheet();
    const dialog = await screen.findByRole('dialog', { name: 'Histórico de registros' });
    await userEvent.click(screen.getByRole('button', { name: /ver observação/i }));
    await userEvent.click(screen.getByRole('button', { name: /ocultar observação/i }));
    expect(screen.queryByText(observation)).not.toBeInTheDocument();

    // Eye closed: the indicator is shown as its acronym, without name nor emoji.
    expect(within(dialog).getByText('ENE')).toBeInTheDocument();
    expect(dialog).not.toHaveTextContent('ZQX_ENERGIA_7F3');
    expect(dialog).not.toHaveTextContent('⚡');
  });
});
