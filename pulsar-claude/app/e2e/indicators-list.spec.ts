import type { APIRequestContext, Locator, Page } from '@playwright/test';
import firebaseJson from '../firebase.json' with { type: 'json' };
import { currentUid, expect, test } from './fixtures';
import { hasHorizontalOverflow, SENTINELS } from './support';

/**
 * Acceptance tests for F-2.05 "Meus indicadores" (/indicators), spec 4.5 + 7.3.
 *
 * DOM contract expected from the screen (asserted here, so the implementation must provide it):
 *  - Active lists: data-testid="factor-list" / "result-list"; archived: data-testid="archived-list".
 *  - Every indicator row: data-testid="indicator-card" containing the shared [data-indicator-label]
 *    span (IndicatorLabel honors the global eye: closed -> abbreviation, open -> full name).
 *  - Groups are labeled with visible text "Fatores" / "Resultados" / "Arquivados"
 *    (distinguishable without relying on color alone).
 *  - Reordering uses per-card buttons whose accessible name matches "Subir"/"Descer"
 *    (or "mover para cima/baixo"), per DECISOES.md.
 *  - Card actions (editar/arquivar/restaurar) are either direct buttons on the card or items of a
 *    bottom sheet (role=dialog) opened by an "Opções ..." trigger (design meus_indicadores).
 */

const PROJECT = 'demo-pulsar';
const FIRESTORE_DOCUMENTS = `http://127.0.0.1:${firebaseJson.emulators.firestore.port}/v1/projects/${PROJECT}/databases/(default)/documents`;

const MOVE_DOWN = /descer|baixo/i;
const ACTION_EDIT = /editar/i;
const ACTION_ARCHIVE = /arquivar/i;
const ACTION_RESTORE = /restaurar/i;
const OPTIONS_TRIGGER = /op(ç|c)ões|mais ações/i;

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

type StoredDoc = Record<string, unknown> & { id: string };

/** Reads the user's indicators straight from the Firestore emulator (rules bypassed as owner). */
async function readIndicators(request: APIRequestContext, uid: string): Promise<StoredDoc[]> {
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

interface RestIndicatorDoc {
  name: string;
  abbreviation: string;
  sortOrder: number;
  archived?: boolean;
}

/** Creates a minimal boolean factor for the user through the Firestore emulator REST API. */
async function createIndicatorDoc(
  request: APIRequestContext,
  uid: string,
  id: string,
  indicator: RestIndicatorDoc,
): Promise<void> {
  const response = await request.post(`${FIRESTORE_DOCUMENTS}/users/${uid}/indicators?documentId=${id}`, {
    headers: { Authorization: 'Bearer owner' },
    data: {
      fields: {
        group: { stringValue: 'factor' },
        name: { stringValue: indicator.name },
        abbreviation: { stringValue: indicator.abbreviation },
        emoji: { nullValue: null },
        valueType: { stringValue: 'boolean' },
        numeric: { nullValue: null },
        scale: { nullValue: null },
        options: { nullValue: null },
        desiredDirection: { nullValue: null },
        idealRange: { nullValue: null },
        frequency: { stringValue: 'single_per_day' },
        dailyAggregation: { nullValue: null },
        sortOrder: { integerValue: String(indicator.sortOrder) },
        archivedAt: indicator.archived ? { timestampValue: '2026-01-01T00:00:00Z' } : { nullValue: null },
        lockedAt: { nullValue: null },
        createdAt: { timestampValue: '2026-01-01T00:00:00Z' },
        updatedAt: { timestampValue: '2026-01-01T00:00:00Z' },
      },
    },
  });
  expect(response.ok()).toBeTruthy();
}

/** The card of the indicator whose label (abbreviation or full name) contains `label`. */
function listCard(page: Page, list: string, label: string): Locator {
  return page
    .getByTestId(list)
    .getByTestId('indicator-card')
    .filter({ has: page.locator('[data-indicator-label]', { hasText: label }) });
}

/** Visible order of the indicator labels inside one list. */
async function listLabels(page: Page, list: string): Promise<string[]> {
  return page
    .getByTestId(list)
    .getByTestId('indicator-card')
    .evaluateAll((cards: Element[]) =>
      cards.map((card) => card.querySelector('[data-indicator-label]')?.textContent ?? ''),
    );
}

/** Closes the global eye so cards show abbreviations, regardless of the persisted default. */
async function closeEye(page: Page): Promise<void> {
  const eye = page.getByTestId('eye-toggle');
  if ((await eye.getAttribute('aria-pressed')) !== 'false') await eye.click();
  await expect(eye).toHaveAttribute('aria-pressed', 'false');
}

/**
 * Some implementations filter lists behind "Todos / Fatores / Resultados / Arquivados" pills
 * (design meus_indicadores). Make sure both active lists are on screen before asserting on them.
 */
async function showAllLists(page: Page): Promise<void> {
  const todos = page.getByRole('button', { name: /todos/i });
  if (await todos.count()) await todos.first().click();
}

/** Expands the archived section when it is collapsed (toggle button or filter pill). */
async function revealArchivedCard(page: Page, card: Locator): Promise<void> {
  if (await card.isVisible()) return;
  const toggle = page.getByRole('button', { name: /arquivados/i });
  if (await toggle.count()) await toggle.first().click();
  await expect(card).toBeVisible();
}

/** Triggers a card action, either via a direct control or through the "Opções" bottom sheet. */
async function clickCardAction(page: Page, card: Locator, action: RegExp): Promise<void> {
  const direct = card.getByRole('button', { name: action }).or(card.getByRole('link', { name: action }));
  if (await direct.count()) {
    await direct.first().click();
    return;
  }
  await card.getByRole('button', { name: OPTIONS_TRIGGER }).first().click();
  const sheet = page.getByRole('dialog');
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: action }).first().click();
}

