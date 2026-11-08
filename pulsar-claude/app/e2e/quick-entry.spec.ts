/**
 * E2E acceptance tests for F-2.08 (Preenchimento rápido). Written before the implementation.
 *
 * Observable contract of the /register screen (see also src/entry/__tests__/QuickEntry.test.tsx):
 *  - Sections "Fatores" and "Resultados" with the ACTIVE indicators in sortOrder (archived ones
 *    never render), cards exposed as data-testid=`quick-entry-card-${id}`, per-day events of
 *    multiple-per-day indicators as data-testid="entry-event", save feedback as
 *    data-testid="save-feedback" ("Salvando…/pendente" while pending, "Salvo/Sincronizado" only
 *    after persisting, spec 5.4).
 *  - Answers persist through the records repository (Firestore entries with the browser
 *    localDate day key, UTC timestamps, spec 5.2); no field is required and no completeness
 *    alert exists (spec 5.4); "Voltar ao Dashboard" returns in one touch (spec 7.2).
 *
 * Determinism: no real-clock assertions (the day key is computed the same way the seed and the
 * app do it), no @visual markers, and the offline case relies only on Firestore's pending
 * write queue. Fixture data is written straight into the Firestore emulator through its REST
 * API (rules bypassed as owner), which works today.
 */
import type { APIRequestContext } from '@playwright/test';
import firebaseJson from '../firebase.json' with { type: 'json' };
import { SENTINELS as SEED_SENTINELS } from '../scripts/seed-data';
import { currentUid, expect, test } from './fixtures';
import { SENTINELS, visibleTextOutsideAllowList } from './support';

const PROJECT = 'demo-pulsar';
const FIRESTORE_DOCUMENTS = `http://127.0.0.1:${firebaseJson.emulators.firestore.port}/v1/projects/${PROJECT}/databases/(default)/documents`;
const HEADERS = { Authorization: 'Bearer owner' };

type FirestoreValue = Record<string, unknown> & {
  nullValue?: unknown;
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  timestampValue?: string;
  mapValue?: { fields?: Record<string, FirestoreValue> };
};
type FirestoreDocument = { name: string; fields?: Record<string, FirestoreValue> };

function encodeValue(value: unknown): FirestoreValue {
  if (value === null) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === 'string') return { stringValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value as Record<string, unknown>).map(([key, inner]) => [key, encodeValue(inner)]),
        ),
      },
    };
  }
  throw new Error(`Unsupported Firestore value: ${String(value)}`);
}

function encodeFields(data: Record<string, unknown>): Record<string, FirestoreValue> {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encodeValue(value)]));
}

function decodeValue(value: FirestoreValue): unknown {
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('timestampValue' in value) return value.timestampValue;
  if ('mapValue' in value) return decodeFields(value.mapValue?.fields);
  return undefined;
}

function decodeFields(fields: Record<string, FirestoreValue> = {}): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}

/** Day key the same way the app computes it (browser timezone) and the seed does (São Paulo). */
function saoPauloToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

/** Writes an indicator straight into the Firestore emulator (same shape as scripts/seed.ts). */
async function createIndicator(
  request: APIRequestContext,
  uid: string,
  indicator: IndicatorSeedDoc,
): Promise<void> {
  const { id, ...fields } = indicator;
  const response = await request.patch(`${FIRESTORE_DOCUMENTS}/users/${uid}/indicators/${id}`, {
    headers: HEADERS,
    data: { fields: encodeFields(fields) },
  });
  expect(response.ok(), `indicator write failed: ${response.status()}`).toBeTruthy();
}

/** Writes an entry straight into the Firestore emulator (today in São Paulo by default). */
async function createEntry(
  request: APIRequestContext,
  uid: string,
  entry: { id: string; indicatorId: string; value: Record<string, unknown> },
): Promise<void> {
  const fields = {
    indicatorId: entry.indicatorId,
    localDate: saoPauloToday(),
    recordedAt: new Date(),
    valueType: 'numeric',
    value: entry.value,
    note: null,
  };
  const response = await request.patch(`${FIRESTORE_DOCUMENTS}/users/${uid}/entries/${entry.id}`, {
    headers: HEADERS,
    data: { fields: encodeFields(fields) },
  });
  expect(response.ok(), `entry write failed: ${response.status()}`).toBeTruthy();
}

/** A Firestore document of the user's entries, decoded to plain values. */
type StoredEntryDoc = { id: string } & Record<string, unknown>;

/** Today's entries of the given user, read straight from the Firestore emulator. */
async function listTodayEntries(request: APIRequestContext, uid: string): Promise<StoredEntryDoc[]> {
  const response = await request.get(`${FIRESTORE_DOCUMENTS}/users/${uid}/entries`, {
    headers: HEADERS,
    params: { pageSize: '300' },
  });
  expect(response.ok(), `entry list failed: ${response.status()}`).toBeTruthy();
  const body = (await response.json()) as { documents?: FirestoreDocument[] };
  const today = saoPauloToday();
  return (body.documents ?? [])
    .map((document): StoredEntryDoc => ({
      id: document.name.split('/').pop() ?? '',
      ...decodeFields(document.fields),
    }))
    .filter((entry) => entry.localDate === today);
}

