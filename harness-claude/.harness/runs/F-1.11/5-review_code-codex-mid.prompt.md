Você é um worker de um harness autônomo. Contexto limpo: tudo que importa está nos arquivos citados.
Regras:
- Trabalhe SOMENTE no diretório atual (worktree). Não acesse .env nem fora do projeto.
- Não edite arquivos listados como protegidos. Não use .skip/.only. Não enfraqueça asserts.
- Siga app/AGENTS.md, DECISOES.md e o design system (design/pulsar_bio_analytics/DESIGN.md → app/src/design/).
- Design em `design/`: uma pasta por tela com `screen.png` (mockup) e `code.html` (HTML/Tailwind de referência: copie estrutura, classes e textos, mas reescreva em React com os componentes do design system); `pulsar_mapeamento_de_telas_x_especifica_o_funcional_v1.1.md` liga cada tela às seções da spec. Em conflito, a spec (docs/) vence: o app é somente mobile, ignore breakpoints/layouts de desktop do design.
- Código, nomes e comentários em inglês; textos de interface somente em pt-BR. Gerenciador de pacotes: yarn.
- Não faça git commit/push/checkout: o orquestrador cuida do git.
- Se faltar informação: escolha o default mais conservador e registre uma linha JSON em
  .harness/inbox/questions.jsonl: {"featureId","pergunta","escolhido","alternativas","impacto"}.
- Se identificar um risco futuro: registre em .harness/inbox/risks.jsonl:
  {"featureId","risco","probabilidade","impacto","sugestao"}.
