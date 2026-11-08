import firebaseJson from '../firebase.json' with { type: 'json' };
import { currentUid, expect, test } from './fixtures';

const documents = `http://127.0.0.1:${firebaseJson.emulators.firestore.port}/v1/projects/demo-pulsar/databases/(default)/documents`;
const headers = { Authorization: 'Bearer owner' };

test('keeps a loaded answer pending offline until it is persisted', async ({
  freshUserPage: page,
  request,
}) => {
  const uid = await currentUid(page);
  expect(uid).toBeTruthy();
  const userDocuments = `${documents}/users/${uid}`;
  const created = await request.patch(`${userDocuments}/indicators/exercise`, {
    headers,
    data: {
      fields: {
        group: { stringValue: 'factor' },
        name: { stringValue: 'Exercício' },
        abbreviation: { stringValue: 'EXE' },
        emoji: { nullValue: null },
        valueType: { stringValue: 'boolean' },
        numeric: { nullValue: null },
        scale: { nullValue: null },
        options: { nullValue: null },
        desiredDirection: { nullValue: null },
        idealRange: { nullValue: null },
        frequency: { stringValue: 'single_per_day' },
        dailyAggregation: { nullValue: null },
        sortOrder: { integerValue: '1' },
        archivedAt: { nullValue: null },
        lockedAt: { nullValue: null },
        createdAt: { timestampValue: '2026-01-01T12:00:00Z' },
        updatedAt: { timestampValue: '2026-01-01T12:00:00Z' },
      },
    },
  });
  expect(created.ok()).toBe(true);

  await page.goto('/register');
  const answer = page.getByTestId('quick-entry-card-exercise').getByRole('button', { name: 'Sim' });
  await expect(answer).toBeVisible();
  await page.context().setOffline(true);
  await answer.click();

  const feedback = page.getByTestId('save-feedback');
  await expect(feedback).toContainText(/salvando|pendente/i);
  await expect(feedback).not.toContainText(/salvo|sincronizado/i);
  const offlineEntries = await request.get(`${userDocuments}/entries`, { headers });
  expect(offlineEntries.ok()).toBe(true);
  expect(((await offlineEntries.json()) as { documents?: unknown[] }).documents ?? []).toHaveLength(0);

  await page.context().setOffline(false);
  await expect(feedback).toContainText(/salvo|sincronizado/i, { timeout: 30_000 });
  const persistedEntries = await request.get(`${userDocuments}/entries`, { headers });
  expect(persistedEntries.ok()).toBe(true);
  expect(((await persistedEntries.json()) as { documents?: unknown[] }).documents ?? []).toHaveLength(1);
});
