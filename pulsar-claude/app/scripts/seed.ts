/**
 * Seeds the fictitious seed user (scripts/seed-data.ts) into Firestore.
 *
 *   yarn seed                       # requires FIRESTORE_EMULATOR_HOST (e.g. inside `firebase emulators:exec`)
 *   HARNESS_ALLOW_DEMO_SEED=1 yarn seed --demo --project=<dev-project-id>   # explicit opt-in for a dev project
 *
 * Options: --today=YYYY-MM-DD (default: today in America/Sao_Paulo). Always 30 days ending today.
 * Never runs against a project whose id contains "prod".
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { buildSeedDataset, SEED_EMAIL } from './seed-data';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? 'true'];
  }),
);

const onEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const demo = args.demo === 'true' && process.env.HARNESS_ALLOW_DEMO_SEED === '1';
if (!onEmulator && !demo) {
  console.error(
    'Refusing to seed: FIRESTORE_EMULATOR_HOST is not set (use --demo with HARNESS_ALLOW_DEMO_SEED=1).',
  );
  process.exit(1);
}
const projectId = onEmulator ? (process.env.GCLOUD_PROJECT ?? 'demo-pulsar') : args.project;
if (!projectId || /prod/i.test(projectId)) {
  console.error(
    `Refusing to seed project "${projectId ?? ''}": pass --project=<dev-project-id> (never production).`,
  );
  process.exit(1);
}

const today =
  args.today ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const data = buildSeedDataset({ today });

initializeApp({ projectId });
const db = getFirestore();

async function main() {
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    const auth = getAuth();
    await auth.deleteUser(data.uid).catch(() => undefined);
    await auth.createUser({ uid: data.uid, email: SEED_EMAIL, emailVerified: true, displayName: 'Seed' });
  }

  const userRef = db.doc(`users/${data.uid}`);
  await db.recursiveDelete(userRef);

  const createdAt = Timestamp.fromDate(new Date(`${data.firstDate}T09:00:00-03:00`));
  const writes: [FirebaseFirestore.DocumentReference, FirebaseFirestore.DocumentData][] = [
    [
      userRef,
      {
        createdAt,
        onboardingCompleted: true,
        aiConsent: false,
        reminderEnabled: false,
        lastInsightRefreshAt: null,
      },
    ],
    ...data.indicators.map(
      ({
        id,
        archived,
        ...indicator
      }): [FirebaseFirestore.DocumentReference, FirebaseFirestore.DocumentData] => [
        userRef.collection('indicators').doc(id),
        {
          ...indicator,
          archivedAt: archived ? Timestamp.now() : null,
          createdAt,
          updatedAt: FieldValue.serverTimestamp(),
        },
      ],
    ),
    ...data.entries.map(
      ({
        id,
        recordedAt,
        ...entry
      }): [FirebaseFirestore.DocumentReference, FirebaseFirestore.DocumentData] => [
        userRef.collection('entries').doc(id),
        { ...entry, recordedAt: Timestamp.fromDate(new Date(recordedAt)) },
      ],
    ),
  ];

  for (let i = 0; i < writes.length; i += 400) {
    const batch = db.batch();
    writes.slice(i, i + 400).forEach(([ref, doc]) => batch.set(ref, doc));
    await batch.commit();
  }
  console.log(
    `Seeded ${data.indicators.length} indicators and ${data.entries.length} entries for ${data.uid} (${projectId}, ${data.firstDate}..${today}).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
