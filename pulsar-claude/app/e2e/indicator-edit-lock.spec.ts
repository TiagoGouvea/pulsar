import type { APIRequestContext } from '@playwright/test';
import firebaseJson from '../firebase.json' with { type: 'json' };
import { SEED_UID, expect, test } from './fixtures';

const PROJECT = 'demo-pulsar';
const FIRESTORE_DOCUMENTS = `http://127.0.0.1:${firebaseJson.emulators.firestore.port}/v1/projects/${PROJECT}/databases/(default)/documents`;

type FirestoreValue = Record<string, unknown>;
type FirestoreDocument = { name: string; fields?: Record<string, FirestoreValue> };

function decodeValue(value: FirestoreValue): unknown {
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('timestampValue' in value) return value.timestampValue;
  if ('mapValue' in value) {
    const map = value.mapValue as { fields?: Record<string, FirestoreValue> };
    return decodeFields(map.fields);
  }
  if ('arrayValue' in value) {
    const array = value.arrayValue as { values?: FirestoreValue[] };
    return (array.values ?? []).map(decodeValue);
  }
  return undefined;
}

function decodeFields(fields: Record<string, FirestoreValue> = {}): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}

async function storedIndicator(request: APIRequestContext, id: string): Promise<Record<string, unknown>> {
  const response = await request.get(`${FIRESTORE_DOCUMENTS}/users/${SEED_UID}/indicators/${id}`, {
    headers: { Authorization: 'Bearer owner' },
  });
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as FirestoreDocument;
  return decodeFields(body.fields);
}

// The seed user owns indicators with history (see scripts/seed.ts). Each test edits a different
// indicator, so the two tests never share state.
test.describe('F-2.03 edit indicator with history', () => {
  test('locks group, type, scale, frequency and aggregation but edits direction and ideal range', async ({
    seedPage: page,
    request,
  }, testInfo) => {
    if (testInfo.project.name !== 'mobile') return;

    await page.goto('/indicators/ind_energy/edit');
    await expect(page.getByRole('dialog', { name: 'Editar Indicador' })).toBeVisible();
    await expect(page.getByTestId('locked-notice')).toContainText(/já tem histórico/i);

    // Configuration fields are disabled.
    await expect(page.getByRole('radio', { name: 'Fator' })).toBeDisabled();
    await expect(page.getByRole('radio', { name: 'Resultado' })).toBeDisabled();
    for (const type of ['Sim / Não', 'Escala', 'Número + unidade', 'Opções ordenadas']) {
      await expect(page.getByRole('radio', { name: type })).toBeDisabled();
    }
    await expect(page.getByRole('textbox', { name: 'Mínimo', exact: true })).toBeDisabled();
    await expect(page.getByRole('textbox', { name: 'Máximo', exact: true })).toBeDisabled();
    await expect(page.getByRole('textbox', { name: 'Passo', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: '1x ao dia (Único)' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Múltiplos registros' })).toBeDisabled();

    const aggregation = page.getByTestId('aggregation-control');
    await expect(aggregation.getByRole('radio', { name: 'Média' })).toHaveAttribute('aria-checked', 'true');
    for (const choice of ['Soma', 'Média', 'Último']) {
      await expect(aggregation.getByRole('radio', { name: choice })).toBeDisabled();
    }

    // Name, abbreviation, emoji and direction stay editable.
    await expect(page.getByRole('textbox', { name: /Nome do Indicador/ })).toBeEnabled();
    await expect(page.getByRole('textbox', { name: 'Sigla' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Emoji ⚡' })).toBeEnabled();

    await page.getByRole('button', { name: 'Faixa ideal' }).click();
    await page.getByRole('textbox', { name: 'Mínimo ideal' }).fill('6');
    await page.getByRole('textbox', { name: 'Máximo ideal' }).fill('9');
    await page.getByRole('button', { name: 'Salvar alterações' }).click();

    await expect(page).toHaveURL(/\/indicators$/);
    const stored = await storedIndicator(request, 'ind_energy');
    expect(stored).toMatchObject({
      valueType: 'scale',
      scale: { min: 0, max: 10, step: 1 },
      frequency: 'multiple_per_day',
      dailyAggregation: 'mean',
      desiredDirection: 'target_range',
      idealRange: { min: 6, max: 9 },
    });
  });

  test('locks the unit and preserves it while the result direction changes', async ({
    seedPage: page,
    request,
  }, testInfo) => {
    if (testInfo.project.name !== 'mobile') return;

    await page.goto('/indicators/ind_weight/edit');
    await expect(page.getByRole('dialog', { name: 'Editar Indicador' })).toBeVisible();

    const name = page.getByRole('textbox', { name: /Nome do Indicador/ });
    // The editor shows the real name even with the eye closed (spec 4.4).
    await expect(page.getByTestId('eye-toggle')).toHaveAttribute('aria-pressed', 'false');
    const before = await storedIndicator(request, 'ind_weight');
    await expect(name).toHaveValue(String(before.name));

    await expect(page.getByRole('combobox', { name: 'Unidade' })).toBeDisabled();
    await expect(page.getByRole('combobox', { name: 'Unidade' })).toHaveValue('kg');

    await name.fill('Peso matinal');
    await page.getByRole('button', { name: 'Quanto menor, melhor' }).click();
    await page.getByRole('button', { name: 'Salvar alterações' }).click();

    await expect(page).toHaveURL(/\/indicators$/);
    const stored = await storedIndicator(request, 'ind_weight');
    expect(stored).toMatchObject({
      name: 'Peso matinal',
      valueType: 'numeric',
      numeric: { unit: 'kg' },
      frequency: 'single_per_day',
      dailyAggregation: null,
      desiredDirection: 'lower',
      idealRange: null,
    });
  });
});
