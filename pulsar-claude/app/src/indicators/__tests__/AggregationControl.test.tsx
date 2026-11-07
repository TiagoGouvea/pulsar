import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ValueType } from '../../domain/indicator';
import { AggregationControl } from '../AggregationControl';

function renderControl(
  valueType: ValueType,
  frequency: 'single_per_day' | 'multiple_per_day' = 'multiple_per_day',
  group: 'factor' | 'result' = 'factor',
  options: { value?: 'sum' | 'mean' | 'last' | 'any'; disabled?: boolean } = {},
) {
  const onChange = vi.fn();
  const view = render(
    <AggregationControl
      group={group}
      valueType={valueType}
      frequency={frequency}
      value={options.value ?? 'sum'}
      onChange={onChange}
      disabled={options.disabled}
    />,
  );
  return { ...view, onChange };
}

describe('F-2.03 AggregationControl', () => {
  it('renders nothing for single-per-day indicators', () => {
    const { container } = renderControl('numeric', 'single_per_day');
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the deterministic suggestion for numbers (factor = sum, result = last)', () => {
    const { unmount } = renderControl('numeric', 'multiple_per_day', 'factor');
    expect(screen.getByTestId('aggregation-suggested')).toHaveTextContent('Soma');
    unmount();

    renderControl('numeric', 'multiple_per_day', 'result');
    expect(screen.getByTestId('aggregation-suggested')).toHaveTextContent('Último');
  });

  it('lists only the valid aggregations for the type and explains the effect', async () => {
    const user = userEvent.setup();
    const { onChange, rerender } = renderControl('scale', 'multiple_per_day', 'factor', { value: 'mean' });
    expect(screen.getByTestId('aggregation-suggested')).toHaveTextContent('Média');

    await user.click(screen.getByRole('button', { name: /Configurações avançadas/ }));
    const control = screen.getByTestId('aggregation-control');
    const choices = within(control).getAllByRole('radio');
    expect(choices.map((choice) => choice.textContent)).toEqual(['Soma', 'Média', 'Último']);
    expect(within(control).queryByRole('radio', { name: 'Presença' })).not.toBeInTheDocument();
    expect(control).toHaveTextContent('média: 6');

    await user.click(within(control).getByRole('radio', { name: 'Último' }));
    expect(onChange).toHaveBeenCalledWith('last');
    rerender(
      <AggregationControl
        group="factor"
        valueType="scale"
        frequency="multiple_per_day"
        value="last"
        onChange={onChange}
      />,
    );
    expect(screen.getByTestId('aggregation-control')).toHaveTextContent('último valor: 8');
  });

  it('offers presence and last for booleans, with an example of the day value', async () => {
    const user = userEvent.setup();
    renderControl('boolean', 'multiple_per_day', 'factor', { value: 'any' });
    expect(screen.getByTestId('aggregation-suggested')).toHaveTextContent('Presença');

    await user.click(screen.getByRole('button', { name: /Configurações avançadas/ }));
    const control = screen.getByTestId('aggregation-control');
    expect(
      within(control)
        .getAllByRole('radio')
        .map((choice) => choice.textContent),
    ).toEqual(['Presença', 'Último']);
    expect(control).toHaveTextContent('Se qualquer registro do dia for “Sim”, o dia vale “Sim”.');
  });

  it('offers only last for ordinals', async () => {
    const user = userEvent.setup();
    renderControl('ordinal', 'multiple_per_day', 'result', { value: 'last' });
    expect(screen.getByTestId('aggregation-suggested')).toHaveTextContent('Último');

    await user.click(screen.getByRole('button', { name: /Configurações avançadas/ }));
    const control = screen.getByTestId('aggregation-control');
    expect(
      within(control)
        .getAllByRole('radio')
        .map((choice) => choice.textContent),
    ).toEqual(['Último']);
    expect(control).toHaveTextContent('última opção: “Bom”');
  });

  it('keeps the locked choice visible and disabled with an explanation', () => {
    renderControl('numeric', 'multiple_per_day', 'result', { value: 'mean', disabled: true });
    const control = screen.getByTestId('aggregation-control');
    expect(within(control).getByRole('radio', { name: 'Média' })).toHaveAttribute('aria-checked', 'true');
    within(control)
      .getAllByRole('radio')
      .forEach((choice) => expect(choice).toBeDisabled());
    expect(screen.getByRole('button', { name: /Configurações avançadas/ })).toBeDisabled();
    expect(control).toHaveTextContent('Travada após o primeiro registro');
  });
});
