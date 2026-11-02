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
- [L-018] Decisão do humano: Onde fica o histórico de registros? → A partir do indicador em Meus indicadores, exclusão com confirmação — A partir do indicador em Meus indicadores, exclusão com confirmação (padrão)
- [L-019] Decisão do humano: Quais rotas usar? → /onboarding, /dashboard, /register, /indicators, /saved-insights, /insights/:hypothesisKey, /settings, /install — /onboarding, /dashboard, /register, /indicators, /saved-insights, /insights/:hypothesisKey, /settings, /install (padrão)
- [L-020] Decisão do humano: Como o layout se comporta no computador? → Coluna central até 960 px; listas de cartões em grid auto-fit (mín. 300 px) — Coluna central até 960 px; listas de cartões em grid auto-fit (mín. 300 px) (padrão)
- [L-021] Decisão do humano: Como resolver conflito de credencial na conversão? → Opções 'Cancelar' ou 'Entrar na conta existente' com aviso; nada é apagado nem mesclado — Opções 'Cancelar' ou 'Entrar na conta existente' com aviso; nada é apagado nem mesclado (padrão)
- [L-022] Decisão do humano: De onde servir ícones e fontes? → Material Symbols, Geist e Space Grotesk via pacotes npm, sem CDN — Material Symbols, Geist e Space Grotesk via pacotes npm, sem CDN (padrão)
- [L-023] Decisão do humano: Como identificar e autenticar o usuário do seed? → seed-user-0001 (seed@pulsar.test, sem senha), 30 dias terminando hoje, login e2e por custom token; --demo só com HARNESS_ALLOW_DEMO_SEED=1 e --project sem 'prod' — seed-user-0001 (seed@pulsar.test, sem senha), 30 dias terminando hoje, login e2e por custom token; --demo só com HARNESS_ALLOW_DEMO_SEED=1 e --project sem 'prod' (padrão)
- [L-024] Decisão do humano: Quais portas usar nos emuladores? → Firestore 8282, Auth 9299 (fonte única app/firebase.json) — Firestore 8282, Auth 9299 (fonte única app/firebase.json) (padrão)
- [L-010] Decisão do humano: Tendências podem ser geradas para Fatores? → Não; só Resultados numéricos/escala (spec 6.2 'Tendência de um resultado') — Não; só Resultados numéricos/escala (spec 6.2 'Tendência de um resultado') (padrão)
- [L-011] Decisão do humano: Como ordenar os cartões elegíveis? → Razão efeito/limiar desc, depois dias pareados desc, depois hypothesisKey asc — Razão efeito/limiar desc, depois dias pareados desc, depois hypothesisKey asc (padrão)


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
index 0000000..0c0001f
--- /dev/null
+++ b/app/e2e/anonymous-start.spec.ts
@@ -0,0 +1,115 @@
+import { expect, test, type Page } from '@playwright/test';
+import { hasHorizontalOverflow } from './support';
+
+const FIRESTORE = 'http://127.0.0.1:8282';
+const DOCS = `${FIRESTORE}/v1/projects/demo-pulsar/databases/(default)/documents`;
+const OWNER = { Authorization: 'Bearer owner' }; // bypasses Security Rules in the emulator
+
+// Reads the persisted Firebase Auth user (the SDK keeps it in IndexedDB) and returns its uid.
+async function currentUid(page: Page): Promise<string> {
+  return page.evaluate(
+    () =>
+      new Promise<string>((resolve, reject) => {
+        const open = indexedDB.open('firebaseLocalStorageDb');
+        open.onerror = () => reject(open.error);
+        open.onsuccess = () => {
+          const req = open.result
+            .transaction('firebaseLocalStorage')
+            .objectStore('firebaseLocalStorage')
+            .getAll();
+          req.onerror = () => reject(req.error);
+          req.onsuccess = () => {
+            const entry = (req.result as { fbase_key: string; value: { uid: string } }[]).find((e) =>
+              e.fbase_key.startsWith('firebase:authUser:'),
+            );
+            entry ? resolve(entry.value.uid) : reject(new Error('no persisted auth user'));
+          };
+        };
+      }),
+  );
+}
+
+async function fetchUserDoc(page: Page, uid: string) {
+  const res = await page.request.get(`${DOCS}/users/${uid}`, { headers: OWNER });
+  expect(res.status()).toBe(200);
+  return res.json() as Promise<{
+    fields: Record<string, { booleanValue?: boolean; timestampValue?: string }>;
+    createTime: string;
+    updateTime: string;
+  }>;
+}
+
+test.describe('anonymous start', () => {
+  test('first visit enters without sign-up, e-mail or login screen', async ({ page }, testInfo) => {
+    await page.goto('/');
+    await expect(page).toHaveURL(/\/onboarding$/);
+    await expect(page.locator('input[type="email"], input[type="password"], input[type="tel"]')).toHaveCount(
+      0,
+    );
+    await expect(page.getByText(/entrar|login|cadastr|senha|criar conta/i)).toHaveCount(0);
+    expect(await currentUid(page)).toBeTruthy();
+    if (testInfo.project.name === 'desktop') expect(await hasHorizontalOverflow(page)).toBe(false);
+  });
+
+  test('reloading keeps the same uid', async ({ page }) => {
+    await page.goto('/');
+    await expect(page).toHaveURL(/\/onboarding$/);
+    const uid = await currentUid(page);
+
+    await page.reload();
+    await expect(page).toHaveURL(/\/onboarding$/);
+    expect(await currentUid(page)).toBe(uid);
+  });
+
+  test('creates users/{uid} once with the defaults', async ({ page }) => {
+    await page.goto('/');
+    await expect(page).toHaveURL(/\/onboarding$/);
+    const uid = await currentUid(page);
+
+    await expect
+      .poll(async () => (await page.request.get(`${DOCS}/users/${uid}`, { headers: OWNER })).status())
+      .toBe(200);
+    const first = await fetchUserDoc(page, uid);
+    expect(first.fields.createdAt?.timestampValue).toBeTruthy();
+    expect(first.fields.onboardingCompleted?.booleanValue).toBe(false);
+    expect(first.fields.aiConsent?.booleanValue).toBe(false);
+    expect(first.fields.reminderEnabled?.booleanValue).toBe(false);
+
+    await page.reload();
+    await expect(page).toHaveURL(/\/onboarding$/);
+    const second = await fetchUserDoc(page, uid);
+    expect(second.createTime).toBe(first.createTime);
+    expect(second.updateTime).toBe(first.updateTime);
+    expect(second.fields.createdAt?.timestampValue).toBe(first.fields.createdAt?.timestampValue);
+  });
+
+  test('redirects to /dashboard once onboarding is completed', async ({ page }) => {
+    await page.goto('/');
+    await expect(page).toHaveURL(/\/onboarding$/);
+    const uid = await currentUid(page);
+    await expect
+      .poll(async () => (await page.request.get(`${DOCS}/users/${uid}`, { headers: OWNER })).status())
+      .toBe(200);
+
+    const patch = await page.request.patch(`${DOCS}/users/${uid}?updateMask.fieldPaths=onboardingCompleted`, {
+      headers: OWNER,
+      data: { fields: { onboardingCompleted: { booleanValue: true } } },
+    });
+    expect(patch.ok()).toBe(true);
+
+    await page.goto('/');
+    await expect(page).toHaveURL(/\/dashboard$/);
+    expect(await currentUid(page)).toBe(uid);
+  });
+
+  test('network error shows a pt-BR message and never indicates success', async ({ page }) => {
+    await page.route('**/accounts:signUp*', (route) => route.abort('connectionfailed'));
+    await page.goto('/');
+
+    const alert = page.getByRole('alert');
+    await expect(alert).toBeVisible();
+    await expect(alert).toContainText(/conex|rede|internet|tente novamente/i);
+    await expect(page).not.toHaveURL(/\/(onboarding|dashboard)$/);
+    await expect(page.getByText(/sucesso|bem-vind/i)).toHaveCount(0);
+  });
+});
diff --git a/app/e2e/routes.json b/app/e2e/routes.json
index 914b79c..82d8217 100644
--- a/app/e2e/routes.json
+++ b/app/e2e/routes.json
@@ -1,4 +1,22 @@
 [
-  { "path": "/", "name": "home", "tags": ["ui"] },
-  { "path": "/_design", "name": "design", "tags": ["ui"] }
+  {
+    "path": "/",
+    "name": "home",
+    "tags": ["ui"]
+  },
+  {
+    "path": "/_design",
+    "name": "design",
+    "tags": ["ui"]
+  },
+  {
+    "path": "/onboarding",
+    "name": "onboarding",
+    "tags": ["ui"]
+  },
+  {
+    "path": "/dashboard",
+    "name": "dashboard",
+    "tags": ["ui"]
+  }
 ]
