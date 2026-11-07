import { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  suggestAggregation,
  validateIndicator,
  type DailyAggregation,
  type IndicatorGroup,
  type IndicatorInput,
} from '../domain/indicator';

export interface StoredIndicator extends IndicatorInput {
  id: string;
  sortOrder: number;
  archivedAt: Timestamp | null;
  lockedAt: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type CreateIndicatorInput = Omit<IndicatorInput, 'dailyAggregation'> & {
  dailyAggregation?: DailyAggregation | null;
  sortOrder: number;
};

export type UpdateIndicatorInput = Partial<IndicatorInput> & {
  sortOrder?: number;
  archivedAt?: Timestamp | null;
};

export interface IndicatorsState {
  indicators: StoredIndicator[];
  activeIndicators: StoredIndicator[];
  loading: boolean;
  error: Error | null;
}

const inputFields = [
  'group',
  'name',
  'abbreviation',
  'emoji',
  'valueType',
  'numeric',
  'scale',
  'options',
  'desiredDirection',
  'idealRange',
  'frequency',
  'dailyAggregation',
] as const satisfies readonly (keyof IndicatorInput)[];

const lockedFields = [
  'group',
  'valueType',
  'numeric',
  'scale',
  'options',
  'frequency',
  'dailyAggregation',
] as const satisfies readonly (keyof IndicatorInput)[];

const updateFields = [...inputFields, 'sortOrder', 'archivedAt'] as const;

function indicatorsCollection(uid: string) {
  return collection(db, 'users', uid, 'indicators');
}

function indicatorRef(uid: string, id: string) {
  return doc(db, 'users', uid, 'indicators', id);
}

function assertValidIndicator(input: IndicatorInput): void {
  const validation = validateIndicator(input);
  if (!validation.valid) {
    const fields = [...new Set(validation.errors.map((error) => error.field))].join(', ');
    throw new Error(`Invalid indicator configuration: ${fields}`);
  }
}

function assertValidSortOrder(sortOrder: number): void {
  if (!Number.isFinite(sortOrder) || sortOrder < 0) {
    throw new Error('Indicator sort order must be a non-negative finite number.');
  }
}

function storedIndicatorFrom(document: {
  id: string;
  data: () => Record<string, unknown> | undefined;
}): StoredIndicator {
  const data = document.data() ?? {};
  return {
    ...(data as unknown as IndicatorInput),
    id: document.id,
    sortOrder: data.sortOrder as number,
    archivedAt: (data.archivedAt as Timestamp | null | undefined) ?? null,
    lockedAt: (data.lockedAt as Timestamp | null | undefined) ?? null,
    createdAt: (data.createdAt as Timestamp | null | undefined) ?? null,
    updatedAt: (data.updatedAt as Timestamp | null | undefined) ?? null,
  };
}

function indicatorInputFrom(data: IndicatorInput): IndicatorInput {
  return {
    group: data.group,
    name: data.name,
    abbreviation: data.abbreviation,
    emoji: data.emoji,
    valueType: data.valueType,
    numeric: data.numeric,
    scale: data.scale,
    options: data.options,
    desiredDirection: data.desiredDirection,
    idealRange: data.idealRange,
    frequency: data.frequency,
    dailyAggregation: data.dailyAggregation,
  };
}

/**
 * One-shot read of a single indicator for the editor. A read-only transaction uses a unary request,
 * so the route does not keep Firestore's watch stream open the way getDoc/getDocs would.
 */
export async function getIndicator(uid: string, id: string): Promise<StoredIndicator | null> {
  const snapshot = await runTransaction(db, (transaction) => transaction.get(indicatorRef(uid, id)));
  return snapshot.exists() ? storedIndicatorFrom(snapshot) : null;
}

export async function createIndicator(uid: string, input: CreateIndicatorInput): Promise<string> {
  assertValidSortOrder(input.sortOrder);
  const dailyAggregation =
    input.dailyAggregation === undefined
      ? input.frequency === 'single_per_day'
        ? null
        : suggestAggregation({ group: input.group, valueType: input.valueType })
      : input.dailyAggregation;
  const indicator = indicatorInputFrom({ ...input, dailyAggregation });
  assertValidIndicator(indicator);

  const reference = await addDoc(indicatorsCollection(uid), {
    ...indicator,
    sortOrder: input.sortOrder,
    archivedAt: null,
    lockedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return reference.id;
}

export async function updateIndicator(uid: string, id: string, patch: UpdateIndicatorInput): Promise<void> {
  const reference = indicatorRef(uid, id);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) throw new Error('Indicator not found.');

    const current = snapshot.data() as IndicatorInput & { lockedAt?: Timestamp | null };
    const locked = current.lockedAt != null;
    const changes: Record<string, unknown> = {};
    for (const field of updateFields) {
      if (!(field in patch)) continue;
      if (locked && lockedFields.includes(field as (typeof lockedFields)[number])) continue;
      const value = patch[field];
      if (value !== undefined) changes[field] = value;
    }

    if (typeof changes.sortOrder === 'number') assertValidSortOrder(changes.sortOrder);
    const modelChanges = Object.fromEntries(
      inputFields.filter((field) => field in changes).map((field) => [field, changes[field]]),
    ) as Partial<IndicatorInput>;
    assertValidIndicator({ ...indicatorInputFrom(current), ...modelChanges });

    if (Object.keys(changes).length > 0) {
      transaction.update(reference, { ...changes, updatedAt: serverTimestamp() });
    }
  });
}

