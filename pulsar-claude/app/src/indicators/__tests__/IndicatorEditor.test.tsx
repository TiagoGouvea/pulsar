import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { IndicatorInput } from '../../domain/indicator';
import { PrivacyProvider } from '../../privacy/PrivacyContext';
import { EyeToggle } from '../../design';
import { IndicatorEditor } from '../IndicatorEditor';
import { draftFromIndicator, emptyIndicatorDraft, type IndicatorDraft } from '../draft';

function renderEditor(
  overrides: Partial<IndicatorDraft> = {},
  options: { locked?: boolean; error?: string | null } = {},
) {
  const onSubmit = vi.fn<(input: IndicatorInput) => void>();
  const onCancel = vi.fn();
  render(
    <IndicatorEditor
      initial={{ ...emptyIndicatorDraft(), ...overrides }}
      locked={options.locked}
      submitLabel="Criar Indicador"
      error={options.error}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />,
  );
  return { onSubmit, onCancel };
}

const nameField = () => screen.getByRole('textbox', { name: /Nome do Indicador/ });
const submitButton = () => screen.getByRole('button', { name: 'Criar Indicador' });

async function fillName(user: ReturnType<typeof userEvent.setup>, name = 'Energia') {
  await user.type(nameField(), name);
}

describe('F-2.03 IndicatorEditor: the four response types', () => {
  it('creates a boolean factor', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderEditor();
    await fillName(user, 'Malhei hoje?');
    await user.click(submitButton());

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      group: 'factor',
      valueType: 'boolean',
      numeric: null,
      scale: null,
      options: null,
      desiredDirection: null,
      idealRange: null,
      frequency: 'single_per_day',
      dailyAggregation: null,
    });
  });

  it('creates a scale result with a custom min/max/step', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderEditor();
    await fillName(user, 'Nível de energia');
    await user.click(screen.getByRole('radio', { name: 'Resultado' }));
    await user.click(screen.getByRole('radio', { name: 'Escala' }));

    fireEvent.change(screen.getByRole('textbox', { name: 'Máximo' }), { target: { value: '7' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Passo' }), { target: { value: '2' } });
    await user.click(submitButton());

    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      group: 'result',
      valueType: 'scale',
      scale: { min: 0, max: 7, step: 2 },
      numeric: null,
      options: null,
      desiredDirection: 'neutral',
    });
  });

  it('creates a numeric factor with a suggested unit', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderEditor();
    await fillName(user, 'Café');
    await user.click(screen.getByRole('radio', { name: 'Número + unidade' }));
    await user.selectOptions(screen.getByLabelText('Unidade'), 'mg');
    await user.click(submitButton());

    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      valueType: 'numeric',
      numeric: { unit: 'mg', min: null, max: null, step: 1 },
      scale: null,
      options: null,
    });
  });

  it('creates a numeric indicator with a custom unit and no unit', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderEditor();
    await fillName(user, 'Suplemento');
    await user.click(screen.getByRole('radio', { name: 'Número + unidade' }));
    await user.selectOptions(screen.getByLabelText('Unidade'), 'Outra unidade…');
    await user.type(screen.getByLabelText('Unidade personalizada'), 'gotas');
    await user.click(submitButton());

    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ numeric: { unit: 'gotas' } });
  });

  it('creates an ordinal factor with editable options and a limited set', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderEditor();
    await fillName(user, 'Intensidade');
    await user.click(screen.getByRole('radio', { name: 'Opções ordenadas' }));

    const first = screen.getByLabelText('Opção 1');
    await user.clear(first);
    await user.type(first, 'Leve');
    await user.click(screen.getByRole('button', { name: 'Adicionar opção' }));
    await user.type(screen.getByLabelText('Opção 4'), 'Intenso');
    await user.click(screen.getByRole('button', { name: 'Emoji ⚡' }));
    await user.click(submitButton());

    const input = onSubmit.mock.calls[0]?.[0];
    expect(input?.valueType).toBe('ordinal');
    expect(input?.options?.map((option) => option.label)).toEqual(['Leve', 'Médio', 'Muito', 'Intenso']);
    expect(input?.options?.every((option) => option.id.length > 0)).toBe(true);
    expect(input?.emoji).toBe('⚡');
  });
});

