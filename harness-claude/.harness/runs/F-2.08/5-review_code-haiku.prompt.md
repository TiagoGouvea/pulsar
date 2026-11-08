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
  "id": "F-2.08",
  "title": "Preenchimento rápido",
  "description": "/register conforme design/preenchimento_r_pido: seções Fatores e Resultados (indicadores ativos, na ordem), controles Sim/Não (Chip, com opção de limpar), Slider de escala, Chips ordinais, NumberInput com decimais; múltiplos mostram eventos de hoje e adicionam novo; observação opcional; feedback de salvamento/pendente/erro; voltar ao dashboard em um toque. Nenhum campo obrigatório.",
  "acceptance": [
    "Pode salvar só um fator ou só um resultado",
    "Limpar resposta de indicador único exclui o registro de hoje (ausência, não Não/0)",
    "Teclado decimal em números; aceita vírgula",
    "Falha de conexão mostra erro; nunca mostra 'salvo' antes de persistir",
    "Sem alerta de 'faltando responder'"
  ],
  "specRefs": [
    "spec.md#5.1",
    "spec.md#5.2",
    "spec.md#5.3",
    "spec.md#5.4",
    "spec.md#7.2"
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
diff --git a/app/e2e/quick-entry-connection.spec.ts b/app/e2e/quick-entry-connection.spec.ts
new file mode 100644
index 0000000..9a1a2e9
--- /dev/null
+++ b/app/e2e/quick-entry-connection.spec.ts
@@ -0,0 +1,58 @@
+import firebaseJson from '../firebase.json' with { type: 'json' };
+import { currentUid, expect, test } from './fixtures';
+
+const documents = `http://127.0.0.1:${firebaseJson.emulators.firestore.port}/v1/projects/demo-pulsar/databases/(default)/documents`;
+const headers = { Authorization: 'Bearer owner' };
+
+test('keeps a loaded answer pending offline until it is persisted', async ({
+  freshUserPage: page,
+  request,
+}) => {
+  const uid = await currentUid(page);
+  expect(uid).toBeTruthy();
+  const userDocuments = `${documents}/users/${uid}`;
+  const created = await request.patch(`${userDocuments}/indicators/exercise`, {
+    headers,
+    data: {
+      fields: {
+        group: { stringValue: 'factor' },
+        name: { stringValue: 'Exercício' },
+        abbreviation: { stringValue: 'EXE' },
+        emoji: { nullValue: null },
+        valueType: { stringValue: 'boolean' },
+        numeric: { nullValue: null },
+        scale: { nullValue: null },
+        options: { nullValue: null },
+        desiredDirection: { nullValue: null },
+        idealRange: { nullValue: null },
+        frequency: { stringValue: 'single_per_day' },
+        dailyAggregation: { nullValue: null },
+        sortOrder: { integerValue: '1' },
+        archivedAt: { nullValue: null },
+        lockedAt: { nullValue: null },
+        createdAt: { timestampValue: '2026-01-01T12:00:00Z' },
+        updatedAt: { timestampValue: '2026-01-01T12:00:00Z' },
+      },
+    },
+  });
+  expect(created.ok()).toBe(true);
+
+  await page.goto('/register');
+  const answer = page.getByTestId('quick-entry-card-exercise').getByRole('button', { name: 'Sim' });
+  await expect(answer).toBeVisible();
+  await page.context().setOffline(true);
+  await answer.click();
+
+  const feedback = page.getByTestId('save-feedback');
+  await expect(feedback).toContainText(/salvando|pendente/i);
+  await expect(feedback).not.toContainText(/salvo|sincronizado/i);
+  const offlineEntries = await request.get(`${userDocuments}/entries`, { headers });
+  expect(offlineEntries.ok()).toBe(true);
+  expect(((await offlineEntries.json()) as { documents?: unknown[] }).documents ?? []).toHaveLength(0);
+
+  await page.context().setOffline(false);
+  await expect(feedback).toContainText(/salvo|sincronizado/i, { timeout: 30_000 });
+  const persistedEntries = await request.get(`${userDocuments}/entries`, { headers });
+  expect(persistedEntries.ok()).toBe(true);
+  expect(((await persistedEntries.json()) as { documents?: unknown[] }).documents ?? []).toHaveLength(1);
+});
diff --git a/app/e2e/quick-entry.spec.ts b/app/e2e/quick-entry.spec.ts
new file mode 100644
index 0000000..acef242
--- /dev/null
+++ b/app/e2e/quick-entry.spec.ts
@@ -0,0 +1,388 @@
+/**
+ * E2E acceptance tests for F-2.08 (Preenchimento rápido). Written before the implementation.
+ *
+ * Observable contract of the /register screen (see also src/entry/__tests__/QuickEntry.test.tsx):
+ *  - Sections "Fatores" and "Resultados" with the ACTIVE indicators in sortOrder (archived ones
+ *    never render), cards exposed as data-testid=`quick-entry-card-${id}`, per-day events of
+ *    multiple-per-day indicators as data-testid="entry-event", save feedback as
+ *    data-testid="save-feedback" ("Salvando…/pendente" while pending, "Salvo/Sincronizado" only
+ *    after persisting, spec 5.4).
+ *  - Answers persist through the records repository (Firestore entries with the browser
+ *    localDate day key, UTC timestamps, spec 5.2); no field is required and no completeness
+ *    alert exists (spec 5.4); "Voltar ao Dashboard" returns in one touch (spec 7.2).
+ *
+ * Determinism: no real-clock assertions (the day key is computed the same way the seed and the
+ * app do it), no @visual markers, and the offline case relies only on Firestore's pending
+ * write queue. Fixture data is written straight into the Firestore emulator through its REST
+ * API (rules bypassed as owner), which works today.
+ */
+import type { APIRequestContext } from '@playwright/test';
+import firebaseJson from '../firebase.json' with { type: 'json' };
+import { SENTINELS as SEED_SENTINELS } from '../scripts/seed-data';
+import { currentUid, expect, test } from './fixtures';
+import { SENTINELS, visibleTextOutsideAllowList } from './support';
+
+const PROJECT = 'demo-pulsar';
+const FIRESTORE_DOCUMENTS = `http://127.0.0.1:${firebaseJson.emulators.firestore.port}/v1/projects/${PROJECT}/databases/(default)/documents`;
+const HEADERS = { Authorization: 'Bearer owner' };
+
+type FirestoreValue = Record<string, unknown> & {
+  nullValue?: unknown;
+  stringValue?: string;
+  integerValue?: string;
+  doubleValue?: number;
+  booleanValue?: boolean;
+  timestampValue?: string;
+  mapValue?: { fields?: Record<string, FirestoreValue> };
+};
+type FirestoreDocument = { name: string; fields?: Record<string, FirestoreValue> };
+
+function encodeValue(value: unknown): FirestoreValue {
+  if (value === null) return { nullValue: null };
+  if (typeof value === 'boolean') return { booleanValue: value };
+  if (typeof value === 'number') {
+    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
+  }
+  if (typeof value === 'string') return { stringValue: value };
+  if (value instanceof Date) return { timestampValue: value.toISOString() };
+  if (typeof value === 'object') {
+    return {
+      mapValue: {
+        fields: Object.fromEntries(
+          Object.entries(value as Record<string, unknown>).map(([key, inner]) => [key, encodeValue(inner)]),
+        ),
+      },
+    };
+  }
+  throw new Error(`Unsupported Firestore value: ${String(value)}`);
+}
+
+function encodeFields(data: Record<string, unknown>): Record<string, FirestoreValue> {
+  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encodeValue(value)]));
+}
+
+function decodeValue(value: FirestoreValue): unknown {
+  if ('nullValue' in value) return null;
+  if ('stringValue' in value) return value.stringValue;
+  if ('booleanValue' in value) return value.booleanValue;
+  if ('integerValue' in value) return Number(value.integerValue);
+  if ('doubleValue' in value) return Number(value.doubleValue);
+  if ('timestampValue' in value) return value.timestampValue;
+  if ('mapValue' in value) return decodeFields(value.mapValue?.fields);
+  return undefined;
+}
+
+function decodeFields(fields: Record<string, FirestoreValue> = {}): Record<string, unknown> {
+  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
+}
+
+/** Day key the same way the app computes it (browser timezone) and the seed does (São Paulo). */
+function saoPauloToday(): string {
+  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
+}
+
+/** Writes an indicator straight into the Firestore emulator (same shape as scripts/seed.ts). */
+async function createIndicator(
+  request: APIRequestContext,
+  uid: string,
+  indicator: IndicatorSeedDoc,
+): Promise<void> {
+  const { id, ...fields } = indicator;
+  const response = await request.patch(`${FIRESTORE_DOCUMENTS}/users/${uid}/indicators/${id}`, {
+    headers: HEADERS,
+    data: { fields: encodeFields(fields) },
+  });
+  expect(response.ok(), `indicator write failed: ${response.status()}`).toBeTruthy();
+}
+
+/** Writes an entry straight into the Firestore emulator (today in São Paulo by default). */
+async function createEntry(
+  request: APIRequestContext,
+  uid: string,
+  entry: { id: string; indicatorId: string; value: Record<string, unknown> },
+): Promise<void> {
+  const fields = {
+    indicatorId: entry.indicatorId,
+    localDate: saoPauloToday(),
+    recordedAt: new Date(),
+    valueType: 'numeric',
+    value: entry.value,
+    note: null,
+  };
+  const response = await request.patch(`${FIRESTORE_DOCUMENTS}/users/${uid}/entries/${entry.id}`, {
+    headers: HEADERS,
+    data: { fields: encodeFields(fields) },
+  });
+  expect(response.ok(), `entry write failed: ${response.status()}`).toBeTruthy();
+}
+
+/** A Firestore document of the user's entries, decoded to plain values. */
+type StoredEntryDoc = { id: string } & Record<string, unknown>;
+
+/** Today's entries of the given user, read straight from the Firestore emulator. */
+async function listTodayEntries(request: APIRequestContext, uid: string): Promise<StoredEntryDoc[]> {
+  const response = await request.get(`${FIRESTORE_DOCUMENTS}/users/${uid}/entries`, {
+    headers: HEADERS,
+    params: { pageSize: '300' },
+  });
+  expect(response.ok(), `entry list failed: ${response.status()}`).toBeTruthy();
+  const body = (await response.json()) as { documents?: FirestoreDocument[] };
+  const today = saoPauloToday();
+  return (body.documents ?? [])
+    .map((document): StoredEntryDoc => ({
+      id: document.name.split('/').pop() ?? '',
+      ...decodeFields(document.fields),
+    }))
+    .filter((entry) => entry.localDate === today);
+}
+
+/** An indicator document as the seed script writes it, with the id kept addressable. */
+type IndicatorSeedDoc = { id: string } & Record<string, unknown>;
+
+function indicatorDoc(overrides: { id: string } & Record<string, unknown>): IndicatorSeedDoc {
+  const base: Record<string, unknown> = {
+    group: 'factor',
+    name: 'Indicador',
+    abbreviation: null,
+    emoji: null,
+    valueType: 'boolean',
+    numeric: null,
+    scale: null,
+    options: null,
+    desiredDirection: null,
+    idealRange: null,
+    frequency: 'single_per_day',
+    dailyAggregation: null,
+    sortOrder: 1000,
+    archivedAt: null,
+    lockedAt: null,
+    createdAt: new Date('2026-10-01T12:00:00Z'),
+    updatedAt: new Date('2026-10-01T12:00:00Z'),
+  };
+  return { ...base, ...overrides };
+}
+
+const EXERCISE = indicatorDoc({ id: 'ind_exercise', name: 'Exercício', abbreviation: 'EXE', emoji: '🏃' });
+const ENERGY = indicatorDoc({
+  id: 'ind_energy',
+  group: 'result',
+  name: 'Nível de energia',
+  abbreviation: 'ENE',
+  valueType: 'scale',
+  scale: { min: 0, max: 10, step: 1 },
+  desiredDirection: 'higher',
+  sortOrder: 2000,
+});
+const SLEEP = indicatorDoc({
+  id: 'ind_sleep',
+  name: 'Sono',
+  abbreviation: 'SON',
+  valueType: 'numeric',
+  numeric: { unit: 'horas', min: 0, max: 24, step: 0.5 },
+  sortOrder: 3000,
+});
+const COFFEE = indicatorDoc({
+  id: 'ind_coffee',
+  name: 'Café',
+  abbreviation: 'CAF',
+  valueType: 'numeric',
+  numeric: { unit: 'xícaras', min: 0, max: null, step: 0.5 },
+  frequency: 'multiple_per_day',
+  dailyAggregation: 'sum',
+  sortOrder: 4000,
+});
+
+test.describe('F-2.08 quick entry (/register)', () => {
+  test('groups the active indicators under Fatores/Resultados in order and hides archived', async ({
+    seedPage: page,
+  }) => {
+    await page.goto('/dashboard');
+    await page.getByRole('link', { name: 'Registrar agora' }).click();
+    await expect(page).toHaveURL(/\/register$/);
+
+    await expect(page.getByRole('heading', { name: 'Fatores' })).toBeVisible();
+    await expect(page.getByRole('heading', { name: 'Resultados' })).toBeVisible();
+
+    // Active indicators only, each group in sortOrder (factors first, results after).
+    const cards = page.getByTestId(/^quick-entry-card-/);
+    await expect(cards).toHaveCount(9);
+    expect(
+      await cards.evaluateAll((elements) => elements.map((el) => el.getAttribute('data-testid'))),
+    ).toEqual([
+      'quick-entry-card-ind_exercise',
+      'quick-entry-card-ind_sleep',
+      'quick-entry-card-ind_coffee',
+      'quick-entry-card-ind_meditation',
+      'quick-entry-card-ind_energy',
+      'quick-entry-card-ind_focus',
+      'quick-entry-card-ind_headache',
+      'quick-entry-card-ind_mood',
+      'quick-entry-card-ind_weight',
+    ]);
+    await expect(page.getByTestId('quick-entry-card-ind_q10')).toHaveCount(0);
+
+    // Privacy: the eye starts closed, so the sentinel names of the seed stay hidden.
+    await expect(page.getByTestId('eye-toggle')).toHaveAttribute('aria-pressed', 'false');
+    const hiddenText = await visibleTextOutsideAllowList(page);
+    for (const sentinel of SENTINELS) expect(hiddenText).not.toContain(sentinel);
+
+    // Opening the eye reveals the full names on the register screen.
+    await page.getByTestId('eye-toggle').click();
+    await expect(page.getByTestId('quick-entry-card-ind_energy')).toContainText(SEED_SENTINELS.energy);
+  });
+
+  test('saves only one factor, persists with the local day key and returns in one touch', async ({
+    freshUserPage: page,
+    request,
+  }) => {
+    const uid = (await currentUid(page)) ?? '';
+    await createIndicator(request, uid, EXERCISE);
+    await createIndicator(request, uid, ENERGY);
+    await page.goto('/register');
+
+    const card = page.getByTestId('quick-entry-card-ind_exercise');
+    await card.getByRole('button', { name: 'Sim' }).click();
+
+    // Success feedback only after the write persisted (spec 5.4).
+    await expect(page.getByTestId('save-feedback')).toContainText(/salvo|sincronizado/i, {
+      timeout: 15_000,
+    });
+
+    const entries = await listTodayEntries(request, uid);
+    expect(entries).toHaveLength(1);
+    expect(entries[0]).toMatchObject({
+      indicatorId: 'ind_exercise',
+      localDate: saoPauloToday(),
+      valueType: 'boolean',
+      value: { boolean: true },
+    });
+    expect(Date.parse(String(entries[0]?.recordedAt))).not.toBeNaN();
+
+    // Partially filled day: no completeness alert, no required-field warning (spec 5.4).
+    await expect(page.getByRole('alert')).toHaveCount(0);
+    expect(await visibleTextOutsideAllowList(page)).not.toMatch(/faltando responder|obrigat/i);
+
+    // One touch back to the dashboard (spec 5.1.6).
+    await page.getByRole('button', { name: /voltar ao dashboard/i }).click();
+    await expect(page).toHaveURL(/\/dashboard$/);
+  });
+
+  test('saves only one result from the scale pills', async ({ freshUserPage: page, request }) => {
+    const uid = (await currentUid(page)) ?? '';
+    await createIndicator(request, uid, EXERCISE);
+    await createIndicator(request, uid, ENERGY);
+    await page.goto('/register');
+
+    const card = page.getByTestId('quick-entry-card-ind_energy');
+    await card.getByRole('radio', { name: '7' }).click();
+
+    await expect(page.getByTestId('save-feedback')).toContainText(/salvo|sincronizado/i);
+    const entries = await listTodayEntries(request, uid);
+    expect(entries).toHaveLength(1);
+    expect(entries[0]).toMatchObject({
+      indicatorId: 'ind_energy',
+      localDate: saoPauloToday(),
+      value: { number: 7 },
+    });
+  });
+
+  test('clearing a single-per-day answer removes today record (absence, not Não/0)', async ({
+    freshUserPage: page,
+    request,
+  }) => {
+    const uid = (await currentUid(page)) ?? '';
+    await createIndicator(request, uid, EXERCISE);
+    await page.goto('/register');
+
+    const card = page.getByTestId('quick-entry-card-ind_exercise');
+    await card.getByRole('button', { name: 'Sim' }).click();
+    await expect(page.getByTestId('save-feedback')).toContainText(/salvo|sincronizado/i);
+    await expect(card.getByRole('button', { name: 'Sim' })).toHaveAttribute('aria-pressed', 'true');
+
+    await card.getByRole('button', { name: /limpar/i }).click();
+
+    // The record is deleted; no "Não"/0 entry is written back (spec 5.2).
+    await expect(card.getByRole('button', { name: 'Sim' })).toHaveAttribute('aria-pressed', 'false');
+    await expect.poll(async () => (await listTodayEntries(request, uid)).length).toBe(0);
+  });
+
+  test('numeric fields use the decimal keyboard and accept the comma separator', async ({
+    freshUserPage: page,
+    request,
+  }) => {
+    const uid = (await currentUid(page)) ?? '';
+    await createIndicator(request, uid, SLEEP);
+    await page.goto('/register');
+
+    const input = page.getByTestId('quick-entry-card-ind_sleep').getByRole('textbox');
+    await expect(input).toHaveAttribute('inputmode', 'decimal');
+
+    await input.fill('7,5');
+    await input.blur();
+
+    await expect(page.getByTestId('save-feedback')).toContainText(/salvo|sincronizado/i);
+    const entries = await listTodayEntries(request, uid);
+    expect(entries).toHaveLength(1);
+    expect(entries[0]).toMatchObject({
+      indicatorId: 'ind_sleep',
+      localDate: saoPauloToday(),
+      value: { number: 7.5 },
+    });
+  });
+
+  test('multiple-per-day indicators list today events and append new ones', async ({
+    freshUserPage: page,
+    request,
+  }) => {
+    const uid = (await currentUid(page)) ?? '';
+    await createIndicator(request, uid, COFFEE);
+    await createEntry(request, uid, {
+      id: 'existing-event',
+      indicatorId: 'ind_coffee',
+      value: { number: 1 },
+    });
+    await page.goto('/register');
+
+    const card = page.getByTestId('quick-entry-card-ind_coffee');
+    const events = card.getByTestId('entry-event');
+    await expect(events).toHaveCount(1);
+    await expect(events.first()).toContainText('1');
+
+    // A new answer adds a new event for today (spec 5.2), it does not edit the old one.
+    await card.getByRole('textbox').fill('2');
+    await card.getByRole('button', { name: /adicionar/i }).click();
+
+    await expect(page.getByTestId('save-feedback')).toContainText(/salvo|sincronizado/i);
+    await expect(events).toHaveCount(2);
+
+    const stored = await listTodayEntries(request, uid);
+    expect(stored).toHaveLength(2);
+    expect(
+      stored.map((entry) => (entry.value as { number?: number }).number).sort((a, b) => (a ?? 0) - (b ?? 0)),
+    ).toEqual([1, 2]);
+  });
+
+  test('offline answers stay pending (never "saved") until the write persists', async ({
+    freshUserPage: page,
+    request,
+  }) => {
+    const uid = (await currentUid(page)) ?? '';
+    await createIndicator(request, uid, EXERCISE);
+    await page.goto('/register');
+
+    const card = page.getByTestId('quick-entry-card-ind_exercise');
+    await expect(card).toBeVisible(); // go offline only after the card loaded
+    await page.context().setOffline(true);
+    await card.getByRole('button', { name: 'Sim' }).click();
+
+    // While the connection is down: pending state, never success (spec 5.4).
+    await expect(page.getByTestId('save-feedback')).toContainText(/salvando|pendente/i);
+    await expect(page.getByTestId('save-feedback')).not.toContainText(/salvo|sincronizado/i);
+    expect(await listTodayEntries(request, uid)).toHaveLength(0);
+
+    // The pending write flushes once the connection returns, and only then shows success.
+    await page.context().setOffline(false);
+    await expect.poll(async () => (await listTodayEntries(request, uid)).length, { timeout: 30_000 }).toBe(1);
+    await expect(page.getByTestId('save-feedback')).toContainText(/salvo|sincronizado/i);
+  });
+});
diff --git a/app/src/App.tsx b/app/src/App.tsx
index 20e7949..30a2f34 100644
--- a/app/src/App.tsx
+++ b/app/src/App.tsx
@@ -10,6 +10,7 @@ import { IndicatorEditorPage } from './pages/IndicatorEditorPage';
 import { IndicatorsPage } from './pages/IndicatorsPage';
 import { OnboardingPage } from './pages/OnboardingPage';
 import { PlaceholderPage } from './pages/PlaceholderPage';