export async function archiveIndicator(uid: string, id: string): Promise<void> {
  await setArchived(uid, id, true);
}

export async function restoreIndicator(uid: string, id: string): Promise<void> {
  await setArchived(uid, id, false);
}

async function setArchived(uid: string, id: string, archived: boolean): Promise<void> {
  const reference = indicatorRef(uid, id);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) throw new Error('Indicator not found.');
    if ((snapshot.data().archivedAt != null) === archived) return;
    transaction.update(reference, {
      archivedAt: archived ? serverTimestamp() : null,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function reorderIndicators(uid: string, group: IndicatorGroup, ids: string[]): Promise<void> {
  if (new Set(ids).size !== ids.length) throw new Error('Indicator IDs must be unique.');

  await runTransaction(db, async (transaction) => {
    const references = ids.map((id) => indicatorRef(uid, id));
    const snapshots = await Promise.all(references.map((reference) => transaction.get(reference)));
    snapshots.forEach((snapshot) => {
      if (!snapshot.exists()) throw new Error('Indicator not found.');
      if (snapshot.data().group !== group) {
        throw new Error('Indicators can only be reordered within their own group.');
      }
    });
    references.forEach((reference, index) => {
      transaction.update(reference, {
        sortOrder: (index + 1) * 1000,
        updatedAt: serverTimestamp(),
      });
    });
  });
}

export function useIndicators(uid: string): IndicatorsState {
  const [state, setState] = useState<{
    uid: string;
    indicators: StoredIndicator[];
    loading: boolean;
    error: Error | null;
  }>({ uid, indicators: [], loading: Boolean(uid), error: null });

  useEffect(() => {
    let active = true;
    if (!uid) {
      setState({ uid, indicators: [], loading: false, error: null });
      return;
    }

    setState({ uid, indicators: [], loading: true, error: null });
    const liveQuery = query(indicatorsCollection(uid), orderBy('sortOrder', 'asc'));
    const unsubscribe = onSnapshot(
      liveQuery,
      (snapshot) => {
        if (!active) return;
        const next = snapshot.docs
          .map(storedIndicatorFrom)
          .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
        setState({ uid, indicators: next, loading: false, error: null });
      },
      (cause) => {
        if (!active) return;
        setState({
          uid,
          indicators: [],
          loading: false,
          error: cause instanceof Error ? cause : new Error('Unable to load indicators.'),
        });
      },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [uid]);

  const indicators = useMemo(
    () => (state.uid === uid ? state.indicators : []),
    [state.uid, state.indicators, uid],
  );
  const activeIndicators = useMemo(
    () => indicators.filter((indicator) => indicator.archivedAt == null),
    [indicators],
  );
  return {
    indicators,
    activeIndicators,
    loading: state.uid === uid ? state.loading : Boolean(uid),
    error: state.uid === uid ? state.error : null,
  };
}
