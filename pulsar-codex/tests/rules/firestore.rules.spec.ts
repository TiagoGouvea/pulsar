import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment
} from '@firebase/rules-unit-testing'
import {
  collection,
  collectionGroup,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData
} from 'firebase/firestore'

const OWNER = 'owner-uid'
const OTHER = 'other-uid'
const MAX_OPTIONS = 8
const RULES = readFileSync(fileURLToPath(new URL('../../firestore.rules', import.meta.url)), 'utf8')
const emulatorAddress = process.env.FIRESTORE_EMULATOR_HOST ?? ''
const [emulatorHost, emulatorPort] = emulatorAddress.split(':')

let testEnv: RulesTestEnvironment

beforeAll(async () => {
  if (!/^(127\.0\.0\.1|localhost):\d+$/.test(emulatorAddress)) {
    throw new Error(
      'Execute yarn test:rules com o emulador local; nenhum host externo é permitido.'
    )
  }
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-pulsar-codex',
    firestore: {
      rules: RULES,
      host: emulatorHost,
      port: Number(emulatorPort)
    }
  })
})

afterAll(async () => {
  await testEnv?.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
})

function client(uid: string) {
  return testEnv
    .authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous', identities: {} } })
    .firestore()
}

function userPath(uid: string) {
  return doc(client(uid), 'users', uid)
}

function indicatorPath(uid: string, indicatorId = 'indicator-1') {
  return doc(client(uid), 'users', uid, 'indicators', indicatorId)
}

async function seed(path: string[], data: DocumentData): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), path[0], ...path.slice(1)), data)
  })
}

function without(data: DocumentData, key: string): DocumentData {
  const copy = { ...data }
  delete copy[key]
  return copy
}

function profile(overrides: DocumentData = {}) {
  return {
    onboardingCompleted: false,
    aiConsent: false,
    reminderEnabled: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides
  }
}

function booleanIndicator(overrides: DocumentData = {}) {
  return {
    group: 'factor',
    name: 'Exercício Físico',
    abbreviation: 'EXE',
    emoji: '🏋️',
    valueType: 'boolean',
    frequency: 'single_per_day',
    sortOrder: 1000,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides
  }
}

function numericIndicator(overrides: DocumentData = {}) {
  return {
    group: 'factor',
    name: 'Café Expresso',
    abbreviation: 'CAF',
    emoji: '☕',
    valueType: 'numeric',
    numeric: { unit: 'xícaras', min: 0, max: null, step: 0.5 },
    frequency: 'multiple_per_day',
    dailyAggregation: 'sum',
    sortOrder: 1010,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides
  }
}

function scaleIndicator(overrides: DocumentData = {}) {
  return {
    group: 'result',
    name: 'Nível de Energia',
    abbreviation: 'ENE',
    emoji: '⚡',
    valueType: 'scale',
    scale: { min: 0, max: 10, step: 1 },
    desiredDirection: 'higher',
    frequency: 'single_per_day',
    sortOrder: 1020,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides
  }
}

function targetRangeIndicator(overrides: DocumentData = {}) {
  return {
    ...scaleIndicator(),
    name: 'Concentração / Foco',
    abbreviation: 'CON',
    emoji: '🧠',
    desiredDirection: 'target_range',
    idealRange: { min: 7, max: 10 },
    sortOrder: 1030,
    ...overrides
  }
}

function ordinalIndicator(overrides: DocumentData = {}) {
  return {
    group: 'factor',
    name: 'Humor',
    abbreviation: 'HUM',
    emoji: '🙂',
    valueType: 'ordinal',
    options: [
      { id: 'low', label: 'Baixo', order: 0 },
      { id: 'medium', label: 'Médio', order: 1 },
      { id: 'high', label: 'Alto', order: 2 }
    ],
    frequency: 'single_per_day',
    sortOrder: 1040,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides
  }
}

describe('ownership isolation', () => {
  it('accepts the owner writing and reading their own profile and indicators', async () => {
    await assertSucceeds(setDoc(userPath(OWNER), profile()))
    await assertSucceeds(getDoc(userPath(OWNER)))

    await assertSucceeds(setDoc(indicatorPath(OWNER), booleanIndicator()))
    await assertSucceeds(getDoc(indicatorPath(OWNER)))
    await assertSucceeds(setDoc(indicatorPath(OWNER, 'indicator-2'), numericIndicator()))
    await assertSucceeds(getDocs(collection(client(OWNER), 'users', OWNER, 'indicators')))
  })

  it('denies every unauthenticated read and write', async () => {
    const anonymous = testEnv.unauthenticatedContext().firestore()

    await assertFails(getDoc(doc(anonymous, 'users', OWNER)))
    await assertFails(setDoc(doc(anonymous, 'users', OWNER), profile()))
    await assertFails(
      setDoc(doc(anonymous, 'users', OWNER, 'indicators', 'i1'), booleanIndicator())
    )
    await assertFails(getDoc(doc(anonymous, 'users', OWNER, 'indicators', 'i1')))
  })

  it('never lets one UID read, write or delete another UID data', async () => {
    await seed(['users', OWNER], { onboardingCompleted: true })
    await seed(['users', OWNER, 'indicators', 'i1'], booleanIndicator())
    const other = client(OTHER)

    await assertFails(getDoc(doc(other, 'users', OWNER)))
    await assertFails(getDoc(doc(other, 'users', OWNER, 'indicators', 'i1')))
    await assertFails(getDocs(collection(other, 'users', OWNER, 'indicators')))
    await assertFails(setDoc(doc(other, 'users', OWNER), profile()))
    await assertFails(updateDoc(doc(other, 'users', OWNER), { onboardingCompleted: true }))
    await assertFails(setDoc(doc(other, 'users', OWNER, 'indicators', 'i1'), booleanIndicator()))
    await assertFails(deleteDoc(doc(other, 'users', OWNER, 'indicators', 'i1')))
    await assertFails(setDoc(doc(other, 'users', OWNER, 'entries', 'e1'), { indicatorId: 'i1' }))

    // The very same operations succeed when scoped to the caller's own UID.
    await assertSucceeds(setDoc(doc(other, 'users', OTHER), profile()))
    await assertSucceeds(setDoc(doc(other, 'users', OTHER, 'indicators', 'i1'), booleanIndicator()))
    await assertSucceeds(getDocs(collection(other, 'users', OTHER, 'indicators')))
  })

  it('rejects a list query that would span UIDs', async () => {
    await seed(['users', OWNER], { onboardingCompleted: true })
    await assertFails(getDocs(collection(client(OTHER), 'users')))
  })
})