+import { QuickEntryPage } from './pages/QuickEntryPage';
 import { SettingsPage } from './pages/SettingsPage';
 import { PrivacyProvider } from './privacy/PrivacyContext';
 
@@ -61,12 +62,7 @@ const routes: RouteObject[] = [
         path: '/register',
         element: (
           <AppShell>
-            <PlaceholderPage
-              title="Registrar"
-              icon="edit_note"
-              emptyTitle="Preenchimento rápido"
-              description="Escolha os fatores e os resultados do dia e registre em poucos segundos."
-            />
+            <QuickEntryPage />
           </AppShell>
         ),
       },
diff --git a/app/src/data/__tests__/entries-concurrency.test.ts b/app/src/data/__tests__/entries-concurrency.test.ts
new file mode 100644
index 0000000..ef587a5
--- /dev/null
+++ b/app/src/data/__tests__/entries-concurrency.test.ts
@@ -0,0 +1,65 @@
+import { beforeEach, describe, expect, it, vi } from 'vitest';
+
+const firestore = vi.hoisted(() => ({
+  entries: [] as string[],
+  deleted: [] as string[],
+  commit: vi.fn(async () => {}),
+}));
+
+vi.mock('../../lib/firebase', () => ({ db: {} }));
+vi.mock('../../lib/time', () => ({ localDate: () => '2026-10-24' }));
+vi.mock('firebase/firestore', () => ({
+  collection: () => ({ path: 'entries' }),
+  doc: (_first: unknown, ...parts: string[]) =>
+    parts.length ? { id: parts.at(-1), path: parts.join('/') } : { id: 'new', path: 'entries/new' },
+  getDoc: async () => ({
+    exists: () => true,
+    data: () => ({ valueType: 'boolean', frequency: 'single_per_day', lockedAt: {} }),
+  }),
+  getDocs: async () => ({
+    docs: firestore.entries.map((id) => ({ id, ref: { id } })),
+  }),
+  query: () => ({}),
+  where: () => ({}),
+  serverTimestamp: () => ({}),
+  writeBatch: () => ({
+    update: vi.fn(),
+    set: vi.fn(),
+    delete: (ref: { id: string }) => firestore.deleted.push(ref.id),
+    commit: firestore.commit,
+  }),
+}));
+
+import { saveEntry } from '../entries';
+
+describe('replacing a visible answer', () => {
+  beforeEach(() => {
+    firestore.entries = [];
+    firestore.deleted = [];
+    firestore.commit.mockClear();
+  });
+
+  it('rejects an answer that appeared on another device without deleting it', async () => {
+    firestore.entries = ['seen', 'unseen'];
+    await expect(
+      saveEntry('user', {
+        indicatorId: 'indicator',
+        value: { boolean: true },
+        observedEntryIds: ['seen'],
+      }),
+    ).rejects.toThrow('another device');
+    expect(firestore.deleted).toEqual([]);
+    expect(firestore.commit).not.toHaveBeenCalled();
+  });
+
+  it('replaces the entries the user saw in one batch', async () => {
+    firestore.entries = ['seen'];
+    await saveEntry('user', {
+      indicatorId: 'indicator',
+      value: { boolean: false },
+      observedEntryIds: ['seen'],
+    });
+    expect(firestore.deleted).toEqual(['seen']);
+    expect(firestore.commit).toHaveBeenCalledOnce();
+  });
+});
diff --git a/app/src/data/entries.ts b/app/src/data/entries.ts
index d7ae838..7ff0680 100644
--- a/app/src/data/entries.ts
+++ b/app/src/data/entries.ts
@@ -5,10 +5,12 @@ import {
   getCountFromServer,
   getDoc,
   getDocs,
+  onSnapshot,
   query,
   serverTimestamp,
   where,
   writeBatch,
+  type Timestamp,
 } from 'firebase/firestore';
 import { validateEntryValue, type EntryValue } from '../domain/entry';
 import type { IndicatorInput } from '../domain/indicator';
