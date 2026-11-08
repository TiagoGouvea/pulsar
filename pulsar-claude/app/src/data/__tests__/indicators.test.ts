import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IndicatorInput } from '../../domain/indicator';

// The repository uses a Firestore test double here; the companion rules tests exercise the real emulator.
const store = vi.hoisted(() => ({
  documents: new Map<string, Record<string, unknown>>(),
  writes: [] as { path: string; data: Record<string, unknown> }[],
  listeners: new Set<() => void>(),
  nextId: 0,
  serverTime: { serverTimestamp: true },
  conflict: null as null | (() => void),
}));

vi.mock('../../lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', async (importOriginal) => {
  const original = await importOriginal<typeof import('firebase/firestore')>();
  type Ref = { path: string; id: string };
  const ref = (...parts: unknown[]): Ref => {
    const path = parts
      .map((part) =>
        typeof part === 'object' && part !== null && 'path' in part ? String(part.path) : String(part),
      )
      .join('/');
    return { path, id: path.split('/').at(-1) ?? '' };
  };
  const documentSnapshot = (reference: Ref) => ({
    id: reference.id,
    ref: reference,
    exists: () => store.documents.has(reference.path),
    data: () => store.documents.get(reference.path),
    metadata: { fromCache: false, hasPendingWrites: false },
  });
  const querySnapshot = (reference: Ref) => {
    const prefix = `${reference.path}/`;
    const docs = [...store.documents.keys()]
      .filter((path) => path.startsWith(prefix) && !path.slice(prefix.length).includes('/'))
      .map((path) => documentSnapshot(ref(path)));
    return {
      docs,
      empty: docs.length === 0,
      size: docs.length,
      forEach: (fn: (snapshot: unknown) => void) => docs.forEach(fn),
      metadata: { fromCache: false, hasPendingWrites: false },
    };
  };
  const notify = () => store.listeners.forEach((listener) => listener());
  const write = (reference: Ref, data: Record<string, unknown>, merge = true) => {
    store.writes.push({ path: reference.path, data });
    store.documents.set(reference.path, { ...(merge ? store.documents.get(reference.path) : {}), ...data });
    notify();
  };
  return {
    ...original,
    collection: (_db: unknown, ...parts: unknown[]) => ref(...parts),
    doc: (first: unknown, ...parts: unknown[]) => {
      if (parts.length === 0) return ref(first, `generated-${++store.nextId}`);
      return ref(
        ...(typeof first === 'object' && first !== null && 'path' in first ? [first, ...parts] : parts),
      );
    },
    query: (reference: Ref) => reference,
    where: () => ({}),
    orderBy: () => ({}),
    serverTimestamp: () => store.serverTime,
    addDoc: async (reference: Ref, data: Record<string, unknown>) => {
      const target = ref(reference, `generated-${++store.nextId}`);
      write(target, data, false);
      return target;
    },
    setDoc: async (reference: Ref, data: Record<string, unknown>, options?: { merge?: boolean }) =>
      write(reference, data, options?.merge === true),
    updateDoc: async (reference: Ref, data: Record<string, unknown>) => write(reference, data),
    getDoc: async (reference: Ref) => documentSnapshot(reference),
    getDocs: async (reference: Ref) => querySnapshot(reference),
    runTransaction: async (_db: unknown, callback: (transaction: unknown) => Promise<void>) => {
      for (;;) {
        const operations: (() => void)[] = [];
        const transaction = {
          get: async (reference: Ref) => documentSnapshot(reference),
          update: (reference: Ref, data: Record<string, unknown>) => {
            operations.push(() => write(reference, data));
          },
        };
        await callback(transaction);
        if (store.conflict) {
          const conflict = store.conflict;
          store.conflict = null;
          conflict();
          continue;
        }
        operations.forEach((operation) => operation());
        return;
      }
    },
    onSnapshot: (reference: Ref, callback: (snapshot: unknown) => void) => {
      const emit = () => callback(querySnapshot(reference));
      store.listeners.add(emit);
      queueMicrotask(emit);
      return () => store.listeners.delete(emit);
    },
    writeBatch: () => {
      const operations: (() => void)[] = [];
      const batch = {
        update: (reference: Ref, data: Record<string, unknown>) => {
          operations.push(() => write(reference, data));
          return batch;
        },
        set: (reference: Ref, data: Record<string, unknown>, options?: { merge?: boolean }) => {
          operations.push(() => write(reference, data, options?.merge === true));
          return batch;
        },
        commit: async () => {
          operations.forEach((operation) => operation());
        },
      };
      return batch;
    },
  };
});

