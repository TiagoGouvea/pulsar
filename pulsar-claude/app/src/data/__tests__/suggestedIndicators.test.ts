import { beforeEach, describe, expect, it, vi } from 'vitest';
import { INDICATOR_SUGGESTIONS, suggestionIndicatorId } from '../../features/indicators/suggestions';

const store = vi.hoisted(() => ({
  documents: new Map<string, Record<string, unknown>>(),
  writes: 0,
}));

vi.mock('../../lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...parts: string[]) => parts.join('/'),
  serverTimestamp: () => 'server-time',
  runTransaction: async (
    _db: unknown,
    callback: (transaction: {
      get: (path: string) => Promise<{ exists: () => boolean; data: () => Record<string, unknown> }>;
      set: (path: string, data: Record<string, unknown>) => void;
    }) => Promise<boolean>,
  ) =>
    callback({
      get: async (path) => ({
        exists: () => store.documents.has(path),
        data: () => store.documents.get(path) ?? {},
      }),
      set: (path, data) => {
        store.documents.set(path, data);
        store.writes += 1;
      },
    }),
}));

import { createSuggestedIndicator } from '../indicators';

describe('quick-start indicator creation', () => {
  beforeEach(() => {
    store.documents.clear();
    store.writes = 0;
  });

  it('creates a suggestion once without overwriting a later edit', async () => {
    const suggestion = INDICATOR_SUGGESTIONS[0]!;
    const id = suggestionIndicatorId(suggestion.key);
    const input = { ...suggestion.indicator, sortOrder: suggestion.sortOrder };
    expect(await createSuggestedIndicator('alice', id, input)).toBe(true);
    const saved = store.documents.get(`users/alice/indicators/${id}`)!;
    saved.name = 'Updated name';
    expect(await createSuggestedIndicator('alice', id, input)).toBe(true);
    expect(store.writes).toBe(1);
    expect(saved.name).toBe('Updated name');
  });

  it('does not restore or replace an archived suggestion', async () => {
    const suggestion = INDICATOR_SUGGESTIONS[0]!;
    const id = suggestionIndicatorId(suggestion.key);
    store.documents.set(`users/alice/indicators/${id}`, { archivedAt: 'archived' });
    expect(
      await createSuggestedIndicator('alice', id, {
        ...suggestion.indicator,
        sortOrder: suggestion.sortOrder,
      }),
    ).toBe(false);
    expect(store.writes).toBe(0);
  });
});
