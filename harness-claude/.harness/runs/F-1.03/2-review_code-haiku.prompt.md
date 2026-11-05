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
index 0000000..cbdb7ca
--- /dev/null
+++ b/app/e2e/anonymous-start.spec.ts
@@ -0,0 +1,136 @@
+import { expect, test, type Page } from '@playwright/test';
+
+const AUTH = 'http://127.0.0.1:9299';
+const FIRESTORE = 'http://127.0.0.1:8282';
+const PROJECT = 'demo-pulsar';
+const OWNER = { Authorization: 'Bearer owner' };
+
+// Reads the UID of the signed-in user from the Firebase SDK persistence (IndexedDB).
+async function readUid(page: Page): Promise<string> {
+  await expect
+    .poll(
+      () =>
+        page.evaluate(
+          () =>
+            new Promise<string | null>((resolve) => {
+              const open = indexedDB.open('firebaseLocalStorageDb');
+              open.onerror = () => resolve(null);
+              open.onsuccess = () => {
+                const db = open.result;
+                if (!db.objectStoreNames.contains('firebaseLocalStorage')) return resolve(null);
+                const req = db
+                  .transaction('firebaseLocalStorage')
+                  .objectStore('firebaseLocalStorage')
+                  .getAll();
+                req.onerror = () => resolve(null);
+                req.onsuccess = () => {
+                  const row = (req.result as { value?: { uid?: string } }[]).find((r) => r.value?.uid);
+                  resolve(row?.value?.uid ?? null);
+                };
+              };
+            }),
+        ),
+      { timeout: 15_000 },
+    )
+    .not.toBeNull();
+  return page.evaluate(
+    () =>
+      new Promise<string>((resolve) => {
+        const open = indexedDB.open('firebaseLocalStorageDb');
+        open.onsuccess = () => {
+          const req = open.result
+            .transaction('firebaseLocalStorage')
+            .objectStore('firebaseLocalStorage')
+            .getAll();
+          req.onsuccess = () =>
+            resolve(
+              (req.result as { value?: { uid?: string } }[]).find((r) => r.value?.uid)?.value?.uid ?? '',
+            );
+        };
+      }),
+  );
+}
+
+async function userDoc(request: import('@playwright/test').APIRequestContext, uid: string) {
+  const res = await request.get(
+    `${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}`,
+    {
+      headers: OWNER,
+    },
+  );
+  return res.ok() ? ((await res.json()) as { fields: Record<string, Record<string, unknown>> }) : null;
+}
+
+async function accountCount(request: import('@playwright/test').APIRequestContext) {
+  const res = await request.get(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { headers: OWNER });
+  return ((await res.json()) as { userInfo?: unknown[] }).userInfo?.length ?? 0;
+}
+
+test.describe('anonymous start', () => {
+  test('first visit enters without signup, email or login screen', async ({ page }) => {
+    await page.goto('/');
+    await expect(page).toHaveURL(/\/onboarding$/);
+    await expect(page.locator('input[type="email"], input[type="password"], input[type="tel"]')).toHaveCount(
+      0,
+    );
+    const text = (await page.locator('body').innerText()).toLowerCase();
+    expect(text).not.toMatch(/entrar|login|criar conta|senha/);
+    await readUid(page);
+  });
+
+  test('reload keeps the same uid and creates no new account', async ({ page, request }) => {
+    await page.goto('/');
+    await expect(page).toHaveURL(/\/onboarding$/);
+    const uid = await readUid(page);
+    const before = await accountCount(request);
+    await page.reload();
+    await expect(page).toHaveURL(/\/onboarding$/);
+    expect(await readUid(page)).toBe(uid);
+    expect(await accountCount(request)).toBe(before);
+  });
+
+  test('users/{uid} is created once with defaults', async ({ page, request }) => {
+    await page.goto('/');
+    const uid = await readUid(page);
+    await expect.poll(() => userDoc(request, uid)).not.toBeNull();
+    const first = (await userDoc(request, uid))!;
+    expect(first.fields.onboardingCompleted).toEqual({ booleanValue: false });
+    expect(first.fields.aiConsent).toEqual({ booleanValue: false });
+    expect(first.fields.reminderEnabled).toEqual({ booleanValue: false });
+    expect(first.fields.createdAt).toHaveProperty('timestampValue');
+
+    await page.reload();
+    await expect(page).toHaveURL(/\/onboarding$/);
+    const second = (await userDoc(request, uid))!;
+    expect(second.fields.createdAt).toEqual(first.fields.createdAt);
+  });
+
+  test('completed onboarding redirects / to /dashboard', async ({ page, request }) => {
+    await page.goto('/');
+    const uid = await readUid(page);
+    await expect.poll(() => userDoc(request, uid)).not.toBeNull();
+    const res = await request.patch(
+      `${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}?updateMask.fieldPaths=onboardingCompleted`,
+      { headers: OWNER, data: { fields: { onboardingCompleted: { booleanValue: true } } } },
+    );
+    expect(res.ok()).toBe(true);
+    await page.goto('/');
+    await expect(page).toHaveURL(/\/dashboard$/);
+    expect(await readUid(page)).toBe(uid);
+  });
+
+  test('network error shows a pt-BR message and no success state', async ({ page }) => {
+    await page.route('**/accounts:signUp*', (route) => route.abort('connectionfailed'));
+    await page.goto('/');
+    const alert = page.getByRole('alert');
+    await expect(alert).toBeVisible({ timeout: 15_000 });
+    await expect(alert).toContainText(/conex|rede|internet/i);
+    await expect(page).not.toHaveURL(/\/(onboarding|dashboard)$/);
+  });
+
+  test('desktop-size smoke: app opens', async ({ page }) => {
+    await page.setViewportSize({ width: 1280, height: 800 });
+    await page.goto('/');
+    await expect(page).toHaveURL(/\/onboarding$/);
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
diff --git a/app/src/App.tsx b/app/src/App.tsx
index 3de0f57..1bbabee 100644
--- a/app/src/App.tsx
+++ b/app/src/App.tsx
@@ -1,13 +1,73 @@
 import { lazy, Suspense } from 'react';
-import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router';
+import { createBrowserRouter, Navigate, Outlet, RouterProvider, type RouteObject } from 'react-router';
+import { AuthProvider, useAuth } from './auth/AuthProvider';
+import { Button } from './design';
 import { emulatorsEnabled } from './lib/env';
 import { HomePlaceholder } from './pages/HomePlaceholder';
 import { PrivacyProvider } from './privacy/PrivacyContext';
 
 const DesignPage = lazy(() => import('./pages/DesignPage'));
+const textClass = 'font-body-lg text-body-lg text-on-surface-variant';
+
+// App routes only render once the anonymous session and users/{uid} are ready; errors never look like success.
+function AuthGate() {
+  const { loading, error } = useAuth();
+  if (error)
+    return (
+      <HomePlaceholder>
+        <p role="alert" className="font-body-lg text-body-lg text-error">
+          {error}
+        </p>
+        <Button className="mt-4 self-start" onClick={() => window.location.reload()}>
+          Tentar novamente
+        </Button>
+      </HomePlaceholder>
+    );
+  if (loading)
+    return (
+      <HomePlaceholder>
+        <p role="status" className={textClass}>
+          Preparando seu espaço…
+        </p>
+      </HomePlaceholder>
+    );
+  return <Outlet />;
+}
+
+function RootRedirect() {
+  const { profile } = useAuth();
+  return <Navigate to={profile?.onboardingCompleted ? '/dashboard' : '/onboarding'} replace />;
+}
 
 const routes: RouteObject[] = [
-  { path: '/', element: <HomePlaceholder /> },
+  {
+    element: (
+      <AuthProvider>
+        <AuthGate />
+      </AuthProvider>
+    ),
+    children: [
+      { path: '/', element: <RootRedirect /> },
+      {
+        path: '/onboarding',
+        element: (
+          <HomePlaceholder title="Boas-vindas ao Pulsar">
+            <p className={textClass}>
+              Registre o que você faz e descubra possíveis relações com como você se sente.
+            </p>
+          </HomePlaceholder>
+        ),
+      },
+      {
+        path: '/dashboard',
+        element: (
+          <HomePlaceholder title="Seu painel">
+            <p className={textClass}>Seus indicadores e registros aparecerão aqui.</p>
+          </HomePlaceholder>
+        ),
+      },
+    ],
+  },
   ...(emulatorsEnabled
     ? [
         {
diff --git a/app/src/auth/AuthProvider.tsx b/app/src/auth/AuthProvider.tsx
new file mode 100644
index 0000000..462ccda
--- /dev/null
+++ b/app/src/auth/AuthProvider.tsx
@@ -0,0 +1,74 @@
+import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
+import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
+import { auth } from '../lib/firebase';
+import { ensureUserProfile, watchUserProfile, type UserProfile } from './userRepository';
+
+interface AuthState {
+  user: User | null;
+  profile: UserProfile | null;
+  loading: boolean;
+  error: string | null;
+}
+
+const initialState: AuthState = { user: null, profile: null, loading: true, error: null };
+const AuthContext = createContext<AuthState>(initialState);
+
+// Shared by every subscriber (e.g. StrictMode double effects) so a first visit never creates two anonymous accounts.
+let pendingSignIn: Promise<unknown> | null = null;
+
+function errorMessage(err: unknown): string {
+  const code = (err as { code?: string } | null)?.code;
+  return code === 'auth/network-request-failed' || code === 'unavailable'
+    ? 'Sem conexão com a internet. Verifique sua rede e tente novamente.'
+    : 'Não foi possível iniciar o Pulsar. Tente novamente.';
+}
+
+// First visit signs in anonymously (no signup screen); the SDK persists the session, so reloads keep the UID.
+export function AuthProvider({ children }: { children: ReactNode }) {
+  const [state, setState] = useState<AuthState>(initialState);
+
+  useEffect(() => {
+    // Each auth change starts a new generation; results and errors from older ones are ignored.
+    let generation = 0;
+    let stopProfile = () => {};
+    const unsubscribe = onAuthStateChanged(auth, (user) => {
+      const current = ++generation;
+      const isCurrent = () => current === generation;
+      const fail = (err: unknown) => {
+        if (isCurrent()) setState({ user: null, profile: null, loading: false, error: errorMessage(err) });
+      };
+      stopProfile();
+      stopProfile = () => {};
+      setState(initialState);
+      if (!user) {
+        pendingSignIn ??= signInAnonymously(auth).finally(() => (pendingSignIn = null));
+        pendingSignIn.catch(fail);
+        return;
+      }
+      ensureUserProfile(user.uid).then((profile) => {
+        if (!isCurrent()) return;
+        // A transaction is server-confirmed; never release navigation from a cache-only snapshot.
+        setState({ user, profile, loading: false, error: null });
+        stopProfile = watchUserProfile(
+          user.uid,
+          (profile) => {
+            if (isCurrent()) setState({ user, profile, loading: false, error: null });
+          },
+          fail,
+        );
+      }, fail);
+    });
+    return () => {
+      generation += 1;
+      stopProfile();
+      unsubscribe();
+    };
+  }, []);
+
+  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
+}
+
+// eslint-disable-next-line react-refresh/only-export-components
+export function useAuth(): AuthState {
+  return useContext(AuthContext);
+}
diff --git a/app/src/auth/__tests__/AuthProvider.test.tsx b/app/src/auth/__tests__/AuthProvider.test.tsx
new file mode 100644
index 0000000..d455fa4
--- /dev/null
+++ b/app/src/auth/__tests__/AuthProvider.test.tsx
@@ -0,0 +1,245 @@
+import { act, render, screen, waitFor } from '@testing-library/react';
+import { beforeEach, describe, expect, it, vi } from 'vitest';
+
+// Minimal in-memory fakes of the Firebase SDK pieces the provider is allowed to use.
+const h = vi.hoisted(() => {
+  type Listener = (user: { uid: string } | null) => void;
+  const state = {
+    currentUser: null as { uid: string } | null,
+    listeners: [] as Listener[],
+    docs: new Map<string, Record<string, unknown>>(),
+    signInError: null as Error | null,
+    signInCalls: 0,
+    nextUid: 1,
+    docListeners: [] as {
+      path: string;
+      cb: (snap: { data: () => unknown; metadata: { fromCache: boolean } }) => void;
+    }[],
+    // Pending reads per document path, to simulate slow queries.
+    gates: new Map<string, Promise<void>>(),
+  };
+  const emit = () => state.listeners.forEach((l) => l(state.currentUser));
+  const notify = (path: string) =>
+    state.docListeners
+      .filter((l) => l.path === path)
+      .forEach((l) => l.cb({ data: () => state.docs.get(path), metadata: { fromCache: false } }));
+  const write = (path: string, data: Record<string, unknown>) => {
+    state.docs.set(path, { ...(state.docs.get(path) ?? {}), ...data });
+    notify(path);
+  };
+  return { state, emit, notify, write };
+});
+
+vi.mock('../../lib/firebase', () => ({ auth: { __fake: 'auth' }, db: { __fake: 'db' } }));
+
+vi.mock('firebase/auth', () => ({
+  onAuthStateChanged: (_auth: unknown, cb: (u: { uid: string } | null) => void) => {
+    h.state.listeners.push(cb);
+    queueMicrotask(() => cb(h.state.currentUser));
+    return () => {
+      h.state.listeners = h.state.listeners.filter((l) => l !== cb);
+    };
+  },
+  signInAnonymously: async () => {
+    h.state.signInCalls += 1;
+    if (h.state.signInError) throw h.state.signInError;
+    h.state.currentUser = { uid: `anon-${h.state.nextUid++}` };
+    h.emit();
+    return { user: h.state.currentUser };
+  },
+}));
+
+vi.mock('firebase/firestore', () => {
+  const doc = (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') });
+  const getDoc = async (ref: { path: string }) => {
+    await h.state.gates.get(ref.path);
+    const data = h.state.docs.get(ref.path);
+    return { exists: () => data !== undefined, data: () => data };
+  };
+  const setDoc = async (ref: { path: string }, data: Record<string, unknown>) => h.write(ref.path, data);
+  const onSnapshot = (
+    ref: { path: string },
+    cb: (snap: { data: () => unknown; metadata: { fromCache: boolean } }) => void,
+  ) => {
+    const entry = { path: ref.path, cb };
+    h.state.docListeners.push(entry);
+    queueMicrotask(() => cb({ data: () => h.state.docs.get(ref.path), metadata: { fromCache: false } }));
+    return () => {
+      h.state.docListeners = h.state.docListeners.filter((l) => l !== entry);
+    };
+  };
+  return {
+    doc,
+    getDoc,
+    setDoc,
+    onSnapshot,
+    serverTimestamp: () => '__server_timestamp__',
+    runTransaction: async (
+      _db: unknown,
+      fn: (tx: { get: typeof getDoc; set: typeof setDoc; update: typeof setDoc }) => Promise<unknown>,
+    ) => fn({ get: getDoc, set: setDoc, update: setDoc }),
+  };
+});
+
+import { AuthProvider, useAuth } from '../AuthProvider';
+
+function Probe() {
+  const { user, profile, loading, error } = useAuth();
+  return (
+    <div>
+      <span data-testid="loading">{String(loading)}</span>
+      <span data-testid="uid">{user?.uid ?? 'none'}</span>
+      <span data-testid="onboarding">{String(profile?.onboardingCompleted ?? 'none')}</span>
+      {error ? <p role="alert">{error}</p> : null}
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
+  h.state.currentUser = null;
+  h.state.listeners = [];
+  h.state.docs.clear();
+  h.state.signInError = null;
+  h.state.signInCalls = 0;
+  h.state.nextUid = 1;
+  h.state.docListeners = [];
+  h.state.gates.clear();
+});
+
+const text = (id: string) => screen.getByTestId(id).textContent;
+
+describe('AuthProvider', () => {
+  it('exposes loading until the session resolves, then signs in anonymously', async () => {
+    renderProvider();
+    expect(screen.getByTestId('loading').textContent).toBe('true');
+    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
+    expect(screen.getByTestId('uid').textContent).toBe('anon-1');
+    expect(h.state.signInCalls).toBe(1);
+  });
+
+  it('does not sign in again when a session already exists (same uid)', async () => {
+    h.state.currentUser = { uid: 'existing-uid' };
+    renderProvider();
+    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
+    expect(screen.getByTestId('uid').textContent).toBe('existing-uid');
+    expect(h.state.signInCalls).toBe(0);
+  });
+
+  it('creates users/{uid} with the defaults', async () => {
+    renderProvider();
+    await waitFor(() => expect(h.state.docs.get('users/anon-1')).toBeDefined());
+    expect(h.state.docs.get('users/anon-1')).toMatchObject({
+      createdAt: '__server_timestamp__',
+      onboardingCompleted: false,
+      aiConsent: false,
+      reminderEnabled: false,
+    });
+  });
+
+  it('never overwrites an existing users/{uid} document', async () => {
+    h.state.currentUser = { uid: 'existing-uid' };
+    h.state.docs.set('users/existing-uid', {
+      createdAt: 'original',
+      onboardingCompleted: true,
+      aiConsent: true,
+      reminderEnabled: true,
+    });
+    renderProvider();
+    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
+    expect(h.state.docs.get('users/existing-uid')).toEqual({
+      createdAt: 'original',
+      onboardingCompleted: true,
+      aiConsent: true,
+      reminderEnabled: true,
+    });
+  });
+
+  it('shows a pt-BR error and no user when the sign-in fails on the network', async () => {
+    h.state.signInError = Object.assign(new Error('network'), { code: 'auth/network-request-failed' });
+    renderProvider();
+    const alert = await screen.findByRole('alert');
+    expect(alert.textContent).toMatch(/conex|rede|internet/i);
+    expect(screen.getByTestId('uid').textContent).toBe('none');
+    expect(screen.getByTestId('loading').textContent).toBe('false');
+    expect(h.state.docs.size).toBe(0);
+  });
+
+  it('shows a network error when the connection fails after authentication', async () => {
+    h.state.currentUser = { uid: 'existing-uid' };
+    h.state.gates.set(
+      'users/existing-uid',
+      Promise.reject(Object.assign(new Error('offline'), { code: 'unavailable' })),
+    );
+    renderProvider();
+    const alert = await screen.findByRole('alert');
+    expect(alert.textContent).toMatch(/conex|rede|internet/i);
+    expect(text('uid')).toBe('none');
+    expect(text('loading')).toBe('false');
+  });
+
+  it('does not replace the server-confirmed profile with cache-only data', async () => {
+    h.state.currentUser = { uid: 'existing-uid' };
+    renderProvider();
+    await waitFor(() => expect(text('onboarding')).toBe('false'));
+    act(() => {
+      h.state.docListeners.forEach((listener) =>
+        listener.cb({
+          data: () => ({ onboardingCompleted: true }),
+          metadata: { fromCache: true },
+        }),
+      );
+    });
+    expect(text('onboarding')).toBe('false');
+  });
+
+  it('keeps the profile up to date when onboardingCompleted changes during the session', async () => {
+    h.state.currentUser = { uid: 'existing-uid' };
+    renderProvider();
+    await waitFor(() => expect(text('onboarding')).toBe('false'));
+    act(() => h.write('users/existing-uid', { onboardingCompleted: true }));
+    await waitFor(() => expect(text('onboarding')).toBe('true'));
+  });
+
+  it('clears the previous user state while a new auth state loads', async () => {
+    h.state.currentUser = { uid: 'user-a' };
+    renderProvider();
+    await waitFor(() => expect(text('uid')).toBe('user-a'));
+
+    let release = () => {};
+    h.state.gates.set('users/user-b', new Promise<void>((r) => (release = r)));
+    h.state.currentUser = { uid: 'user-b' };
+    act(() => h.emit());
+    expect(text('uid')).toBe('none');
+    expect(text('loading')).toBe('true');
+    expect(text('onboarding')).toBe('none');
+
+    await act(async () => release());
+    await waitFor(() => expect(text('uid')).toBe('user-b'));
+  });
+
+  it('ignores a pending query that belongs to a previous auth state', async () => {
+    let release = () => {};
+    h.state.gates.set('users/user-a', new Promise<void>((r) => (release = r)));
+    h.state.currentUser = { uid: 'user-a' };
+    renderProvider();
+    await waitFor(() => expect(h.state.listeners.length).toBeGreaterThan(0));
+
+    h.state.currentUser = { uid: 'user-b' };
+    act(() => h.emit());
+    await waitFor(() => expect(text('uid')).toBe('user-b'));
+
+    await act(async () => release());
+    expect(text('uid')).toBe('user-b');
+    expect(h.state.docListeners.every((l) => l.path === 'users/user-b')).toBe(true);
+    act(() => h.write('users/user-a', { onboardingCompleted: true }));
+    expect(text('uid')).toBe('user-b');
+    expect(text('onboarding')).toBe('false');
+  });
+});
diff --git a/app/src/auth/userRepository.ts b/app/src/auth/userRepository.ts
new file mode 100644
index 0000000..941b6f3
--- /dev/null
+++ b/app/src/auth/userRepository.ts
@@ -0,0 +1,42 @@
+import { doc, onSnapshot, runTransaction, serverTimestamp, type Unsubscribe } from 'firebase/firestore';
+import { db } from '../lib/firebase';
+
+export interface UserProfile {
+  onboardingCompleted: boolean;
+}
+
+// Idempotent: creates users/{uid} with the defaults only when it does not exist yet, so a reload or another
+// device never overwrites existing data (createdAt is written once).
+export function ensureUserProfile(uid: string): Promise<UserProfile> {
+  const ref = doc(db, 'users', uid);
+  return runTransaction(db, async (tx) => {
+    const snapshot = await tx.get(ref);
+    if (snapshot.exists()) {
+      return { onboardingCompleted: snapshot.data()?.onboardingCompleted === true };
+    }
+    tx.set(ref, {
+      createdAt: serverTimestamp(),
+      onboardingCompleted: false,
+      aiConsent: false,
+      reminderEnabled: false,
+    });
+    return { onboardingCompleted: false };
+  });
+}
+
+// Live view of users/{uid}, so changes made during the session (e.g. onboarding completed) are never stale.
+export function watchUserProfile(
+  uid: string,
+  onProfile: (profile: UserProfile) => void,
+  onError: (err: unknown) => void,
+): Unsubscribe {
+  return onSnapshot(
+    doc(db, 'users', uid),
+    (snap) => {
+      // Cache hits are not proof that the profile is current; startup uses the server transaction above.
+      if (snap.metadata.fromCache) return;
+      onProfile({ onboardingCompleted: snap.data()?.onboardingCompleted === true });
+    },
+    onError,
+  );
+}
diff --git a/app/src/pages/HomePlaceholder.tsx b/app/src/pages/HomePlaceholder.tsx
index 4d2c13f..c5685ed 100644
--- a/app/src/pages/HomePlaceholder.tsx
+++ b/app/src/pages/HomePlaceholder.tsx
@@ -1,11 +1,11 @@
-// Temporary landing until F-1.01/F-1.03 add the auth bootstrap and the app shell.
-export function HomePlaceholder() {
+import type { ReactNode } from 'react';
+
+// Minimal screen used while auth bootstraps and for routes whose features (tutorial, dashboard) come later.
+export function HomePlaceholder({ title = 'Pulsar', children }: { title?: string; children: ReactNode }) {
   return (
     <main className="mx-auto flex min-h-dvh w-full max-w-(--container-app) flex-col justify-center gap-2 px-margin">
-      <h1 className="font-headline-xl-mobile text-headline-xl-mobile">Pulsar</h1>
-      <p className="font-body-lg text-body-lg text-on-surface-variant">
-        Registre o que você faz e descubra possíveis relações com como você se sente.
-      </p>
+      <h1 className="font-headline-xl-mobile text-headline-xl-mobile">{title}</h1>
+      {children}
     </main>
   );
 }
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
