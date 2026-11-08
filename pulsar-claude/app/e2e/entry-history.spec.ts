import type { APIRequestContext, Locator, Page } from '@playwright/test';
import firebaseJson from '../firebase.json' with { type: 'json' };
import { currentUid, expect, test } from './fixtures';
import { hasHorizontalOverflow, SENTINELS } from './support';

const DOCUMENTS = `http://127.0.0.1:${firebaseJson.emulators.firestore.port}/v1/projects/demo-pulsar/databases/(default)/documents`;
const OWNER = { Authorization: 'Bearer owner' };
const INDICATOR = 'history-energy';
const OTHER_INDICATOR = 'history-sleep';
const NOTE = 'ZQX_OBS_NOTA_5T1';
const FIXED_NOW = '2026-11-08T18:00:00Z';

type FirestoreFields = Record<string, unknown>;

async function putDocument(request: APIRequestContext, path: string, fields: FirestoreFields) {
  const response = await request.patch(`${DOCUMENTS}/${path}`, { headers: OWNER, data: { fields } });
  expect(response.ok(), `write ${path}: ${response.status()}`).toBeTruthy();
  const readback = await request.get(`${DOCUMENTS}/${path}`, { headers: OWNER });
  expect(readback.ok(), `read ${path}: ${readback.status()}`).toBeTruthy();
  expect((await readback.json()).fields).toMatchObject(fields);
}

async function prepareHistory(page: Page, request: APIRequestContext): Promise<string> {
  const uid = await currentUid(page);
  expect(uid).toBeTruthy();
  if (!uid) throw new Error('Anonymous session did not start');
  await page.clock.setFixedTime(new Date(FIXED_NOW));
  const indicatorFields = (name: string, abbreviation: string, order: number): FirestoreFields => ({
    group: { stringValue: 'result' },
    name: { stringValue: name },
    abbreviation: { stringValue: abbreviation },
    emoji: { stringValue: '⚡' },
    valueType: { stringValue: 'scale' },
    numeric: { nullValue: null },
    scale: {
      mapValue: {
        fields: { min: { integerValue: '0' }, max: { integerValue: '10' }, step: { integerValue: '1' } },
      },
    },
    options: { nullValue: null },
    desiredDirection: { stringValue: 'higher' },
    idealRange: { nullValue: null },
    frequency: { stringValue: 'multiple_per_day' },
    dailyAggregation: { stringValue: 'mean' },
    sortOrder: { integerValue: String(order) },
    archivedAt: { nullValue: null },
    lockedAt: { timestampValue: '2026-10-20T12:00:00Z' },
    createdAt: { timestampValue: '2026-10-20T12:00:00Z' },
    updatedAt: { timestampValue: '2026-10-20T12:00:00Z' },
  });
  await putDocument(
    request,
    `users/${uid}/indicators/${INDICATOR}`,
    indicatorFields('ZQX_ENERGIA_7F3', 'ENE', 1000),
  );
  await putDocument(
    request,
    `users/${uid}/indicators/${OTHER_INDICATOR}`,
    indicatorFields('ZQX_SONO_9K2', 'SON', 2000),
  );

  const entry = (
    indicatorId: string,
    localDate: string,
    recordedAt: string,
    value: number,
    note: string | null,
  ): FirestoreFields => ({
    indicatorId: { stringValue: indicatorId },
    localDate: { stringValue: localDate },
    recordedAt: { timestampValue: recordedAt },
    valueType: { stringValue: 'scale' },
    value: { mapValue: { fields: { number: { integerValue: String(value) } } } },
    note: note === null ? { nullValue: null } : { stringValue: note },
  });
  // The first entry was recorded on October 24 in another timezone; in São Paulo it is October 23.
  await putDocument(
    request,
    `users/${uid}/entries/past-one`,
    entry(INDICATOR, '2026-10-24', '2026-10-24T01:15:00Z', 2, NOTE),
  );
  await putDocument(
    request,
    `users/${uid}/entries/past-two`,
    entry(INDICATOR, '2026-10-24', '2026-10-24T03:40:00Z', 8, null),
  );
  await putDocument(
    request,
    `users/${uid}/entries/today`,
    entry(INDICATOR, '2026-11-08', '2026-11-08T13:45:00Z', 9, null),
  );
  await putDocument(
    request,
    `users/${uid}/entries/other`,
    entry(OTHER_INDICATOR, '2026-10-24', '2026-10-24T05:20:00Z', 6, null),
  );
  return uid;
}

