import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EntryValue } from '../../domain/entry';

type Operation = {
  kind: 'create' | 'set' | 'update' | 'delete';
  path: string;
  data?: Record<string, unknown>;
};
type Ref = { path: string; id: string };
type Filter = { field: string; value: unknown };
type Query = { path: string; filters: Filter[] };

const store = vi.hoisted(() => ({
  documents: new Map<string, Record<string, unknown>>(),
  commits: [] as Operation[][],
  nextId: 0,
  timestamp: { serverTimestamp: true },
  gate: null as null | Promise<void>,
  failure: null as null | Error,
}));

vi.mock('../../lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', async (importOriginal) => {
  const original = await importOriginal<typeof import('firebase/firestore')>();
  const ref = (path: string): Ref => ({ path, id: path.split('/').at(-1) ?? '' });
  const snapshot = (reference: Ref) => ({
    id: reference.id,
    ref: reference,
    exists: () => store.documents.has(reference.path),
    data: () => store.documents.get(reference.path),
    metadata: { fromCache: false, hasPendingWrites: false },
  });
  const querySnapshot = (reference: Query) => {
    const prefix = `${reference.path}/`;
    const docs = [...store.documents.entries()]
      .filter(
        ([path, data]) =>
          path.startsWith(prefix) &&
          !path.slice(prefix.length).includes('/') &&
          reference.filters.every(({ field, value }) => data[field] === value),
      )
      .map(([path]) => snapshot(ref(path)));
    return {
      docs,
      size: docs.length,
      empty: docs.length === 0,
      forEach: (fn: (doc: unknown) => void) => docs.forEach(fn),
    };
  };
  const commit = async (operations: Operation[]) => {
    if (store.gate) await store.gate;
    if (store.failure) throw store.failure;
    for (const operation of operations) {
      if (operation.kind === 'delete') store.documents.delete(operation.path);
      else {
        const previous = store.documents.get(operation.path);
        if (operation.kind === 'create' && previous) throw new Error('Document already exists');
        store.documents.set(operation.path, {
          ...(operation.kind === 'update' ? previous : {}),
          ...operation.data,
        });
      }
    }
    store.commits.push(operations);
  };
  const writer = (operations: Operation[]) => {
    const result = {
      set: (reference: Ref, data: Record<string, unknown>, options?: { merge?: boolean }) => {
        operations.push({ kind: options?.merge ? 'update' : 'set', path: reference.path, data });
        return result;
      },
      create: (reference: Ref, data: Record<string, unknown>) => {
        operations.push({ kind: 'create', path: reference.path, data });
        return result;
      },
      update: (reference: Ref, data: Record<string, unknown>) => {
        operations.push({ kind: 'update', path: reference.path, data });
        return result;
      },
      delete: (reference: Ref) => {
        operations.push({ kind: 'delete', path: reference.path });
        return result;
      },
    };
    return result;
  };
  return {
    ...original,
    collection: (_db: unknown, ...parts: string[]) => ({ path: parts.join('/'), filters: [] }),
    doc: (first: unknown, ...parts: string[]) => {
      if (typeof first === 'object' && first !== null && 'path' in first) {
        return ref(`${String(first.path)}/${parts.length ? parts.join('/') : `generated-${++store.nextId}`}`);
      }
      return ref(parts.join('/'));
    },
    where: (field: string, _operator: string, value: unknown) => ({ field, value }),
    query: (reference: Query, ...filters: Filter[]) => ({ ...reference, filters }),
    getDoc: async (reference: Ref) => snapshot(reference),
    getDocs: async (reference: Query) => querySnapshot(reference),
    serverTimestamp: () => store.timestamp,
    setDoc: async (reference: Ref, data: Record<string, unknown>, options?: { merge?: boolean }) =>
      commit([{ kind: options?.merge ? 'update' : 'set', path: reference.path, data }]),
    updateDoc: async (reference: Ref, data: Record<string, unknown>) =>
      commit([{ kind: 'update', path: reference.path, data }]),
    deleteDoc: async (reference: Ref) => commit([{ kind: 'delete', path: reference.path }]),
    addDoc: async (reference: Query, data: Record<string, unknown>) => {
      const target = ref(`${reference.path}/generated-${++store.nextId}`);
      await commit([{ kind: 'create', path: target.path, data }]);
      return target;
    },
    writeBatch: () => {
      const operations: Operation[] = [];
      return { ...writer(operations), commit: () => commit(operations) };
    },
    runTransaction: async (_db: unknown, callback: (transaction: unknown) => Promise<unknown>) => {
      const operations: Operation[] = [];
      const result = await callback({
        ...writer(operations),
        get: async (reference: Ref) => snapshot(reference),
      });
      await commit(operations);
      return result;
    },
  };
});

type Repository = {
  saveEntry: (
    uid: string,
    input: { indicatorId: string; value: EntryValue; note?: string },
  ) => Promise<unknown>;
  deleteEntry: (uid: string, entryId: string) => Promise<void>;
};
const repositoryPath = '../entries';
const repository = async () => (await import(/* @vite-ignore */ repositoryPath)) as Repository;
const indicatorPath = 'users/alice/indicators/coffee';
const entryPath = (id: string) => `users/alice/entries/${id}`;
const indicator = (frequency: 'single_per_day' | 'multiple_per_day') => ({
  group: 'factor',
  name: 'Café',
  abbreviation: 'CAF',
  emoji: '☕',
  valueType: 'numeric',
  numeric: { unit: 'xícaras', min: 0, max: null, step: 0.5 },
  scale: null,
  options: null,
  desiredDirection: null,
  idealRange: null,
  frequency,
  dailyAggregation: frequency === 'single_per_day' ? null : 'sum',
  sortOrder: 1000,
  archivedAt: null,
  lockedAt: null,
  createdAt: store.timestamp,
  updatedAt: store.timestamp,
});
const entry = (date: string, number: number) => ({
  indicatorId: 'coffee',
  localDate: date,
  valueType: 'numeric',
  value: { number },
  recordedAt: store.timestamp,
});
const entries = () =>
  [...store.documents.entries()].filter(([path]) => path.startsWith('users/alice/entries/'));
