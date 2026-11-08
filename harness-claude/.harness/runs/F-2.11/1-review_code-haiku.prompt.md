Você é um worker de um harness autônomo. Contexto limpo: tudo que importa está nos arquivos citados.
Regras:
- Trabalhe SOMENTE no diretório atual (worktree). Não acesse .env nem fora do projeto.
- Não edite arquivos listados como protegidos. Não use .skip/.only. Não enfraqueça asserts.
- Siga app/AGENTS.md, DECISOES.md e o design system (design/pulsar_bio_analytics/DESIGN.md → app/src/design/).
- Design em `design/`: uma pasta por tela com `screen.png` (mockup) e `code.html` (HTML/Tailwind de referência: copie estrutura, classes e textos, mas reescreva em React com os componentes do design system); `pulsar_mapeamento_de_telas_x_especifica_o_funcional_v1.1.md` liga cada tela às seções da spec. Em conflito, a spec (docs/) vence: o app é somente mobile, ignore breakpoints/layouts de desktop do design.
- Código, nomes e comentários em inglês; textos de interface somente em pt-BR. Gerenciador de pacotes: yarn.
- Não faça git commit/push/checkout: o orquestrador cuida do git.
- Nunca altere `node_modules` nem dependências de terceiros (nem por script/patch/postinstall) para fazer algo passar; não mude `scripts` do package.json, lockfiles ou configs de infraestrutura sem que a feature peça. Se a infraestrutura impede a tarefa, registre em .harness/inbox/questions.jsonl e pare.
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
- Testes escritos pelo próprio implementador (feature sem teste protegido): cobrem cada critério de aceite e falhariam sem a implementação; teste trivial ou que não verifica o critério é `major`.
- Escopo: código além do que a feature pede (telas/fluxos de outras features) é `major`; remover ou quebrar código de features já entregues é `blocker`.
- Segurança (Security Rules, dados entre usuários, segredos), privacidade (nomes de indicadores só via `<IndicatorLabel>`), aderência à spec e qualidade (tipos, legibilidade, duplicação).