@@ -20,6 +22,8 @@ export interface SaveEntryInput {
   indicatorId: string;
   value: EntryValue;
   note?: string;
+  /** IDs of the current day's entries shown to the user before replacing an answer. */
+  observedEntryIds?: readonly string[];
 }
 
 /** One-shot count for screens that must not keep a realtime channel open. */
@@ -58,6 +62,14 @@ export async function saveEntry(uid: string, input: SaveEntryInput): Promise<str
         )
       : null;
   if (localDate() !== day) throw new Error('The local day changed before the entry could be saved.');
+  if (previous && input.observedEntryIds) {
+    const observed = new Set(input.observedEntryIds);
+    if (previous.docs.some((entry) => !observed.has(entry.id))) {
+      const error = new Error('The answer changed on another device.');
+      error.name = 'EntryConflictError';
+      throw error;
+    }
+  }
 
   const entryRef = doc(entries);
   const batch = writeBatch(db);
@@ -78,3 +90,35 @@ export async function saveEntry(uid: string, input: SaveEntryInput): Promise<str
 export async function deleteEntry(uid: string, entryId: string): Promise<void> {
   await deleteDoc(doc(db, 'users', uid, 'entries', entryId));
 }
+
+/** Subscribe to the current day's server-confirmed entries. Pending local writes are not confirmations. */
+export function watchEntriesForDay(
+  uid: string,
+  day: string,
+  onEntries: (entries: import('../domain/entry').Entry[]) => void,
+  onError: (error: Error) => void,
+): () => void {
+  const entries = collection(db, 'users', uid, 'entries');
+  return onSnapshot(
+    query(entries, where('localDate', '==', day)),
+    { includeMetadataChanges: true },
+    (snapshot) => {
+      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
+      onEntries(
+        snapshot.docs.map((document) => {
+          const data = document.data();
+          return {
+            id: document.id,
+            indicatorId: data.indicatorId as string,
+            localDate: data.localDate as string,
+            recordedAt: (data.recordedAt as Timestamp).toDate().toISOString(),
+            valueType: data.valueType as import('../domain/indicator').ValueType,
+            value: data.value as EntryValue,
+            note: (data.note as string | null | undefined) ?? null,
+          };
+        }),
+      );
+    },
+    onError,
+  );
+}
diff --git a/app/src/design/NumberInput.tsx b/app/src/design/NumberInput.tsx
index c8b2272..da42b27 100644
--- a/app/src/design/NumberInput.tsx
+++ b/app/src/design/NumberInput.tsx
@@ -41,6 +41,10 @@ export function NumberInput({ label, value, onChange, unit, step = 1, min, max }
           onChange={(e) => setText(e.target.value)}
           onBlur={() => {
             const n = parseDecimal(text);
+            if (n === null && text.trim() !== '') {
+              setText(format(value));
+              return;
+            }
             onChange(n === null ? null : clamp(n));
           }}
           className="h-11 w-full bg-transparent text-center font-stat-display text-stat-display text-on-surface focus:outline-none"
diff --git a/app/src/design/Slider.tsx b/app/src/design/Slider.tsx
index d353988..40e243c 100644
--- a/app/src/design/Slider.tsx
+++ b/app/src/design/Slider.tsx
@@ -67,6 +67,9 @@ export function Slider({
           step={step}
           value={value ?? min}
           onChange={(e) => onChange(Number(e.target.value))}
+          onPointerUp={(e) => {
+            if (value === null) onChange(Number(e.currentTarget.value));
+          }}
           className={`h-11 w-full ${tone === 'factor' ? 'accent-secondary' : 'accent-primary-container'}`}
         />
       )}
diff --git a/app/src/entry/QuickEntry.tsx b/app/src/entry/QuickEntry.tsx
new file mode 100644
index 0000000..b625840
--- /dev/null
+++ b/app/src/entry/QuickEntry.tsx
@@ -0,0 +1,316 @@
+import { useEffect, useRef, useState } from 'react';
+import { deleteEntry, saveEntry } from '../data/entries';
+import type { StoredIndicator } from '../data/indicators';
+import { Button, Card, Chip, Icon, IndicatorLabel, NumberInput, Slider } from '../design';
+import type { Entry, EntryValue } from '../domain/entry';
+import { localDate } from '../lib/time';
+
+interface QuickEntryProps {
+  uid: string;
+  indicators: StoredIndicator[];
+  entries: Entry[];
+  day?: string;
+  onDone: () => void;
+}
+
+type Feedback = 'idle' | 'pending' | 'saved' | 'error' | 'conflict';
+
+function valueText(indicator: StoredIndicator, value: EntryValue): string {
+  if ('boolean' in value) return value.boolean ? 'Sim' : 'Não';
+  if ('number' in value)
+    return `${String(value.number).replace('.', ',')}${indicator.numeric?.unit ? ` ${indicator.numeric.unit}` : ''}`;
+  return indicator.options?.find((option) => option.id === value.optionId)?.label ?? 'Opção';
+}
+
+function latest(entries: Entry[]): Entry | undefined {
+  return [...entries].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt) || b.id.localeCompare(a.id))[0];
+}
+
+export function QuickEntry({ uid, indicators, entries, day, onDone }: QuickEntryProps) {
+  const [currentEntries, setCurrentEntries] = useState(entries);
+  const [note, setNote] = useState('');
+  const [feedback, setFeedback] = useState<Feedback>('idle');
+  const [resetVersion, setResetVersion] = useState(0);
+  const [busy, setBusy] = useState(false);
+  const busyRef = useRef(false);
+  const [draftNumbers, setDraftNumbers] = useState<Record<string, number | null>>({});
+  const draftNumbersRef = useRef(draftNumbers);
+
+  useEffect(() => setCurrentEntries(entries), [entries]);
+
+  async function persist(indicator: StoredIndicator, value: EntryValue | null) {
+    if (busyRef.current) return;
+    const existing = currentEntries.filter((entry) => entry.indicatorId === indicator.id);
+    if (value === null && (indicator.frequency !== 'single_per_day' || existing.length === 0)) return;
+    busyRef.current = true;
+    setBusy(true);
+    setFeedback('pending');
+    try {
+      if (day && day !== localDate()) throw new Error('The local day changed.');
+      if (value === null) {
+        // Delete only the records the user saw, never unseen records from another device.
+        for (const entry of existing) await deleteEntry(uid, entry.id);
+        setCurrentEntries((current) =>
+          current.filter((entry) => !existing.some((old) => old.id === entry.id)),
+        );
+      } else {
+        const savedNote = note.trim();
+        const id = await saveEntry(uid, {
+          indicatorId: indicator.id,
+          value,
+          ...(indicator.frequency === 'single_per_day'
+            ? { observedEntryIds: existing.map((entry) => entry.id) }
+            : {}),
+          ...(savedNote ? { note: savedNote } : {}),
+        });
+        const now = new Date();
+        const added: Entry = {
+          id,
+          indicatorId: indicator.id,
+          localDate: localDate(now),
+          recordedAt: now.toISOString(),
+          valueType: indicator.valueType,
+          value,
+          note: savedNote || null,
+        };
+        setCurrentEntries((current) => [
+          ...current.filter(
+            (entry) =>
+              entry.id !== id &&
+              (indicator.frequency !== 'single_per_day' || !existing.some((old) => old.id === entry.id)),
+          ),
+          added,
+        ]);
+        if (indicator.frequency === 'multiple_per_day' && indicator.valueType === 'numeric') {
+          draftNumbersRef.current = { ...draftNumbersRef.current, [indicator.id]: null };
+          setDraftNumbers(draftNumbersRef.current);
+        }
+      }
+      setFeedback('saved');
+    } catch (error) {
+      setResetVersion((version) => version + 1);
+      setFeedback(error instanceof Error && error.name === 'EntryConflictError' ? 'conflict' : 'error');
+    } finally {
+      busyRef.current = false;
+      setBusy(false);
+    }
+  }
+
+  function renderCard(indicator: StoredIndicator) {
+    const todayEntries = currentEntries.filter((entry) => entry.indicatorId === indicator.id);
+    const multiple = indicator.frequency === 'multiple_per_day';
+    const current = multiple ? undefined : latest(todayEntries);
+    const selected = current?.value;
+    const number = selected && 'number' in selected ? selected.number : null;
+    const setNumber = (value: number | null) => {
+      if (multiple) {
+        draftNumbersRef.current = { ...draftNumbersRef.current, [indicator.id]: value };
+        setDraftNumbers(draftNumbersRef.current);
+      } else if (value === null ? Boolean(current) : value !== number) {
+        void persist(indicator, value === null ? null : { number: value });
+      }
+    };
+    return (
+      <Card key={indicator.id} data-testid={`quick-entry-card-${indicator.id}`}>
+        <div className="flex items-center justify-between gap-2">
+          <IndicatorLabel indicator={indicator} variant="badge" group={indicator.group} />
+          {current && (
+            <button
+              type="button"
+              disabled={busy}
+              onClick={() => void persist(indicator, null)}
+              className="min-h-11 rounded-full px-3 font-label-md text-label-md text-on-surface-variant"
+            >
+              Limpar
+            </button>
+          )}
+        </div>
+        {multiple && todayEntries.length > 0 && (
+          <div className="flex flex-wrap gap-2 font-body-sm text-body-sm text-on-surface-variant">
+            {todayEntries.map((entry) => (
+              <span
+                key={entry.id}
+                data-testid="entry-event"
+                className="rounded-full bg-surface-container-low px-3 py-1"
+              >
+                {valueText(indicator, entry.value)} ·{' '}
+                {new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(
+                  new Date(entry.recordedAt),
+                )}
+              </span>
+            ))}
+          </div>
+        )}
+        <fieldset disabled={busy} className="min-w-0 disabled:opacity-60">
+          {indicator.valueType === 'boolean' && (
+            <div className="grid grid-cols-2 gap-2">
+              {[true, false].map((answer) => (
+                <Chip
+                  key={String(answer)}
+                  tone={indicator.group}
+                  selected={Boolean(selected && 'boolean' in selected && selected.boolean === answer)}
+                  onClick={() =>
+                    void persist(
+                      indicator,
+                      !multiple && selected && 'boolean' in selected && selected.boolean === answer
+                        ? null
+                        : { boolean: answer },
+                    )
+                  }
+                >
+                  {answer ? 'Sim' : 'Não'}
+                </Chip>
+              ))}
+            </div>
+          )}
+          {indicator.valueType === 'ordinal' && (
+            <div className="flex flex-wrap gap-2">
+              {indicator.options?.map((option) => (
+                <Chip
+                  key={option.id}
+                  tone={indicator.group}
+                  selected={Boolean(selected && 'optionId' in selected && selected.optionId === option.id)}
+                  onClick={() =>
+                    void persist(
+                      indicator,
+                      !multiple && selected && 'optionId' in selected && selected.optionId === option.id
+                        ? null
+                        : { optionId: option.id },
+                    )
+                  }
+                >
+                  {option.label}
+                </Chip>
+              ))}
+            </div>
+          )}
+          {indicator.valueType === 'scale' && indicator.scale && (
+            <Slider
+              label="Valor da escala"
+              tone={indicator.group}
+              min={indicator.scale.min}
+              max={indicator.scale.max}
+              step={indicator.scale.step}
+              value={number}
+              onChange={(value) => void persist(indicator, { number: value })}
+              minLabel={String(indicator.scale.min)}
+              maxLabel={String(indicator.scale.max)}
+            />
+          )}
+          {indicator.valueType === 'numeric' && indicator.numeric && (
+            <div className="flex flex-col gap-2">
+              <NumberInput
+                key={resetVersion}
+                label="Valor numérico"
+                value={multiple ? (draftNumbers[indicator.id] ?? null) : number}
+                onChange={setNumber}
+                unit={indicator.numeric.unit}
+                step={indicator.numeric.step}
+                min={indicator.numeric.min ?? undefined}
+                max={indicator.numeric.max ?? undefined}
+              />
+              {multiple && (
+                <Button
+                  variant="neutral"
+                  onClick={() => {
+                    const value = draftNumbersRef.current[indicator.id];
+                    if (value != null) void persist(indicator, { number: value });
+                  }}
+                >
+                  Adicionar registro
+                </Button>
+              )}
+            </div>
+          )}
+        </fieldset>
+      </Card>
+    );
+  }
+
+  const active = indicators.filter((indicator) => indicator.archivedAt == null);
+  const date = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(
+    new Date(),
+  );
+  return (
+    <div className="flex flex-col gap-space-xl pb-10">
+      <Card className="gap-3 p-5">
+        <div className="flex items-center justify-between gap-2">
+          <span className="font-label-code text-label-code tracking-wider text-tertiary uppercase">
+            Salvamento automático ativo
+          </span>
+          <span
+            data-testid="save-feedback"
+            role={feedback === 'error' || feedback === 'conflict' ? 'alert' : 'status'}
+            className={`rounded-full bg-surface-container px-2 py-1 font-label-md text-label-md ${feedback === 'error' || feedback === 'conflict' ? 'text-error' : 'text-on-surface-variant'}`}
+          >
+            {feedback === 'idle'
+              ? 'Pronto para registrar'
+              : feedback === 'pending'
+                ? 'Salvando…'
+                : feedback === 'saved'
+                  ? 'Salvo'
+                  : feedback === 'conflict'
+                    ? 'A resposta mudou em outro dispositivo. Confira e tente novamente.'
+                    : 'Erro ao salvar. Verifique sua conexão e tente novamente.'}
+          </span>
+        </div>
+        <div>
+          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
+            Registro de Hoje
+          </h1>
+          <p className="font-body-md text-body-md text-secondary">{date}</p>
+        </div>
+        <p className="rounded bg-surface-container-low p-3 font-body-sm text-body-sm text-on-surface-variant">
+          {feedback === 'saved'
+            ? 'Obrigado por registrar seu dia. Volte quando quiser.'
+            : 'Nenhum campo é obrigatório. Responda apenas o que quiser registrar agora em poucos toques.'}
+        </p>
+      </Card>
+      {(['factor', 'result'] as const).map((group) => (
+        <section
+          key={group}
+          data-testid={group === 'factor' ? 'quick-entry-factors' : 'quick-entry-results'}
+          className="flex flex-col gap-space-md"
+        >
+          <div className="flex items-center gap-2 px-1">
+            <span
+              className={`flex size-7 items-center justify-center rounded-full ${group === 'factor' ? 'bg-secondary-fixed text-secondary' : 'bg-primary-fixed text-primary'}`}
+            >
+              <Icon name={group === 'factor' ? 'input' : 'insights'} className="text-[18px]" />
+            </span>
+            <div>
+              <h2 className="font-headline-md text-headline-md">
+                {group === 'factor' ? 'Fatores' : 'Resultados'}
+              </h2>
+              <p className="font-label-md text-label-md text-on-surface-variant">
+                {group === 'factor' ? 'O que fiz, consumi ou vivi' : 'Como fiquei ou o que percebi/medi'}
+              </p>
+            </div>
+          </div>
+          {active.filter((indicator) => indicator.group === group).map(renderCard)}
+        </section>
+      ))}
+      <Card className="gap-2.5">
+        <label htmlFor="entry-note" className="font-label-lg text-label-lg">
+          Observação do dia{' '}
+          <span className="font-body-sm text-body-sm text-on-surface-variant">(opcional)</span>
+        </label>
+        <textarea
+          id="entry-note"
+          maxLength={500}
+          value={note}
+          onChange={(event) => setNote(event.target.value)}
+          rows={2}
+          placeholder="Ex: noite mais fria, reunião intensa pela manhã..."
+          className="w-full resize-none rounded bg-surface-container-low p-3 font-body-md text-body-md focus:ring-2 focus:ring-primary focus:outline-none"
+        />
+        <p className="font-body-sm text-body-sm text-on-surface-variant">
+          A observação acompanha os próximos registros e não afeta o cálculo estatístico.
+        </p>
+      </Card>
+      <Button variant="neutral" fullWidth onClick={onDone}>
+        Voltar ao Dashboard
+      </Button>
+    </div>
+  );
+}
diff --git a/app/src/entry/__tests__/QuickEntry.extra.test.tsx b/app/src/entry/__tests__/QuickEntry.extra.test.tsx
new file mode 100644
index 0000000..dccee40
--- /dev/null
+++ b/app/src/entry/__tests__/QuickEntry.extra.test.tsx
@@ -0,0 +1,122 @@
+import { render, screen, waitFor, within } from '@testing-library/react';
+import userEvent from '@testing-library/user-event';
+import { describe, expect, it, vi } from 'vitest';
+import { deleteEntry, saveEntry } from '../../data/entries';
+import type { StoredIndicator } from '../../data/indicators';
+import type { Entry } from '../../domain/entry';
+import { PrivacyProvider } from '../../privacy/PrivacyContext';
+import { QuickEntry } from '../QuickEntry';
+
+vi.mock('../../data/entries', () => ({ saveEntry: vi.fn(), deleteEntry: vi.fn() }));
+
+const numeric: StoredIndicator = {
+  id: 'numeric',
+  group: 'factor',
+  name: 'Nome particular',
+  abbreviation: 'NUM',
+  emoji: '☕',
+  valueType: 'numeric',
+  numeric: { unit: 'mg', min: 0, max: null, step: 1 },
+  scale: null,
+  options: null,
+  desiredDirection: null,
+  idealRange: null,
+  frequency: 'single_per_day',
+  dailyAggregation: null,
+  sortOrder: 1,
+  archivedAt: null,
+  lockedAt: null,
+  createdAt: null,
+  updatedAt: null,
+};
+const existing: Entry = {
+  id: 'existing',
+  indicatorId: numeric.id,
+  localDate: '2026-10-24',
+  recordedAt: '2026-10-24T12:00:00Z',
+  valueType: 'numeric',
+  value: { number: 2 },
+  note: null,
+};
+
+function show() {
+  return render(
+    <PrivacyProvider>
+      <QuickEntry uid="user" indicators={[numeric]} entries={[existing]} onDone={() => {}} />
+    </PrivacyProvider>,
+  );
+}
+
+describe('Quick entry persistence and privacy', () => {
+  it('passes only the visible entries when replacing an answer', async () => {
+    const user = userEvent.setup();
+    vi.mocked(saveEntry).mockResolvedValueOnce('replacement');
+    show();
+    const card = screen.getByTestId('quick-entry-card-numeric');
+    const input = within(card).getByRole('textbox');
+    await user.clear(input);
+    await user.type(input, '3');
+    await user.tab();
+    expect(saveEntry).toHaveBeenCalledWith(
+      'user',
+      expect.objectContaining({ observedEntryIds: ['existing'], value: { number: 3 } }),
+    );
+  });
+
+  it('does not modify the previous day after midnight', async () => {
+    const user = userEvent.setup();
+    vi.mocked(saveEntry).mockClear();
+    vi.mocked(deleteEntry).mockClear();
+    render(
+      <PrivacyProvider>
+        <QuickEntry
+          uid="user"
+          day="2000-01-01"
+          indicators={[numeric]}
+          entries={[existing]}
+          onDone={() => {}}
+        />
+      </PrivacyProvider>,
+    );
+    await user.click(screen.getByRole('button', { name: 'Limpar' }));
+    expect(await screen.findByRole('alert')).toBeInTheDocument();
+    expect(saveEntry).not.toHaveBeenCalled();
+    expect(deleteEntry).not.toHaveBeenCalled();
+  });
+
+  it('explains a concurrent change and retains the last confirmed value', async () => {
+    const user = userEvent.setup();
+    const conflict = new Error('The answer changed on another device.');
+    conflict.name = 'EntryConflictError';
+    vi.mocked(saveEntry).mockRejectedValueOnce(conflict);
+    show();
+    const card = screen.getByTestId('quick-entry-card-numeric');
+    const input = within(card).getByRole('textbox');
+    await user.clear(input);
+    await user.type(input, '3');
+    await user.tab();
+    expect(await screen.findByRole('alert')).toHaveTextContent(/outro dispositivo/i);
+    await waitFor(() => expect(within(card).getByRole('textbox')).toHaveValue('2'));
+  });
+
+  it('keeps the confirmed value when a replacement fails', async () => {
+    const user = userEvent.setup();
+    vi.mocked(saveEntry).mockRejectedValueOnce(new Error('network'));
+    show();
+    const card = screen.getByTestId('quick-entry-card-numeric');
+    const input = within(card).getByRole('textbox');
+    await user.clear(input);
+    await user.type(input, '3');
+    await user.tab();
+    await screen.findByRole('alert');
+    await waitFor(() => expect(within(card).getByRole('textbox')).toHaveValue('2'));
+  });
+
+  it('does not expose a name or emoji in visible text or accessible control labels', () => {
+    const { container } = show();
+    expect(container.textContent).not.toContain('Nome particular');
+    expect(container.textContent).not.toContain('☕');
+    expect(container.querySelector('[aria-label*="Nome particular"]')).toBeNull();
+    expect(screen.getByText('NUM')).toBeInTheDocument();
+  });
+});
diff --git a/app/src/entry/__tests__/QuickEntry.test.tsx b/app/src/entry/__tests__/QuickEntry.test.tsx
new file mode 100644
index 0000000..348b562
--- /dev/null
+++ b/app/src/entry/__tests__/QuickEntry.test.tsx
@@ -0,0 +1,401 @@
+/**
+ * Acceptance tests for F-2.08 (Preenchimento rápido). Written before the implementation.
+ *
+ * Component contract under test (src/entry/QuickEntry.tsx):
+ *  - `<QuickEntry uid indicators entries onDone />` renders the ACTIVE indicators
+ *    (anything with `archivedAt != null` is filtered out) split into the "Fatores" and
+ *    "Resultados" sections, preserving the order of the `indicators` array (spec 5.1).
+ *  - Each indicator card exposes `data-testid={`quick-entry-card-${id}`}`; the sections
+ *    expose `data-testid="quick-entry-factors"` / `"quick-entry-results"`; per-day events of
+ *    multiple-per-day indicators render inside the card with `data-testid="entry-event"`.
+ *  - No field is required: any subset of answers can be saved (spec 5.1, AC-09).
+ *  - Boolean: "Sim"/"Não" chips (aria-pressed) + a "Limpar" control while answered; clearing
+ *    a single-per-day answer DELETES today's record (absence, never a Não/0) (spec 5.2).
+ *  - Scale: pill bar (Slider); ordinal: option chips; numeric: NumberInput with inputmode
+ *    "decimal" that accepts the pt-BR comma separator (spec 7.2, AC-09).
+ *  - Saving goes through `saveEntry` (src/data/entries); clearing through `deleteEntry`;
+ *    the optional note field travels with the saved entry (spec 5.3).
+ *  - `data-testid="save-feedback"` mirrors the last save: "Salvando…/pendente" while the
+ *    write is in flight, "Salvo/Sincronizado" only after it persists, never success before
+ *    that; failures surface as role="alert" (spec 5.4, AC-05).
+ *  - No "faltando responder"/completeness alert is ever rendered (spec 5.4).
+ *  - "Voltar ao Dashboard" returns with a single touch (spec 5.1.6).
+ */
+import { render, screen, waitFor, within } from '@testing-library/react';
+import userEvent from '@testing-library/user-event';
+import type { Timestamp } from 'firebase/firestore';
+import { beforeEach, describe, expect, it, vi } from 'vitest';
+import { deleteEntry, saveEntry } from '../../data/entries';
+import type { StoredIndicator } from '../../data/indicators';
+import type { Entry, EntryValue } from '../../domain/entry';
+import { PrivacyProvider } from '../../privacy/PrivacyContext';
+import { QuickEntry } from '../QuickEntry';
+
+vi.mock('../../data/entries', () => ({ saveEntry: vi.fn(), deleteEntry: vi.fn() }));
+
+const saveEntryMock = vi.mocked(saveEntry);
+const deleteEntryMock = vi.mocked(deleteEntry);
+
+// Fixed, deterministic day: entries are injected through props, so no real clock is needed.
+const TODAY = '2026-10-24';
+const RECORDED_AT = '2026-10-24T15:00:00.000Z';
+const ARCHIVED_AT = { seconds: 1, nanoseconds: 0 } as unknown as Timestamp;
+
+function indicator(overrides: Partial<StoredIndicator> & Pick<StoredIndicator, 'id'>): StoredIndicator {
+  return {
+    group: 'factor',
+    name: 'Indicador',
+    abbreviation: null,
+    emoji: null,
+    valueType: 'boolean',
+    numeric: null,
+    scale: null,
+    options: null,
+    desiredDirection: null,
+    idealRange: null,
+    frequency: 'single_per_day',
+    dailyAggregation: null,
+    sortOrder: 0,
+    archivedAt: null,
+    lockedAt: null,
+    createdAt: null,
+    updatedAt: null,
+    ...overrides,
+  };
+}
+
+const exercise = () =>
+  indicator({
+    id: 'ind_exercise',
+    group: 'factor',
+    name: 'Exercício',
+    abbreviation: 'EXE',
+    emoji: '🏃',
+    sortOrder: 1000,
+  });
+
+const sleep = () =>
+  indicator({
+    id: 'ind_sleep',
+    group: 'factor',
+    name: 'Sono',
+    abbreviation: 'SON',
+    valueType: 'numeric',
+    numeric: { unit: 'horas', min: 0, max: 24, step: 0.5 },
+    sortOrder: 2000,
+  });
+
+const archivedQ10 = () =>
+  indicator({
+    id: 'ind_q10',
+    group: 'factor',
+    name: 'Coenzima Q10',
+    abbreviation: 'Q10',
+    sortOrder: 5000,
+    archivedAt: ARCHIVED_AT,
+  });
+
+const energy = (frequency: 'single_per_day' | 'multiple_per_day' = 'single_per_day') =>
+  indicator({
+    id: 'ind_energy',
+    group: 'result',
+    name: 'Nível de energia',
+    abbreviation: 'ENE',
+    valueType: 'scale',
+    scale: { min: 0, max: 10, step: 1 },
+    desiredDirection: 'higher',
+    frequency,
+    dailyAggregation: frequency === 'multiple_per_day' ? 'mean' : null,
+    sortOrder: 1000,
+  });
+
+const mood = () =>
+  indicator({
+    id: 'ind_mood',
+    group: 'result',
+    name: 'Humor',
+    abbreviation: 'HUM',
+    valueType: 'ordinal',
+    options: [
+      { id: 'bad', label: 'Ruim' },
+      { id: 'fair', label: 'Regular' },
+      { id: 'good', label: 'Bom' },
+      { id: 'great', label: 'Excelente' },
+    ],
+    desiredDirection: 'neutral',
+    sortOrder: 2000,
+  });
+
+function entryOf(indicatorId: string, value: EntryValue, overrides: Partial<Entry> = {}): Entry {
+  return {
+    id: `entry-${indicatorId}`,
+    indicatorId,
+    localDate: TODAY,
+    recordedAt: RECORDED_AT,
+    valueType: 'boolean',
+    value,
+    note: null,
+    ...overrides,
+  };
+}
+
+function renderQuickEntry(
+  props: {
+    uid?: string;
+    indicators?: StoredIndicator[];
+    entries?: Entry[];
+  } = {},
+) {
+  const onDone = vi.fn();
+  render(
+    <PrivacyProvider>
+      <QuickEntry
+        uid={props.uid ?? 'user-1'}
+        indicators={props.indicators ?? [exercise()]}
+        entries={props.entries ?? []}
+        onDone={onDone}
+      />
+    </PrivacyProvider>,
+  );
+  return { onDone };
+}
+
+describe('F-2.08 QuickEntry (preenchimento rápido)', () => {
+  beforeEach(() => {
+    saveEntryMock.mockReset();
+    deleteEntryMock.mockReset();
+  });
+
+  it('renders Fatores and Resultados sections with the active indicators in order', () => {
+    renderQuickEntry({
+      indicators: [exercise(), sleep(), archivedQ10(), energy(), mood()],
+    });
+
+    expect(screen.getByRole('heading', { name: 'Fatores' })).toBeInTheDocument();
+    expect(screen.getByRole('heading', { name: 'Resultados' })).toBeInTheDocument();
+
+    // Archived indicators never appear, and each group keeps the given order.
+    expect(screen.getAllByTestId(/^quick-entry-card-/).map((c) => c.getAttribute('data-testid'))).toEqual([
+      'quick-entry-card-ind_exercise',
+      'quick-entry-card-ind_sleep',
+      'quick-entry-card-ind_energy',
+      'quick-entry-card-ind_mood',
+    ]);
+
+    const factors = within(screen.getByTestId('quick-entry-factors'));
+    expect(factors.getByTestId('quick-entry-card-ind_exercise')).toBeInTheDocument();
+    expect(factors.getByTestId('quick-entry-card-ind_sleep')).toBeInTheDocument();
+    expect(factors.queryByTestId('quick-entry-card-ind_energy')).toBeNull();
+
+    const results = within(screen.getByTestId('quick-entry-results'));
+    expect(results.getByTestId('quick-entry-card-ind_energy')).toBeInTheDocument();
+    expect(results.getByTestId('quick-entry-card-ind_mood')).toBeInTheDocument();
+    expect(results.queryByTestId('quick-entry-card-ind_exercise')).toBeNull();
+  });
+
+  it('saves a single factor answer (Sim) without requiring any result', async () => {
+    const user = userEvent.setup();
+    saveEntryMock.mockResolvedValue('new-entry');
+    renderQuickEntry({ indicators: [exercise(), energy()] });
+
+    const card = screen.getByTestId('quick-entry-card-ind_exercise');
+    await user.click(within(card).getByRole('button', { name: 'Sim' }));
+
+    expect(saveEntryMock).toHaveBeenCalledTimes(1);
+    const [uid, input] = saveEntryMock.mock.calls[0]!;
+    expect(uid).toBe('user-1');
+    expect(input).toMatchObject({ indicatorId: 'ind_exercise', value: { boolean: true } });
+
+    await waitFor(() =>
+      expect(within(card).getByRole('button', { name: 'Sim' })).toHaveAttribute('aria-pressed', 'true'),
+    );
+    await waitFor(() =>
+      expect(screen.getByTestId('save-feedback').textContent ?? '').toMatch(/salvo|sincronizado/i),
+    );
+  });
+
+  it('saves a single result answer from the scale pills', async () => {
+    const user = userEvent.setup();
+    saveEntryMock.mockResolvedValue('new-entry');
+    renderQuickEntry({ indicators: [exercise(), energy()] });
+
+    const card = screen.getByTestId('quick-entry-card-ind_energy');
+    await user.click(within(card).getByRole('radio', { name: '7' }));
+
+    expect(saveEntryMock).toHaveBeenCalledTimes(1);
+    expect(saveEntryMock.mock.calls[0]![1]).toMatchObject({
+      indicatorId: 'ind_energy',
+      value: { number: 7 },
+    });
+  });
+
+  it('saves an explicit Não as boolean false (distinct from absence)', async () => {
+    const user = userEvent.setup();
+    saveEntryMock.mockResolvedValue('new-entry');
+    renderQuickEntry({ indicators: [exercise()] });
+
+    const card = screen.getByTestId('quick-entry-card-ind_exercise');
+    await user.click(within(card).getByRole('button', { name: 'Não' }));
+
+    expect(saveEntryMock).toHaveBeenCalledTimes(1);
+    expect(saveEntryMock.mock.calls[0]![1]).toMatchObject({
+      indicatorId: 'ind_exercise',
+      value: { boolean: false },
+    });
+  });
+
+  it('answers ordinal indicators with option chips', async () => {
+    const user = userEvent.setup();
+    saveEntryMock.mockResolvedValue('new-entry');
+    renderQuickEntry({ indicators: [mood()] });
+
+    const card = screen.getByTestId('quick-entry-card-ind_mood');
+    await user.click(within(card).getByRole('button', { name: 'Bom' }));
+
+    expect(saveEntryMock).toHaveBeenCalledTimes(1);
+    expect(saveEntryMock.mock.calls[0]![1]).toMatchObject({
+      indicatorId: 'ind_mood',
+      value: { optionId: 'good' },
+    });
+  });
+
+  it('uses the decimal keyboard on numeric fields and accepts a comma separator', async () => {
+    const user = userEvent.setup();
+    saveEntryMock.mockResolvedValue('new-entry');
+    renderQuickEntry({ indicators: [sleep()] });
+
+    const card = screen.getByTestId('quick-entry-card-ind_sleep');
+    const input = within(card).getByRole('textbox');
+    expect(input).toHaveAttribute('inputmode', 'decimal');
+
+    await user.type(input, '7,5');
+    await user.tab();
+
+    expect(saveEntryMock).toHaveBeenCalledTimes(1);
+    expect(saveEntryMock.mock.calls[0]![1]).toMatchObject({
+      indicatorId: 'ind_sleep',
+      value: { number: 7.5 },
+    });
+  });
+
+  it('clearing a single-per-day answer deletes today record instead of saving Não/0', async () => {
+    const user = userEvent.setup();
+    deleteEntryMock.mockResolvedValue(undefined);
+    renderQuickEntry({
+      indicators: [exercise()],
+      entries: [entryOf('ind_exercise', { boolean: true })],
+    });
+
+    const card = screen.getByTestId('quick-entry-card-ind_exercise');
+    expect(within(card).getByRole('button', { name: 'Sim' })).toHaveAttribute('aria-pressed', 'true');
+
+    await user.click(within(card).getByRole('button', { name: /limpar/i }));
+
+    // Absence: the existing record is deleted and nothing is written back.
+    expect(deleteEntryMock).toHaveBeenCalledTimes(1);
+    expect(deleteEntryMock).toHaveBeenCalledWith('user-1', 'entry-ind_exercise');
+    expect(saveEntryMock).not.toHaveBeenCalled();
+
+    await waitFor(() =>
+      expect(within(card).getByRole('button', { name: 'Sim' })).toHaveAttribute('aria-pressed', 'false'),
+    );
+    await waitFor(() => expect(within(card).queryByRole('button', { name: /limpar/i })).toBeNull());
+  });
+
+  it('keeps the save pending (never "saved") until the write persists, then confirms', async () => {
+    const user = userEvent.setup();
+    let resolveWrite!: (id: string) => void;
+    saveEntryMock.mockReturnValue(
+      new Promise<string>((resolve) => {
+        resolveWrite = resolve;
+      }),
+    );
+    renderQuickEntry({ indicators: [exercise()] });
+
+    const card = screen.getByTestId('quick-entry-card-ind_exercise');
+    await user.click(within(card).getByRole('button', { name: 'Sim' }));
+
+    // While the write is in flight: pending state, never success (spec 5.4).
+    const feedback = screen.getByTestId('save-feedback');
+    expect(feedback.textContent ?? '').toMatch(/salvando|pendente/i);
+    expect(feedback.textContent ?? '').not.toMatch(/salvo|sincronizado/i);
+
+    resolveWrite('new-entry');
+    await waitFor(() => expect(feedback.textContent ?? '').toMatch(/salvo|sincronizado/i));
+  });
+
+  it('shows an error (never success) when the write fails', async () => {
+    const user = userEvent.setup();
+    saveEntryMock.mockRejectedValue(new Error('network down'));
+    renderQuickEntry({ indicators: [exercise()] });
+
+    const card = screen.getByTestId('quick-entry-card-ind_exercise');
+    await user.click(within(card).getByRole('button', { name: 'Sim' }));
+
+    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
+    expect(screen.getByRole('alert').textContent ?? '').toMatch(/salvar|erro|falha|conex/i);
+    expect(screen.getByTestId('save-feedback').textContent ?? '').not.toMatch(/salvo|sincronizado/i);
+  });
+
+  it('lists today events of multiple-per-day indicators and appends new ones', async () => {
+    const user = userEvent.setup();
+    saveEntryMock.mockResolvedValue('new-entry-2');
+    renderQuickEntry({
+      indicators: [energy('multiple_per_day')],
+      entries: [entryOf('ind_energy', { number: 8 }, { valueType: 'scale', id: 'entry-energy-1' })],
+    });
+
+    const card = screen.getByTestId('quick-entry-card-ind_energy');
+    const events = within(card).getAllByTestId('entry-event');
+    expect(events).toHaveLength(1);
+    expect(events[0]).toHaveTextContent(/8/);
+
+    // A new answer on a multiple-per-day indicator adds a new event for today.
+    await user.click(within(card).getByRole('radio', { name: '9' }));
+    expect(saveEntryMock).toHaveBeenCalledTimes(1);
+    expect(saveEntryMock.mock.calls[0]![1]).toMatchObject({
+      indicatorId: 'ind_energy',
+      value: { number: 9 },
+    });
+
+    await waitFor(() => expect(within(card).getAllByTestId('entry-event')).toHaveLength(2));
+    expect(
+      within(card)
+        .getAllByTestId('entry-event')
+        .some((e) => /9/.test(e.textContent ?? '')),
+    ).toBe(true);
+  });
+
+  it('never alerts about missing answers; the optional note travels with the entry', async () => {
+    const user = userEvent.setup();
+    saveEntryMock.mockResolvedValue('new-entry');
+    renderQuickEntry({ indicators: [exercise()] });
+
+    // Partially filled day: no completeness alert anywhere (spec 5.4).
+    expect(screen.queryByRole('alert')).toBeNull();
+    expect(screen.getByText(/nenhum campo é obrigatório/i)).toBeInTheDocument();
+    const remainingText = (document.body.textContent ?? '').replace(/nenhum campo é obrigatório/i, '');
+    expect(remainingTex
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
