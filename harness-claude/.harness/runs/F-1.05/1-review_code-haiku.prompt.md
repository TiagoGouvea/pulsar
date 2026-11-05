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
  "id": "F-1.05",
  "title": "Fixtures de e2e: usuário do seed e usuários novos",
  "description": "Em builds de emulador, expor um helper de teste (ex.: window.__pulsarTest.signInWithCustomToken) e fixtures Playwright em app/e2e/fixtures.ts: seedPage (entra como seed-user-0001 via custom token do Auth Emulator) e freshUserPage (novo anônimo por teste). Nunca incluído no build de produção.",
  "acceptance": [
    "Fixture seedPage abre o app autenticado como o usuário do seed",
    "Fixture freshUserPage cria um UID novo por teste",
    "Build de produção não contém o helper (verificado por busca no dist/)"
  ],
  "specRefs": [
    "spec.md#10",
    "arquitetura.md#12"
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
diff --git a/app/AGENTS.md b/app/AGENTS.md
index b02f23e..7161ee3 100644
--- a/app/AGENTS.md
+++ b/app/AGENTS.md
@@ -33,7 +33,8 @@ src/
   test/        setup do Vitest.
 scripts/       seed.ts (escreve no emulador) + seed-data.ts (dataset puro e testável).
 tests/rules/   testes de Security Rules (@firebase/rules-unit-testing).
-e2e/           Playwright: routes.json (rotas dos gates), support.ts, *.spec.ts.
+e2e/           Playwright: routes.json (rotas dos gates), support.ts, fixtures.ts (seedPage/freshUserPage),
+               *.spec.ts.
 functions/     (etapa 1+) Cloud Functions v2 em southamerica-east1.
 ```
 
@@ -51,6 +52,7 @@ functions/     (etapa 1+) Cloud Functions v2 em southamerica-east1.
 - Unitários (Vitest + Testing Library, jsdom): `src/**/__tests__/*.test.ts(x)` e `scripts/__tests__/`. Estatística exige testes de borda abaixo/igual/acima de cada limiar da spec 6.5.1.
 - Rules: `tests/rules/*.test.ts`, rodam dentro do emulador do Firestore.
 - E2E: `e2e/*.spec.ts`, projeto `mobile` (375×812) é o alvo; `desktop` (1280×800) só smoke de layout. Testes visuais marcados com `@visual` no título.
+- Fixtures de e2e: `e2e/fixtures.ts` expõe `seedPage` (entra como `seed-user-0001` por custom token do Auth Emulator) e `freshUserPage` (anônimo novo por teste). O app só expõe `window.__pulsarTest` em builds de dev/emulador (flag de build `__PULSAR_TEST_HELPER__`); o bundle de produção nunca o contém.
 - Sentinelas do seed (`ZQX_ENERGIA_7F3`, `ZQX_SONO_9K2`, `ZQX_FOCO_4M8`, `ZQX_OBS_NOTA_5T1`) nunca podem aparecer com o olho fechado fora de `[data-privacy-allow]`.
 - Usuário do seed: `seed-user-0001`; usuários novos são criados pelos próprios testes (anônimos no Auth Emulator).
 
diff --git a/app/e2e/fixtures.spec.ts b/app/e2e/fixtures.spec.ts
new file mode 100644
index 0000000..bc44c73
--- /dev/null
+++ b/app/e2e/fixtures.spec.ts
@@ -0,0 +1,76 @@
+import { execFileSync } from 'node:child_process';
+import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
+import { tmpdir } from 'node:os';
+import { join } from 'node:path';
+import { currentUid, expect, test } from './fixtures';
+
+const SEED_UID = 'seed-user-0001';
+const HELPER_NAME = '__pulsarTest';
+
+// Contract under test (implemented by F-1.05):
+// - `seedPage`: a Page already signed in as the seed user through an Auth Emulator custom token.
+// - `freshUserPage`: a Page with a brand-new anonymous user for each test.
+// - `currentUid(page)`: resolves the UID of the signed-in user of that page.
+// - `window.__pulsarTest` exists only in emulator builds.
+
+test.describe('e2e fixtures', () => {
+  test('seedPage opens the app authenticated as the seed user', async ({ seedPage }) => {
+    await seedPage.goto('/');
+    await expect.poll(() => currentUid(seedPage)).toBe(SEED_UID);
+    // The helper is exposed in emulator builds so fixtures can sign in.
+    expect(await seedPage.evaluate((name) => typeof (window as never)[name], HELPER_NAME)).toBe('object');
+  });
+
+  test('seedPage stays the same user after a reload', async ({ seedPage }) => {
+    await seedPage.goto('/');
+    await expect.poll(() => currentUid(seedPage)).toBe(SEED_UID);
+    await seedPage.reload();
+    await expect.poll(() => currentUid(seedPage)).toBe(SEED_UID);
+  });
+
+  test('freshUserPage creates a new anonymous UID', async ({ freshUserPage }) => {
+    await freshUserPage.goto('/');
+    await expect.poll(() => currentUid(freshUserPage)).toBeTruthy();
+    expect(await currentUid(freshUserPage)).not.toBe(SEED_UID);
+  });
+
+  test('a second fresh user never shares the UID of the first', async ({ browser, freshUserPage }) => {
+    await freshUserPage.goto('/');
+    await expect.poll(() => currentUid(freshUserPage)).toBeTruthy();
+    const first = await currentUid(freshUserPage);
+    const otherContext = await browser.newContext();
+    const other = await otherContext.newPage();
+    await other.goto('/');
+    await expect.poll(() => currentUid(other)).toBeTruthy();
+    expect(await currentUid(other)).not.toBe(first);
+    await otherContext.close();
+  });
+});
+
+test.describe('production build', () => {
+  test('dist contains no test helper', async () => {
+    test.setTimeout(240_000);
+    const outDir = mkdtempSync(join(tmpdir(), 'pulsar-prod-'));
+    try {
+      execFileSync('yarn', ['build', '--outDir', outDir, '--emptyOutDir'], {
+        cwd: process.cwd(),
+        env: { ...process.env, VITE_USE_EMULATORS: '' },
+        stdio: 'pipe',
+      });
+      expect(existsSync(join(outDir, 'index.html'))).toBe(true);
+      const hits: string[] = [];
+      const walk = (dir: string) => {
+        for (const entry of readdirSync(dir)) {
+          const path = join(dir, entry);
+          if (statSync(path).isDirectory()) walk(path);
+          else if (/\.(js|mjs|html|map)$/.test(entry) && readFileSync(path, 'utf8').includes(HELPER_NAME))
+            hits.push(path);
+        }
+      };
+      walk(outDir);
+      expect(hits).toEqual([]);
+    } finally {
+      rmSync(outDir, { recursive: true, force: true });
+    }
+  });
+});
diff --git a/app/e2e/fixtures.ts b/app/e2e/fixtures.ts
new file mode 100644
index 0000000..486dc4c
--- /dev/null
+++ b/app/e2e/fixtures.ts
@@ -0,0 +1,104 @@
+import { expect, test as base, type BrowserContextOptions, type Page, type TestInfo } from '@playwright/test';
+
+export { expect };
+
+/** UID of the seeded user (see scripts/seed-data.ts). */
+export const SEED_UID = 'seed-user-0001';
+
+const AUTH_PROJECT = 'demo-pulsar';
+const CUSTOM_TOKEN_AUDIENCE =
+  'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';
+
+export interface E2EFixtures {
+  /** App opened with the seeded user already signed in (custom token of the Auth Emulator). */
+  seedPage: Page;
+  /** App opened with a brand new anonymous user (one UID per test). */
+  freshUserPage: Page;
+}
+
+function base64url(value: string): string {
+  return Buffer.from(value, 'utf8').toString('base64url');
+}
+
+/**
+ * Custom token accepted by the Auth Emulator. The emulator does not validate the signature of a
+ * custom token (it only checks the payload), so an unsigned JWT is enough for the e2e suite.
+ */
+export function createCustomToken(uid: string, projectId = AUTH_PROJECT): string {
+  const issuedAt = Math.floor(Date.now() / 1000);
+  const header = base64url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
+  const payload = base64url(
+    JSON.stringify({
+      iss: `https://securetoken.google.com/${projectId}`,
+      sub: uid,
+      aud: CUSTOM_TOKEN_AUDIENCE,
+      iat: issuedAt,
+      exp: issuedAt + 3600,
+      uid,
+    }),
+  );
+  return `${header}.${payload}.`;
+}
+
+/** UID of the user signed in on the given page (null while there is no session). */
+export async function currentUid(page: Page): Promise<string | null> {
+  return page.evaluate(() => window.__pulsarTest?.currentUid() ?? null);
+}
+
+/** The test helper only exists in dev/emulator builds (never in a production bundle). */
+async function waitForTestHelper(page: Page): Promise<void> {
+  await page.waitForFunction(() => typeof window.__pulsarTest === 'object', undefined, {
+    timeout: 30_000,
+  });
+}
+
+/** Context options of the running project (viewport, locale, timezone...) for isolated contexts. */
+function contextOptions(testInfo: TestInfo): BrowserContextOptions {
+  const use = testInfo.project.use;
+  const options: BrowserContextOptions = {};
+  if (use.baseURL !== undefined) options.baseURL = use.baseURL;
+  if (use.locale !== undefined) options.locale = use.locale;
+  if (use.timezoneId !== undefined) options.timezoneId = use.timezoneId;
+  if (use.viewport !== undefined) options.viewport = use.viewport;
+  if (use.deviceScaleFactor !== undefined) options.deviceScaleFactor = use.deviceScaleFactor;
+  if (use.isMobile !== undefined) options.isMobile = use.isMobile;
+  if (use.hasTouch !== undefined) options.hasTouch = use.hasTouch;
+  return options;
+}
+
+export const test = base.extend<E2EFixtures>({
+  seedPage: async ({ browser }, use, testInfo) => {
+    const context = await browser.newContext(contextOptions(testInfo));
+    const page = await context.newPage();
+    try {
+      await page.goto('/');
+      await waitForTestHelper(page);
+      // The app signs in anonymously on the first visit: wait for that session to settle before
+      // replacing it, so the custom token sign-in is always the last one.
+      await expect.poll(() => currentUid(page), { timeout: 30_000 }).not.toBeNull();
+      await page.evaluate(async (token) => {
+        const helper = window.__pulsarTest;
+        if (!helper) throw new Error('window.__pulsarTest is not available');
+        await helper.signInWithCustomToken(token);
+      }, createCustomToken(SEED_UID));
+      await expect.poll(() => currentUid(page), { timeout: 30_000 }).toBe(SEED_UID);
+      await use(page);
+    } finally {
+      await context.close();
+    }
+  },
+
+  freshUserPage: async ({ browser }, use, testInfo) => {
+    const context = await browser.newContext(contextOptions(testInfo));
+    const page = await context.newPage();
+    try {
+      // Open the app once so the anonymous session of this test already exists.
+      await page.goto('/');
+      await waitForTestHelper(page);
+      await expect.poll(() => currentUid(page), { timeout: 30_000 }).not.toBeNull();
+      await use(page);
+    } finally {
+      await context.close();
+    }
+  },
+});
diff --git a/app/src/lib/__tests__/testHelper.test.ts b/app/src/lib/__tests__/testHelper.test.ts
new file mode 100644
index 0000000..b28f483
--- /dev/null
+++ b/app/src/lib/__tests__/testHelper.test.ts
@@ -0,0 +1,46 @@
+import { beforeEach, describe, expect, it, vi } from 'vitest';
+
+const h = vi.hoisted(() => ({
+  currentUser: null as { uid: string } | null,
+  signInCalls: [] as string[],
+}));
+
+vi.mock('../firebase', () => ({
+  auth: {
+    get currentUser() {
+      return h.currentUser;
+    },
+  },
+}));
+
+vi.mock('firebase/auth', () => ({
+  signInWithCustomToken: async (_auth: unknown, token: string) => {
+    h.signInCalls.push(token);
+    h.currentUser = { uid: 'seed-user-0001' };
+    return { user: h.currentUser };
+  },
+}));
+
+import { installTestHelper } from '../testHelper';
+
+beforeEach(() => {
+  h.currentUser = null;
+  h.signInCalls = [];
+  delete window.__pulsarTest;
+});
+
+describe('test helper', () => {
+  it('installs the helper on the window', () => {
+    installTestHelper();
+    expect(typeof window.__pulsarTest).toBe('object');
+    expect(window.__pulsarTest?.currentUid()).toBeNull();
+  });
+
+  it('signs in with a custom token and reports the signed-in uid', async () => {
+    installTestHelper();
+    const uid = await window.__pulsarTest?.signInWithCustomToken('custom-token');
+    expect(uid).toBe('seed-user-0001');
+    expect(h.signInCalls).toEqual(['custom-token']);
+    expect(window.__pulsarTest?.currentUid()).toBe('seed-user-0001');
+  });
+});
diff --git a/app/src/lib/testHelper.ts b/app/src/lib/testHelper.ts
new file mode 100644
index 0000000..6102fd7
--- /dev/null
+++ b/app/src/lib/testHelper.ts
@@ -0,0 +1,27 @@
+import { signInWithCustomToken } from 'firebase/auth';
+import { auth } from './firebase';
+
+export interface PulsarTestHelper {
+  /** Signs the browser session in with a custom token (Auth Emulator) and returns the UID. */
+  signInWithCustomToken: (customToken: string) => Promise<string>;
+  /** UID of the user signed in on this browser, or null when there is no session. */
+  currentUid: () => string | null;
+}
+
+declare global {
+  interface Window {
+    __pulsarTest?: PulsarTestHelper;
+  }
+}
+
+// Test-only bridge used by the e2e suite. This module is loaded by dev/emulator builds only
+// (the __PULSAR_TEST_HELPER__ build flag in vite.config.ts), so it never ships in a production bundle.
+export function installTestHelper(): void {
+  window.__pulsarTest = {
+    async signInWithCustomToken(customToken: string) {
+      const credential = await signInWithCustomToken(auth, customToken);
+      return credential.user.uid;
+    },
+    currentUid: () => auth.currentUser?.uid ?? null,
+  };
+}
diff --git a/app/src/main.tsx b/app/src/main.tsx
index c8a2e6b..eaea64a 100644
--- a/app/src/main.tsx
+++ b/app/src/main.tsx
@@ -3,6 +3,12 @@ import { createRoot } from 'react-dom/client';
 import './design/tokens.css';
 import { App } from './App';
 
+// Test-only bridge for the e2e suite. The flag is a build-time constant (vite.config.ts), so in a
+// production build the whole branch — and the `__pulsarTest` global — is removed from the bundle.
+if (__PULSAR_TEST_HELPER__) {
+  void import('./lib/testHelper').then((module) => module.installTestHelper());
+}
+
 createRoot(document.getElementById('root')!).render(
   <StrictMode>
     <App />
diff --git a/app/src/vite-env.d.ts b/app/src/vite-env.d.ts
index 23b6bc2..cce558f 100644
--- a/app/src/vite-env.d.ts
+++ b/app/src/vite-env.d.ts
@@ -14,3 +14,9 @@ interface ImportMetaEnv {
 interface ImportMeta {
   readonly env: ImportMetaEnv;
 }
+
+/**
+ * Build-time flag (see `define` in vite.config.ts): true only in dev/emulator builds.
+ * The e2e test helper is loaded exclusively when it is true, so a production bundle never has it.
+ */
+declare const __PULSAR_TEST_HELPER__: boolean;
diff --git a/app/vite.config.ts b/app/vite.config.ts
index ebb9af1..3304264 100644
--- a/app/vite.config.ts
+++ b/app/vite.config.ts
@@ -2,10 +2,17 @@ import { defineConfig } from 'vitest/config';
 import react from '@vitejs/plugin-react';
 import tailwindcss from '@tailwindcss/vite';
 
-export default defineConfig({
+export default defineConfig(({ mode }) => ({
   plugins: [react(), tailwindcss()],
   server: { port: 4791, strictPort: true },
   preview: { port: 4792, strictPort: true },
+  define: {
+    // Test-only bridge (src/lib/testHelper.ts): available in dev/emulator builds, never in production.
+    // Being a build-time constant, Rollup drops the whole branch (and the helper) from a prod build.
+    __PULSAR_TEST_HELPER__: JSON.stringify(
+      mode !== 'production' || process.env.VITE_USE_EMULATORS === 'true',
+    ),
+  },
   test: {
     environment: 'jsdom',
     globals: false,
@@ -19,4 +26,4 @@ export default defineConfig({
       exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'scripts/seed.ts'],
     },
   },
-});
+}));
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
