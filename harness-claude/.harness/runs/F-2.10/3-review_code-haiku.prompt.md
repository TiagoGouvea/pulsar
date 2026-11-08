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
diff --git a/app/e2e/indicator-create.spec.ts b/app/e2e/indicator-create.spec.ts
deleted file mode 100644
index 88ff75d..0000000
--- a/app/e2e/indicator-create.spec.ts
+++ /dev/null
@@ -1,153 +0,0 @@
-import type { APIRequestContext } from '@playwright/test';
-import firebaseJson from '../firebase.json' with { type: 'json' };
-import { currentUid, expect, test } from './fixtures';
-
-const PROJECT = 'demo-pulsar';
-const FIRESTORE_DOCUMENTS = `http://127.0.0.1:${firebaseJson.emulators.firestore.port}/v1/projects/${PROJECT}/databases/(default)/documents`;
-
-type FirestoreValue = Record<string, unknown> & { nullValue?: unknown };
-type FirestoreDocument = { name: string; fields?: Record<string, FirestoreValue> };
-
-function decodeValue(value: FirestoreValue): unknown {
-  if ('nullValue' in value) return null;
-  if ('stringValue' in value) return value.stringValue;
-  if ('booleanValue' in value) return value.booleanValue;
-  if ('integerValue' in value) return Number(value.integerValue);
-  if ('doubleValue' in value) return Number(value.doubleValue);
-  if ('timestampValue' in value) return value.timestampValue;
-  if ('mapValue' in value) {
-    const map = value.mapValue as { fields?: Record<string, FirestoreValue> };
-    return decodeFields(map.fields);
-  }
-  if ('arrayValue' in value) {
-    const array = value.arrayValue as { values?: FirestoreValue[] };
-    return (array.values ?? []).map(decodeValue);
-  }
-  return undefined;
-}
-
-function decodeFields(fields: Record<string, FirestoreValue> = {}): Record<string, unknown> {
-  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
-}
-
-/** Reads the user's indicators straight from the Firestore emulator (rules bypassed as owner). */
-async function storedIndicators(
-  request: APIRequestContext,
-  uid: string,
-): Promise<(Record<string, unknown> & { id: string })[]> {
-  const response = await request.get(`${FIRESTORE_DOCUMENTS}/users/${uid}/indicators`, {
-    headers: { Authorization: 'Bearer owner' },
-  });
-  expect(response.ok()).toBeTruthy();
-  const body = (await response.json()) as { documents?: FirestoreDocument[] };
-  return (body.documents ?? []).map((document) => ({
-    id: document.name.split('/').pop() ?? '',
-    ...decodeFields(document.fields),
-  }));
-}
-
-test.describe('F-2.03 create indicator', () => {
-  test('requires a name, previews the abbreviation and shows the real name with the eye closed', async ({
-    freshUserPage: page,
-  }) => {
-    await page.goto('/indicators/new');
-    await expect(page.getByRole('dialog', { name: 'Novo Indicador' })).toBeVisible();
-    await expect(page.getByTestId('eye-toggle')).toHaveAttribute('aria-pressed', 'false');
-
-    await page.getByRole('button', { name: 'Criar Indicador' }).click();
-    await expect(page.getByText('Informe um nome para o indicador.')).toBeVisible();
-
-    const name = page.getByRole('textbox', { name: /Nome do Indicador/ });
-    await expect(name).toHaveAttribute('data-privacy-allow');
-    await name.fill('Abcdef');
-    await expect(name).toHaveValue('Abcdef');
-    await expect(page.getByTestId('abbreviation-preview')).toContainText('Abc...');
-  });
-
-  test('creates a numeric result with unit, ideal range and chosen aggregation', async ({
-    freshUserPage: page,
-    request,
-  }) => {
-    await page.goto('/indicators/new');
-    await page.getByRole('radio', { name: 'Resultado' }).click();
-    await page.getByRole('textbox', { name: /Nome do Indicador/ }).fill('Peso matinal');
-    await page.getByRole('textbox', { name: 'Sigla' }).fill('PES');
-    await page.getByRole('radio', { name: 'Número + unidade' }).click();
-    await page.getByRole('combobox', { name: 'Unidade' }).selectOption('kg');
-    await page.getByRole('button', { name: 'Múltiplos registros' }).click();
-
-    // Aggregation only appears for multiple-per-day and only lists valid options.
-    await expect(page.getByTestId('aggregation-control')).toBeVisible();
-    await expect(page.getByTestId('aggregation-suggested')).toHaveText('Último');
-    await page.getByRole('button', { name: /Configurações avançadas/ }).click();
-    await expect(page.getByTestId('aggregation-control').getByRole('radio')).toHaveCount(3);
-    await expect(
-      page.getByTestId('aggregation-control').getByRole('radio', { name: 'Presença' }),
-    ).toHaveCount(0);
-    await page.getByTestId('aggregation-control').getByRole('radio', { name: 'Média' }).click();
-
-    await page.getByRole('button', { name: 'Faixa ideal' }).click();
-    await page.getByRole('textbox', { name: 'Mínimo ideal' }).fill('70');
-    await page.getByRole('textbox', { name: 'Máximo ideal' }).fill('75');
-    await page.getByRole('button', { name: 'Criar Indicador' }).click();
-
-    await expect(page).toHaveURL(/\/indicators$/);
-    const uid = await currentUid(page);
-    expect(uid).not.toBeNull();
-    const indicators = await storedIndicators(request, uid ?? '');
-    expect(indicators).toHaveLength(1);
-    expect(indicators[0]).toMatchObject({
-      name: 'Peso matinal',
-      abbreviation: 'PES',
-      group: 'result',
-      valueType: 'numeric',
-      numeric: { unit: 'kg' },
-      frequency: 'multiple_per_day',
-      dailyAggregation: 'mean',
-      desiredDirection: 'target_range',
-      idealRange: { min: 70, max: 75 },
-    });
-  });
-
-  test('creates an ordinal indicator with editable options and no aggregation when single', async ({
-    freshUserPage: page,
-    request,
-  }) => {
-    await page.goto('/indicators/new');
-    await page.getByRole('textbox', { name: /Nome do Indicador/ }).fill('Humor');
-    await page.getByRole('textbox', { name: 'Sigla' }).fill('HUM');
-    await page.getByRole('radio', { name: 'Opções ordenadas' }).click();
-
-    await page.getByRole('textbox', { name: 'Opção 1', exact: true }).fill('Ruim');
-    await page.getByRole('textbox', { name: 'Opção 2', exact: true }).fill('Regular');
-    await page.getByRole('textbox', { name: 'Opção 3', exact: true }).fill('Bom');
-    await page.getByRole('button', { name: 'Adicionar opção' }).click();
-    await page.getByRole('textbox', { name: 'Opção 4', exact: true }).fill('Excelente');
-
-    // Single-per-day indicators never show aggregation.
-    await expect(page.getByTestId('aggregation-control')).toHaveCount(0);
-    await page.getByRole('button', { name: 'Emoji 🙂' }).click();
-    await page.getByRole('button', { name: 'Criar Indicador' }).click();
-
-    await expect(page).toHaveURL(/\/indicators$/);
-    const uid = await currentUid(page);
-    const indicators = await storedIndicators(request, uid ?? '');
-    expect(indicators).toHaveLength(1);
-    expect(indicators[0]).toMatchObject({
-      name: 'Humor',
-      abbreviation: 'HUM',
-      emoji: '🙂',
-      group: 'factor',
-      valueType: 'ordinal',
-      frequency: 'single_per_day',
-      dailyAggregation: null,
-      desiredDirection: null,
-    });
-    expect(indicators[0]?.options).toEqual([
-      expect.objectContaining({ label: 'Ruim' }),
-      expect.objectContaining({ label: 'Regular' }),
-      expect.objectContaining({ label: 'Bom' }),
-      expect.objectContaining({ label: 'Excelente' }),
-    ]);
-  });
-});
diff --git a/app/e2e/indicator-edit-lock.spec.ts b/app/e2e/indicator-edit-lock.spec.ts
deleted file mode 100644
index 9cb565c..0000000
--- a/app/e2e/indicator-edit-lock.spec.ts
+++ /dev/null
@@ -1,129 +0,0 @@
-import type { APIRequestContext } from '@playwright/test';
-import firebaseJson from '../firebase.json' with { type: 'json' };
-import { SEED_UID, expect, test } from './fixtures';
-
-const PROJECT = 'demo-pulsar';
-const FIRESTORE_DOCUMENTS = `http://127.0.0.1:${firebaseJson.emulators.firestore.port}/v1/projects/${PROJECT}/databases/(default)/documents`;
-
-type FirestoreValue = Record<string, unknown>;
-type FirestoreDocument = { name: string; fields?: Record<string, FirestoreValue> };
-
-function decodeValue(value: FirestoreValue): unknown {
-  if ('nullValue' in value) return null;
-  if ('stringValue' in value) return value.stringValue;
-  if ('booleanValue' in value) return value.booleanValue;
-  if ('integerValue' in value) return Number(value.integerValue);
-  if ('doubleValue' in value) return Number(value.doubleValue);
-  if ('timestampValue' in value) return value.timestampValue;
-  if ('mapValue' in value) {
-    const map = value.mapValue as { fields?: Record<string, FirestoreValue> };
-    return decodeFields(map.fields);
-  }
-  if ('arrayValue' in value) {
-    const array = value.arrayValue as { values?: FirestoreValue[] };
-    return (array.values ?? []).map(decodeValue);
-  }
-  return undefined;
-}
-
-function decodeFields(fields: Record<string, FirestoreValue> = {}): Record<string, unknown> {
-  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
-}
-
-async function storedIndicator(request: APIRequestContext, id: string): Promise<Record<string, unknown>> {
-  const response = await request.get(`${FIRESTORE_DOCUMENTS}/users/${SEED_UID}/indicators/${id}`, {
-    headers: { Authorization: 'Bearer owner' },
-  });
-  expect(response.ok()).toBeTruthy();
-  const body = (await response.json()) as FirestoreDocument;
-  return decodeFields(body.fields);
-}
-
-// The seed user owns indicators with history (see scripts/seed.ts). Each test edits a different
-// indicator, so the two tests never share state.
-test.describe('F-2.03 edit indicator with history', () => {
-  test('locks group, type, scale, frequency and aggregation but edits direction and ideal range', async ({
-    seedPage: page,
-    request,
-  }, testInfo) => {
-    if (testInfo.project.name !== 'mobile') return;
-
-    await page.goto('/indicators/ind_energy/edit');
-    await expect(page.getByRole('dialog', { name: 'Editar Indicador' })).toBeVisible();
-    await expect(page.getByTestId('locked-notice')).toContainText(/já tem histórico/i);
-
-    // Configuration fields are disabled.
-    await expect(page.getByRole('radio', { name: 'Fator' })).toBeDisabled();
-    await expect(page.getByRole('radio', { name: 'Resultado' })).toBeDisabled();
-    for (const type of ['Sim / Não', 'Escala', 'Número + unidade', 'Opções ordenadas']) {
-      await expect(page.getByRole('radio', { name: type })).toBeDisabled();
-    }
-    await expect(page.getByRole('textbox', { name: 'Mínimo', exact: true })).toBeDisabled();
-    await expect(page.getByRole('textbox', { name: 'Máximo', exact: true })).toBeDisabled();
-    await expect(page.getByRole('textbox', { name: 'Passo', exact: true })).toBeDisabled();
-    await expect(page.getByRole('button', { name: '1x ao dia (Único)' })).toBeDisabled();
-    await expect(page.getByRole('button', { name: 'Múltiplos registros' })).toBeDisabled();
-
-    const aggregation = page.getByTestId('aggregation-control');
-    await expect(aggregation.getByRole('radio', { name: 'Média' })).toHaveAttribute('aria-checked', 'true');
-    for (const choice of ['Soma', 'Média', 'Último']) {
-      await expect(aggregation.getByRole('radio', { name: choice })).toBeDisabled();
-    }
-
-    // Name, abbreviation, emoji and direction stay editable.
-    await expect(page.getByRole('textbox', { name: /Nome do Indicador/ })).toBeEnabled();
-    await expect(page.getByRole('textbox', { name: 'Sigla' })).toBeEnabled();
-    await expect(page.getByRole('button', { name: 'Emoji ⚡' })).toBeEnabled();
-
-    await page.getByRole('button', { name: 'Faixa ideal' }).click();
-    await page.getByRole('textbox', { name: 'Mínimo ideal' }).fill('6');
-    await page.getByRole('textbox', { name: 'Máximo ideal' }).fill('9');
-    await page.getByRole('button', { name: 'Salvar alterações' }).click();
-
-    await expect(page).toHaveURL(/\/indicators$/);
-    const stored = await storedIndicator(request, 'ind_energy');
-    expect(stored).toMatchObject({
-      valueType: 'scale',
-      scale: { min: 0, max: 10, step: 1 },
-      frequency: 'multiple_per_day',
-      dailyAggregation: 'mean',
-      desiredDirection: 'target_range',
-      idealRange: { min: 6, max: 9 },
-    });
-  });
-
-  test('locks the unit and preserves it while the result direction changes', async ({
-    seedPage: page,
-    request,
-  }, testInfo) => {
-    if (testInfo.project.name !== 'mobile') return;
-
-    await page.goto('/indicators/ind_weight/edit');
-    await expect(page.getByRole('dialog', { name: 'Editar Indicador' })).toBeVisible();
-
-    const name = page.getByRole('textbox', { name: /Nome do Indicador/ });
-    // The editor shows the real name even with the eye closed (spec 4.4).
-    await expect(page.getByTestId('eye-toggle')).toHaveAttribute('aria-pressed', 'false');
-    const before = await storedIndicator(request, 'ind_weight');
-    await expect(name).toHaveValue(String(before.name));
-
-    await expect(page.getByRole('combobox', { name: 'Unidade' })).toBeDisabled();
-    await expect(page.getByRole('combobox', { name: 'Unidade' })).toHaveValue('kg');
-
-    await name.fill('Peso matinal');
-    await page.getByRole('button', { name: 'Quanto menor, melhor' }).click();
-    await page.getByRole('button', { name: 'Salvar alterações' }).click();
-
-    await expect(page).toHaveURL(/\/indicators$/);
-    const stored = await storedIndicator(request, 'ind_weight');
-    expect(stored).toMatchObject({
-      name: 'Peso matinal',
-      valueType: 'numeric',
-      numeric: { unit: 'kg' },
-      frequency: 'single_per_day',
-      dailyAggregation: null,
-      desiredDirection: 'lower',
-      idealRange: null,
-    });
-  });
-});
diff --git a/app/e2e/routes.json b/app/e2e/routes.json
index faf2d37..22fc95b 100644
--- a/app/e2e/routes.json
+++ b/app/e2e/routes.json
@@ -5,7 +5,6 @@
   { "path": "/register", "name": "register", "tags": ["ui"] },
   { "path": "/indicators", "name": "indicators", "tags": ["ui"] },
   { "path": "/indicators/new", "name": "indicators-new", "tags": ["ui"] },