async function openHistory(page: Page): Promise<Locator> {
  await page.goto('/indicators');
  const eye = page.getByTestId('eye-toggle');
  if ((await eye.getAttribute('aria-pressed')) !== 'false') await eye.click();
  await expect(eye).toHaveAttribute('aria-pressed', 'false');
  const card = page
    .getByTestId('indicator-card')
    .filter({ has: page.locator('[data-indicator-label]', { hasText: 'ENE' }) });
  await expect(card).toBeVisible();
  const direct = card
    .getByRole('button', { name: /hist[oó]rico/i })
    .or(card.getByRole('link', { name: /hist[oó]rico/i }));
  if (await direct.count()) {
    await direct.first().click();
  } else {
    await card.getByRole('button', { name: /op(ç|c)ões|mais ações/i }).click();
    const options = page.getByRole('dialog');
    await expect(options).toBeVisible();
    await options
      .getByRole('button', { name: /hist[oó]rico/i })
      .or(options.getByRole('link', { name: /hist[oó]rico/i }))
      .first()
      .click();
  }
  const historyDialog = page.getByRole('dialog', { name: /hist[oó]rico/i });
  if (await historyDialog.isVisible()) return historyDialog;
  await expect(page.getByRole('heading', { name: /hist[oó]rico/i })).toBeVisible();
  return page.locator('main');
}

function recordWithTime(history: Locator, time: string): Locator {
  return history.getByText(time, { exact: false }).first().locator('xpath=ancestor::*[.//button or .//a][1]');
}

async function exposedOutsideAllowList(page: Page): Promise<string> {
  return page.evaluate(() => {
    const exposed: string[] = [];
    for (const element of document.querySelectorAll('*')) {
      if (element.closest('[data-privacy-allow]') || !element.getClientRects().length) continue;
      const style = getComputedStyle(element);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      for (const node of element.childNodes)
        if (node.nodeType === Node.TEXT_NODE) exposed.push(node.textContent ?? '');
      for (const attribute of element.attributes) {
        if (attribute.name === 'title' || attribute.name.startsWith('aria-')) exposed.push(attribute.value);
      }
    }
    return exposed.join('\n');
  });
}

async function expectNoPrivateLeak(page: Page) {
  const exposed = await exposedOutsideAllowList(page);
  for (const sentinel of SENTINELS) expect(exposed).not.toContain(sentinel);
}

async function storedEntryStatus(request: APIRequestContext, uid: string, entryId: string): Promise<number> {
  return (await request.get(`${DOCUMENTS}/users/${uid}/entries/${entryId}`, { headers: OWNER })).status();
}

async function requestDeletion(history: Locator, time: string) {
  const record = recordWithTime(history, time);
  await expect(record).toBeVisible();
  await record.getByRole('button', { name: /excluir|apagar|remover/i }).click();
}

