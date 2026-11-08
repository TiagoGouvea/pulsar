import type { APIRequestContext, Page } from '@playwright/test';
import firebaseJson from '../firebase.json' with { type: 'json' };
import { currentUid, expect, test } from './fixtures';

const firestore = `http://127.0.0.1:${firebaseJson.emulators.firestore.port}/v1/projects/demo-pulsar/databases/(default)/documents`;
const owner = { Authorization: 'Bearer owner' };
const nullValue = { nullValue: null };
const string = (value: string) => ({ stringValue: value });
const number = (value: number) => ({ integerValue: String(value) });
const map = (fields: Record<string, unknown>) => ({ mapValue: { fields } });

type StoredDocument = { fields: Record<string, unknown> };

async function add(page: Page, key: string) {
  const card = page.getByTestId(`suggestion-${key}`);
  await card.getByRole('button', { name: 'Adicionar' }).click();
  await expect(card.getByRole('button', { name: 'Adicionado' })).toBeDisabled();
}

async function getIndicator(request: APIRequestContext, uid: string, key: string): Promise<StoredDocument> {
  const response = await request.get(`${firestore}/users/${uid}/indicators/suggestion-${key}`, {
    headers: owner,
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as StoredDocument;
}

async function patchIndicator(
  request: APIRequestContext,
  uid: string,
  key: string,
  fields: Record<string, unknown>,
) {
  const mask = Object.keys(fields)
    .map((field) => `updateMask.fieldPaths=${field}`)
    .join('&');
  const response = await request.patch(`${firestore}/users/${uid}/indicators/suggestion-${key}?${mask}`, {
    headers: owner,
    data: { fields },
  });
  expect(response.ok()).toBe(true);
}

async function addEntry(request: APIRequestContext, uid: string, key: string, day: string) {
  const response = await request.post(`${firestore}/users/${uid}/entries`, {
    headers: owner,
    data: {
      fields: {
        indicatorId: string(`suggestion-${key}`),
        localDate: string(day),
        recordedAt: { timestampValue: new Date().toISOString() },
        valueType: string('scale'),
        value: map({ number: number(8) }),
      },
    },
  });
  expect(response.ok()).toBe(true);
}

const common = {
  options: nullValue,
  archivedAt: nullValue,
  lockedAt: nullValue,
  dailyAggregation: nullValue,
  idealRange: nullValue,
  numeric: nullValue,
  scale: nullValue,
};

const expected = {
  exercise: {
    ...common,
    name: string('Exercício Físico'),
    abbreviation: string('EXE'),
    emoji: string('🏃'),
    group: string('factor'),
    valueType: string('boolean'),
    frequency: string('single_per_day'),
    desiredDirection: nullValue,
    sortOrder: number(1000),
  },
  coffee: {
    ...common,
    name: string('Café Expresso'),
    abbreviation: string('CAF'),
    emoji: string('☕'),
    group: string('factor'),
    valueType: string('numeric'),
    frequency: string('multiple_per_day'),
    numeric: map({ unit: string('xícaras'), min: number(0), max: nullValue, step: number(1) }),
    desiredDirection: nullValue,
    dailyAggregation: string('sum'),
    sortOrder: number(2000),
  },
  energy: {
    ...common,
    name: string('Nível de Energia'),
    abbreviation: string('ENE'),
    emoji: string('⚡'),
    group: string('result'),
    valueType: string('scale'),
    frequency: string('single_per_day'),
    scale: map({ min: number(0), max: number(10), step: number(1) }),
    desiredDirection: string('higher'),
    sortOrder: number(1000),
  },
  focus: {
    ...common,
    name: string('Concentração / Foco'),
    abbreviation: string('CON'),
    emoji: nullValue,
    group: string('result'),
    valueType: string('scale'),
    frequency: string('single_per_day'),
    scale: map({ min: number(0), max: number(10), step: number(1) }),
    desiredDirection: string('target_range'),
    idealRange: map({ min: number(7), max: number(10) }),
    sortOrder: number(2000),
  },
};

test('all four suggestions persist their full deterministic configuration and survive reload', async ({
  freshUserPage: page,
  request,
}) => {
  const uid = (await currentUid(page))!;
  await page.goto('/dashboard');
  for (const [key, fields] of Object.entries(expected)) {
    await add(page, key);
    const document = await getIndicator(request, uid, key);
    expect(document.fields).toMatchObject(fields);
    expect(document.fields.createdAt).toHaveProperty('timestampValue');
    expect(document.fields.updatedAt).toHaveProperty('timestampValue');
    expect(Object.keys(document.fields).sort()).toEqual(
      [...Object.keys(fields), 'createdAt', 'updatedAt'].sort(),
    );
  }
  await page.reload();
  for (const key of Object.keys(expected)) {
    await expect(
      page.getByTestId(`suggestion-${key}`).getByRole('button', { name: 'Adicionado' }),
    ).toBeDisabled();
  }
});

test('an unrelated duplicate abbreviation does not disable a suggestion', async ({
  freshUserPage: page,
  request,
}) => {
  const uid = (await currentUid(page))!;
  await page.goto('/dashboard');
  await add(page, 'exercise');
  await patchIndicator(request, uid, 'exercise', {
    abbreviation: string('ENE'),
    name: string('Outro indicador'),
  });
  await page.reload();
  await expect(
    page.getByTestId('suggestion-exercise').getByRole('button', { name: 'Adicionado' }),
  ).toBeDisabled();
  await add(page, 'energy');
  expect((await getIndicator(request, uid, 'exercise')).fields.name).toEqual(string('Outro indicador'));
  expect((await getIndicator(request, uid, 'energy')).fields.name).toEqual(string('Nível de Energia'));
});

test('concurrent creation on two tabs does not duplicate or overwrite a suggestion', async ({
  freshUserPage: page,
  request,
}) => {
  const uid = (await currentUid(page))!;
  await page.goto('/dashboard');
  const other = await page.context().newPage();
  await other.goto('/dashboard');
  await expect(
    other.getByTestId('suggestion-exercise').getByRole('button', { name: 'Adicionar' }),
  ).toBeVisible();
  await Promise.all([add(page, 'exercise'), add(other, 'exercise')]);
  const response = await request.get(`${firestore}/users/${uid}/indicators`, { headers: owner });
  expect(response.ok()).toBe(true);
  const result = (await response.json()) as { documents: StoredDocument[] };
  expect(result.documents).toHaveLength(1);
  await patchIndicator(request, uid, 'exercise', { name: string('Exercício personalizado') });
  await page.reload();
  await expect(
    page.getByTestId('suggestion-exercise').getByRole('button', { name: 'Adicionado' }),
  ).toBeDisabled();
  expect((await getIndicator(request, uid, 'exercise')).fields.name).toEqual(
    string('Exercício personalizado'),
  );
  await other.close();
});

test('archived entries do not hide the empty states for active indicators', async ({
  freshUserPage: page,
  request,
}) => {
  const uid = (await currentUid(page))!;
  await page.goto('/dashboard');
  await add(page, 'energy');
  await addEntry(request, uid, 'energy', '2026-01-01');
  await patchIndicator(request, uid, 'energy', { archivedAt: { timestampValue: new Date().toISOString() } });
  await page.reload();
  await expect(page.getByText('Sua rotina, seus dados, suas conclusões')).toBeVisible();
  await expect(page.getByTestId('suggestion-coffee')).toBeVisible();
  await add(page, 'focus');
  await expect(page.getByTestId('indicators-without-records')).toBeVisible();
  await expect(page.getByTestId('first-record-thanks')).toHaveCount(0);
});

test('first filling with several indicators is acknowledged until a second day is recorded', async ({
  freshUserPage: page,
  request,
}) => {
  const uid = (await currentUid(page))!;
  await page.goto('/dashboard');
  await add(page, 'energy');
  await add(page, 'focus');
  await addEntry(request, uid, 'energy', '2026-01-01');
  await addEntry(request, uid, 'focus', '2026-01-01');
  await page.reload();
  await expect(page.getByTestId('first-record-thanks')).toBeVisible();
  await addEntry(request, uid, 'energy', '2026-01-02');
  await page.reload();
  await expect(page.getByTestId('first-record-thanks')).toHaveCount(0);
  await expect(page.getByText('3 registros no seu histórico')).toBeVisible();
});