-  { "path": "/indicators/:id/edit", "name": "indicators-edit", "tags": ["ui"] },
   { "path": "/saved-insights", "name": "saved-insights", "tags": ["ui"] },
   { "path": "/settings", "name": "settings", "tags": ["ui"] },
   { "path": "/_design", "name": "design", "tags": ["ui"] }
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
index 1438f1a..8f35773 100644
--- a/app/scripts/icons.ts
+++ b/app/scripts/icons.ts
@@ -27,6 +27,7 @@ const names = [
   'psychology',
   'remove',
   'science',
+  'schedule',
   'ssid_chart',
   'touch_app',
   'tune',
diff --git a/app/src/App.tsx b/app/src/App.tsx
index 3d8b7a8..84786e1 100644
--- a/app/src/App.tsx
+++ b/app/src/App.tsx
@@ -4,8 +4,8 @@ import { AppShell } from './app/AppShell';
 import { AuthProvider, useAuth } from './auth/AuthProvider';
 import { Button } from './design';
 import { emulatorsEnabled } from './lib/env';
+import { DashboardPage } from './pages/DashboardPage';
 import { HomePlaceholder } from './pages/HomePlaceholder';
-import { IndicatorEditorPage } from './pages/IndicatorEditorPage';
 import { OnboardingPage } from './pages/OnboardingPage';
 import { PlaceholderPage } from './pages/PlaceholderPage';
 import { SettingsPage } from './pages/SettingsPage';
@@ -51,13 +51,7 @@ const routes: RouteObject[] = [
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
@@ -92,15 +86,12 @@ const routes: RouteObject[] = [
         path: '/indicators/new',
         element: (
           <AppShell>
-            <IndicatorEditorPage mode="create" />
-          </AppShell>
-        ),
-      },
-      {
-        path: '/indicators/:id/edit',
-        element: (
-          <AppShell>
-            <IndicatorEditorPage mode="edit" />
+            <PlaceholderPage
+              title="Novo Indicador"
+              icon="tune"
+              emptyTitle="Em breve"
+              description="A criação de indicadores chega em breve."
+            />
           </AppShell>
         ),
       },
diff --git a/app/src/data/entries.ts b/app/src/data/entries.ts
index 5cadedb..16cbf3c 100644
--- a/app/src/data/entries.ts
+++ b/app/src/data/entries.ts
@@ -2,8 +2,10 @@ import {
   collection,
   deleteDoc,
   doc,
+  getCountFromServer,
   getDoc,
   getDocs,
+  getDocsFromServer,
   query,
   serverTimestamp,
   where,
@@ -20,6 +22,21 @@ export interface SaveEntryInput {
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
+  const snapshot = await getDocsFromServer(collection(db, 'users', uid, 'entries'));
+  return snapshot.docs.map((document) => {
+    const { indicatorId, localDate } = document.data();
+    return { indicatorId, localDate };
+  });
+}
+
 export async function saveEntry(uid: string, input: SaveEntryInput): Promise<string> {
   const day = localDate();
   const indicatorRef = doc(db, 'users', uid, 'indicators', input.indicatorId);
diff --git a/app/src/data/indicators.ts b/app/src/data/indicators.ts
index 7fe8dbf..1e1dbe4 100644
--- a/app/src/data/indicators.ts
+++ b/app/src/data/indicators.ts
@@ -3,11 +3,14 @@ import {
   addDoc,
   collection,
   doc,
+  getCountFromServer,
+  getDocsFromServer,
   onSnapshot,
   orderBy,
   query,
   runTransaction,
   serverTimestamp,
+  where,
   type Timestamp,
 } from 'firebase/firestore';
 import { db } from '../lib/firebase';
@@ -94,20 +97,21 @@ function assertValidSortOrder(sortOrder: number): void {
   }
 }
 
-function storedIndicatorFrom(document: {
-  id: string;
-  data: () => Record<string, unknown> | undefined;
-}): StoredIndicator {
-  const data = document.data() ?? {};
-  return {
-    ...(data as unknown as IndicatorInput),
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
+  const snapshot = await getDocsFromServer(indicatorsCollection(uid));
+  return snapshot.docs.map((document) => ({
     id: document.id,
-    sortOrder: data.sortOrder as number,
-    archivedAt: (data.archivedAt as Timestamp | null | undefined) ?? null,
-    lockedAt: (data.lockedAt as Timestamp | null | undefined) ?? null,
-    createdAt: (data.createdAt as Timestamp | null | undefined) ?? null,
-    updatedAt: (data.updatedAt as Timestamp | null | undefined) ?? null,
-  };
+    active: document.data().archivedAt == null,
+  }));
 }
 
 function indicatorInputFrom(data: IndicatorInput): IndicatorInput {
@@ -127,15 +131,6 @@ function indicatorInputFrom(data: IndicatorInput): IndicatorInput {
   };
 }
 
-/**
- * One-shot read of a single indicator for the editor. A read-only transaction uses a unary request,
- * so the route does not keep Firestore's watch stream open the way getDoc/getDocs would.
- */
-export async function getIndicator(uid: string, id: string): Promise<StoredIndicator | null> {
-  const snapshot = await runTransaction(db, (transaction) => transaction.get(indicatorRef(uid, id)));
-  return snapshot.exists() ? storedIndicatorFrom(snapshot) : null;
-}
-
 export async function createIndicator(uid: string, input: CreateIndicatorInput): Promise<string> {
   assertValidSortOrder(input.sortOrder);
   const dailyAggregation =
@@ -158,6 +153,38 @@ export async function createIndicator(uid: string, input: CreateIndicatorInput):
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
@@ -250,7 +277,15 @@ export function useIndicators(uid: string): IndicatorsState {
       (snapshot) => {
         if (!active) return;
         const next = snapshot.docs
-          .map(storedIndicatorFrom)
+          .map((document) => {
+            const data = document.data();
+            return {
+              ...data,
+              id: document.id,
+              archivedAt: data.archivedAt ?? null,
+              lockedAt: data.lockedAt ?? null,
+            } as StoredIndicator;
+          })
           .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
         setState({ uid, indicators: next, loading: false, error: null });
       },
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
index e15cacd..bd7d77f 100644
--- a/app/src/design/icons.ts
+++ b/app/src/design/icons.ts
@@ -39,6 +39,8 @@ export const iconPaths = {
   remove: 'M200 -440L200 -520L760 -520L760 -440Z',
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
diff --git a/app/src/indicators/AggregationControl.tsx b/app/src/indicators/AggregationControl.tsx
deleted file mode 100644
index 4b878cf..0000000
--- a/app/src/indicators/AggregationControl.tsx
+++ /dev/null
@@ -1,115 +0,0 @@
-import { useId, useState } from 'react';
-import { Icon } from '../design';
-import type { DailyAggregation, Frequency, IndicatorGroup, ValueType } from '../domain/indicator';
-import {
-  aggregationChoices,
-  aggregationExample,
-  aggregationLabel,
-  suggestedAggregation,
-} from './aggregation';
-
-interface AggregationControlProps {
-  group: IndicatorGroup;
-  valueType: ValueType;
-  frequency: Frequency;
-  value: DailyAggregation;
-  onChange: (value: DailyAggregation) => void;
-  /** Locked after the first record (spec 4.1). */
-  disabled?: boolean;
-}
-
-/**
- * Daily aggregation selector (spec 4.1.1). Hidden for single-per-day indicators, where the
- * day simply uses its only value. Advanced settings only list aggregations valid for the type
- * and explain their effect with an example.
- */
-export function AggregationControl({
-  group,
-  valueType,
-  frequency,
-  value,
-  onChange,
-  disabled = false,
-}: AggregationControlProps) {
-  const [open, setOpen] = useState(false);
-  const labelId = useId();
-  const choices = aggregationChoices(valueType, frequency);
-
-  // A disabled control (locked indicator) still shows the configured choice, without opening.
-  const showChoices = (open || disabled) && choices !== null;
-
-  if (frequency !== 'multiple_per_day' || choices === null) return null;
-
-  const suggested = suggestedAggregation(group, valueType);
-
-  return (
-    <div
-      data-testid="aggregation-control"
-      className="flex flex-col gap-2 rounded-lg bg-surface-container-low p-3.5"
-    >
-      <div className="flex items-start justify-between gap-2">
-        <div className="flex items-center gap-1.5">
-          <Icon name="analytics" className="text-[18px] text-secondary" />
-          <span className="font-body-sm text-body-sm font-medium text-on-surface">
-            Agregação para correlações
-          </span>
-        </div>
-        <span
-          data-testid="aggregation-suggested"
-          className="shrink-0 rounded-full bg-surface-container-highest px-2.5 py-1 font-label-code text-label-code font-bold tracking-wider text-secondary uppercase"
-        >
-          {aggregationLabel(suggested)}
-        </span>
-      </div>
-      <p className="font-body-sm text-body-sm text-on-surface-variant">
-        Sugestão automática pelo tipo. Ajuste antes do primeiro registro se preferir.
-      </p>
-      <button
-        type="button"
-        aria-expanded={showChoices}
-        aria-controls={`${labelId}-choices`}
-        disabled={disabled}
-        onClick={() => setOpen((current) => !current)}
-        className="inline-flex min-h-11 items-center gap-1 self-start rounded-full px-1 font-label-md text-label-md text-primary disabled:opacity-60"
-      >
-        Configurações avançadas
-        <Icon name={showChoices ? 'remove' : 'add'} className="text-[16px]" />
-      </button>
-      {showChoices && (
-        <div id={`${labelId}-choices`} className="flex flex-col gap-2">
-          <div role="radiogroup" aria-label="Agregação diária" className="flex flex-wrap gap-2">
-            {choices.map((aggregation) => {
-              const selected = value === aggregation;
-              return (
-                <button
-                  key={aggregation}
-                  type="button"
-                  role="radio"
-                  aria-checked={selected}
-                  disabled={disabled}
-                  onClick={() => onChange(aggregation)}
-                  className={`inline-flex h-11 min-w-11 items-center justify-center rounded-full px-4 font-label-md text-label-md transition-transform active:scale-95 disabled:opacity-60 ${
-                    selected
-                      ? 'bg-secondary text-on-secondary shadow-sm'
-                      : 'bg-surface-container text-on-surface-variant'
-                  }`}
-                >
-                  {aggregationLabel(aggregation)}
-                </button>
-              );
-            })}
-          </div>
-          <p className="font-body-sm text-body-sm text-on-surface-variant">
-            <span className="font-medium text-on-surface">{aggregationLabel(value)}:</span>{' '}
-            {aggregationExample(valueType, value)}
-          </p>
-          {disabled && (
-            <p className="font-label-code text-label-code tracking-wider text-on-surface-variant uppercase">
-              Travada após o primeiro registro
-            </p>
-          )}
-        </div>
-      )}
-    </div>
-  );
-}
diff --git a/app/src/indicators/IndicatorEditor.tsx b/app/src/indicators/IndicatorEditor.tsx
deleted file mode 100644
index 2ccf4f7..0000000
--- a/app/src/indicators/IndicatorEditor.tsx
+++ /dev/null
@@ -1,681 +0,0 @@
-import { useId, useState, type FormEvent, type ReactNode } from 'react';
-import type { IndicatorInput, OrdinalOption, ValueType } from '../domain/indicator';
-import { abbreviationOf } from '../privacy/label';
-import { Button, Chip, Icon, type IconName } from '../design';
-import { AggregationControl } from './AggregationControl';
-import { suggestedAggregation } from './aggregation';
-import {
-  CUSTOM_UNIT,
-  DIRECTION_OPTIONS,
-  EMOJI_OPTIONS,
-  UNIT_GROUPS,
-  VALUE_TYPE_OPTIONS,
-  isCustomUnit,
-} from './catalog';
-import {
-  createOrdinalOption,
-  draftToInput,
-  validateDraft,
-  type DraftErrorField,
-  type DraftErrors,
-  type IndicatorDraft,
-} from './draft';
-
-const TYPE_ICON: Record<ValueType, IconName> = {
-  boolean: 'check_circle',
-  scale: 'ssid_chart',
-  numeric: 'vital_signs',
-  ordinal: 'analytics',
-};
-
-interface IndicatorEditorProps {
-  initial: IndicatorDraft;
-  /** True when the indicator already has history: configuration fields become read-only (spec 4.1). */
-  locked?: boolean;
-  submitLabel: string;
-  busy?: boolean;
-  error?: string | null;
-  onSubmit: (input: IndicatorInput) => void;
-  onCancel: () => void;
-}
-
-function FieldError({ id, message }: { id: string; message?: string }) {
-  if (!message) return null;
-  return (
-    <p id={id} role="alert" className="px-1 font-body-sm text-body-sm text-error">
-      {message}
-    </p>
-  );
-}
-
-function SectionLabel({ step, children }: { step: string; children: ReactNode }) {
-  return (
-    <div className="flex items-center gap-2 px-1">
-      <span className="font-label-code text-label-code font-bold text-primary">{step}</span>
-      <span className="font-label-md text-label-md font-semibold tracking-wider text-on-surface-variant uppercase">
-        {children}
-      </span>
-    </div>
-  );
-}
-
-function TextField({
-  id,
-  label,
-  hint,
-  value,
-  onChange,
-  disabled = false,
-  maxLength,
-  inputMode,
-  placeholder,
-  error,
-  center = false,
-}: {
-  id: string;
-  label: string;
-  hint?: string;
-  value: string;
-  onChange: (value: string) => void;
-  disabled?: boolean;
-  maxLength?: number;
-  inputMode?: 'text' | 'decimal';
-  placeholder?: string;
-  error?: string;
-  center?: boolean;
-}) {
-  return (
-    <div className="flex min-w-0 flex-col gap-1">
-      <div className="flex items-center justify-between px-1">
-        <label htmlFor={id} className="font-label-md text-label-md font-medium text-on-surface">
-          {label}
-        </label>
-        {hint && <span className="font-label-code text-label-code text-on-surface-variant">{hint}</span>}
-      </div>
-      <input
-        id={id}
-        type="text"
-        inputMode={inputMode ?? 'text'}
-        value={value}
-        maxLength={maxLength}
-        placeholder={placeholder}
-        disabled={disabled}
-        onChange={(event) => onChange(event.target.value)}
-        aria-invalid={error ? true : undefined}
-        aria-describedby={error ? `${id}-error` : undefined}
-        className={`h-12 w-full rounded-full bg-surface-container-low px-4 font-body-lg text-body-lg text-on-surface transition-all placeholder:text-on-surface-variant/50 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${center ? 'text-center font-stat-display text-stat-display tracking-wider' : ''}`}
-      />
-      <FieldError id={`${id}-error`} message={error} />
-    </div>
-  );
-}
-
-/**
- * Form of the "Novo Indicador" sheet (design/novo_indicador_modal, spec 4.1-4.4).
- * Renders only the sheet body: the page wraps it in <Sheet>.
- */
-export function IndicatorEditor({
-  initial,
-  locked = false,
-  submitLabel,
-  busy = false,
-  error,
-  onSubmit,
-  onCancel,
-}: IndicatorEditorProps) {
-  const [draft, setDraft] = useState<IndicatorDraft>(initial);
-  const [errors, setErrors] = useState<DraftErrors>({});
-  const [customUnit, setCustomUnit] = useState(() => isCustomUnit(initial.unit));
-  const baseId = useId();
-
-  const nameId = `${baseId}-name`;
-  const abbreviationId = `${baseId}-abbreviation`;
-  const unitId = `${baseId}-unit`;
-  const customUnitId = `${baseId}-custom-unit`;
-  const scaleMinId = `${baseId}-scale-min`;
-  const scaleMaxId = `${baseId}-scale-max`;
-  const scaleStepId = `${baseId}-scale-step`;
-  const idealMinId = `${baseId}-ideal-min`;
-  const idealMaxId = `${baseId}-ideal-max`;
-
-  const isResult = draft.group === 'result';
-  const isScale = draft.valueType === 'scale';
-  const isNumeric = draft.valueType === 'numeric';
-  const isOrdinal = draft.valueType === 'ordinal';
-  const allowsIdealRange = draft.valueType === 'numeric' || draft.valueType === 'scale';
-  const preview = abbreviationOf({ name: draft.name, abbreviation: draft.abbreviation });
-
-  function update(patch: Partial<IndicatorDraft>) {
-    setDraft((current) => ({ ...current, ...patch }));
-  }
-
-  function clearError(field: DraftErrorField) {
-    setErrors((current) => {
-      if (!current[field]) return current;
-      const next = { ...current };
-      delete next[field];
-      return next;
-    });
-  }
-
-  function chooseGroup(group: IndicatorDraft['group']) {
-    if (locked) return;
-    update({
-      group,
-      dailyAggregation: suggestedAggregation(group, draft.valueType),
-      desiredDirection: group === 'factor' ? 'neutral' : draft.desiredDirection,
-    });
-  }
-
-  function chooseValueType(valueType: ValueType) {
-    if (locked) return;
-    const keepsIdealRange = valueType === 'numeric' || valueType === 'scale';
-    update({
-      valueType,
-      dailyAggregation: suggestedAggregation(draft.group, valueType),
-      desiredDirection:
-        draft.desiredDirection === 'target_range' && !keepsIdealRange ? 'neutral' : draft.desiredDirection,
-    });
-  }
-
-  function chooseUnit(value: string) {
-    if (value === CUSTOM_UNIT) {
-      setCustomUnit(true);
-      update({ unit: '' });
-      return;
-    }
-    setCustomUnit(false);
-    update({ unit: value });
-  }
-
-  function updateOption(id: string, label: string) {
-    update({
-      options: draft.options.map((option) => (option.id === id ? { ...option, label } : option)),
-    });
-  }
-
-  function addOption() {
-    if (draft.options.length >= 7) return;
-    update({ options: [...draft.options, createOrdinalOption(draft.options)] });
-  }
-
-  function removeOption(id: string) {
-    if (draft.options.length <= 2) return;
-    update({ options: draft.options.filter((option) => option.id !== id) });
-  }
-
-  function handleSubmit(event: FormEvent) {
-    event.preventDefault();
-    if (busy) return;
-    const validation = validateDraft(draft);
-    if (Object.keys(validation).length > 0) {
-      setErrors(validation);
-      return;
-    }
-    setErrors({});
-    onSubmit(draftToInput(draft));
-  }
-
-  return (
-    <form
-      aria-label={locked ? 'Editar indicador' : 'Novo indicador'}
-      noValidate
-      onSubmit={handleSubmit}
-      className="flex flex-col gap-space-lg"
-    >
-      {error && (
-        <p
-          role="alert"
-          className="rounded-md bg-error-container px-3 py-2 font-body-sm text-body-sm text-on-error-container"
-        >
-          {error}
-        </p>
-      )}
-
-      <div className="flex flex-col gap-2">
-        <SectionLabel step="1">Classificação causal</SectionLabel>
-        <div
-          role="radiogroup"
-          aria-label="Grupo do indicador"
-          className="grid grid-cols-2 gap-1 rounded-full bg-surface-container p-1"
-        >
-          {(
-            [
-              { value: 'factor', label: 'Fator', caption: 'O que causei/ingeri', icon: 'input' },
-              { value: 'result', label: 'Resultado', caption: 'O que percebi/medi', icon: 'insights' },
-            ] as const
-          ).map((option) => {
-            const selected = draft.group === option.value;
-            const tone =
-              option.value === 'factor'
-                ? 'bg-secondary text-on-secondary'
-                : 'bg-primary-container text-on-primary';
-            return (
-              <button
-                key={option.value}
-                type="button"
-                role="radio"
-                aria-checked={selected}
-                aria-label={option.label}
-                disabled={locked}
-                onClick={() => chooseGroup(option.value)}
-                className={`flex min-h-11 items-center justify-center 
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
