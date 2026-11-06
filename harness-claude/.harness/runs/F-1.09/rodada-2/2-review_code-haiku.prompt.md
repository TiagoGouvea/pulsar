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
- Escopo: código além do que a feature pede (telas/fluxos de outras features) é `major`; remover ou quebrar código de features já entregues é `blocker`.
- Segurança (Security Rules, dados entre usuários, segredos), privacidade (nomes de indicadores só via `<IndicatorLabel>`), aderência à spec e qualidade (tipos, legibilidade, duplicação).

## Feature
```json
{
  "id": "F-1.09",
  "title": "Conversão da conta: Google e link mágico preservando UID",
  "description": "Configurações > Conta (design/configura_es_e_conta): vincular Google (linkWithPopup) ou e-mail por link (sendSignInLinkToEmail + linkWithCredential, guardando o e-mail digitado). Verificar UID antes/depois. Se a credencial já pertence a outro UID, mostrar conflito com opções explícitas (cancelar / entrar na conta existente após confirmação), sem mesclar, substituir ou apagar dados. Sem senha nem telefone na UI.",
  "acceptance": [
    "Após vincular Google ou link mágico o UID é o mesmo e os registros continuam acessíveis",
    "credential-already-in-use / email-already-in-use abre resolução explícita; nada é mesclado ou apagado",
    "Nenhum campo de senha ou telefone em toda a UI",
    "Conta anônima mostra aviso de que perder o navegador pode significar perder os dados"
  ],
  "specRefs": [
    "spec.md#3",
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
diff --git a/app/e2e/account-link.spec.ts b/app/e2e/account-link.spec.ts
new file mode 100644
index 0000000..96ccecd
--- /dev/null
+++ b/app/e2e/account-link.spec.ts
@@ -0,0 +1,222 @@
+import type { Page } from '@playwright/test';
+import firebaseJson from '../firebase.json' with { type: 'json' };
+import { expect, test, currentUid } from './fixtures';
+import { appRoutes, hasHorizontalOverflow } from './support';
+
+// Contract of the Settings > Account UI (design/configura_es_e_conta):
+//  - [data-testid="account-status"]: says "Conta anônima" while anonymous; shows the linked e-mail afterwards.
+//  - Buttons "Vincular com Google" and "Enviar link mágico por e-mail" (the latter reveals an e-mail field;
+//    pressing Enter in the field sends the link).
+//  - The link in the e-mail opens /settings and the app completes the linking by itself.
+//  - A conflict opens a role="dialog" saying the account already exists, with the buttons "Cancelar" and
+//    "Entrar na conta existente"; the latter asks for a second confirmation ("Confirmar") before signing in.
+
+const PROJECT = 'demo-pulsar';
+const AUTH = `http://127.0.0.1:${firebaseJson.emulators.auth.port}`;
+const FIRESTORE = `http://127.0.0.1:${firebaseJson.emulators.firestore.port}/v1/projects/${PROJECT}/databases/(default)/documents`;
+const OWNER = { Authorization: 'Bearer owner' };
+const UI_FORBIDDEN = /senha|telefone/i;
+
+const uniqueEmail = (tag: string) => `${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
+
+async function putRecord(uid: string, name: string, value: string) {
+  const response = await fetch(`${FIRESTORE}/users/${uid}/indicators/${name}`, {
+    method: 'PATCH',
+    headers: { ...OWNER, 'Content-Type': 'application/json' },
+    body: JSON.stringify({ fields: { name: { stringValue: value } } }),
+  });
+  expect(response.ok).toBe(true);
+}
+
+async function docStatus(path: string): Promise<{ status: number; body: string }> {
+  const response = await fetch(`${FIRESTORE}/${path}`, { headers: OWNER });
+  return { status: response.status, body: await response.text() };
+}
+
+async function expectRecordIntact(uid: string, name: string, value: string) {
+  const record = await docStatus(`users/${uid}/indicators/${name}`);
+  expect(record.status).toBe(200);
+  expect(record.body).toContain(value);
+  expect((await docStatus(`users/${uid}`)).status).toBe(200);
+}
+
+/** Creates a permanent account (outside the app) that already owns the given e-mail. */
+async function createExistingAccount(email: string): Promise<string> {
+  const response = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key`, {
+    method: 'POST',
+    headers: { 'Content-Type': 'application/json' },
+    body: JSON.stringify({ email, password: 'e2e-existing-pass-1', returnSecureToken: true }),
+  });
+  expect(response.ok).toBe(true);
+  return ((await response.json()) as { localId: string }).localId;
+}
+
+/** The sign-in link the Auth Emulator recorded for the e-mail (what the user would receive). */
+async function latestSignInLink(email: string): Promise<string> {
+  let link = '';
+  await expect
+    .poll(
+      async () => {
+        const response = await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/oobCodes`);
+        const { oobCodes } = (await response.json()) as {
+          oobCodes: { email: string; requestType: string; oobLink: string }[];
+        };
+        const match = oobCodes
+          .filter((code) => code.email === email && code.requestType === 'EMAIL_SIGNIN')
+          .pop();
+        link = match?.oobLink ?? '';
+        return link;
+      },
+      { timeout: 15_000 },
+    )
+    .not.toBe('');
+  return link;
+}
+
+async function requestMagicLink(page: Page, email: string) {
+  await page.getByRole('button', { name: /enviar link mágico/i }).click();
+  const field = page.getByLabel(/e-mail/i);
+  await field.fill(email);
+  await field.press('Enter');
+}
+
+async function openSettings(page: Page) {
+  await page.goto('/settings');
+  await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible();
+  await expect(page.getByTestId('account-status')).toBeVisible();
+}
+
+test.describe('account link', () => {
+  test('settings opens and fits the screen (smoke)', async ({ freshUserPage: page }) => {
+    await openSettings(page);
+    expect(await hasHorizontalOverflow(page)).toBe(false);
+  });
+
+  test('anonymous account warns that losing the browser can mean losing the data', async ({
+    freshUserPage: page,
+  }, testInfo) => {
+    if (testInfo.project.name !== 'mobile') return;
+    await openSettings(page);
+
+    const status = page.getByTestId('account-status');
+    await expect(status).toContainText(/conta anônima/i);
+    await expect(status).toContainText(/perder/i);
+    await expect(status).toContainText(/navegador/i);
+    await expect(page.getByRole('button', { name: /vincular com google/i })).toBeVisible();
+    await expect(page.getByRole('button', { name: /enviar link mágico/i })).toBeVisible();
+  });
+
+  test('no password or phone field or wording anywhere in the UI', async ({
+    freshUserPage: page,
+  }, testInfo) => {
+    if (testInfo.project.name !== 'mobile') return;
+    const paths = appRoutes.map((route) => route.path).filter((path) => path !== '/_design');
+    for (const path of paths) {
+      await page.goto(path);
+      await page.waitForLoadState('networkidle');
+      if (path === '/settings') await page.getByRole('button', { name: /enviar link mágico/i }).click();
+      await expect(page.locator('input[type="password"], input[type="tel"]')).toHaveCount(0);
+      await expect(page.locator('input[autocomplete*="password"], input[autocomplete^="tel"]')).toHaveCount(
+        0,
+      );
+      expect(await page.evaluate(() => document.body.innerText)).not.toMatch(UI_FORBIDDEN);
+    }
+  });
+
+  test('magic link keeps the UID and the records', async ({ freshUserPage: page }, testInfo) => {
+    if (testInfo.project.name !== 'mobile') return;
+    const email = uniqueEmail('magic');
+    const uidBefore = await currentUid(page);
+    expect(uidBefore).not.toBeNull();
+    await putRecord(uidBefore!, 'e2e-link-keep', 'E2E_LINK_KEEP');
+
+    await openSettings(page);
+    await requestMagicLink(page, email);
+    await page.goto(await latestSignInLink(email));
+
+    const status = page.getByTestId('account-status');
+    await expect(status).toContainText(email, { timeout: 15_000 });
+    await expect(status).not.toContainText(/conta anônima/i);
+    expect(await currentUid(page)).toBe(uidBefore);
+    await expectRecordIntact(uidBefore!, 'e2e-link-keep', 'E2E_LINK_KEEP');
+    expect(await page.evaluate(() => document.body.innerText)).not.toMatch(UI_FORBIDDEN);
+  });
+
+  test('Google keeps the UID and the records', async ({ freshUserPage: page }, testInfo) => {
+    if (testInfo.project.name !== 'mobile') return;
+    const uidBefore = await currentUid(page);
+    await putRecord(uidBefore!, 'e2e-link-keep', 'E2E_LINK_KEEP');
+    await openSettings(page);
+
+    const popupPromise = page.waitForEvent('popup');
+    await page.getByRole('button', { name: /vincular com google/i }).click();
+    const popup = await popupPromise;
+    await popup.getByRole('button', { name: /add new account/i }).click();
+    await popup.getByRole('button', { name: /auto-generate user information/i }).click();
+    await popup.getByRole('button', { name: /sign in with google\.com/i }).click();
+
+    await expect(page.getByTestId('account-status')).not.toContainText(/conta anônima/i, { timeout: 15_000 });
+    expect(await currentUid(page)).toBe(uidBefore);
+    await expectRecordIntact(uidBefore!, 'e2e-link-keep', 'E2E_LINK_KEEP');
+  });
+
+  test('e-mail already in use opens an explicit resolution; cancel changes and deletes nothing', async ({
+    freshUserPage: page,
+  }, testInfo) => {
+    if (testInfo.project.name !== 'mobile') return;
+    const email = uniqueEmail('taken');
+    const existingUid = await createExistingAccount(email);
+    await putRecord(existingUid, 'e2e-existing', 'E2E_EXISTING_KEEP');
+    const anonUid = (await currentUid(page))!;
+    await putRecord(anonUid, 'e2e-anon', 'E2E_ANON_KEEP');
+
+    await openSettings(page);
+    await requestMagicLink(page, email);
+    await page.goto(await latestSignInLink(email));
+
+    const dialog = page.getByRole('dialog');
+    await expect(dialog).toBeVisible({ timeout: 15_000 });
+    await expect(dialog).toContainText(/já existe|já está em uso|já pertence/i);
+    await expect(dialog.getByRole('button', { name: /^cancelar$/i })).toBeVisible();
+    await expect(dialog.getByRole('button', { name: /entrar na conta existente/i })).toBeVisible();
+    expect(await currentUid(page)).toBe(anonUid);
+
+    await dialog.getByRole('button', { name: /^cancelar$/i }).click();
+    await expect(dialog).toBeHidden();
+    expect(await currentUid(page)).toBe(anonUid);
+    await expect(page.getByTestId('account-status')).toContainText(/conta anônima/i);
+    await expectRecordIntact(anonUid, 'e2e-anon', 'E2E_ANON_KEEP');
+    await expectRecordIntact(existingUid, 'e2e-existing', 'E2E_EXISTING_KEEP');
+  });
+
+  test('entering the existing account needs a second confirmation and never merges or deletes', async ({
+    freshUserPage: page,
+  }, testInfo) => {
+    if (testInfo.project.name !== 'mobile') return;
+    const email = uniqueEmail('taken');
+    const existingUid = await createExistingAccount(email);
+    await putRecord(existingUid, 'e2e-existing', 'E2E_EXISTING_KEEP');
+    const anonUid = (await currentUid(page))!;
+    await putRecord(anonUid, 'e2e-anon', 'E2E_ANON_KEEP');
+
+    await openSettings(page);
+    await requestMagicLink(page, email);
+    await page.goto(await latestSignInLink(email));
+
+    const dialog = page.getByRole('dialog');
+    await expect(dialog).toBeVisible({ timeout: 15_000 });
+    await dialog.getByRole('button', { name: /entrar na conta existente/i }).click();
+
+    // Still the anonymous user until the person explicitly confirms.
+    await expect(dialog.getByRole('button', { name: /^confirmar/i })).toBeVisible();
+    expect(await currentUid(page)).toBe(anonUid);
+
+    await dialog.getByRole('button', { name: /^confirmar/i }).click();
+    await expect.poll(() => currentUid(page), { timeout: 15_000 }).toBe(existingUid);
+
+    // Nothing was merged into, replaced or deleted from either account.
+    await expectRecordIntact(existingUid, 'e2e-existing', 'E2E_EXISTING_KEEP');
+    await expectRecordIntact(anonUid, 'e2e-anon', 'E2E_ANON_KEEP');
+    expect((await docStatus(`users/${existingUid}/indicators/e2e-anon`)).status).toBe(404);
+  });
+});
diff --git a/app/e2e/fixtures.ts b/app/e2e/fixtures.ts
index 486dc4c..4d15a5f 100644
--- a/app/e2e/fixtures.ts
+++ b/app/e2e/fixtures.ts
@@ -1,4 +1,12 @@
-import { expect, test as base, type BrowserContextOptions, type Page, type TestInfo } from '@playwright/test';
+import {
+  expect,
+  test as base,
+  type BrowserContext,
+  type BrowserContextOptions,
+  type Page,
+  type TestInfo,
+} from '@playwright/test';
+import firebaseJson from '../firebase.json' with { type: 'json' };
 
 export { expect };
 
@@ -8,6 +16,7 @@ export const SEED_UID = 'seed-user-0001';
 const AUTH_PROJECT = 'demo-pulsar';
 const CUSTOM_TOKEN_AUDIENCE =
   'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';
+const FIRESTORE_DOCUMENTS = `http://127.0.0.1:${firebaseJson.emulators.firestore.port}/v1/projects/${AUTH_PROJECT}/databases/(default)/documents`;
 
 export interface E2EFixtures {
   /** App opened with the seeded user already signed in (custom token of the Auth Emulator). */
@@ -66,6 +75,65 @@ function contextOptions(testInfo: TestInfo): BrowserContextOptions {
   return options;
 }
 
+/**
+ * Gives accounts created directly through the Auth REST API the same profile a first app visit would create.
+ * Node-side fixture requests do not pass through the app, so Auth alone cannot initialize Firestore.
+ */
+async function withExternalAccountProfiles<T>(run: () => Promise<T>): Promise<T> {
+  const originalFetch = globalThis.fetch;
+  globalThis.fetch = async (...args: Parameters<typeof fetch>) => {
+    const response = await originalFetch(...args);
+    const [input, init] = args;
+    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
+    const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
+    if (
+      method.toUpperCase() === 'POST' &&
+      url.includes('/identitytoolkit.googleapis.com/v1/accounts:signUp') &&
+      response.ok
+    ) {
+      const { localId } = (await response.clone().json()) as { localId: string };
+      const profile = await originalFetch(`${FIRESTORE_DOCUMENTS}/users/${localId}`, {
+        method: 'PATCH',
+        headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
+        body: JSON.stringify({
+          fields: {
+            onboardingCompleted: { booleanValue: false },
+            aiConsent: { booleanValue: false },
+            reminderEnabled: { booleanValue: false },
+          },
+        }),
+      });
+      if (!profile.ok)
+        throw new Error(`Could not initialize the external account profile: ${profile.status}`);
+    }
+    return response;
+  };
+  try {
+    return await run();
+  } finally {
+    globalThis.fetch = originalFetch;
+  }
+}
+
+/** Replays early clicks after the emulator's external widget script has subscribed to them. */
+async function stabilizeAuthEmulator(context: BrowserContext) {
+  await context.addInitScript((authPort) => {
+    if (window.location.port !== authPort || window.location.pathname !== '/emulator/auth/handler') return;
+    document.addEventListener(
+      'click',
+      (event) => {
+        if ('toggleForm' in window || !(event.target instanceof Element)) return;
+        const button = event.target.closest('button');
+        if (!button) return;
+        event.preventDefault();
+        event.stopImmediatePropagation();
+        window.addEventListener('load', () => button.click(), { once: true });
+      },
+      true,
+    );
+  }, String(firebaseJson.emulators.auth.port));
+}
+
 export const test = base.extend<E2EFixtures>({
   seedPage: async ({ browser }, use, testInfo) => {
     const context = await browser.newContext(contextOptions(testInfo));
@@ -90,13 +158,16 @@ export const test = base.extend<E2EFixtures>({
 
   freshUserPage: async ({ browser }, use, testInfo) => {
     const context = await browser.newContext(contextOptions(testInfo));
+    // Account-linking workarounds (external Auth REST accounts, emulator widget) are opt-in: other specs are untouched.
+    const linksAccounts = testInfo.file.endsWith('account-link.spec.ts');
+    if (linksAccounts) await stabilizeAuthEmulator(context);
     const page = await context.newPage();
     try {
       // Open the app once so the anonymous session of this test already exists.
       await page.goto('/');
       await waitForTestHelper(page);
       await expect.poll(() => currentUid(page), { timeout: 30_000 }).not.toBeNull();
-      await use(page);
+      await (linksAccounts ? withExternalAccountProfiles(() => use(page)) : use(page));
     } finally {
       await context.close();
     }
diff --git a/app/src/App.tsx b/app/src/App.tsx
index fda5f6d..c42f37a 100644
--- a/app/src/App.tsx
+++ b/app/src/App.tsx
@@ -7,6 +7,7 @@ import { emulatorsEnabled } from './lib/env';
 import { HomePlaceholder } from './pages/HomePlaceholder';
 import { OnboardingPage } from './pages/OnboardingPage';
 import { PlaceholderPage } from './pages/PlaceholderPage';
+import { SettingsPage } from './pages/SettingsPage';
 import { PrivacyProvider } from './privacy/PrivacyContext';
 
 const DesignPage = lazy(() => import('./pages/DesignPage'));
@@ -123,12 +124,7 @@ const routes: RouteObject[] = [
         path: '/settings',
         element: (
           <AppShell>
-            <PlaceholderPage
-              title="Configurações"
-              icon="person"
-              emptyTitle="Sua conta e preferências"
-              description="Gerencie sua conta, sua privacidade visual e seus dados aqui."
-            />
+            <SettingsPage />
           </AppShell>
         ),
       },
diff --git a/app/src/auth/AuthProvider.tsx b/app/src/auth/AuthProvider.tsx
index 462ccda..464b301 100644
--- a/app/src/auth/AuthProvider.tsx
+++ b/app/src/auth/AuthProvider.tsx
@@ -1,7 +1,12 @@
 import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
 import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
 import { auth } from '../lib/firebase';
-import { ensureUserProfile, watchUserProfile, type UserProfile } from './userRepository';
+import {
+  completeOnboarding as persistOnboardingCompletion,
+  ensureUserProfile,
+  watchUserProfile,
+  type UserProfile,
+} from './userRepository';
 
 interface AuthState {
   user: User | null;
@@ -10,8 +15,17 @@ interface AuthState {
   error: string | null;
 }
 
+interface AuthContextValue extends AuthState {
+  completeOnboarding: () => Promise<void>;
+}
+
 const initialState: AuthState = { user: null, profile: null, loading: true, error: null };
-const AuthContext = createContext<AuthState>(initialState);
+const AuthContext = createContext<AuthContextValue>({
+  ...initialState,
+  completeOnboarding: async () => {
+    throw new Error('Authentication is still loading.');
+  },
+});
 
 // Shared by every subscriber (e.g. StrictMode double effects) so a first visit never creates two anonymous accounts.
 let pendingSignIn: Promise<unknown> | null = null;
@@ -49,13 +63,21 @@ export function AuthProvider({ children }: { children: ReactNode }) {
         if (!isCurrent()) return;
         // A transaction is server-confirmed; never release navigation from a cache-only snapshot.
         setState({ user, profile, loading: false, error: null });
-        stopProfile = watchUserProfile(
-          user.uid,
-          (profile) => {
-            if (isCurrent()) setState({ user, profile, loading: false, error: null });
-          },
-          fail,
-        );
+        // A permanent listener would keep every app route network-active forever (browser gates wait for
+        // network silence) and anonymous sessions already update their own flag locally. The live watch
+        // only matters while a converted account can still complete onboarding elsewhere; it stops as
+        // soon as that happens.
+        if (user.isAnonymous !== true && !profile.onboardingCompleted) {
+          stopProfile = watchUserProfile(
+            user.uid,
+            (profile) => {
+              if (!isCurrent()) return;
+              setState({ user, profile, loading: false, error: null });
+              if (profile.onboardingCompleted) stopProfile();
+            },
+            fail,
+          );
+        }
       }, fail);
     });
     return () => {
@@ -65,10 +87,21 @@ export function AuthProvider({ children }: { children: ReactNode }) {
     };
   }, []);
 
-  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
+  async function completeOnboarding(): Promise<void> {
+    const user = auth.currentUser;
+    if (!user) throw new Error('An authenticated user is required to complete onboarding.');
+    await persistOnboardingCompletion(user.uid);
+    setState((current) =>
+      current.user?.uid === user.uid && current.profile
+        ? { ...current, profile: { ...current.profile, onboardingCompleted: true } }
+        : current,
+    );
+  }
+
+  return <AuthContext.Provider value={{ ...state, completeOnboarding }}>{children}</AuthContext.Provider>;
 }
 
 // eslint-disable-next-line react-refresh/only-export-components
-export function useAuth(): AuthState {
+export function useAuth(): AuthContextValue {
   return useContext(AuthContext);
 }
diff --git a/app/src/auth/__tests__/AuthProvider.test.tsx b/app/src/auth/__tests__/AuthProvider.test.tsx
index d455fa4..5804e4f 100644
--- a/app/src/auth/__tests__/AuthProvider.test.tsx
+++ b/app/src/auth/__tests__/AuthProvider.test.tsx
@@ -5,7 +5,7 @@ import { beforeEach, describe, expect, it, vi } from 'vitest';
 const h = vi.hoisted(() => {
   type Listener = (user: { uid: string } | null) => void;
   const state = {
-    currentUser: null as { uid: string } | null,
+    currentUser: null as { uid: string; isAnonymous?: boolean } | null,
     listeners: [] as Listener[],
     docs: new Map<string, Record<string, unknown>>(),
     signInError: null as Error | null,
@@ -30,7 +30,15 @@ const h = vi.hoisted(() => {
   return { state, emit, notify, write };
 });
 
-vi.mock('../../lib/firebase', () => ({ auth: { __fake: 'auth' }, db: { __fake: 'db' } }));
+vi.mock('../../lib/firebase', () => ({
+  auth: {
+    __fake: 'auth',
+    get currentUser() {
+      return h.state.currentUser;
+    },
+  },
+  db: { __fake: 'db' },
+}));
 
 vi.mock('firebase/auth', () => ({
   onAuthStateChanged: (_auth: unknown, cb: (u: { uid: string } | null) => void) => {
@@ -84,13 +92,14 @@ vi.mock('firebase/firestore', () => {
 import { AuthProvider, useAuth } from '../AuthProvider';
 
 function Probe() {
-  const { user, profile, loading, error } = useAuth();
+  const { user, profile, loading, error, completeOnboarding } = useAuth();
   return (
     <div>
       <span data-testid="loading">{String(loading)}</span>
       <span data-testid="uid">{user?.uid ?? 'none'}</span>
       <span data-testid="onboarding">{String(profile?.onboardingCompleted ?? 'none')}</span>
       {error ? <p role="alert">{error}</p> : null}
+      <button onClick={() => void completeOnboarding()}>Concluir</button>
     </div>
   );
 }
@@ -199,6 +208,15 @@ describe('AuthProvider', () => {
     expect(text('onboarding')).toBe('false');
   });
 
+  it('updates the profile when onboarding is completed during the session', async () => {
+    h.state.currentUser = { uid: 'existing-uid' };
+    renderProvider();
+    await waitFor(() => expect(text('onboarding')).toBe('false'));
+    screen.getByRole('button', { name: 'Concluir' }).click();
+    await waitFor(() => expect(text('onboarding')).toBe('true'));
+    expect(h.state.docs.get('users/existing-uid')).toMatchObject({ onboardingCompleted: true });
+  });
+
   it('keeps the profile up to date when onboardingCompleted changes during the session', async () => {
     h.state.currentUser = { uid: 'existing-uid' };
     renderProvider();
@@ -207,6 +225,36 @@ describe('AuthProvider', () => {
     await waitFor(() => expect(text('onboarding')).toBe('true'));
   });
 
+  it('opens no persistent profile listener for an already completed account', async () => {
+    h.state.currentUser = { uid: 'existing-uid' };
+    h.state.docs.set('users/existing-uid', { onboardingCompleted: true });
+    renderProvider();
+    await waitFor(() => expect(text('onboarding')).toBe('true'));
+    expect(h.state.docListeners).toHaveLength(0);
+    act(() => h.write('users/existing-uid', { onboardingCompleted: false }));
+    expect(text('onboarding')).toBe('true');
+  });
+
+  it('stops the live profile listener once onboarding completes', async () => {
+    h.state.currentUser = { uid: 'existing-uid' };
+    renderProvider();
+    await waitFor(() => expect(text('onboarding')).toBe('false'));
+    expect(h.state.docListeners).toHaveLength(1);
+    act(() => h.write('users/existing-uid', { onboardingCompleted: true }));
+    await waitFor(() => expect(text('onboarding')).toBe('true'));
+    expect(h.state.docListeners).toHaveLength(0);
+  });
+
+  it('completes anonymous onboarding without opening a persistent profile listener', async () => {
+    h.state.currentUser = { uid: 'anon-user', isAnonymous: true };
+    renderProvider();
+    await waitFor(() => expect(text('onboarding')).toBe('false'));
+    expect(h.state.docListeners).toHaveLength(0);
+    screen.getByRole('button', { name: 'Concluir' }).click();
+    await waitFor(() => expect(text('onboarding')).toBe('true'));
+    expect(h.state.docListeners).toHaveLength(0);
+  });
+
   it('clears the previous user state while a new auth state loads', async () => {
     h.state.currentUser = { uid: 'user-a' };
     renderProvider();
diff --git a/app/src/auth/__tests__/linkAccount.test.ts b/app/src/auth/__tests__/linkAccount.test.ts
new file mode 100644
index 0000000..2ff27f4
--- /dev/null
+++ b/app/src/auth/__tests__/linkAccount.test.ts
@@ -0,0 +1,215 @@
+import { beforeEach, describe, expect, it, vi } from 'vitest';
+
+// Contract under test (src/auth/linkAccount.ts):
+//   linkWithGoogle(): Promise<LinkResult>
+//   sendEmailLink(email: string): Promise<void>            (remembers the typed e-mail in localStorage)
+//   completeEmailLink(href: string, typedEmail?: string): Promise<LinkResult | { status: 'not-a-link' | 'needs-email' }>
+//   signInToExistingAccount(conflict: LinkConflict): Promise<string>   (resolves with the new UID)
+//   LinkResult = { status: 'linked'; uid: string } | LinkConflict
+//   LinkConflict = { status: 'conflict'; reason: 'credential-already-in-use' | 'email-already-in-use'; credential: AuthCredential }
+
+const mocks = vi.hoisted(() => ({
+  currentUser: { uid: 'anon-uid-1' } as { uid: string } | null,
+  linkWithPopup: vi.fn(),
+  linkWithCredential: vi.fn(),
+  sendSignInLinkToEmail: vi.fn(),
+  isSignInWithEmailLink: vi.fn(),
+  signInWithCredential: vi.fn(),
+  signOut: vi.fn(),
+  unlink: vi.fn(),
+  deleteUser: vi.fn(),
+  credentialFromError: vi.fn(),
+  credentialWithLink: vi.fn(),
+}));
+
+vi.mock('../../lib/firebase', () => ({
+  auth: {
+    get currentUser() {
+      return mocks.currentUser;
+    },
+  },
+  db: {},
+}));
+
+vi.mock('firebase/auth', async (importOriginal) => {
+  const original = await importOriginal<typeof import('firebase/auth')>();
+  class GoogleAuthProvider {
+    static credentialFromError = mocks.credentialFromError;
+  }
+  return {
+    ...original,
+    GoogleAuthProvider,
+    EmailAuthProvider: { credentialWithLink: mocks.credentialWithLink },
+    linkWithPopup: mocks.linkWithPopup,
+    linkWithCredential: mocks.linkWithCredential,
+    sendSignInLinkToEmail: mocks.sendSignInLinkToEmail,
+    isSignInWithEmailLink: mocks.isSignInWithEmailLink,
+    signInWithCredential: mocks.signInWithCredential,
+    signOut: mocks.signOut,
+    unlink: mocks.unlink,
+    deleteUser: mocks.deleteUser,
+  };
+});
+
+import { completeEmailLink, linkWithGoogle, sendEmailLink, signInToExistingAccount } from '../linkAccount';
+
+const LINK_HREF = 'http://localhost/settings?apiKey=k&oobCode=abc&mode=signIn';
+const EMAIL_CREDENTIAL = { providerId: 'password', signInMethod: 'emailLink' };
+const GOOGLE_CREDENTIAL = { providerId: 'google.com' };
+
+function expectNothingDestructive() {
+  expect(mocks.signOut).not.toHaveBeenCalled();
+  expect(mocks.unlink).not.toHaveBeenCalled();
+  expect(mocks.deleteUser).not.toHaveBeenCalled();
+  expect(mocks.signInWithCredential).not.toHaveBeenCalled();
+}
+
+beforeEach(() => {
+  Object.values(mocks).forEach((value) => {
+    if (typeof value === 'function' && 'mockReset' in value) value.mockReset();
+  });
+  mocks.currentUser = { uid: 'anon-uid-1' };
+  mocks.credentialWithLink.mockReturnValue(EMAIL_CREDENTIAL);
+  mocks.isSignInWithEmailLink.mockReturnValue(true);
+  window.localStorage.clear();
+});
+
+describe('linkWithGoogle', () => {
+  it('links Google to the current anonymous user and keeps the same UID', async () => {
+    mocks.linkWithPopup.mockResolvedValue({ user: { uid: 'anon-uid-1' } });
+
+    const result = await linkWithGoogle();
+
+    expect(result).toEqual({ status: 'linked', uid: 'anon-uid-1' });
+    expect(mocks.linkWithPopup).toHaveBeenCalledTimes(1);
+    expect(mocks.linkWithPopup.mock.calls[0]?.[0]).toBe(mocks.currentUser);
+    expectNothingDestructive();
+  });
+
+  it('fails loudly if the UID changed after linking', async () => {
+    mocks.linkWithPopup.mockResolvedValue({ user: { uid: 'another-uid' } });
+
+    await expect(linkWithGoogle()).rejects.toThrow();
+  });
+
+  it('reports credential-already-in-use as a conflict without signing in, merging or deleting', async () => {
+    mocks.linkWithPopup.mockRejectedValue({ code: 'auth/credential-already-in-use' });
+    mocks.credentialFromError.mockReturnValue(GOOGLE_CREDENTIAL);
+
+    const result = await linkWithGoogle();
+
+    expect(result).toEqual({
+      status: 'conflict',
+      reason: 'credential-already-in-use',
+      credential: GOOGLE_CREDENTIAL,
+    });
+    expectNothingDestructive();
+  });
+
+  it('rethrows unrelated errors', async () => {
+    mocks.linkWithPopup.mockRejectedValue({ code: 'auth/network-request-failed' });
+
+    await expect(linkWithGoogle()).rejects.toMatchObject({ code: 'auth/network-request-failed' });
+  });
+
+  it('throws when there is no current user instead of creating a new one', async () => {
+    mocks.currentUser = null;
+
+    await expect(linkWithGoogle()).rejects.toThrow();
+    expect(mocks.linkWithPopup).not.toHaveBeenCalled();
+  });
+});
+
+describe('e-mail link', () => {
+  it('sends the sign-in link for the typed address, to be opened inside the app', async () => {
+    mocks.sendSignInLinkToEmail.mockResolvedValue(undefined);
+
+    await sendEmailLink('pessoa@example.com');
+
+    expect(mocks.sendSignInLinkToEmail).toHaveBeenCalledTimes(1);
+    const [, email, settings] = mocks.sendSignInLinkToEmail.mock.calls[0] ?? [];
+    expect(email).toBe('pessoa@example.com');
+    expect(settings).toMatchObject({ handleCodeInApp: true });
+    expect(String(settings.url)).toContain('/settings');
+  });
+
+  it('does not store anything if sending fails', async () => {
+    mocks.sendSignInLinkToEmail.mockRejectedValue({ code: 'auth/network-request-failed' });
+
+    await expect(sendEmailLink('pessoa@example.com')).rejects.toBeTruthy();
+    const result = await completeEmailLink(LINK_HREF);
+    expect(result).toEqual({ status: 'needs-email' });
+  });
+
+  it('completes the link with the e-mail remembered at send time and keeps the UID', async () => {
+    mocks.sendSignInLinkToEmail.mockResolvedValue(undefined);
+    mocks.linkWithCredential.mockResolvedValue({ user: { uid: 'anon-uid-1' } });
+
+    await sendEmailLink('pessoa@example.com');
+    const result = await completeEmailLink(LINK_HREF);
+
+    expect(result).toEqual({ status: 'linked', uid: 'anon-uid-1' });
+    expect(mocks.credentialWithLink).toHaveBeenCalledWith('pessoa@example.com', LINK_HREF);
+    expect(mocks.linkWithCredential).toHaveBeenCalledWith(mocks.currentUser, EMAIL_CREDENTIAL);
+    expectNothingDestructive();
+  });
+
+  it('asks for the e-mail when the link is opened where it was not requested', async () => {
+    const result = await completeEmailLink(LINK_HREF);
+
+    expect(result).toEqual({ status: 'needs-email' });
+    expect(mocks.linkWithCredential).not.toHaveBeenCalled();
+  });
+
+  it('uses the e-mail typed again on another device', async () => {
+    mocks.linkWithCredential.mockResolvedValue({ user: { uid: 'anon-uid-1' } });
+
+    const result = await completeEmailLink(LINK_HREF, 'outro@example.com');
+
+    expect(result).toEqual({ status: 'linked', uid: 'anon-uid-1' });
+    expect(mocks.credentialWithLink).toHaveBeenCalledWith('outro@example.com', LINK_HREF);
+  });
+
+  it('ignores URLs that are not sign-in links', async () => {
+    mocks.isSignInWithEmailLink.mockReturnValue(false);
+
+    const result = await completeEmailLink('http://localhost/settings');
+
+    expect(result).toEqual({ status: 'not-a-link' });
+    expect(mocks.linkWithCredential).not.toHaveBeenCalled();
+  });
+
+  it.each(['auth/email-already-in-use', 'auth/credential-already-in-use'] as const)(
+    'reports %s as a conflict carrying the credential, without side effects',
+    async (code) => {
+      mocks.linkWithCredential.mockRejectedValue({ code });
+
+      const result = await completeEmailLink(LINK_HREF, 'existente@example.com');
+
+      expect(result).toEqual({
+        status: 'conflict',
+        reason: code.replace('auth/', ''),
+        credential: EMAIL_CREDENTIAL,
+      });
+      expectNothingDestructive();
+    },
+  );
+});
+
+describe('signInToExistingAccount', () => {
+  it('signs in with the conflicting credential only when called explicitly, returning the existing UID', async () => {
+    mocks.signInWithCredential.mockResolvedValue({ user: { uid: 'existing-uid' } });
+
+    const uid = await signInToExistingAccount({
+      status: 'conflict',
+      reason: 'credential-already-in-use',
+      credential: GOOGLE_CREDENTIAL as never,
+    });
+
+    expect(uid).toBe('existing-uid');
+    expect(mocks.signInWithCredential).toHaveBeenCalledTimes(1);
+    expect(mocks.signInWithCredential.mock.calls[0]?.[1]).toBe(GOOGLE_CREDENTIAL);
+    expect(mocks.deleteUser).not.toHaveBeenCalled();
+    expect(mocks.unlink).not.toHaveBeenCalled();
+  });
+});
diff --git a/app/src/auth/linkAccount.ts b/app/src/auth/linkAccount.ts
new file mode 100644
index 0000000..e4d79b2
--- /dev/null
+++ b/app/src/auth/linkAccount.ts
@@ -0,0 +1,138 @@
+import {
+  EmailAuthProvider,
+  fetchSignInMethodsForEmail,
+  GoogleAuthProvider,
+  isSignInWithEmailLink,
+  linkWithCredential,
+  linkWithPopup,
+  sendSignInLinkToEmail,
+  signInWithCredential,
+  type AuthCredential,
+  type AuthError,
+  type User,
+} from 'firebase/auth';
+import { auth } from '../lib/firebase';
+
+const EMAIL_FOR_LINK_KEY = 'pulsar.emailForSignInLink';
+
+export type LinkConflictReason = 'credential-already-in-use' | 'email-already-in-use';
+
+export interface LinkConflict {
+  status: 'conflict';
+  reason: LinkConflictReason;
+  credential: AuthCredential;
+}
+
+export type LinkResult = { status: 'linked'; uid: string } | LinkConflict;
+export type EmailLinkResult = LinkResult | { status: 'not-a-link' } | { status: 'needs-email' };
+
+function requireCurrentUser(): User {
+  const user = auth.currentUser;
+  if (!user) throw new Error('An authenticated user is required before linking a credential.');
+  return user;
+}
+
+function assertSameUid(before: string, after: string): void {
+  if (before !== after || auth.currentUser?.uid !== before) {
+    throw new Error('The user UID changed while linking the account.');
+  }
+}
+
+function conflictFromError(error: unknown, credential: AuthCredential | null): LinkConflict | null {
+  const code = (error as { code?: string } | null)?.code;
+  if (code !== 'auth/credential-already-in-use' && code !== 'auth/email-already-in-use') return null;
+  if (!credential) throw error;
+  return {
+    status: 'conflict',
+    reason: code === 'auth/email-already-in-use' ? 'email-already-in-use' : 'credential-already-in-use',
+    credential,
+  };
+}
+
+/** Links Google to the current anonymous user; it never starts a separate sign-in. */
+export async function linkWithGoogle(): Promise<LinkResult> {
+  const user = requireCurrentUser();
+  const uidBefore = user.uid;
+  try {
+    const result = await linkWithPopup(user, new GoogleAuthProvider());
+    assertSameUid(uidBefore, result.user.uid);
+    return { status: 'linked', uid: result.user.uid };
+  } catch (error) {
+    const conflict = conflictFromError(error, GoogleAuthProvider.credentialFromError(error as AuthError));
+    if (conflict) return conflict;
+    throw error;
+  }
+}
+
+/** Sends an in-app link and durably associates the typed address with the pending request. */
+export async function sendEmailLink(email: string): Promise<void> {
+  const normalizedEmail = email.trim();
+  const previousEmail = window.localStorage.getItem(EMAIL_FOR_LINK_KEY);
+  // Keep the address before awaiting the request: the browser may open the emailed URL as soon as
+  // the emulator/mail provider receives it. Roll back the optimistic write if sending fails.
+  window.localStorage.setItem(EMAIL_FOR_LINK_KEY, normalizedEmail);
+  try {
+    await sendSignInLinkToEmail(auth, normalizedEmail, {
+      url: `${window.location.origin}/settings`,
+      handleCodeInApp: true,
+    });
+  } catch (error) {
+    if (previousEmail === null) window.localStorage.removeItem(EMAIL_FOR_LINK_KEY);
+    else window.localStorage.setItem(EMAIL_FOR_LINK_KEY, previousEmail);
+    throw error;
+  }
+}
+
+/** Completes the link against the current user, including when the address must be typed again. */
+async function completeEmailLinkOnce(href: string, typedEmail?: string): Promise<EmailLinkResult> {
+  if (!isSignInWithEmailLink(auth, href)) return { status: 'not-a-link' };
+
+  const email = typedEmail?.trim() || window.localStorage.getItem(EMAIL_FOR_LINK_KEY);
+  if (!email) return { status: 'needs-email' };
+
+  const user = requireCurrentUser();
+  const uidBefore = user.uid;
+  const credential = EmailAuthProvider.credentialWithLink(email, href);
+  try {
+    // The e-mail action code is single-use and a failed linkWithCredential can already consume it, which
+    // would make the later explicit sign-in fail. The person proved ownership of this inbox, so checking
+    // first is not an enumeration probe. Where the provider hides it (empty list) or the lookup fails,
+    // linkWithCredential still reports auth/email-already-in-use, handled below.
+    const methods = await fetchSignInMethodsForEmail(auth, email).catch(() => []);
+    if (methods.length > 0) {
+      window.localStorage.removeItem(EMAIL_FOR_LINK_KEY);
+      return { status: 'conflict', reason: 'email-already-in-use', credential };
+    }
+    const result = await linkWithCredential(user, credential);
+    assertSameUid(uidBefore, result.user.uid);
+    window.localStorage.removeItem(EMAIL_FOR_LINK_KEY);
+    return { status: 'linked', uid: result.user.uid };
+  } catch (error) {
+    const conflict = conflictFromError(error, credential);
+    if (conflict) {
+      window.localStorage.removeItem(EMAIL_FOR_LINK_KEY);
+      return conflict;
+    }
+    throw error;
+  }
+}
+
+const pendingEmailLinks = new Map<string, Promise<EmailLinkResult>>();
+
+// Email action codes are single-use. StrictMode and repeated renders must share one attempt rather
+// than consuming the same code twice (the second attempt would also lose the remembered address).
+export function completeEmailLink(href: string, typedEmail?: string): Promise<EmailLinkResult> {
+  const email = typedEmail?.trim() || window.localStorage.getItem(EMAIL_FOR_LINK_KEY) || '';
+  const key = `${href}\n${email}`;
+  const pending = pendingEmailLinks.get(key);
+  if (pending) return pending;
+  const attempt = completeEmailLinkOnce(href, typedEmail).finally(() => pendingEmailLinks.delete(key));
+  pendingEmailLinks.set(key, attempt);
+  return attempt;
+}
+
+/** The only function that may switch UIDs, called after the explicit conflict confirmation. */
+export async function signInToExistingAccount(conflict: LinkConflict): Promise<string> {
+  const result = await signInWithCredential(auth, conflict.credential);
+  return result.user.uid;
+}
diff --git a/app/src/design/Sheet.tsx b/app/src/design/Sheet.tsx
index b178772..127b460 100644
--- a/app/src/design/Sheet.tsx
+++ b/app/src/design/Sheet.tsx
@@ -21,7 +21,7 @@ export function Sheet({ open, onClose, title, description, children }: SheetProp
 
   if (!open) return null;
   return (
-    <div className="fixed inset-0 z-50 flex items-end justify-center">
+    <div className="fixed inset-0 z-[60] flex items-end justify-center">
       <div
         aria-hidden="true"
         onClick={onClose}
diff --git a/app/src/pages/OnboardingPage.tsx b/app/src/pages/OnboardingPage.tsx
index 3808dd2..c054a93 100644
--- a/app/src/pages/OnboardingPage.tsx
+++ b/app/src/pages/OnboardingPage.tsx
@@ -1,6 +1,5 @@
 import { useEffect, useRef, useState, type ReactNode } from 'react';
 import { useNavigate } from 'react-router';
-import { completeOnboarding } from '../auth/userRepository';
 import { useAuth } from '../auth/AuthProvider';
 import { Button, Card, Chip, EyeToggle, Icon, IndicatorLabel, type IconName } from '../design';
 
@@ -441,7 +440,7 @@ function Guarantee({
  * Finishing or skipping records onboardingCompleted=true and lands on the dashboard.
  */
 export function OnboardingPage() {
-  const { user } = useAuth();
+  const { user, completeOnboarding } = useAuth();
   const navigate = useNavigate();
   const [step, setStep] = useState(0);
   const [finishing, setFinishing] = useState(false);
@@ -459,7 +458,7 @@ export function OnboardingPage() {
     setFinishing(true);
     setError(null);
     try {
-      await completeOnboarding(user.uid);
+      await completeOnboarding();
       navigate('/dashboard', { replace: true });
     } catch {
       setError('Não foi possível concluir a introdução. Tente novamente.');
diff --git a/app/src/pages/SettingsPage.tsx b/app/src/pages/SettingsPage.tsx
new file mode 100644
index 0000000..fabec95
--- /dev/null
+++ b/app/src/pages/SettingsPage.tsx
@@ -0,0 +1,297 @@
+import { useEffect, useRef, useState, type FormEvent } from 'react';
+import { Link, useNavigate } from 'react-router';
+import { useAuth } from '../auth/AuthProvider';
+import {
+  completeEmailLink,
+  linkWithGoogle,
+  sendEmailLink,
+  signInToExistingAccount,
+  type LinkConflict,
+  type LinkResult,
+} from '../auth/linkAccount';
+import { auth } from '../lib/firebase';
+import { Button, Card, Icon, Sheet } from '../design';
+
+function actionError(error: unknown): string {
+  const code = (error as { code?: string } | null)?.code;
+  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
+    return 'A vinculação foi cancelada. Sua conta continua como estava.';
+  }
+  if (code === 'auth/invalid-email') return 'Digite um e-mail válido.';
+  if (code === 'auth/invalid-action-code') return 'Este link já foi usado ou expirou. Solicite um novo link.';
+  if (code === 'auth/network-request-failed') {
+    return 'Sem conexão com a internet. Verifique sua rede e tente novamente.';
+  }
+  return 'Não foi possível concluir a ação. Nenhum dado foi alterado. Tente novamente.';
+}
+
+function GoogleIcon() {
+  return (
+    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 shrink-0 fill-current">
+      <path d="M12.24 10.285V13.4h6.887C18.2 16.037 15.65 18 12.24 18c-3.61 0-6.54-2.93-6.54-6.54s2.93-6.54 6.54-6.54c1.65 0 3.16.61 4.33 1.62l2.35-2.35C17.15 2.57 14.86 1.8 12.24 1.8 6.54 1.8 2 6.34 2 12s4.54 10.2 10.24 10.2c5.96 0 9.87-4.19 9.87-10.05 0-.67-.06-1.32-.17-1.865H12.24z" />
+    </svg>
+  );
+}
+
+// Survives the AuthGate remount caused by the credential change while the action URL is still present.
+let completedActionLink: { href: string; result: LinkResult } | null = null;
+
+/** Settings > Account: converts the anonymous session without replacing its UID. */
+export function SettingsPage() {
+  const { user } = useAuth();
+  const navigate = useNavigate();
+  const [anonymous, setAnonymous] = useState(user?.isAnonymous ?? true);
+  const [linkedEmail, setLinkedEmail] = useState(user?.email ?? '');
+  const [showEmailForm, setShowEmailForm] = useState(false);
+  const [email, setEmail] = useState('');
+  const [busy, setBusy] = useState(false);
+  const [message, setMessage] = useState<string | null>(null);
+  const [error, setError] = useState<string | null>(null);
+  const [conflict, setConflict] = useState<LinkConflict | null>(null);
+  const [confirmExisting, setConfirmExisting] = useState(false);
+  const [needsEmailCompletion, setNeedsEmailCompletion] = useState(false);
+  const processedHref = useRef<string | null>(null);
+
+  function finishLink(result: LinkResult, completedWithEmail = false) {
+    if (result.status === 'conflict') {
+      setConflict(result);
+      setConfirmExisting(false);
+      return;
+    }
+    setAnonymous(false);
+    setLinkedEmail(auth.currentUser?.email ?? (completedWithEmail ? email : ''));
+    setShowEmailForm(false);
+    setNeedsEmailCompletion(false);
+    setMessage('Conta vinculada. Seus registros continuam no mesmo espaço.');
+    navigate('/settings', { replace: true });
+  }
+
+  useEffect(() => {
+    const href = window.location.href;
+    if (processedHref.current === href) return;
+    processedHref.current = href;
+    if (completedActionLink?.href === href) {
+      finishLink(completedActionLink.result, true);
+      return;
+    }
+
+    setBusy(true);
+    void completeEmailLink(href)
+      .then((result) => {
+        if (result.status === 'not-a-link') return;
+        if (result.status === 'needs-email') {
+          setShowEmailForm(true);
+          setNeedsEmailCompletion(true);
+          setMessage('Digite o e-mail que recebeu o link para concluir a vinculação.');
+          return;
+        }
+        completedActionLink = { href, result };
+        finishLink(result, true);
+      })
+      .catch((reason: unknown) => setError(actionError(reason)))
+      .finally(() => setBusy(false));
+    // The href guard makes link completion idempotent under React StrictMode.
+    // eslint-disable-next-line react-hooks/exhaustive-deps
+  }, []);
+
+  async function handleGoogle() {
+    if (busy) return;
+    setBusy(true);
+    setError(null);
+    setMessage(null);
+    try {
+      finishLink(await linkWithGoogle());
+    } catch (reason) {
+      setError(actionError(reason));
+    } finally {
+      setBusy(false);
+    }
+  }
+
+  async function handleEmail(event: FormEvent) {
+    event.preventDefault();
+    if (busy || !email.trim()) return;
+    setBusy(true);
+    setError(null);
+    setMessage(null);
+    try {
+      if (needsEmailCompletion) {
+        const result = await completeEmailLink(window.location.href, email);
+        if (result.status === 'linked' || result.status === 'conflict') finishLink(result, true);
+        else if (result.status === 'not-a-link') {
+          setNeedsEmailCompletion(false);
+          setError('Este link não é válido. Solicite um novo link por e-mail.');
+        } else setError('Digite o e-mail que recebeu o link para concluir a vinculação.');
+      } else {
+        await sendEmailLink(email);
+        setMessage('Link enviado. Abra a mensagem neste aparelho para concluir a vinculação.');
+      }
+    } catch (reason) {
+      setError(actionError(reason));
+    } finally {
+      setBusy(false);
+    }
+  }
+
+  function closeConflict() {
+    setConflict(null);
+    setConfirmExisting(false);
+    navigate('/settings', { replace: true });
+  }
+
+  async function enterExistingAccount() {
+    if (!conflict || busy) return;
+    setBusy(true);
+    setError(null);
+    // Remove the single-use action URL before AuthGate remounts this page for the new UID.
+    navigate('/settings', { replace: true });
+    try {
+      await signInToExistingAccount(conflict);
+    } catch (reason) {
+      setError(actionError(reason));
+      setBusy(false);
+    }
+  }
+
+  return (
+    <div className="flex w-full flex-col gap-space-lg pb-8">
+      <div className="flex flex-col gap-1">
+        <Link
+          to="/dashboard"
+          className="inline-flex min-h-11 w-fit items-center gap-1.5 py-1 font-label-md text-body-sm text-secondary transition-opacity active:opacity-70"
+        >
+          <Icon name="arrow_back" className="text-[18px]" />
+          Voltar ao Dashboard
+        </Link>
+        <div className="mt-1 flex items-center justify-between gap-space-md">
+          <div>
+            <h1 className="font-headline-lg-mobile text-headline-lg-mobile tracking-tight">Configurações</h1>
+            <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
+              Conta e segurança dos seus dados
+            </p>
+          </div>
+          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary shadow-sm">
+            <Icon name="person" className="text-[22px]" />
+          </span>
+        </div>
+      </div>
+
+      <Card data-testid="account-status" className="relative gap-space-md overflow-hidden p-space-lg">
+        <span className="pointer-events-none absolute -top-6 -right-6 size-24 rounded-full bg-error/5" />
+        <div className="flex items-center justify-between gap-space-sm">
+          <span
+            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-label-code text-label-code tracking-wider uppercase ${
+              anonymous
+                ? 'bg-error-container text-on-error-container'
+                : 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
+            }`}
+          >
+            <Icon name={anonymous ? 'no_accounts' : 'check_circle'} className="text-[14px]" />
+            {anonymous ? 'Conta anônima ativa' : 'Conta vinculada'}
+          </span>
+        </div>
+
+        {anonymous ? (
+          <>
+            <p className="rounded-2xl bg-surface-container-low p-3 font-body-sm text-body-sm leading-snug">
+              Se você perder a sessão, limpar o navegador ou trocar de aparelho sem vincular, pode perder o
+              acesso aos seus dados.
+            </p>
+            <div className="flex flex-col gap-2.5 pt-1">
+              <Button fullWidth onClick={handleGoogle} disabled={busy} className="gap-2.5">
+                <GoogleIcon />
+                Vincular com Google
+              </Button>
+              <Button
+                fullWidth
+                variant="neutral"
+                icon="input"
+                onClick={() => {
+                  setShowEmailForm((visible) => !visible);
+                  setError(null);
+                }}
+                disabled={busy}
+                className="bg-secondary-fixed text-on-secondary-fixed"
+              >
+                Enviar link mágico por e-mail
+              </Button>
+            </div>
+            {showEmailForm && (
+              <form onSubmit={handleEmail} className="flex flex-col gap-space-sm">
+                <label htmlFor="account-email" className="font-label-md text-label-md text-on-surface">
+                  E-mail
+                </label>
+                <input
+                  id="account-email"
+                  type="email"
+                  autoComplete="email"
+                  required
+                  value={email}
+                  onChange={(event) => setEmail(event.target.value)}
+                  placeholder="voce@exemplo.com"
+                  className="h-12 w-full rounded-full border border-outline-variant bg-surface-container-lowest px-4 font-body-lg text-body-lg text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary"
+                />
+                <Button type="submit" fullWidth disabled={busy || !email.trim()}>
+                  {needsEmailCompletion ? 'Concluir vinculação' : 'Enviar link'}
+                </Button>
+              </form>
+            )}
+            <p className="text-center font-body-sm text-[11px] leading-tight text-on-surface-variant">
+              Ao salvar sua conta, seus registros continuam atribuídos ao mesmo identificador.
+            </p>
+          </>
+        ) : (
+          <div className="rounded-2xl bg-surface-container-low p-3">
+            <p className="font-label-lg text-label-lg text-on-surface">Sua conta está protegida</p>
+            {linkedEmail && (
+              <p className="mt-1 font-body-md text-body-md break-all text-on-surface-variant">
+                {linkedEmail}
+              </p>
+            )}
+          </div>
+        )}
+      </Card>
+
+      {(message || error) && (
+        <p
+          role={error ? 'alert' : 'status'}
+          className={`rounded-2xl p-3 font-body-md text-body-md ${error ? 'bg-error-container text-on-error-container' : 'bg-tertiary-fixed text-on-tertiary-fixed-variant'}`}
+        >
+          {error ?? message}
+        </p>
+      )}
+
+      <Sheet
+        open={conflict !== null}
+        onClose={closeConflict}
+        title="Esta conta já existe"
+        description="A credencial informada já pertence a outra conta. Nada foi mesclado, substituído ou apagado."
+      >
+        <p className="rounded-2xl bg-surface-container-low p-3 font-body-md text-body-md text-on-surface">
+          Você pode cancelar e continuar nesta conta ou entrar na conta existente.
+        </p>
+        {confirmExisting ? (
+          <>
+            <p
+              role="alert"
+              className="rounded-2xl bg-error-container p-3 font-body-md text-body-md text-on-error-container"
+            >
+              Os dados desta sessão anônima ficarão inacessíveis neste navegador. Nada será apagado nem
+              mesclado.
+            </p>
+            <Button fullWidth onClick={enterExistingAccount} disabled={busy}>
+              Confirmar entrada na conta existente
+            </Button>
+          </>
+        ) : (
+          <Button fullWidth onClick={() => setConfirmExisting(true)} disabled={busy}>
+            Entrar na conta existente
+          </Button>
+        )}
+        <Button fullWidth variant="neutral" onClick={closeConflict} disabled={busy}>
+          Cancelar
+        </Button>
+      </Sheet>
+    </div>
+  );
+}
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