/** Everything a screen reader or a screenshot could expose: visible text, aria-*, title, tooltips. */
async function exposedText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const attributes = Array.from(document.querySelectorAll('*')).flatMap((element) =>
      Array.from(element.attributes)
        .filter((attribute) => attribute.name === 'title' || attribute.name.startsWith('aria-'))
        .map((attribute) => attribute.value),
    );
    const tooltips = Array.from(document.querySelectorAll('[role="tooltip"]')).map(
      (element) => element.textContent ?? '',
    );
    return [document.body.innerText, ...attributes, ...tooltips].join('\n');
  });
}

test.describe('F-2.05 indicators list', () => {
  test('factors and results are listed in separate, labeled groups', async ({ seedPage: page }, testInfo) => {
    if (testInfo.project.name !== 'mobile') return;
    await page.goto('/indicators');
    await closeEye(page);
    await showAllLists(page);

    // Groups are labeled with text, not only with color (AC-07).
    await expect(page.getByText('Fatores', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Resultados', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Arquivados', { exact: true }).first()).toBeVisible();

    for (const label of ['EXE', 'SON', 'CAF']) {
      await expect(listCard(page, 'factor-list', label)).toBeVisible();
    }
    for (const label of ['ENE', 'FOC']) {
      await expect(listCard(page, 'result-list', label)).toBeVisible();
    }

    // The archived indicator (Coenzima Q10) is not in the active lists: it lives in its own section.
    await expect(listCard(page, 'factor-list', 'Q10')).toHaveCount(0);
    const archivedCard = listCard(page, 'archived-list', 'Q10');
    await expect(archivedCard).toHaveCount(1);
    await revealArchivedCard(page, archivedCard);
    await expect(archivedCard).toContainText(/arquivado/i);

    // Cards tell the response type and the daily aggregation (design meus_indicadores).
    await expect(listCard(page, 'factor-list', 'EXE')).toContainText(/booleano|sim\s*\/\s*não/i);
    await expect(listCard(page, 'factor-list', 'CAF')).toContainText(/soma/i);
    const energy = listCard(page, 'result-list', 'ENE');
    await expect(energy).toContainText(/escala/i);
    await expect(energy).toContainText('Média');

    // "Novo Indicador" opens the creation editor (F-2.03 route).
    const novo = page
      .getByRole('button', { name: /novo indicador/i })
      .or(page.getByRole('link', { name: /novo indicador/i }));
    await novo.first().click();
    await expect(page).toHaveURL(/\/indicators\/new$/);
    await expect(page.getByRole('dialog', { name: 'Novo Indicador' })).toBeVisible();
  });

  test('indicator names follow the global eye toggle', async ({ seedPage: page }, testInfo) => {
    if (testInfo.project.name !== 'mobile') return;
    await page.goto('/indicators');
    await closeEye(page);
    const eye = page.getByTestId('eye-toggle');

    // Closed: abbreviations only; real names never leak, not even via aria-*, title or tooltips.
    await expect(listCard(page, 'factor-list', 'SON')).toBeVisible();
    let exposed = await exposedText(page);
    for (const sentinel of SENTINELS) expect(exposed).not.toContain(sentinel);
    await expect(page.getByTestId('factor-list')).not.toContainText('💤');

    // Open: the real names (and emojis) replace the abbreviations.
    await eye.click();
    await expect(eye).toHaveAttribute('aria-pressed', 'true');
    await expect(listCard(page, 'factor-list', 'ZQX_SONO_9K2')).toBeVisible();
    await expect(listCard(page, 'result-list', 'ZQX_ENERGIA_7F3')).toBeVisible();
    await expect(listCard(page, 'result-list', 'ZQX_FOCO_4M8')).toBeVisible();

    // Closed again: the names are hidden once more.
    await eye.click();
    await expect(eye).toHaveAttribute('aria-pressed', 'false');
    await expect(listCard(page, 'factor-list', 'SON')).toBeVisible();
    exposed = await exposedText(page);
    for (const sentinel of SENTINELS) expect(exposed).not.toContain(sentinel);
  });

  test('reordering within the group persists after reload and is stored', async ({
    freshUserPage: page,
    request,
  }, testInfo) => {
    if (testInfo.project.name !== 'mobile') return;
    const owner = (await currentUid(page)) ?? '';
    expect(owner).not.toBe('');
    await createIndicatorDoc(request, owner, 'ind_alf', {
      name: 'Alfa',
      abbreviation: 'ALF',
      sortOrder: 1000,
    });
    await createIndicatorDoc(request, owner, 'ind_bet', {
      name: 'Beta',
      abbreviation: 'BET',
      sortOrder: 2000,
    });
    await createIndicatorDoc(request, owner, 'ind_gam', {
      name: 'Gama',
      abbreviation: 'GAM',
      sortOrder: 3000,
    });

    await page.goto('/indicators');
    await closeEye(page);
    await showAllLists(page);
    await expect(listCard(page, 'factor-list', 'ALF')).toBeVisible();
    await expect.poll(() => listLabels(page, 'factor-list')).toEqual(['ALF', 'BET', 'GAM']);

    await listCard(page, 'factor-list', 'ALF').getByRole('button', { name: MOVE_DOWN }).click();
    await expect.poll(() => listLabels(page, 'factor-list')).toEqual(['BET', 'ALF', 'GAM']);

    // The chosen order survives a full reload (persisted, not just local state).
    await page.reload();
    await expect.poll(() => listLabels(page, 'factor-list')).toEqual(['BET', 'ALF', 'GAM']);

    const stored = await readIndicators(request, owner);
    const sortOrderOf = (id: string) => stored.find((doc) => doc.id === id)?.sortOrder as number;
    expect(sortOrderOf('ind_alf')).toBeGreaterThan(sortOrderOf('ind_bet'));
  });

  test('archived indicators live in their own section and can be restored', async ({
    freshUserPage: page,
    request,
  }, testInfo) => {
    if (testInfo.project.name !== 'mobile') return;
    const owner = (await currentUid(page)) ?? '';
    expect(owner).not.toBe('');
    await createIndicatorDoc(request, owner, 'ind_alf', {
      name: 'Alfa',
      abbreviation: 'ALF',
      sortOrder: 1000,
    });

    await page.goto('/indicators');
    await closeEye(page);
    await showAllLists(page);
    const activeCard = listCard(page, 'factor-list', 'ALF');
    await expect(activeCard).toBeVisible();

    await clickCardAction(page, activeCard, ACTION_ARCHIVE);

    await expect(listCard(page, 'factor-list', 'ALF')).toHaveCount(0);
    const archivedCard = listCard(page, 'archived-list', 'ALF');
    await expect(archivedCard).toHaveCount(1);
    await revealArchivedCard(page, archivedCard);
    await expect(archivedCard).toContainText(/arquivado/i);

    let stored = await readIndicators(request, owner);
    expect(stored.find((doc) => doc.id === 'ind_alf')?.archivedAt).not.toBeNull();

    // Still archived after a reload (persisted, not just local state).
    await page.reload();
    await showAllLists(page);
    await expect(listCard(page, 'factor-list', 'ALF')).toHaveCount(0);
    await expect(listCard(page, 'archived-list', 'ALF')).toHaveCount(1);

    await revealArchivedCard(page, listCard(page, 'archived-list', 'ALF'));
    await clickCardAction(page, listCard(page, 'archived-list', 'ALF'), ACTION_RESTORE);
    await showAllLists(page);
    await expect(listCard(page, 'factor-list', 'ALF')).toBeVisible();
    await expect(listCard(page, 'archived-list', 'ALF')).toHaveCount(0);

    stored = await readIndicators(request, owner);
    expect(stored.find((doc) => doc.id === 'ind_alf')?.archivedAt).toBeNull();
  });

  test('a listed indicator opens its editor', async ({ seedPage: page }, testInfo) => {
    if (testInfo.project.name !== 'mobile') return;
    await page.goto('/indicators');
    await closeEye(page);
    await showAllLists(page);
    const coffeeCard = listCard(page, 'factor-list', 'CAF');
    await expect(coffeeCard).toBeVisible();

    await clickCardAction(page, coffeeCard, ACTION_EDIT);

    await expect(page).toHaveURL(/\/indicators\/[^/]+\/edit$/);
    await expect(page.getByRole('dialog', { name: 'Editar Indicador' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /Nome do Indicador/ })).toHaveValue('Café');
  });

  test('indicators screen opens without breaking (desktop smoke)', async ({ freshUserPage: page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/indicators');
    await expect(page.getByTestId('eye-toggle')).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);
    expect(errors).toEqual([]);
  });
});