const input = (number: number) => ({ indicatorId: 'coffee', value: { number } });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 24, 12));
  store.documents.clear();
  store.commits.length = 0;
  store.nextId = 0;
  store.gate = null;
  store.failure = null;
});
afterEach(() => vi.useRealTimers());

describe('entry repository', () => {
  it('uses the local current day even when a caller attempts to supply a past date', async () => {
    store.documents.set(indicatorPath, indicator('multiple_per_day'));
    const { saveEntry } = await repository();
    await saveEntry('alice', { ...input(0), localDate: '2020-01-01' } as never).catch(() => undefined);
    expect(entries().every(([, data]) => data.localDate === '2026-10-24')).toBe(true);
    for (const [path] of entries()) store.documents.delete(path);
    await saveEntry('alice', input(0));
    expect(entries()).toHaveLength(1);
    expect(entries()[0]?.[1]).toMatchObject({ ...entry('2026-10-24', 0) });
  });

  it('locks the indicator atomically with its first entry and uses server timestamps', async () => {
    store.documents.set(indicatorPath, indicator('single_per_day'));
    const { saveEntry } = await repository();
    await saveEntry('alice', { ...input(2), note: 'Depois do almoço' });
    expect(entries()).toHaveLength(1);
    expect(entries()[0]?.[1]).toMatchObject({ ...entry('2026-10-24', 2), note: 'Depois do almoço' });
    expect(store.documents.get(indicatorPath)?.lockedAt).toEqual(store.timestamp);
    expect(store.commits).toHaveLength(1);
    expect(store.commits[0]?.map((operation) => operation.path)).toEqual(
      expect.arrayContaining([indicatorPath, entries()[0]?.[0]]),
    );
  });

  it('replaces only today by creating a new document and deleting the old one in one commit', async () => {
    store.documents.set(indicatorPath, indicator('single_per_day'));
    store.documents.set(entryPath('past'), entry('2026-10-23', 4));
    const { saveEntry } = await repository();
    await saveEntry('alice', input(1));
    const oldToday = entries().find(([, data]) => data.localDate === '2026-10-24')?.[0];
    expect(oldToday).toBeDefined();
    store.commits.length = 0;
    await saveEntry('alice', input(3));
    const today = entries().filter(([, data]) => data.localDate === '2026-10-24');
    expect(today).toHaveLength(1);
    expect(today[0]?.[0]).not.toBe(oldToday);
    expect(today[0]?.[1]).toMatchObject(entry('2026-10-24', 3));
    expect(store.documents.get(entryPath('past'))).toEqual(entry('2026-10-23', 4));
    expect(store.commits).toHaveLength(1);
    const operations = store.commits[0] ?? [];
    expect(operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'delete', path: oldToday }),
        expect.objectContaining({ path: today[0]?.[0], kind: expect.stringMatching(/^(create|set)$/) }),
      ]),
    );
    expect(
      operations.filter(
        (operation) => operation.path.startsWith('users/alice/entries/') && operation.kind === 'update',
      ),
    ).toEqual([]);
  });

  it('creates independent events for multiple entries on the same day', async () => {
    store.documents.set(indicatorPath, indicator('multiple_per_day'));
    const { saveEntry } = await repository();
    await saveEntry('alice', input(0));
    await saveEntry('alice', input(2));
    expect(entries()).toHaveLength(2);
    expect(entries().map(([, data]) => data.value)).toEqual(
      expect.arrayContaining([{ number: 0 }, { number: 2 }]),
    );
    expect(new Set(entries().map(([path]) => path)).size).toBe(2);
  });

  it('deletes a single response today and can delete an earlier entry', async () => {
    store.documents.set(indicatorPath, indicator('single_per_day'));
    store.documents.set(entryPath('past'), entry('2026-10-23', 4));
    const { saveEntry, deleteEntry } = await repository();
    await saveEntry('alice', input(1));
    const todayPath = entries().find(([, data]) => data.localDate === '2026-10-24')?.[0];
    expect(todayPath).toBeDefined();
    await deleteEntry('alice', todayPath?.split('/').at(-1) ?? '');
    expect(entries().filter(([, data]) => data.localDate === '2026-10-24')).toHaveLength(0);
    await deleteEntry('alice', 'past');
    expect(entries()).toHaveLength(0);
  });

  it('does not report success before persistence and propagates write failures', async () => {
    store.documents.set(indicatorPath, indicator('single_per_day'));
    const { saveEntry } = await repository();
    let release = () => {};
    store.gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let settled = false;
    const pending = saveEntry('alice', input(1)).then(() => {
      settled = true;
    });
    await vi.waitFor(() => expect(store.nextId).toBeGreaterThan(0));
    expect(settled).toBe(false);
    expect(entries()).toHaveLength(0);
    release();
    await pending;
    expect(settled).toBe(true);
    expect(entries()).toHaveLength(1);
    store.gate = null;
    store.failure = new Error('Connection failed');
    await expect(saveEntry('alice', input(2))).rejects.toThrow('Connection failed');
    expect(entries()).toHaveLength(1);
    expect(entries()[0]?.[1]).toMatchObject(entry('2026-10-24', 1));
  });
});