describe('F-2.03 IndicatorEditor: identification and privacy', () => {
  it('requires a name and shows the validation message in pt-BR', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderEditor();
    await user.click(submitButton());

    expect(screen.getByText('Informe um nome para o indicador.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    await fillName(user, 'Café');
    await user.click(submitButton());
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('previews the derived abbreviation when the abbreviation is empty', async () => {
    const user = userEvent.setup();
    renderEditor();
    const preview = screen.getByTestId('abbreviation-preview');
    expect(preview).toHaveTextContent('...');

    await fillName(user, 'Abcdef');
    expect(preview).toHaveTextContent('Abc...');

    await user.type(screen.getByRole('textbox', { name: 'Sigla' }), 'XYZ');
    expect(preview).toHaveTextContent('XYZ');
    expect(preview).not.toHaveTextContent('Abc...');
  });

  it('shows the real name in the field with the eye closed (data-privacy-allow)', async () => {
    const user = userEvent.setup();
    render(
      <PrivacyProvider>
        <EyeToggle />
        <IndicatorEditor
          initial={emptyIndicatorDraft()}
          submitLabel="Criar Indicador"
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      </PrivacyProvider>,
    );

    const eye = screen.getByTestId('eye-toggle');
    expect(eye).toHaveAttribute('aria-pressed', 'false');
    const field = nameField();
    expect(field).toHaveAttribute('data-privacy-allow');

    await user.type(field, 'Nível de Energia');
    expect(field).toHaveValue('Nível de Energia');
    expect(screen.getByDisplayValue('Nível de Energia')).toBeVisible();
  });
});

describe('F-2.03 IndicatorEditor: pt-BR validation messages', () => {
  it('limits the abbreviation to 4 characters', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderEditor();
    await fillName(user, 'Café');
    fireEvent.change(screen.getByRole('textbox', { name: 'Sigla' }), { target: { value: 'ABCDE' } });
    await user.click(submitButton());

    expect(screen.getByText('A sigla deve ter no máximo 4 caracteres.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('requires scale minimum smaller than maximum and a positive step', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderEditor();
    await fillName(user, 'Energia');
    await user.click(screen.getByRole('radio', { name: 'Escala' }));

    fireEvent.change(screen.getByRole('textbox', { name: 'Máximo' }), { target: { value: '0' } });
    await user.click(submitButton());
    expect(screen.getByText('O mínimo deve ser menor que o máximo.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('textbox', { name: 'Máximo' }), { target: { value: '10' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Passo' }), { target: { value: '0' } });
    await user.click(submitButton());
    expect(screen.getByText('O passo deve ser maior que zero.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('requires every ordinal option to have a label', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderEditor();
    await fillName(user, 'Humor');
    await user.click(screen.getByRole('radio', { name: 'Opções ordenadas' }));
    await user.clear(screen.getByLabelText('Opção 2'));
    await user.click(submitButton());

    expect(screen.getByText('Todas as opções precisam de um nome.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('requires an ideal range with minimum <= maximum', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderEditor();
    await fillName(user, 'Peso');
    await user.click(screen.getByRole('radio', { name: 'Resultado' }));
    await user.click(screen.getByRole('radio', { name: 'Número + unidade' }));
    await user.click(screen.getByRole('button', { name: 'Faixa ideal' }));

    fireEvent.change(screen.getByRole('textbox', { name: 'Mínimo ideal' }), { target: { value: '9' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Máximo ideal' }), { target: { value: '5' } });
    await user.click(submitButton());
    expect(
      screen.getByText('O mínimo da faixa ideal deve ser menor ou igual ao máximo.'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('textbox', { name: 'Mínimo ideal' }), { target: { value: '5' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Máximo ideal' }), { target: { value: '9' } });
    await user.click(submitButton());
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      desiredDirection: 'target_range',
      idealRange: { min: 5, max: 9 },
    });
  });
});

describe('F-2.03 IndicatorEditor: frequency and aggregation', () => {
  it('hides aggregation for single-per-day and shows it for multiple', async () => {
    const user = userEvent.setup();
    renderEditor();
    expect(screen.queryByTestId('aggregation-control')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Múltiplos registros' }));
    expect(screen.getByTestId('aggregation-control')).toBeInTheDocument();
    expect(screen.getByTestId('aggregation-suggested')).toHaveTextContent('Presença');
  });

  it('advanced settings list only valid aggregations and show an example', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderEditor();
    await fillName(user, 'Café');
    await user.click(screen.getByRole('radio', { name: 'Número + unidade' }));
    await user.click(screen.getByRole('button', { name: 'Múltiplos registros' }));

    expect(screen.getByTestId('aggregation-suggested')).toHaveTextContent('Soma');
    await user.click(screen.getByRole('button', { name: /Configurações avançadas/ }));

    const control = screen.getByTestId('aggregation-control');
    const choices = within(control).getAllByRole('radio');
    expect(choices.map((choice) => choice.textContent)).toEqual(['Soma', 'Média', 'Último']);
    expect(within(control).queryByRole('radio', { name: 'Presença' })).not.toBeInTheDocument();
    expect(control).toHaveTextContent('o dia vale a soma: 5');

    await user.click(within(control).getByRole('radio', { name: 'Média' }));
    expect(control).toHaveTextContent('o dia vale a média: 6');
    await user.click(submitButton());
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      frequency: 'multiple_per_day',
      dailyAggregation: 'mean',
    });
  });

  it('offers only presence and last for booleans', async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.click(screen.getByRole('button', { name: 'Múltiplos registros' }));
    await user.click(screen.getByRole('button', { name: /Configurações avançadas/ }));

    const control = screen.getByTestId('aggregation-control');
    expect(
      within(control)
        .getAllByRole('radio')
        .map((choice) => choice.textContent),
    ).toEqual(['Presença', 'Último']);
    expect(within(control).queryByRole('radio', { name: 'Soma' })).not.toBeInTheDocument();
    expect(control).toHaveTextContent('Se qualquer registro do dia for “Sim”, o dia vale “Sim”.');
  });
});

describe('F-2.03 IndicatorEditor: desired direction', () => {
  it('defaults to "Sem preferência" and only offers the ideal range for numeric/scale', async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.click(screen.getByRole('radio', { name: 'Resultado' }));

    expect(screen.getByRole('button', { name: 'Sem preferência' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: 'Faixa ideal' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Escala' }));
    expect(screen.getByRole('button', { name: 'Faixa ideal' })).toBeInTheDocument();
  });

  it('saves the chosen direction for results', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderEditor();
    await fillName(user, 'Dor');
    await user.click(screen.getByRole('radio', { name: 'Resultado' }));
    await user.click(screen.getByRole('button', { name: 'Quanto menor, melhor' }));
    await user.click(submitButton());

    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      group: 'result',
      desiredDirection: 'lower',
      idealRange: null,
    });
  });
});

describe('F-2.03 IndicatorEditor: edit lock with history', () => {
  const lockedIndicator: IndicatorInput = {
    group: 'result',
    name: 'Peso',
    abbreviation: 'PES',
    emoji: null,
    valueType: 'numeric',
    numeric: { unit: 'kg', min: 0, max: null, step: 0.1 },
    scale: null,
    options: null,
    desiredDirection: 'target_range',
    idealRange: { min: 70, max: 75 },
    frequency: 'multiple_per_day',
    dailyAggregation: 'last',
  };

  it('disables type, group, unit, frequency and aggregation but keeps direction and range editable', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderEditor(draftFromIndicator(lockedIndicator), { locked: true });

    expect(screen.getByTestId('locked-notice')).toHaveTextContent(/já tem histórico/i);
    expect(screen.getByRole('radio', { name: 'Resultado' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Fator' })).toBeDisabled();
    for (const type of ['Sim / Não', 'Escala', 'Número + unidade', 'Opções ordenadas']) {
      expect(screen.getByRole('radio', { name: type })).toBeDisabled();
    }
    expect(screen.getByLabelText('Unidade')).toBeDisabled();
    expect(screen.getByLabelText('Unidade')).toHaveValue('kg');
    expect(screen.getByRole('button', { name: '1x ao dia (Único)' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Múltiplos registros' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Configurações avançadas/ })).toBeDisabled();

    const aggregation = screen.getByTestId('aggregation-control');
    const aggregationChoices = within(aggregation).getAllByRole('radio');
    expect(aggregationChoices.map((choice) => choice.textContent)).toEqual(['Soma', 'Média', 'Último']);
    aggregationChoices.forEach((choice) => expect(choice).toBeDisabled());
    expect(within(aggregation).getByRole('radio', { name: 'Último' })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    // Editable fields stay enabled.
    expect(nameField()).toBeEnabled();
    expect(screen.getByRole('textbox', { name: 'Sigla' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Quanto maior, melhor' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Faixa ideal' })).toBeEnabled();
    expect(screen.getByRole('textbox', { name: 'Mínimo ideal' })).toBeEnabled();
    expect(screen.getByRole('textbox', { name: 'Máximo ideal' })).toBeEnabled();

    await user.clear(nameField());
    await user.type(nameField(), 'Peso matinal');
    await user.click(screen.getByRole('button', { name: 'Quanto maior, melhor' }));
    await user.click(submitButton());

    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      name: 'Peso matinal',
      valueType: 'numeric',
      numeric: { unit: 'kg', min: 0, max: null, step: 0.1 },
      frequency: 'multiple_per_day',
      dailyAggregation: 'last',
      desiredDirection: 'higher',
      idealRange: null,
    });
  });

  it('shows a generic save error in pt-BR', () => {
    renderEditor({}, { error: 'Não foi possível salvar o indicador. Tente novamente.' });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível salvar o indicador. Tente novamente.',
    );
  });
});