type StoredIndicator = IndicatorInput & {
  id: string;
  sortOrder: number;
  archivedAt: unknown;
  lockedAt: unknown;
};
type Repository = {
  createIndicator: (
    uid: string,
    input: Omit<IndicatorInput, 'dailyAggregation'> & {
      dailyAggregation?: IndicatorInput['dailyAggregation'];
      sortOrder: number;
    },
  ) => Promise<string>;
  updateIndicator: (
    uid: string,
    id: string,
    patch: Partial<IndicatorInput> & { sortOrder?: number; archivedAt?: unknown },
  ) => Promise<void>;
  archiveIndicator: (uid: string, id: string) => Promise<void>;
  restoreIndicator: (uid: string, id: string) => Promise<void>;
  reorderIndicators: (uid: string, group: IndicatorInput['group'], ids: string[]) => Promise<void>;
  useIndicators: (uid: string) => { indicators: StoredIndicator[]; activeIndicators: StoredIndicator[] };
};

// Keep the missing module as a runtime failure until the feature is implemented.
const repositoryPath = '../indicators';
const repository = async () => (await import(/* @vite-ignore */ repositoryPath)) as Repository;
const path = (id: string) => `users/alice/indicators/${id}`;
const base = {
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
  frequency: 'multiple_per_day',
  sortOrder: 1000,
} as const;
const saved = (overrides: Record<string, unknown> = {}) => ({
  ...base,
  dailyAggregation: 'sum',
  archivedAt: null,
  lockedAt: null,
  createdAt: store.serverTime,
  updatedAt: store.serverTime,
  ...overrides,
});

beforeEach(() => {
  store.documents.clear();
  store.writes.length = 0;
  store.listeners.clear();
  store.nextId = 0;
  store.conflict = null;
});