diff --git a/app/eslint.config.js b/app/eslint.config.js
index 2733e00..178d565 100644
--- a/app/eslint.config.js
+++ b/app/eslint.config.js
@@ -30,4 +30,9 @@ export default tseslint.config(
     files: ['scripts/**/*.ts', 'e2e/**/*.ts', 'tests/**/*.ts'],
     rules: { 'no-console': 'off', 'react-hooks/rules-of-hooks': 'off' },
   },
+  {
+    // The protected e2e helper resolves a promise through a ternary inside page.evaluate.
+    files: ['e2e/**/*.spec.ts'],
+    rules: { '@typescript-eslint/no-unused-expressions': ['error', { allowTernary: true }] },
+  },
 );
diff --git a/app/scripts/icons.ts b/app/scripts/icons.ts
index 0d52372..3e56cb3 100644
--- a/app/scripts/icons.ts
+++ b/app/scripts/icons.ts
@@ -9,11 +9,17 @@ const names = [
   'add_circle',
   'analytics',
   'arrow_back',
+  'arrow_forward',
+  'bolt',
   'check_circle',
   'close',
   'input',
   'insights',
+  'lock',
+  'psychology',
   'remove',
+  'science',
+  'tune',
   'visibility',
   'visibility_off',
 ];
diff --git a/app/src/App.tsx b/app/src/App.tsx
index 3de0f57..73ef533 100644
--- a/app/src/App.tsx
+++ b/app/src/App.tsx
@@ -1,13 +1,59 @@
 import { lazy, Suspense } from 'react';
-import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router';
+import { createBrowserRouter, Navigate, RouterProvider, type RouteObject } from 'react-router';
+import { AuthProvider, useAuth } from './auth/AuthProvider';
 import { emulatorsEnabled } from './lib/env';
-import { HomePlaceholder } from './pages/HomePlaceholder';
+import { DashboardPage } from './pages/DashboardPage';
+import { OnboardingPage } from './pages/OnboardingPage';
 import { PrivacyProvider } from './privacy/PrivacyContext';
 
 const DesignPage = lazy(() => import('./pages/DesignPage'));
 
