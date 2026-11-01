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
    projectId: 'demo-pulsar',
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

  it('keeps entries, insights, feedback and summaries closed until their own tasks add rules', async () => {
    for (const [name, data] of [
      ['entries', { indicatorId: 'i1' }],
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
    'entries',
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
    ['numeric / multiple with sum', numericIndicator()],
    ['scale / single with direction', scaleIndicator()],
    ['scale / single with target range', targetRangeIndicator()],
    ['ordinal / single with options', ordinalIndicator()]
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
