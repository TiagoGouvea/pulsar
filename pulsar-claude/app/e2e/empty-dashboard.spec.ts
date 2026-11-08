import type { APIRequestContext } from '@playwright/test';
import firebaseJson from '../firebase.json' with { type: 'json' };
import { currentUid, expect, test } from './fixtures';

const PROJECT = 'demo-pulsar';
const FIRESTORE = `http://127.0.0.1:${firebaseJson.emulators.firestore.port}/v1/projects/${PROJECT}/databases/(default)/documents`;
const OWNER = { Authorization: 'Bearer owner' };

interface FirestoreDocument {
  name: string;
  fields: Record<string, unknown>;
}

async function indicators(uid: string): Promise<FirestoreDocument[]> {
  const response = await fetch(`${FIRESTORE}/users/${uid}/indicators?pageSize=1000`, { headers: OWNER });
  expect(response.ok).toBe(true);
  return ((await response.json()) as { documents?: FirestoreDocument[] }).documents ?? [];
}

async function indicatorByAbbreviation(uid: string, abbreviation: string): Promise<FirestoreDocument> {
  let found: FirestoreDocument | undefined;
  await expect
    .poll(async () => {
      found = (await indicators(uid)).find(
        (document) =>
          (document.fields.abbreviation as { stringValue?: string } | undefined)?.stringValue ===
          abbreviation,
      );
      return found?.name ?? null;
    })
    .not.toBeNull();
  return found!;
}

async function createScaleEntry(request: APIRequestContext, uid: string, indicatorId: string) {
  const response = await request.post(`${FIRESTORE}/users/${uid}/entries`, {
    headers: OWNER,
    data: {
      fields: {
        indicatorId: { stringValue: indicatorId },
        localDate: { stringValue: new Date().toISOString().slice(0, 10) },
        recordedAt: { timestampValue: new Date().toISOString() },
        valueType: { stringValue: 'scale' },
        value: { mapValue: { fields: { number: { doubleValue: 8 } } } },
      },
    },
  });
  expect(response.ok()).toBe(true);
}

test.describe('empty dashboard', () => {
  test('a new account starts without indicators and offers quick suggestions', async ({
    freshUserPage: page,
  }) => {
    const uid = (await currentUid(page))!;
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { level: 1, name: 'Bem-vindo ao Pulsar' })).toBeVisible();
    await expect(page.getByText('Sugestões Científicas Iniciais')).toBeVisible();
    await expect(page.getByText('Nenhum auto-criado')).toBeVisible();
    await expect(page.getByText('4 Prontas')).toBeVisible();

    // Nothing is created until the person taps a suggestion.
    expect(await indicators(uid)).toEqual([]);

    // Names follow the global privacy rule: abbreviations while the eye is closed, names after opening it.
    await expect(page.getByTestId('suggestion-exercise')).toContainText('EXE');
    await expect(page.getByTestId('suggestion-exercise')).not.toContainText('Exercício Físico');
    await page.getByTestId('eye-toggle').click();
    for (const name of ['Exercício Físico', 'Café Expresso', 'Nível de Energia', 'Concentração / Foco']) {
      await expect(page.getByRole('main')).toContainText(name);
    }
    await expect(page.getByTestId('suggestion-exercise')).toContainText('Fator');
    await expect(page.getByTestId('suggestion-energy')).toContainText('Resultado');

    await expect(page.getByTestId('create-own-indicator')).toHaveAttribute('href', '/indicators/new');
  });

  test('a suggestion creates exactly one indicator with the deterministic quick-start configuration', async ({
    freshUserPage: page,
  }) => {
    const uid = (await currentUid(page))!;
    await page.goto('/dashboard');

    const exercise = page.getByTestId('suggestion-exercise');
    await exercise.getByRole('button', { name: 'Adicionar' }).click();
    await expect(exercise).toContainText('Adicionado');
    await expect(exercise.getByRole('button', { name: 'Adicionado' })).toBeDisabled();

    const created = await indicatorByAbbreviation(uid, 'EXE');
    expect(created.fields).toMatchObject({
      name: { stringValue: 'Exercício Físico' },
      abbreviation: { stringValue: 'EXE' },
      emoji: { stringValue: '🏃' },
      group: { stringValue: 'factor' },
      valueType: { stringValue: 'boolean' },
      frequency: { stringValue: 'single_per_day' },
      numeric: { nullValue: null },
      scale: { nullValue: null },
      options: { nullValue: null },
      desiredDirection: { nullValue: null },
      idealRange: { nullValue: null },
      dailyAggregation: { nullValue: null },
      sortOrder: { integerValue: '1000' },
      archivedAt: { nullValue: null },
      lockedAt: { nullValue: null },
    });
    expect(created.fields.createdAt).toHaveProperty('timestampValue');
    expect(await indicators(uid)).toHaveLength(1);
  });

  test('indicators without records explain the insights and the first record is acknowledged', async ({
    freshUserPage: page,
    request,
  }) => {
    const uid = (await currentUid(page))!;
    await page.goto('/dashboard');

    await page.getByTestId('suggestion-energy').getByRole('button', { name: 'Adicionar' }).click();
    const energy = await indicatorByAbbreviation(uid, 'ENE');

    const withoutRecords = page.getByTestId('indicators-without-records');
    await expect(withoutRecords).toBeVisible();
    await expect(withoutRecords).toContainText(/insights/i);
    await expect(withoutRecords).toContainText('Aguardando primeiros dados de registro');

    const indicatorId = energy.name.split('/').at(-1)!;
    await createScaleEntry(request, uid, indicatorId);

    await page.reload();
    const thanks = page.getByTestId('first-record-thanks');
    await expect(thanks).toBeVisible({ timeout: 15_000 });
    await expect(thanks).toContainText('Obrigado pelo primeiro registro');
    await expect(thanks).toContainText(/volte amanhã/i);
    await expect(page.getByTestId('indicators-without-records')).toHaveCount(0);
    // The acknowledgement is discreet: no pressure, streaks or gamification.
    await expect(thanks).not.toContainText(/parabéns|sequência|streak|ofensiva/i);
  });
});