/** An indicator document as the seed script writes it, with the id kept addressable. */
type IndicatorSeedDoc = { id: string } & Record<string, unknown>;

function indicatorDoc(overrides: { id: string } & Record<string, unknown>): IndicatorSeedDoc {
  const base: Record<string, unknown> = {
    group: 'factor',
    name: 'Indicador',
    abbreviation: null,
    emoji: null,
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
    createdAt: new Date('2026-10-01T12:00:00Z'),
    updatedAt: new Date('2026-10-01T12:00:00Z'),
  };
  return { ...base, ...overrides };
}

const EXERCISE = indicatorDoc({ id: 'ind_exercise', name: 'Exercício', abbreviation: 'EXE', emoji: '🏃' });
const ENERGY = indicatorDoc({
  id: 'ind_energy',
  group: 'result',
  name: 'Nível de energia',
  abbreviation: 'ENE',
  valueType: 'scale',
  scale: { min: 0, max: 10, step: 1 },
  desiredDirection: 'higher',
  sortOrder: 2000,
});
const SLEEP = indicatorDoc({
  id: 'ind_sleep',
  name: 'Sono',
  abbreviation: 'SON',
  valueType: 'numeric',
  numeric: { unit: 'horas', min: 0, max: 24, step: 0.5 },
  sortOrder: 3000,
});
const COFFEE = indicatorDoc({
  id: 'ind_coffee',
  name: 'Café',
  abbreviation: 'CAF',
  valueType: 'numeric',
  numeric: { unit: 'xícaras', min: 0, max: null, step: 0.5 },
  frequency: 'multiple_per_day',
  dailyAggregation: 'sum',
  sortOrder: 4000,
});