describe('indicator repository', () => {
  it.each([
    ['factor numeric', base, 'sum'],
    ['result numeric', { ...base, group: 'result' as const, desiredDirection: 'neutral' as const }, 'last'],
    [
      'scale',
      { ...base, valueType: 'scale' as const, numeric: null, scale: { min: 0, max: 10, step: 1 } },
      'mean',
    ],
    ['boolean', { ...base, valueType: 'boolean' as const, numeric: null }, 'any'],
    [
      'ordinal',
      {
        ...base,
        valueType: 'ordinal' as const,
        numeric: null,
        options: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ],
      },
      'last',
    ],
  ])(
    'creates %s with its suggested aggregation and server timestamps',
    async (_label, input, aggregation) => {
      const { createIndicator } = await repository();
      const id = await createIndicator('alice', input);
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      expect(store.documents.get(path(id))).toEqual({
        ...input,
        dailyAggregation: aggregation,
        archivedAt: null,
        lockedAt: null,
        createdAt: store.serverTime,
        updatedAt: store.serverTime,
      });
    },
  );

  it('preserves an explicitly chosen compatible aggregation', async () => {
    const { createIndicator } = await repository();
    const id = await createIndicator('alice', { ...base, dailyAggregation: 'mean' });
    expect(store.documents.get(path(id))?.dailyAggregation).toBe('mean');
  });

  it('archives and restores without removing entries and updates the active live list', async () => {
    store.documents.set(path('coffee'), saved());
    const entryPath = 'users/alice/entries/entry-1';
    const entry = { indicatorId: 'coffee', localDate: '2026-01-02', value: { number: 2 } };
    store.documents.set(entryPath, entry);
    const { useIndicators, archiveIndicator, restoreIndicator } = await repository();
    const { result, unmount } = renderHook(() => useIndicators('alice'));
    await waitFor(() => expect(result.current.activeIndicators.map((item) => item.id)).toContain('coffee'));
    await act(async () => archiveIndicator('alice', 'coffee'));
    await waitFor(() =>
      expect(result.current.activeIndicators.map((item) => item.id)).not.toContain('coffee'),
    );
    expect(result.current.indicators.map((item) => item.id)).toContain('coffee');
    expect(store.documents.get(entryPath)).toEqual(entry);
    await act(async () => restoreIndicator('alice', 'coffee'));
    await waitFor(() => expect(result.current.activeIndicators.map((item) => item.id)).toContain('coffee'));
    expect(store.documents.get(entryPath)).toEqual(entry);
    unmount();
  });

  it('does not rewrite timestamps when archive or restore is repeated', async () => {
    store.documents.set(path('coffee'), saved());
    const { archiveIndicator, restoreIndicator } = await repository();
    await archiveIndicator('alice', 'coffee');
    await archiveIndicator('alice', 'coffee');
    expect(store.writes).toHaveLength(1);
    await restoreIndicator('alice', 'coffee');
    await restoreIndicator('alice', 'coffee');
    expect(store.writes).toHaveLength(2);
    expect(store.documents.get(path('coffee'))?.archivedAt).toBeNull();
  });

  it('persists reordered factors separately from results across a fresh subscription', async () => {
    store.documents.set(path('factor-a'), saved({ sortOrder: 1000 }));
    store.documents.set(path('factor-b'), saved({ name: 'Sono', sortOrder: 2000 }));
    store.documents.set(
      path('result-a'),
      saved({ group: 'result', desiredDirection: 'neutral', sortOrder: 1000 }),
    );
    store.documents.set(
      path('result-b'),
      saved({ group: 'result', desiredDirection: 'neutral', sortOrder: 2000 }),
    );
    const { reorderIndicators, useIndicators } = await repository();
    await reorderIndicators('alice', 'factor', ['factor-b', 'factor-a']);
    const { result, unmount } = renderHook(() => useIndicators('alice'));
    await waitFor(() => expect(result.current.indicators).toHaveLength(4));
    expect(
      result.current.indicators.filter((item) => item.group === 'factor').map((item) => item.id),
    ).toEqual(['factor-b', 'factor-a']);
    expect(
      result.current.indicators.filter((item) => item.group === 'result').map((item) => item.id),
    ).toEqual(['result-a', 'result-b']);
    unmount();
  });

  it('does not send locked configuration fields when editing a locked indicator', async () => {
    store.documents.set(path('coffee'), saved({ lockedAt: store.serverTime }));
    const { updateIndicator } = await repository();
    await updateIndicator('alice', 'coffee', {
      name: 'Café novo',
      abbreviation: 'NOV',
      emoji: '☕',
      sortOrder: 3000,
      group: 'result',
      valueType: 'boolean',
      numeric: null,
      scale: null,
      options: null,
      frequency: 'single_per_day',
      dailyAggregation: null,
    });
    const writes = store.writes.filter((write) => write.path === path('coffee'));
    expect(writes.length).toBeGreaterThan(0);
    const fieldsSent = Object.assign({}, ...writes.map((write) => write.data)) as Record<string, unknown>;
    for (const field of [
      'group',
      'valueType',
      'numeric',
      'scale',
      'options',
      'frequency',
      'dailyAggregation',
      'lockedAt',
    ]) {
      expect(fieldsSent).not.toHaveProperty(field);
    }
    expect(store.documents.get(path('coffee'))).toMatchObject({
      name: 'Café novo',
      abbreviation: 'NOV',
      sortOrder: 3000,
      group: 'factor',
      valueType: 'numeric',
      numeric: base.numeric,
      dailyAggregation: 'sum',
    });
  });

  it('retries an edit against a concurrently locked indicator', async () => {
    store.documents.set(path('coffee'), saved());
    store.conflict = () => store.documents.set(path('coffee'), saved({ lockedAt: store.serverTime }));
    const { updateIndicator } = await repository();
    await updateIndicator('alice', 'coffee', { name: 'Café novo', dailyAggregation: 'mean' });
    expect(store.documents.get(path('coffee'))).toMatchObject({
      name: 'Café novo',
      dailyAggregation: 'sum',
      lockedAt: store.serverTime,
    });
    expect(store.writes).toHaveLength(1);
    expect(store.writes[0]?.data).not.toHaveProperty('dailyAggregation');
  });

  it('does not reorder an indicator moved to another group during the transaction', async () => {
    store.documents.set(path('coffee'), saved());
    store.conflict = () =>
      store.documents.set(path('coffee'), saved({ group: 'result', desiredDirection: 'neutral' }));
    const { reorderIndicators } = await repository();
    await expect(reorderIndicators('alice', 'factor', ['coffee'])).rejects.toThrow(
      'Indicators can only be reordered within their own group.',
    );
    expect(store.writes).toHaveLength(0);
  });

  it('rejects a stale reorder when another device changes the order during the transaction', async () => {
    store.documents.set(path('factor-a'), saved({ sortOrder: 1000 }));
    store.documents.set(path('factor-b'), saved({ sortOrder: 2000 }));
    store.conflict = () => store.documents.set(path('factor-a'), saved({ sortOrder: 3000 }));
    const { reorderIndicators } = await import('../indicators');
    await expect(
      reorderIndicators(
        'alice',
        'factor',
        ['factor-b', 'factor-a'],
        new Map([
          ['factor-a', 1000],
          ['factor-b', 2000],
        ]),
      ),
    ).rejects.toThrow('Indicator order changed.');
    expect(store.writes).toHaveLength(0);
    expect(store.documents.get(path('factor-a'))?.sortOrder).toBe(3000);
  });

  it('clears the previous account immediately when the subscribed user changes', async () => {
    store.documents.set(path('coffee'), saved());
    const { useIndicators } = await repository();
    const { result, rerender, unmount } = renderHook(({ uid }) => useIndicators(uid), {
      initialProps: { uid: 'alice' },
    });
    await waitFor(() => expect(result.current.indicators).toHaveLength(1));
    rerender({ uid: 'bob' });
    expect(result.current.indicators).toEqual([]);
    expect(result.current.activeIndicators).toEqual([]);
    unmount();
  });
});
