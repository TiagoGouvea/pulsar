import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PrivacyProvider } from '../../privacy/PrivacyContext';
import { EyeToggle } from '../EyeToggle';
import { IndicatorLabel } from '../IndicatorLabel';

describe('IndicatorLabel + EyeToggle', () => {
  it('starts with abbreviations and toggles names and emoji', async () => {
    render(
      <PrivacyProvider>
        <EyeToggle />
        <IndicatorLabel indicator={{ name: 'Nível de Energia', abbreviation: 'ENE', emoji: '⚡' }} />
      </PrivacyProvider>,
    );
    const eye = screen.getByTestId('eye-toggle');
    expect(eye).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('ENE')).toBeInTheDocument();
    expect(screen.queryByText('Nível de Energia')).not.toBeInTheDocument();
    expect(screen.queryByText('⚡')).not.toBeInTheDocument();

    await userEvent.click(eye);
    expect(eye).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Nível de Energia')).toBeInTheDocument();
    expect(screen.getByText('⚡')).toBeInTheDocument();
  });
});