describe('internal fields and server-only collections', () => {
  it.each([
    ['quota', { quota: 10 }],
    ['billing', { billingTier: 'paid' }],
    ['last notification timestamp', { lastNotificationSentAt: new Date(0) }],
    ['idempotency', { idempotencyKey: 'same-request' }],
    ['push', { pushToken: 'device-token' }],
    ['refresh accounting', { lastInsightRefreshAt: serverTimestamp() }],
    ['owner override', { ownerUid: OTHER }]
  ])('rejects %s on profile create and update', async (_name, internal) => {
    await assertFails(setDoc(userPath(OWNER), profile(internal)))

    await assertSucceeds(setDoc(userPath(OWNER), profile()))
    await assertFails(updateDoc(userPath(OWNER), internal))
    await assertSucceeds(getDoc(userPath(OWNER)))
  })

  it('keeps deletion markers and internal documents closed to clients', async () => {
    await assertFails(
      setDoc(doc(client(OWNER), 'accountDeletions', OWNER), { startedAt: new Date(0) })
    )
    await assertFails(getDoc(doc(client(OWNER), 'accountDeletions', OWNER)))
    await assertFails(setDoc(doc(client(OWNER), 'internal', 'userQuotas'), { used: 0 }))
    await assertFails(getDoc(doc(client(OWNER), 'internal', 'userQuotas')))
  })

  it('keeps quota, billing, push and idempotency state server-only', async () => {
    // The client cannot read or write server-only state (internal/**).
    // All attempts to create or read documents in these collections must fail.
    const paths = [
      ['internal/users', OWNER, 'quota'],
      ['internal/users', OWNER, 'billing'],
      ['internal/users', OWNER, 'pushTokens'],
      ['internal/users', OWNER, 'idempotency']
    ]
    for (const path of paths) {
      await assertFails(setDoc(doc(client(OWNER), ...path), { used: 0 }))
      await assertFails(getDoc(doc(client(OWNER), ...path)))
    }
  })

  it('keeps push state and push delivery fields closed until that resource defines its schema', async () => {
    await assertFails(
      setDoc(doc(client(OWNER), 'users', OWNER, 'pushSubscriptions', 'device-1'), {
        token: 'device-token',
        lastNotificationSentAt: new Date(0)
      })
    )
    await assertFails(
      setDoc(doc(client(OWNER), 'users', OWNER, 'pushSubscriptions', 'device-1'), {
        token: 'device-token'
      })
    )
  })

  it('keeps insights, feedback and summaries closed until their own tasks add rules', async () => {
    for (const [name, data] of [
      ['insights', { type: 'association' }],
      ['savedInsights', { type: 'association' }],
      ['insightFeedback', { action: 'liked' }],
      ['dailySummaries', { localDate: '2026-10-24' }]
    ]) {
      await assertFails(setDoc(doc(client(OWNER), 'users', OWNER, name, 'doc-1'), data))
    }
  })
})