+function LoadingScreen() {
+  return (
+    <main className="flex min-h-dvh w-full flex-col items-center justify-center gap-space-sm px-gutter text-center">
+      <span className="size-3 rounded-full bg-primary" aria-hidden="true" />
+      <p role="status" className="font-body-md text-body-md text-on-surface-variant">
+        Preparando seu laboratório…
+      </p>
+    </main>
+  );
+}
+
+function AuthErrorScreen({ message }: { message: string }) {
+  return (
+    <main className="mx-auto flex min-h-dvh w-full max-w-(--container-app) flex-col justify-center gap-space-md px-gutter">
+      <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
+        Não foi possível abrir o Pulsar
+      </h1>
+      <p role="alert" className="font-body-md text-body-md text-error">
+        {message}
+      </p>
+      <button
+        type="button"
+        className="h-12 rounded-full bg-primary-container px-5 font-label-lg text-label-lg text-on-primary"
+        onClick={() => window.location.reload()}
+      >
+        Tentar novamente
+      </button>
+    </main>
+  );
+}
+
+// `/` waits for both the anonymous session and users/{uid} before choosing the first screen.
+function RootRoute() {
+  const { user, loading, error, onboardingCompleted } = useAuth();
+
+  if (loading) return <LoadingScreen />;
+  if (error) return <AuthErrorScreen message={error} />;
+  if (!user) return <LoadingScreen />;
+
+  return <Navigate to={onboardingCompleted ? '/dashboard' : '/onboarding'} replace />;
+}
+
 const routes: RouteObject[] = [
-  { path: '/', element: <HomePlaceholder /> },
+  { path: '/', element: <RootRoute /> },
+  { path: '/onboarding', element: <OnboardingPage /> },
+  { path: '/dashboard', element: <DashboardPage /> },
   ...(emulatorsEnabled
     ? [
         {
@@ -26,8 +72,10 @@ const router = createBrowserRouter(routes);
 
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
index 0000000..c94a974
--- /dev/null
+++ b/app/src/auth/AuthProvider.tsx
@@ -0,0 +1,112 @@
+import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
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
+import { auth } from '../lib/firebase';
+import { authErrorMessage, userDocumentErrorMessage } from './errors';
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
+/**
+ * Boots the anonymous session on the first visit, restores it on reloads (Firebase persistence) and
+ * keeps users/{uid} in sync. `loading` stays true until both the session and its profile are ready.
+ */
+export function AuthProvider({ children }: { children: ReactNode }) {
+  const [user, setUser] = useState<User | null>(null);
+  const [loading, setLoading] = useState(true);
+  const [error, setError] = useState<string | null>(null);
+  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
+
+  // Shared across StrictMode re-mounts of the same provider instance: one sign-in and one document check.
+  const signInPromise = useRef<Promise<unknown> | null>(null);
+  const userDocumentPromise = useRef<{ uid: string; promise: Promise<boolean> } | null>(null);
+
+  useEffect(() => {
+    let cancelled = false;
+
+    const unsubscribe = onAuthStateChanged(
+      auth,
+      (firebaseUser) => {
+        if (cancelled) return;
+
+        if (!firebaseUser) {
+          signInPromise.current ??= signInAnonymously(auth);
+          signInPromise.current.catch((failure: unknown) => {
+            if (cancelled) return;
+            setError(authErrorMessage(failure));
+            setLoading(false);
+          });
+          return;
+        }
+
+        setUser(firebaseUser);
+        setError(null);
+
+        if (userDocumentPromise.current?.uid !== firebaseUser.uid) {
+          userDocumentPromise.current = {
+            uid: firebaseUser.uid,
+            promise: ensureUserDocument(firebaseUser.uid),
+          };
+        }
+
+        userDocumentPromise.current.promise
+          .then((completed) => {
+            if (cancelled) return;
+            setOnboardingCompleted(completed);
+            setLoading(false);
+          })
+          .catch(() => {
+            if (cancelled) return;
+            setError(userDocumentErrorMessage());
+            setLoading(false);
+          });
+      },
+      (authError) => {
+        if (cancelled) return;
+        setError(authErrorMessage(authError));
+        setLoading(false);
+      },
+    );
+
+    return () => {
+      cancelled = true;
+      unsubscribe();
+    };
+  }, []);
+
+  const completeOnboarding = useCallback(async () => {
+    if (!user) throw new Error('auth/no-user');
+    await markOnboardingCompleted(user.uid);
+    setOnboardingCompleted(true);
+  }, [user]);
+
+  const value = useMemo<AuthState>(
+    () => ({ user, loading, error, onboardingCompleted, completeOnboarding }),
+    [user, loading, error, onboardingCompleted, completeOnboarding],
+  );
+
+  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
+}
+
+// eslint-disable-next-line react-refresh/only-export-components
+export function useAuth(): AuthState {
+  const context = useContext(AuthContext);
+  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
+  return context;
+}
diff --git a/app/src/auth/__tests__/AuthProvider.test.tsx b/app/src/auth/__tests__/AuthProvider.test.tsx
new file mode 100644
index 0000000..6a6f43a
--- /dev/null
+++ b/app/src/auth/__tests__/AuthProvider.test.tsx
@@ -0,0 +1,168 @@
+import { render, screen, waitFor } from '@testing-library/react';
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
+import { AuthProvider, useAuth } from '../AuthProvider';
+
+// In-memory fakes of the Firebase SDK: a persisted auth session and a Firestore document store.
+const fake = vi.hoisted(() => {
+  const TS = { __serverTimestamp: true };
+  const state = {
+    sessionUid: null as string | null,
+    nextUid: 'anon-1',
+    signInError: null as { code: string } | null,
+    signInCalls: 0,
+    docs: new Map<string, Record<string, unknown>>(),
+    writes: [] as string[],
+  };
+  const listeners = new Set<(u: { uid: string; isAnonymous: boolean } | null) => void>();
+  const current = () => (state.sessionUid ? { uid: state.sessionUid, isAnonymous: true } : null);
+  const snap = (path: string) => ({
+    exists: () => state.docs.has(path),
+    data: () => state.docs.get(path),
+  });
+  const write = (path: string, data: Record<string, unknown>, merge?: boolean) => {
+    state.writes.push(path);
+    state.docs.set(path, merge ? { ...state.docs.get(path), ...data } : data);
+  };
+  return { TS, state, listeners, current, snap, write };
+});
+
+vi.mock('../../lib/firebase', () => ({ auth: {}, db: {} }));
+
+vi.mock('firebase/auth', () => ({
+  onAuthStateChanged: (_auth: unknown, cb: (u: unknown) => void) => {
+    fake.listeners.add(cb);
+    queueMicrotask(() => cb(fake.current()));
+    return () => fake.listeners.delete(cb);
+  },
+  signInAnonymously: async () => {
+    fake.state.signInCalls += 1;
+    if (fake.state.signInError) throw Object.assign(new Error('boom'), fake.state.signInError);
+    fake.state.sessionUid = fake.state.nextUid;
+    const user = fake.current();
+    fake.listeners.forEach((cb) => cb(user));
+    return { user };
+  },
+}));
+
+vi.mock('firebase/firestore', () => ({
+  serverTimestamp: () => fake.TS,
+  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
+  getDoc: async (ref: { path: string }) => fake.snap(ref.path),
+  setDoc: async (ref: { path: string }, data: Record<string, unknown>, opts?: { merge?: boolean }) =>
+    fake.write(ref.path, data, opts?.merge),
+  runTransaction: async (
+    _db: unknown,
+    fn: (tx: {
+      get: (r: { path: string }) => Promise<ReturnType<typeof fake.snap>>;
+      set: (r: { path: string }, d: Record<string, unknown>) => void;
+    }) => Promise<unknown>,
+  ) =>
+    fn({
+      get: async (ref) => fake.snap(ref.path),
+      set: (ref, data) => fake.write(ref.path, data),
+    }),
+}));
+
+function Probe() {
+  const { user, loading, error } = useAuth();
+  return (
+    <div>
+      <span data-testid="loading">{String(loading)}</span>
+      <span data-testid="uid">{user?.uid ?? ''}</span>
+      <span data-testid="error">{error ? String(error) : ''}</span>
+    </div>
+  );
+}
+
+const mount = () =>
+  render(
+    <AuthProvider>
+      <Probe />
+    </AuthProvider>,
+  );
+
+const waitReady = () => waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
+
+beforeEach(() => {
+  fake.state.sessionUid = null;
+  fake.state.nextUid = 'anon-1';
+  fake.state.signInError = null;
+  fake.state.signInCalls = 0;
+  fake.state.docs.clear();
+  fake.state.writes = [];
+  fake.listeners.clear();
+});
+
+afterEach(() => vi.restoreAllMocks());
+
+describe('AuthProvider', () => {
+  it('exposes a loading state until the anonymous session is ready', async () => {
+    mount();
+    expect(screen.getByTestId('loading').textContent).toBe('true');
+    await waitReady();
+    expect(screen.getByTestId('uid').textContent).toBe('anon-1');
+  });
+
+  it('signs in anonymously on the first visit', async () => {
+    mount();
+    await waitReady();
+    expect(fake.state.signInCalls).toBe(1);
+    expect(screen.getByTestId('error').textContent).toBe('');
+  });
+
+  it('keeps an existing session without signing in again', async () => {
+    fake.state.sessionUid = 'existing-uid';
+    mount();
+    await waitReady();
+    expect(screen.getByTestId('uid').textContent).toBe('existing-uid');
+    expect(fake.state.signInCalls).toBe(0);
+  });
+
+  it('creates users/{uid} with the defaults', async () => {
+    mount();
+    await waitReady();
+    await waitFor(() => expect(fake.state.docs.has('users/anon-1')).toBe(true));
+    expect(fake.state.docs.get('users/anon-1')).toEqual({
+      createdAt: fake.TS,
+      onboardingCompleted: false,
+      aiConsent: false,
+      reminderEnabled: false,
+    });
+  });
+
+  it('does not overwrite an existing users/{uid} document', async () => {
+    fake.state.sessionUid = 'existing-uid';
+    const existing = {
+      createdAt: 'original',
+      onboardingCompleted: true,
+      aiConsent: true,
+      reminderEnabled: true,
+    };
+    fake.state.docs.set('users/existing-uid', { ...existing });
+    mount();
+    await waitReady();
+    expect(fake.state.docs.get('users/existing-uid')).toEqual(existing);
+    expect(fake.state.writes).toHaveLength(0);
+  });
+
+  it('creates the user document only once across remounts', async () => {
+    const first = mount();
+    await waitReady();
+    await waitFor(() => expect(fake.state.docs.has('users/anon-1')).toBe(true));
+    first.unmount();
+
+    mount();
+    await waitReady();
+    expect(fake.state.writes.filter((p) => p === 'users/anon-1')).toHaveLength(1);
+    expect(fake.state.signInCalls).toBe(1);
+  });
+
+  it('reports a pt-BR error on network failure, with no user and no document', async () => {
+    fake.state.signInError = { code: 'auth/network-request-failed' };
+    mount();
+    await waitReady();
+    expect(screen.getByTestId('error').textContent).toMatch(/conex|rede|internet/i);
+    expect(screen.getByTestId('uid').textContent).toBe('');
+    expect(fake.state.docs.size).toBe(0);
+  });
+});
diff --git a/app/src/auth/errors.ts b/app/src/auth/errors.ts
new file mode 100644
index 0000000..fce2c2a
--- /dev/null
+++ b/app/src/auth/errors.ts
@@ -0,0 +1,12 @@
+// Firebase auth errors are mapped to short pt-BR messages; the UI never shows a raw SDK code.
+export function authErrorMessage(error: unknown): string {
+  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
+  if (code === 'auth/network-request-failed') {
+    return 'Sem conexão com a internet. Verifique sua rede e tente novamente.';
+  }
+  return 'Não foi possível preparar sua sessão. Verifique sua conexão e tente novamente.';
+}
+
+export function userDocumentErrorMessage(): string {
+  return 'Não foi possível preparar sua conta agora. Verifique sua conexão e tente novamente.';
+}
diff --git a/app/src/auth/userRepository.ts b/app/src/auth/userRepository.ts
new file mode 100644
index 0000000..f645f49
--- /dev/null
+++ b/app/src/auth/userRepository.ts
@@ -0,0 +1,33 @@
+import { doc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
+import { db } from '../lib/firebase';
+
+export interface UserDocument {
+  onboardingCompleted: boolean;
+}
+
+/**
+ * Ensures users/{uid} exists with the documented defaults (arquitetura 3.1) and returns whether the
+ * tutorial is already done. A transaction makes the first-write win, so a second tab or a remount
+ * never overwrites an existing document (or its createdAt).
+ */
+export async function ensureUserDocument(uid: string): Promise<boolean> {
+  const ref = doc(db, 'users', uid);
+  return runTransaction(db, async (transaction) => {
+    const snapshot = await transaction.get(ref);
+    if (snapshot.exists()) {
+      const data = snapshot.data() as { onboardingCompleted?: unknown } | undefined;
+      return data?.onboardingCompleted === true;
+    }
+    transaction.set(ref, {
+      createdAt: serverTimestamp(),
+      onboardingCompleted: false,
+      aiConsent: false,
+      reminderEnabled: false,
+    });
+    return false;
+  });
+}
+
+export async function markOnboardingCompleted(uid: string): Promise<void> {
+  await setDoc(doc(db, 'users', uid), { onboardingCompleted: true }, { merge: true });
+}
diff --git a/app/src/design/icons.ts b/app/src/design/icons.ts
index 0fb9d11..6c9ae0c 100644
--- a/app/src/design/icons.ts
+++ b/app/src/design/icons.ts
@@ -6,6 +6,8 @@ export const iconPaths = {
   analytics:
     'M280 -280L360 -280L360 -480L280 -480ZM600 -280L680 -280L680 -680L600 -680ZM440 -280L520 -280L520 -400L440 -400ZM440 -480L520 -480L520 -560L440 -560ZM200 -120Q167 -120 143.5 -143.5Q120 -167 120 -200L120 -760Q120 -793 143.5 -816.5Q167 -840 200 -840L760 -840Q793 -840 816.5 -816.5Q840 -793 840 -760L840 -200Q840 -167 816.5 -143.5Q793 -120 760 -120ZM200 -200L760 -200Q760 -200 760 -200Q760 -200 760 -200L760 -760Q760 -760 760 -760Q760 -760 760 -760L200 -760Q200 -760 200 -760Q200 -760 200 -760L200 -200Q200 -200 200 -200Q200 -200 200 -200ZM200 -760L200 -760Q200 -760 200 -760Q200 -760 200 -760L200 -200Q200 -200 200 -200Q200 -200 200 -200L200 -200Q200 -200 200 -200Q200 -200 200 -200L200 -760Q200 -760 200 -760Q200 -760 200 -760Z',
   arrow_back: 'M313 -440L537 -216L480 -160L160 -480L480 -800L537 -744L313 -520L800 -520L800 -440Z',
+  arrow_forward: 'M647 -440L160 -440L160 -520L647 -520L423 -744L480 -800L800 -480L480 -160L423 -216Z',
+  bolt: 'M422 -232L629 -480L469 -480L498 -707L313 -440L452 -440ZM320 -80L360 -360L160 -360L520 -880L600 -880L560 -560L800 -560L400 -80ZM471 -470L471 -470L471 -470L471 -470L471 -470L471 -470Z',
   check_circle:
     'M424 -296L706 -578L650 -634L424 -408L310 -522L254 -466ZM480 -80Q397 -80 324 -111.5Q251 -143 197 -197Q143 -251 111.5 -324Q80 -397 80 -480Q80 -563 111.5 -636Q143 -709 197 -763Q251 -817 324 -848.5Q397 -880 480 -880Q563 -880 636 -848.5Q709 -817 763 -763Q817 -709 848.5 -636Q880 -563 880 -480Q880 -397 848.5 -324Q817 -251 763 -197Q709 -143 636 -111.5Q563 -80 480 -80ZM480 -160Q614 -160 707 -253Q800 -346 800 -480Q800 -614 707 -707Q614 -800 480 -800Q346 -800 253 -707Q160 -614 160 -480Q160 -346 253 -253Q346 -160 480 -160ZM480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Z',
   close:
@@ -14,7 +16,13 @@ export const iconPaths = {
     'M160 -160Q127 -160 103.5 -183.5Q80 -207 80 -240L80 -360L160 -360L160 -240Q160 -240 160 -240Q160 -240 160 -240L800 -240Q800 -240 800 -240Q800 -240 800 -240L800 -720Q800 -720 800 -720Q800 -720 800 -720L160 -720Q160 -720 160 -720Q160 -720 160 -720L160 -600L80 -600L80 -720Q80 -753 103.5 -776.5Q127 -800 160 -800L800 -800Q833 -800 856.5 -776.5Q880 -753 880 -720L880 -240Q880 -207 856.5 -183.5Q833 -160 800 -160ZM460 -300L404 -358L487 -440L80 -440L80 -520L487 -520L404 -602L460 -660L640 -480Z',
   insights:
     'M120 -160Q87 -160 63.5 -183.5Q40 -207 40 -240Q40 -273 63.5 -296.5Q87 -320 120 -320Q126 -320 130.5 -320Q135 -320 140 -318L322 -500Q320 -505 320 -509.5Q320 -514 320 -520Q320 -553 343.5 -576.5Q367 -600 400 -600Q433 -600 456.5 -576.5Q480 -553 480 -520Q480 -518 478 -500L580 -398Q585 -400 589.5 -400Q594 -400 600 -400Q606 -400 610.5 -400Q615 -400 620 -398L762 -540Q760 -545 760 -549.5Q760 -554 760 -560Q760 -593 783.5 -616.5Q807 -640 840 -640Q873 -640 896.5 -616.5Q920 -593 920 -560Q920 -527 896.5 -503.5Q873 -480 840 -480Q834 -480 829.5 -480Q825 -480 820 -482L678 -340Q680 -335 680 -330.5Q680 -326 680 -320Q680 -287 656.5 -263.5Q633 -240 600 -240Q567 -240 543.5 -263.5Q520 -287 520 -320Q520 -326 520 -330.5Q520 -335 522 -340L420 -442Q415 -440 410.5 -440Q406 -440 400 -440Q398 -440 380 -442L198 -260Q200 -255 200 -250.5Q200 -246 200 -240Q200 -207 176.5 -183.5Q153 -160 120 -160ZM160 -561L135 -615L81 -640L135 -665L160 -719L185 -665L239 -640L185 -615ZM600 -600L562 -682L480 -720L562 -758L600 -840L638 -758L720 -720L638 -682Z',
+  lock: 'M240 -80Q207 -80 183.5 -103.5Q160 -127 160 -160L160 -560Q160 -593 183.5 -616.5Q207 -640 240 -640L280 -640L280 -720Q280 -803 338.5 -861.5Q397 -920 480 -920Q563 -920 621.5 -861.5Q680 -803 680 -720L680 -640L720 -640Q753 -640 776.5 -616.5Q800 -593 800 -560L800 -160Q800 -127 776.5 -103.5Q753 -80 720 -80ZM240 -160L720 -160Q720 -160 720 -160Q720 -160 720 -160L720 -560Q720 -560 720 -560Q720 -560 720 -560L240 -560Q240 -560 240 -560Q240 -560 240 -560L240 -160Q240 -160 240 -160Q240 -160 240 -160ZM480 -280Q513 -280 536.5 -303.5Q560 -327 560 -360Q560 -393 536.5 -416.5Q513 -440 480 -440Q447 -440 423.5 -416.5Q400 -393 400 -360Q400 -327 423.5 -303.5Q447 -280 480 -280ZM360 -640L600 -640L600 -720Q600 -770 565 -805Q530 -840 480 -840Q430 -840 395 -805Q360 -770 360 -720ZM240 -160Q240 -160 240 -160Q240 -160 240 -160L240 -560Q240 -560 240 -560Q240 -560 240 -560L240 -560Q240 -560 240 -560Q240 -560 240 -560L240 -160Q240 -160 240 -160Q240 -160 240 -160Z',
+  psychology:
+    'M240 -80L240 -252Q183 -304 151.5 -373.5Q120 -443 120 -520Q120 -670 225 -775Q330 -880 480 -880Q605 -880 701.5 -806.5Q798 -733 827 -615L879 -410Q884 -391 872 -375.5Q860 -360 840 -360L760 -360L760 -240Q760 -207 736.5 -183.5Q713 -160 680 -160L600 -160L600 -80L520 -80L520 -240L680 -240Q680 -240 680 -240Q680 -240 680 -240L680 -440L788 -440L750 -595Q727 -686 652 -743Q577 -800 480 -800Q364 -800 282 -719Q200 -638 200 -522Q200 -462 224.5 -408Q249 -354 294 -312L320 -288L320 -80ZM494 -440L494 -440L494 -440Q494 -440 494 -440Q494 -440 494 -440Q494 -440 494 -440Q494 -440 494 -440Q494 -440 494 -440Q494 -440 494 -440L494 -440L494 -440L494 -440Q494 -440 494 -440Q494 -440 494 -440L494 -440L494 -440ZM440 -360L520 -360L526 -410Q534 -413 540.5 -417Q547 -421 552 -426L598 -406L638 -474L598 -504Q600 -512 600 -520Q600 -528 598 -536L638 -566L598 -634L552 -614Q547 -619 540.5 -623Q534 -627 526 -630L520 -680L440 -680L434 -630Q426 -627 419.5 -623Q413 -619 408 -614L362 -634L322 -566L362 -536Q360 -528 360 -520Q360 -512 362 -504L322 -474L362 -406L408 -426Q413 -421 419.5 -417Q426 -413 434 -410ZM480 -460Q455 -460 437.5 -477.5Q420 -495 420 -520Q420 -545 437.5 -562.5Q455 -580 480 -580Q505 -580 522.5 -562.5Q540 -545 540 -520Q540 -495 522.5 -477.5Q505 -460 480 -460Z',
   remove: 'M200 -440L200 -520L760 -520L760 -440Z',
+  science:
+    'M200 -120Q149 -120 127.5 -165.5Q106 -211 138 -250L360 -520L360 -760L320 -760Q303 -760 291.5 -771.5Q280 -783 280 -800Q280 -817 291.5 -828.5Q303 -840 320 -840L640 -840Q657 -840 668.5 -828.5Q680 -817 680 -800Q680 -783 668.5 -771.5Q657 -760 640 -760L600 -760L600 -520L822 -250Q854 -211 832.5 -165.5Q811 -120 760 -120ZM200 -200L760 -200L520 -492L520 -760L440 -760L440 -492ZM480 -480L480 -480L480 -480L480 -480L480 -480L480 -480Z',
+  tune: 'M440 -120L440 -360L520 -360L520 -280L840 -280L840 -200L520 -200L520 -120ZM120 -200L120 -280L360 -280L360 -200ZM280 -360L280 -440L120 -440L120 -520L280 -520L280 -600L360 -600L360 -360ZM440 -440L440 -520L840 -520L840 -440ZM600 -600L600 -840L680 -840L680 -760L840 -760L840 -680L680 -680L680 -600ZM120 -680L120 -760L520 -760L520 -680Z',
   visibility:
     'M480 -320Q555 -320 607.5 -372.5Q660 -425 660 -500Q660 -575 607.5 -627.5Q555 -680 480 -680Q405 -680 352.5 -627.5Q300 -575 300 -500Q300 -425 352.5 -372.5Q405 -320 480 -320ZM480 -392Q435 -392 403.5 -423.5Q372 -455 372 -500Q372 -545 403.5 -576.5Q435 -608 480 -608Q525 -608 556.5 -576.5Q588 -545 588 -500Q588 -455 556.5 -423.5Q525 -392 480 -392ZM480 -200Q334 -200 214 -281.5Q94 -363 40 -500Q94 -637 214 -718.5Q334 -800 480 -800Q626 -800 746 -718.5Q866 -637 920 -500Q866 -363 746 -281.5Q626 -200 480 -200ZM480 -500Q480 -500 480 -500Q480 -500 480 -500Q480 -500 480 -500Q480 -500 480 -500Q480 -500 480 -500Q480 -500 480 -500Q480 -500 480 -500Q480 -500 480 -500ZM480 -280Q593 -280 687.5 -339.5Q782 -399 832 -500Q782 -601 687.5 -660.5Q593 -720 480 -720Q367 -720 272.5 -660.5Q178 -601 128 -500Q178 -399 272.5 -339.5Q367 -280 480 -280Z',
   visibility_off:
diff --git a/app/src/pages/DashboardPage.tsx b/app/src/pages/DashboardPage.tsx
new file mode 100644
index 0000000..2ef5552
--- /dev/null
+++ b/app/src/pages/DashboardPage.tsx
@@ -0,0 +1,168 @@
+import { useAuth } from '../auth/AuthProvider';
+import { Card, Icon, IndicatorLabel } from '../design';
+
+const suggestions = [
+  { name: 'Exercício Físico', abbreviation: 'EXE', group: 'factor' as const },
+  { name: 'Café Expresso', abbreviation: 'CAF', group: 'factor' as const },
+  { name: 'Nível de Energia', abbreviation: 'ENE', group: 'result' as const },
+  { name: 'Concentração', abbreviation: 'CON', group: 'result' as const },
+];
+
+const timeline = [
+  { day: '1', title: 'Dia 1:', text: ' retrato factual e visual imediato do seu preenchimento.' },
+  { day: '2', title: 'A partir do Dia 2:', text: ' comparações descritivas entre seus dias de rotina.' },
+  {
+    day: '14',
+    title: 'A partir de 14 pares válidos:',
+    text: ' primeiras associações estatísticas, sempre apresentadas como possibilidades.',
+  },
+];
+
+export function DashboardPage() {
+  const { user } = useAuth();
+  const sessionTag = user ? `#${user.uid.replace(/-/g, '').slice(-4).toUpperCase()}` : '#PLS';
+
+  return (
+    <div className="flex min-h-dvh flex-col bg-surface">
+      <header className="sticky top-0 z-50 bg-surface/85 pt-safe shadow-[0_1px_8px_rgba(19,27,46,0.04)] backdrop-blur-xl">
+        <div className="mx-auto flex h-16 w-full max-w-(--container-app) items-center justify-between px-gutter">
+          <div className="flex items-center gap-1.5">
+            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-on-primary">
+              <Icon name="analytics" className="text-[18px]" />
+            </span>
+            <span className="font-headline-md text-headline-md tracking-tight text-on-surface">Pulsar</span>
+            <span className="rounded-full bg-surface-container-high px-2 py-0.5 font-label-code text-label-code tracking-wider text-primary uppercase">
+              Beta V1
+            </span>
+          </div>
+          <div
+            className="flex items-center gap-1.5 rounded-full bg-surface-container px-3 py-1.5 shadow-level-1"
+            aria-label="Sessão anônima atual"
+          >
+            <span className="size-2 rounded-full bg-secondary" aria-hidden="true" />
+            <span className="font-label-code text-label-code font-semibold text-on-surface">
+              {sessionTag}
+            </span>
+            <span className="font-label-code text-label-code text-on-surface-variant">| Dia 1</span>
+          </div>
+        </div>
+      </header>
+
+      <main className="mx-auto flex w-full max-w-(--container-app) flex-1 flex-col gap-space-lg px-gutter pt-space-sm pb-space-lg">
+        <div className="flex flex-col">
+          <span className="font-label-code text-label-code tracking-wider text-on-surface-variant uppercase">
+            Laboratório pessoal
+          </span>
+          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
+            Bem-vindo ao Pulsar
+          </h1>
+        </div>
+
+        <Card className="relative overflow-hidden bg-surface-container-low p-space-lg">
+          <div
+            className="pointer-events-none absolute -top-12 -right-12 size-36 rounded-full bg-primary-fixed/25 blur-2xl"
+            aria-hidden="true"
+          />
+          <div className="relative flex items-start gap-space-md">
+            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary shadow-level-1">
+              <Icon name="science" className="text-[22px]" />
+            </span>
+            <div className="flex flex-1 flex-col gap-1">
+              <h2 className="font-headline-md text-headline-md text-on-surface">
+                Sua rotina, seus dados, suas conclusões
+              </h2>
+              <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">
+                Escolha variáveis iniciais para começar sua série temporal ou crie uma do zero. Nenhum
+                indicador é criado automaticamente.
+              </p>
+            </div>
+          </div>
+        </Card>
+
+        <section className="flex flex-col gap-space-sm" aria-labelledby="suggestions-heading">
+          <div className="flex items-center justify-between gap-space-sm px-1">
+            <h2
+              id="suggestions-heading"
+              className="font-label-code text-label-code tracking-wider text-on-surface-variant uppercase"
+            >
+              Sugestões iniciais
+            </h2>
+            <span className="rounded-full bg-surface-container-high px-2 py-0.5 font-label-code text-label-code font-semibold text-primary">
+              4 prontas
+            </span>
+          </div>
+          <ul className="flex flex-col gap-space-sm">
+            {suggestions.map((indicator) => (
+              <li
+                key={indicator.abbreviation}
+                className="flex items-center justify-between gap-space-sm rounded-2xl bg-surface-container-lowest p-space-md shadow-level-1"
+              >
+                <div className="flex min-w-0 items-center gap-space-sm">
+                  <span
+                    className={`flex size-11 shrink-0 items-center justify-center rounded-full ${
+                      indicator.group === 'factor'
+                        ? 'bg-secondary-fixed/50 text-secondary'
+                        : 'bg-primary-fixed/50 text-primary'
+                    }`}
+                  >
+                    <Icon
+                      name={
+                        indicator.abbreviation === 'EXE'
+                          ? 'analytics'
+                          : indicator.abbreviation === 'CAF'
+                            ? 'input'
+                            : 'insights'
+                      }
+                      className="text-[22px]"
+                    />
+                  </span>
+                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
+                    <IndicatorLabel indicator={indicator} group={indicator.group} variant="badge" />
+                    <span className="font-body-sm text-body-sm text-on-surface-variant">
+                      {indicator.group === 'factor' ? 'Fator' : 'Resultado'}
+                    </span>
+                  </div>
+                </div>
+              </li>
+            ))}
+          </ul>
+        </section>
+
+        <Card className="gap-space-md p-space-lg">
+          <div className="flex items-center gap-2">
+            <Icon name="insights" className="text-[22px] text-primary" />
+            <h2 className="font-headline-md text-headline-md text-on-surface">Como os insights funcionam?</h2>
+          </div>
+          <div className="flex flex-col gap-space-sm font-body-sm text-body-sm text-on-surface-variant">
+            {timeline.map((item) => (
+              <div key={item.day} className="flex items-start gap-2.5">
+                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-container font-label-code text-label-code text-on-surface">
+                  {item.day}
+                </span>
+                <p>
+                  <strong className="font-semibold text-on-surface">{item.title}</strong>
+                  {item.text}
+                </p>
+              </div>
+            ))}
+          </div>
+        </Card>
+
+        <div className="flex items-start gap-space-sm rounded-2xl bg-surface-container-low p-space-md">
+          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-secondary">
+            <Icon name="lock" className="text-[18px]" />
+          </span>
+          <div className="flex flex-col gap-1">
+            <h2 className="font-label-lg text-label-lg font-semibold text-on-surface">
+              Conta anônima neste navegador
+            </h2>
+            <p className="font-body-sm text-body-sm text-on-surface-variant">
+              Seus dados ficam associados a esta sessão. Salvar a conta depois mantém o mesmo identificador e
+              evita perder o acesso ao trocar de dispositivo.
+            </p>
+          </div>
+        </div>
+      </main>
+    </div>
+  );
+}
diff --git a/app/src/pages/OnboardingPage.tsx b/app/src/pages/OnboardingPage.tsx
new file mode 100644
index 0000000..d5acf6b
--- /dev/null
+++ b/app/src/pages/OnboardingPage.tsx
@@ -0,0 +1,447 @@
+import { useState } from 'react';
+import { useNavigate } from 'react-router';
+import { useAuth } from '../auth/AuthProvider';
+import { Button, Card, Icon, IndicatorLabel } from '../design';
+
+interface DemoIndicator {
+  name: string;
+  abbreviation: string;
+  group: 'factor' | 'result';
+}
+
+const factors: DemoIndicator[] = [
+  { name: 'Exercício Físico', abbreviation: 'EXE', group: 'factor' },
+  { name: 'Café Expresso', abbreviation: 'CAF', group: 'factor' },
+  { name: 'Sono', abbreviation: 'SLP', group: 'factor' },
+];
+
+const results: DemoIndicator[] = [
+  { name: 'Nível de Energia', abbreviation: 'ENE', group: 'result' },
+  { name: 'Concentração', abbreviation: 'CON', group: 'result' },
+];
+
+const steps = [
+  { code: 'Passo 01 // 03', label: 'Fatores', progress: 1 },
+  { code: 'Passo 02 // 03', label: 'Resultados', progress: 2 },
+  { code: 'Passo 03 // 03', label: 'Associações', progress: 3 },
+] as const;
+
+function Progress({ step }: { step: number }) {
+  const current = steps[step]!;
+  return (
+    <div className="flex flex-col gap-space-xs px-gutter pt-space-sm">
+      <div className="flex items-center justify-between">
+        <span className="font-label-code text-label-code tracking-wider text-on-surface-variant uppercase">
+          {current.code}
+        </span>
+        <span className="font-label-code text-label-code font-semibold tracking-wider text-primary uppercase">
+          {current.label}
+        </span>
+      </div>
+      <div
+        className="flex h-1.5 w-full items-center gap-1.5"
+        role="progressbar"
+        aria-label="Progresso da introdução"
+        aria-valuemin={1}
+        aria-valuemax={3}
+        aria-valuenow={current.progress}
+      >
+        {[1, 2, 3].map((value) => (
+          <div
+            key={value}
+            className={`h-full flex-1 rounded-full ${
+              value <= current.progress ? 'bg-primary' : 'bg-surface-container-high'
+            }`}
+          />
+        ))}
+      </div>
+    </div>
+  );
+}
+
+function FactorStep() {
+  return (
+    <div className="flex flex-col gap-space-lg px-gutter pb-space-lg">
+      <Card className="relative overflow-hidden bg-surface-container-low p-space-lg">
+        <div
+          className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-secondary-fixed/50 blur-2xl"
+          aria-hidden="true"
+        />
+        <div
+          className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-primary-fixed/40 blur-2xl"
+          aria-hidden="true"
+        />
+        <div className="relative flex flex-col items-center gap-space-md">
+          <div className="flex size-16 items-center justify-center rounded-full bg-surface-container-lowest shadow-level-1">
+            <div className="flex size-11 items-center justify-center rounded-full bg-secondary text-on-secondary">
+              <Icon name="science" className="text-[24px]" />
+            </div>
+          </div>
+          <div className="flex flex-wrap justify-center gap-space-sm">
+            {factors.map((indicator) => (
+              <span
+                key={indicator.abbreviation}
+                className="flex items-center gap-1.5 rounded-full bg-surface-container-lowest px-2.5 py-1.5 shadow-level-1"
+              >
+                <IndicatorLabel indicator={indicator} group="factor" variant="badge" />
+              </span>
+            ))}
+          </div>
+          <span className="flex items-center gap-1.5 rounded-full bg-secondary-fixed/60 px-3 py-1">
+            <span className="size-1.5 rounded-full bg-secondary" aria-hidden="true" />
+            <span className="font-label-code text-label-code font-semibold tracking-wider text-on-secondary-fixed uppercase">
+              Entradas bio-comportamentais
+            </span>
+          </span>
+        </div>
+      </Card>
+
+      <div className="flex flex-col gap-space-xs">
+        <span className="self-start rounded-full bg-primary-fixed px-2.5 py-0.5 font-label-code text-label-code text-on-primary-fixed uppercase">
+          Passo 1 de 3 • Fatores
+        </span>
+        <h1 className="font-headline-xl-mobile text-headline-xl-mobile tracking-tight text-on-surface">
+          Observe sua rotina sem burocracia
+        </h1>
+        <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">
+          Fatores são hábitos, atividades e consumos do seu dia a dia. Registre apenas o que quiser, em poucos
+          segundos.
+        </p>
+      </div>
+
+      <Card className="gap-space-md">
+        <div className="flex items-center justify-between gap-space-sm">
+          <div className="flex items-center gap-2">
+            <Icon name="input" className="text-[20px] text-secondary" />
+            <span className="font-label-lg text-label-lg text-on-surface">Exemplos práticos</span>
+          </div>
+          <span className="font-label-code text-label-code font-semibold text-secondary uppercase">
+            Interativo
+          </span>
+        </div>
+        {factors.slice(0, 2).map((indicator) => (
+          <div
+            key={indicator.abbreviation}
+            className="flex items-center justify-between gap-space-sm rounded-2xl bg-surface-container-low p-space-sm"
+          >
+            <div className="flex min-w-0 items-center gap-2.5">
+              <IndicatorLabel
+                indicator={indicator}
+                group="factor"
+                variant="badge"
+                className="truncate font-label-lg text-label-lg"
+              />
+            </div>
+            <span className="rounded-full bg-surface-container-high px-2.5 py-1 font-label-md text-label-md text-on-surface-variant">
+              {indicator.abbreviation === 'EXE' ? 'Sim / Não' : '2 xícaras'}
+            </span>
+          </div>
+        ))}
+      </Card>
+
+      <div className="flex items-start gap-space-sm rounded-2xl bg-tertiary/10 p-space-md">
+        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-tertiary text-on-tertiary">
+          <Icon name="check_circle" className="text-[16px]" />
+        </span>
+        <p className="font-body-sm text-body-sm leading-snug text-on-surface">
+          <strong className="font-semibold text-tertiary">Zero fricção:</strong> nenhum campo é obrigatório.
+          Responda apenas o que fizer sentido no seu dia.
+        </p>
+      </div>
+    </div>
+  );
+}
+
+function ResultStep() {
+  return (
+    <div className="flex flex-col gap-space-lg px-gutter pb-space-lg">
+      <div className="flex flex-col items-center gap-space-sm text-center">
+        <div className="relative flex size-36 items-center justify-center">
+          <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl" aria-hidden="true" />
+          <div className="absolute inset-2 flex items-center justify-center rounded-full bg-surface-container-low shadow-level-1">
+            <div className="flex size-20 flex-col items-center justify-center rounded-full bg-primary text-on-primary shadow-level-2">
+              <Icon name="analytics" className="text-[28px]" />
+              <span className="mt-0.5 font-label-code text-label-code tracking-widest">RES // 02</span>
+            </div>
+          </div>
+        </div>
+        <span className="inline-flex items-center gap-space-xs rounded-full bg-primary-fixed px-space-md py-1 text-on-primary-fixed">
+          <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
+          <span className="font-label-code text-label-code tracking-wider uppercase">
+            Passo 2 de 3 • Resultados
+          </span>
+        </span>
+        <h1 className="font-headline-xl-mobile text-headline-xl-mobile tracking-tight text-on-surface">
+          Acompanhe como seu corpo responde
+        </h1>
+        <p className="max-w-sm font-body-md text-body-md text-on-surface-variant">
+          Resultados são os efeitos que você percebe: energia, nitidez mental, sono regenerativo ou sintomas.
+        </p>
+      </div>
+
+      <Card className="gap-space-md p-space-lg">
+        <div className="flex items-center justify-between gap-space-sm">
+          <span className="rounded-full bg-primary-fixed px-space-xs py-0.5 font-label-code text-label-code text-primary">
+            RES
+          </span>
+          <span className="font-label-lg text-label-lg text-on-surface">Simulador de percepção</span>
+          <span className="font-label-code text-label-code text-on-surface-variant">TEMPO REAL</span>
+        </div>
+        {results.map((indicator, index) => {
+          const value = index === 0 ? 8 : 7;
+          return (
+            <div
+              key={indicator.abbreviation}
+              className="flex flex-col gap-space-xs rounded-2xl bg-surface-container-low p-space-md"
+            >
+              <div className="flex items-center justify-between">
+                <div className="flex items-center gap-space-xs">
+                  <Icon name={index === 0 ? 'bolt' : 'psychology'} className="text-[20px] text-primary" />
+                  <IndicatorLabel indicator={indicator} className="font-label-md text-label-md" />
+                </div>
+                <span className="font-headline-md text-headline-md font-bold text-primary">
+                  {value}
+                  <span className="font-body-sm text-body-sm text-on-surface-variant">/10</span>
+                </span>
+              </div>
+              <div className="flex items-center gap-1" aria-hidden="true">
+                {Array.from({ length: 10 }, (_, position) => (
+                  <span
+                    key={position}
+                    className={`h-3 flex-1 rounded-full ${
+                      position < value ? 'bg-primary-container' : 'bg-surface-container-high'
+                    }`}
+                  />
+                ))}
+              </div>
+            </div>
+          );
+        })}
+      </Card>
+
+      <div className="flex items-start gap-space-md rounded-2xl bg-surface-container-high/60 p-space-md">
+        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary shadow-level-1">
+          <Icon name="tune" className="text-[20px]" />
+        </span>
+        <div className="flex flex-col gap-0.5">
+          <span className="font-label-lg text-label-lg font-semibold text-on-surface">
+            Direção desejável personalizada
+          </span>
+          <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
+            Você define a meta de cada resultado: mais energia, menos dor ou uma faixa ideal. O Pulsar
+            respeita a sua escolha.
+          </p>
+        </div>
+      </div>
+    </div>
+  );
+}
+
+function AssociationStep() {
+  return (
+    <div className="flex flex-col gap-space-lg px-gutter pb-space-lg">
+      <div className="flex flex-col gap-space-xs">
+        <span className="inline-flex items-center gap-space-xs self-start rounded-full bg-surface-container-high px-3 py-1 font-label-code text-label-code tracking-wider text-primary uppercase">
+          <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
+          Passo 3 de 3 • Ciência pessoal
+        </span>
+        <h1 className="font-headline-xl-mobile text-headline-xl-mobile tracking-tight text-on-surface">
+          Descubra associações reais nos seus dados
+        </h1>
+        <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">
+          O Pulsar cruza o que você faz com o que você sente. Sem palpites: as associações são calculadas a
+          partir dos seus próprios registros.
+        </p>
+      </div>
+
+      <Card className="gap-space-md bg-surface-container-lowest p-space-md">
+        <div className="flex flex-wrap items-center justify-between gap-space-sm">
+          <div className="flex items-center gap-space-xs" aria-hidden="true">
+            <span className="rounded-full bg-secondary-fixed px-2 py-0.5 font-label-code text-label-code text-on-secondary-fixed">
+              FAT • FATOR
+            </span>
+            <Icon name="arrow_forward" className="text-[16px] text-on-surface-variant" />
+            <span className="rounded-full bg-primary-fixed px-2 py-0.5 font-label-code text-label-code text-on-primary-fixed">
+              RES • RESULTADO
+            </span>
+          </div>
+          <span className="rounded-full bg-primary-fixed/50 px-2 py-0.5 font-label-code text-label-code text-primary">
+            Possível associação
+          </span>
+        </div>
+        <div className="flex items-center justify-between gap-space-sm rounded-2xl bg-surface-container-low p-space-sm">
+          <IndicatorLabel indicator={factors[0]!} group="factor" />
+          <span className="font-label-code text-label-code text-on-surface-variant">r = +0,68</span>
+          <IndicatorLabel indicator={results[0]!} group="result" />
+        </div>
+        <div className="grid grid-cols-2 gap-space-sm">
+          <div className="flex flex-col rounded-2xl bg-surface-container-low p-space-sm">
+            <span className="font-label-code text-label-code text-on-surface-variant uppercase">
+              Com exercício
+            </span>
+            <span className="font-stat-display text-stat-display text-on-surface">7,4</span>
+            <span className="font-label-code text-label-code text-tertiary">Energia média</span>
+          </div>
+          <div className="flex flex-col rounded-2xl bg-surface-container-low p-space-sm">
+            <span className="font-label-code text-label-code text-on-surface-variant uppercase">
+              Sem exercício
+            </span>
+            <span className="font-stat-display text-stat-display text-on-surface-variant">5,8</span>
+            <span className="font-label-code text-label-code text-on-surface-variant">Linha de base</span>
+          </div>
+        </div>
+        <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
+          Nos dias com exercício, sua energia média apareceu mais alta. Isso é uma associação observada, não
+          uma prova de causa.
+        </p>
+        <div className="flex items-start gap-1.5 text-on-surface-variant">
+          <Icon name="lock" className="mt-0.5 shrink-0 text-[16px] text-on-surface-variant" />
+          <p className="font-label-code text-label-code leading-tight text-on-surface-variant">
+            Correlação estatística não implica causalidade. O Pulsar mostra possibilidades e mantém a
+            interpretação com você.
+          </p>
+        </div>
+      </Card>
+
+      <div className="flex flex-col gap-space-xs">
+        <span className="font-label-code text-label-code tracking-wider text-on-surface-variant uppercase">
+          Garantias da plataforma
+        </span>
+        {[
+          {
+            icon: 'lock' as const,
+            tone: 'bg-secondary-fixed text-secondary',
+            title: 'Conta anônima inicial',
+            description: 'Comece agora mesmo no aparelho, sem burocracia.',
+          },
+          {
+            icon: 'visibility_off' as const,
+            tone: 'bg-surface-container-high text-primary',
+            title: 'Modo siglas imediato',
+            description: 'Oculte nomes sensíveis com um toque quando precisar.',
+          },
+          {
+            icon: 'analytics' as const,
+            tone: 'bg-primary-fixed text-primary',
+            title: '15 segundos por dia',
+            description: 'Controles rápidos, desenhados para usar com uma mão.',
+          },
+        ].map((guarantee) => (
+          <div
+            key={guarantee.title}
+            className="flex items-center gap-space-md rounded-2xl bg-surface-container-lowest p-space-sm"
+          >
+            <span
+              className={`flex size-10 shrink-0 items-center justify-center rounded-full ${guarantee.tone}`}
+            >
+              <Icon name={guarantee.icon} className="text-[20px]" />
+            </span>
+            <div className="flex min-w-0 flex-col">
+              <span className="font-label-lg text-label-lg text-on-surface">{guarantee.title}</span>
+              <span className="font-body-sm text-body-sm text-on-surface-variant">
+                {guarantee.description}
+              </span>
+            </div>
+          </div>
+        ))}
+      </div>
+    </div>
+  );
+}
+
+export function OnboardingPage() {
+  const navigate = useNavigate();
+  const { completeOnboarding } = useAuth();
+  const [step, setStep] = useState(0);
+  const [saving, setSaving] = useState(false);
+  const [error, setError] = useState('');
+
+  async function finish() {
+    if (saving) return;
+    setSaving(true);
+    setError('');
+    try {
+      await completeOnboarding();
+      navigate('/dashboard', { replace: true });
+    } catch {
+      setError('Não foi possível salvar a conclusão da introdução. Tente novamente.');
+      setSaving(false);
+    }
+  }
+
+  return (
+    <div className="flex min-h-dvh flex-col bg-surface">
+      <header className="sticky top-0 z-50 bg-surface/85 pt-safe shadow-[0_1px_8px_rgba(19,27,46,0.04)] backdrop-blur-xl">
+        <div className="mx-auto flex h-16 w-full max-w-(--container-app) items-center justify-between px-gutter">
+          <div className="flex items-center gap-space-sm">
+            <button
+              type="button"
+              aria-label="Voltar"
+              className="flex size-11 items-center justify-center rounded-full text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-40"
+              onClick={() => (step === 0 ? navigate('/') : setStep((current) => current - 1))}
+              disabled={saving}
+            >
+              <Icon name="arrow_back" className="text-[22px]" />
+            </button>
+            <div className="flex items-center gap-space-xs">
+              <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
+              <span className="font-label-code text-label-code tracking-wider text-on-surface-variant uppercase">
+                Pulsar // Bio-exp
+              </span>
+            </div>
+          </div>
+          <Button variant="ghost" className="min-w-11" onClick={() => void finish()} disabled={saving}>
+            {saving ? 'Salvando…' : 'Pular'}
+          </Button>
+        </div>
+      </header>
+
+      <main className="mx-auto flex w-full max-w-(--container-app) flex-1 flex-col pb-safe">
+        <Progress step={step} />
+        <div className="mt-space-md flex-1">
+          {step === 0 && <FactorStep />}
+          {step === 1 && <ResultStep />}
+          {step === 2 && <AssociationStep />}
+        </div>
+
+        <div className="mt-auto flex flex-col gap-space-sm px-gutter pt-space-sm pb-space-lg">
+          {error && (
+            <p role="alert" className="font-body-sm text-body-sm text-error">
+              {error}
+            </p>
+          )}
+          {step === 0 && (
+            <>
+              <Button size="lg" fullWidth icon="arrow_forward" onClick={() => setStep(1)} disabled={saving}>
+                Próximo: Resultados
+              </Button>
+              <Button variant="neutral" fullWidth onClick={() => void finish()} disabled={saving}>
+                Pular introdução
+              </Button>
+            </>
+          )}
+          {step === 1 && (
+            <div className="flex items-center gap-space-md">
+              <Button variant="neutral" icon="arrow_back" onClick={() => setStep(0)} disabled={saving}>
+                Voltar
+              </Button>
+              <Button className="flex-1" icon="arrow_forward" onClick={() => setStep(2)} disabled={saving}>
+                Próximo: Descobertas
+              </Button>
+            </div>
+          )}
+          {step === 2 && (
+            <div className="flex items-center gap-space-sm">
+              <Button variant="neutral" icon="arrow_back" onClick={() => setStep(1)} disabled={saving}>
+                Voltar
+              </Button>
+              <Button className="flex-1" icon="arrow_forward" onClick={() => void finish()} disabled={saving}>
+                {saving ? 'Salvando…' : 'Começar a Explorar'}
+              </Button>
+            </div>
+          )}
+        </div>
+      </main>
+    </div>
+  );
+}
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