- Rode os testes relevantes antes de terminar. Termine com o bloco ```json final pedido no seu papel
  (padrão: {"summary","filesChanged","testsRun","confidence":"low|med|high","notes"}).
LIÇÕES RELEVANTES:
- [L-005] Se gemini-pro falhar como revisor, use o fallback (haiku ou sonnet). Ele resolveu a revisão sem custo extra relevante em evt-43/evt-44 e evt-19/evt-20.
- [L-025] Decisão do humano: Registros podem ser atualizados? → ID determinístico por dia com update permitido só hoje — ID determinístico por dia com update permitido só hoje
- [L-026] Decisão do humano: Quem grava o cache de textos da IA? → Só a Function generateInsightTexts após validação; cliente só lê e valida de novo — Só a Function generateInsightTexts após validação; cliente só lê e valida de novo (padrão)
- [L-027] Decisão do humano: Usar App Check na V1? → Fora da V1 inicial; reavaliar na etapa 7 — Fora da V1 inicial; reavaliar na etapa 7 (padrão)
- [L-028] Decisão do humano: Onde guardar o estado de dispensa do convite de salvar conta? → users/{uid}.saveAccountInviteDismissedAt (timestamp|null) e saveAccountInviteDismissedDayCount (int >= 0|null), validados em F-1.08 — users/{uid}.saveAccountInviteDismissedAt (timestamp|null) e saveAccountInviteDismissedDayCount (int >= 0|null), validados em F-1.08 (padrão)
- [L-029] Decisão do humano: Como resumir indicadores ordinais? → Contagem por opção na ordem configurada (inclui zeros), denominador = dias com resposta, moda com desempate pela ordem; só descritivo — Contagem por opção na ordem configurada (inclui zeros), denominador = dias com resposta, moda com desempate pela ordem; só descritivo (padrão)


# Papel: avaliador de código (independente)

Você é de outra família de modelo e não escreveu este código. Não edite arquivos.
Avalie a partir do diff abaixo (os gates já rodaram build, lint, tipos e testes). Abra outros arquivos só para confirmar um ponto específico; não explore o repositório inteiro.

Verifique:
- O código atende **de fato** aos critérios de aceite, sem implementar "para o teste" (hardcode, mocks indevidos, condicionais de teste em produção).
- Segurança (Security Rules, dados entre usuários, segredos), privacidade (nomes de indicadores só via `<IndicatorLabel>`), aderência à spec e qualidade (tipos, legibilidade, duplicação).

## Feature
```json
{
  "id": "F-1.11",
  "title": "Function deleteAccount: exclusão integral",
  "description": "Callable v2 deleteAccount: exige auth; contas não anônimas exigem auth_time recente (<= 5 min); apaga recursivamente users/{uid} (todas as subcoleções, tokens de push, feedback, conclusões), documentos em internal/ do UID e, por último, o usuário do Auth. Idempotente.",
  "acceptance": [
    "Após a chamada não resta documento sob users/{uid} nem em internal/ para o UID",
    "Usuário removido do Auth somente depois da limpeza",
    "Conta Google/e-mail sem login recente recebe erro requires-recent-login",
    "Um UID não consegue excluir outro"
  ],
  "specRefs": [
    "spec.md#3",
    "spec.md#9",
    "arquitetura.md#9.2",
    "DECISOES.md#Exclusão de conta"
  ]
}
```

## Gates
G1 install-build: ok
G2 lint-format: ok
G3 typecheck: ok
G4 unit: ok
G5 security-rules: ok
G6 e2e: ok
G7 protected-tests: ok
G8 privacy-leak: ok
G9 a11y: ok
G10 mobile-layout: ok
G11 visual-regression: pulado
G12 lighthouse: pulado
G13 secrets: ok

## Diff
```diff
diff --git a/app/DEPLOYMENT.md b/app/DEPLOYMENT.md
new file mode 100644
index 0000000..c6cc4d2
--- /dev/null
+++ b/app/DEPLOYMENT.md
@@ -0,0 +1,13 @@
+# Deployment prerequisites
+
+## Firestore TTL for account deletion
+
+`deleteAccount` creates `deletedAccounts/{uid}` with an `expireAt` timestamp. The tombstone prevents a still-valid ID token from recreating data after deletion, and the TTL policy must remove it after 24 hours so the UID is not blocked indefinitely.
+
+The Functions `predeploy` step provisions and validates this prerequisite with `gcloud`; a failed command stops deployment. It requires an authenticated gcloud CLI with permission to manage Firestore field TTL policies. To provision it manually, run from `app/`:
+
+```sh
+yarn provision:firestore-ttl YOUR_PROJECT_ID
+```
+
+The command is idempotent and targets the `deletedAccounts` collection group, field `expireAt`. Firestore TTL deletion is asynchronous and typically occurs within 24 hours after expiration.
diff --git a/app/firebase.json b/app/firebase.json
index 9504d25..4a38feb 100644
--- a/app/firebase.json
+++ b/app/firebase.json
@@ -20,7 +20,7 @@
   "functions": {
     "source": "functions",
     "runtime": "nodejs22",
-    "predeploy": ["yarn --cwd functions build"],
+    "predeploy": ["yarn --cwd functions build", "yarn provision:firestore-ttl"],
     "ignore": ["node_modules", "src", "tsconfig.json", "*.log"]
   },
   "emulators": {
diff --git a/app/firestore.rules b/app/firestore.rules
index 0f2f245..0a5e33a 100644
--- a/app/firestore.rules
+++ b/app/firestore.rules
@@ -8,8 +8,14 @@ service cloud.firestore {
       return request.auth != null && request.auth.uid == uid;
     }
 
+    // deleteAccount writes deletedAccounts/{uid} before cleaning up, so a still-valid ID token cannot recreate data
+    // during or after the deletion.
+    function canWrite(uid) {
+      return isOwner(uid) && !exists(/databases/$(database)/documents/deletedAccounts/$(uid));
+    }
+
     // users/{uid} holds only client fields. Administrative fields (e.g. lastNotificationSentAt) live under
-    // internal/** (e.g. internal/userAdmin/users/{uid}), written by the Admin SDK and never readable by clients.
+    // internal/{uid} (and its subcollections), written by the Admin SDK and never readable by clients.
     function hasOnlyUserFields(keys) {
       return keys.hasOnly([
         'onboardingCompleted', 'aiConsent', 'reminderEnabled', 'lastInsightRefreshAt', 'createdAt',
@@ -37,18 +43,25 @@ service cloud.firestore {
       allow read: if isOwner(uid) && (resource == null || hasOnlyUserFields(resource.data.keys()));
       // The whole resulting document is validated, and a document holding misplaced admin fields is frozen for
       // clients, so they can neither add nor strip (e.g. by overwriting with setDoc) those fields.
-      allow create: if isOwner(uid) && validUserFields(request.resource.data);
-      allow update: if isOwner(uid) && hasOnlyUserFields(resource.data.keys()) && validUserFields(request.resource.data);
+      allow create: if canWrite(uid) && validUserFields(request.resource.data);
+      allow update: if canWrite(uid) && hasOnlyUserFields(resource.data.keys()) && validUserFields(request.resource.data);
       // Account deletion runs in a Cloud Function (Admin SDK) that also cleans subcollections and Auth.
       allow delete: if false;
 
       // {collection} forces at least one segment: in rules v2 a bare {document=**} would also match users/{uid}.
       match /{collection}/{document=**} {
-        allow read, write: if isOwner(uid);
+        allow read: if isOwner(uid);
+        allow write: if canWrite(uid);
       }
     }
 
-    // Server-only data (quotas, idempotency keys, push bookkeeping). Admin SDK bypasses rules.
+    // Deletion tombstones (server-only, expired by a TTL policy on expireAt).
+    match /deletedAccounts/{uid} {
+      allow read, write: if false;
+    }
+
+    // Server-only per-user data, keyed only by UID: internal/{uid}/** (quotas, idempotency keys, push bookkeeping).
+    // No shared documents here, so deleteAccount can remove internal/{uid} recursively. Admin SDK bypasses rules.
     match /internal/{document=**} {
       allow read, write: if false;
     }
diff --git a/app/functions/src/__tests__/deleteAccount.test.ts b/app/functions/src/__tests__/deleteAccount.test.ts
new file mode 100644
index 0000000..3b0b7df
--- /dev/null
+++ b/app/functions/src/__tests__/deleteAccount.test.ts
@@ -0,0 +1,187 @@
+import { afterAll, beforeAll, describe, expect, it } from 'vitest';
+
+// Runs against the Auth, Firestore and Functions emulators (project demo-pulsar, ports from firebase.json).
+process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8282';
+process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9299';
+
+const PROJECT = 'demo-pulsar';
+const FUNCTION_URL = `http://127.0.0.1:5001/${PROJECT}/southamerica-east1/deleteAccount`;
+
+type Provider = 'anonymous' | 'google.com' | 'password';
+
+const { initializeApp, deleteApp } = await import('firebase-admin/app');
+const { getAuth } = await import('firebase-admin/auth');
+const { getFirestore } = await import('firebase-admin/firestore');
+
+const app = initializeApp({ projectId: PROJECT }, 'delete-account-test');
+const auth = getAuth(app);
+const db = getFirestore(app);
+
+// The emulators accept unsigned ID tokens, which lets us control auth_time deterministically.
+function idToken(uid: string, provider: Provider, authAgeSeconds: number): string {
+  const now = Math.floor(Date.now() / 1000);
+  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
+  const payload = {
+    iss: `https://securetoken.google.com/${PROJECT}`,
+    aud: PROJECT,
+    auth_time: now - authAgeSeconds,
+    iat: now,
+    exp: now + 3600,
+    sub: uid,
+    user_id: uid,
+    firebase: { identities: {}, sign_in_provider: provider },
+  };
+  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.`;
+}
+
+async function callDeleteAccount(token: string | null, data: object = {}) {
+  const response = await fetch(FUNCTION_URL, {
+    method: 'POST',
+    headers: {
+      'Content-Type': 'application/json',
+      ...(token ? { Authorization: `Bearer ${token}` } : {}),
+    },
+    body: JSON.stringify({ data }),
+  });
+  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
+}
+
+async function seedUser(uid: string, provider: Provider) {
+  await auth.createUser({ uid, ...(provider === 'anonymous' ? {} : { email: `${uid}@pulsar.test` }) });
+  const user = db.doc(`users/${uid}`);
+  await user.set({ onboardingCompleted: true });
+  await user.collection('indicators').doc('ind-1').set({ name: 'x' });
+  await user.collection('indicators').doc('ind-1').collection('records').doc('2026-01-01').set({ value: 1 });
+  await user.collection('records').doc('r-1').set({ value: 2 });
+  await user.collection('pushTokens').doc('t-1').set({ token: 'abc' });
+  await user.collection('feedback').doc('f-1').set({ text: 'hi' });
+  await user.collection('completions').doc('c-1').set({ done: true });
+  await db.doc(`internal/${uid}`).set({ quota: 1 });
+  await db.doc(`internal/${uid}/quota/2026-01-01`).set({ used: 1 });
+}
+
+async function leftovers(uid: string): Promise<string[]> {
+  const paths: string[] = [];
+  for (const root of [`users/${uid}`, `internal/${uid}`]) {
+    if ((await db.doc(root).get()).exists) paths.push(root);
+    const stack = [db.doc(root)];
+    while (stack.length) {
+      const doc = stack.pop()!;
+      for (const col of await doc.listCollections()) {
+        for (const ref of await col.listDocuments()) {
+          paths.push(ref.path);
+          stack.push(ref);
+        }
+      }
+    }
+  }
+  return paths;
+}
+
+async function authUserExists(uid: string): Promise<boolean> {
+  try {
+    await auth.getUser(uid);
+    return true;
+  } catch {
+    return false;
+  }
+}
+
+const created: string[] = [];
+async function newUser(provider: Provider) {
+  const uid = `del-${provider.replace('.', '-')}-${Math.random().toString(36).slice(2, 10)}`;
+  created.push(uid);
+  await seedUser(uid, provider);
+  return uid;
+}
+
+describe('deleteAccount callable', () => {
+  beforeAll(() => {
+    expect(process.env.FIRESTORE_EMULATOR_HOST).toBeTruthy();
+  });
+
+  afterAll(async () => {
+    for (const uid of created) {
+      await db.recursiveDelete(db.doc(`users/${uid}`));
+      await db.recursiveDelete(db.doc(`internal/${uid}`));
+      await auth.deleteUser(uid).catch(() => undefined);
+    }
+    await deleteApp(app);
+  });
+
+  it('rejects unauthenticated calls', async () => {
+    const { status, body } = await callDeleteAccount(null);
+    expect(status).toBe(401);
+    expect(JSON.stringify(body)).toMatch(/UNAUTHENTICATED/i);
+  });
+
+  it('removes every document under users/{uid} and internal/ and then the Auth user (anonymous)', async () => {
+    const uid = await newUser('anonymous');
+    expect((await leftovers(uid)).length).toBeGreaterThan(5);
+
+    const { status } = await callDeleteAccount(idToken(uid, 'anonymous', 24 * 3600));
+
+    expect(status).toBe(200);
+    expect(await leftovers(uid)).toEqual([]);
+    expect(await authUserExists(uid)).toBe(false);
+  });
+
+  it('allows a non-anonymous account with a recent login (<= 5 min)', async () => {
+    const uid = await newUser('google.com');
+
+    const { status } = await callDeleteAccount(idToken(uid, 'google.com', 60));
+
+    expect(status).toBe(200);
+    expect(await leftovers(uid)).toEqual([]);
+    expect(await authUserExists(uid)).toBe(false);
+  });
+
+  it.each(['google.com', 'password'] as const)(
+    'refuses a %s account without recent login and keeps data and Auth user',
+    async (provider) => {
+      const uid = await newUser(provider);
+      const before = await leftovers(uid);
+
+      const { status, body } = await callDeleteAccount(idToken(uid, provider, 10 * 60));
+
+      expect(status).toBeGreaterThanOrEqual(400);
+      expect(JSON.stringify(body)).toContain('requires-recent-login');
+      expect(await leftovers(uid)).toEqual(before);
+      expect(await authUserExists(uid)).toBe(true);
+    },
+  );
+
+  it('is idempotent: a second call after the account is gone succeeds', async () => {
+    const uid = await newUser('anonymous');
+    const token = idToken(uid, 'anonymous', 0);
+
+    expect((await callDeleteAccount(token)).status).toBe(200);
+    expect((await callDeleteAccount(token)).status).toBe(200);
+    expect(await leftovers(uid)).toEqual([]);
+  });
+
+  it('completes cleanup even when the Auth user is already gone', async () => {
+    const uid = await newUser('anonymous');
+    await auth.deleteUser(uid);
+
+    expect((await callDeleteAccount(idToken(uid, 'anonymous', 0))).status).toBe(200);
+    expect(await leftovers(uid)).toEqual([]);
+  });
+
+  it('never lets one UID delete another: a spoofed uid in the payload is ignored', async () => {
+    const attacker = await newUser('anonymous');
+    const victim = await newUser('anonymous');
+    const victimBefore = await leftovers(victim);
+
+    const { status } = await callDeleteAccount(idToken(attacker, 'anonymous', 0), {
+      uid: victim,
+      userId: victim,
+    });
+
+    expect(status).toBe(200);
+    expect(await leftovers(attacker)).toEqual([]);
+    expect(await authUserExists(attacker)).toBe(false);
+    expect(await leftovers(victim)).toEqual(victimBefore);
+    expect(await authUserExists(victim)).toBe(true);
+  });
+});
diff --git a/app/functions/src/__tests__/deleteAccountSecurity.test.ts b/app/functions/src/__tests__/deleteAccountSecurity.test.ts
new file mode 100644
index 0000000..45ed653
--- /dev/null
+++ b/app/functions/src/__tests__/deleteAccountSecurity.test.ts
@@ -0,0 +1,68 @@
+import { afterAll, describe, expect, it } from 'vitest';
+
+process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8282';
+process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9299';
+
+const PROJECT = 'demo-pulsar';
+const FUNCTION_URL = `http://127.0.0.1:5001/${PROJECT}/southamerica-east1/deleteAccount`;
+
+const { initializeApp, deleteApp } = await import('firebase-admin/app');
+const { getAuth } = await import('firebase-admin/auth');
+const { getFirestore } = await import('firebase-admin/firestore');
+
+const app = initializeApp({ projectId: PROJECT }, 'delete-account-security-test');
+const auth = getAuth(app);
+const db = getFirestore(app);
+
+function anonymousToken(uid: string, authAgeSeconds: number): string {
+  const now = Math.floor(Date.now() / 1000);
+  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
+  const payload = {
+    iss: `https://securetoken.google.com/${PROJECT}`,
+    aud: PROJECT,
+    auth_time: now - authAgeSeconds,
+    iat: now,
+    exp: now + 3600,
+    sub: uid,
+    user_id: uid,
+    firebase: { identities: {}, sign_in_provider: 'anonymous' },
+  };
+  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.`;
+}
+
+describe('deleteAccount current account state', () => {
+  afterAll(async () => {
+    await deleteApp(app);
+  });
+
+  it('requires recent login for a stale anonymous token after the account is converted', async () => {
+    const uid = `converted-${Math.random().toString(36).slice(2, 10)}`;
+    await auth.createUser({ uid });
+    await db.doc(`users/${uid}`).set({ onboardingCompleted: true });
+    await db.doc(`internal/${uid}/quota/2026-01-01`).set({ used: 1 });
+    await auth.updateUser(uid, { email: `${uid}@pulsar.test`, emailVerified: true });
+
+    expect((await auth.getUser(uid)).email).toBe(`${uid}@pulsar.test`);
+
+    const response = await fetch(FUNCTION_URL, {
+      method: 'POST',
+      headers: {
+        'Content-Type': 'application/json',
+        Authorization: `Bearer ${anonymousToken(uid, 10 * 60)}`,
+      },
+      body: JSON.stringify({ data: {} }),
+    });
+    const body = (await response.json()) as Record<string, unknown>;
+
+    expect(response.status).toBeGreaterThanOrEqual(400);
+    expect(JSON.stringify(body)).toContain('requires-recent-login');
+    expect((await db.doc(`users/${uid}`).get()).exists).toBe(true);
+    expect((await db.doc(`internal/${uid}/quota/2026-01-01`).get()).exists).toBe(true);
+    expect((await auth.getUser(uid)).uid).toBe(uid);
+
+    await db.recursiveDelete(db.doc(`users/${uid}`));
+    await db.recursiveDelete(db.doc(`internal/${uid}`));
+    await db.recursiveDelete(db.doc(`deletedAccounts/${uid}`));
+    await auth.deleteUser(uid);
+  });
+});
diff --git a/app/functions/src/__tests__/purgeAccount.test.ts b/app/functions/src/__tests__/purgeAccount.test.ts
new file mode 100644
index 0000000..655399e
--- /dev/null
+++ b/app/functions/src/__tests__/purgeAccount.test.ts
@@ -0,0 +1,102 @@
+import { afterAll, describe, expect, it, vi } from 'vitest';
+import type { Auth } from 'firebase-admin/auth';
+import type { DocumentReference, Firestore } from 'firebase-admin/firestore';
+
+// Runs against the Auth and Firestore emulators (ports from firebase.json).
+process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8282';
+process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9299';
+
+const { initializeApp, deleteApp } = await import('firebase-admin/app');
+const { getAuth } = await import('firebase-admin/auth');
+const { getFirestore } = await import('firebase-admin/firestore');
+const { purgeAccount, userDataPaths } = await import('../deleteAccount');
+
+const app = initializeApp({ projectId: 'demo-pulsar' }, 'purge-account-test');
+const auth = getAuth(app);
+const db = getFirestore(app);
+const created: string[] = [];
+
+async function seed(uid = `purge-${Math.random().toString(36).slice(2, 10)}`) {
+  created.push(uid);
+  await auth.createUser({ uid }).catch(() => undefined);
+  await db.doc(`users/${uid}/feedback/f-1`).set({ text: 'hi' });
+  await db.doc(`internal/${uid}`).set({ lastNotificationSentAt: new Date() });
+  await db.doc(`internal/${uid}/quota/2026-01-01`).set({ used: 1 });
+  await db.doc(`internal/${uid}/quota/2026-01-01/history/change-1`).set({ used: 1 });
+  await db.doc(`internal/${uid}/pushLog/p-1`).set({ sent: true });
+  return uid;
+}
+
+const exists = async (path: string) => (await db.doc(path).get()).exists;
+
+// Every document path under internal/, at any depth.
+async function internalPaths(): Promise<string[]> {
+  const paths: string[] = [];
+  const stack: DocumentReference[] = await db.collection('internal').listDocuments();
+  while (stack.length) {
+    const ref = stack.pop()!;
+    if ((await ref.get()).exists) paths.push(ref.path);
+    for (const col of await ref.listCollections()) stack.push(...(await col.listDocuments()));
+  }
+  return paths;
+}
+
+describe('purgeAccount', () => {
+  afterAll(async () => {
+    for (const uid of created) {
+      for (const path of [...userDataPaths(uid), `deletedAccounts/${uid}`])
+        await db.recursiveDelete(db.doc(path));
+      await auth.deleteUser(uid).catch(() => undefined);
+    }
+    await deleteApp(app);
+  });
+
+  it('removes every internal/ document of the UID and leaves a tombstone, sparing other users', async () => {
+    const uid = await seed();
+    const other = await seed();
+
+    await purgeAccount(uid, db, auth);
+
+    expect((await internalPaths()).filter((path) => path.split('/').includes(uid))).toEqual([]);
+    expect(await exists(`users/${uid}/feedback/f-1`)).toBe(false);
+    expect(await exists(`deletedAccounts/${uid}`)).toBe(true);
+    expect(await exists(`internal/${other}/quota/2026-01-01/history/change-1`)).toBe(true);
+    expect(await exists(`internal/${other}/pushLog/p-1`)).toBe(true);
+    expect(await exists(`users/${other}/feedback/f-1`)).toBe(true);
+    expect(await exists(`deletedAccounts/${other}`)).toBe(false);
+  });
+
+  it.each(['userAdmin', 'userQuotas', 'internal', 'users'])(
+    'purging the UID "%s" touches no other user data',
+    async (uid) => {
+      const other = await seed();
+      await seed(uid);
+      const ownedBy = (owner: string) => (path: string) => path.split('/')[1] === owner;
+      const otherBefore = (await internalPaths()).filter(ownedBy(other));
+
+      await purgeAccount(uid, db, auth);
+
+      const after = await internalPaths();
+      expect(otherBefore.length).toBe(4);
+      expect(after.filter(ownedBy(other))).toEqual(otherBefore);
+      expect(after.filter(ownedBy(uid))).toEqual([]);
+      expect(await exists(`users/${other}/feedback/f-1`)).toBe(true);
+    },
+  );
+
+  it('keeps the Auth user when the data cleanup fails', async () => {
+    const uid = await seed();
+    const failingDb = {
+      doc: db.doc.bind(db),
+      recursiveDelete: () => Promise.reject(new Error('cleanup failed')),
+    } as unknown as Firestore;
+    const deleteUser = vi.fn();
+
+    await expect(purgeAccount(uid, failingDb, { deleteUser } as unknown as Auth)).rejects.toThrow(
+      'cleanup failed',
+    );
+
+    expect(deleteUser).not.toHaveBeenCalled();
+    expect((await auth.getUser(uid)).uid).toBe(uid);
+  });
+});
diff --git a/app/functions/src/deleteAccount.ts b/app/functions/src/deleteAccount.ts
new file mode 100644
index 0000000..0663eba
--- /dev/null
+++ b/app/functions/src/deleteAccount.ts
@@ -0,0 +1,72 @@
+import { getApps, initializeApp } from 'firebase-admin/app';
+import { getAuth, type Auth } from 'firebase-admin/auth';
+import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
+import { HttpsError, onCall } from 'firebase-functions/v2/https';
+
+const RECENT_LOGIN_SECONDS = 5 * 60;
+// ID tokens live up to 1 h; the tombstone outlives them and is then removed by a Firestore TTL policy on expireAt.
+const TOMBSTONE_TTL_MS = 24 * 60 * 60 * 1000;
+
+// Per-user roots: users/{uid}, internal/{uid} and the earlier layout internal/userAdmin/users/{uid}.
+// "userAdmin" is a shared container in that earlier layout, so a user whose UID is "userAdmin" must not
+// recursively delete internal/userAdmin (it holds other users' data): only its own non-shared parts are removed.
+const SHARED_CONTAINER = 'userAdmin';
+
+async function purgeInternalRoot(uid: string, db: Firestore) {
+  const root = db.doc(`internal/${uid}`);
+  if (uid !== SHARED_CONTAINER) return db.recursiveDelete(root);
+  await root.delete();
+  for (const col of await root.listCollections()) {
+    if (col.id !== 'users') await db.recursiveDelete(col);
+  }
+}
+
+export const userDataPaths = (uid: string) => [`users/${uid}`, `internal/${SHARED_CONTAINER}/users/${uid}`];
+
+// Tombstone first, so the rules reject writes from still-valid tokens during and after cleanup; then the recursive
+// cleanup (every subcollection: records, push tokens, feedback, completions); the Auth user goes last, only after
+// the cleanup succeeded. Every step is a no-op when already done, which keeps the operation idempotent.
+export async function purgeAccount(uid: string, db: Firestore, auth: Auth) {
+  const now = Date.now();
+  await db
+    .doc(`deletedAccounts/${uid}`)
+    .set({ deletedAt: Timestamp.fromMillis(now), expireAt: Timestamp.fromMillis(now + TOMBSTONE_TTL_MS) });
+  for (const path of userDataPaths(uid)) await db.recursiveDelete(db.doc(path));
+  await purgeInternalRoot(uid, db);
+  await auth.deleteUser(uid).catch((error: { code?: string }) => {
+    if (error.code !== 'auth/user-not-found') throw error;
+  });
+}
+
+// The UID comes only from the verified token, never from the payload.
+export const deleteAccount = onCall(async (request) => {
+  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');
+  const { uid, token } = request.auth;
+
+  const authAge = Math.floor(Date.now() / 1000) - token.auth_time;
+
+  if (!getApps().length) initializeApp();
+  const auth = getAuth();
+
+  // A previously issued anonymous token remains valid after account conversion. Check the current Auth record so
+  // linked credentials cannot bypass reauthentication with that stale token. A missing record is the idempotent
+  // retry case: cleanup still runs and deleting Auth remains a no-op.
+  let hasLinkedCredentials = false;
+  try {
+    const user = await auth.getUser(uid);
+    hasLinkedCredentials =
+      user.providerData.length > 0 || user.email !== undefined || user.phoneNumber !== undefined;
+  } catch (error) {
+    if ((error as { code?: unknown }).code !== 'auth/user-not-found') throw error;
+  }
+
+  // A token whose sign-in provider is still anonymous predates the conversion, so it never proves a recent login
+  // with the linked credential, however fresh its auth_time is.
+  const signedInAnonymously = token.firebase?.sign_in_provider === 'anonymous';
+  if (hasLinkedCredentials && (signedInAnonymously || !(authAge <= RECENT_LOGIN_SECONDS))) {
+    throw new HttpsError('failed-precondition', 'auth/requires-recent-login');
+  }
+
+  await purgeAccount(uid, getFirestore(), auth);
+  return { deleted: true };
+});
diff --git a/app/functions/src/index.ts b/app/functions/src/index.ts
index 15c58c2..fc500d0 100644
--- a/app/functions/src/index.ts
+++ b/app/functions/src/index.ts
@@ -4,6 +4,8 @@ import { onRequest } from 'firebase-functions/v2/https';
 // Every function runs in Brazil to keep data residency and latency aligned with the users (DECISOES.md).
 setGlobalOptions({ region: 'southamerica-east1' });
 
+export { deleteAccount } from './deleteAccount';
+
 // Internal probe: 'private' removes public invoker IAM on deploy (only authorized principals can call it).
 export const healthcheck = onRequest({ invoker: 'private' }, (_request, response) => {
   response.status(200).send('ok');
diff --git a/app/package.json b/app/package.json
index a2ad6c4..4ac8211 100644
--- a/app/package.json
+++ b/app/package.json
@@ -20,7 +20,8 @@
     "test:rules": "sh scripts/port-lock.sh firebase emulators:exec --project demo-pulsar --only firestore \"vitest run --config vitest.rules.config.ts\"",
     "test:e2e": "sh scripts/port-lock.sh playwright test --grep-invert @visual",
     "test:visual": "sh scripts/port-lock.sh playwright test --grep @visual",
-    "test:functions": "yarn --cwd functions build && sh scripts/port-lock.sh firebase emulators:exec --project demo-pulsar --only functions \"vitest run --root functions\"",
+    "test:functions": "yarn --cwd functions build && sh scripts/port-lock.sh firebase emulators:exec --project demo-pulsar --only auth,firestore,functions \"vitest run --root functions\"",
+    "provision:firestore-ttl": "sh scripts/provision-firestore-ttl.sh",
     "seed": "tsx scripts/seed.ts",
     "icons": "tsx scripts/icons.ts && prettier --write src/design/icons.ts",
     "emulators": "yarn --cwd functions build && firebase emulators:start --project demo-pulsar --only auth,firestore,functions",
diff --git a/app/scripts/provision-firestore-ttl.sh b/app/scripts/provision-firestore-ttl.sh
new file mode 100644
index 0000000..92504a7
--- /dev/null
+++ b/app/scripts/provision-firestore-ttl.sh
@@ -0,0 +1,20 @@
+#!/bin/sh
+set -eu
+
+PROJECT="${GCLOUD_PROJECT:-${1:-}}"
+if [ -z "$PROJECT" ]; then
+  echo "Set GCLOUD_PROJECT or pass the Firebase project ID." >&2
+  exit 1
+fi
+
+if ! command -v gcloud >/dev/null 2>&1; then
+  echo "gcloud CLI is required to provision the deletedAccounts TTL policy." >&2
+  exit 1
+fi
+
+# deleteAccount blocks still-valid tokens with deletedAccounts/{uid}; TTL must eventually release that UID.
+gcloud firestore fields ttls update expireAt \
+  --collection-group=deletedAccounts \
+  --enable-ttl \
+  --project="$PROJECT" \
+  --quiet
diff --git a/app/tests/rules/accountDeletion.test.ts b/app/tests/rules/accountDeletion.test.ts
new file mode 100644
index 0000000..8d1c709
--- /dev/null
+++ b/app/tests/rules/accountDeletion.test.ts
@@ -0,0 +1,50 @@
+import { readFileSync } from 'node:fs';
+import {
+  assertFails,
+  assertSucceeds,
+  initializeTestEnvironment,
+  type RulesTestEnvironment,
+} from '@firebase/rules-unit-testing';
+import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
+import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
+
+let env: RulesTestEnvironment;
+
+beforeAll(async () => {
+  env = await initializeTestEnvironment({
+    projectId: 'demo-pulsar-rules-account-deletion',
+    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
+  });
+});
+beforeEach(() => env.clearFirestore());
+afterAll(() => env.cleanup());
+
+const tombstone = (uid: string) =>
+  env.withSecurityRulesDisabled((ctx) =>
+    setDoc(doc(ctx.firestore(), `deletedAccounts/${uid}`), { deletedAt: Timestamp.now() }),
+  );
+
+describe('account deletion tombstone', () => {
+  const alice = () => env.authenticatedContext('alice').firestore();
+
+  it('blocks writes from a still-valid token once deletion started', async () => {
+    await tombstone('alice');
+    await assertFails(setDoc(doc(alice(), 'users/alice'), { aiConsent: true }));
+    await assertFails(setDoc(doc(alice(), 'users/alice/indicators/ind-1'), { name: 'x' }));
+    await assertFails(setDoc(doc(alice(), 'users/alice/indicators/ind-1/records/2026-01-01'), { value: 1 }));
+    await assertFails(setDoc(doc(alice(), 'users/alice/pushTokens/t-1'), { token: 'abc' }));
+  });
+
+  it('only affects the deleted UID', async () => {
+    await tombstone('bob');
+    await assertSucceeds(setDoc(doc(alice(), 'users/alice'), { aiConsent: true }));
+    await assertSucceeds(setDoc(doc(alice(), 'users/alice/indicators/ind-1'), { name: 'x' }));
+  });
+
+  it('keeps tombstones out of client reach', async () => {
+    await tombstone('alice');
+    await assertFails(getDoc(doc(alice(), 'deletedAccounts/alice')));
+    await assertFails(setDoc(doc(alice(), 'deletedAccounts/alice'), { deletedAt: null }));
+    await assertFails(setDoc(doc(alice(), 'deletedAccounts/bob'), { deletedAt: null }));
+  });
+});
diff --git a/docs/Pulsar_Arquitetura_e_Implementacao.md b/docs/Pulsar_Arquitetura_e_Implementacao.md
index e5571e5..d7d95de 100644
--- a/docs/Pulsar_Arquitetura_e_Implementacao.md
+++ b/docs/Pulsar_Arquitetura_e_Implementacao.md
@@ -82,7 +82,7 @@ users/{uid}/savedInsights/{savedInsightId} # snapshots curtidos
 users/{uid}/insightFeedback/{feedbackId}    # likes/dislikes
 users/{uid}/pushSubscriptions/{deviceId}
 users/{uid}/dailySummaries/{yyyyMMdd}        # cache opcional
-internal/userQuotas/{uid}                    # somente servidor, se necessário
+internal/{uid}/**                            # somente servidor (quota, push, admin); só dados por UID
 ```
 
 ### 3.1 Usuário
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