## Feature
```json
{
  "id": "F-2.11",
  "title": "Convite discreto para salvar a conta",
  "description": "Regra pura (src/account/invite.ts): mostrar banner dispensável no dashboard para conta anônima com registros em 3 dias distintos; dispensado, volta só após mais 7 dias com registro. Banner leva à conversão (F-1.09). Estado de dispensa salvo em users/{uid} nos campos definidos e validados por F-1.08: saveAccountInviteDismissedAt (timestamp de servidor) e saveAccountInviteDismissedDayCount (dias distintos com registro no momento da dispensa); reaparece quando dias distintos atuais >= saveAccountInviteDismissedDayCount + 7.",
  "acceptance": [
    "Não aparece com < 3 dias distintos; aparece com 3",
    "Dispensado só reaparece após 7 novos dias com registro",
    "Nunca aparece para conta já convertida; nunca bloqueia o uso"
  ],
  "specRefs": [
    "spec.md#3",
    "DECISOES.md#Login"
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
diff --git a/app/e2e/save-account-banner.spec.ts b/app/e2e/save-account-banner.spec.ts
new file mode 100644
index 0000000..b69f588
--- /dev/null
+++ b/app/e2e/save-account-banner.spec.ts
@@ -0,0 +1,114 @@
+import type { APIRequestContext, Page } from '@playwright/test';
+import firebaseJson from '../firebase.json' with { type: 'json' };
+import { currentUid, expect, test } from './fixtures';
+
+const PROJECT = 'demo-pulsar';
+const FIRESTORE_DOCUMENTS = `http://127.0.0.1:${firebaseJson.emulators.firestore.port}/v1/projects/${PROJECT}/databases/(default)/documents`;
+const OWNER = { Authorization: 'Bearer owner' };
+
+/** UID of the signed-in user, waiting for the anonymous session to settle. */
+async function signedInUid(page: Page): Promise<string> {
+  await expect.poll(() => currentUid(page), { timeout: 30_000 }).not.toBeNull();
+  return (await currentUid(page)) ?? '';
+}
+
+/** Day key (YYYY-MM-DD) of the day that ended `daysAgo` days ago, in UTC. */
+function dayKey(daysAgo: number): string {
+  const date = new Date();
+  date.setUTCDate(date.getUTCDate() - daysAgo);
+  return date.toISOString().slice(0, 10);
+}
+
+/** Writes an entry straight into the Firestore emulator (rules bypassed as owner). */
+async function createEntry(
+  request: APIRequestContext,
+  uid: string,
+  day: string,
+  index: number,
+): Promise<void> {
+  const response = await request.patch(`${FIRESTORE_DOCUMENTS}/users/${uid}/entries/e2e-${day}-${index}`, {
+    headers: OWNER,
+    data: {
+      fields: {
+        indicatorId: { stringValue: 'e2e-indicator' },
+        localDate: { stringValue: day },
+        recordedAt: { timestampValue: new Date().toISOString() },
+        valueType: { stringValue: 'numeric' },
+        value: { mapValue: { fields: { number: { doubleValue: 7 } } } },
+      },
+    },
+  });
+  expect(response.ok()).toBeTruthy();
+}
+
+/** Reads users/{uid} straight from the Firestore emulator (rules bypassed as owner). */
+async function userDoc(request: APIRequestContext, uid: string) {
+  const response = await request.get(`${FIRESTORE_DOCUMENTS}/users/${uid}`, { headers: OWNER });
+  expect(response.ok()).toBeTruthy();
+  return (await response.json()) as {
+    fields: Record<string, Record<string, unknown>>;
+  };
+}
+
+test.describe('save account invite banner', () => {
+  test('stays hidden with fewer than three distinct days with entries', async ({
+    freshUserPage: page,
+    request,
+  }) => {
+    await page.goto('/');
+    const uid = await signedInUid(page);
+
+    await createEntry(request, uid, dayKey(2), 1);
+    await createEntry(request, uid, dayKey(1), 1);
+
+    await page.goto('/dashboard');
+    await expect(page.getByTestId('save-account-invite-slot')).toHaveAttribute('data-invite-state', 'hidden');
+    await expect(page.getByTestId('save-account-invite')).toHaveCount(0);
+  });
+
+  test('shows on the third day, can be dismissed and comes back after seven more days', async ({
+    freshUserPage: page,
+    request,
+  }) => {
+    await page.goto('/');
+    const uid = await signedInUid(page);
+
+    await createEntry(request, uid, dayKey(3), 1);
+    await createEntry(request, uid, dayKey(2), 2);
+    await createEntry(request, uid, dayKey(1), 3);
+
+    await page.goto('/dashboard');
+    const banner = page.getByTestId('save-account-invite');
+    await expect(banner).toBeVisible();
+    // The invite leads to the account conversion and never blocks the rest of the dashboard.
+    await expect(banner.getByRole('link', { name: /Salvar minha conta/ })).toHaveAttribute(
+      'href',
+      '/settings',
+    );
+    await expect(page.getByRole('link', { name: 'Registrar agora' })).toBeVisible();
+
+    await banner.getByRole('button', { name: 'Agora não' }).click();
+    await expect(banner).toHaveCount(0);
+
+    const stored = await userDoc(request, uid);
+    expect(stored.fields.saveAccountInviteDismissedDayCount).toEqual({ integerValue: '3' });
+    expect(stored.fields.saveAccountInviteDismissedAt).toHaveProperty('timestampValue');
+
+    // The dismissal survives a reload.
+    await page.reload();
+    await expect(page.getByTestId('save-account-invite')).toHaveCount(0);
+
+    // Seven more distinct days with entries bring the invite back.
+    for (const [index, daysAgo] of [9, 8, 7, 6, 5, 4, 0].entries()) {
+      await createEntry(request, uid, dayKey(daysAgo), index);
+    }
+    await page.reload();
+    await expect(page.getByTestId('save-account-invite')).toBeVisible();
+  });
+
+  test('never shows for an account that was already converted', async ({ seedPage: page }) => {
+    await page.goto('/dashboard');
+    await expect(page.getByTestId('save-account-invite-slot')).toHaveAttribute('data-invite-state', 'hidden');
+    await expect(page.getByTestId('save-account-invite')).toHaveCount(0);
+  });
+});
diff --git a/app/functions/node_modules b/app/functions/node_modules
deleted file mode 120000
index 188d989..0000000
--- a/app/functions/node_modules
+++ /dev/null
@@ -1 +0,0 @@
-/Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/app/functions/node_modules
\ No newline at end of file
diff --git a/app/node_modules b/app/node_modules
deleted file mode 120000
index 4a6eeda..0000000
--- a/app/node_modules
+++ /dev/null
@@ -1 +0,0 @@
-/Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/app/node_modules
\ No newline at end of file
diff --git a/app/scripts/icons.ts b/app/scripts/icons.ts
index 1438f1a..6a99c3f 100644
--- a/app/scripts/icons.ts
+++ b/app/scripts/icons.ts
@@ -14,6 +14,7 @@ const names = [
   'bolt',
   'check_circle',
   'close',
+  'cloud_sync',
   'coffee',
   'edit_note',
   'fitness_center',
diff --git a/app/src/App.tsx b/app/src/App.tsx
index 3d8b7a8..e3a76c6 100644
--- a/app/src/App.tsx
+++ b/app/src/App.tsx
@@ -4,6 +4,7 @@ import { AppShell } from './app/AppShell';
 import { AuthProvider, useAuth } from './auth/AuthProvider';
 import { Button } from './design';
 import { emulatorsEnabled } from './lib/env';
+import { DashboardPage } from './pages/DashboardPage';
 import { HomePlaceholder } from './pages/HomePlaceholder';
 import { IndicatorEditorPage } from './pages/IndicatorEditorPage';
 import { OnboardingPage } from './pages/OnboardingPage';
@@ -51,13 +52,7 @@ const routes: RouteObject[] = [
         path: '/dashboard',
         element: (
           <AppShell>
-            <PlaceholderPage
-              title="Seu painel"
-              icon="ssid_chart"
-              emptyTitle="Comece registrando o seu dia"
-              description="O Pulsar cruza fatores e resultados para revelar relações entre a sua rotina e como você se sente."
-              cta={{ label: 'Registrar agora', to: '/register' }}
-            />
+            <DashboardPage />
           </AppShell>
         ),
       },
diff --git a/app/src/account/SaveAccountInviteBanner.tsx b/app/src/account/SaveAccountInviteBanner.tsx
new file mode 100644
index 0000000..7d189ad
--- /dev/null
+++ b/app/src/account/SaveAccountInviteBanner.tsx
@@ -0,0 +1,119 @@
+import { useEffect, useState } from 'react';
+import { Link } from 'react-router';
+import { useAuth } from '../auth/AuthProvider';
+import { Button, Card, Icon } from '../design';
+import { shouldShowSaveAccountInvite } from './invite';
+import {
+  countDistinctEntryDays,
+  dismissSaveAccountInvite,
+  readSaveAccountInviteDismissal,
+} from './inviteRepository';
+
+interface InviteState {
+  distinctDaysWithEntries: number;
+  dismissedDayCount: number | null;
+}
+
+/**
+ * Discreet, dismissable banner that invites an anonymous person to save the account (spec 3).
+ *
+ * The banner never blocks the app: it is one more card on the dashboard and can be dismissed at
+ * any time. It only shows for anonymous accounts with entries in three distinct days, and comes
+ * back after seven more distinct days with entries (see `shouldShowSaveAccountInvite`).
+ */
+export function SaveAccountInviteBanner() {
+  const { user } = useAuth();
+  const [state, setState] = useState<InviteState | null>(null);
+  const [status, setStatus] = useState<'loading' | 'ready'>('loading');
+  const [dismissing, setDismissing] = useState(false);
+
+  const uid = user?.uid ?? null;
+  const isAnonymous = user?.isAnonymous === true;
+
+  useEffect(() => {
+    // A converted account is never invited again.
+    if (!uid || !isAnonymous) {
+      setState(null);
+      setStatus('ready');
+      return;
+    }
+    let cancelled = false;
+    Promise.all([countDistinctEntryDays(uid), readSaveAccountInviteDismissal(uid)])
+      .then(([distinctDaysWithEntries, dismissal]) => {
+        if (cancelled) return;
+        setState({ distinctDaysWithEntries, dismissedDayCount: dismissal.dayCount });
+        setStatus('ready');
+      })
+      .catch(() => {
+        // Without the numbers the banner cannot be decided; staying silent is safer than guessing.
+        if (!cancelled) {
+          setState(null);
+          setStatus('ready');
+        }
+      });
+    return () => {
+      cancelled = true;
+    };
+  }, [uid, isAnonymous]);
+
+  const visible =
+    status === 'ready' &&
+    state !== null &&
+    shouldShowSaveAccountInvite({
+      isAnonymous,
+      distinctDaysWithEntries: state.distinctDaysWithEntries,
+      dismissedDayCount: state.dismissedDayCount,
+    });
+
+  async function handleDismiss() {
+    if (!uid || !state || dismissing) return;
+    setDismissing(true);
+    try {
+      await dismissSaveAccountInvite(uid, state.distinctDaysWithEntries);
+      setState({ ...state, dismissedDayCount: state.distinctDaysWithEntries });
+    } catch {
+      // The dismissal could not be saved: keep the banner so the invite is not lost silently.
+    } finally {
+      setDismissing(false);
+    }
+  }
+
+  return (
+    <div
+      data-testid="save-account-invite-slot"
+      data-invite-state={visible ? 'visible' : status === 'ready' ? 'hidden' : 'loading'}
+      className="contents"
+    >
+      {visible && state && (
+        <Card data-testid="save-account-invite" className="gap-space-md p-space-md">
+          <div className="flex items-start gap-3">
+            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary-fixed text-secondary">
+              <Icon name="cloud_sync" className="text-[22px]" />
+            </span>
+            <div className="flex flex-col gap-0.5">
+              <h2 className="font-label-lg text-label-lg font-semibold text-on-surface">
+                Salve sua conta para não perder seus registros
+              </h2>
+              <p className="font-body-sm text-body-sm leading-snug text-on-surface-variant">
+                Seus registros ficam salvos apenas neste navegador. Vincule sua conta com Google ou e-mail
+                para acessá-los de qualquer aparelho.
+              </p>
+            </div>
+          </div>
+          <div className="flex flex-col gap-2 pt-1">
+            <Link
+              to="/settings"
+              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-4 font-label-md text-label-md text-on-primary transition-transform active:scale-[0.98]"
+            >
+              <Icon name="verified" className="text-[18px]" />
+              Salvar minha conta
+            </Link>
+            <Button variant="neutral" icon="close" onClick={handleDismiss} disabled={dismissing}>
+              Agora não
+            </Button>
+          </div>
+        </Card>
+      )}
+    </div>
+  );
+}
diff --git a/app/src/account/__tests__/invite.test.ts b/app/src/account/__tests__/invite.test.ts
new file mode 100644
index 0000000..623c144
--- /dev/null
+++ b/app/src/account/__tests__/invite.test.ts
@@ -0,0 +1,92 @@
+import { describe, expect, it } from 'vitest';
+import {
+  SAVE_ACCOUNT_INVITE_MIN_DAYS,
+  SAVE_ACCOUNT_INVITE_REAPPEAR_AFTER_DAYS,
+  countDistinctEntryDays,
+  shouldShowSaveAccountInvite,
+} from '../invite';
+
+describe('save account invite rule', () => {
+  it('stays hidden below three distinct days with entries and shows on the third', () => {
+    for (const days of [0, 1, 2]) {
+      expect(
+        shouldShowSaveAccountInvite({
+          isAnonymous: true,
+          distinctDaysWithEntries: days,
+          dismissedDayCount: null,
+        }),
+      ).toBe(false);
+    }
+    expect(SAVE_ACCOUNT_INVITE_MIN_DAYS).toBe(3);
+    expect(
+      shouldShowSaveAccountInvite({
+        isAnonymous: true,
+        distinctDaysWithEntries: 3,
+        dismissedDayCount: null,
+      }),
+    ).toBe(true);
+  });
+
+  it('comes back only after seven more distinct days with entries once dismissed', () => {
+    expect(SAVE_ACCOUNT_INVITE_REAPPEAR_AFTER_DAYS).toBe(7);
+    // Dismissed with three distinct days: the invite stays hidden until the tenth day.
+    for (const days of [3, 4, 5, 6, 7, 8, 9]) {
+      expect(
+        shouldShowSaveAccountInvite({
+          isAnonymous: true,
+          distinctDaysWithEntries: days,
+          dismissedDayCount: 3,
+        }),
+      ).toBe(false);
+    }
+    expect(
+      shouldShowSaveAccountInvite({
+        isAnonymous: true,
+        distinctDaysWithEntries: 10,
+        dismissedDayCount: 3,
+      }),
+    ).toBe(true);
+  });
+
+  it('counts the new days from the dismissal moment, not from the first invite', () => {
+    // Dismissed later (five distinct days): the invite returns on the twelfth day.
+    expect(
+      shouldShowSaveAccountInvite({
+        isAnonymous: true,
+        distinctDaysWithEntries: 11,
+        dismissedDayCount: 5,
+      }),
+    ).toBe(false);
+    expect(
+      shouldShowSaveAccountInvite({
+        isAnonymous: true,
+        distinctDaysWithEntries: 12,
+        dismissedDayCount: 5,
+      }),
+    ).toBe(true);
+  });
+
+  it('never shows for an account that was already converted', () => {
+    expect(
+      shouldShowSaveAccountInvite({
+        isAnonymous: false,
+        distinctDaysWithEntries: 30,
+        dismissedDayCount: null,
+      }),
+    ).toBe(false);
+    expect(
+      shouldShowSaveAccountInvite({
+        isAnonymous: false,
+        distinctDaysWithEntries: 30,
+        dismissedDayCount: 3,
+      }),
+    ).toBe(false);
+  });
+
+  it('counts each day with entries only once', () => {
+    expect(
+      countDistinctEntryDays(['2026-03-01', '2026-03-01', '2026-03-02', '2026-03-03', '2026-03-03']),
+    ).toBe(3);
+    expect(countDistinctEntryDays([])).toBe(0);
+  });
+});
diff --git a/app/src/account/invite.ts b/app/src/account/invite.ts
new file mode 100644
index 0000000..64fa295
--- /dev/null
+++ b/app/src/account/invite.ts
@@ -0,0 +1,44 @@
+/**
+ * Rule of the discreet "save your account" invite (spec 3 and DECISOES > Login).
+ *
+ * Pure and deterministic: no clock, no Firebase, no DOM. The caller passes the current numbers so
+ * the rule can be tested without a server.
+ */
+
+/** Distinct days with entries needed before the invite shows up. */
+export const SAVE_ACCOUNT_INVITE_MIN_DAYS = 3;
+
+/** Extra distinct days with entries needed before a dismissed invite comes back. */
+export const SAVE_ACCOUNT_INVITE_REAPPEAR_AFTER_DAYS = 7;
+
+export interface SaveAccountInviteInput {
+  /** True while the session still runs on the anonymous UID. */
+  isAnonymous: boolean;
+  /** Distinct days with at least one entry. */
+  distinctDaysWithEntries: number;
+  /** Distinct days counted when the invite was dismissed (null when it was never dismissed). */
+  dismissedDayCount: number | null;
+}
+
+/**
+ * True when the banner must be shown on the dashboard.
+ *
+ * - A converted (non anonymous) account never sees the invite.
+ * - Fewer than three distinct days with entries never shows it.
+ * - Once dismissed, it only comes back after seven more distinct days with entries.
+ */
+export function shouldShowSaveAccountInvite({
+  isAnonymous,
+  distinctDaysWithEntries,
+  dismissedDayCount,
+}: SaveAccountInviteInput): boolean {
+  if (!isAnonymous) return false;
+  if (distinctDaysWithEntries < SAVE_ACCOUNT_INVITE_MIN_DAYS) return false;
+  if (dismissedDayCount === null) return true;
+  return distinctDaysWithEntries >= dismissedDayCount + SAVE_ACCOUNT_INVITE_REAPPEAR_AFTER_DAYS;
+}
+
+/** Counts the distinct days (YYYY-MM-DD keys) that have at least one entry. */
+export function countDistinctEntryDays(localDates: readonly string[]): number {
+  return new Set(localDates).size;
+}
diff --git a/app/src/account/inviteRepository.ts b/app/src/account/inviteRepository.ts
new file mode 100644
index 0000000..d3b5415
--- /dev/null
+++ b/app/src/account/inviteRepository.ts
@@ -0,0 +1,90 @@
+import { doc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
+import { emulators } from '../../firebase.json';
+import { auth, db, firebaseApp } from '../lib/firebase';
+import { emulatorsEnabled } from '../lib/env';
+
+export interface SaveAccountInviteDismissal {
+  /** Server timestamp of the dismissal (null when the invite was never dismissed). */
+  dismissedAt: unknown;
+  /** Distinct days with entries when the invite was dismissed (null when never dismissed). */
+  dayCount: number | null;
+}
+
+/**
+ * Host of the Firestore REST API. The emulator answers on its own port; production uses the public
+ * endpoint.
+ */
+const firestoreRestHost = emulatorsEnabled
+  ? `http://${window.location.hostname}:${emulators.firestore.port}`
+  : 'https://firestore.googleapis.com';
+
+/**
+ * Lists the days (YYYY-MM-DD) that have entries, through the Firestore REST API.
+ *
+ * The SDK's `getDocs`/`getDoc` are implemented on top of the watch stream, which stays open and
+ * keeps every route network-active (the browser gates wait for network silence). The REST list is a
+ * unary request, so the dashboard stays quiet, exactly like the read-only transactions used by
+ * `src/data/indicators.ts`.
+ */
+async function listEntryDays(uid: string): Promise<string[]> {
+  const user = auth.currentUser;
+  if (!user) return [];
+  const token = await user.getIdToken();
+  const base = `${firestoreRestHost}/v1/projects/${firebaseApp.options.projectId}/databases/(default)/documents/users/${uid}/entries`;
+  const days = new Set<string>();
+  let pageToken = '';
+  do {
+    const query = new URLSearchParams({ pageSize: '300', 'mask.fieldPaths': 'localDate' });
+    if (pageToken) query.set('pageToken', pageToken);
+    const response = await fetch(`${base}?${query.toString()}`, {
+      headers: { Authorization: `Bearer ${token}` },
+    });
+    if (!response.ok) throw new Error('Could not read the entries of the user.');
+    const body = (await response.json()) as {
+      documents?: { fields?: { localDate?: { stringValue?: string } } }[];
+      nextPageToken?: string;
+    };
+    body.documents?.forEach((document) => {
+      const day = document.fields?.localDate?.stringValue;
+      if (day) days.add(day);
+    });
+    pageToken = body.nextPageToken ?? '';
+  } while (pageToken);
+  return [...days];
+}
+
+/** Counts the distinct days with entries of the given user. */
+export async function countDistinctEntryDays(uid: string): Promise<number> {
+  const days = await listEntryDays(uid);
+  return days.length;
+}
+
+/**
+ * Reads the dismissal state stored in users/{uid} (see DECISOES > Login). A read-only transaction
+ * uses a unary request, so the route does not keep Firestore's watch stream open.
+ */
+export async function readSaveAccountInviteDismissal(uid: string): Promise<SaveAccountInviteDismissal> {
+  const snapshot = await runTransaction(db, (transaction) => transaction.get(doc(db, 'users', uid)));
+  const data = snapshot.data() as
+    { saveAccountInviteDismissedAt?: unknown; saveAccountInviteDismissedDayCount?: unknown } | undefined;
+  const dayCount = data?.saveAccountInviteDismissedDayCount;
+  return {
+    dismissedAt: data?.saveAccountInviteDismissedAt ?? null,
+    dayCount: typeof dayCount === 'number' && Number.isInteger(dayCount) ? dayCount : null,
+  };
+}
+
+/**
+ * Stores the dismissal in users/{uid}: the server timestamp of the dismissal and the number of
+ * distinct days with entries at that moment, so the invite can come back after seven more days.
+ */
+export async function dismissSaveAccountInvite(uid: string, dayCount: number): Promise<void> {
+  await setDoc(
+    doc(db, 'users', uid),
+    {
+      saveAccountInviteDismissedAt: serverTimestamp(),
+      saveAccountInviteDismissedDayCount: dayCount,
+    },
+    { merge: true },
+  );
+}
diff --git a/app/src/design/icons.ts b/app/src/design/icons.ts
index e15cacd..e552a27 100644
--- a/app/src/design/icons.ts
+++ b/app/src/design/icons.ts
@@ -14,6 +14,8 @@ export const iconPaths = {
     'M424 -296L706 -578L650 -634L424 -408L310 -522L254 -466ZM480 -80Q397 -80 324 -111.5Q251 -143 197 -197Q143 -251 111.5 -324Q80 -397 80 -480Q80 -563 111.5 -636Q143 -709 197 -763Q251 -817 324 -848.5Q397 -880 480 -880Q563 -880 636 -848.5Q709 -817 763 -763Q817 -709 848.5 -636Q880 -563 880 -480Q880 -397 848.5 -324Q817 -251 763 -197Q709 -143 636 -111.5Q563 -80 480 -80ZM480 -160Q614 -160 707 -253Q800 -346 800 -480Q800 -614 707 -707Q614 -800 480 -800Q346 -800 253 -707Q160 -614 160 -480Q160 -346 253 -253Q346 -160 480 -160ZM480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Z',
   close:
     'M256 -200L200 -256L424 -480L200 -704L256 -760L480 -536L704 -760L760 -704L536 -480L760 -256L704 -200L480 -424Z',
+  cloud_sync:
+    'M160 -160L160 -240L269 -240Q218 -284 189 -346Q160 -408 160 -480Q160 -592 228 -677.5Q296 -763 400 -790L400 -706Q330 -681 285 -619.5Q240 -558 240 -480Q240 -426 261.5 -380.5Q283 -335 320 -302L320 -400L400 -400L400 -160ZM600 -160Q550 -160 515 -195Q480 -230 480 -280Q480 -328 513 -362.5Q546 -397 594 -399Q611 -435 644.5 -457.5Q678 -480 720 -480Q773 -480 811.5 -445.5Q850 -411 858 -360L858 -360Q900 -360 930 -331Q960 -302 960 -261Q960 -219 931 -189.5Q902 -160 860 -160ZM716 -520Q709 -561 689 -596Q669 -631 640 -658L640 -560L560 -560L560 -800L800 -800L800 -720L691 -720Q734 -682 761.5 -631Q789 -580 797 -520ZM600 -240L860 -240Q868 -240 874 -246Q880 -252 880 -260Q880 -268 874 -274Q868 -280 860 -280L790 -280L790 -330Q790 -359 769.5 -379.5Q749 -400 720 -400Q691 -400 670.5 -379.5Q650 -359 650 -330L650 -320L600 -320Q583 -320 571.5 -308.5Q560 -297 560 -280Q560 -263 571.5 -251.5Q583 -240 600 -240ZM720 -320Q720 -320 720 -320Q720 -320 720 -320Q720 -320 720 -320Q720 -320 720 -320L720 -320L720 -320Q720 -320 720 -320Q720 -320 720 -320Q720 -320 720 -320Q720 -320 720 -320L720 -320L720 -320Q720 -320 720 -320Q720 -320 720 -320Q720 -320 720 -320Q720 -320 720 -320Z',
   coffee:
     'M440 -240Q323 -240 241.5 -321.5Q160 -403 160 -520L160 -760Q160 -793 183.5 -816.5Q207 -840 240 -840L740 -840Q798 -840 839 -799Q880 -758 880 -700Q880 -642 839 -601Q798 -560 740 -560L720 -560L720 -520Q720 -403 638.5 -321.5Q557 -240 440 -240ZM240 -640L640 -640L640 -760L240 -760ZM440 -320Q523 -320 581.5 -378.5Q640 -437 640 -520L640 -560L240 -560L240 -520Q240 -437 298.5 -378.5Q357 -320 440 -320ZM720 -640L740 -640Q765 -640 782.5 -657.5Q800 -675 800 -700Q800 -725 782.5 -742.5Q765 -760 740 -760L720 -760ZM160 -120L160 -200L800 -200L800 -120ZM440 -560Q440 -560 440 -560Q440 -560 440 -560L440 -560L440 -560L440 -560Q440 -560 440 -560Q440 -560 440 -560Z',
   edit_note:
diff --git a/app/src/pages/DashboardPage.tsx b/app/src/pages/DashboardPage.tsx
new file mode 100644
index 0000000..fd264ac
--- /dev/null
+++ b/app/src/pages/DashboardPage.tsx
@@ -0,0 +1,21 @@
+import { SaveAccountInviteBanner } from '../account/SaveAccountInviteBanner';
+import { PlaceholderPage } from './PlaceholderPage';
+
+/**
+ * Dashboard screen. It shows the discreet "save your account" invite (anonymous accounts only)
+ * above the empty state that arrives with the dashboard feature.
+ */
+export function DashboardPage() {
+  return (
+    <div className="flex flex-col gap-space-lg">
+      <SaveAccountInviteBanner />
+      <PlaceholderPage
+        title="Seu painel"
+        icon="ssid_chart"
+        emptyTitle="Comece registrando o seu dia"
+        description="O Pulsar cruza fatores e resultados para revelar relações entre a sua rotina e como você se sente."
+        cta={{ label: 'Registrar agora', to: '/register' }}
+      />
+    </div>
+  );
+}
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
