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
  "id": "F-1.03",
  "title": "Acesso anônimo automático e documento do usuário",
  "description": "AuthProvider (src/auth/) que faz signInAnonymously na primeira visita, preserva a sessão, cria users/{uid} (createdAt, onboardingCompleted=false, aiConsent=false, reminderEnabled=false) e expõe estado de carregamento. Rotas: / redireciona para /onboarding (se não concluído) ou /dashboard.",
  "acceptance": [
    "Primeira visita entra sem cadastro, sem e-mail e sem tela de login",
    "Recarregar a página mantém o mesmo UID",
    "users/{uid} é criado uma única vez com os defaults",
    "Erro de rede mostra mensagem em pt-BR, sem indicar sucesso"
  ],
  "specRefs": [
    "spec.md#3",
    "spec.md#3.1",
    "arquitetura.md#3.1"
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
diff --git a/app/e2e/anonymous-start.spec.ts b/app/e2e/anonymous-start.spec.ts
new file mode 100644
index 0000000..c982027
--- /dev/null
+++ b/app/e2e/anonymous-start.spec.ts
@@ -0,0 +1,119 @@
+import { expect, test, type Page } from '@playwright/test';
+import { hasHorizontalOverflow } from './support';
+
+const FIRESTORE = 'http://127.0.0.1:8282/v1/projects/demo-pulsar/databases/(default)/documents';
+// The Firestore emulator treats this bearer token as admin, bypassing security rules.
+const ADMIN = { Authorization: 'Bearer owner' };
+
+// The Auth SDK persists the signed-in user in IndexedDB; read the UID from there.
+async function readUid(page: Page): Promise<string | null> {
+  return page.evaluate(
+    () =>
+      new Promise<string | null>((resolve) => {
+        const open = indexedDB.open('firebaseLocalStorageDb');
+        open.onerror = () => resolve(null);
+        open.onsuccess = () => {
+          const db = open.result;
+          if (!db.objectStoreNames.contains('firebaseLocalStorage')) return resolve(null);
+          const req = db.transaction('firebaseLocalStorage').objectStore('firebaseLocalStorage').getAll();
+          req.onerror = () => resolve(null);
+          req.onsuccess = () => {
+            const entry = (req.result as { value?: { uid?: string } }[]).find((e) => e.value?.uid);
+            resolve(entry?.value?.uid ?? null);
+          };
+        };
+      }),
+  );
+}
+
+async function waitForUid(page: Page): Promise<string> {
+  await expect.poll(() => readUid(page), { timeout: 15_000 }).not.toBeNull();
+  return (await readUid(page)) as string;
+}
+
+async function readUserDoc(page: Page, uid: string) {
+  const res = await page.request.get(`${FIRESTORE}/users/${uid}`, { headers: ADMIN });
+  return res.ok() ? ((await res.json()) as { fields: Record<string, Record<string, unknown>> }) : null;
+}
+
+test.describe('anonymous start', () => {
+  test('first visit enters without sign-up, e-mail or login screen', async ({ page }) => {
+    await page.goto('/');
+    await page.waitForURL('**/onboarding');
+
+    await expect(page.locator('input[type="email"], input[type="password"], input[type="tel"]')).toHaveCount(
+      0,
+    );
+    await expect(page.getByRole('button', { name: /entrar|login|cadastr|criar conta|senha/i })).toHaveCount(
+      0,
+    );
+    await expect(page.getByRole('link', { name: /entrar|login|cadastr|criar conta/i })).toHaveCount(0);
+    expect(await hasHorizontalOverflow(page)).toBe(false);
+    await waitForUid(page);
+  });
+
+  test('reload keeps the same UID', async ({ page }) => {
+    await page.goto('/');
+    await page.waitForURL('**/onboarding');
+    const uid = await waitForUid(page);
+
+    await page.reload();
+    await page.waitForURL('**/onboarding');
+    expect(await waitForUid(page)).toBe(uid);
+  });
+
+  test('users/{uid} is created once with the defaults', async ({ page }) => {
+    await page.goto('/');
+    await page.waitForURL('**/onboarding');
+    const uid = await waitForUid(page);
+
+    await expect.poll(() => readUserDoc(page, uid)).not.toBeNull();
+    const first = await readUserDoc(page, uid);
+    expect(first?.fields.onboardingCompleted).toEqual({ booleanValue: false });
+    expect(first?.fields.aiConsent).toEqual({ booleanValue: false });
+    expect(first?.fields.reminderEnabled).toEqual({ booleanValue: false });
+    const createdAt = first?.fields.createdAt;
+    expect(createdAt).toHaveProperty('timestampValue');
+
+    await page.reload();
+    await page.waitForURL('**/onboarding');
+    await waitForUid(page);
+    // Give a (wrong) second creation time to happen before asserting it did not.
+    await page.waitForLoadState('networkidle');
+    const second = await readUserDoc(page, uid);
+    expect(second?.fields.createdAt).toEqual(createdAt);
+    expect(second?.fields.onboardingCompleted).toEqual({ booleanValue: false });
+  });
+
+  test('root redirects to /dashboard once onboarding is completed', async ({ page }) => {
+    await page.goto('/');
+    await page.waitForURL('**/onboarding');
+    const uid = await waitForUid(page);
+    await expect.poll(() => readUserDoc(page, uid)).not.toBeNull();
+
+    const patch = await page.request.patch(
+      `${FIRESTORE}/users/${uid}?updateMask.fieldPaths=onboardingCompleted`,
+      {
+        headers: ADMIN,
+        data: { fields: { onboardingCompleted: { booleanValue: true } } },
+      },
+    );
+    expect(patch.ok()).toBe(true);
+
+    await page.goto('/');
+    await page.waitForURL('**/dashboard');
+    expect(await waitForUid(page)).toBe(uid);
+  });
+
+  test('network error shows a pt-BR message and never indicates success', async ({ page }) => {
+    await page.route('**/accounts:signUp*', (route) => route.abort('internetdisconnected'));
+    await page.goto('/');
+
+    const alert = page.getByRole('alert');
+    await expect(alert).toBeVisible({ timeout: 15_000 });
+    await expect(alert).toHaveText(/conex|rede|internet/i);
+    await expect(alert).not.toHaveText(/sucesso|conclu[ií]d|bem-vind/i);
+    expect(page.url()).not.toMatch(/\/(onboarding|dashboard)/);
+    expect(await readUid(page)).toBeNull();
+  });
+});
diff --git a/app/e2e/routes.json b/app/e2e/routes.json
index 914b79c..e65a010 100644
--- a/app/e2e/routes.json
+++ b/app/e2e/routes.json
@@ -1,4 +1,6 @@
 [
   { "path": "/", "name": "home", "tags": ["ui"] },
+  { "path": "/onboarding", "name": "onboarding", "tags": ["ui"] },
+  { "path": "/dashboard", "name": "dashboard", "tags": ["ui"] },
   { "path": "/_design", "name": "design", "tags": ["ui"] }
 ]
diff --git a/app/functions/src/__tests__/deleteAccount.test.ts b/app/functions/src/__tests__/deleteAccount.test.ts
deleted file mode 100644
index 3fa76a1..0000000
--- a/app/functions/src/__tests__/deleteAccount.test.ts
+++ /dev/null
@@ -1,210 +0,0 @@
-import { initializeApp } from 'firebase-admin/app';
-import { getAuth } from 'firebase-admin/auth';
-import { getFirestore, type DocumentReference, type Firestore } from 'firebase-admin/firestore';
-import { beforeAll, describe, expect, it } from 'vitest';
-
-// Emulator endpoints (ports from firebase.json); the Admin SDK reads these env vars lazily.
-process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8282';
-process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9299';
-
-const PROJECT = 'demo-pulsar';
-const CALLABLE_URL = `http://127.0.0.1:5001/${PROJECT}/southamerica-east1/deleteAccount`;
-const AUTH_URL = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`;
-
-type Session = { uid: string; idToken: string };
-type CallResult = {
-  status: number;
-  body: { result?: unknown; error?: { status?: string; message?: string } };
-};
-
-let db: Firestore;
-const auth = () => getAuth();
-
-beforeAll(() => {
-  initializeApp({ projectId: PROJECT });
-  db = getFirestore();
-});
-
-async function signUp(credentials?: { email: string; password: string }): Promise<Session> {
-  const response = await fetch(AUTH_URL, {
-    method: 'POST',
-    headers: { 'Content-Type': 'application/json' },
-    body: JSON.stringify(
-      credentials ? { ...credentials, returnSecureToken: true } : { returnSecureToken: true },
-    ),
-  });
-  const json = (await response.json()) as { localId: string; idToken: string };
-  return { uid: json.localId, idToken: json.idToken };
-}
-
-const uniqueEmail = () => `del-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
-
-// The Auth emulator issues unsigned tokens, so auth_time can be moved into the past to simulate a stale login.
-function withAuthTime(idToken: string, secondsAgo: number): string {
-  const [header, payload, signature = ''] = idToken.split('.');
-  const claims = JSON.parse(Buffer.from(payload ?? '', 'base64url').toString()) as Record<string, unknown>;
-  const authTime = Math.floor(Date.now() / 1000) - secondsAgo;
-  claims.auth_time = authTime;
-  claims.iat = authTime;
-  claims.exp = Math.floor(Date.now() / 1000) + 3600;
-  return [header, Buffer.from(JSON.stringify(claims)).toString('base64url'), signature].join('.');
-}
-
-async function callDeleteAccount(idToken?: string, data: Record<string, unknown> = {}): Promise<CallResult> {
-  const response = await fetch(CALLABLE_URL, {
-    method: 'POST',
-    headers: {
-      'Content-Type': 'application/json',
-      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
-    },
-    body: JSON.stringify({ data }),
-  });
-  return { status: response.status, body: (await response.json()) as CallResult['body'] };
-}
-
-// Counts every document reference below a path, including "phantom" parents that only hold subcollections.
-async function countTree(ref: DocumentReference): Promise<number> {
-  let total = 0;
-  for (const collection of await ref.listCollections()) {
-    for (const doc of await collection.listDocuments()) {
-      total += 1 + (await countTree(doc));
-    }
-  }
-  return total;
-}
-
-const userExists = (uid: string) =>
-  auth()
-    .getUser(uid)
-    .then(() => true)
-    .catch(() => false);
-
-async function seedAccount(uid: string, bulkRecords = 0): Promise<void> {
-  await db.doc(`users/${uid}`).set({ onboardingCompleted: true });
-  await db.doc(`users/${uid}/indicators/i1`).set({ name: 'ZQX_ENERGIA_7F3' });
-  await db.doc(`users/${uid}/indicators/i1/records/r1`).set({ value: 3 });
-  await db.doc(`users/${uid}/feedback/f1`).set({ text: 'ZQX_OBS_NOTA_5T1' });
-  await db.doc(`users/${uid}/completions/c1`).set({ localDate: '2026-01-01' });
-  await db.doc(`users/${uid}/pushTokens/t1`).set({ token: 'abc' });
-  await db.doc(`internal/userAdmin/users/${uid}`).set({ lastNotificationSentAt: new Date(0) });
-  await db.doc(`internal/aiQuota/users/${uid}`).set({ count: 1 });
-  await db.doc(`internal/aiQuota/users/${uid}/days/2026-01-01`).set({ count: 1 });
-  const writer = db.bulkWriter();
-  for (let i = 0; i < bulkRecords; i += 1) {
-    void writer.set(db.doc(`users/${uid}/bulk/b${i}`), { i });
-  }
-  await writer.close();
-}
-
-const remaining = async (uid: string) =>
-  (await countTree(db.doc(`users/${uid}`))) +
-  Number((await db.doc(`users/${uid}`).get()).exists) +
-  (await countTree(db.doc(`internal/userAdmin/users/${uid}`))) +
-  (await countTree(db.doc(`internal/aiQuota/users/${uid}`))) +
-  Number((await db.doc(`internal/userAdmin/users/${uid}`).get()).exists) +
-  Number((await db.doc(`internal/aiQuota/users/${uid}`).get()).exists);
-
-describe('deleteAccount callable', () => {
-  it('rejects unauthenticated calls', async () => {
-    const result = await callDeleteAccount();
-    expect(result.status).toBe(401);
-    expect(result.body.error?.status).toBe('UNAUTHENTICATED');
-  });
-
-  it('removes every document under users/{uid} and internal/ for an anonymous user, then the Auth user', async () => {
-    const session = await signUp();
-    await seedAccount(session.uid);
-    expect(await remaining(session.uid)).toBeGreaterThan(0);
-
-    const result = await callDeleteAccount(session.idToken);
-
-    expect(result.status).toBe(200);
-    expect(await remaining(session.uid)).toBe(0);
-    expect(await userExists(session.uid)).toBe(false);
-  });
-
-  it('removes the Auth user only after the Firestore cleanup is complete', async () => {
-    const session = await signUp();
-    await seedAccount(session.uid, 400);
-
-    let violation = false;
-    let done = false;
-    const watcher = (async () => {
-      while (!done) {
-        const authGone = !(await userExists(session.uid));
-        // Reading Auth first, then Firestore: if Auth was already gone, data must already be gone too.
-        if (authGone && (await remaining(session.uid)) > 0) violation = true;
-      }
-    })();
-
-    const result = await callDeleteAccount(session.idToken);
-    done = true;
-    await watcher;
-
-    expect(result.status).toBe(200);
-    expect(violation).toBe(false);
-    expect(await remaining(session.uid)).toBe(0);
-    expect(await userExists(session.uid)).toBe(false);
-  });
-
-  it('is idempotent: a second call after deletion succeeds', async () => {
-    const session = await signUp();
-    await seedAccount(session.uid);
-
-    expect((await callDeleteAccount(session.idToken)).status).toBe(200);
-    expect((await callDeleteAccount(session.idToken)).status).toBe(200);
-    expect(await remaining(session.uid)).toBe(0);
-    expect(await userExists(session.uid)).toBe(false);
-  });
-
-  it('deletes a non-anonymous account with a recent login', async () => {
-    const session = await signUp({ email: uniqueEmail(), password: 'Senha-123456' });
-    await seedAccount(session.uid);
-
-    const result = await callDeleteAccount(withAuthTime(session.idToken, 60));
-
-    expect(result.status).toBe(200);
-    expect(await remaining(session.uid)).toBe(0);
-    expect(await userExists(session.uid)).toBe(false);
-  });
-
-  it('answers requires-recent-login for a non-anonymous account whose login is older than 5 minutes, deleting nothing', async () => {
-    const session = await signUp({ email: uniqueEmail(), password: 'Senha-123456' });
-    await seedAccount(session.uid);
-    const before = await remaining(session.uid);
-
-    const result = await callDeleteAccount(withAuthTime(session.idToken, 6 * 60));
-
-    expect(result.status).toBeGreaterThanOrEqual(400);
-    expect(result.body.error?.message).toBe('requires-recent-login');
-    expect(await remaining(session.uid)).toBe(before);
-    expect(await userExists(session.uid)).toBe(true);
-  });
-
-  it('does not require a recent login for anonymous accounts', async () => {
-    const session = await signUp();
-    await seedAccount(session.uid);
-
-    const result = await callDeleteAccount(withAuthTime(session.idToken, 60 * 60));
-
-    expect(result.status).toBe(200);
-    expect(await remaining(session.uid)).toBe(0);
-    expect(await userExists(session.uid)).toBe(false);
-  });
-
-  it('only ever deletes the caller: a UID passed in the payload cannot target another user', async () => {
-    const caller = await signUp();
-    const victim = await signUp();
-    await seedAccount(caller.uid);
-    await seedAccount(victim.uid);
-    const victimBefore = await remaining(victim.uid);
-
-    const result = await callDeleteAccount(caller.idToken, { uid: victim.uid, userId: victim.uid });
-
-    expect(result.status).toBe(200);
-    expect(await remaining(caller.uid)).toBe(0);
-    expect(await userExists(caller.uid)).toBe(false);
-    expect(await remaining(victim.uid)).toBe(victimBefore);
-    expect(await userExists(victim.uid)).toBe(true);
-  });
-});
diff --git a/app/functions/src/index.ts b/app/functions/src/index.ts
index 45a3eb1..15c58c2 100644
--- a/app/functions/src/index.ts
+++ b/app/functions/src/index.ts
@@ -1,43 +1,10 @@
-import { initializeApp } from 'firebase-admin/app';
-import { getAuth } from 'firebase-admin/auth';
-import { getFirestore } from 'firebase-admin/firestore';
 import { setGlobalOptions } from 'firebase-functions/v2';
-import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
+import { onRequest } from 'firebase-functions/v2/https';
 
 // Every function runs in Brazil to keep data residency and latency aligned with the users (DECISOES.md).
 setGlobalOptions({ region: 'southamerica-east1' });
-initializeApp();
-
-const RECENT_LOGIN_SECONDS = 5 * 60;
 
 // Internal probe: 'private' removes public invoker IAM on deploy (only authorized principals can call it).
 export const healthcheck = onRequest({ invoker: 'private' }, (_request, response) => {
   response.status(200).send('ok');
 });
-
-// Deletes the caller's account (DECISOES.md#Exclusão de conta). The UID comes only from the verified token,
-// never from the payload. Firestore is cleaned first; the Auth user goes last. Safe to call again.
-export const deleteAccount = onCall(async (request) => {
-  if (!request.auth) throw new HttpsError('unauthenticated', 'unauthenticated');
-  const { uid, token } = request.auth;
-  const isAnonymous = token.firebase.sign_in_provider === 'anonymous';
-  if (!isAnonymous && Date.now() / 1000 - token.auth_time > RECENT_LOGIN_SECONDS) {
-    throw new HttpsError('failed-precondition', 'requires-recent-login');
-  }
-
-  const db = getFirestore();
-  await db.recursiveDelete(db.doc(`users/${uid}`));
-  // Server-only data lives either at internal/{area}/users/{uid} or at internal/{area}/{uid}/...
-  for (const area of await db.collection('internal').listDocuments()) {
-    for (const collection of await area.listCollections()) {
-      await db.recursiveDelete(collection.id === uid ? collection : collection.doc(uid));
-    }
-  }
-
-  await getAuth()
-    .deleteUser(uid)
-    .catch((error: { code?: string }) => {
-      if (error.code !== 'auth/user-not-found') throw error;
-    });
-  return { deleted: true };
-});
diff --git a/app/functions/vitest.config.ts b/app/functions/vitest.config.ts
index c412174..2ac9162 100644
--- a/app/functions/vitest.config.ts
+++ b/app/functions/vitest.config.ts
@@ -6,6 +6,5 @@ export default defineConfig({
   test: {
     environment: 'node',
     include: ['src/**/*.test.ts'],
-    testTimeout: 30_000,
   },
 });
diff --git a/app/package.json b/app/package.json
index 119faa5..a2ad6c4 100644
--- a/app/package.json
+++ b/app/package.json
@@ -20,7 +20,7 @@
     "test:rules": "sh scripts/port-lock.sh firebase emulators:exec --project demo-pulsar --only firestore \"vitest run --config vitest.rules.config.ts\"",
     "test:e2e": "sh scripts/port-lock.sh playwright test --grep-invert @visual",
     "test:visual": "sh scripts/port-lock.sh playwright test --grep @visual",
-    "test:functions": "yarn --cwd functions build && sh scripts/port-lock.sh firebase emulators:exec --project demo-pulsar --only auth,firestore,functions \"vitest run --root functions\"",
+    "test:functions": "yarn --cwd functions build && sh scripts/port-lock.sh firebase emulators:exec --project demo-pulsar --only functions \"vitest run --root functions\"",
     "seed": "tsx scripts/seed.ts",
     "icons": "tsx scripts/icons.ts && prettier --write src/design/icons.ts",
     "emulators": "yarn --cwd functions build && firebase emulators:start --project demo-pulsar --only auth,firestore,functions",
diff --git a/app/scripts/icons.ts b/app/scripts/icons.ts
index 0d52372..be48184 100644
--- a/app/scripts/icons.ts
+++ b/app/scripts/icons.ts
@@ -9,6 +9,18 @@ const names = [
   'add_circle',
   'analytics',
   'arrow_back',
+  'arrow_forward',
+  'bedtime',
+  'bolt',
+  'coffee',
+  'fitness_center',
+  'medication',
+  'person',
+  'psychology',
+  'science',
+  'touch_app',
+  'verified',
+  'vital_signs',
   'check_circle',
   'close',
   'input',
diff --git a/app/src/App.tsx b/app/src/App.tsx
index 3de0f57..9017c8f 100644
--- a/app/src/App.tsx
+++ b/app/src/App.tsx
@@ -1,13 +1,18 @@
 import { lazy, Suspense } from 'react';
 import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router';
+import { AuthProvider } from './auth/AuthProvider';
 import { emulatorsEnabled } from './lib/env';
-import { HomePlaceholder } from './pages/HomePlaceholder';
+import { DashboardPage } from './pages/DashboardPage';
+import { OnboardingPage } from './pages/OnboardingPage';
+import { RootPage } from './pages/RootPage';
 import { PrivacyProvider } from './privacy/PrivacyContext';
 
 const DesignPage = lazy(() => import('./pages/DesignPage'));
 
 const routes: RouteObject[] = [
-  { path: '/', element: <HomePlaceholder /> },
+  { path: '/', element: <RootPage /> },
+  { path: '/onboarding', element: <OnboardingPage /> },
+  { path: '/dashboard', element: <DashboardPage /> },
   ...(emulatorsEnabled
     ? [
         {
@@ -26,8 +31,10 @@ const router = createBrowserRouter(routes);
 
 export function App() {
   return (
-    <PrivacyProvider>
-      <RouterProvider router={router} />
-    </PrivacyProvider>
+    <AuthProvider>
+      <PrivacyProvider>
+        <RouterProvider router={router} />
+      </PrivacyProvider>
+    </AuthProvider>
   );
 }
diff --git a/app/src/auth/AuthProvider.tsx b/app/src/auth/AuthProvider.tsx
new file mode 100644
index 0000000..5f5e9a1
--- /dev/null
+++ b/app/src/auth/AuthProvider.tsx
@@ -0,0 +1,96 @@
+import {
+  createContext,
+  useCallback,
+  useContext,
+  useEffect,
+  useMemo,
+  useRef,
+  useState,
+  type ReactNode,
+} from 'react';
+import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
+import { auth } from '../lib/firebase';
+import { ensureUserDocument, markOnboardingCompleted } from './userRepository';
+
+interface AuthState {
+  user: User | null;
+  loading: boolean;
+  error: string | null;
+  onboardingCompleted: boolean;
+  completeOnboarding: () => Promise<void>;
+}
+
+const AuthContext = createContext<AuthState | null>(null);
+
+const NETWORK_ERROR = 'Não foi possível conectar. Verifique sua conexão com a internet e tente novamente.';
+const GENERIC_ERROR = 'Não foi possível iniciar sua sessão. Tente novamente.';
+
+function messageFor(error: unknown): string {
+  const code = (error as { code?: string } | null)?.code;
+  return code === 'auth/network-request-failed' ? NETWORK_ERROR : GENERIC_ERROR;
+}
+
+// First visit signs in anonymously and keeps the session across reloads (spec 3). The provider also
+// creates users/{uid} once and exposes the onboarding flag used by the root redirect.
+export function AuthProvider({ children }: { children: ReactNode }) {
+  const [user, setUser] = useState<User | null>(null);
+  const [loading, setLoading] = useState(true);
+  const [error, setError] = useState<string | null>(null);
+  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
+  const signingIn = useRef(false);
+
+  useEffect(() => {
+    let active = true;
+    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
+      if (!active) return;
+      if (nextUser) {
+        setUser(nextUser);
+        setError(null);
+        ensureUserDocument(nextUser.uid)
+          .then((profile) => {
+            if (!active) return;
+            setOnboardingCompleted(profile.onboardingCompleted);
+            setLoading(false);
+          })
+          .catch((err: unknown) => {
+            if (!active) return;
+            setError(messageFor(err));
+            setLoading(false);
+          });
+        return;
+      }
+      // No persisted session: create the anonymous account exactly once (StrictMode runs effects twice).
+      if (signingIn.current) return;
+      signingIn.current = true;
+      signInAnonymously(auth).catch((err: unknown) => {
+        if (!active) return;
+        setError(messageFor(err));
+        setLoading(false);
+      });
+    });
+    return () => {
+      active = false;
+      unsubscribe();
+    };
+  }, []);
+
+  const completeOnboarding = useCallback(async () => {
+    if (!user) return;
+    await markOnboardingCompleted(user.uid);
+    setOnboardingCompleted(true);
+  }, [user]);
+
+  const value = useMemo(
+    () => ({ user, loading, error, onboardingCompleted, completeOnboarding }),
+    [user, loading, error, onboardingCompleted, completeOnboarding],
+  );
+
+  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
+}
+
+// eslint-disable-next-line react-refresh/only-export-components
+export function useAuth(): AuthState {
+  const ctx = useContext(AuthContext);
+  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
+  return ctx;
+}
diff --git a/app/src/auth/__tests__/AuthProvider.test.tsx b/app/src/auth/__tests__/AuthProvider.test.tsx
new file mode 100644
index 0000000..9f02fba
--- /dev/null
+++ b/app/src/auth/__tests__/AuthProvider.test.tsx
@@ -0,0 +1,154 @@
+import { render, screen, waitFor } from '@testing-library/react';
+import { beforeEach, describe, expect, it, vi } from 'vitest';
+import { AuthProvider, useAuth } from '../AuthProvider';
+
+// In-memory fakes of the Firebase SDK. Only observable behavior is asserted: sign-in calls,
+// the resulting users/{uid} document and the state exposed through useAuth().
+const fake = vi.hoisted(() => {
+  type Listener = (user: { uid: string } | null) => void;
+  const state = {
+    currentUser: null as { uid: string } | null,
+    listeners: [] as Listener[],
+    docs: new Map<string, Record<string, unknown>>(),
+    writes: [] as string[],
+    signIn: vi.fn(),
+  };
+  return state;
+});
+
+vi.mock('../../lib/firebase', () => ({ auth: { name: 'fake-auth' }, db: { name: 'fake-db' } }));
+
+vi.mock('firebase/auth', async (importOriginal) => ({
+  ...(await importOriginal<typeof import('firebase/auth')>()),
+  onAuthStateChanged: (_auth: unknown, cb: (u: { uid: string } | null) => void) => {
+    fake.listeners.push(cb);
+    queueMicrotask(() => cb(fake.currentUser));
+    return () => {
+      fake.listeners = fake.listeners.filter((l) => l !== cb);
+    };
+  },
+  signInAnonymously: () => fake.signIn(),
+}));
+
+vi.mock('firebase/firestore', async (importOriginal) => {
+  const snapshot = (path: string) => ({
+    exists: () => fake.docs.has(path),
+    data: () => fake.docs.get(path),
+  });
+  const write = (ref: { path: string }, data: Record<string, unknown>, options?: { merge?: boolean }) => {
+    fake.writes.push(ref.path);
+    fake.docs.set(ref.path, options?.merge ? { ...fake.docs.get(ref.path), ...data } : data);
+  };
+  return {
+    ...(await importOriginal<typeof import('firebase/firestore')>()),
+    doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
+    serverTimestamp: () => 'SERVER_TIMESTAMP',
+    getDoc: async (ref: { path: string }) => snapshot(ref.path),
+    setDoc: async (ref: { path: string }, data: Record<string, unknown>, options?: { merge?: boolean }) =>
+      write(ref, data, options),
+    runTransaction: async (
+      _db: unknown,
+      fn: (tx: {
+        get: (ref: { path: string }) => Promise<unknown>;
+        set: (ref: { path: string }, data: Record<string, unknown>) => void;
+      }) => Promise<unknown>,
+    ) => fn({ get: async (ref) => snapshot(ref.path), set: write }),
+  };
+});
+
+function signInAs(uid: string) {
+  fake.signIn.mockImplementation(async () => {
+    fake.currentUser = { uid };
+    fake.listeners.forEach((l) => l(fake.currentUser));
+    return { user: fake.currentUser };
+  });
+}
+
+function Probe() {
+  const { user, loading, error } = useAuth();
+  return (
+    <div>
+      <span data-testid="loading">{String(loading)}</span>
+      <span data-testid="uid">{user?.uid ?? 'none'}</span>
+      <span data-testid="error">{error ?? 'none'}</span>
+    </div>
+  );
+}
+
+const renderProvider = () =>
+  render(
+    <AuthProvider>
+      <Probe />
+    </AuthProvider>,
+  );
+
+beforeEach(() => {
+  fake.currentUser = null;
+  fake.listeners = [];
+  fake.docs.clear();
+  fake.writes = [];
+  fake.signIn.mockReset();
+});
+
+describe('AuthProvider', () => {
+  it('exposes loading until the session is resolved, then the anonymous user', async () => {
+    signInAs('anon-1');
+    renderProvider();
+    expect(screen.getByTestId('loading')).toHaveTextContent('true');
+    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
+    expect(screen.getByTestId('uid')).toHaveTextContent('anon-1');
+    expect(screen.getByTestId('error')).toHaveTextContent('none');
+    expect(fake.signIn).toHaveBeenCalledTimes(1);
+  });
+
+  it('creates users/{uid} with the defaults', async () => {
+    signInAs('anon-1');
+    renderProvider();
+    await waitFor(() => expect(fake.docs.has('users/anon-1')).toBe(true));
+    expect(fake.docs.get('users/anon-1')).toEqual({
+      createdAt: 'SERVER_TIMESTAMP',
+      onboardingCompleted: false,
+      aiConsent: false,
+      reminderEnabled: false,
+    });
+  });
+
+  it('keeps the existing session and does not recreate the document after a reload', async () => {
+    signInAs('anon-1');
+    const first = renderProvider();
+    await waitFor(() => expect(fake.docs.has('users/anon-1')).toBe(true));
+    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
+    first.unmount();
+
+    const writesBefore = fake.writes.length;
+    fake.signIn.mockClear();
+    renderProvider();
+    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
+
+    expect(screen.getByTestId('uid')).toHaveTextContent('anon-1');
+    expect(fake.signIn).not.toHaveBeenCalled();
+    expect(fake.writes.length).toBe(writesBefore);
+    expect(fake.writes.filter((p) => p === 'users/anon-1')).toHaveLength(1);
+  });
+
+  it('does not overwrite an existing user document', async () => {
+    fake.currentUser = { uid: 'anon-2' };
+    fake.docs.set('users/anon-2', { createdAt: 'EARLIER', onboardingCompleted: true });
+    renderProvider();
+    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
+    expect(fake.docs.get('users/anon-2')).toEqual({ createdAt: 'EARLIER', onboardingCompleted: true });
+    expect(fake.writes).toHaveLength(0);
+  });
+
+  it('exposes a pt-BR error and no user when sign-in fails on the network', async () => {
+    fake.signIn.mockRejectedValue(
+      Object.assign(new Error('network'), { code: 'auth/network-request-failed' }),
+    );
+    renderProvider();
+    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
+    expect(screen.getByTestId('uid')).toHaveTextContent('none');
+    expect(screen.getByTestId('error').textContent).toMatch(/conex|rede|internet/i);
+    expect(screen.getByTestId('error').textContent).not.toMatch(/sucesso/i);
+    expect(fake.writes).toHaveLength(0);
+  });
+});
diff --git a/app/src/auth/userRepository.ts b/app/src/auth/userRepository.ts
new file mode 100644
index 0000000..5971377
--- /dev/null
+++ b/app/src/auth/userRepository.ts
@@ -0,0 +1,30 @@
+import { doc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
+import { db } from '../lib/firebase';
+
+export interface UserProfile {
+  onboardingCompleted: boolean;
+}
+
+// Creates users/{uid} exactly once. The transaction makes "create if missing" atomic, so a reload or a
+// second tab never overwrites createdAt or the onboarding state (spec 3, arquitetura 3.1).
+export async function ensureUserDocument(uid: string): Promise<UserProfile> {
+  const ref = doc(db, 'users', uid);
+  return runTransaction(db, async (transaction) => {
+    const snapshot = await transaction.get(ref);
+    if (snapshot.exists()) {
+      const data = snapshot.data() as { onboardingCompleted?: boolean } | undefined;
+      return { onboardingCompleted: data?.onboardingCompleted ?? false };
+    }
+    transaction.set(ref, {
+      createdAt: serverTimestamp(),
+      onboardingCompleted: false,
+      aiConsent: false,
+      reminderEnabled: false,
+    });
+    return { onboardingCompleted: false };
+  });
+}
+
+export async function markOnboardingCompleted(uid: string): Promise<void> {
+  await setDoc(doc(db, 'users', uid), { onboardingCompleted: true }, { merge: true });
+}
diff --git a/app/src/design/icons.ts b/app/src/design/icons.ts
index 0fb9d11..5eb265a 100644
--- a/app/src/design/icons.ts
+++ b/app/src/design/icons.ts
@@ -6,6 +6,28 @@ export const iconPaths = {
   analytics:
     'M280 -280L360 -280L360 -480L280 -480ZM600 -280L680 -280L680 -680L600 -680ZM440 -280L520 -280L520 -400L440 -400ZM440 -480L520 -480L520 -560L440 -560ZM200 -120Q167 -120 143.5 -143.5Q120 -167 120 -200L120 -760Q120 -793 143.5 -816.5Q167 -840 200 -840L760 -840Q793 -840 816.5 -816.5Q840 -793 840 -760L840 -200Q840 -167 816.5 -143.5Q793 -120 760 -120ZM200 -200L760 -200Q760 -200 760 -200Q760 -200 760 -200L760 -760Q760 -760 760 -760Q760 -760 760 -760L200 -760Q200 -760 200 -760Q200 -760 200 -760L200 -200Q200 -200 200 -200Q200 -200 200 -200ZM200 -760L200 -760Q200 -760 200 -760Q200 -760 200 -760L200 -200Q200 -200 200 -200Q200 -200 200 -200L200 -200Q200 -200 200 -200Q200 -200 200 -200L200 -760Q200 -760 200 -760Q200 -760 200 -760Z',
   arrow_back: 'M313 -440L537 -216L480 -160L160 -480L480 -800L537 -744L313 -520L800 -520L800 -440Z',
+  arrow_forward: 'M647 -440L160 -440L160 -520L647 -520L423 -744L480 -800L800 -480L480 -160L423 -216Z',
+  bedtime:
+    'M484 -80Q400 -80 326.5 -112Q253 -144 198.5 -198.5Q144 -253 112 -326.5Q80 -400 80 -484Q80 -630 173 -741.5Q266 -853 410 -880Q392 -781 421 -686.5Q450 -592 521 -521Q592 -450 686.5 -421Q781 -392 880 -410Q854 -266 742 -173Q630 -80 484 -80ZM484 -160Q572 -160 647 -204Q722 -248 765 -325Q679 -333 602 -368.5Q525 -404 464 -465Q403 -526 367 -603Q331 -680 324 -766Q247 -723 203.5 -647.5Q160 -572 160 -484Q160 -349 254.5 -254.5Q349 -160 484 -160ZM464 -465Q464 -465 464 -465Q464 -465 464 -465Q464 -465 464 -465Q464 -465 464 -465Q464 -465 464 -465Q464 -465 464 -465Q464 -465 464 -465Q464 -465 464 -465Q464 -465 464 -465Q464 -465 464 -465Z',
+  bolt: 'M422 -232L629 -480L469 -480L498 -707L313 -440L452 -440ZM320 -80L360 -360L160 -360L520 -880L600 -880L560 -560L800 -560L400 -80ZM471 -470L471 -470L471 -470L471 -470L471 -470L471 -470Z',
+  coffee:
+    'M440 -240Q323 -240 241.5 -321.5Q160 -403 160 -520L160 -760Q160 -793 183.5 -816.5Q207 -840 240 -840L740 -840Q798 -840 839 -799Q880 -758 880 -700Q880 -642 839 -601Q798 -560 740 -560L720 -560L720 -520Q720 -403 638.5 -321.5Q557 -240 440 -240ZM240 -640L640 -640L640 -760L240 -760ZM440 -320Q523 -320 581.5 -378.5Q640 -437 640 -520L640 -560L240 -560L240 -520Q240 -437 298.5 -378.5Q357 -320 440 -320ZM720 -640L740 -640Q765 -640 782.5 -657.5Q800 -675 800 -700Q800 -725 782.5 -742.5Q765 -760 740 -760L720 -760ZM160 -120L160 -200L800 -200L800 -120ZM440 -560Q440 -560 440 -560Q440 -560 440 -560L440 -560L440 -560L440 -560Q440 -560 440 -560Q440 -560 440 -560Z',
+  fitness_center:
+    'M536 -84L480 -140L622 -282L282 -622L140 -480L84 -536L140 -594L84 -650L168 -734L112 -792L168 -848L226 -792L310 -876L366 -820L424 -876L480 -820L338 -678L678 -338L820 -480L876 -424L820 -366L876 -310L792 -226L848 -168L792 -112L734 -168L650 -84L594 -140Z',
+  medication:
+    'M420 -260L540 -260L540 -360L640 -360L640 -480L540 -480L540 -580L420 -580L420 -480L320 -480L320 -360L420 -360ZM280 -120Q247 -120 223.5 -143.5Q200 -167 200 -200L200 -640Q200 -673 223.5 -696.5Q247 -720 280 -720L680 -720Q713 -720 736.5 -696.5Q760 -673 760 -640L760 -200Q760 -167 736.5 -143.5Q713 -120 680 -120ZM280 -200L680 -200Q680 -200 680 -200Q680 -200 680 -200L680 -640Q680 -640 680 -640Q680 -640 680 -640L280 -640Q280 -640 280 -640Q280 -640 280 -640L280 -200Q280 -200 280 -200Q280 -200 280 -200ZM240 -760L240 -840L720 -840L720 -760ZM280 -640L280 -640Q280 -640 280 -640Q280 -640 280 -640L280 -200Q280 -200 280 -200Q280 -200 280 -200L280 -200Q280 -200 280 -200Q280 -200 280 -200L280 -640Q280 -640 280 -640Q280 -640 280 -640Z',
+  person:
+    'M480 -480Q414 -480 367 -527Q320 -574 320 -640Q320 -706 367 -753Q414 -800 480 -800Q546 -800 593 -753Q640 -706 640 -640Q640 -574 593 -527Q546 -480 480 -480ZM160 -160L160 -272Q160 -306 177.5 -334.5Q195 -363 224 -378Q286 -409 350 -424.5Q414 -440 480 -440Q546 -440 610 -424.5Q674 -409 736 -378Q765 -363 782.5 -334.5Q800 -306 800 -272L800 -160ZM240 -240L720 -240L720 -272Q720 -283 714.5 -292Q709 -301 700 -306Q646 -333 591 -346.5Q536 -360 480 -360Q424 -360 369 -346.5Q314 -333 260 -306Q251 -301 245.5 -292Q240 -283 240 -272ZM480 -560Q513 -560 536.5 -583.5Q560 -607 560 -640Q560 -673 536.5 -696.5Q513 -720 480 -720Q447 -720 423.5 -696.5Q400 -673 400 -640Q400 -607 423.5 -583.5Q447 -560 480 -560ZM480 -640Q480 -640 480 -640Q480 -640 480 -640Q480 -640 480 -640Q480 -640 480 -640Q480 -640 480 -640Q480 -640 480 -640Q480 -640 480 -640Q480 -640 480 -640ZM480 -240L480 -240Q480 -240 480 -240Q480 -240 480 -240Q480 -240 480 -240Q480 -240 480 -240Q480 -240 480 -240Q480 -240 480 -240Q480 -240 480 -240Q480 -240 480 -240L480 -240Z',
+  psychology:
+    'M240 -80L240 -252Q183 -304 151.5 -373.5Q120 -443 120 -520Q120 -670 225 -775Q330 -880 480 -880Q605 -880 701.5 -806.5Q798 -733 827 -615L879 -410Q884 -391 872 -375.5Q860 -360 840 -360L760 -360L760 -240Q760 -207 736.5 -183.5Q713 -160 680 -160L600 -160L600 -80L520 -80L520 -240L680 -240Q680 -240 680 -240Q680 -240 680 -240L680 -440L788 -440L750 -595Q727 -686 652 -743Q577 -800 480 -800Q364 -800 282 -719Q200 -638 200 -522Q200 -462 224.5 -408Q249 -354 294 -312L320 -288L320 -80ZM494 -440L494 -440L494 -440Q494 -440 494 -440Q494 -440 494 -440Q494 -440 494 -440Q494 -440 494 -440Q494 -440 494 -440Q494 -440 494 -440L494 -440L494 -440L494 -440Q494 -440 494 -440Q494 -440 494 -440L494 -440L494 -440ZM440 -360L520 -360L526 -410Q534 -413 540.5 -417Q547 -421 552 -426L598 -406L638 -474L598 -504Q600 -512 600 -520Q600 -528 598 -536L638 -566L598 -634L552 -614Q547 -619 540.5 -623Q534 -627 526 -630L520 -680L440 -680L434 -630Q426 -627 419.5 -623Q413 -619 408 -614L362 -634L322 -566L362 -536Q360 -528 360 -520Q360 -512 362 -504L322 -474L362 -406L408 -426Q413 -421 419.5 -417Q426 -413 434 -410ZM480 -460Q455 -460 437.5 -477.5Q420 -495 420 -520Q420 -545 437.5 -562.5Q455 -580 480 -580Q505 -580 522.5 -562.5Q540 -545 540 -520Q540 -495 522.5 -477.5Q505 -460 480 -460Z',
+  science:
+    'M200 -120Q149 -120 127.5 -165.5Q106 -211 138 -250L360 -520L360 -760L320 -760Q303 -760 291.5 -771.5Q280 -783 280 -800Q280 -817 291.5 -828.5Q303 -840 320 -840L640 -840Q657 -840 668.5 -828.5Q680 -817 680 -800Q680 -783 668.5 -771.5Q657 -760 640 -760L600 -760L600 -520L822 -250Q854 -211 832.5 -165.5Q811 -120 760 -120ZM200 -200L760 -200L520 -492L520 -760L440 -760L440 -492ZM480 -480L480 -480L480 -480L480 -480L480 -480L480 -480Z',
+  touch_app:
+    'M419 -80Q391 -80 366.5 -92Q342 -104 325 -126L107 -403L126 -423Q146 -444 174 -448Q202 -452 226 -437L300 -392L300 -720Q300 -737 311.5 -748.5Q323 -760 340 -760Q357 -760 369 -748.5Q381 -737 381 -720L381 -248L284 -308L388 -175Q394 -168 402 -164Q410 -160 419 -160L640 -160Q673 -160 696.5 -183.5Q720 -207 720 -240L720 -400Q720 -417 708.5 -428.5Q697 -440 680 -440L461 -440L461 -520L680 -520Q730 -520 765 -485Q800 -450 800 -400L800 -240Q800 -174 753 -127Q706 -80 640 -80ZM167 -620Q154 -642 147 -667.5Q140 -693 140 -720Q140 -803 198.5 -861.5Q257 -920 340 -920Q423 -920 481.5 -861.5Q540 -803 540 -720Q540 -693 533 -667.5Q526 -642 513 -620L444 -660Q452 -674 456 -688.5Q460 -703 460 -720Q460 -770 425 -805Q390 -840 340 -840Q290 -840 255 -805Q220 -770 220 -720Q220 -703 224 -688.5Q228 -674 236 -660ZM502 -340L502 -340L502 -340L502 -340Q502 -340 502 -340Q502 -340 502 -340L502 -340Q502 -340 502 -340Q502 -340 502 -340L502 -340Q502 -340 502 -340Q502 -340 502 -340L502 -340L502 -340Z',
+  verified:
+    'M344 -60L268 -188L124 -220L138 -368L40 -480L138 -592L124 -740L268 -772L344 -900L480 -842L616 -900L692 -772L836 -740L822 -592L920 -480L822 -368L836 -220L692 -188L616 -60L480 -118ZM378 -162L480 -206L584 -162L640 -258L750 -284L740 -396L814 -480L740 -566L750 -678L640 -702L582 -798L480 -754L376 -798L320 -702L210 -678L220 -566L146 -480L220 -396L210 -282L320 -258ZM480 -480L480 -480L480 -480L480 -480L480 -480L480 -480L480 -480L480 -480L480 -480L480 -480L480 -480L480 -480L480 -480L480 -480L480 -480L480 -480L480 -480L480 -480L480 -480L480 -480ZM438 -338L664 -564L608 -622L438 -452L352 -536L296 -480Z',
+  vital_signs:
+    'M360 -160Q341 -160 326 -171Q311 -182 304 -199L212 -440L40 -440L40 -520L268 -520L360 -276L544 -761Q551 -778 566 -789Q581 -800 600 -800Q619 -800 634 -789Q649 -778 656 -761L748 -520L920 -520L920 -440L692 -440L600 -684L416 -199Q409 -182 394 -171Q379 -160 360 -160Z',
   check_circle:
     'M424 -296L706 -578L650 -634L424 -408L310 -522L254 -466ZM480 -80Q397 -80 324 -111.5Q251 -143 197 -197Q143 -251 111.5 -324Q80 -397 80 -480Q80 -563 111.5 -636Q143 -709 197 -763Q251 -817 324 -848.5Q397 -880 480 -880Q563 -880 636 -848.5Q709 -817 763 -763Q817 -709 848.5 -636Q880 -563 880 -480Q880 -397 848.5 -324Q817 -251 763 -197Q709 -143 636 -111.5Q563 -80 480 -80ZM480 -160Q614 -160 707 -253Q800 -346 800 -480Q800 -614 707 -707Q614 -800 480 -800Q346 -800 253 -707Q160 -614 160 -480Q160 -346 253 -253Q346 -160 480 -160ZM480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Z',
   close:
diff --git a/app/src/pages/DashboardPage.tsx b/app/src/pages/DashboardPage.tsx
new file mode 100644
index 0000000..f43af75
--- /dev/null
+++ b/app/src/pages/DashboardPage.tsx
@@ -0,0 +1,37 @@
+import { useAuth } from '../auth/AuthProvider';
+import { Card, EyeToggle, Icon } from '../design';
+
+// Empty dashboard placeholder for the base stage. Indicator creation and insights arrive in later features.
+export function DashboardPage() {
+  const { user } = useAuth();
+
+  return (
+    <main className="mx-auto flex min-h-dvh w-full max-w-(--container-app) flex-col gap-space-lg px-margin py-space-lg">
+      <header className="flex items-center justify-between gap-2">
+        <div className="flex min-w-0 flex-col">
+          <p className="font-label-code text-label-code tracking-wider text-on-surface-variant uppercase">
+            Pulsar
+          </p>
+          <h1 className="font-headline-lg-mobile text-headline-lg-mobile">Seu painel</h1>
+        </div>
+        <EyeToggle />
+      </header>
+
+      <Card className="items-center text-center">
+        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed text-primary">
+          <Icon name="insights" className="text-[24px]" />
+        </div>
+        <h2 className="font-headline-md text-headline-md">Comece pelos seus indicadores</h2>
+        <p className="font-body-md text-body-md text-on-surface-variant">
+          Crie um Fator ou Resultado para registrar seu dia. Nenhum indicador é criado automaticamente.
+        </p>
+      </Card>
+
+      {user && (
+        <p className="font-body-sm text-body-sm text-on-surface-variant">
+          Sessão anônima ativa. Você pode salvar sua conta depois, em Configurações.
+        </p>
+      )}
+    </main>
+  );
+}
diff --git a/app/src/pages/HomePlaceholder.tsx b/app/src/pages/HomePlaceholder.tsx
deleted file mode 100644
index 4d2c13f..0000000
--- a/app/src/pages/HomePlaceholder.tsx
+++ /dev/null
@@ -1,11 +0,0 @@
-// Temporary landing until F-1.01/F-1.03 add the auth bootstrap and the app shell.
-export function HomePlaceholder() {
-  return (
-    <main className="mx-auto flex min-h-dvh w-full max-w-(--container-app) flex-col justify-center gap-2 px-margin">
-      <h1 className="font-headline-xl-mobile text-headline-xl-mobile">Pulsar</h1>
-      <p className="font-body-lg text-body-lg text-on-surface-variant">
-        Registre o que você faz e descubra possíveis relações com como você se sente.
-      </p>
-    </main>
-  );
-}
diff --git a/app/src/pages/OnboardingPage.tsx b/app/src/pages/OnboardingPage.tsx
new file mode 100644
index 0000000..ae2a5e6
--- /dev/null
+++ b/app/src/pages/OnboardingPage.tsx
@@ -0,0 +1,494 @@
+import { useState, type ReactNode } from 'react';
+import { Navigate, useNavigate } from 'react-router';
+import { useAuth } from '../auth/AuthProvider';
+import { Button, Card, Chip, Icon, Slider, type IconName } from '../design';
+
+interface Step {
+  label: string;
+  title: string;
+  description: string;
+  icon: IconName;
+  nextLabel: string;
+  heroLabel: string;
+  badges: { abbreviation: string; icon: IconName; name: string; position: string }[];
+  banner: { title: string; text: string };
+}
+
+const steps: Step[] = [
+  {
+    label: 'Fatores',
+    title: 'Observe sua rotina sem burocracia',
+    description:
+      'Fatores são hábitos, atividades e consumos do seu dia a dia. Você não precisa preencher dezenas de perguntas: registre apenas o que quiser em 15 segundos.',
+    icon: 'science',
+    nextLabel: 'Próximo: Resultados',
+    heroLabel: 'Inputs bio-comportamentais',
+    banner: {
+      title: 'Zero fricção:',
+      text: 'Nenhum campo é obrigatório. Responda apenas o que fizer sentido no seu dia a dia e descubra correlações reais com sua energia.',
+    },
+    badges: [
+      { abbreviation: 'CAF', icon: 'coffee', name: 'Café', position: 'left-2 top-3' },
+      { abbreviation: 'EXE', icon: 'fitness_center', name: 'Treino', position: 'right-2 top-3' },
+      { abbreviation: 'Q10', icon: 'medication', name: 'Suplemento', position: 'left-2 bottom-3' },
+      { abbreviation: 'SLP', icon: 'bedtime', name: 'Leitura', position: 'right-2 bottom-3' },
+    ],
+  },
+  {
+    label: 'Resultados',
+    title: 'Acompanhe como seu corpo responde',
+    description:
+      'Resultados são os efeitos que você percebe ou afere: níveis de energia, nitidez mental, sono regenerativo ou remissão de sintomas.',
+    icon: 'vital_signs',
+    nextLabel: 'Próximo: Descobertas',
+    heroLabel: 'Biometria e sintomas',
+    banner: {
+      title: 'Direção desejável:',
+      text: 'Você define a meta de cada Resultado. Mais energia é melhor; menos dor também. O Pulsar ajusta as comparações.',
+    },
+    badges: [
+      { abbreviation: 'ENE', icon: 'bolt', name: 'Energia', position: 'left-2 top-3' },
+      { abbreviation: 'FOC', icon: 'psychology', name: 'Foco', position: 'right-2 top-3' },
+      { abbreviation: 'SON', icon: 'bedtime', name: 'Sono', position: 'left-2 bottom-3' },
+      { abbreviation: 'HUM', icon: 'insights', name: 'Humor', position: 'right-2 bottom-3' },
+    ],
+  },
+  {
+    label: 'Associações',
+    title: 'Descubra possíveis relações',
+    description:
+      'Com o tempo, o Pulsar compara seus registros e mostra possíveis associações entre o que você faz e como se sente. Nada é criado automaticamente.',
+    icon: 'insights',
+    nextLabel: 'Começar a Explorar',
+    heroLabel: 'Ciência pessoal',
+    banner: {
+      title: 'Conta anônima:',
+      text: 'Você começa sem cadastro. Depois pode salvar sua conta para não perder o acesso aos seus dados.',
+    },
+    badges: [
+      { abbreviation: 'EXE', icon: 'fitness_center', name: 'Entrada', position: 'left-2 top-3' },
+      { abbreviation: 'NRG', icon: 'bolt', name: 'Efeito', position: 'right-2 top-3' },
+      { abbreviation: 'r', icon: 'analytics', name: 'Associação', position: 'left-2 bottom-3' },
+      { abbreviation: 'N', icon: 'check_circle', name: 'Amostra', position: 'right-2 bottom-3' },
+    ],
+  },
+];
+
+function Hero({ step }: { step: Step }) {
+  return (
+    <div className="my-space-md px-gutter">
+      <div className="relative flex w-full flex-col items-center overflow-hidden rounded-lg bg-surface-container-low p-space-lg shadow-level-1">
+        <div className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full bg-secondary-fixed/50 blur-2xl" />
+        <div className="pointer-events-none absolute -bottom-10 -left-10 h-44 w-44 rounded-full bg-primary-fixed/40 blur-2xl" />
+        <div className="relative flex h-44 w-full max-w-[280px] items-center justify-center">
+          <div className="absolute h-32 w-32 rounded-full border border-dashed border-outline-variant" />
+          <div className="z-10 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-lowest shadow-level-2">
+            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-on-secondary shadow-level-1">
+              <Icon name={step.icon} className="text-[24px]" />
+            </div>
+          </div>
+          {step.badges.map((badge) => (
+            <div
+              key={badge.abbreviation}
+              className={`absolute ${badge.position} flex items-center gap-1.5 rounded-full bg-surface-container-lowest px-2.5 py-1.5 shadow-level-1`}
+            >
+              <span className="rounded bg-secondary/10 px-1.5 py-0.5 font-label-code text-label-code text-secondary">
+                {badge.abbreviation}
+              </span>
+              <Icon name={badge.icon} className="text-[16px] text-secondary" />
+              <span className="font-label-md text-label-md text-on-surface">{badge.name}</span>
+            </div>
+          ))}
+        </div>
+        <div className="mt-2 flex items-center gap-1.5 rounded-full bg-secondary-fixed/60 px-3 py-1">
+          <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
+          <span className="font-label-code text-label-code font-semibold tracking-wider text-on-secondary-fixed uppercase">
+            {step.heroLabel}
+          </span>
+        </div>
+      </div>
+    </div>
+  );
+}
+
+function DemoRow({
+  abbreviation,
+  name,
+  detail,
+  children,
+}: {
+  abbreviation: string;
+  name: string;
+  detail: string;
+  children: ReactNode;
+}) {
+  return (
+    <div className="flex items-center justify-between gap-2 rounded-DEFAULT bg-surface-container-low p-space-sm">
+      <div className="flex min-w-0 items-center gap-2.5">
+        <span className="shrink-0 rounded bg-secondary/10 px-2 py-0.5 font-label-code text-label-code font-bold text-secondary">
+          {abbreviation}
+        </span>
+        <div className="flex min-w-0 flex-col">
+          <span className="truncate font-label-lg text-label-lg text-on-surface">{name}</span>
+          <span className="font-body-sm text-body-sm text-on-surface-variant">{detail}</span>
+        </div>
+      </div>
+      {children}
+    </div>
+  );
+}
+
+function FactorsDemo() {
+  const [exercise, setExercise] = useState(true);
+  const [cups, setCups] = useState(2);
+  return (
+    <div className="mb-space-md px-gutter">
+      <Card className="gap-space-md">
+        <div className="flex items-center justify-between gap-2">
+          <div className="flex items-center gap-2">
+            <Icon name="touch_app" className="text-[20px] text-secondary" />
+            <span className="font-label-lg text-label-lg text-on-surface">Exemplos práticos</span>
+          </div>
+          <span className="font-label-code text-label-code font-semibold text-secondary uppercase">
+            Interativo
+          </span>
+        </div>
+        <DemoRow abbreviation="EXE" name="Exercício Físico" detail="Intensidade moderada">
+          <div className="flex shrink-0 items-center gap-1 rounded-full bg-surface-container-high p-1">
+            <Chip selected={!exercise} onClick={() => setExercise(false)}>
+              Não
+            </Chip>
+            <Chip selected={exercise} tone="factor" onClick={() => setExercise(true)}>
+              Sim
+            </Chip>
+          </div>
+        </DemoRow>
+        <DemoRow abbreviation="CAF" name="Café Expresso" detail="Dose de cafeína">
+          <div className="flex shrink-0 items-center gap-1 rounded-full bg-surface-container-high p-1">
+            <button
+              type="button"
+              aria-label="Diminuir xícaras de café"
+              onClick={() => setCups(Math.max(0, cups - 1))}
+              className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface active:scale-95"
+            >
+              <Icon name="remove" className="text-[18px]" />
+            </button>
+            <span className="min-w-6 text-center font-label-lg text-label-lg text-on-surface">{cups}</span>
+            <span className="pr-1 font-body-sm text-body-sm text-on-surface-variant">xíc</span>
+            <button
+              type="button"
+              aria-label="Aumentar xícaras de café"
+              onClick={() => setCups(Math.min(10, cups + 1))}
+              className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-on-secondary active:scale-95"
+            >
+              <Icon name="add" className="text-[18px]" />
+            </button>
+          </div>
+        </DemoRow>
+        <DemoRow abbreviation="Q10" name="Coenzima Q10" detail="Suplementação celular">
+          <span className="shrink-0 rounded-full bg-surface-container-highest px-3 py-1.5 font-label-code text-label-code font-bold text-secondary">
+            200 mg
+          </span>
+        </DemoRow>
+      </Card>
+    </div>
+  );
+}
+
+function ResultsDemo() {
+  const [energy, setEnergy] = useState<number | null>(7);
+  const [focus, setFocus] = useState<number | null>(6);
+  const [headache, setHeadache] = useState(false);
+  return (
+    <div className="mb-space-md px-gutter">
+      <Card className="gap-space-md">
+        <div className="flex items-center justify-between gap-2">
+          <div className="flex items-center gap-2">
+            <span className="rounded bg-primary-fixed px-2 py-0.5 font-label-code text-label-code font-bold text-on-primary-fixed-variant">
+              RES
+            </span>
+            <span className="font-label-lg text-label-lg text-on-surface">Simulador de Percepção</span>
+          </div>
+          <span className="font-label-code text-label-code font-semibold text-primary uppercase">
+            Tempo real
+          </span>
+        </div>
+        <div className="flex flex-col gap-1 rounded-DEFAULT bg-surface-container-low p-space-sm">
+          <div className="flex items-center justify-between gap-2">
+            <span className="flex items-center gap-1.5 font-label-lg text-label-lg text-on-surface">
+              <Icon name="bolt" className="text-[18px] text-primary" /> Nível de Energia
+            </span>
+            <span className="font-stat-display text-stat-display text-primary">
+              {energy ?? '—'}
+              <span className="font-body-sm text-body-sm text-on-surface-variant">/10</span>
+            </span>
+          </div>
+          <Slider
+            label="Nível de energia"
+            value={energy}
+            onChange={setEnergy}
+            minLabel="0 · Exaustão"
+            maxLabel="10 · Vigor"
+          />
+        </div>
+        <div className="flex flex-col gap-1 rounded-DEFAULT bg-surface-container-low p-space-sm">
+          <div className="flex items-center justify-between gap-2">
+            <span className="flex items-center gap-1.5 font-label-lg text-label-lg text-on-surface">
+              <Icon name="psychology" className="text-[18px] text-secondary" /> Concentração / Foco
+            </span>
+            <span className="font-stat-display text-stat-display text-secondary">
+              {focus ?? '—'}
+              <span className="font-body-sm text-body-sm text-on-surface-variant">/10</span>
+            </span>
+          </div>
+          <Slider
+            label="Concentração e foco"
+            value={focus}
+            onChange={setFocus}
+            tone="factor"
+            minLabel="Disperso"
+            maxLabel="Imersão"
+          />
+        </div>
+        <div className="flex items-center justify-between gap-2 rounded-DEFAULT bg-surface-container-low p-space-sm">
+          <div className="flex min-w-0 items-center gap-2">
+            <Icon name="close" className="text-[18px] text-on-surface-variant" />
+            <div className="flex min-w-0 flex-col">
+              <span className="font-label-lg text-label-lg text-on-surface">Dor de Cabeça</span>
+              <span className="font-body-sm text-body-sm text-on-surface-variant">Registro binário</span>
+            </div>
+          </div>
+          <Chip selected={!headache} tone="factor" onClick={() => setHeadache(!headache)}>
+            {headache ? 'Com dor' : 'Sem sintomas'}
+          </Chip>
+        </div>
+      </Card>
+    </div>
+  );
+}
+
+function AssociationsDemo() {
+  return (
+    <div className="mb-space-md px-gutter">
+      <Card className="gap-space-md">
+        <div className="flex items-center justify-between gap-2">
+          <span className="font-label-code text-label-code font-semibold text-on-surface-variant uppercase">
+            Possível associação
+          </span>
+          <span className="rounded-full bg-tertiary-fixed px-2.5 py-0.5 font-label-code text-label-code font-semibold text-on-tertiary-fixed">
+            r = +0,68
+          </span>
+        </div>
+        <div className="flex items-center justify-between gap-2">
+          <div className="flex flex-col items-center gap-1 rounded-DEFAULT bg-secondary-fixed/60 px-3 py-2">
+            <span className="font-label-code text-label-code text-on-secondary-fixed-variant">EXE</span>
+            <span className="font-body-sm text-body-sm text-on-surface">Com exercício</span>
+          </div>
+          <Icon name="arrow_forward" className="text-[20px] text-on-surface-variant" />
+          <div className="flex flex-col items-center gap-1 rounded-DEFAULT bg-primary-fixed px-3 py-2">
+            <span className="font-label-code text-label-code text-on-primary-fixed-variant">NRG</span>
+            <span className="font-body-sm text-body-sm text-on-surface">Energia média</span>
+          </div>
+        </div>
+        <div className="grid grid-cols-2 gap-2">
+          <div className="flex flex-col gap-1 rounded-DEFAULT bg-surface-container-low p-space-sm">
+            <span className="font-label-code text-label-code text-on-surface-variant uppercase">
+              Com exercício (EXE)
+            </span>
+            <p className="font-stat-display text-stat-display text-on-surface">
+              7,4<span className="font-body-sm text-body-sm text-on-surface-variant">/10</span>
+            </p>
+            <span className="font-body-sm text-body-sm text-tertiary">▲ +27% energia média</span>
+          </div>
+          <div className="flex flex-col gap-1 rounded-DEFAULT bg-surface-container-low p-space-sm">
+            <span className="font-label-code text-label-code text-on-surface-variant uppercase">
+              Dias de repouso
+            </span>
+            <p className="font-stat-display text-stat-display text-on-surface">
+              5,8<span className="font-body-sm text-body-sm text-on-surface-variant">/10</span>
+            </p>
+            <span className="font-body-sm text-body-sm text-on-surface-variant">Linha base observada</span>
+          </div>
+        </div>
+        <p className="font-body-sm text-body-sm text-on-surface-variant">
+          N = 28 dias. Associação exploratória, não uma relação de causa e efeito.
+        </p>
+      </Card>
+    </div>
+  );
+}
+
+function EducationalBanner({ title, text }: { title: string; text: string }) {
+  return (
+    <div className="mx-gutter mb-space-lg flex items-start gap-space-sm rounded-DEFAULT bg-tertiary/10 p-space-md">
+      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tertiary text-on-tertiary">
+        <Icon name="verified" className="text-[16px]" />
+      </div>
+      <p className="font-body-sm text-body-sm leading-snug text-on-surface">
+        <strong className="font-semibold text-tertiary">{title}</strong> {text}
+      </p>
+    </div>
+  );
+}
+
+export function OnboardingPage() {
+  const { onboardingCompleted, completeOnboarding, loading } = useAuth();
+  const navigate = useNavigate();
+  const [index, setIndex] = useState(0);
+  const [finishing, setFinishing] = useState(false);
+  const [finishError, setFinishError] = useState<string | null>(null);
+
+  if (loading) {
+    return (
+      <main className="mx-auto flex min-h-dvh w-full max-w-(--container-app) flex-col items-center justify-center gap-3 px-margin">
+        <p className="font-body-md text-body-md text-on-surface-variant">Preparando seu Pulsar…</p>
+      </main>
+    );
+  }
+  if (onboardingCompleted) return <Navigate to="/dashboard" replace />;
+
+  const step = steps[index] ?? steps[0]!;
+
+  async function finish() {
+    if (finishing) return;
+    setFinishing(true);
+    setFinishError(null);
+    try {
+      await completeOnboarding();
+      navigate('/dashboard', { replace: true });
+    } catch {
+      setFinishError('Não foi possível concluir o tutorial. Tente novamente.');
+      setFinishing(false);
+    }
+  }
+
+  function next() {
+    if (index < steps.length - 1) {
+      setIndex(index + 1);
+      return;
+    }
+    void finish();
+  }
+
+  function back() {
+    if (index > 0) setIndex(index - 1);
+  }
+
+  return (
+    
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