test.describe('F-2.08 quick entry (/register)', () => {
  test('groups the active indicators under Fatores/Resultados in order and hides archived', async ({
    seedPage: page,
  }) => {
    await page.goto('/dashboard');
    await page.getByRole('link', { name: 'Registrar agora' }).click();
    await expect(page).toHaveURL(/\/register$/);

    await expect(page.getByRole('heading', { name: 'Fatores' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Resultados' })).toBeVisible();

    // Active indicators only, each group in sortOrder (factors first, results after).
    const cards = page.getByTestId(/^quick-entry-card-/);
    await expect(cards).toHaveCount(9);
    expect(
      await cards.evaluateAll((elements) => elements.map((el) => el.getAttribute('data-testid'))),
    ).toEqual([
      'quick-entry-card-ind_exercise',
      'quick-entry-card-ind_sleep',
      'quick-entry-card-ind_coffee',
      'quick-entry-card-ind_meditation',
      'quick-entry-card-ind_energy',
      'quick-entry-card-ind_focus',
      'quick-entry-card-ind_headache',
      'quick-entry-card-ind_mood',
      'quick-entry-card-ind_weight',
    ]);
    await expect(page.getByTestId('quick-entry-card-ind_q10')).toHaveCount(0);

    // Privacy: the eye starts closed, so the sentinel names of the seed stay hidden.
    await expect(page.getByTestId('eye-toggle')).toHaveAttribute('aria-pressed', 'false');
    const hiddenText = await visibleTextOutsideAllowList(page);
    for (const sentinel of SENTINELS) expect(hiddenText).not.toContain(sentinel);

    // Opening the eye reveals the full names on the register screen.
    await page.getByTestId('eye-toggle').click();
    await expect(page.getByTestId('quick-entry-card-ind_energy')).toContainText(SEED_SENTINELS.energy);
  });

  test('saves only one factor, persists with the local day key and returns in one touch', async ({
    freshUserPage: page,
    request,
  }) => {
    const uid = (await currentUid(page)) ?? '';
    await createIndicator(request, uid, EXERCISE);
    await createIndicator(request, uid, ENERGY);
    await page.goto('/register');

    const card = page.getByTestId('quick-entry-card-ind_exercise');
    await card.getByRole('button', { name: 'Sim' }).click();

    // Success feedback only after the write persisted (spec 5.4).
    await expect(page.getByTestId('save-feedback')).toContainText(/salvo|sincronizado/i, {
      timeout: 15_000,
    });

    const entries = await listTodayEntries(request, uid);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      indicatorId: 'ind_exercise',
      localDate: saoPauloToday(),
      valueType: 'boolean',
      value: { boolean: true },
    });
    expect(Date.parse(String(entries[0]?.recordedAt))).not.toBeNaN();

    // Partially filled day: no completeness alert, no required-field warning (spec 5.4).
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(await visibleTextOutsideAllowList(page)).not.toMatch(/faltando responder|obrigat/i);

    // One touch back to the dashboard (spec 5.1.6).
    await page.getByRole('button', { name: /voltar ao dashboard/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('saves only one result from the scale pills', async ({ freshUserPage: page, request }) => {
    const uid = (await currentUid(page)) ?? '';
    await createIndicator(request, uid, EXERCISE);
    await createIndicator(request, uid, ENERGY);
    await page.goto('/register');

    const card = page.getByTestId('quick-entry-card-ind_energy');
    await card.getByRole('radio', { name: '7' }).click();

    await expect(page.getByTestId('save-feedback')).toContainText(/salvo|sincronizado/i);
    const entries = await listTodayEntries(request, uid);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      indicatorId: 'ind_energy',
      localDate: saoPauloToday(),
      value: { number: 7 },
    });
  });

  test('clearing a single-per-day answer removes today record (absence, not Não/0)', async ({
    freshUserPage: page,
    request,
  }) => {
    const uid = (await currentUid(page)) ?? '';
    await createIndicator(request, uid, EXERCISE);
    await page.goto('/register');

    const card = page.getByTestId('quick-entry-card-ind_exercise');
    await card.getByRole('button', { name: 'Sim' }).click();
    await expect(page.getByTestId('save-feedback')).toContainText(/salvo|sincronizado/i);
    await expect(card.getByRole('button', { name: 'Sim' })).toHaveAttribute('aria-pressed', 'true');

    await card.getByRole('button', { name: /limpar/i }).click();

    // The record is deleted; no "Não"/0 entry is written back (spec 5.2).
    await expect(card.getByRole('button', { name: 'Sim' })).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(async () => (await listTodayEntries(request, uid)).length).toBe(0);
  });

  test('numeric fields use the decimal keyboard and accept the comma separator', async ({
    freshUserPage: page,
    request,
  }) => {
    const uid = (await currentUid(page)) ?? '';
    await createIndicator(request, uid, SLEEP);
    await page.goto('/register');

    const input = page.getByTestId('quick-entry-card-ind_sleep').getByRole('textbox');
    await expect(input).toHaveAttribute('inputmode', 'decimal');

    await input.fill('7,5');
    await input.blur();

    await expect(page.getByTestId('save-feedback')).toContainText(/salvo|sincronizado/i);
    const entries = await listTodayEntries(request, uid);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      indicatorId: 'ind_sleep',
      localDate: saoPauloToday(),
      value: { number: 7.5 },
    });
  });

  test('multiple-per-day indicators list today events and append new ones', async ({
    freshUserPage: page,
    request,
  }) => {
    const uid = (await currentUid(page)) ?? '';
    await createIndicator(request, uid, COFFEE);
    await createEntry(request, uid, {
      id: 'existing-event',
      indicatorId: 'ind_coffee',
      value: { number: 1 },
    });
    await page.goto('/register');

    const card = page.getByTestId('quick-entry-card-ind_coffee');
    const events = card.getByTestId('entry-event');
    await expect(events).toHaveCount(1);
    await expect(events.first()).toContainText('1');

    // A new answer adds a new event for today (spec 5.2), it does not edit the old one.
    await card.getByRole('textbox').fill('2');
    await card.getByRole('button', { name: /adicionar/i }).click();

    await expect(page.getByTestId('save-feedback')).toContainText(/salvo|sincronizado/i);
    await expect(events).toHaveCount(2);

    const stored = await listTodayEntries(request, uid);
    expect(stored).toHaveLength(2);
    expect(
      stored.map((entry) => (entry.value as { number?: number }).number).sort((a, b) => (a ?? 0) - (b ?? 0)),
    ).toEqual([1, 2]);
  });

  test('offline answers stay pending (never "saved") until the write persists', async ({
    freshUserPage: page,
    request,
  }) => {
    const uid = (await currentUid(page)) ?? '';
    await createIndicator(request, uid, EXERCISE);
    await page.goto('/register');

    const card = page.getByTestId('quick-entry-card-ind_exercise');
    await expect(card).toBeVisible(); // go offline only after the card loaded
    await page.context().setOffline(true);
    await card.getByRole('button', { name: 'Sim' }).click();

    // While the connection is down: pending state, never success (spec 5.4).
    await expect(page.getByTestId('save-feedback')).toContainText(/salvando|pendente/i);
    await expect(page.getByTestId('save-feedback')).not.toContainText(/salvo|sincronizado/i);
    expect(await listTodayEntries(request, uid)).toHaveLength(0);

    // The pending write flushes once the connection returns, and only then shows success.
    await page.context().setOffline(false);
    await expect.poll(async () => (await listTodayEntries(request, uid)).length, { timeout: 30_000 }).toBe(1);
    await expect(page.getByTestId('save-feedback')).toContainText(/salvo|sincronizado/i);
  });
});