describe('isolation defense in depth', () => {
  it.each([
    'insights',
    'savedInsights',
    'insightFeedback',
    'pushSubscriptions',
    'dailySummaries',
    'unknown'
  ])('denies all access to %s for owner, foreign UID and unauthenticated clients', async name => {
    await seed(['users', OWNER, name, 'existing'], { private: true })
    for (const db of [client(OWNER), client(OTHER), testEnv.unauthenticatedContext().firestore()]) {
      const reference = doc(db, 'users', OWNER, name, 'existing')
      await assertFails(getDoc(reference))
      await assertFails(getDocs(collection(db, 'users', OWNER, name)))
      await assertFails(setDoc(doc(db, 'users', OWNER, name, 'new'), { private: false }))
      await assertFails(updateDoc(reference, { private: false }))
      await assertFails(deleteDoc(reference))
    }
  })

  it('rejects collection-group queries and writes to arbitrary nested paths', async () => {
    await seed(['users', OWNER, 'indicators', 'existing'], booleanIndicator())
    await assertFails(getDocs(collectionGroup(client(OWNER), 'indicators')))
    await assertFails(
      setDoc(doc(client(OWNER), 'users', OWNER, 'indicators', 'existing', 'private', 'nested'), {
        quota: 0
      })
    )
    await assertFails(
      setDoc(doc(client(OTHER), 'users', OWNER, 'indicators', 'new'), booleanIndicator())
    )
  })

  it('rejects a mixed-UID atomic batch without persisting its authorized half', async () => {
    const db = client(OWNER)
    const batch = writeBatch(db)
    batch.set(doc(db, 'users', OWNER), profile())
    batch.set(doc(db, 'users', OTHER), profile())
    await assertFails(batch.commit())
    expect((await getDoc(doc(db, 'users', OWNER))).exists()).toBe(false)
  })

  it.each(['quota', 'billing', 'push', 'idempotency', 'futureInternalField'])(
    'never allows adding, replacing or removing server field %s',
    async field => {
      await assertSucceeds(setDoc(indicatorPath(OWNER), booleanIndicator()))
      await assertFails(
        updateDoc(indicatorPath(OWNER), { [field]: { used: 0 }, updatedAt: serverTimestamp() })
      )
      await seed(['users', OWNER], { [field]: { used: 1 } })
      await assertFails(updateDoc(userPath(OWNER), { [field]: deleteField() }))
      await assertFails(setDoc(userPath(OWNER), profile()))
      await seed(['users', OWNER, 'indicators', 'indicator-1'], {
        ...booleanIndicator(),
        [field]: { used: 1 }
      })
      await assertFails(
        updateDoc(indicatorPath(OWNER), { [field]: deleteField(), updatedAt: serverTimestamp() })
      )
    }
  )

  it('denies reads, lists, creates, updates and deletes of existing internal state', async () => {
    for (const path of [
      `accountDeletions/${OTHER}`,
      `internal/users/${OWNER}/quota`,
      `internal/billing/${OWNER}/invoice`
    ]) {
      await seed(path.split('/'), { used: 1 })
      const db = client(OWNER)
      const reference = doc(db, path)
      await assertFails(getDoc(reference))
      await assertFails(getDocs(collection(db, path.split('/').slice(0, -1).join('/'))))
      await assertFails(setDoc(reference, { used: 0 }))
      await assertFails(updateDoc(reference, { used: 0 }))
      await assertFails(deleteDoc(reference))
    }
  })
})

