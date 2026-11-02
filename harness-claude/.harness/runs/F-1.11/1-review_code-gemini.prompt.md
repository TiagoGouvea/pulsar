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
diff --git a/app/functions/src/__tests__/deleteAccount.test.ts b/app/functions/src/__tests__/deleteAccount.test.ts
new file mode 100644
index 0000000..3fa76a1
--- /dev/null
+++ b/app/functions/src/__tests__/deleteAccount.test.ts
@@ -0,0 +1,210 @@
+import { initializeApp } from 'firebase-admin/app';
+import { getAuth } from 'firebase-admin/auth';
+import { getFirestore, type DocumentReference, type Firestore } from 'firebase-admin/firestore';
+import { beforeAll, describe, expect, it } from 'vitest';
+
+// Emulator endpoints (ports from firebase.json); the Admin SDK reads these env vars lazily.
+process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8282';
+process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9299';
+
+const PROJECT = 'demo-pulsar';
+const CALLABLE_URL = `http://127.0.0.1:5001/${PROJECT}/southamerica-east1/deleteAccount`;
+const AUTH_URL = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`;
+
+type Session = { uid: string; idToken: string };
+type CallResult = {
+  status: number;
+  body: { result?: unknown; error?: { status?: string; message?: string } };
+};
+
+let db: Firestore;
+const auth = () => getAuth();
+
+beforeAll(() => {
+  initializeApp({ projectId: PROJECT });
+  db = getFirestore();
+});
+
+async function signUp(credentials?: { email: string; password: string }): Promise<Session> {
+  const response = await fetch(AUTH_URL, {
+    method: 'POST',
+    headers: { 'Content-Type': 'application/json' },
+    body: JSON.stringify(
+      credentials ? { ...credentials, returnSecureToken: true } : { returnSecureToken: true },
+    ),
+  });
+  const json = (await response.json()) as { localId: string; idToken: string };
+  return { uid: json.localId, idToken: json.idToken };
+}
+
+const uniqueEmail = () => `del-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
+
+// The Auth emulator issues unsigned tokens, so auth_time can be moved into the past to simulate a stale login.
+function withAuthTime(idToken: string, secondsAgo: number): string {
+  const [header, payload, signature = ''] = idToken.split('.');
+  const claims = JSON.parse(Buffer.from(payload ?? '', 'base64url').toString()) as Record<string, unknown>;
+  const authTime = Math.floor(Date.now() / 1000) - secondsAgo;
+  claims.auth_time = authTime;
+  claims.iat = authTime;
+  claims.exp = Math.floor(Date.now() / 1000) + 3600;
+  return [header, Buffer.from(JSON.stringify(claims)).toString('base64url'), signature].join('.');
+}
+
+async function callDeleteAccount(idToken?: string, data: Record<string, unknown> = {}): Promise<CallResult> {
+  const response = await fetch(CALLABLE_URL, {
+    method: 'POST',
+    headers: {
+      'Content-Type': 'application/json',
+      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
+    },
+    body: JSON.stringify({ data }),
+  });
+  return { status: response.status, body: (await response.json()) as CallResult['body'] };
+}
+
+// Counts every document reference below a path, including "phantom" parents that only hold subcollections.
+async function countTree(ref: DocumentReference): Promise<number> {
+  let total = 0;
+  for (const collection of await ref.listCollections()) {
+    for (const doc of await collection.listDocuments()) {
+      total += 1 + (await countTree(doc));
+    }
+  }
+  return total;
+}
+
+const userExists = (uid: string) =>
+  auth()
+    .getUser(uid)
+    .then(() => true)
+    .catch(() => false);
+
+async function seedAccount(uid: string, bulkRecords = 0): Promise<void> {
+  await db.doc(`users/${uid}`).set({ onboardingCompleted: true });
+  await db.doc(`users/${uid}/indicators/i1`).set({ name: 'ZQX_ENERGIA_7F3' });
+  await db.doc(`users/${uid}/indicators/i1/records/r1`).set({ value: 3 });
+  await db.doc(`users/${uid}/feedback/f1`).set({ text: 'ZQX_OBS_NOTA_5T1' });
+  await db.doc(`users/${uid}/completions/c1`).set({ localDate: '2026-01-01' });
+  await db.doc(`users/${uid}/pushTokens/t1`).set({ token: 'abc' });
+  await db.doc(`internal/userAdmin/users/${uid}`).set({ lastNotificationSentAt: new Date(0) });
+  await db.doc(`internal/aiQuota/users/${uid}`).set({ count: 1 });
+  await db.doc(`internal/aiQuota/users/${uid}/days/2026-01-01`).set({ count: 1 });
+  const writer = db.bulkWriter();
+  for (let i = 0; i < bulkRecords; i += 1) {
+    void writer.set(db.doc(`users/${uid}/bulk/b${i}`), { i });
+  }
+  await writer.close();
+}
+
+const remaining = async (uid: string) =>
+  (await countTree(db.doc(`users/${uid}`))) +
+  Number((await db.doc(`users/${uid}`).get()).exists) +
+  (await countTree(db.doc(`internal/userAdmin/users/${uid}`))) +
+  (await countTree(db.doc(`internal/aiQuota/users/${uid}`))) +
+  Number((await db.doc(`internal/userAdmin/users/${uid}`).get()).exists) +
+  Number((await db.doc(`internal/aiQuota/users/${uid}`).get()).exists);
+
+describe('deleteAccount callable', () => {
+  it('rejects unauthenticated calls', async () => {
+    const result = await callDeleteAccount();
+    expect(result.status).toBe(401);
+    expect(result.body.error?.status).toBe('UNAUTHENTICATED');
+  });
+
+  it('removes every document under users/{uid} and internal/ for an anonymous user, then the Auth user', async () => {
+    const session = await signUp();
+    await seedAccount(session.uid);
+    expect(await remaining(session.uid)).toBeGreaterThan(0);
+
+    const result = await callDeleteAccount(session.idToken);
+
+    expect(result.status).toBe(200);
+    expect(await remaining(session.uid)).toBe(0);
+    expect(await userExists(session.uid)).toBe(false);
+  });
+
+  it('removes the Auth user only after the Firestore cleanup is complete', async () => {
+    const session = await signUp();
+    await seedAccount(session.uid, 400);
+
+    let violation = false;
+    let done = false;
+    const watcher = (async () => {
+      while (!done) {
+        const authGone = !(await userExists(session.uid));
+        // Reading Auth first, then Firestore: if Auth was already gone, data must already be gone too.
+        if (authGone && (await remaining(session.uid)) > 0) violation = true;
+      }
+    })();
+
+    const result = await callDeleteAccount(session.idToken);
+    done = true;
+    await watcher;
+
+    expect(result.status).toBe(200);
+    expect(violation).toBe(false);
+    expect(await remaining(session.uid)).toBe(0);
+    expect(await userExists(session.uid)).toBe(false);
+  });
+
+  it('is idempotent: a second call after deletion succeeds', async () => {
+    const session = await signUp();
+    await seedAccount(session.uid);
+
+    expect((await callDeleteAccount(session.idToken)).status).toBe(200);
+    expect((await callDeleteAccount(session.idToken)).status).toBe(200);
+    expect(await remaining(session.uid)).toBe(0);
+    expect(await userExists(session.uid)).toBe(false);
+  });
+
+  it('deletes a non-anonymous account with a recent login', async () => {
+    const session = await signUp({ email: uniqueEmail(), password: 'Senha-123456' });
+    await seedAccount(session.uid);
+
+    const result = await callDeleteAccount(withAuthTime(session.idToken, 60));
+
+    expect(result.status).toBe(200);
+    expect(await remaining(session.uid)).toBe(0);
+    expect(await userExists(session.uid)).toBe(false);
+  });
+
+  it('answers requires-recent-login for a non-anonymous account whose login is older than 5 minutes, deleting nothing', async () => {
+    const session = await signUp({ email: uniqueEmail(), password: 'Senha-123456' });
+    await seedAccount(session.uid);
+    const before = await remaining(session.uid);
+
+    const result = await callDeleteAccount(withAuthTime(session.idToken, 6 * 60));
+
+    expect(result.status).toBeGreaterThanOrEqual(400);
+    expect(result.body.error?.message).toBe('requires-recent-login');
+    expect(await remaining(session.uid)).toBe(before);
+    expect(await userExists(session.uid)).toBe(true);
+  });
+
+  it('does not require a recent login for anonymous accounts', async () => {
+    const session = await signUp();
+    await seedAccount(session.uid);
+
+    const result = await callDeleteAccount(withAuthTime(session.idToken, 60 * 60));
+
+    expect(result.status).toBe(200);
+    expect(await remaining(session.uid)).toBe(0);
+    expect(await userExists(session.uid)).toBe(false);
+  });
+
+  it('only ever deletes the caller: a UID passed in the payload cannot target another user', async () => {
+    const caller = await signUp();
+    const victim = await signUp();
+    await seedAccount(caller.uid);
+    await seedAccount(victim.uid);
+    const victimBefore = await remaining(victim.uid);
+
+    const result = await callDeleteAccount(caller.idToken, { uid: victim.uid, userId: victim.uid });
+
+    expect(result.status).toBe(200);
+    expect(await remaining(caller.uid)).toBe(0);
+    expect(await userExists(caller.uid)).toBe(false);
+    expect(await remaining(victim.uid)).toBe(victimBefore);
+    expect(await userExists(victim.uid)).toBe(true);
+  });
+});
diff --git a/app/functions/src/index.ts b/app/functions/src/index.ts
index 15c58c2..45a3eb1 100644
--- a/app/functions/src/index.ts
+++ b/app/functions/src/index.ts
@@ -1,10 +1,43 @@
+import { initializeApp } from 'firebase-admin/app';
+import { getAuth } from 'firebase-admin/auth';
+import { getFirestore } from 'firebase-admin/firestore';
 import { setGlobalOptions } from 'firebase-functions/v2';