test.describe('F-2.09 entry history', () => {
  test('shows each value and browser-local date and time, with a private note revealed on demand', async ({
    freshUserPage: page,
    request,
  }, testInfo) => {
    if (testInfo.project.name !== 'mobile') return;
    await prepareHistory(page, request);
    const history = await openHistory(page);
    await expect(history.getByText('22:15', { exact: false })).toBeVisible();
    await expect(history.getByText('00:40', { exact: false })).toBeVisible();
    await expect(history.getByText('10:45', { exact: false })).toBeVisible();
    await expect(history).toContainText(/23\s*(?:\/|-|\.|de\s+)\s*(?:10|out(?:ubro)?)/i);
    await expect(history).toContainText(/24\s*(?:\/|-|\.|de\s+)\s*(?:10|out(?:ubro)?)/i);
    await expect(recordWithTime(history, '22:15')).toContainText(/\b2\b/);
    await expect(recordWithTime(history, '00:40')).toContainText(/\b8\b/);
    await expect(recordWithTime(history, '10:45')).toContainText(/\b9\b/);
    await expect(history.getByText('02:20', { exact: false })).toHaveCount(0);
    await expectNoPrivateLeak(page);
    await expect(page.getByText(NOTE)).not.toBeVisible();

    const past = recordWithTime(history, '22:15');
    const noteButton = past.getByRole('button', { name: /observa(ç|c)ão|nota/i });
    if (await noteButton.count()) await noteButton.first().click();
    else await history.getByText('22:15', { exact: false }).first().click();
    await expect(page.locator('[data-privacy-allow]').getByText(NOTE)).toBeVisible();
    await expectNoPrivateLeak(page);
  });

  test('confirms deletion of past and current entries, keeps other entries, and persists after reload', async ({
    freshUserPage: page,
    request,
  }, testInfo) => {
    if (testInfo.project.name !== 'mobile') return;
    const uid = await prepareHistory(page, request);
    let history = await openHistory(page);
    await requestDeletion(history, '22:15');
    let confirmation = page.getByRole('dialog', { name: /excluir|apagar|remover/i });
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole('button', { name: /cancelar/i }).click();
    await expect(history.getByText('22:15', { exact: false })).toBeVisible();
    expect(await storedEntryStatus(request, uid, 'past-one')).toBe(200);

    await requestDeletion(history, '22:15');
    confirmation = page.getByRole('dialog', { name: /excluir|apagar|remover/i });
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole('button', { name: /excluir|apagar|remover/i }).click();
    await expect(history.getByText('22:15', { exact: false })).toHaveCount(0);
    await expect.poll(() => storedEntryStatus(request, uid, 'past-one')).toBe(404);
    expect(await storedEntryStatus(request, uid, 'past-two')).toBe(200);
    expect(await storedEntryStatus(request, uid, 'other')).toBe(200);
    await expect(history.getByText('00:40', { exact: false })).toBeVisible();

    await requestDeletion(history, '10:45');
    confirmation = page.getByRole('dialog', { name: /excluir|apagar|remover/i });
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole('button', { name: /excluir|apagar|remover/i }).click();
    await expect.poll(() => storedEntryStatus(request, uid, 'today')).toBe(404);
    await page.reload();
    history = await openHistory(page);
    await expect(history.getByText('22:15', { exact: false })).toHaveCount(0);
    await expect(history.getByText('10:45', { exact: false })).toHaveCount(0);
    await expect(history.getByText('00:40', { exact: false })).toBeVisible();
  });

  test('offers no control to edit a past value', async ({ freshUserPage: page, request }, testInfo) => {
    if (testInfo.project.name !== 'mobile') return;
    await prepareHistory(page, request);
    const history = await openHistory(page);
    await expect(history.getByText('22:15', { exact: false })).toBeVisible();
    await expect(history.getByRole('button', { name: /editar|alterar|modificar/i })).toHaveCount(0);
    await expect(history.getByRole('link', { name: /editar|alterar|modificar/i })).toHaveCount(0);
    await expect(
      history.locator('input:not([type="hidden"]), textarea, select, [contenteditable="true"]'),
    ).toHaveCount(0);
  });

  test('history opens without breaking on desktop', async ({ freshUserPage: page, request }, testInfo) => {
    if (testInfo.project.name !== 'desktop') return;
    await prepareHistory(page, request);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const history = await openHistory(page);
    await expect(history).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);
    expect(errors).toEqual([]);
  });
});