describe('profile validation', () => {
  it('accepts the tutorial completion merge write used by the app', async () => {
    await assertSucceeds(
      setDoc(
        userPath(OWNER),
        {
          onboardingCompleted: true,
          onboardingCompletedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      )
    )
  })

  it.each([
    ['unknown field', { displayName: 'Ana' }],
    ['non-boolean consent', { aiConsent: 'yes' }],
    ['non-boolean reminder', { reminderEnabled: 1 }],
    ['client date instead of server timestamp', { onboardingCompletedAt: new Date(0) }]
  ])('rejects %s', async (_name, invalid) => {
    await assertFails(setDoc(userPath(OWNER), profile(invalid)))
  })

  it('does not let the client remove or rewrite the creation timestamp', async () => {
    await assertSucceeds(setDoc(userPath(OWNER), profile()))
    await assertFails(updateDoc(userPath(OWNER), { createdAt: new Date(0) }))
    await assertFails(updateDoc(userPath(OWNER), { createdAt: null }))
    await assertFails(updateDoc(userPath(OWNER), { createdAt: deleteField() }))
  })

  it('accepts a merge write that keeps the stored timestamps untouched', async () => {
    await assertSucceeds(setDoc(userPath(OWNER), profile()))
    await assertSucceeds(
      updateDoc(userPath(OWNER), {
        aiConsent: true,
        aiConsentAt: serverTimestamp()
      })
    )
  })

  it('does not let the client replace a stored timestamp with an arbitrary date', async () => {
    await assertSucceeds(setDoc(userPath(OWNER), profile()))
    await assertFails(updateDoc(userPath(OWNER), { onboardingCompletedAt: new Date(0) }))
  })

  it('does not let the client delete its own profile document', async () => {
    await assertSucceeds(setDoc(userPath(OWNER), profile()))
    await assertFails(deleteDoc(userPath(OWNER)))
  })
})

describe('indicator schema and limits', () => {
  it.each([
    ['boolean / single', booleanIndicator()],
    ['boolean / single with null aggregation', { ...booleanIndicator(), dailyAggregation: null }],
    ['boolean / multiple with presence', { ...booleanIndicator(), frequency: 'multiple_per_day', dailyAggregation: 'any' }],
    ['boolean / multiple with last', { ...booleanIndicator(), frequency: 'multiple_per_day', dailyAggregation: 'last' }],
    ['numeric / multiple with sum', numericIndicator()],
    ['numeric / multiple without unit', { ...numericIndicator(), numeric: { unit: '', min: 0, max: null, step: 0.5 } }],
    ['scale / single with direction', scaleIndicator()],
    ['scale / single with target range', targetRangeIndicator()],
    ['ordinal / single with options', ordinalIndicator()],
    ['empty abbreviation fallback', { ...booleanIndicator(), abbreviation: '' }]
  ])('accepts a valid %s indicator', async (_name, indicator) => {
    await assertSucceeds(setDoc(indicatorPath(OWNER), indicator))
  })

  it('accepts inclusive name, abbreviation and ordering boundaries', async () => {
    await assertSucceeds(
      setDoc(
        indicatorPath(OWNER),
        booleanIndicator({
          name: 'x'.repeat(80),
          abbreviation: 'x'.repeat(8),
          sortOrder: 1000000
        })
      )
    )
  })

  it('accepts the largest ordinal list on create', async () => {
    await assertSucceeds(
      setDoc(
        indicatorPath(OWNER, 'ordinal'),
        ordinalIndicator({
          options: Array.from({ length: MAX_OPTIONS }, (_, index) => ({
            id: `o${index}`,
            label: 'x'.repeat(120),
            order: index
          }))
        })
      )
    )
  })

  it('accepts the largest ordinal list on update', async () => {
    await seed(
      ['users', OWNER, 'indicators', 'ordinal'],
      ordinalIndicator({
        options: Array.from({ length: MAX_OPTIONS }, (_, index) => ({
          id: `o${index}`,
          label: 'x'.repeat(120),
          order: index
        }))
      })
    )
    await assertSucceeds(
      updateDoc(indicatorPath(OWNER, 'ordinal'), {
        name: 'Novo nome',
        updatedAt: serverTimestamp()
      })
    )
  })

  it('accepts the maximum ordinal result with direction, aggregation and archiving', async () => {
    await assertSucceeds(
      setDoc(
        indicatorPath(OWNER),
        ordinalIndicator({
          group: 'result',
          desiredDirection: 'higher',
          frequency: 'multiple_per_day',
          dailyAggregation: 'last',
          options: Array.from({ length: MAX_OPTIONS }, (_, index) => ({
            id: `o${index}`,
            label: 'x'.repeat(120),
            order: index
          }))
        })
      )
    )
    await assertSucceeds(
      updateDoc(indicatorPath(OWNER), {
        archivedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    )
  })

  it('accepts inclusive numeric size boundaries', async () => {
    await assertSucceeds(
      setDoc(
        indicatorPath(OWNER, 'numeric'),
        numericIndicator({
          numeric: { unit: 'x'.repeat(24), min: -1000000, max: 1000000, step: 0.000001 }
        })
      )
    )
  })

  it('validates the final ordinal option instead of just the first one', async () => {
    const options = Array.from({ length: MAX_OPTIONS }, (_, index) => ({
      id: `o${index}`,
      label: 'Opção',
      order: index
    }))
    await assertFails(
      setDoc(
        indicatorPath(OWNER),
        ordinalIndicator({
          options: [
            ...options.slice(0, -1),
            { ...options[MAX_OPTIONS - 1], label: 'x'.repeat(121) }
          ]
        })
      )
    )
  })

  it('accepts an archived indicator timestamp written by the server clock', async () => {
    await assertSucceeds(
      setDoc(indicatorPath(OWNER), {
        ...booleanIndicator(),
        archivedAt: serverTimestamp()
      })
    )
  })

  it.each([
    ['unknown internal field', { ...booleanIndicator(), quota: 1 }],
    ['lonely owner field', { ...booleanIndicator(), ownerUid: OTHER }],
    ['long name', { ...booleanIndicator(), name: 'x'.repeat(81) }],
    ['long abbreviation', { ...booleanIndicator(), abbreviation: 'ABCDEFGHI' }],
    ['invalid group', { ...booleanIndicator(), group: 'other' }],
    ['invalid value type', { ...booleanIndicator(), valueType: 'text' }],
    ['invalid frequency', { ...booleanIndicator(), frequency: 'hourly' }],
    ['out-of-range sort order', { ...booleanIndicator(), sortOrder: -1 }],
    ['client date instead of server timestamp', { ...booleanIndicator(), createdAt: new Date(0) }],
    ['aggregation on single record', { ...booleanIndicator(), dailyAggregation: 'any' }],
    [
      'boolean with sum',
      {
        ...booleanIndicator(),
        frequency: 'multiple_per_day',
        dailyAggregation: 'sum'
      }
    ],
    [
      'multiple records without aggregation',
      {
        ...booleanIndicator(),
        frequency: 'multiple_per_day'
      }
    ],
    ['numeric without config', without(numericIndicator(), 'numeric')],
    [
      'negative numeric step',
      { ...numericIndicator(), numeric: { unit: 'x', min: 0, max: 10, step: 0 } }
    ],
    [
      'numeric min above max',
      { ...numericIndicator(), numeric: { unit: 'x', min: 10, max: 1, step: 1 } }
    ],
    ['scale min above max', { ...scaleIndicator(), scale: { min: 10, max: 1, step: 1 } }],
    ['scale with zero step', { ...scaleIndicator(), scale: { min: 0, max: 10, step: 0 } }],
    ['ordinal without options', { ...without(scaleIndicator(), 'scale'), valueType: 'ordinal' }],
    [
      'ordinal with a single option',
      { ...ordinalIndicator(), options: [{ id: 'only', label: 'Único', order: 0 }] }
    ],
    [
      'ordinal above the option limit',
      {
        ...ordinalIndicator(),
        options: Array.from({ length: MAX_OPTIONS + 1 }, (_value, index) => ({
          id: `option-${index}`,
          label: `Opção ${index}`,
          order: index
        }))
      }
    ],
    ['target range on a factor', { ...targetRangeIndicator(), group: 'factor' }],
    [
      'boolean with mean',
      {
        ...booleanIndicator(),
        frequency: 'multiple_per_day',
        dailyAggregation: 'mean'
      }
    ],
    [
      'target range on a boolean result',
      {
        ...booleanIndicator(),
        group: 'result',
        desiredDirection: 'target_range',
        idealRange: { min: 0, max: 1 }
      }
    ],
    [
      'target range on an ordinal result',
      {
        ...ordinalIndicator(),
        group: 'result',
        desiredDirection: 'target_range',
        idealRange: { min: 0, max: 1 }
      }
    ],
    ['desired direction on a factor', { ...scaleIndicator(), group: 'factor' }],
    [
      'ideal range on a factor',
      { ...without(targetRangeIndicator(), 'desiredDirection'), group: 'factor' }
    ],
    [
      'option with an unknown field',
      {
        ...ordinalIndicator(),
        options: [
          { id: 'low', label: 'Baixo', order: 0, value: 1 },
          { id: 'high', label: 'Alto', order: 1 }
        ]
      }
    ],
    [
      'option without a label',
      {
        ...ordinalIndicator(),
        options: [
          { id: 'low', order: 0 },
          { id: 'high', label: 'Alto', order: 1 }
        ]
      }
    ],
    [
      'option with a non-integer order',
      {
        ...ordinalIndicator(),
        options: [
          { id: 'low', label: 'Baixo', order: 'first' },
          { id: 'high', label: 'Alto', order: 1 }
        ]
      }
    ],
    [
      'ideal range outside the numeric bounds',
      {
        ...numericIndicator(),
        numeric: { unit: 'x', min: 0, max: 15, step: 1 },
        group: 'result',
        desiredDirection: 'target_range',
        idealRange: { min: 10, max: 20 }
      }
    ],
    ['unknown indicator field', { ...booleanIndicator(), custom: true }],
    ['target range without ideal range', targetRangeWithoutIdealRange()],
    [
      'ideal range outside the scale',
      { ...targetRangeIndicator(), idealRange: { min: -1, max: 11 } }
    ],
    [
      'ideal range with min above max',
      { ...targetRangeIndicator(), idealRange: { min: 9, max: 8 } }
    ],
    [
      'ideal range without target direction',
      {
        ...scaleIndicator(),
        desiredDirection: 'higher',
        idealRange: { min: 7, max: 10 }
      }
    ]
  ])('rejects %s', async (_name, indicator) => {
    await assertFails(setDoc(indicatorPath(OWNER), indicator))
  })

  it('does not let the client rewrite createdAt or skip updatedAt on update', async () => {
    await assertSucceeds(setDoc(indicatorPath(OWNER), booleanIndicator()))

    await assertFails(updateDoc(indicatorPath(OWNER), { createdAt: new Date(0) }))
    await assertFails(updateDoc(indicatorPath(OWNER), { name: 'Novo nome' }))
    await assertSucceeds(
      updateDoc(indicatorPath(OWNER), {
        name: 'Novo nome',
        updatedAt: serverTimestamp()
      })
    )
  })

  it('allows the owner to archive and restore an indicator, but never delete its history', async () => {
    await assertSucceeds(setDoc(indicatorPath(OWNER), booleanIndicator()))
    await assertSucceeds(
      updateDoc(indicatorPath(OWNER), {
        archivedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    )
    await assertSucceeds(
      updateDoc(indicatorPath(OWNER), {
        archivedAt: null,
        updatedAt: serverTimestamp()
      })
    )
    await assertFails(deleteDoc(indicatorPath(OWNER)))
  })
})

function targetRangeWithoutIdealRange() {
  const { idealRange: _idealRange, ...withoutIdealRange } = targetRangeIndicator()
  return withoutIdealRange
}

describe('indicator structural freeze after the first entry', () => {
  const frozenId = 'frozen-indicator'
  const firstEntry = new Date(0)

  async function seedFrozen(indicator: DocumentData = booleanIndicator()) {
    await seed(['users', OWNER, 'indicators', frozenId], {
      ...indicator,
      firstEntryAt: firstEntry,
      createdAt: firstEntry,
      updatedAt: firstEntry
    })
  }

  it('rejects a creation that claims a first entry', async () => {
    await assertFails(
      setDoc(indicatorPath(OWNER), { ...booleanIndicator(), firstEntryAt: serverTimestamp() })
    )
    await assertSucceeds(setDoc(indicatorPath(OWNER), { ...booleanIndicator(), firstEntryAt: null }))
  })

  it('lets the first entry be marked once with the request time', async () => {
    await seed(['users', OWNER, 'indicators', frozenId], booleanIndicator())
    await assertSucceeds(
      updateDoc(indicatorPath(OWNER, frozenId), {
        firstEntryAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    )
  })

  it('rejects a first entry marked with an arbitrary time', async () => {
    await seed(['users', OWNER, 'indicators', frozenId], booleanIndicator())
    await assertFails(
      updateDoc(indicatorPath(OWNER, frozenId), {
        firstEntryAt: new Date(0),
        updatedAt: serverTimestamp()
      })
    )
  })

  it('never removes or rewinds the first-entry timestamp', async () => {
    await seedFrozen()
    await assertFails(
      updateDoc(indicatorPath(OWNER, frozenId), {
        firstEntryAt: null,
        updatedAt: serverTimestamp()
      })
    )
    await assertFails(
      updateDoc(indicatorPath(OWNER, frozenId), {
        firstEntryAt: deleteField(),
        updatedAt: serverTimestamp()
      })
    )
    await assertFails(
      updateDoc(indicatorPath(OWNER, frozenId), {
        firstEntryAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    )
    await assertSucceeds(
      updateDoc(indicatorPath(OWNER, frozenId), {
        firstEntryAt: firstEntry,
        updatedAt: serverTimestamp()
      })
    )
  })

  it('keeps structural fields editable while there is no first entry', async () => {
    await seed(['users', OWNER, 'indicators', frozenId], booleanIndicator())
    await assertSucceeds(
      updateDoc(indicatorPath(OWNER, frozenId), {
        group: 'result',
        valueType: 'numeric',
        numeric: { unit: 'mg', min: 0, max: null, step: 1 },
        frequency: 'multiple_per_day',
        dailyAggregation: 'sum',
        updatedAt: serverTimestamp()
      })
    )
  })

  it('freezes group, value type, frequency, aggregation and value configuration', async () => {
    await seedFrozen(numericIndicator())
    const path = indicatorPath(OWNER, frozenId)

    await assertSucceeds(
      updateDoc(path, { name: 'Café da tarde', updatedAt: serverTimestamp() })
    )
    await assertFails(
      updateDoc(path, { group: 'result', updatedAt: serverTimestamp() })
    )
    await assertFails(
      updateDoc(path, {
        valueType: 'boolean',
        numeric: deleteField(),
        frequency: 'single_per_day',
        dailyAggregation: deleteField(),
        updatedAt: serverTimestamp()
      })
    )
    await assertFails(
      updateDoc(path, {
        frequency: 'single_per_day',
        dailyAggregation: deleteField(),
        updatedAt: serverTimestamp()
      })
    )
    await assertFails(
      updateDoc(path, { dailyAggregation: 'mean', updatedAt: serverTimestamp() })
    )
    await assertFails(
      updateDoc(path, {
        numeric: { unit: 'xícaras', min: 0, max: null, step: 1 },
        updatedAt: serverTimestamp()
      })
    )
  })

  it('freezes the ordinal options after the first entry', async () => {
    await seedFrozen(ordinalIndicator())
    await assertFails(
      updateDoc(indicatorPath(OWNER, frozenId), {
        options: [
          { id: 'low', label: 'Baixo', order: 0 },
          { id: 'medium', label: 'Médio', order: 1 },
          { id: 'high', label: 'Top', order: 2 }
        ],
        updatedAt: serverTimestamp()
      })
    )
    await assertSucceeds(
      updateDoc(indicatorPath(OWNER, frozenId), {
        options: [
          { id: 'low', label: 'Baixo', order: 0 },
          { id: 'medium', label: 'Médio', order: 1 },
          { id: 'high', label: 'Alto', order: 2 }
        ],
        updatedAt: serverTimestamp()
      })
    )
  })

  it('keeps direction, ideal range, order and archive status editable after the freeze', async () => {
    await seedFrozen(scaleIndicator())
    const path = indicatorPath(OWNER, frozenId)

    await assertSucceeds(
      updateDoc(path, {
        desiredDirection: 'target_range',
        idealRange: { min: 6, max: 9 },
        sortOrder: 500,
        emoji: '🔋',
        updatedAt: serverTimestamp()
      })
    )
    await assertSucceeds(
      updateDoc(path, { archivedAt: serverTimestamp(), updatedAt: serverTimestamp() })
    )
    await assertSucceeds(
      updateDoc(path, { archivedAt: null, updatedAt: serverTimestamp() })
    )
    await assertSucceeds(
      updateDoc(path, {
        desiredDirection: 'higher',
        idealRange: deleteField(),
        updatedAt: serverTimestamp()
      })
    )
  })
})

describe('daily entries (REQ-2-002)', () => {
  const DATE = '2026-10-24'
  const PAST_DATE = '2026-10-01'
  const SINGLE_ID = `indicator-1_${DATE}`
  const PAST_SINGLE_ID = `indicator-1_${PAST_DATE}`

  function entryPath(uid: string, entryId: string) {
    return doc(client(uid), 'users', uid, 'entries', entryId)
  }

  function booleanEntry(overrides: DocumentData = {}) {
    return {
      indicatorId: 'indicator-1',
      localDate: DATE,
      recordedAt: serverTimestamp(),
      valueType: 'boolean',
      value: { boolean: true },
      ...overrides
    }
  }

  async function seedIndicatorAndEntry(
    indicatorId: string,
    indicator: DocumentData,
    entryId: string,
    entry: DocumentData
  ) {
    await seed(['users', OWNER, 'indicators', indicatorId], indicator)
    await seed(['users', OWNER, 'entries', entryId], entry)
  }

  it('accepts owner reads, the deterministic single document and deletion', async () => {
    await seed(['users', OWNER, 'indicators', 'indicator-1'], booleanIndicator())
    await assertSucceeds(setDoc(entryPath(OWNER, SINGLE_ID), booleanEntry()))
    await assertSucceeds(getDoc(entryPath(OWNER, SINGLE_ID)))
    await assertSucceeds(getDocs(collection(client(OWNER), 'users', OWNER, 'entries')))
    await assertSucceeds(deleteDoc(entryPath(OWNER, SINGLE_ID)))
  })

  it('accepts a valid entry for each structured value type', async () => {
    await seed(['users', OWNER, 'indicators', 'scale'], scaleIndicator())
    await assertSucceeds(
      setDoc(entryPath(OWNER, `scale_${DATE}`), {
        indicatorId: 'scale',
        localDate: DATE,
        recordedAt: serverTimestamp(),
        valueType: 'scale',
        value: { number: 7 },
        note: 'Depois do almoço'
      })
    )

    await seed(['users', OWNER, 'indicators', 'numeric'], numericIndicator())
    await assertSucceeds(
      setDoc(entryPath(OWNER, 'numeric-event-1'), {
        indicatorId: 'numeric',
        localDate: DATE,
        recordedAt: serverTimestamp(),
        valueType: 'numeric',
        value: { number: 0 }
      })
    )

    await seed(['users', OWNER, 'indicators', 'ordinal'], ordinalIndicator())
    await assertSucceeds(
      setDoc(entryPath(OWNER, `ordinal_${DATE}`), {
        indicatorId: 'ordinal',
        localDate: DATE,
        recordedAt: serverTimestamp(),
        valueType: 'ordinal',
        value: { optionId: 'high' }
      })
    )
  })

  it('never lets another UID or an unauthenticated client read, list, write or delete entries', async () => {
    await seedIndicatorAndEntry('indicator-1', booleanIndicator(), SINGLE_ID, booleanEntry())
    const other = client(OTHER)
    const anonymous = testEnv.unauthenticatedContext().firestore()
    for (const db of [other, anonymous]) {
      await assertFails(getDoc(doc(db, 'users', OWNER, 'entries', SINGLE_ID)))
      await assertFails(getDocs(collection(db, 'users', OWNER, 'entries')))
      await assertFails(
        setDoc(doc(db, 'users', OWNER, 'entries', `new_${DATE}`), booleanEntry())
      )
      await assertFails(
        updateDoc(doc(db, 'users', OWNER, 'entries', SINGLE_ID), {
          value: { boolean: false },
          recordedAt: serverTimestamp()
        })
      )
      await assertFails(deleteDoc(doc(db, 'users', OWNER, 'entries', SINGLE_ID)))
    }
  })

  it('requires the deterministic ID for single-frequency indicators and unique IDs for multiple events', async () => {
    await seed(['users', OWNER, 'indicators', 'indicator-1'], booleanIndicator())
    await assertFails(setDoc(entryPath(OWNER, 'random-single-id'), booleanEntry()))
    await assertSucceeds(setDoc(entryPath(OWNER, SINGLE_ID), booleanEntry()))

    await seed(['users', OWNER, 'indicators', 'numeric'], numericIndicator())
    const numericEntry = {
      indicatorId: 'numeric',
      localDate: DATE,
      recordedAt: serverTimestamp(),
      valueType: 'numeric',
      value: { number: 2 }
    }
    await assertSucceeds(setDoc(entryPath(OWNER, 'numeric-event-1'), numericEntry))
    await assertSucceeds(setDoc(entryPath(OWNER, 'numeric-event-2'), numericEntry))
  })

  it('rejects entries for an unknown or archived indicator', async () => {
    await assertFails(setDoc(entryPath(OWNER, SINGLE_ID), booleanEntry()))

    await seed(['users', OWNER, 'indicators', 'indicator-1'], {
      ...booleanIndicator(),
      archivedAt: new Date(0)
    })
    await assertFails(setDoc(entryPath(OWNER, SINGLE_ID), booleanEntry()))
  })

  it.each([
    [
      'mismatched value type',
      booleanIndicator(),
      { valueType: 'numeric', value: { number: 1 } }
    ],
    [
      'boolean value with an extra key',
      booleanIndicator(),
      { value: { boolean: true, number: 1 } }
    ],
    [
      'non-boolean value',
      booleanIndicator(),
      { value: { boolean: 'yes' } }
    ],
    [
      'scale value out of range',
      scaleIndicator(),
      { valueType: 'scale', value: { number: 11 } }
    ],
    [
      'scale value without a number',
      scaleIndicator(),
      { valueType: 'scale', value: { optionId: 'high' } }
    ],
    [
      'numeric value below its minimum',
      numericIndicator(),
      { valueType: 'numeric', value: { number: -1 } }
    ],
    [
      'numeric value above its maximum',
      { ...numericIndicator(), numeric: { unit: 'mg', min: 0, max: 10, step: 1 } },
      { valueType: 'numeric', value: { number: 11 } }
    ],
    [
      'unknown ordinal option',
      ordinalIndicator(),
      { valueType: 'ordinal', value: { optionId: 'missing' } }
    ],
    [
      'ordinal value without an option id',
      ordinalIndicator(),
      { valueType: 'ordinal', value: { number: 2 } }
    ],
    [
      'unknown field',
      booleanIndicator(),
      { private: true }
    ],
    [
      'invalid local date',
      booleanIndicator(),
      { localDate: '24/10/2026' }
    ],
    [
      'client date instead of the server clock',
      booleanIndicator(),
      { recordedAt: new Date(0) }
    ],
    [
      'note above the byte limit',
      booleanIndicator(),
      { note: 'x'.repeat(501) }
    ]
  ])('rejects %s', async (_name, indicator, overrides) => {
    await seed(['users', OWNER, 'indicators', 'indicator-1'], indicator)
    const entry = {
      ...booleanEntry(),
      indicatorId: 'indicator-1',
      valueType: indicator.valueType,
      ...overrides
    }
    await assertFails(setDoc(entryPath(OWNER, SINGLE_ID), entry))
  })

  it('accepts false and zero as stored values, distinct from absence', async () => {
    await seed(['users', OWNER, 'indicators', 'indicator-1'], booleanIndicator())
    await assertSucceeds(setDoc(entryPath(OWNER, SINGLE_ID), booleanEntry({ value: { boolean: false } })))
    expect((await getDoc(entryPath(OWNER, SINGLE_ID))).data()?.value).toEqual({ boolean: false })

    await seed(['users', OWNER, 'indicators', 'numeric'], numericIndicator())
    await assertSucceeds(
      setDoc(entryPath(OWNER, 'numeric-event-1'), {
        indicatorId: 'numeric',
        localDate: DATE,
        recordedAt: serverTimestamp(),
        valueType: 'numeric',
        value: { number: 0 }
      })
    )
    expect((await getDoc(entryPath(OWNER, 'numeric-event-1'))).data()?.value).toEqual({ number: 0 })
    await assertSucceeds(getDocs(collection(client(OWNER), 'users', OWNER, 'entries')))
  })

  it('allows replacing the current single entry and deleting a past record', async () => {
    await seedIndicatorAndEntry('indicator-1', booleanIndicator(), SINGLE_ID, booleanEntry())
    await seedIndicatorAndEntry(
      'indicator-1',
      booleanIndicator(),
      PAST_SINGLE_ID,
      booleanEntry({ localDate: PAST_DATE, value: { boolean: false } })
    )

    await assertSucceeds(
      updateDoc(entryPath(OWNER, SINGLE_ID), {
        value: { boolean: false },
        recordedAt: serverTimestamp()
      })
    )
    await assertFails(
      updateDoc(entryPath(OWNER, SINGLE_ID), {
        localDate: PAST_DATE,
        recordedAt: serverTimestamp()
      })
    )
    await assertFails(
      updateDoc(entryPath(OWNER, SINGLE_ID), {
        indicatorId: 'other-indicator',
        recordedAt: serverTimestamp()
      })
    )
    await assertSucceeds(deleteDoc(entryPath(OWNER, PAST_SINGLE_ID)))
    const deleted = await getDoc(entryPath(OWNER, PAST_SINGLE_ID))
    expect(deleted.exists()).toBe(false)
  })

  it('sets firstEntryAt in the same batch as the first answer and never rewinds it', async () => {
    await seed(['users', OWNER, 'indicators', 'indicator-1'], booleanIndicator())
    const db = client(OWNER)
    const batch = writeBatch(db)
    batch.set(doc(db, 'users', OWNER, 'entries', SINGLE_ID), booleanEntry())
    batch.update(doc(db, 'users', OWNER, 'indicators', 'indicator-1'), {
      firstEntryAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    await assertSucceeds(batch.commit())

    const second = writeBatch(db)
    second.set(
      doc(db, 'users', OWNER, 'entries', `indicator-1_${PAST_DATE}`),
      booleanEntry({ localDate: PAST_DATE })
    )
    second.update(doc(db, 'users', OWNER, 'indicators', 'indicator-1'), {
      firstEntryAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    await assertFails(second.commit())
  })
})

describe('account deletion lock', () => {
  it('retains protection against stale tokens after data and Auth deletion', async () => {
    await seed(['accountDeletions', OWNER], { startedAt: new Date(0), completedAt: new Date(0) })
    await assertFails(setDoc(userPath(OWNER), profile()))
    await assertFails(setDoc(indicatorPath(OWNER), booleanIndicator()))
    await assertFails(deleteDoc(doc(client(OWNER), 'accountDeletions', OWNER)))
    await assertSucceeds(setDoc(userPath(OTHER), profile()))
  })

  it('blocks profile and indicator writes while the server deletion marker exists', async () => {
    await seed(['users', OWNER], { onboardingCompleted: true })
    await seed(['users', OWNER, 'indicators', 'existing'], {
      ...booleanIndicator(),
      createdAt: new Date(0),
      updatedAt: new Date(0)
    })
    await seed(['accountDeletions', OWNER], { startedAt: new Date(0) })

    await assertFails(getDoc(userPath(OWNER)))
    await assertFails(getDocs(collection(client(OWNER), 'users', OWNER, 'indicators')))
    await assertFails(setDoc(userPath(OWNER), profile()))
    await assertFails(
      updateDoc(userPath(OWNER), {
        onboardingCompleted: true,
        updatedAt: serverTimestamp()
      })
    )
    await assertFails(setDoc(indicatorPath(OWNER, 'new'), booleanIndicator()))
    await assertFails(
      updateDoc(indicatorPath(OWNER, 'existing'), {
        name: 'Durante a exclusão',
        updatedAt: serverTimestamp()
      })
    )
    await assertFails(deleteDoc(indicatorPath(OWNER, 'existing')))

    await testEnv.withSecurityRulesDisabled(async context => {
      await deleteDoc(doc(context.firestore(), 'accountDeletions', OWNER))
    })

    await assertSucceeds(
      updateDoc(userPath(OWNER), {
        onboardingCompleted: true,
        updatedAt: serverTimestamp()
      })
    )
    await assertSucceeds(setDoc(indicatorPath(OWNER, 'new'), booleanIndicator()))
  })
})
