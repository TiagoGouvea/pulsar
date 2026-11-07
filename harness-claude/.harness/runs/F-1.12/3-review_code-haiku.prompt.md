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
  "id": "F-1.12",
  "title": "Tela de conta: sair e excluir conta",
  "description": "Em Configurações > Conta: sair (com aviso extra para anônimo: perderá acesso) e excluir conta com confirmação digitando EXCLUIR e reautenticação quando não anônima; chama deleteAccount e volta ao início com nova sessão anônima.",
  "acceptance": [
    "Botão excluir só habilita após digitar EXCLUIR",
    "Conta não anônima pede reautenticação antes",
    "Após excluir, o app volta ao início sem dados do usuário anterior",
    "Sair de conta anônima exige confirmação explícita"
  ],
  "specRefs": [
    "spec.md#3",
    "spec.md#7.3",
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
diff --git a/app/e2e/account-delete-reauth.spec.ts b/app/e2e/account-delete-reauth.spec.ts
new file mode 100644
index 0000000..00eb749
--- /dev/null
+++ b/app/e2e/account-delete-reauth.spec.ts
@@ -0,0 +1,110 @@
+import firebaseJson from '../firebase.json' with { type: 'json' };
+import { currentUid, expect, test } from './fixtures';
+
+// Companion of account-delete.spec.ts (which is protected): the linked-account flow there stops at
+// the reauthentication request. This spec opens the reauthentication link, finishes the deletion and
+// checks that the app restarts with a fresh anonymous session, as the account deletion review asked.
+
+const PROJECT = 'demo-pulsar';
+const AUTH = `http://127.0.0.1:${firebaseJson.emulators.auth.port}`;
+const FIRESTORE = `http://127.0.0.1:${firebaseJson.emulators.firestore.port}/v1/projects/${PROJECT}/databases/(default)/documents`;
+const OWNER = { Authorization: 'Bearer owner' };
+
+async function documentStatus(path: string): Promise<number> {
+  return (await fetch(`${FIRESTORE}/${path}`, { headers: OWNER })).status;
+}
+
+async function authUserIds(): Promise<string[]> {
+  // the emulator has no GET /emulator/v1/.../accounts (405); batchGet is the Admin SDK listUsers call
+  const response = await fetch(
+    `${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:batchGet?maxResults=1000`,
+    { headers: OWNER },
+  );
+  expect(response.ok).toBe(true);
+  const body = (await response.json()) as {
+    users?: { localId: string }[];
+    userInfo?: { localId: string }[];
+  };
+  const accounts = body.users ?? body.userInfo;
+  expect(accounts).toBeDefined();
+  return accounts!.map((account) => account.localId);
+}
+
+/** The most recent sign-in link the Auth Emulator recorded for the e-mail (what the user receives). */
+async function latestSignInLink(email: string): Promise<string> {
+  let link = '';
+  await expect
+    .poll(
+      async () => {
+        const response = await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/oobCodes`);
+        const { oobCodes } = (await response.json()) as {
+          oobCodes: { email: string; requestType: string; oobLink: string }[];
+        };
+        link =
+          oobCodes.filter((code) => code.email === email && code.requestType === 'EMAIL_SIGNIN').at(-1)
+            ?.oobLink ?? '';
+        return link;
+      },
+      { timeout: 15_000 },
+    )
+    .not.toBe('');
+  return link;
+}
+
+async function openDeletion(page: import('@playwright/test').Page) {
+  await page.getByRole('button', { name: /excluir conta/i }).click();
+  const dialog = page.getByRole('dialog');
+  await expect(dialog).toBeVisible();
+  return dialog;
+}
+
+test.describe('account deletion after e-mail reauthentication', () => {
+  test('a linked account finishes deletion after opening the reauthentication link', async ({
+    freshUserPage: page,
+  }, testInfo) => {
+    if (testInfo.project.name !== 'mobile') return;
+    const uid = (await currentUid(page))!;
+
+    // Link the anonymous account to an e-mail (Auth stores addresses in lower case).
+    const email = `reauth-${uid.toLowerCase()}@example.com`;
+    await page.goto('/settings');
+    await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible();
+    await page.getByRole('button', { name: /enviar link mágico/i }).click();
+    const field = page.getByLabel(/e-mail/i);
+    await field.fill(email);
+    await field.press('Enter');
+    await page.goto(await latestSignInLink(email));
+    await expect(page.getByTestId('account-status')).toContainText(email, { timeout: 15_000 });
+    expect(await currentUid(page)).toBe(uid);
+
+    // The first deletion attempt requires reauthentication and sends a link instead of deleting.
+    let dialog = await openDeletion(page);
+    await dialog.getByRole('textbox').fill('EXCLUIR');
+    await dialog.getByRole('button', { name: /excluir/i }).click();
+    await expect(dialog.getByText(/reautenticar/i)).toBeVisible();
+    expect(await documentStatus(`users/${uid}`)).toBe(200);
+
+    // Opening the link confirms the identity; the account is still intact afterwards.
+    await page.goto(await latestSignInLink(email));
+    await expect(page.getByText(/identidade confirmada/i)).toBeVisible({ timeout: 15_000 });
+    expect(await currentUid(page)).toBe(uid);
+    expect(await documentStatus(`users/${uid}`)).toBe(200);
+
+    // The second attempt goes through: deletion completes and a fresh anonymous session starts.
+    dialog = await openDeletion(page);
+    await dialog.getByRole('textbox').fill('EXCLUIR');
+    await dialog.getByRole('button', { name: /excluir/i }).click();
+    await expect(page).toHaveURL(/\/onboarding(?:[?#].*)?$/, { timeout: 30_000 });
+    await expect.poll(async () => (await currentUid(page)) !== uid, { timeout: 30_000 }).toBe(true);
+    const newUid = (await currentUid(page))!;
+    expect(newUid).toBeTruthy();
+    await expect.poll(() => documentStatus(`users/${uid}`)).toBe(404);
+    expect(await documentStatus(`users/${newUid}`)).toBe(200);
+    const remainingAccounts = await authUserIds();
+    expect(remainingAccounts).toContain(newUid);
+    expect(remainingAccounts).not.toContain(uid);
+
+    await page.goto('/settings');
+    await expect(page.getByTestId('account-status')).toContainText(/conta anônima/i);
+  });
+});
diff --git a/app/e2e/account-delete.spec.ts b/app/e2e/account-delete.spec.ts
new file mode 100644
index 0000000..32fc0b6
--- /dev/null
+++ b/app/e2e/account-delete.spec.ts
@@ -0,0 +1,279 @@
+import type { Page } from '@playwright/test';
+import firebaseJson from '../firebase.json' with { type: 'json' };
+import { currentUid, expect, test } from './fixtures';
+import { hasHorizontalOverflow, SENTINELS } from './support';
+
+const PROJECT = 'demo-pulsar';
+const AUTH = `http://127.0.0.1:${firebaseJson.emulators.auth.port}`;
+const FIRESTORE = `http://127.0.0.1:${firebaseJson.emulators.firestore.port}/v1/projects/${PROJECT}/databases/(default)/documents`;
+const OWNER = { Authorization: 'Bearer owner' };
+const FIXED_TIME = new Date('2026-01-01T12:00:00.000Z');
+
+interface FirestoreDocument {
+  name: string;
+  fields: Record<string, unknown>;
+}
+
+async function documents(path: string): Promise<FirestoreDocument[]> {
+  const response = await fetch(`${FIRESTORE}/${path}?pageSize=1000`, { headers: OWNER });
+  expect(response.ok).toBe(true);
+  return ((await response.json()) as { documents?: FirestoreDocument[] }).documents ?? [];
+}
+
+async function documentStatus(path: string): Promise<number> {
+  return (await fetch(`${FIRESTORE}/${path}`, { headers: OWNER })).status;
+}
+
+async function authUserIds(): Promise<string[]> {
+  // the emulator has no GET /emulator/v1/.../accounts (405); batchGet is the Admin SDK listUsers call
+  const response = await fetch(
+    `${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:batchGet?maxResults=1000`,
+    {
+      headers: OWNER,
+    },
+  );
+  expect(response.ok).toBe(true);
+  const body = (await response.json()) as {
+    users?: { localId: string }[];
+    userInfo?: { localId: string }[];
+  };
+  const accounts = body.users ?? body.userInfo;
+  expect(accounts).toBeDefined();
+  return accounts!.map((account) => account.localId);
+}
+
+// Copy real seed-shaped records into this test's own account; never delete the shared seed user.
+async function copySentinelRecords(uid: string): Promise<string[]> {
+  const indicators = await documents('users/seed-user-0001/indicators');
+  const entries = await documents('users/seed-user-0001/entries');
+  const selectedIndicators = indicators.filter((doc) =>
+    SENTINELS.slice(0, 3).some((sentinel) => JSON.stringify(doc.fields).includes(sentinel)),
+  );
+  const note = entries.find((doc) => JSON.stringify(doc.fields).includes(SENTINELS[3]!));
+  expect(selectedIndicators).toHaveLength(3);
+  expect(note).toBeDefined();
+
+  const paths: string[] = [];
+  for (const [collection, records] of [
+    ['indicators', selectedIndicators],
+    ['entries', [note!]],
+  ] as const) {
+    for (const record of records) {
+      const id = record.name.split('/').at(-1)!;
+      const path = `users/${uid}/${collection}/${id}`;
+      const response = await fetch(`${FIRESTORE}/${path}`, {
+        method: 'PATCH',
+        headers: { ...OWNER, 'Content-Type': 'application/json' },
+        body: JSON.stringify({ fields: record.fields }),
+      });
+      expect(response.ok).toBe(true);
+      paths.push(path);
+    }
+  }
+  return paths;
+}
+
+async function openSettings(page: Page) {
+  await page.clock.setFixedTime(FIXED_TIME);
+  await page.goto('/settings');
+  await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible();
+}
+
+async function openDeletion(page: Page) {
+  await page.getByRole('button', { name: /excluir conta/i }).click();
+  const dialog = page.getByRole('dialog');
+  await expect(dialog).toBeVisible();
+  await expect(dialog).toContainText(/EXCLUIR/);
+  return dialog;
+}
+
+async function latestEmailLink(email: string): Promise<string> {
+  let link = '';
+  await expect
+    .poll(
+      async () => {
+        const response = await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/oobCodes`);
+        expect(response.ok).toBe(true);
+        const { oobCodes } = (await response.json()) as {
+          oobCodes: { email: string; requestType: string; oobLink: string }[];
+        };
+        link =
+          oobCodes.filter((code) => code.email === email && code.requestType === 'EMAIL_SIGNIN').at(-1)
+            ?.oobLink ?? '';
+        return link;
+      },
+      { timeout: 15_000 },
+    )
+    .not.toBe('');
+  return link;
+}
+
+async function linkEmail(page: Page, uid: string) {
+  // Auth stores e-mails in lower case; a mixed-case UID would never match the stored address
+  const email = `delete-${uid.toLowerCase()}@example.com`;
+  await openSettings(page);
+  await page.getByRole('button', { name: /enviar link mágico/i }).click();
+  const field = page.getByLabel(/e-mail/i);
+  await field.fill(email);
+  await field.press('Enter');
+  await page.goto(await latestEmailLink(email));
+  await expect(page.getByTestId('account-status')).toContainText(email, { timeout: 15_000 });
+  expect(await currentUid(page)).toBe(uid);
+}
+
+async function expectNoPreviousData(page: Page) {
+  for (const path of [
+    '/onboarding',
+    '/dashboard',
+    '/register',
+    '/indicators',
+    '/saved-insights',
+    '/settings',
+  ]) {
+    await page.goto(path);
+    const heading = page.getByRole('heading', { level: 1 });
+    await expect(heading).toBeVisible();
+    await expect(heading).not.toHaveText('Pulsar');
+    await page.waitForLoadState('networkidle');
+    const exposed = await page.evaluate(() => {
+      const attributes = Array.from(document.querySelectorAll('*')).flatMap((element) =>
+        Array.from(element.attributes)
+          .filter((attribute) => attribute.name === 'title' || attribute.name.startsWith('aria-'))
+          .map((attribute) => attribute.value),
+      );
+      const tooltips = Array.from(document.querySelectorAll('[role="tooltip"]')).map(
+        (element) => element.textContent ?? '',
+      );
+      return [document.body.innerText, ...attributes, ...tooltips].join('\n');
+    });
+    for (const sentinel of SENTINELS) expect(exposed).not.toContain(sentinel);
+  }
+}
+
+test.describe('account deletion and sign-out', () => {
+  test('settings opens without horizontal overflow (desktop smoke)', async ({ freshUserPage: page }) => {
+    await openSettings(page);
+    expect(await hasHorizontalOverflow(page)).toBe(false);
+  });
+
+  test('deletion requires the exact confirmation and can be cancelled', async ({
+    freshUserPage: page,
+  }, testInfo) => {
+    if (testInfo.project.name !== 'mobile') return;
+    const uid = (await currentUid(page))!;
+    const paths = await copySentinelRecords(uid);
+    await openSettings(page);
+    const dialog = await openDeletion(page);
+    const field = dialog.getByRole('textbox');
+    const confirm = dialog.getByRole('button', { name: /excluir/i });
+    await expect(confirm).toBeDisabled();
+    for (const value of ['excluir', 'EXCLUI', 'EXCLUIR!', ' EXCLUIR']) {
+      await field.fill(value);
+      await expect(confirm).toBeDisabled();
+    }
+    await field.fill('EXCLUIR');
+    await expect(confirm).toBeEnabled();
+    await field.fill('');
+    await expect(confirm).toBeDisabled();
+    await dialog.getByRole('button', { name: /cancelar/i }).click();
+    await expect(dialog).toBeHidden();
+    expect(await currentUid(page)).toBe(uid);
+    for (const path of paths) expect(await documentStatus(path)).toBe(200);
+  });
+
+  test('a linked account must reauthenticate before it can be deleted', async ({
+    freshUserPage: page,
+  }, testInfo) => {
+    if (testInfo.project.name !== 'mobile') return;
+    const uid = (await currentUid(page))!;
+    const paths = await copySentinelRecords(uid);
+    await linkEmail(page, uid);
+    const dialog = await openDeletion(page);
+    await dialog.getByRole('textbox').fill('EXCLUIR');
+    await dialog.getByRole('button', { name: /excluir/i }).click();
+
+    await expect(
+      page
+        .getByText(
+          /reautentica|autentique novamente|entrar novamente|confirmar (sua )?identidade|verificar (sua )?identidade/i,
+        )
+        .first(),
+    ).toBeVisible();
+    expect(await currentUid(page)).toBe(uid);
+    expect(await documentStatus(`users/${uid}`)).toBe(200);
+    for (const path of paths) expect(await documentStatus(path)).toBe(200);
+  });
+
+  test('deletion removes the old account and starts a clean anonymous session', async ({
+    freshUserPage: page,
+  }, testInfo) => {
+    if (testInfo.project.name !== 'mobile') return;
+    const oldUid = (await currentUid(page))!;
+    const paths = await copySentinelRecords(oldUid);
+    for (const path of paths) expect(await documentStatus(path)).toBe(200);
+    expect(await authUserIds()).toContain(oldUid);
+    await openSettings(page);
+    const dialog = await openDeletion(page);
+    await dialog.getByRole('textbox').fill('EXCLUIR');
+    await dialog.getByRole('button', { name: /excluir/i }).click();
+
+    await expect(page).toHaveURL(/\/onboarding(?:[?#].*)?$/, { timeout: 30_000 });
+    await expect
+      .poll(
+        async () => {
+          const uid = await currentUid(page);
+          return uid !== null && uid !== oldUid;
+        },
+        { timeout: 30_000 },
+      )
+      .toBe(true);
+    const newUid = (await currentUid(page))!;
+    expect(newUid).toBeTruthy();
+    await expect.poll(() => documentStatus(`users/${oldUid}`)).toBe(404);
+    for (const path of paths) expect(await documentStatus(path)).toBe(404);
+    expect(await documentStatus(`users/${newUid}`)).toBe(200);
+    const remainingAccounts = await authUserIds();
+    expect(remainingAccounts).toContain(newUid);
+    expect(remainingAccounts).not.toContain(oldUid);
+    await expectNoPreviousData(page);
+    await expect(page.getByTestId('account-status')).toContainText(/conta anônima/i);
+    await page.reload();
+    await expect.poll(() => currentUid(page)).toBe(newUid);
+  });
+
+  test('anonymous sign-out requires an explicit confirmation and warns about lost access', async ({
+    freshUserPage: page,
+  }, testInfo) => {
+    if (testInfo.project.name !== 'mobile') return;
+    const oldUid = (await currentUid(page))!;
+    const paths = await copySentinelRecords(oldUid);
+    await openSettings(page);
+    await page.getByRole('button', { name: /sair/i }).click();
+    const dialog = page.getByRole('dialog');
+    await expect(dialog).toBeVisible();
+    await expect(dialog).toContainText(/perder|inacessível/i);
+    await expect(dialog).toContainText(/acesso|dados|registros/i);
+    expect(await currentUid(page)).toBe(oldUid);
+    await dialog.getByRole('button', { name: /cancelar/i }).click();
+    await expect(dialog).toBeHidden();
+    expect(await currentUid(page)).toBe(oldUid);
+    for (const path of paths) expect(await documentStatus(path)).toBe(200);
+
+    await page.getByRole('button', { name: /sair/i }).click();
+    await dialog.getByRole('button', { name: /sair|confirmar/i }).click();
+    await expect
+      .poll(
+        async () => {
+          const uid = await currentUid(page);
+          return uid !== null && uid !== oldUid;
+        },
+        { timeout: 30_000 },
+      )
+      .toBe(true);
+    expect(await currentUid(page)).toBeTruthy();
+    await expect(page).toHaveURL(/\/onboarding(?:[?#].*)?$/, { timeout: 30_000 });
+    for (const path of paths) expect(await documentStatus(path)).toBe(200);
+    await expectNoPreviousData(page);
+    await expect(page.getByTestId('account-status')).toContainText(/conta anônima/i);
+  });
+});
diff --git a/app/src/auth/accountSession.ts b/app/src/auth/accountSession.ts
new file mode 100644
index 0000000..68da4d3
--- /dev/null
+++ b/app/src/auth/accountSession.ts
@@ -0,0 +1,47 @@
+import { GoogleAuthProvider, reauthenticateWithPopup, type User } from 'firebase/auth';
+import { httpsCallable } from 'firebase/functions';
+import { functions } from '../lib/firebase';
+import { sendEmailLink } from './linkAccount';
+
+const GOOGLE_PROVIDER_ID = 'google.com';
+// Mirrors RECENT_LOGIN_SECONDS in functions/src/index.ts (deleteAccount rejects older logins).
+const RECENT_REAUTH_MS = 5 * 60 * 1000;
+const REAUTH_AT_KEY = 'pulsar.reauthenticatedAt';
+
+/** Records a completed reauthentication, bound to the UID it confirms (see recentReauthenticationFor). */
+export function markReauthenticated(user: User): void {
+  window.sessionStorage.setItem(REAUTH_AT_KEY, `${user.uid}:${Date.now()}`);
+}
+
+/** True when this exact user confirmed their identity within the reauthentication window. */
+function recentReauthenticationFor(user: User): boolean {
+  const stored = window.sessionStorage.getItem(REAUTH_AT_KEY);
+  const separator = stored?.indexOf(':');
+  if (!stored || separator === undefined || separator < 0) return false;
+  const uid = stored.slice(0, separator);
+  const at = Number(stored.slice(separator + 1));
+  // The confirmation belongs to one account only: signing out or switching users invalidates it.
+  return uid === user.uid && Date.now() - at <= RECENT_REAUTH_MS;
+}
+
+/**
+ * Makes sure a non-anonymous user confirmed their identity just before a destructive action. Google
+ * reauthenticates in a popup ('ready'); e-mail sends a link that /settings consumes (see
+ * completeEmailReauth) and returns 'link-sent'.
+ */
+export async function ensureRecentLogin(user: User): Promise<'ready' | 'link-sent'> {
+  if (recentReauthenticationFor(user)) return 'ready';
+  if (user.providerData.some((provider) => provider.providerId === GOOGLE_PROVIDER_ID)) {
+    await reauthenticateWithPopup(user, new GoogleAuthProvider());
+    markReauthenticated(user);
+    return 'ready';
+  }
+  if (!user.email) throw new Error('A non-anonymous account must have an e-mail to reauthenticate.');
+  await sendEmailLink(user.email, { reauth: '1' });
+  return 'link-sent';
+}
+
+/** Deletes the caller's account and all its data on the server; the caller then signs out locally. */
+export async function deleteCurrentAccount(): Promise<void> {
+  await httpsCallable<void, { deleted: boolean }>(functions, 'deleteAccount')();
+}
diff --git a/app/src/auth/linkAccount.ts b/app/src/auth/linkAccount.ts
index 220bf92..e8f2308 100644
--- a/app/src/auth/linkAccount.ts
+++ b/app/src/auth/linkAccount.ts
@@ -5,6 +5,7 @@ import {
   isSignInWithEmailLink,
   linkWithCredential,
   linkWithPopup,
+  reauthenticateWithCredential,
   sendSignInLinkToEmail,
   signInWithCredential,
   signInWithEmailLink,
@@ -95,11 +96,12 @@ export async function linkWithGoogle(): Promise<LinkResult> {
 }
 
 /** Sends an in-app link and durably associates the typed address with the pending request. */
-export async function sendEmailLink(email: string): Promise<void> {
+export async function sendEmailLink(email: string, extraParams: Record<string, string> = {}): Promise<void> {
   const normalizedEmail = email.trim();
   const uid = requireCurrentUser().uid;
   const returnUrl = new URL('/settings', window.location.origin);
   returnUrl.searchParams.set('linkUid', uid);
+  for (const [key, value] of Object.entries(extraParams)) returnUrl.searchParams.set(key, value);
   const previousEmail = window.localStorage.getItem(EMAIL_FOR_LINK_KEY);
   // Keep the address before awaiting the request: the browser may open the emailed URL as soon as
   // the emulator/mail provider receives it. Roll back the optimistic write if sending fails.
@@ -186,6 +188,21 @@ export function completeEmailLink(href: string, typedEmail?: string): Promise<Em
   return attempt;
 }
 
+/** True for the e-mail link sent by `reauthenticate` (account deletion) when it is opened on /settings. */
+export function isReauthLink(href: string): boolean {
+  const actionUrl = new URL(href);
+  return actionUrl.searchParams.get('reauth') === '1' || continueUrlParams(actionUrl).get('reauth') === '1';
+}
+
+/** Confirms the current user's identity with the e-mail link; it never changes the UID. */
+export async function completeEmailReauth(href: string): Promise<void> {
+  const user = requireCurrentUser();
+  const email = window.localStorage.getItem(EMAIL_FOR_LINK_KEY);
+  if (!email) throw new Error('The e-mail for the reauthentication link is missing.');
+  await reauthenticateWithCredential(user, EmailAuthProvider.credentialWithLink(email, href));
+  window.localStorage.removeItem(EMAIL_FOR_LINK_KEY);
+}
+
 /** Re-sends an access link (plain sign-in) for the existing account after the code was consumed. */
 async function resendExistingAccountLink(email: string): Promise<void> {
   const normalizedEmail = email.trim();
diff --git a/app/src/lib/firebase.ts b/app/src/lib/firebase.ts
index 5f6fbaa..f42ec02 100644
--- a/app/src/lib/firebase.ts
+++ b/app/src/lib/firebase.ts
@@ -1,6 +1,7 @@
 import { initializeApp } from 'firebase/app';
 import { connectAuthEmulator, getAuth } from 'firebase/auth';
 import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
+import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
 import { emulators } from '../../firebase.json';
 import { emulatorsEnabled } from './env';
 
@@ -18,9 +19,12 @@ export const firebaseApp = initializeApp({
 
 export const auth = getAuth(firebaseApp);
 export const db = getFirestore(firebaseApp);
+// Cloud Functions live in Brazil (DECISOES.md), so the callable client must target the same region.
+export const functions = getFunctions(firebaseApp, 'southamerica-east1');
 
 if (emulatorsEnabled) {
   const host = window.location.hostname || '127.0.0.1';
   connectAuthEmulator(auth, `http://${host}:${emulators.auth.port}`, { disableWarnings: true });
   connectFirestoreEmulator(db, host, emulators.firestore.port);
+  connectFunctionsEmulator(functions, host, emulators.functions.port);
 }
diff --git a/app/src/pages/SettingsPage.tsx b/app/src/pages/SettingsPage.tsx
index ce2e31e..52f5212 100644
--- a/app/src/pages/SettingsPage.tsx
+++ b/app/src/pages/SettingsPage.tsx
@@ -1,8 +1,12 @@
 import { useEffect, useRef, useState, type FormEvent } from 'react';
 import { Link, useNavigate } from 'react-router';
+import { signOut } from 'firebase/auth';
 import { useAuth } from '../auth/AuthProvider';
+import { deleteCurrentAccount, ensureRecentLogin, markReauthenticated } from '../auth/accountSession';
 import {
   completeEmailLink,
+  completeEmailReauth,
+  isReauthLink,
   linkWithGoogle,
   sendEmailLink,
   signInToExistingAccount,
@@ -57,6 +61,10 @@ export function SettingsPage() {
   const [conflictError, setConflictError] = useState<string | null>(null);
   const [confirmExisting, setConfirmExisting] = useState(false);
   const [needsEmailCompletion, setNeedsEmailCompletion] = useState(false);
+  const [dialog, setDialog] = useState<'sign-out' | 'delete' | null>(null);
+  const [confirmText, setConfirmText] = useState('');
+  const [dialogNotice, setDialogNotice] = useState<string | null>(null);
+  const [dialogError, setDialogError] = useState<string | null>(null);
   const processedHref = useRef<string | null>(null);
 
   function finishLink(result: CompletedLinkResult, completedWithEmail = false) {
@@ -93,6 +101,21 @@ export function SettingsPage() {
       finishLink(completedActionLink.result, true);
       return;
     }
+    if (isReauthLink(href)) {
+      setBusy(true);
+      completeEmailReauth(href)
+        .then(() => {
+          const current = auth.currentUser;
+          if (current) markReauthenticated(current);
+          setMessage('Identidade confirmada. Abra "Excluir conta" novamente para concluir.');
+        })
+        .catch((reason: unknown) => setError(actionError(reason)))
+        .finally(() => {
+          setBusy(false);
+          navigate('/settings', { replace: true });
+        });
+      return;
+    }
 
     setBusy(true);
     void completeEmailLink(href)
@@ -190,6 +213,75 @@ export function SettingsPage() {
     }
   }
 
+  function openDialog(kind: 'sign-out' | 'delete') {
+    setDialog(kind);
+    setConfirmText('');
+    setDialogNotice(null);
+    setDialogError(null);
+  }
+
+  function closeDialog() {
+    if (busy) return;
+    setDialog(null);
+  }
+
+  async function confirmSignOut() {
+    if (busy) return;
+    setBusy(true);
+    setDialogError(null);
+    try {
+      await signOut(auth);
+      setDialog(null);
+      // AuthProvider signs in a fresh anonymous session as soon as the previous one ends.
+      navigate('/onboarding', { replace: true });
+    } catch (reason) {
+      setDialogError(actionError(reason));
+    } finally {
+      setBusy(false);
+    }
+  }
+
+  async function confirmDelete() {
+    if (busy || confirmText !== 'EXCLUIR') return;
+    setBusy(true);
+    setDialogNotice(null);
+    setDialogError(null);
+    let deletionStarted = false;
+    try {
+      const current = auth.currentUser;
+      if (current && !current.isAnonymous) {
+        // deleteAccount only accepts a login from the last few minutes, so reauthenticate right before it.
+        if ((await ensureRecentLogin(current)) === 'link-sent') {
+          setDialogNotice(
+            `Por segurança, é preciso reautenticar sua conta antes de excluí-la. Enviamos um link para ${current.email}. Abra-o neste aparelho e depois exclua novamente.`,
+          );
+          return;
+        }
+      }
+      deletionStarted = true;
+      await deleteCurrentAccount();
+    } catch (reason) {
+      if (deletionStarted) {
+        // The server removes subcollections one by one, so a failure here leaves an uncertain result:
+        // part of the data may already be gone. Never claim that nothing was changed.
+        setDialogError(
+          'Não foi possível confirmar a exclusão da sua conta. O resultado é incerto: parte dos dados pode já ter sido apagada no servidor. Tente novamente; se o problema continuar, entre em contato com o suporte antes de recriar sua conta.',
+        );
+      } else {
+        // The failure happened during reauthentication, before any destructive call ran.
+        setDialogError(actionError(reason));
+      }
+      return;
+    } finally {
+      setBusy(false);
+    }
+    setDialog(null);
+    // The account is already gone on the server; a local failure here must not trap the person in
+    // the sheet. AuthProvider reacts to the ended session by starting a fresh anonymous one.
+    await signOut(auth).catch(() => undefined);
+    navigate('/onboarding', { replace: true });
+  }
+
   return (
     <div className="flex w-full flex-col gap-space-lg pb-8">
       <div className="flex flex-col gap-1">
@@ -293,6 +385,15 @@ export function SettingsPage() {
         )}
       </Card>
 
+      <Card className="gap-space-md p-space-lg">
+        <Button variant="neutral" onClick={() => openDialog('sign-out')} disabled={busy}>
+          Sair da conta
+        </Button>
+        <Button variant="danger" onClick={() => openDialog('delete')} disabled={busy}>
+          Excluir conta
+        </Button>
+      </Card>
+
       {busy && (
         <p
           role="status"
@@ -311,6 +412,79 @@ export function SettingsPage() {
         </p>
       )}
 
+      <Sheet
+        open={dialog === 'sign-out'}
+        onClose={closeDialog}
+        title="Sair da conta?"
+        description="Você voltará ao início com uma nova sessão anônima."
+      >
+        {anonymous && (
+          <p className="rounded-2xl bg-error-container p-3 font-body-md text-body-md text-on-error-container">
+            Esta conta é anônima. Ao sair, você perderá o acesso aos dados e registros salvos neste navegador.
+          </p>
+        )}
+        {dialogError && (
+          <p
+            role="alert"
+            className="rounded-2xl bg-error-container p-3 font-body-md text-body-md text-on-error-container"
+          >
+            {dialogError}
+          </p>
+        )}
+        <Button fullWidth onClick={confirmSignOut} disabled={busy}>
+          Sair
+        </Button>
+        <Button fullWidth variant="neutral" onClick={closeDialog} disabled={busy}>
+          Cancelar
+        </Button>
+      </Sheet>
+
+      <Sheet
+        open={dialog === 'delete'}
+        onClose={closeDialog}
+        title="Excluir conta"
+        description="A exclusão é imediata e definitiva. Registros, indicadores e dados pessoais serão apagados sem período de carência."
+      >
+        <label htmlFor="delete-confirmation" className="font-label-md text-label-md text-on-surface">
+          Para confirmar, digite EXCLUIR
+        </label>
+        <input
+          id="delete-confirmation"
+          type="text"
+          autoComplete="off"
+          value={confirmText}
+          onChange={(event) => setConfirmText(event.target.value)}
+          className="h-12 w-full rounded-full border border-outline-variant bg-surface-container-lowest px-4 font-body-lg text-body-lg text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary"
+        />
+        {dialogNotice && (
+          <p
+            role="status"
+            className="rounded-2xl bg-tertiary-fixed p-3 font-body-md text-body-md text-on-tertiary-fixed-variant"
+          >
+            {dialogNotice}
+          </p>
+        )}
+        {dialogError && (
+          <p
+            role="alert"
+            className="rounded-2xl bg-error-container p-3 font-body-md text-body-md text-on-error-container"
+          >
+            {dialogError}
+          </p>
+        )}
+        <Button
+          variant="danger"
+          fullWidth
+          onClick={confirmDelete}
+          disabled={busy || confirmText !== 'EXCLUIR'}
+        >
+          Excluir minha conta
+        </Button>
+        <Button fullWidth variant="neutral" onClick={closeDialog} disabled={busy}>
+          Cancelar
+        </Button>
+      </Sheet>
+
       <Sheet
         open={conflict !== null}
         onClose={closeConflict}
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
