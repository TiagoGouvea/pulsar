import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Indicator } from '@features/indicators/types';
import { formatLocalDate } from './model';

const mocks = vi.hoisted(() => {
  let autoId = 0;
  const batchSet = vi.fn();
  const batchUpdate = vi.fn();
  const commit = vi.fn();
  return {
    batchSet,
    batchUpdate,
    commit,
    deleteDoc: vi.fn(),
    getDoc: vi.fn(),
    waitForPendingWrites: vi.fn(),
    collection: vi.fn((db: unknown, ...segments: string[]) => ({ kind: 'collection', db, segments })),
    doc: vi.fn((dbOrCollection: unknown, ...args: unknown[]) => {
      const direct = dbOrCollection as { kind?: string; segments?: string[] } | undefined;
      const first = args[0] as { kind?: string; segments?: string[] } | undefined;
      const collectionArg = direct?.kind === 'collection' ? direct : first;
      if (collectionArg?.kind === 'collection') {
        autoId += 1;
        return { path: [...(collectionArg.segments ?? []), `auto-${autoId}`].join('/') };
      }
      return { path: args.join('/') };
    }),
    serverTimestamp: vi.fn(() => ({ serverTimestamp: true })),
    writeBatch: vi.fn(() => ({
      set: batchSet,
      update: batchUpdate,
      commit
    })),
    resetAutoIds: () => {
      autoId = 0;
    }
  };
});

vi.mock('firebase/firestore', () => ({
  collection: mocks.collection,
  doc: mocks.doc,
  deleteDoc: mocks.deleteDoc,
  getDoc: mocks.getDoc,
  onSnapshot: vi.fn(),
  serverTimestamp: mocks.serverTimestamp,
  waitForPendingWrites: mocks.waitForPendingWrites,
  writeBatch: mocks.writeBatch
}));

vi.mock('@lib/firebase/config', () => ({
  db: { name: 'test-db' }
}));

import { deleteEntry, saveDailyEntries } from './repository';

function indicator(overrides: Partial<Indicator> = {}): Indicator {
  return {
    id: 'exe',
    group: 'factor',
    name: 'Exercício Físico',
    abbreviation: 'EXE',
    emoji: '',
    valueType: 'boolean',
    frequency: 'single_per_day',
    sortOrder: 10,
    firstEntryAt: null,
    archivedAt: null,
    createdAt: '2026-10-24T10:00:00.000Z',
    updatedAt: '2026-10-24T10:00:00.000Z',
    ...overrides
  };
}

const today = formatLocalDate();

beforeEach(() => {
  vi.clearAllMocks();
  mocks.resetAutoIds();
  mocks.commit.mockResolvedValue(undefined);
  mocks.waitForPendingWrites.mockResolvedValue(undefined);
  mocks.deleteDoc.mockResolvedValue(undefined);
  mocks.getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ firstEntryAt: null })
  });
});

describe('saveDailyEntries', () => {
  it('replaces the deterministic single document and marks the first entry in the same batch', async () => {
    const exe = indicator();
    await saveDailyEntries('uid-1', [
      { indicator: exe, value: { boolean: false }, note: '  manhã  ' }
    ]);

    expect(mocks.batchSet).toHaveBeenCalledTimes(1);
    const [reference, data] = mocks.batchSet.mock.calls[0];
    expect(reference.path).toBe(`users/uid-1/entries/exe_${today}`);
    expect(data).toMatchObject({
      indicatorId: 'exe',
      localDate: today,
      valueType: 'boolean',
      value: { boolean: false },
      note: 'manhã',
      recordedAt: { serverTimestamp: true }
    });

    expect(mocks.batchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/uid-1/indicators/exe' }),
      {
        firstEntryAt: { serverTimestamp: true },
        updatedAt: { serverTimestamp: true }
      }
    );
    expect(mocks.commit).toHaveBeenCalledTimes(1);
    expect(mocks.waitForPendingWrites).toHaveBeenCalledWith({ name: 'test-db' });
  });

  it('creates unique events for multiple-frequency indicators and does not rewrite firstEntryAt', async () => {
    const caf = indicator({
      id: 'caf',
      name: 'Café',
      valueType: 'numeric',
      numeric: { unit: 'xícaras', min: 0, max: null, step: 1 },
      frequency: 'multiple_per_day',
      dailyAggregation: 'sum',
      firstEntryAt: '2026-10-24T10:00:00.000Z'
    });
    mocks.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ firstEntryAt: '2026-10-24T10:00:00.000Z' })
    });

    await saveDailyEntries('uid-1', [
      { indicator: caf, value: { number: 2 } },
      { indicator: caf, value: { number: 3 } }
    ]);

    const paths = mocks.batchSet.mock.calls.map((call) => call[0].path);
    expect(paths).toHaveLength(2);
    expect(paths[0]).toBe('users/uid-1/entries/auto-1');
    expect(paths[1]).toBe('users/uid-1/entries/auto-2');
    expect(mocks.batchSet.mock.calls[0][1]).not.toHaveProperty('note');
    expect(mocks.batchUpdate).not.toHaveBeenCalled();
  });

  it('rejects invalid values and notes before writing anything', async () => {
    const scale = indicator({
      id: 'ene',
      valueType: 'scale',
      scale: { min: 0, max: 10, step: 1 }
    });
    await expect(
      saveDailyEntries('uid-1', [{ indicator: scale, value: { number: 11 } }])
    ).rejects.toThrow();
    expect(mocks.batchSet).not.toHaveBeenCalled();

    await expect(
      saveDailyEntries('uid-1', [
        { indicator: scale, value: { number: 5 }, note: 'x'.repeat(501) }
      ])
    ).rejects.toThrow();
    expect(mocks.batchSet).not.toHaveBeenCalled();
  });

  it('never resolves as success without the server confirmation wait', async () => {
    mocks.waitForPendingWrites.mockRejectedValue(new Error('pending'));
    await expect(
      saveDailyEntries('uid-1', [{ indicator: indicator(), value: { boolean: true } }])
    ).rejects.toThrow('pending');
  });
});

describe('deleteEntry', () => {
  it('deletes the requested record and waits for server confirmation', async () => {
    await deleteEntry('uid-1', 'entry-1');
    expect(mocks.deleteDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/uid-1/entries/entry-1' })
    );
    expect(mocks.waitForPendingWrites).toHaveBeenCalledWith({ name: 'test-db' });
  });
});
