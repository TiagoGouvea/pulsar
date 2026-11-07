import type { APIRequestContext } from '@playwright/test';
import firebaseJson from '../firebase.json' with { type: 'json' };
import { currentUid, expect, test } from './fixtures';

const PROJECT = 'demo-pulsar';
const FIRESTORE_DOCUMENTS = `http://127.0.0.1:${firebaseJson.emulators.firestore.port}/v1/projects/${PROJECT}/databases/(default)/documents`;

type FirestoreValue = Record<string, unknown> & { nullValue?: unknown };
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

/** Reads the user's indicators straight from the Firestore emulator (rules bypassed as owner). */
async function storedIndicators(
  request: APIRequestContext,
  uid: string,
): Promise<(Record<string, unknown> & { id: string })[]> {
  const response = await request.get(`${FIRESTORE_DOCUMENTS}/users/${uid}/indicators`, {
    headers: { Authorization: 'Bearer owner' },
  });
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { documents?: FirestoreDocument[] };
  return (body.documents ?? []).map((document) => ({
    id: document.name.split('/').pop() ?? '',
    ...decodeFields(document.fields),
  }));
}

test.describe('F-2.03 create indicator', () => {
  test('requires a name, previews the abbreviation and shows the real name with the eye closed', async ({
    freshUserPage: page,
  }) => {
    await page.goto('/indicators/new');
    await expect(page.getByRole('dialog', { name: 'Novo Indicador' })).toBeVisible();
    await expect(page.getByTestId('eye-toggle')).toHaveAttribute('aria-pressed', 'false');

    await page.getByRole('button', { name: 'Criar Indicador' }).click();
    await expect(page.getByText('Informe um nome para o indicador.')).toBeVisible();

    const name = page.getByRole('textbox', { name: /Nome do Indicador/ });
    await expect(name).toHaveAttribute('data-privacy-allow');
    await name.fill('Abcdef');
    await expect(name).toHaveValue('Abcdef');
    await expect(page.getByTestId('abbreviation-preview')).toContainText('Abc...');
  });

  test('creates a numeric result with unit, ideal range and chosen aggregation', async ({
    freshUserPage: page,
    request,
  }) => {
    await page.goto('/indicators/new');
    await page.getByRole('radio', { name: 'Resultado' }).click();
    await page.getByRole('textbox', { name: /Nome do Indicador/ }).fill('Peso matinal');
    await page.getByRole('textbox', { name: 'Sigla' }).fill('PES');
    await page.getByRole('radio', { name: 'Número + unidade' }).click();
    await page.getByRole('combobox', { name: 'Unidade' }).selectOption('kg');
    await page.getByRole('button', { name: 'Múltiplos registros' }).click();

    // Aggregation only appears for multiple-per-day and only lists valid options.
    await expect(page.getByTestId('aggregation-control')).toBeVisible();
    await expect(page.getByTestId('aggregation-suggested')).toHaveText('Último');
    await page.getByRole('button', { name: /Configurações avançadas/ }).click();
    await expect(page.getByTestId('aggregation-control').getByRole('radio')).toHaveCount(3);
    await expect(
      page.getByTestId('aggregation-control').getByRole('radio', { name: 'Presença' }),
    ).toHaveCount(0);
    await page.getByTestId('aggregation-control').getByRole('radio', { name: 'Média' }).click();

    await page.getByRole('button', { name: 'Faixa ideal' }).click();
    await page.getByRole('textbox', { name: 'Mínimo ideal' }).fill('70');
    await page.getByRole('textbox', { name: 'Máximo ideal' }).fill('75');
    await page.getByRole('button', { name: 'Criar Indicador' }).click();

    await expect(page).toHaveURL(/\/indicators$/);
    const uid = await currentUid(page);
    expect(uid).not.toBeNull();
    const indicators = await storedIndicators(request, uid ?? '');
    expect(indicators).toHaveLength(1);
    expect(indicators[0]).toMatchObject({
      name: 'Peso matinal',
      abbreviation: 'PES',
      group: 'result',
      valueType: 'numeric',
      numeric: { unit: 'kg' },
      frequency: 'multiple_per_day',
      dailyAggregation: 'mean',
      desiredDirection: 'target_range',
      idealRange: { min: 70, max: 75 },
    });
  });

  test('creates an ordinal indicator with editable options and no aggregation when single', async ({
    freshUserPage: page,
    request,
  }) => {
    await page.goto('/indicators/new');
    await page.getByRole('textbox', { name: /Nome do Indicador/ }).fill('Humor');
    await page.getByRole('textbox', { name: 'Sigla' }).fill('HUM');
    await page.getByRole('radio', { name: 'Opções ordenadas' }).click();

    await page.getByRole('textbox', { name: 'Opção 1', exact: true }).fill('Ruim');
    await page.getByRole('textbox', { name: 'Opção 2', exact: true }).fill('Regular');
    await page.getByRole('textbox', { name: 'Opção 3', exact: true }).fill('Bom');
    await page.getByRole('button', { name: 'Adicionar opção' }).click();
    await page.getByRole('textbox', { name: 'Opção 4', exact: true }).fill('Excelente');

    // Single-per-day indicators never show aggregation.
    await expect(page.getByTestId('aggregation-control')).toHaveCount(0);
    await page.getByRole('button', { name: 'Emoji 🙂' }).click();
    await page.getByRole('button', { name: 'Criar Indicador' }).click();

    await expect(page).toHaveURL(/\/indicators$/);
    const uid = await currentUid(page);
    const indicators = await storedIndicators(request, uid ?? '');
    expect(indicators).toHaveLength(1);
    expect(indicators[0]).toMatchObject({
      name: 'Humor',
      abbreviation: 'HUM',
      emoji: '🙂',
      group: 'factor',
      valueType: 'ordinal',
      frequency: 'single_per_day',
      dailyAggregation: null,
      desiredDirection: null,
    });
    expect(indicators[0]?.options).toEqual([
      expect.objectContaining({ label: 'Ruim' }),
      expect.objectContaining({ label: 'Regular' }),
      expect.objectContaining({ label: 'Bom' }),
      expect.objectContaining({ label: 'Excelente' }),
    ]);
  });
});
