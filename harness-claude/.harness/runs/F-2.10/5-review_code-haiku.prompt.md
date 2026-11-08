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
  "id": "F-2.10",
  "title": "Dashboard vazio com sugestões",
  "description": "Estado de conta nova (design/dashboard_inicial_estado_vazio): 3–4 sugestões de criação rápida (Exercício e Café como Fatores; Energia e Concentração como Resultados) + 'Criar meu próprio indicador'; nenhum indicador criado automaticamente. Estado 'indicadores sem registros' explica que insights virão; primeiro registro agradece discretamente.",
  "acceptance": [
    "Conta nova não tem indicadores até a pessoa tocar numa sugestão",
    "Sugestão cria o indicador com configuração determinística",
    "Estado sem registros e agradecimento do primeiro registro em pt-BR"
  ],
  "specRefs": [
    "spec.md#3.1",
    "spec.md#5.4"
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
diff --git a/app/e2e/empty-dashboard-regressions.spec.ts b/app/e2e/empty-dashboard-regressions.spec.ts
new file mode 100644
index 0000000..5a26f03
--- /dev/null
+++ b/app/e2e/empty-dashboard-regressions.spec.ts
@@ -0,0 +1,226 @@
+import type { APIRequestContext, Page } from '@playwright/test';
+import firebaseJson from '../firebase.json' with { type: 'json' };
+import { currentUid, expect, test } from './fixtures';
+
+const firestore = `http://127.0.0.1:${firebaseJson.emulators.firestore.port}/v1/projects/demo-pulsar/databases/(default)/documents`;
+const owner = { Authorization: 'Bearer owner' };
+const nullValue = { nullValue: null };
+const string = (value: string) => ({ stringValue: value });
+const number = (value: number) => ({ integerValue: String(value) });
+const map = (fields: Record<string, unknown>) => ({ mapValue: { fields } });
+
+type StoredDocument = { fields: Record<string, unknown> };
+
+async function add(page: Page, key: string) {
+  const card = page.getByTestId(`suggestion-${key}`);
+  await card.getByRole('button', { name: 'Adicionar' }).click();
+  await expect(card.getByRole('button', { name: 'Adicionado' })).toBeDisabled();
+}
+
+async function getIndicator(request: APIRequestContext, uid: string, key: string): Promise<StoredDocument> {
+  const response = await request.get(`${firestore}/users/${uid}/indicators/suggestion-${key}`, {
+    headers: owner,
+  });
+  expect(response.ok()).toBe(true);
+  return (await response.json()) as StoredDocument;
+}
+
+async function patchIndicator(
+  request: APIRequestContext,
+  uid: string,
+  key: string,
+  fields: Record<string, unknown>,
+) {
+  const mask = Object.keys(fields)
+    .map((field) => `updateMask.fieldPaths=${field}`)
+    .join('&');
+  const response = await request.patch(`${firestore}/users/${uid}/indicators/suggestion-${key}?${mask}`, {
+    headers: owner,
+    data: { fields },
+  });
+  expect(response.ok()).toBe(true);
+}
+
+async function addEntry(request: APIRequestContext, uid: string, key: string, day: string) {
+  const response = await request.post(`${firestore}/users/${uid}/entries`, {
+    headers: owner,
+    data: {
+      fields: {
+        indicatorId: string(`suggestion-${key}`),
+        localDate: string(day),
+        recordedAt: { timestampValue: new Date().toISOString() },
+        valueType: string('scale'),
+        value: map({ number: number(8) }),
+      },
+    },
+  });
+  expect(response.ok()).toBe(true);
+}
+
+const common = {
+  options: nullValue,
+  archivedAt: nullValue,
+  lockedAt: nullValue,
+  dailyAggregation: nullValue,
+  idealRange: nullValue,
+  numeric: nullValue,
+  scale: nullValue,
+};
+
+const expected = {
+  exercise: {
+    ...common,
+    name: string('Exercício Físico'),
+    abbreviation: string('EXE'),
+    emoji: string('🏃'),
+    group: string('factor'),
+    valueType: string('boolean'),
+    frequency: string('single_per_day'),
+    desiredDirection: nullValue,
+    sortOrder: number(1000),
+  },
+  coffee: {
+    ...common,
+    name: string('Café Expresso'),
+    abbreviation: string('CAF'),
+    emoji: string('☕'),
+    group: string('factor'),
+    valueType: string('numeric'),
+    frequency: string('multiple_per_day'),
+    numeric: map({ unit: string('xícaras'), min: number(0), max: nullValue, step: number(1) }),
+    desiredDirection: nullValue,
+    dailyAggregation: string('sum'),
+    sortOrder: number(2000),
+  },
+  energy: {
+    ...common,
+    name: string('Nível de Energia'),
+    abbreviation: string('ENE'),
+    emoji: string('⚡'),
+    group: string('result'),
+    valueType: string('scale'),
+    frequency: string('single_per_day'),
+    scale: map({ min: number(0), max: number(10), step: number(1) }),
+    desiredDirection: string('higher'),
+    sortOrder: number(1000),
+  },
+  focus: {
+    ...common,
+    name: string('Concentração / Foco'),
+    abbreviation: string('CON'),
+    emoji: nullValue,
+    group: string('result'),
+    valueType: string('scale'),
+    frequency: string('single_per_day'),
+    scale: map({ min: number(0), max: number(10), step: number(1) }),
+    desiredDirection: string('target_range'),
+    idealRange: map({ min: number(7), max: number(10) }),
+    sortOrder: number(2000),
+  },
+};
+
+test('all four suggestions persist their full deterministic configuration and survive reload', async ({
+  freshUserPage: page,
+  request,
+}) => {
+  const uid = (await currentUid(page))!;
+  await page.goto('/dashboard');
+  for (const [key, fields] of Object.entries(expected)) {
+    await add(page, key);
+    const document = await getIndicator(request, uid, key);
+    expect(document.fields).toMatchObject(fields);
+    expect(document.fields.createdAt).toHaveProperty('timestampValue');
+    expect(document.fields.updatedAt).toHaveProperty('timestampValue');
+    expect(Object.keys(document.fields).sort()).toEqual(
+      [...Object.keys(fields), 'createdAt', 'updatedAt'].sort(),
+    );
+  }
+  await page.reload();
+  for (const key of Object.keys(expected)) {
+    await expect(
+      page.getByTestId(`suggestion-${key}`).getByRole('button', { name: 'Adicionado' }),
+    ).toBeDisabled();
+  }
+});
+
+test('an unrelated duplicate abbreviation does not disable a suggestion', async ({
+  freshUserPage: page,
+  request,
+}) => {
+  const uid = (await currentUid(page))!;
+  await page.goto('/dashboard');
+  await add(page, 'exercise');
+  await patchIndicator(request, uid, 'exercise', {
+    abbreviation: string('ENE'),
+    name: string('Outro indicador'),
+  });
+  await page.reload();
+  await expect(
+    page.getByTestId('suggestion-exercise').getByRole('button', { name: 'Adicionado' }),
+  ).toBeDisabled();
+  await add(page, 'energy');
+  expect((await getIndicator(request, uid, 'exercise')).fields.name).toEqual(string('Outro indicador'));
+  expect((await getIndicator(request, uid, 'energy')).fields.name).toEqual(string('Nível de Energia'));
+});
+
+test('concurrent creation on two tabs does not duplicate or overwrite a suggestion', async ({
+  freshUserPage: page,
+  request,
+}) => {
+  const uid = (await currentUid(page))!;
+  await page.goto('/dashboard');
+  const other = await page.context().newPage();
+  await other.goto('/dashboard');
+  await expect(
+    other.getByTestId('suggestion-exercise').getByRole('button', { name: 'Adicionar' }),
+  ).toBeVisible();
+  await Promise.all([add(page, 'exercise'), add(other, 'exercise')]);
+  const response = await request.get(`${firestore}/users/${uid}/indicators`, { headers: owner });
+  expect(response.ok()).toBe(true);
+  const result = (await response.json()) as { documents: StoredDocument[] };
+  expect(result.documents).toHaveLength(1);
+  await patchIndicator(request, uid, 'exercise', { name: string('Exercício personalizado') });
+  await page.reload();
+  await expect(
+    page.getByTestId('suggestion-exercise').getByRole('button', { name: 'Adicionado' }),
+  ).toBeDisabled();
+  expect((await getIndicator(request, uid, 'exercise')).fields.name).toEqual(
+    string('Exercício personalizado'),
+  );
+  await other.close();
+});
+
+test('archived entries do not hide the empty states for active indicators', async ({
+  freshUserPage: page,
+  request,
+}) => {
+  const uid = (await currentUid(page))!;
+  await page.goto('/dashboard');
+  await add(page, 'energy');
+  await addEntry(request, uid, 'energy', '2026-01-01');
+  await patchIndicator(request, uid, 'energy', { archivedAt: { timestampValue: new Date().toISOString() } });
+  await page.reload();
+  await expect(page.getByText('Sua rotina, seus dados, suas conclusões')).toBeVisible();
+  await expect(page.getByTestId('suggestion-coffee')).toBeVisible();
+  await add(page, 'focus');
+  await expect(page.getByTestId('indicators-without-records')).toBeVisible();
+  await expect(page.getByTestId('first-record-thanks')).toHaveCount(0);
+});
+
+test('first filling with several indicators is acknowledged until a second day is recorded', async ({
+  freshUserPage: page,
+  request,
+}) => {
+  const uid = (await currentUid(page))!;
+  await page.goto('/dashboard');
+  await add(page, 'energy');
+  await add(page, 'focus');
+  await addEntry(request, uid, 'energy', '2026-01-01');
+  await addEntry(request, uid, 'focus', '2026-01-01');
+  await page.reload();
+  await expect(page.getByTestId('first-record-thanks')).toBeVisible();
+  await addEntry(request, uid, 'energy', '2026-01-02');
+  await page.reload();
+  await expect(page.getByTestId('first-record-thanks')).toHaveCount(0);
+  await expect(page.getByText('3 registros no seu histórico')).toBeVisible();
+});
diff --git a/app/e2e/empty-dashboard.spec.ts b/app/e2e/empty-dashboard.spec.ts
new file mode 100644
index 0000000..428c681
--- /dev/null
+++ b/app/e2e/empty-dashboard.spec.ts
@@ -0,0 +1,139 @@
+import type { APIRequestContext } from '@playwright/test';
+import firebaseJson from '../firebase.json' with { type: 'json' };
+import { currentUid, expect, test } from './fixtures';
+
+const PROJECT = 'demo-pulsar';
+const FIRESTORE = `http://127.0.0.1:${firebaseJson.emulators.firestore.port}/v1/projects/${PROJECT}/databases/(default)/documents`;
+const OWNER = { Authorization: 'Bearer owner' };
+
+interface FirestoreDocument {
+  name: string;
+  fields: Record<string, unknown>;
+}
+
+async function indicators(uid: string): Promise<FirestoreDocument[]> {
+  const response = await fetch(`${FIRESTORE}/users/${uid}/indicators?pageSize=1000`, { headers: OWNER });
+  expect(response.ok).toBe(true);
+  return ((await response.json()) as { documents?: FirestoreDocument[] }).documents ?? [];
+}
+
+async function indicatorByAbbreviation(uid: string, abbreviation: string): Promise<FirestoreDocument> {
+  let found: FirestoreDocument | undefined;
+  await expect
+    .poll(async () => {
+      found = (await indicators(uid)).find(
+        (document) =>
+          (document.fields.abbreviation as { stringValue?: string } | undefined)?.stringValue ===
+          abbreviation,
+      );
+      return found?.name ?? null;
+    })
+    .not.toBeNull();
+  return found!;
+}
+
+async function createScaleEntry(request: APIRequestContext, uid: string, indicatorId: string) {
+  const response = await request.post(`${FIRESTORE}/users/${uid}/entries`, {
+    headers: OWNER,
+    data: {
+      fields: {
+        indicatorId: { stringValue: indicatorId },
+        localDate: { stringValue: new Date().toISOString().slice(0, 10) },
+        recordedAt: { timestampValue: new Date().toISOString() },
+        valueType: { stringValue: 'scale' },
+        value: { mapValue: { fields: { number: { doubleValue: 8 } } } },
+      },
+    },
+  });
+  expect(response.ok()).toBe(true);
+}
+
+test.describe('empty dashboard', () => {
+  test('a new account starts without indicators and offers quick suggestions', async ({
+    freshUserPage: page,
+  }) => {
+    const uid = (await currentUid(page))!;
+    await page.goto('/dashboard');
+
+    await expect(page.getByRole('heading', { level: 1, name: 'Bem-vindo ao Pulsar' })).toBeVisible();
+    await expect(page.getByText('Sugestões Científicas Iniciais')).toBeVisible();
+    await expect(page.getByText('Nenhum auto-criado')).toBeVisible();
+    await expect(page.getByText('4 Prontas')).toBeVisible();
+
+    // Nothing is created until the person taps a suggestion.
+    expect(await indicators(uid)).toEqual([]);
+
+    // Names follow the global privacy rule: abbreviations while the eye is closed, names after opening it.
+    await expect(page.getByTestId('suggestion-exercise')).toContainText('EXE');
+    await expect(page.getByTestId('suggestion-exercise')).not.toContainText('Exercício Físico');
+    await page.getByTestId('eye-toggle').click();
+    for (const name of ['Exercício Físico', 'Café Expresso', 'Nível de Energia', 'Concentração / Foco']) {
+      await expect(page.getByRole('main')).toContainText(name);
+    }
+    await expect(page.getByTestId('suggestion-exercise')).toContainText('Fator');
+    await expect(page.getByTestId('suggestion-energy')).toContainText('Resultado');
+
+    await expect(page.getByTestId('create-own-indicator')).toHaveAttribute('href', '/indicators/new');
+  });
+
+  test('a suggestion creates exactly one indicator with the deterministic quick-start configuration', async ({
+    freshUserPage: page,
+  }) => {
+    const uid = (await currentUid(page))!;
+    await page.goto('/dashboard');
+
+    const exercise = page.getByTestId('suggestion-exercise');
+    await exercise.getByRole('button', { name: 'Adicionar' }).click();
+    await expect(exercise).toContainText('Adicionado');
+    await expect(exercise.getByRole('button', { name: 'Adicionado' })).toBeDisabled();
+
+    const created = await indicatorByAbbreviation(uid, 'EXE');
+    expect(created.fields).toMatchObject({
+      name: { stringValue: 'Exercício Físico' },
+      abbreviation: { stringValue: 'EXE' },
+      emoji: { stringValue: '🏃' },
+      group: { stringValue: 'factor' },
+      valueType: { stringValue: 'boolean' },
+      frequency: { stringValue: 'single_per_day' },
+      numeric: { nullValue: null },
+      scale: { nullValue: null },
+      options: { nullValue: null },
+      desiredDirection: { nullValue: null },
+      idealRange: { nullValue: null },
+      dailyAggregation: { nullValue: null },
+      sortOrder: { integerValue: '1000' },
+      archivedAt: { nullValue: null },
+      lockedAt: { nullValue: null },
+    });
+    expect(created.fields.createdAt).toHaveProperty('timestampValue');
+    expect(await indicators(uid)).toHaveLength(1);
+  });
+
+  test('indicators without records explain the insights and the first record is acknowledged', async ({
+    freshUserPage: page,
+    request,
+  }) => {
+    const uid = (await currentUid(page))!;
+    await page.goto('/dashboard');
+
+    await page.getByTestId('suggestion-energy').getByRole('button', { name: 'Adicionar' }).click();
+    const energy = await indicatorByAbbreviation(uid, 'ENE');
+
+    const withoutRecords = page.getByTestId('indicators-without-records');
+    await expect(withoutRecords).toBeVisible();
+    await expect(withoutRecords).toContainText(/insights/i);
+    await expect(withoutRecords).toContainText('Aguardando primeiros dados de registro');
+
+    const indicatorId = energy.name.split('/').at(-1)!;
+    await createScaleEntry(request, uid, indicatorId);
+
+    await page.reload();
+    const thanks = page.getByTestId('first-record-thanks');
+    await expect(thanks).toBeVisible({ timeout: 15_000 });
+    await expect(thanks).toContainText('Obrigado pelo primeiro registro');
+    await expect(thanks).toContainText(/volte amanhã/i);
+    await expect(page.getByTestId('indicators-without-records')).toHaveCount(0);
+    // The acknowledgement is discreet: no pressure, streaks or gamification.
+    await expect(thanks).not.toContainText(/parabéns|sequência|streak|ofensiva/i);
+  });
+});
diff --git a/app/scripts/icons.ts b/app/scripts/icons.ts
index 11b03d4..d64eed5 100644
--- a/app/scripts/icons.ts
+++ b/app/scripts/icons.ts
@@ -37,6 +37,7 @@ const names = [
   'remove',
   'restore',
   'science',
+  'schedule',
   'ssid_chart',
   'touch_app',
   'tune',
diff --git a/app/src/data/__tests__/suggestedIndicators.test.ts b/app/src/data/__tests__/suggestedIndicators.test.ts
new file mode 100644
index 0000000..2b65283
--- /dev/null
+++ b/app/src/data/__tests__/suggestedIndicators.test.ts
@@ -0,0 +1,64 @@
+import { beforeEach, describe, expect, it, vi } from 'vitest';
+import { INDICATOR_SUGGESTIONS, suggestionIndicatorId } from '../../features/indicators/suggestions';
+
+const store = vi.hoisted(() => ({
+  documents: new Map<string, Record<string, unknown>>(),
+  writes: 0,
+}));
+
+vi.mock('../../lib/firebase', () => ({ db: {} }));
+vi.mock('firebase/firestore', () => ({
+  doc: (_db: unknown, ...parts: string[]) => parts.join('/'),
+  serverTimestamp: () => 'server-time',
+  runTransaction: async (
+    _db: unknown,
+    callback: (transaction: {
+      get: (path: string) => Promise<{ exists: () => boolean; data: () => Record<string, unknown> }>;
+      set: (path: string, data: Record<string, unknown>) => void;
+    }) => Promise<boolean>,
+  ) =>
+    callback({
+      get: async (path) => ({
+        exists: () => store.documents.has(path),
+        data: () => store.documents.get(path) ?? {},
+      }),
+      set: (path, data) => {
+        store.documents.set(path, data);
+        store.writes += 1;
+      },
+    }),
+}));
+
+import { createSuggestedIndicator } from '../indicators';
+
+describe('quick-start indicator creation', () => {
+  beforeEach(() => {
+    store.documents.clear();
+    store.writes = 0;
+  });
+
+  it('creates a suggestion once without overwriting a later edit', async () => {
+    const suggestion = INDICATOR_SUGGESTIONS[0]!;
+    const id = suggestionIndicatorId(suggestion.key);
+    const input = { ...suggestion.indicator, sortOrder: suggestion.sortOrder };
+    expect(await createSuggestedIndicator('alice', id, input)).toBe(true);
+    const saved = store.documents.get(`users/alice/indicators/${id}`)!;
+    saved.name = 'Updated name';
+    expect(await createSuggestedIndicator('alice', id, input)).toBe(true);
+    expect(store.writes).toBe(1);
+    expect(saved.name).toBe('Updated name');
+  });
+
+  it('does not restore or replace an archived suggestion', async () => {
+    const suggestion = INDICATOR_SUGGESTIONS[0]!;
+    const id = suggestionIndicatorId(suggestion.key);
+    store.documents.set(`users/alice/indicators/${id}`, { archivedAt: 'archived' });
+    expect(
+      await createSuggestedIndicator('alice', id, {
+        ...suggestion.indicator,
+        sortOrder: suggestion.sortOrder,
+      }),
+    ).toBe(false);
+    expect(store.writes).toBe(0);
+  });
+});
diff --git a/app/src/data/entries.ts b/app/src/data/entries.ts
index 5cadedb..d7ae838 100644
--- a/app/src/data/entries.ts
+++ b/app/src/data/entries.ts
@@ -2,6 +2,7 @@ import {
   collection,
   deleteDoc,
   doc,
+  getCountFromServer,
   getDoc,
   getDocs,
   query,
@@ -13,6 +14,7 @@ import { validateEntryValue, type EntryValue } from '../domain/entry';
 import type { IndicatorInput } from '../domain/indicator';
 import { db } from '../lib/firebase';
 import { localDate } from '../lib/time';
+import { listDocuments } from './firestoreRest';
 
 export interface SaveEntryInput {
   indicatorId: string;
@@ -20,6 +22,22 @@ export interface SaveEntryInput {
   note?: string;
 }
 
+/** One-shot count for screens that must not keep a realtime channel open. */
+export async function countEntries(uid: string): Promise<number> {
+  const snapshot = await getCountFromServer(collection(db, 'users', uid, 'entries'));
+  return snapshot.data().count;
+}
+
+/** Extract the fields needed to determine the dashboard state. */
+export async function listEntryDates(uid: string): Promise<{ indicatorId: string; localDate: string }[]> {
+  const documents = await listDocuments(['users', uid, 'entries']);
+  return documents.flatMap(({ fields }) =>
+    typeof fields.indicatorId === 'string' && typeof fields.localDate === 'string'
+      ? [{ indicatorId: fields.indicatorId, localDate: fields.localDate }]
+      : [],
+  );
+}
+
 export async function saveEntry(uid: string, input: SaveEntryInput): Promise<string> {
   const day = localDate();
   const indicatorRef = doc(db, 'users', uid, 'indicators', input.indicatorId);
diff --git a/app/src/data/indicators.ts b/app/src/data/indicators.ts
index 91f110d..049d0c1 100644
--- a/app/src/data/indicators.ts
+++ b/app/src/data/indicators.ts
@@ -3,14 +3,17 @@ import {
   addDoc,
   collection,
   doc,
+  getCountFromServer,
   onSnapshot,
   orderBy,
   query,
   runTransaction,
   serverTimestamp,
+  where,
   type Timestamp,
 } from 'firebase/firestore';
 import { db } from '../lib/firebase';
+import { listDocuments } from './firestoreRest';
 import {
   suggestAggregation,
   validateIndicator,
@@ -94,6 +97,23 @@ function assertValidSortOrder(sortOrder: number): void {
   }
 }
 
+/** One-shot count for screens that must not keep a realtime channel open. */
+export async function countActiveIndicators(uid: string): Promise<number> {
+  const snapshot = await getCountFromServer(
+    query(indicatorsCollection(uid), where('archivedAt', '==', null)),
+  );
+  return snapshot.data().count;
+}
+
+/** Load IDs and archive status without opening a realtime listener. */
+export async function listIndicatorIdentities(uid: string): Promise<{ id: string; active: boolean }[]> {
+  const documents = await listDocuments(['users', uid, 'indicators']);
+  return documents.map((document) => ({
+    id: document.id,
+    active: document.fields.archivedAt == null,
+  }));
+}
+
 function storedIndicatorFrom(document: {
   id: string;
   data: () => Record<string, unknown> | undefined;
@@ -158,6 +178,38 @@ export async function createIndicator(uid: string, input: CreateIndicatorInput):
   return reference.id;
 }
 
+/** A stable ID makes creation of the same quick-start suggestion safe across devices. */
+export async function createSuggestedIndicator(
+  uid: string,
+  suggestionId: string,
+  input: CreateIndicatorInput,
+): Promise<boolean> {
+  assertValidSortOrder(input.sortOrder);
+  const dailyAggregation =
+    input.dailyAggregation === undefined
+      ? input.frequency === 'single_per_day'
+        ? null
+        : suggestAggregation({ group: input.group, valueType: input.valueType })
+      : input.dailyAggregation;
+  const indicator = indicatorInputFrom({ ...input, dailyAggregation });
+  assertValidIndicator(indicator);
+
+  const reference = indicatorRef(uid, suggestionId);
+  return runTransaction(db, async (transaction) => {
+    const snapshot = await transaction.get(reference);
+    if (snapshot.exists()) return snapshot.data().archivedAt == null;
+    transaction.set(reference, {
+      ...indicator,
+      sortOrder: input.sortOrder,
+      archivedAt: null,
+      lockedAt: null,
+      createdAt: serverTimestamp(),
+      updatedAt: serverTimestamp(),
+    });
+    return true;
+  });
+}
+
 export async function updateIndicator(uid: string, id: string, patch: UpdateIndicatorInput): Promise<void> {
   const reference = indicatorRef(uid, id);
   await runTransaction(db, async (transaction) => {
diff --git a/app/src/design/IndicatorLabel.tsx b/app/src/design/IndicatorLabel.tsx
index 14892e0..2b43cbf 100644
--- a/app/src/design/IndicatorLabel.tsx
+++ b/app/src/design/IndicatorLabel.tsx
@@ -8,6 +8,8 @@ interface IndicatorLabelProps {
   variant?: 'text' | 'badge';
   group?: IndicatorGroup;
   className?: string;
+  /** Always show the acronym (never the name/emoji), e.g. the code chip above a title. */
+  abbreviationOnly?: boolean;
 }
 
 const badgeTone: Record<IndicatorGroup, string> = {
@@ -19,9 +21,15 @@ const badgeTone: Record<IndicatorGroup, string> = {
  * The ONLY way to render an indicator name/abbreviation/emoji. Honors the global eye toggle:
  * closed -> abbreviation, no emoji; open -> full name + emoji. Never use indicator.name directly in JSX.
  */
-export function IndicatorLabel({ indicator, variant = 'text', group, className = '' }: IndicatorLabelProps) {
+export function IndicatorLabel({
+  indicator,
+  variant = 'text',
+  group,
+  className = '',
+  abbreviationOnly = false,
+}: IndicatorLabelProps) {
   const { isNameRevealed } = usePrivacy();
-  const { text, emoji } = indicatorLabel(indicator, isNameRevealed);
+  const { text, emoji } = indicatorLabel(indicator, isNameRevealed && !abbreviationOnly);
   const style =
     variant === 'badge'
       ? `rounded-md px-2 py-0.5 font-label-code text-label-code ${group ? badgeTone[group] : 'bg-surface-container text-on-surface'}`
diff --git a/app/src/design/icons.ts b/app/src/design/icons.ts
index 4766114..6e29fdb 100644
--- a/app/src/design/icons.ts
+++ b/app/src/design/icons.ts
@@ -55,6 +55,8 @@ export const iconPaths = {
     'M480 -120Q342 -120 239.5 -211.5Q137 -303 122 -440L204 -440Q218 -336 296.5 -268Q375 -200 480 -200Q597 -200 678.5 -281.5Q760 -363 760 -480Q760 -597 678.5 -678.5Q597 -760 480 -760Q411 -760 351 -728Q291 -696 250 -640L360 -640L360 -560L120 -560L120 -800L200 -800L200 -706Q251 -770 324.5 -805Q398 -840 480 -840Q555 -840 620.5 -811.5Q686 -783 734.5 -734.5Q783 -686 811.5 -620.5Q840 -555 840 -480Q840 -405 811.5 -339.5Q783 -274 734.5 -225.5Q686 -177 620.5 -148.5Q555 -120 480 -120ZM592 -312L440 -464L440 -680L520 -680L520 -496L648 -368Z',
   science:
     'M200 -120Q149 -120 127.5 -165.5Q106 -211 138 -250L360 -520L360 -760L320 -760Q303 -760 291.5 -771.5Q280 -783 280 -800Q280 -817 291.5 -828.5Q303 -840 320 -840L640 -840Q657 -840 668.5 -828.5Q680 -817 680 -800Q680 -783 668.5 -771.5Q657 -760 640 -760L600 -760L600 -520L822 -250Q854 -211 832.5 -165.5Q811 -120 760 -120ZM200 -200L760 -200L520 -492L520 -760L440 -760L440 -492ZM480 -480L480 -480L480 -480L480 -480L480 -480L480 -480Z',
+  schedule:
+    'M612 -292L668 -348L520 -496L520 -680L440 -680L440 -464ZM480 -80Q397 -80 324 -111.5Q251 -143 197 -197Q143 -251 111.5 -324Q80 -397 80 -480Q80 -563 111.5 -636Q143 -709 197 -763Q251 -817 324 -848.5Q397 -880 480 -880Q563 -880 636 -848.5Q709 -817 763 -763Q817 -709 848.5 -636Q880 -563 880 -480Q880 -397 848.5 -324Q817 -251 763 -197Q709 -143 636 -111.5Q563 -80 480 -80ZM480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480ZM480 -160Q613 -160 706.5 -253.5Q800 -347 800 -480Q800 -613 706.5 -706.5Q613 -800 480 -800Q347 -800 253.5 -706.5Q160 -613 160 -480Q160 -347 253.5 -253.5Q347 -160 480 -160Z',
   ssid_chart:
     'M480 -120L232 -360L120 -280L120 -378L240 -464L485 -226L652 -360L840 -360L840 -280L680 -280ZM480 -480L305 -655L120 -520L120 -619L313 -760L488 -585L840 -840L840 -741Z',
   touch_app:
diff --git a/app/src/features/indicators/__tests__/suggestions.test.ts b/app/src/features/indicators/__tests__/suggestions.test.ts
new file mode 100644
index 0000000..24bdb11
--- /dev/null
+++ b/app/src/features/indicators/__tests__/suggestions.test.ts
@@ -0,0 +1,48 @@
+import { describe, expect, it } from 'vitest';
+import { validateIndicator } from '../../../domain/indicator';
+import { INDICATOR_SUGGESTIONS } from '../suggestions';
+
+describe('empty dashboard suggestions', () => {
+  it('offers two Factors and two Results with valid, complete configurations', () => {
+    expect(INDICATOR_SUGGESTIONS).toHaveLength(4);
+    expect(INDICATOR_SUGGESTIONS.filter((s) => s.indicator.group === 'factor')).toHaveLength(2);
+    expect(INDICATOR_SUGGESTIONS.filter((s) => s.indicator.group === 'result')).toHaveLength(2);
+
+    for (const suggestion of INDICATOR_SUGGESTIONS) {
+      const validation = validateIndicator(suggestion.indicator);
+      expect(validation.errors, suggestion.indicator.name).toEqual([]);
+      expect(suggestion.indicator.abbreviation).not.toBeNull();
+    }
+  });
+
+  it('keeps the quick-start configurations deterministic', () => {
+    const byKey = Object.fromEntries(
+      INDICATOR_SUGGESTIONS.map((suggestion) => [suggestion.key, suggestion.indicator]),
+    );
+
+    expect(byKey.exercise).toMatchObject({
+      group: 'factor',
+      valueType: 'boolean',
+      frequency: 'single_per_day',
+      dailyAggregation: null,
+    });
+    expect(byKey.coffee).toMatchObject({
+      group: 'factor',
+      valueType: 'numeric',
+      frequency: 'multiple_per_day',
+      dailyAggregation: 'sum',
+    });
+    expect(byKey.energy).toMatchObject({
+      group: 'result',
+      valueType: 'scale',
+      desiredDirection: 'higher',
+      frequency: 'single_per_day',
+    });
+    expect(byKey.focus).toMatchObject({
+      group: 'result',
+      valueType: 'scale',
+      desiredDirection: 'target_range',
+      idealRange: { min: 7, max: 10 },
+    });
+  });
+});
diff --git a/app/src/features/indicators/suggestions.ts b/app/src/features/indicators/suggestions.ts
new file mode 100644
index 0000000..0d05ca9
--- /dev/null
+++ b/app/src/features/indicators/suggestions.ts
@@ -0,0 +1,116 @@
+import type { IconName } from '../../design';
+import type { IndicatorInput } from '../../domain/indicator';
+
+/**
+ * Quick-start suggestions of the empty dashboard (spec 3.1 / 5.4).
+ *
+ * The configurations are fixed so a new account never starts with implicitly created indicators:
+ * tapping a suggestion is the only way to create one of them. Keep the four suggestions matching
+ * design/dashboard_inicial_estado_vazio (two Factors and two Results).
+ */
+
+export type SuggestionKey = 'exercise' | 'coffee' | 'energy' | 'focus';
+
+export function suggestionIndicatorId(key: SuggestionKey): string {
+  return `suggestion-${key}`;
+}
+
+export interface IndicatorSuggestion {
+  key: SuggestionKey;
+  /** Decorative icon shown in the suggestion card. */
+  icon: IconName;
+  /** Factual format hint ("Booleano (Sim / Não)", "Escala 0 a 10"...). */
+  format: string;
+  /** Frequency or direction hint shown next to the group badge. */
+  meta: string;
+  /** Fixed order inside the group, so quick-start indicators line up deterministically. */
+  sortOrder: number;
+  indicator: IndicatorInput;
+}
+
+export const INDICATOR_SUGGESTIONS: readonly IndicatorSuggestion[] = [
+  {
+    key: 'exercise',
+    icon: 'fitness_center',
+    format: 'Booleano (Sim / Não)',
+    meta: '1x ao dia',
+    sortOrder: 1000,
+    indicator: {
+      group: 'factor',
+      name: 'Exercício Físico',
+      abbreviation: 'EXE',
+      emoji: '🏃',
+      valueType: 'boolean',
+      numeric: null,
+      scale: null,
+      options: null,
+      desiredDirection: null,
+      idealRange: null,
+      frequency: 'single_per_day',
+      dailyAggregation: null,
+    },
+  },
+  {
+    key: 'coffee',
+    icon: 'coffee',
+    format: 'Numérico (Xícaras)',
+    meta: 'Múltiplos registros',
+    sortOrder: 2000,
+    indicator: {
+      group: 'factor',
+      name: 'Café Expresso',
+      abbreviation: 'CAF',
+      emoji: '☕',
+      valueType: 'numeric',
+      numeric: { unit: 'xícaras', min: 0, max: null, step: 1 },
+      scale: null,
+      options: null,
+      desiredDirection: null,
+      idealRange: null,
+      frequency: 'multiple_per_day',
+      dailyAggregation: 'sum',
+    },
+  },
+  {
+    key: 'energy',
+    icon: 'bolt',
+    format: 'Escala 0 a 10',
+    meta: 'Quanto maior, melhor',
+    sortOrder: 1000,
+    indicator: {
+      group: 'result',
+      name: 'Nível de Energia',
+      abbreviation: 'ENE',
+      emoji: '⚡',
+      valueType: 'scale',
+      numeric: null,
+      scale: { min: 0, max: 10, step: 1 },
+      options: null,
+      desiredDirection: 'higher',
+      idealRange: null,
+      frequency: 'single_per_day',
+      dailyAggregation: null,
+    },
+  },
+  {
+    key: 'focus',
+    icon: 'psychology',
+    format: 'Escala 0 a 10',
+    meta: 'Faixa ideal: 7 a 10',
+    sortOrder: 2000,
+    indicator: {
+      group: 'result',
+      name: 'Concentração / Foco',
+      abbreviation: 'CON',
+      emoji: null,
+      valueType: 'scale',
+      numeric: null,
+      scale: { min: 0, max: 10, step: 1 },
+      options: null,
+      desiredDirection: 'target_range',
+      idealRange: { min: 7, max: 10 },
+      frequency: 'single_per_day',
+      dailyAggregation: null,
+    },
+  },
+];
diff --git a/app/src/pages/DashboardPage.tsx b/app/src/pages/DashboardPage.tsx
index fd264ac..c33e830 100644
--- a/app/src/pages/DashboardPage.tsx
+++ b/app/src/pages/DashboardPage.tsx
@@ -1,21 +1,448 @@
+import { useEffect, useState } from 'react';
+import { Link } from 'react-router';
 import { SaveAccountInviteBanner } from '../account/SaveAccountInviteBanner';
-import { PlaceholderPage } from './PlaceholderPage';
+import { useAuth } from '../auth/AuthProvider';
+import { listEntryDates } from '../data/entries';
+import { createSuggestedIndicator, listIndicatorIdentities } from '../data/indicators';
+import { Button, Card, GroupBadge, Icon, IndicatorLabel } from '../design';
+import {
+  INDICATOR_SUGGESTIONS,
+  suggestionIndicatorId,
+  type IndicatorSuggestion,
+  type SuggestionKey,
+} from '../features/indicators/suggestions';
+
+const codeLabel = 'font-label-code text-label-code tracking-wider uppercase';
 
 /**
- * Dashboard screen. It shows the discreet "save your account" invite (anonymous accounts only)
- * above the empty state that arrives with the dashboard feature.
+ * Dashboard of a new account (design/dashboard_inicial_estado_vazio).
+ *
+ * Nothing is created automatically: the welcome card offers 3-4 quick-start suggestions plus
+ * "Criar meu próprio indicador". Once indicators exist the page explains that insights arrive
+ * with the first records, and the first saved record gets a discreet acknowledgement.
  */
 export function DashboardPage() {
+  const { user } = useAuth();
+  const uid = user?.uid ?? '';
+  const [activeIndicatorCount, setActiveIndicatorCount] = useState<number | null>(null);
+  const [entryCount, setEntryCount] = useState<number | null>(null);
+  const [isFirstRecordDay, setIsFirstRecordDay] = useState(false);
+  const [existingSuggestionKeys, setExistingSuggestionKeys] = useState<SuggestionKey[]>([]);
+  const [loading, setLoading] = useState(Boolean(uid));
+  const [loadError, setLoadError] = useState<Error | null>(null);
+  const [creatingKey, setCreatingKey] = useState<SuggestionKey | null>(null);
+  const [addedKeys, setAddedKeys] = useState<SuggestionKey[]>([]);
+  const [createError, setCreateError] = useState<string | null>(null);
+
+  useEffect(() => {
+    let active = true;
+    if (!uid) {
+      setActiveIndicatorCount(null);
+      setEntryCount(null);
+      setIsFirstRecordDay(false);
+      setExistingSuggestionKeys([]);
+      setAddedKeys([]);
+      setLoading(false);
+      return;
+    }
+
+    // Aggregation queries are one-shot: the dashboard never leaves a realtime Listen channel open.
+    setActiveIndicatorCount(null);
+    setEntryCount(null);
+    setIsFirstRecordDay(false);
+    setExistingSuggestionKeys([]);
+    setAddedKeys([]);
+    setLoading(true);
+    setLoadError(null);
+    void (async () => {
+      try {
+        const [indicators, entries] = await Promise.all([listIndicatorIdentities(uid), listEntryDates(uid)]);
+        if (!active) return;
+        const activeIds = new Set(indicators.filter((indicator) => indicator.active).map(({ id }) => id));
+        const existingIds = new Set(indicators.map(({ id }) => id));
+        const activeEntries = entries.filter((entry) => activeIds.has(entry.indicatorId));
+        setActiveIndicatorCount(activeIds.size);
+        setEntryCount(activeEntries.length);
+        setIsFirstRecordDay(activeEntries.length === 1 && entries.length === 1);
+        setExistingSuggestionKeys(
+          INDICATOR_SUGGESTIONS.filter(({ key }) => existingIds.has(suggestionIndicatorId(key))).map(
+            ({ key }) => key,
+          ),
+        );
+        setLoading(false);
+      } catch (cause) {
+        if (!active) return;
+        setLoadError(cause instanceof Error ? cause : new Error('Unable to load dashboard data.'));
+        setLoading(false);
+      }
+    })();
+    return () => {
+      active = false;
+    };
+  }, [uid]);
+
+  const hasIndicators = (activeIndicatorCount ?? 0) > 0;
+  const totalEntries = entryCount ?? 0;
+  const hasEntries = totalEntries > 0;
+  const ready = !loading && !loadError;
+  const showEmpty = ready && !hasIndicators;
+  const showNoRecords = ready && hasIndicators && !hasEntries;
+  const showSuggestions = ready && !hasEntries;
+
+  const createdKeys = new Set<SuggestionKey>([...addedKeys, ...existingSuggestionKeys]);
+  const createdSuggestions = INDICATOR_SUGGESTIONS.filter((suggestion) => createdKeys.has(suggestion.key));
+  const remainingSuggestions = INDICATOR_SUGGESTIONS.length - createdSuggestions.length;
+
+  async function addSuggestion(suggestion: IndicatorSuggestion) {
+    if (!uid || creatingKey !== null) return;
+    setCreatingKey(suggestion.key);
+    setCreateError(null);
+    try {
+      const active = await createSuggestedIndicator(uid, suggestionIndicatorId(suggestion.key), {
+        ...suggestion.indicator,
+        sortOrder: suggestion.sortOrder,
+      });
+      if (!active) {
+        setExistingSuggestionKeys((keys) => [...keys, suggestion.key]);
+        setCreateError('Este indicador está arquivado. Para usá-lo, restaure-o em Meus indicadores.');
+        return;
+      }
+      setAddedKeys((keys) => (keys.includes(suggestion.key) ? keys : [...keys, suggestion.key]));
+      setActiveIndicatorCount((count) => (count ?? 0) + 1);
+    } catch {
+      setCreateError('Não foi possível adicionar a sugestão. Verifique a conexão e tente novamente.');
+    } finally {
+      setCreatingKey(null);
+    }
+  }
+
   return (
-    <div className="flex flex-col gap-space-lg">
+    <div className="flex flex-col gap-space-lg pb-space-lg">
       <SaveAccountInviteBanner />
-      <PlaceholderPage
-        title="Seu painel"
-        icon="ssid_chart"
-        emptyTitle="Comece registrando o seu dia"
-        description="O Pulsar cruza fatores e resultados para revelar relações entre a sua rotina e como você se sente."
-        cta={{ label: 'Registrar agora', to: '/register' }}
-      />
+      <header className="flex flex-col gap-space-xs pt-2">
+        <span className={`${codeLabel} text-on-surface-variant`}>Laboratório Pessoal</span>
+        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
+          Bem-vindo ao Pulsar
+        </h1>
+      </header>
+
+      {loadError && (
+        <p role="alert" className="font-body-md text-body-md text-error">
+          Não foi possível carregar seus dados. Verifique a conexão e tente novamente.
+        </p>
+      )}
+
+      {loading && !loadError && (
+        <p role="status" className="font-body-md text-body-md text-on-surface-variant">
+          Carregando seus dados…
+        </p>
+      )}
+
+      {showEmpty && <WelcomeCard />}
+
+      {showNoRecords && <NoRecordsCard />}
+
+      {ready && hasEntries && isFirstRecordDay && <FirstRecordThanks />}
+
+      {ready && hasEntries && !isFirstRecordDay && <PanelSummary entryCount={totalEntries} />}
+
+      {ready && createError && (
+        <p role="alert" className="font-body-md text-body-md text-error">
+          {createError}
+        </p>
+      )}
+
+      {showSuggestions && (
+        <section aria-labelledby="suggestions-title" className="flex flex-col gap-space-md">
+          <div className="flex flex-wrap items-center justify-between gap-x-space-sm gap-y-1 px-1">
+            <div className="flex min-w-0 flex-wrap items-center gap-2">
+              <h2 id="suggestions-title" className={`${codeLabel} text-on-surface-variant`}>
+                Sugestões Científicas Iniciais
+              </h2>
+              <span className="shrink-0 rounded-full bg-surface-container-high px-2 py-0.5 font-label-code text-label-code font-semibold text-primary">
+                {remainingSuggestions} {remainingSuggestions === 1 ? 'Pronta' : 'Prontas'}
+              </span>
+            </div>
+            <span className="shrink-0 font-label-md text-label-md text-on-surface-variant">
+              Nenhum auto-criado
+            </span>
+          </div>
+
+          <div id="indicators-catalog" className="flex flex-col gap-space-sm">
+            {INDICATOR_SUGGESTIONS.map((suggestion) => (
+              <SuggestionCard
+                key={suggestion.key}
+                suggestion={suggestion}
+                added={createdSuggestions.some((created) => created.key === suggestion.key)}
+                busy={creatingKey === suggestion.key}
+                disabled={creatingKey !== null}
+                onAdd={() => void addSuggestion(suggestion)}
+              />
+            ))}
+          </div>
+        </section>
+      )}
+
+      {showSuggestions && <CreateOwnIndicatorCard />}
+
+      {ready && !hasEntries && <InsightsExplanationCard />}
     </div>
   );
 }
+
+function WelcomeCard() {
+  return (
+    <Card className="relative gap-space-md overflow-hidden bg-gradient-to-br from-surface-container-low via-surface-container-lowest to-surface-container-low">
+      <span
+        aria-hidden="true"
+        className="pointer-events-none absolute -top-12 -right-12 size-36 rounded-full bg-primary-fixed/25 blur-2xl"
+      />
+      <div className="relative z-10 flex items-start gap-space-md">
+        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary shadow-level-1">
+          <Icon name="science" className="text-[22px]" />
+        </span>
+        <div className="flex min-w-0 flex-col gap-1">
+          <h2 className="font-headline-md text-headline-md text-on-surface">
+            Sua rotina, seus dados, suas conclusões
+          </h2>
+          <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">
+            O Pulsar cruza o que você faz com o que você sente. Escolha as variáveis iniciais abaixo para
+            começar sua série temporal ou crie uma do zero.
+          </p>
+        </div>
+      </div>
+    </Card>
+  );
+}
+
+function SuggestionCard({
+  suggestion,
+  added,
+  busy,
+  disabled,
+  onAdd,
+}: {
+  suggestion: IndicatorSuggestion;
+  added: boolean;
+  busy: boolean;
+  disabled: boolean;
+  onAdd: () => void;
+}) {
+  const isFactor = suggestion.indicator.group === 'factor';
+  const designId = suggestion.indicator.abbreviation?.toLowerCase();
+
+  return (
+    <Card
+      id={designId ? `card-${designId}` : undefined}
+      data-testid={`suggestion-${suggestion.key}`}
+      className="gap-0 p-space-md"
+    >
+      <div className="flex items-center justify-between gap-space-sm">
+        <div className="flex min-w-0 flex-1 items-center gap-space-sm">
+          <span
+            aria-hidden="true"
+            className={`flex size-11 shrink-0 items-center justify-center rounded-full ${
+              isFactor ? 'bg-secondary-fixed/50 text-secondary' : 'bg-primary-fixed/50 text-primary'
+            }`}
+          >
+            <Icon name={suggestion.icon} className="text-[22px]" />
+          </span>
+          <div className="flex min-w-0 flex-1 flex-col">
+            <div className="flex flex-wrap items-center gap-1">
+              <IndicatorLabel
+                indicator={suggestion.indicator}
+                variant="badge"
+                group={suggestion.indicator.group}
+                abbreviationOnly
+              />
+              <GroupBadge group={suggestion.indicator.group} />
+            </div>
+            <span className="mt-1 truncate font-body-sm text-body-sm text-on-surface-variant">
+              • {suggestion.meta}
+            </span>
+            <h3 className="truncate font-headline-md text-headline-md text-on-surface">
+              <IndicatorLabel indicator={suggestion.indicator} />
+            </h3>
+            <p className="truncate font-body-sm text-body-sm text-on-surface-variant">{suggestion.format}</p>
+          </div>
+        </div>
+        <Button
+          variant={isFactor ? 'factor' : 'primary'}
+          icon={added ? 'check_circle' : 'add'}
+          onClick={onAdd}
+          disabled={added || disabled}
+          className="shrink-0 !px-3.5"
+        >
+          {added ? 'Adicionado' : busy ? 'Adicionando' : 'Adicionar'}
+        </Button>
+      </div>
+    </Card>
+  );
+}
+
+function CreateOwnIndicatorCard() {
+  return (
+    <Card className="gap-3 bg-surface-container-low">
+      <div className="flex flex-col gap-1">
+        <h2 className="font-headline-md text-headline-md text-on-surface">Quer rastrear algo específico?</h2>
+        <p className="font-body-sm text-body-sm text-on-surface-variant">
+          Personalize nome, unidade, tipo de resposta e frequência de coleta como preferir.
+        </p>
+      </div>
+      <Link
+        to="/indicators/new"
+        data-testid="create-own-indicator"
+        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-surface-container-highest font-label-lg text-label-lg text-primary shadow-level-1 transition-transform active:scale-[0.98]"
+      >
+        <Icon name="add_circle" className="text-[20px]" />
+        Criar meu próprio indicador
+      </Link>
+    </Card>
+  );
+}
+
+function NoRecordsCard() {
+  return (
+    <Card data-testid="indicators-without-records" className="gap-space-sm">
+      <div className="flex items-start gap-space-sm">
+        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed-variant">
+          <Icon name="insights" className="text-[22px]" />
+        </span>
+        <div className="flex min-w-0 flex-col gap-0.5">
+          <span className={`${codeLabel} text-on-surface-variant`}>Estado atual</span>
+          <h2 className="font-headline-md text-headline-md text-on-surface">
+            Seus indicadores ainda não têm registros
+          </h2>
+        </div>
+      </div>
+      <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">
+        Os insights aparecerão conforme você preencher seus dias: primeiro vem o retrato do dia, depois as
+        comparações e, com dados suficientes, as possíveis associações.
+      </p>
+      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-surface-container-low px-2.5 py-1 font-label-code text-label-code text-on-surface-variant">
+        <Icon name="schedule" className="text-[14px] text-primary" />
+        Aguardando primeiros dados de registro
+      </span>
+    </Card>
+  );
+}
+
+function FirstRecordThanks() {
+  return (
+    <Card data-testid="first-record-thanks" className="gap-space-sm border border-tertiary-fixed-dim/60">
+      <div className="flex items-start gap-space-sm">
+        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tertiary/10 text-tertiary">
+          <Icon name="verified" className="text-[22px]" />
+        </span>
+        <div className="flex min-w-0 flex-col gap-0.5">
+          <span className={`${codeLabel} text-on-surface-variant`}>Primeiro registro</span>
+          <h2 className="font-headline-md text-headline-md text-on-surface">
+            Obrigado pelo primeiro registro.
+          </h2>
+        </div>
+      </div>
+      <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">
+        Seu primeiro dia está salvo. Volte amanhã para acompanhar suas comparações — no seu ritmo, sem
+        cobranças.
+      </p>
+    </Card>
+  );
+}
+
+function PanelSummary({ entryCount }: { entryCount: number }) {
+  return (
+    <Card className="gap-space-xs">
+      <span className={`${codeLabel} text-on-surface-variant`}>Seu painel</span>
+      <h2 className="font-headline-md text-headline-md text-on-surface">
+        {entryCount} registros no seu histórico
+      </h2>
+      <p className="font-body-md text-body-md text-on-surface-variant">
+        Continue registrando para que os insights ganhem força ao longo dos dias.
+      </p>
+    </Card>
+  );
+}
+
+function TimelineStep({ marker, title, children }: { marker: string; title: string; children: string }) {
+  return (
+    <li className="flex items-start gap-2.5">
+      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-container font-label-code text-label-code text-on-surface">
+        {marker}
+      </span>
+      <span className="font-body-sm text-body-sm text-on-surface-variant">
+        <strong className="font-semibold text-on-surface">{title}</strong> {children}
+      </span>
+    </li>
+  );
+}
+
+function InsightsExplanationCard() {
+  return (
+    <Card data-testid="insights-explanation" className="gap-space-md">
+      <div className="flex flex-wrap items-center justify-between gap-x-space-sm gap-y-1">
+        <div className="flex min-w-0 items-center gap-2">
+          <Icon name="insights" className="text-[22px] text-primary" />
+          <h2 className="font-headline-md text-headline-md text-on-surface">Como os Insights funcionam?</h2>
+        </div>
+        <span
+          className={`${codeLabel} shrink-0 rounded-full bg-surface-container px-2 py-0.5 text-on-surface-variant`}
+        >
+          Metodologia
+        </span>
+      </div>
+
+      <div className="relative flex h-24 w-full items-center justify-center overflow-hidden rounded-2xl bg-surface-container-low px-4">
+        <svg
+          aria-hidden="true"
+          className="h-full w-full"
+          viewBox="0 0 320 80"
+          fill="none"
+          preserveAspectRatio="none"
+        >
+          <path
+            d="M 0 50 Q 80 20, 160 55 T 320 30"
+            className="text-secondary"
+            opacity="0.35"
+            stroke="currentColor"
+            strokeDasharray="4 4"
+            strokeWidth="2"
+          />
+          <path
+            d="M 0 35 Q 90 65, 170 30 T 320 50"
+            className="text-primary"
+            opacity="0.45"
+            stroke="currentColor"
+            strokeDasharray="4 4"
+            strokeWidth="2"
+          />
+          <circle cx="80" cy="35" r="3" className="fill-secondary" opacity="0.6" />
+          <circle cx="240" cy="40" r="3" className="fill-primary" opacity="0.6" />
+        </svg>
+        <span className="absolute right-0 bottom-2 left-0 flex justify-center">
+          <span className="flex items-center gap-1.5 rounded-full bg-surface-container-lowest/80 px-2.5 py-1 font-label-code text-label-code text-on-surface-variant shadow-level-1 backdrop-blur-sm">
+            <Icon name="schedule" className="text-[14px] text-primary" />
+            Aguardando primeiros dados de registro
+          </span>
+        </span>
+      </div>
+
+      <ol className="flex flex-col gap-space-sm">
+        <TimelineStep marker="1" title="Dia 1:">
+          Retrato factual e visual imediato do seu preenchimento.
+        </TimelineStep>
+        <TimelineStep marker="2" title="A partir do Dia 2:">
+          Comparações descritivas entre seus dias de rotina.
+        </TimelineStep>
+        <TimelineStep marker="14" title="A partir de 14 pares válidos:">
+          Primeiras possíveis associações estatísticas entre fatores e resultados.
+        </TimelineStep>
+      </ol>
+      <Link
+        to="/register"
+        className="inline-flex min-h-11 items-center justify-center rounded-full bg-surface-container-highest px-4 font-label-lg text-label-lg text-primary"
+      >
+        Registrar agora
+      </Link>
+    </Card>
+  );
+}
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