-import { onRequest } from 'firebase-functions/v2/https';
+import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
 
 // Every function runs in Brazil to keep data residency and latency aligned with the users (DECISOES.md).
 setGlobalOptions({ region: 'southamerica-east1' });
+initializeApp();
+
+const RECENT_LOGIN_SECONDS = 5 * 60;
 
 // Internal probe: 'private' removes public invoker IAM on deploy (only authorized principals can call it).
 export const healthcheck = onRequest({ invoker: 'private' }, (_request, response) => {
   response.status(200).send('ok');
 });
+
+// Deletes the caller's account (DECISOES.md#Exclusão de conta). The UID comes only from the verified token,
+// never from the payload. Firestore is cleaned first; the Auth user goes last. Safe to call again.
+export const deleteAccount = onCall(async (request) => {
+  if (!request.auth) throw new HttpsError('unauthenticated', 'unauthenticated');
+  const { uid, token } = request.auth;
+  const isAnonymous = token.firebase.sign_in_provider === 'anonymous';
+  if (!isAnonymous && Date.now() / 1000 - token.auth_time > RECENT_LOGIN_SECONDS) {
+    throw new HttpsError('failed-precondition', 'requires-recent-login');
+  }
+
+  const db = getFirestore();
+  await db.recursiveDelete(db.doc(`users/${uid}`));
+  // Server-only data lives either at internal/{area}/users/{uid} or at internal/{area}/{uid}/...
+  for (const area of await db.collection('internal').listDocuments()) {
+    for (const collection of await area.listCollections()) {
+      await db.recursiveDelete(collection.id === uid ? collection : collection.doc(uid));
+    }
+  }
+
+  await getAuth()
+    .deleteUser(uid)
+    .catch((error: { code?: string }) => {
+      if (error.code !== 'auth/user-not-found') throw error;
+    });
+  return { deleted: true };
+});
diff --git a/app/functions/vitest.config.ts b/app/functions/vitest.config.ts
index 2ac9162..c412174 100644
--- a/app/functions/vitest.config.ts
+++ b/app/functions/vitest.config.ts
@@ -6,5 +6,6 @@ export default defineConfig({
   test: {
     environment: 'node',
     include: ['src/**/*.test.ts'],
+    testTimeout: 30_000,
   },
 });
diff --git a/app/package.json b/app/package.json
index a2ad6c4..119faa5 100644
--- a/app/package.json
+++ b/app/package.json
@@ -20,7 +20,7 @@
     "test:rules": "sh scripts/port-lock.sh firebase emulators:exec --project demo-pulsar --only firestore \"vitest run --config vitest.rules.config.ts\"",
     "test:e2e": "sh scripts/port-lock.sh playwright test --grep-invert @visual",
     "test:visual": "sh scripts/port-lock.sh playwright test --grep @visual",
-    "test:functions": "yarn --cwd functions build && sh scripts/port-lock.sh firebase emulators:exec --project demo-pulsar --only functions \"vitest run --root functions\"",
+    "test:functions": "yarn --cwd functions build && sh scripts/port-lock.sh firebase emulators:exec --project demo-pulsar --only auth,firestore,functions \"vitest run --root functions\"",
     "seed": "tsx scripts/seed.ts",
     "icons": "tsx scripts/icons.ts && prettier --write src/design/icons.ts",
     "emulators": "yarn --cwd functions build && firebase emulators:start --project demo-pulsar --only auth,firestore,functions",
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
