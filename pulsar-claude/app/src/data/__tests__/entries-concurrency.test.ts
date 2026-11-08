import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestore = vi.hoisted(() => ({
  entries: [] as string[],
  deleted: [] as string[],
  commit: vi.fn(async () => {}),
}));

vi.mock('../../lib/firebase', () => ({ db: {} }));
vi.mock('../../lib/time', () => ({ localDate: () => '2026-10-24' }));
vi.mock('firebase/firestore', () => ({
  collection: () => ({ path: 'entries' }),
  doc: (_first: unknown, ...parts: string[]) =>
    parts.length ? { id: parts.at(-1), path: parts.join('/') } : { id: 'new', path: 'entries/new' },
  getDoc: async () => ({
    exists: () => true,
    data: () => ({ valueType: 'boolean', frequency: 'single_per_day', lockedAt: {} }),
  }),
  getDocs: async () => ({
    docs: firestore.entries.map((id) => ({ id, ref: { id } })),
  }),
  query: () => ({}),
  where: () => ({}),
  serverTimestamp: () => ({}),
  writeBatch: () => ({
    update: vi.fn(),
    set: vi.fn(),
    delete: (ref: { id: string }) => firestore.deleted.push(ref.id),
    commit: firestore.commit,
  }),
}));

import { saveEntry } from '../entries';

describe('replacing a visible answer', () => {
  beforeEach(() => {
    firestore.entries = [];
    firestore.deleted = [];
    firestore.commit.mockClear();
  });

  it('rejects an answer that appeared on another device without deleting it', async () => {
    firestore.entries = ['seen', 'unseen'];
    await expect(
      saveEntry('user', {
        indicatorId: 'indicator',
        value: { boolean: true },
        observedEntryIds: ['seen'],
      }),
    ).rejects.toThrow('another device');
    expect(firestore.deleted).toEqual([]);
    expect(firestore.commit).not.toHaveBeenCalled();
  });

  it('replaces the entries the user saw in one batch', async () => {
    firestore.entries = ['seen'];
    await saveEntry('user', {
      indicatorId: 'indicator',
      value: { boolean: false },
      observedEntryIds: ['seen'],
    });
    expect(firestore.deleted).toEqual(['seen']);
    expect(firestore.commit).toHaveBeenCalledOnce();
  });
});
