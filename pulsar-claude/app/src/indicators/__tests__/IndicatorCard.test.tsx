import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { StoredIndicator } from '../../data/indicators';
import { EyeToggle } from '../../design';
import { PrivacyProvider } from '../../privacy/PrivacyContext';
import { ArchivedIndicatorCard, IndicatorCard } from '../IndicatorCard';

const indicator: StoredIndicator = {
  id: 'one',
  group: 'factor',
  name: 'Sono privado',
  abbreviation: null,
  emoji: '💤',
  valueType: 'boolean',
  numeric: null,
  scale: null,
  options: null,
  desiredDirection: null,
  idealRange: null,
  frequency: 'single_per_day',
  dailyAggregation: null,
  sortOrder: 1000,
  archivedAt: null,
  lockedAt: null,
  createdAt: null,
  updatedAt: null,
};

describe('indicator cards', () => {
  it('uses the global eye for labels and keeps names out of action attributes', async () => {
    render(
      <PrivacyProvider>
        <EyeToggle />
        <IndicatorCard
          indicator={indicator}
          first={false}
          last={false}
          onMoveUp={vi.fn()}
          onMoveDown={vi.fn()}
          onOpenOptions={vi.fn()}
        />
        <ArchivedIndicatorCard indicator={indicator} onRestore={vi.fn()} />
      </PrivacyProvider>,
    );
    const cards = screen.getAllByTestId('indicator-card');
    for (const card of cards) {
      expect(within(card).getByText('Son...')).toBeInTheDocument();
      expect(card).not.toHaveTextContent('Sono privado');
      expect(card).not.toHaveTextContent('💤');
      for (const element of card.querySelectorAll('[aria-label], [title]')) {
        expect(element.getAttribute('aria-label') ?? '').not.toContain('Son');
        expect(element.getAttribute('title') ?? '').not.toContain('Son');
      }
    }
    await userEvent.click(screen.getByTestId('eye-toggle'));
    for (const card of cards) {
      expect(within(card).getByText('Sono privado')).toBeInTheDocument();
      expect(within(card).getByText('💤')).toBeInTheDocument();
      expect(card.querySelectorAll('[data-indicator-label]')).toHaveLength(1);
    }
  });
});
