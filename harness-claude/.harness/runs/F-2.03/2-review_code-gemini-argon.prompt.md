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
  "id": "F-2.03",
  "title": "Editor de indicador",
  "description": "Sheet 'Novo Indicador' (design/novo_indicador_modal): grupo Fator/Resultado, nome (input com data-privacy-allow), sigla (até 4), emoji opcional, tipo de resposta (Sim/Não, Escala, Opções ordenadas, Número + unidade) com configuração: escala min/max/passo (padrão 0–10 passo 1), 2–7 opções ordenadas editáveis, unidades sugeridas da spec + personalizada + sem unidade.\n\nFrequência única/múltipla; com múltipla, mostrar agregação sugerida e 'Configurações avançadas' com apenas agregações válidas e um exemplo do efeito; Resultado: direção (sem preferência padrão, maior, menor, faixa ideal com min/max para numérico/escala). Em edição de indicador com histórico, campos travados aparecem desabilitados com explicação.",
  "acceptance": [
    "Os quatro tipos podem ser criados com sua configuração",
    "Nome é obrigatório; sigla vazia mostra prévia 'Abc...'",
    "Campo de nome mostra o nome real (data-privacy-allow) mesmo com olho fechado",
    "Mensagens de validação em pt-BR",
    "Agregação não aparece para frequência única",
    "Configurações avançadas listam só opções válidas e mostram exemplo",
    "Direção padrão 'Sem preferência'; faixa ideal exige min <= max",
    "Com histórico, tipo/grupo/unidade/frequência/agregação ficam bloqueados e direção/faixa continuam editáveis"
  ],
  "specRefs": [
    "spec.md#4.1",
    "spec.md#4.2",
    "spec.md#4.4",
    "spec.md#4.1.1",
    "spec.md#4.3",
    "arquitetura.md#4"
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
diff --git a/app/e2e/indicator-create.spec.ts b/app/e2e/indicator-create.spec.ts
new file mode 100644
index 0000000..88ff75d
--- /dev/null
+++ b/app/e2e/indicator-create.spec.ts
@@ -0,0 +1,153 @@
+import type { APIRequestContext } from '@playwright/test';
+import firebaseJson from '../firebase.json' with { type: 'json' };
+import { currentUid, expect, test } from './fixtures';
+
+const PROJECT = 'demo-pulsar';
+const FIRESTORE_DOCUMENTS = `http://127.0.0.1:${firebaseJson.emulators.firestore.port}/v1/projects/${PROJECT}/databases/(default)/documents`;
+
+type FirestoreValue = Record<string, unknown> & { nullValue?: unknown };
+type FirestoreDocument = { name: string; fields?: Record<string, FirestoreValue> };
+
+function decodeValue(value: FirestoreValue): unknown {
+  if ('nullValue' in value) return null;
+  if ('stringValue' in value) return value.stringValue;
+  if ('booleanValue' in value) return value.booleanValue;
+  if ('integerValue' in value) return Number(value.integerValue);
+  if ('doubleValue' in value) return Number(value.doubleValue);
+  if ('timestampValue' in value) return value.timestampValue;
+  if ('mapValue' in value) {
+    const map = value.mapValue as { fields?: Record<string, FirestoreValue> };
+    return decodeFields(map.fields);
+  }
+  if ('arrayValue' in value) {
+    const array = value.arrayValue as { values?: FirestoreValue[] };
+    return (array.values ?? []).map(decodeValue);
+  }
+  return undefined;
+}
+
+function decodeFields(fields: Record<string, FirestoreValue> = {}): Record<string, unknown> {
+  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
+}
+
+/** Reads the user's indicators straight from the Firestore emulator (rules bypassed as owner). */
+async function storedIndicators(
+  request: APIRequestContext,
+  uid: string,
+): Promise<(Record<string, unknown> & { id: string })[]> {
+  const response = await request.get(`${FIRESTORE_DOCUMENTS}/users/${uid}/indicators`, {
+    headers: { Authorization: 'Bearer owner' },
+  });
+  expect(response.ok()).toBeTruthy();
+  const body = (await response.json()) as { documents?: FirestoreDocument[] };
+  return (body.documents ?? []).map((document) => ({
+    id: document.name.split('/').pop() ?? '',
+    ...decodeFields(document.fields),
+  }));
+}
+
+test.describe('F-2.03 create indicator', () => {
+  test('requires a name, previews the abbreviation and shows the real name with the eye closed', async ({
+    freshUserPage: page,
+  }) => {
+    await page.goto('/indicators/new');
+    await expect(page.getByRole('dialog', { name: 'Novo Indicador' })).toBeVisible();
+    await expect(page.getByTestId('eye-toggle')).toHaveAttribute('aria-pressed', 'false');
+
+    await page.getByRole('button', { name: 'Criar Indicador' }).click();
+    await expect(page.getByText('Informe um nome para o indicador.')).toBeVisible();
+
+    const name = page.getByRole('textbox', { name: /Nome do Indicador/ });
+    await expect(name).toHaveAttribute('data-privacy-allow');
+    await name.fill('Abcdef');
+    await expect(name).toHaveValue('Abcdef');
+    await expect(page.getByTestId('abbreviation-preview')).toContainText('Abc...');
+  });
+
+  test('creates a numeric result with unit, ideal range and chosen aggregation', async ({
+    freshUserPage: page,
+    request,
+  }) => {
+    await page.goto('/indicators/new');
+    await page.getByRole('radio', { name: 'Resultado' }).click();
+    await page.getByRole('textbox', { name: /Nome do Indicador/ }).fill('Peso matinal');
+    await page.getByRole('textbox', { name: 'Sigla' }).fill('PES');
+    await page.getByRole('radio', { name: 'Número + unidade' }).click();
+    await page.getByRole('combobox', { name: 'Unidade' }).selectOption('kg');
+    await page.getByRole('button', { name: 'Múltiplos registros' }).click();
+
+    // Aggregation only appears for multiple-per-day and only lists valid options.
+    await expect(page.getByTestId('aggregation-control')).toBeVisible();
+    await expect(page.getByTestId('aggregation-suggested')).toHaveText('Último');
+    await page.getByRole('button', { name: /Configurações avançadas/ }).click();
+    await expect(page.getByTestId('aggregation-control').getByRole('radio')).toHaveCount(3);
+    await expect(
+      page.getByTestId('aggregation-control').getByRole('radio', { name: 'Presença' }),
+    ).toHaveCount(0);
+    await page.getByTestId('aggregation-control').getByRole('radio', { name: 'Média' }).click();
+
+    await page.getByRole('button', { name: 'Faixa ideal' }).click();
+    await page.getByRole('textbox', { name: 'Mínimo ideal' }).fill('70');
+    await page.getByRole('textbox', { name: 'Máximo ideal' }).fill('75');
+    await page.getByRole('button', { name: 'Criar Indicador' }).click();
+
+    await expect(page).toHaveURL(/\/indicators$/);
+    const uid = await currentUid(page);
+    expect(uid).not.toBeNull();
+    const indicators = await storedIndicators(request, uid ?? '');
+    expect(indicators).toHaveLength(1);
+    expect(indicators[0]).toMatchObject({
+      name: 'Peso matinal',
+      abbreviation: 'PES',
+      group: 'result',
+      valueType: 'numeric',
+      numeric: { unit: 'kg' },
+      frequency: 'multiple_per_day',
+      dailyAggregation: 'mean',
+      desiredDirection: 'target_range',
+      idealRange: { min: 70, max: 75 },
+    });
+  });
+
+  test('creates an ordinal indicator with editable options and no aggregation when single', async ({
+    freshUserPage: page,
+    request,
+  }) => {
+    await page.goto('/indicators/new');
+    await page.getByRole('textbox', { name: /Nome do Indicador/ }).fill('Humor');
+    await page.getByRole('textbox', { name: 'Sigla' }).fill('HUM');
+    await page.getByRole('radio', { name: 'Opções ordenadas' }).click();
+
+    await page.getByRole('textbox', { name: 'Opção 1', exact: true }).fill('Ruim');
+    await page.getByRole('textbox', { name: 'Opção 2', exact: true }).fill('Regular');
+    await page.getByRole('textbox', { name: 'Opção 3', exact: true }).fill('Bom');
+    await page.getByRole('button', { name: 'Adicionar opção' }).click();
+    await page.getByRole('textbox', { name: 'Opção 4', exact: true }).fill('Excelente');
+
+    // Single-per-day indicators never show aggregation.
+    await expect(page.getByTestId('aggregation-control')).toHaveCount(0);
+    await page.getByRole('button', { name: 'Emoji 🙂' }).click();
+    await page.getByRole('button', { name: 'Criar Indicador' }).click();
+
+    await expect(page).toHaveURL(/\/indicators$/);
+    const uid = await currentUid(page);
+    const indicators = await storedIndicators(request, uid ?? '');
+    expect(indicators).toHaveLength(1);
+    expect(indicators[0]).toMatchObject({
+      name: 'Humor',
+      abbreviation: 'HUM',
+      emoji: '🙂',
+      group: 'factor',
+      valueType: 'ordinal',
+      frequency: 'single_per_day',
+      dailyAggregation: null,
+      desiredDirection: null,
+    });
+    expect(indicators[0]?.options).toEqual([
+      expect.objectContaining({ label: 'Ruim' }),
+      expect.objectContaining({ label: 'Regular' }),
+      expect.objectContaining({ label: 'Bom' }),
+      expect.objectContaining({ label: 'Excelente' }),
+    ]);
+  });
+});
diff --git a/app/e2e/indicator-edit-lock.spec.ts b/app/e2e/indicator-edit-lock.spec.ts
new file mode 100644
index 0000000..9cb565c
--- /dev/null
+++ b/app/e2e/indicator-edit-lock.spec.ts
@@ -0,0 +1,129 @@
+import type { APIRequestContext } from '@playwright/test';
+import firebaseJson from '../firebase.json' with { type: 'json' };
+import { SEED_UID, expect, test } from './fixtures';
+
+const PROJECT = 'demo-pulsar';
+const FIRESTORE_DOCUMENTS = `http://127.0.0.1:${firebaseJson.emulators.firestore.port}/v1/projects/${PROJECT}/databases/(default)/documents`;
+
+type FirestoreValue = Record<string, unknown>;
+type FirestoreDocument = { name: string; fields?: Record<string, FirestoreValue> };
+
+function decodeValue(value: FirestoreValue): unknown {
+  if ('nullValue' in value) return null;
+  if ('stringValue' in value) return value.stringValue;
+  if ('booleanValue' in value) return value.booleanValue;
+  if ('integerValue' in value) return Number(value.integerValue);
+  if ('doubleValue' in value) return Number(value.doubleValue);
+  if ('timestampValue' in value) return value.timestampValue;
+  if ('mapValue' in value) {
+    const map = value.mapValue as { fields?: Record<string, FirestoreValue> };
+    return decodeFields(map.fields);
+  }
+  if ('arrayValue' in value) {
+    const array = value.arrayValue as { values?: FirestoreValue[] };
+    return (array.values ?? []).map(decodeValue);
+  }
+  return undefined;
+}
+
+function decodeFields(fields: Record<string, FirestoreValue> = {}): Record<string, unknown> {
+  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
+}
+
+async function storedIndicator(request: APIRequestContext, id: string): Promise<Record<string, unknown>> {
+  const response = await request.get(`${FIRESTORE_DOCUMENTS}/users/${SEED_UID}/indicators/${id}`, {
+    headers: { Authorization: 'Bearer owner' },
+  });
+  expect(response.ok()).toBeTruthy();
+  const body = (await response.json()) as FirestoreDocument;
+  return decodeFields(body.fields);
+}
+
+// The seed user owns indicators with history (see scripts/seed.ts). Each test edits a different
+// indicator, so the two tests never share state.
+test.describe('F-2.03 edit indicator with history', () => {
+  test('locks group, type, scale, frequency and aggregation but edits direction and ideal range', async ({
+    seedPage: page,
+    request,
+  }, testInfo) => {
+    if (testInfo.project.name !== 'mobile') return;
+
+    await page.goto('/indicators/ind_energy/edit');
+    await expect(page.getByRole('dialog', { name: 'Editar Indicador' })).toBeVisible();
+    await expect(page.getByTestId('locked-notice')).toContainText(/já tem histórico/i);
+
+    // Configuration fields are disabled.
+    await expect(page.getByRole('radio', { name: 'Fator' })).toBeDisabled();
+    await expect(page.getByRole('radio', { name: 'Resultado' })).toBeDisabled();
+    for (const type of ['Sim / Não', 'Escala', 'Número + unidade', 'Opções ordenadas']) {
+      await expect(page.getByRole('radio', { name: type })).toBeDisabled();
+    }
+    await expect(page.getByRole('textbox', { name: 'Mínimo', exact: true })).toBeDisabled();
+    await expect(page.getByRole('textbox', { name: 'Máximo', exact: true })).toBeDisabled();
+    await expect(page.getByRole('textbox', { name: 'Passo', exact: true })).toBeDisabled();
+    await expect(page.getByRole('button', { name: '1x ao dia (Único)' })).toBeDisabled();
+    await expect(page.getByRole('button', { name: 'Múltiplos registros' })).toBeDisabled();
+
+    const aggregation = page.getByTestId('aggregation-control');
+    await expect(aggregation.getByRole('radio', { name: 'Média' })).toHaveAttribute('aria-checked', 'true');
+    for (const choice of ['Soma', 'Média', 'Último']) {
+      await expect(aggregation.getByRole('radio', { name: choice })).toBeDisabled();
+    }
+
+    // Name, abbreviation, emoji and direction stay editable.
+    await expect(page.getByRole('textbox', { name: /Nome do Indicador/ })).toBeEnabled();
+    await expect(page.getByRole('textbox', { name: 'Sigla' })).toBeEnabled();
+    await expect(page.getByRole('button', { name: 'Emoji ⚡' })).toBeEnabled();
+
+    await page.getByRole('button', { name: 'Faixa ideal' }).click();
+    await page.getByRole('textbox', { name: 'Mínimo ideal' }).fill('6');
+    await page.getByRole('textbox', { name: 'Máximo ideal' }).fill('9');
+    await page.getByRole('button', { name: 'Salvar alterações' }).click();
+
+    await expect(page).toHaveURL(/\/indicators$/);
+    const stored = await storedIndicator(request, 'ind_energy');
+    expect(stored).toMatchObject({
+      valueType: 'scale',
+      scale: { min: 0, max: 10, step: 1 },
+      frequency: 'multiple_per_day',
+      dailyAggregation: 'mean',
+      desiredDirection: 'target_range',
+      idealRange: { min: 6, max: 9 },
+    });
+  });
+
+  test('locks the unit and preserves it while the result direction changes', async ({
+    seedPage: page,
+    request,
+  }, testInfo) => {
+    if (testInfo.project.name !== 'mobile') return;
+
+    await page.goto('/indicators/ind_weight/edit');
+    await expect(page.getByRole('dialog', { name: 'Editar Indicador' })).toBeVisible();
+
+    const name = page.getByRole('textbox', { name: /Nome do Indicador/ });
+    // The editor shows the real name even with the eye closed (spec 4.4).
+    await expect(page.getByTestId('eye-toggle')).toHaveAttribute('aria-pressed', 'false');
+    const before = await storedIndicator(request, 'ind_weight');
+    await expect(name).toHaveValue(String(before.name));
+
+    await expect(page.getByRole('combobox', { name: 'Unidade' })).toBeDisabled();
+    await expect(page.getByRole('combobox', { name: 'Unidade' })).toHaveValue('kg');
+
+    await name.fill('Peso matinal');
+    await page.getByRole('button', { name: 'Quanto menor, melhor' }).click();
+    await page.getByRole('button', { name: 'Salvar alterações' }).click();
+
+    await expect(page).toHaveURL(/\/indicators$/);
+    const stored = await storedIndicator(request, 'ind_weight');
+    expect(stored).toMatchObject({
+      name: 'Peso matinal',
+      valueType: 'numeric',
+      numeric: { unit: 'kg' },
+      frequency: 'single_per_day',
+      dailyAggregation: null,
+      desiredDirection: 'lower',
+      idealRange: null,
+    });
+  });
+});
diff --git a/app/e2e/routes.json b/app/e2e/routes.json
index 22fc95b..faf2d37 100644
--- a/app/e2e/routes.json
+++ b/app/e2e/routes.json
@@ -5,6 +5,7 @@
   { "path": "/register", "name": "register", "tags": ["ui"] },
   { "path": "/indicators", "name": "indicators", "tags": ["ui"] },
   { "path": "/indicators/new", "name": "indicators-new", "tags": ["ui"] },
+  { "path": "/indicators/:id/edit", "name": "indicators-edit", "tags": ["ui"] },
   { "path": "/saved-insights", "name": "saved-insights", "tags": ["ui"] },
   { "path": "/settings", "name": "settings", "tags": ["ui"] },
   { "path": "/_design", "name": "design", "tags": ["ui"] }
diff --git a/app/functions/node_modules b/app/functions/node_modules
new file mode 120000
index 0000000..188d989
--- /dev/null
+++ b/app/functions/node_modules
@@ -0,0 +1 @@
+/Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/app/functions/node_modules
\ No newline at end of file
diff --git a/app/node_modules b/app/node_modules
new file mode 120000
index 0000000..4a6eeda
--- /dev/null
+++ b/app/node_modules
@@ -0,0 +1 @@
+/Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/app/node_modules
\ No newline at end of file
diff --git a/app/src/App.tsx b/app/src/App.tsx
index 97df5a8..3d8b7a8 100644
--- a/app/src/App.tsx
+++ b/app/src/App.tsx
@@ -5,6 +5,7 @@ import { AuthProvider, useAuth } from './auth/AuthProvider';
 import { Button } from './design';
 import { emulatorsEnabled } from './lib/env';
 import { HomePlaceholder } from './pages/HomePlaceholder';
+import { IndicatorEditorPage } from './pages/IndicatorEditorPage';
 import { OnboardingPage } from './pages/OnboardingPage';
 import { PlaceholderPage } from './pages/PlaceholderPage';
 import { SettingsPage } from './pages/SettingsPage';
@@ -91,12 +92,15 @@ const routes: RouteObject[] = [
         path: '/indicators/new',
         element: (
           <AppShell>
-            <PlaceholderPage
-              title="Novo Indicador"
-              icon="tune"
-              emptyTitle="Em breve"
-              description="A criação de indicadores chega em breve."
-            />
+            <IndicatorEditorPage mode="create" />
+          </AppShell>
+        ),
+      },
+      {
+        path: '/indicators/:id/edit',
+        element: (
+          <AppShell>
+            <IndicatorEditorPage mode="edit" />
           </AppShell>
         ),
       },
diff --git a/app/src/data/indicators.ts b/app/src/data/indicators.ts
index f222fbd..7fe8dbf 100644
--- a/app/src/data/indicators.ts
+++ b/app/src/data/indicators.ts
@@ -94,6 +94,22 @@ function assertValidSortOrder(sortOrder: number): void {
   }
 }
 
+function storedIndicatorFrom(document: {
+  id: string;
+  data: () => Record<string, unknown> | undefined;
+}): StoredIndicator {
+  const data = document.data() ?? {};
+  return {
+    ...(data as unknown as IndicatorInput),
+    id: document.id,
+    sortOrder: data.sortOrder as number,
+    archivedAt: (data.archivedAt as Timestamp | null | undefined) ?? null,
+    lockedAt: (data.lockedAt as Timestamp | null | undefined) ?? null,
+    createdAt: (data.createdAt as Timestamp | null | undefined) ?? null,
+    updatedAt: (data.updatedAt as Timestamp | null | undefined) ?? null,
+  };
+}
+
 function indicatorInputFrom(data: IndicatorInput): IndicatorInput {
   return {
     group: data.group,
@@ -111,6 +127,15 @@ function indicatorInputFrom(data: IndicatorInput): IndicatorInput {
   };
 }
 
+/**
+ * One-shot read of a single indicator for the editor. A read-only transaction uses a unary request,
+ * so the route does not keep Firestore's watch stream open the way getDoc/getDocs would.
+ */
+export async function getIndicator(uid: string, id: string): Promise<StoredIndicator | null> {
+  const snapshot = await runTransaction(db, (transaction) => transaction.get(indicatorRef(uid, id)));
+  return snapshot.exists() ? storedIndicatorFrom(snapshot) : null;
+}
+
 export async function createIndicator(uid: string, input: CreateIndicatorInput): Promise<string> {
   assertValidSortOrder(input.sortOrder);
   const dailyAggregation =
@@ -225,15 +250,7 @@ export function useIndicators(uid: string): IndicatorsState {
       (snapshot) => {
         if (!active) return;
         const next = snapshot.docs
-          .map((document) => {
-            const data = document.data();
-            return {
-              ...data,
-              id: document.id,
-              archivedAt: data.archivedAt ?? null,
-              lockedAt: data.lockedAt ?? null,
-            } as StoredIndicator;
-          })
+          .map(storedIndicatorFrom)
           .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
         setState({ uid, indicators: next, loading: false, error: null });
       },
diff --git a/app/src/indicators/AggregationControl.tsx b/app/src/indicators/AggregationControl.tsx
new file mode 100644
index 0000000..4b878cf
--- /dev/null
+++ b/app/src/indicators/AggregationControl.tsx
@@ -0,0 +1,115 @@
+import { useId, useState } from 'react';
+import { Icon } from '../design';
+import type { DailyAggregation, Frequency, IndicatorGroup, ValueType } from '../domain/indicator';
+import {
+  aggregationChoices,
+  aggregationExample,
+  aggregationLabel,
+  suggestedAggregation,
+} from './aggregation';
+
+interface AggregationControlProps {
+  group: IndicatorGroup;
+  valueType: ValueType;
+  frequency: Frequency;
+  value: DailyAggregation;
+  onChange: (value: DailyAggregation) => void;
+  /** Locked after the first record (spec 4.1). */
+  disabled?: boolean;
+}
+
+/**
+ * Daily aggregation selector (spec 4.1.1). Hidden for single-per-day indicators, where the
+ * day simply uses its only value. Advanced settings only list aggregations valid for the type
+ * and explain their effect with an example.
+ */
+export function AggregationControl({
+  group,
+  valueType,
+  frequency,
+  value,
+  onChange,
+  disabled = false,
+}: AggregationControlProps) {
+  const [open, setOpen] = useState(false);
+  const labelId = useId();
+  const choices = aggregationChoices(valueType, frequency);
+
+  // A disabled control (locked indicator) still shows the configured choice, without opening.
+  const showChoices = (open || disabled) && choices !== null;
+
+  if (frequency !== 'multiple_per_day' || choices === null) return null;
+
+  const suggested = suggestedAggregation(group, valueType);
+
+  return (
+    <div
+      data-testid="aggregation-control"
+      className="flex flex-col gap-2 rounded-lg bg-surface-container-low p-3.5"
+    >
+      <div className="flex items-start justify-between gap-2">
+        <div className="flex items-center gap-1.5">
+          <Icon name="analytics" className="text-[18px] text-secondary" />
+          <span className="font-body-sm text-body-sm font-medium text-on-surface">
+            Agregação para correlações
+          </span>
+        </div>
+        <span
+          data-testid="aggregation-suggested"
+          className="shrink-0 rounded-full bg-surface-container-highest px-2.5 py-1 font-label-code text-label-code font-bold tracking-wider text-secondary uppercase"
+        >
+          {aggregationLabel(suggested)}
+        </span>
+      </div>
+      <p className="font-body-sm text-body-sm text-on-surface-variant">
+        Sugestão automática pelo tipo. Ajuste antes do primeiro registro se preferir.
+      </p>
+      <button
+        type="button"
+        aria-expanded={showChoices}
+        aria-controls={`${labelId}-choices`}
+        disabled={disabled}
+        onClick={() => setOpen((current) => !current)}
+        className="inline-flex min-h-11 items-center gap-1 self-start rounded-full px-1 font-label-md text-label-md text-primary disabled:opacity-60"
+      >
+        Configurações avançadas
+        <Icon name={showChoices ? 'remove' : 'add'} className="text-[16px]" />
+      </button>
+      {showChoices && (
+        <div id={`${labelId}-choices`} className="flex flex-col gap-2">
+          <div role="radiogroup" aria-label="Agregação diária" className="flex flex-wrap gap-2">
+            {choices.map((aggregation) => {
+              const selected = value === aggregation;
+              return (
+                <button
+                  key={aggregation}
+                  type="button"
+                  role="radio"
+                  aria-checked={selected}
+                  disabled={disabled}
+                  onClick={() => onChange(aggregation)}
+                  className={`inline-flex h-11 min-w-11 items-center justify-center rounded-full px-4 font-label-md text-label-md transition-transform active:scale-95 disabled:opacity-60 ${
+                    selected
+                      ? 'bg-secondary text-on-secondary shadow-sm'
+                      : 'bg-surface-container text-on-surface-variant'
+                  }`}
+                >
+                  {aggregationLabel(aggregation)}
+                </button>
+              );
+            })}
+          </div>
+          <p className="font-body-sm text-body-sm text-on-surface-variant">
+            <span className="font-medium text-on-surface">{aggregationLabel(value)}:</span>{' '}
+            {aggregationExample(valueType, value)}
+          </p>
+          {disabled && (
+            <p className="font-label-code text-label-code tracking-wider text-on-surface-variant uppercase">
+              Travada após o primeiro registro
+            </p>
+          )}
+        </div>
+      )}
+    </div>
+  );
+}
diff --git a/app/src/indicators/IndicatorEditor.tsx b/app/src/indicators/IndicatorEditor.tsx
new file mode 100644
index 0000000..2ccf4f7
--- /dev/null
+++ b/app/src/indicators/IndicatorEditor.tsx
@@ -0,0 +1,681 @@
+import { useId, useState, type FormEvent, type ReactNode } from 'react';
+import type { IndicatorInput, OrdinalOption, ValueType } from '../domain/indicator';
+import { abbreviationOf } from '../privacy/label';
+import { Button, Chip, Icon, type IconName } from '../design';
+import { AggregationControl } from './AggregationControl';
+import { suggestedAggregation } from './aggregation';
+import {
+  CUSTOM_UNIT,
+  DIRECTION_OPTIONS,
+  EMOJI_OPTIONS,
+  UNIT_GROUPS,
+  VALUE_TYPE_OPTIONS,
+  isCustomUnit,
+} from './catalog';
+import {
+  createOrdinalOption,
+  draftToInput,
+  validateDraft,
+  type DraftErrorField,
+  type DraftErrors,
+  type IndicatorDraft,
+} from './draft';
+
+const TYPE_ICON: Record<ValueType, IconName> = {
+  boolean: 'check_circle',
+  scale: 'ssid_chart',
+  numeric: 'vital_signs',
+  ordinal: 'analytics',
+};
+
+interface IndicatorEditorProps {
+  initial: IndicatorDraft;
+  /** True when the indicator already has history: configuration fields become read-only (spec 4.1). */
+  locked?: boolean;
+  submitLabel: string;
+  busy?: boolean;
+  error?: string | null;
+  onSubmit: (input: IndicatorInput) => void;
+  onCancel: () => void;
+}
+
+function FieldError({ id, message }: { id: string; message?: string }) {
+  if (!message) return null;
+  return (
+    <p id={id} role="alert" className="px-1 font-body-sm text-body-sm text-error">
+      {message}
+    </p>
+  );
+}
+
+function SectionLabel({ step, children }: { step: string; children: ReactNode }) {
+  return (
+    <div className="flex items-center gap-2 px-1">
+      <span className="font-label-code text-label-code font-bold text-primary">{step}</span>
+      <span className="font-label-md text-label-md font-semibold tracking-wider text-on-surface-variant uppercase">
+        {children}
+      </span>
+    </div>
+  );
+}
+
+function TextField({
+  id,
+  label,
+  hint,
+  value,
+  onChange,
+  disabled = false,
+  maxLength,
+  inputMode,
+  placeholder,
+  error,
+  center = false,
+}: {
+  id: string;
+  label: string;
+  hint?: string;
+  value: string;
+  onChange: (value: string) => void;
+  disabled?: boolean;
+  maxLength?: number;
+  inputMode?: 'text' | 'decimal';
+  placeholder?: string;
+  error?: string;
+  center?: boolean;
+}) {
+  return (
+    <div className="flex min-w-0 flex-col gap-1">
+      <div className="flex items-center justify-between px-1">
+        <label htmlFor={id} className="font-label-md text-label-md font-medium text-on-surface">
+          {label}
+        </label>
+        {hint && <span className="font-label-code text-label-code text-on-surface-variant">{hint}</span>}
+      </div>
+      <input
+        id={id}
+        type="text"
+        inputMode={inputMode ?? 'text'}
+        value={value}
+        maxLength={maxLength}
+        placeholder={placeholder}
+        disabled={disabled}
+        onChange={(event) => onChange(event.target.value)}
+        aria-invalid={error ? true : undefined}
+        aria-describedby={error ? `${id}-error` : undefined}
+        className={`h-12 w-full rounded-full bg-surface-container-low px-4 font-body-lg text-body-lg text-on-surface transition-all placeholder:text-on-surface-variant/50 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${center ? 'text-center font-stat-display text-stat-display tracking-wider' : ''}`}
+      />
+      <FieldError id={`${id}-error`} message={error} />
+    </div>
+  );
+}
+
+/**
+ * Form of the "Novo Indicador" sheet (design/novo_indicador_modal, spec 4.1-4.4).
+ * Renders only the sheet body: the page wraps it in <Sheet>.
+ */
+export function IndicatorEditor({
+  initial,
+  locked = false,
+  submitLabel,
+  busy = false,
+  error,
+  onSubmit,
+  onCancel,
+}: IndicatorEditorProps) {
+  const [draft, setDraft] = useState<IndicatorDraft>(initial);
+  const [errors, setErrors] = useState<DraftErrors>({});
+  const [customUnit, setCustomUnit] = useState(() => isCustomUnit(initial.unit));
+  const baseId = useId();
+
+  const nameId = `${baseId}-name`;
+  const abbreviationId = `${baseId}-abbreviation`;
+  const unitId = `${baseId}-unit`;
+  const customUnitId = `${baseId}-custom-unit`;
+  const scaleMinId = `${baseId}-scale-min`;
+  const scaleMaxId = `${baseId}-scale-max`;
+  const scaleStepId = `${baseId}-scale-step`;
+  const idealMinId = `${baseId}-ideal-min`;
+  const idealMaxId = `${baseId}-ideal-max`;
+
+  const isResult = draft.group === 'result';
+  const isScale = draft.valueType === 'scale';
+  const isNumeric = draft.valueType === 'numeric';
+  const isOrdinal = draft.valueType === 'ordinal';
+  const allowsIdealRange = draft.valueType === 'numeric' || draft.valueType === 'scale';
+  const preview = abbreviationOf({ name: draft.name, abbreviation: draft.abbreviation });
+
+  function update(patch: Partial<IndicatorDraft>) {
+    setDraft((current) => ({ ...current, ...patch }));
+  }
+
+  function clearError(field: DraftErrorField) {
+    setErrors((current) => {
+      if (!current[field]) return current;
+      const next = { ...current };
+      delete next[field];
+      return next;
+    });
+  }
+
+  function chooseGroup(group: IndicatorDraft['group']) {
+    if (locked) return;
+    update({
+      group,
+      dailyAggregation: suggestedAggregation(group, draft.valueType),
+      desiredDirection: group === 'factor' ? 'neutral' : draft.desiredDirection,
+    });
+  }
+
+  function chooseValueType(valueType: ValueType) {
+    if (locked) return;
+    const keepsIdealRange = valueType === 'numeric' || valueType === 'scale';
+    update({
+      valueType,
+      dailyAggregation: suggestedAggregation(draft.group, valueType),
+      desiredDirection:
+        draft.desiredDirection === 'target_range' && !keepsIdealRange ? 'neutral' : draft.desiredDirection,
+    });
+  }
+
+  function chooseUnit(value: string) {
+    if (value === CUSTOM_UNIT) {
+      setCustomUnit(true);
+      update({ unit: '' });
+      return;
+    }
+    setCustomUnit(false);
+    update({ unit: value });
+  }
+
+  function updateOption(id: string, label: string) {
+    update({
+      options: draft.options.map((option) => (option.id === id ? { ...option, label } : option)),
+    });
+  }
+
+  function addOption() {
+    if (draft.options.length >= 7) return;
+    update({ options: [...draft.options, createOrdinalOption(draft.options)] });
+  }
+
+  function removeOption(id: string) {
+    if (draft.options.length <= 2) return;
+    update({ options: draft.options.filter((option) => option.id !== id) });
+  }
+
+  function handleSubmit(event: FormEvent) {
+    event.preventDefault();
+    if (busy) return;
+    const validation = validateDraft(draft);
+    if (Object.keys(validation).length > 0) {
+      setErrors(validation);
+      return;
+    }
+    setErrors({});
+    onSubmit(draftToInput(draft));
+  }
+
+  return (
+    <form
+      aria-label={locked ? 'Editar indicador' : 'Novo indicador'}
+      noValidate
+      onSubmit={handleSubmit}
+      className="flex flex-col gap-space-lg"
+    >
+      {error && (
+        <p
+          role="alert"
+          className="rounded-md bg-error-container px-3 py-2 font-body-sm text-body-sm text-on-error-container"
+        >
+          {error}
+        </p>
+      )}
+
+      <div className="flex flex-col gap-2">
+        <SectionLabel step="1">Classificação causal</SectionLabel>
+        <div
+          role="radiogroup"
+          aria-label="Grupo do indicador"
+          className="grid grid-cols-2 gap-1 rounded-full bg-surface-container p-1"
+        >
+          {(
+            [
+              { value: 'factor', label: 'Fator', caption: 'O que causei/ingeri', icon: 'input' },
+              { value: 'result', label: 'Resultado', caption: 'O que percebi/medi', icon: 'insights' },
+            ] as const
+          ).map((option) => {
+            const selected = draft.group === option.value;
+            const tone =
+              option.value === 'factor'
+                ? 'bg-secondary text-on-secondary'
+                : 'bg-primary-container text-on-primary';
+            return (
+              <button
+                key={option.value}
+                type="button"
+                role="radio"
+                aria-checked={selected}
+                aria-label={option.label}
+                disabled={locked}
+                onClick={() => chooseGroup(option.value)}
+                className={`flex min-h-11 items-center justify-center gap-2 rounded-full px-2 py-2 transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
+                  selected ? `${tone} shadow-sm` : 'text-on-surface-variant'
+                }`}
+              >
+                <Icon name={option.icon} className="text-[18px]" />
+                <span className="flex flex-col text-left">
+                  <span className="font-label-lg text-label-lg leading-none">{option.label}</span>
+                  <span className="pt-0.5 font-label-code text-[10px]">{option.caption}</span>
+                </span>
+              </button>
+            );
+          })}
+        </div>
+        <p className="flex items-center gap-1.5 px-1 font-body-sm text-body-sm text-on-surface-variant">
+          <Icon name="analytics" className="text-[15px]" />
+          {isResult
+            ? 'Resultados alimentam o eixo vertical de sintomas, foco e biomarcadores.'
+            : 'Fatores são suas intervenções: hábitos, suplementos e rotinas.'}
+        </p>
+      </div>
+
+      <div className="flex flex-col gap-3">
+        <SectionLabel step="2">Identificação</SectionLabel>
+        <div>
+          <div className="mb-1 flex items-center justify-between px-1">
+            <label htmlFor={nameId} className="font-label-md text-label-md font-medium text-on-surface">
+              Nome do Indicador *
+            </label>
+            <span className="font-label-code text-label-code text-on-surface-variant">Obrigatório</span>
+          </div>
+          {/* Explicit editing shows the real name on purpose (spec 4.4). */}
+          <input
+            id={nameId}
+            data-privacy-allow
+            type="text"
+            value={draft.name}
+            maxLength={60}
+            placeholder="Ex: Nível de Energia ou Coenzima Q10"
+            aria-invalid={errors.name ? true : undefined}
+            aria-describedby={errors.name ? `${nameId}-error` : undefined}
+            onChange={(event) => {
+              update({ name: event.target.value });
+              clearError('name');
+            }}
+            className="h-12 w-full rounded-full bg-surface-container-low px-4 font-body-lg text-body-lg text-on-surface transition-all placeholder:text-on-surface-variant/50 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container focus:outline-none"
+          />
+          <FieldError id={`${nameId}-error`} message={errors.name} />
+        </div>
+
+        <div className="grid grid-cols-2 items-start gap-2">
+          <TextField
+            id={abbreviationId}
+            label="Sigla"
+            hint="Até 4"
+            value={draft.abbreviation}
+            maxLength={4}
+            center
+            placeholder="EX: DIS"
+            error={errors.abbreviation}
+            onChange={(value) => {
+              update({ abbreviation: value });
+              clearError('abbreviation');
+            }}
+          />
+          <div className="flex min-w-0 flex-col gap-1">
+            <span className="px-1 font-label-md text-label-md font-medium text-on-surface">Emoji</span>
+            <div role="group" aria-label="Emoji" className="flex min-h-12 flex-wrap items-center gap-1">
+              {EMOJI_OPTIONS.map((emoji) => (
+                <button
+                  key={emoji}
+                  type="button"
+                  aria-label={`Emoji ${emoji}`}
+                  aria-pressed={draft.emoji === emoji}
+                  onClick={() => update({ emoji: draft.emoji === emoji ? null : emoji })}
+                  className={`flex h-11 w-11 items-center justify-center rounded-full text-[18px] transition-transform active:scale-90 ${
+                    draft.emoji === emoji
+                      ? 'bg-primary-fixed text-on-primary-fixed shadow-sm'
+                      : 'bg-surface-container-low'
+                  }`}
+                >
+                  {emoji}
+                </button>
+              ))}
+              <button
+                type="button"
+                aria-pressed={draft.emoji === null}
+                onClick={() => update({ emoji: null })}
+                className={`flex h-11 items-center justify-center rounded-full px-3 font-label-md text-label-md transition-transform active:scale-95 ${
+                  draft.emoji === null
+                    ? 'bg-on-surface text-surface'
+                    : 'bg-surface-container-low text-on-surface-variant'
+                }`}
+              >
+                Sem emoji
+              </button>
+            </div>
+          </div>
+        </div>
+        <p
+          data-testid="abbreviation-preview"
+          className="px-1 font-body-sm text-body-sm text-on-surface-variant"
+        >
+          Prévia no modo sigla:{' '}
+          <span className="font-label-code text-label-code tracking-wider text-on-surface">{preview}</span>
+        </p>
+      </div>
+
+      <div className="flex flex-col gap-2">
+        <div className="flex items-center justify-between gap-2">
+          <SectionLabel step="3">Tipo de resposta</SectionLabel>
+          <span className="shrink-0 font-label-code text-label-code font-bold text-primary">
+            {locked ? 'Travado' : 'Imutável após 1º registro'}
+          </span>
+        </div>
+        <div role="radiogroup" aria-label="Tipo de resposta" className="grid grid-cols-2 gap-2">
+          {VALUE_TYPE_OPTIONS.map((option) => {
+            const selected = draft.valueType === option.value;
+            return (
+              <button
+                key={option.value}
+                type="button"
+                role="radio"
+                aria-checked={selected}
+                aria-label={option.label}
+                disabled={locked}
+                onClick={() => chooseValueType(option.value)}
+                className={`flex flex-col gap-1 rounded-lg p-3 text-left transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
+                  selected ? 'bg-primary-fixed/40 shadow-sm' : 'bg-surface-container-low'
+                }`}
+              >
+                <div className="flex w-full items-center justify-between">
+                  <Icon
+                    name={TYPE_ICON[option.value]}
+                    className={`text-[20px] ${selected ? 'text-primary' : 'text-on-surface-variant'}`}
+                  />
+                  <span
+                    className={`flex h-4 w-4 items-center justify-center rounded-full ${
+                      selected ? 'bg-primary text-on-primary' : 'bg-surface-container'
+                    }`}
+                  >
+                    {selected && <Icon name="check_circle" className="text-[12px]" />}
+                  </span>
+                </div>
+                <span
+                  className={`font-label-lg text-label-lg ${selected ? 'font-bold text-primary' : 'text-on-surface'}`}
+                >
+                  {option.label}
+                </span>
+                <span className="font-body-sm text-[11px] text-on-surface-variant">{option.caption}</span>
+              </button>
+            );
+          })}
+        </div>
+      </div>
+
+      {isScale && (
+        <div className="flex flex-col gap-2">
+          <span className="px-1 font-label-md text-label-md font-semibold tracking-wider text-on-surface-variant uppercase">
+            Configuração da escala
+          </span>
+          <div className="grid grid-cols-3 gap-2">
+            <TextField
+              id={scaleMinId}
+              label="Mínimo"
+              value={draft.scaleMin}
+              inputMode="decimal"
+              disabled={locked}
+              onChange={(value) => {
+                update({ scaleMin: value });
+                clearError('scale');
+              }}
+            />
+            <TextField
+              id={scaleMaxId}
+              label="Máximo"
+              value={draft.scaleMax}
+              inputMode="decimal"
+              disabled={locked}
+              onChange={(value) => {
+                update({ scaleMax: value });
+                clearError('scale');
+              }}
+            />
+            <TextField
+              id={scaleStepId}
+              label="Passo"
+              value={draft.scaleStep}
+              inputMode="decimal"
+              disabled={locked}
+              onChange={(value) => {
+                update({ scaleStep: value });
+                clearError('scale');
+              }}
+            />
+          </div>
+          <FieldError id={`${baseId}-scale-error`} message={errors.scale} />
+        </div>
+      )}
+
+      {isNumeric && (
+        <div className="flex flex-col gap-2">
+          <div className="flex items-center justify-between px-1">
+            <label htmlFor={unitId} className="font-label-md text-label-md font-medium text-on-surface">
+              Unidade
+            </label>
+            <span className="font-label-code text-label-code text-on-surface-variant">
+              Metadado, não é meta
+            </span>
+          </div>
+          <select
+            id={unitId}
+            value={customUnit ? CUSTOM_UNIT : draft.unit}
+            disabled={locked}
+            onChange={(event) => {
+              chooseUnit(event.target.value);
+              clearError('unit');
+            }}
+            className="h-12 w-full rounded-full bg-surface-container-low px-4 font-body-lg text-body-lg text-on-surface focus:ring-2 focus:ring-primary-container focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
+          >
+            <option value="">Sem unidade</option>
+            {UNIT_GROUPS.map((group) => (
+              <optgroup key={group.label} label={group.label}>
+                {group.units.map((unit) => (
+                  <option key={unit} value={unit}>
+                    {unit}
+                  </option>
+                ))}
+              </optgroup>
+            ))}
+            <option value={CUSTOM_UNIT}>Outra unidade…</option>
+          </select>
+          {customUnit && (
+            <input
+              id={customUnitId}
+              aria-label="Unidade personalizada"
+              type="text"
+              value={draft.unit}
+              maxLength={20}
+              disabled={locked}
+              placeholder="Digite a unidade"
+              onChange={(event) => {
+                update({ unit: event.target.value });
+                clearError('unit');
+              }}
+              className="h-12 w-full rounded-full bg-surface-container-low px-4 font-body-lg text-body-lg text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary-container focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
+            />
+          )}
+          <FieldError id={`${unitId}-error`} message={errors.unit} />
+        </div>
+      )}
+
+      {isOrdinal && (
+        <div className="flex flex-col gap-2">
+          <div className="flex items-center justify-between px-1">
+            <span className="font-label-md text-label-md font-medium text-on-surface">Opções ordenadas</span>
+            <span className="font-label-code text-label-code text-on-surface-variant">2 a 7</span>
+          </div>
+          <div className="flex flex-col gap-2">
+            {draft.options.map((option: OrdinalOption, index) => (
+              <div key={option.id} className="flex items-center gap-2">
+                <span className="w-5 shrink-0 text-center font-label-code text-label-code text-on-surface-variant">
+                  {index + 1}
+                </span>
+                <input
+                  aria-label={`Opção ${index + 1}`}
+                  type="text"
+                  value={option.label}
+                  maxLength={30}
+                  disabled={locked}
+                  onChange={(event) => {
+                    updateOption(option.id, event.target.value);
+                    clearError('options');
+                  }}
+                  className="h-11 min-w-0 flex-1 rounded-full bg-surface-container-low px-4 font-body-lg text-body-lg text-on-surface focus:ring-2 focus:ring-primary-container focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
+                />
+                <button
+                  type="button"
+                  aria-label={`Remover opção ${index + 1}`}
+                  disabled={locked || draft.options.length <= 2}
+                  onClick={() => removeOption(option.id)}
+                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-variant disabled:cursor-not-allowed disabled:opacity-40"
+                >
+                  <Icon name="remove" className="text-[20px]" />
+                </button>
+              </div>
+            ))}
+            <Button
+              variant="neutral"
+              icon="add"
+              disabled={locked || draft.options.length >= 7}
+              onClick={addOption}
+              className="self-start"
+            >
+              Adicionar opção
+            </Button>
+          </div>
+          <FieldError id={`${baseId}-options-error`} message={errors.options} />
+        </div>
+      )}
+
+      <div className="flex flex-col gap-2 rounded-lg bg-surface-container-low p-3.5">
+        <div className="flex flex-col">
+          <span className="font-label-md text-label-md font-semibold text-on-surface">Frequência diária</span>
+          <span className="font-body-sm text-body-sm text-on-surface-variant">
+            Quantas vezes você avalia no dia?
+          </span>
+        </div>
+        <div
+          role="group"
+          aria-label="Frequência diária"
+          className="grid grid-cols-2 gap-1 rounded-full bg-surface-container p-1"
+        >
+          <Chip
+            selected={draft.frequency === 'single_per_day'}
+            disabled={locked}
+            onClick={() => update({ frequency: 'single_per_day' })}
+            className="justify-center"
+          >
+            1x ao dia (Único)
+          </Chip>
+          <Chip
+            selected={draft.frequency === 'multiple_per_day'}
+            disabled={locked}
+            onClick={() => update({ frequency: 'multiple_per_day' })}
+            className="justify-center"
+          >
+            Múltiplos registros
+          </Chip>
+        </div>
+        <AggregationControl
+          group={draft.group}
+          valueType={draft.valueType}
+          frequency={draft.frequency}
+          value={draft.dailyAggregation}
+          onChange={(dailyAggregation) => update({ dailyAggregation })}
+          disabled={locked}
+        />
+      </div>
+
+      {isResult && (
+        <div className="flex flex-col gap-2">
+          <SectionLabel step="5">Direção desejável</SectionLabel>
+          <div role="group" aria-label="Direção desejável" className="grid grid-cols-2 gap-2">
+            {DIRECTION_OPTIONS.filter((option) => option.value !== 'target_range' || allowsIdealRange).map(
+              (option) => (
+                <Chip
+                  key={option.value}
+                  tone="result"
+                  selected={draft.desiredDirection === option.value}
+                  onClick={() => update({ desiredDirection: option.value })}
+                  className="justify-center"
+                >
+                  {option.label}
+                </Chip>
+              ),
+            )}
+          </div>
+          {draft.desiredDirection === 'target_range' && (
+            <div className="grid grid-cols-2 gap-2">
+              <TextField
+                id={idealMinId}
+                label="Mínimo ideal"
+                value={draft.idealMin}
+                inputMode="decimal"
+                onChange={(value) => {
+                  update({ idealMin: value });
+                  clearError('idealRange');
+                }}
+              />
+              <TextField
+                id={idealMaxId}
+                label="Máximo ideal"
+                value={draft.idealMax}
+                inputMode="decimal"
+                onChange={(value) => {
+                  update({ idealMax: value });
+                  clearError('idealRange');
+                }}
+              />
+            </div>
+          )}
+          <FieldError id={`${baseId}-ideal-error`} message={errors.idealRange} />
+        </div>
+      )}
+
+      <div className="flex items-start gap-2.5 rounded-lg bg-surface-container-high/60 p-3">
+        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-container-lowest text-primary shadow-level-1">
+          <Icon name="verified" className="text-[18px]" />
+        </span>
+        <div className="flex flex-col gap-0.5">
+          <span className="font-label-md text-label-md font-semibold text-on-surface">
+            Trava de integridade científica
+          </span>
+          {locked ? (
+            <p data-testid="locked-notice" className="font-body-sm text-body-sm text-on-surface-variant">
+              Este indicador já tem histórico. Grupo, tipo de resposta, configuração da escala/opções,
+              unidade, frequência e agregação ficam desabilitados. Nome, sigla, emoji e direção continuam
+              editáveis.
+            </p>
+          ) : (
+            <p className="font-body-sm text-body-sm text-on-surface-variant">
+              Tipo de resposta, unidade, configuração e agregação tornam-se{' '}
+              <strong className="text-on-surface">definitivos após o primeiro registro</strong>. Nome, sigla,
+              emoji e direção podem ser atualizados a qualquer momento.
+            </p>
+          )}
+        </div>
+      </div>
+
+      <div className="flex flex-col gap-2 pt-1 pb-2">
+        <Button type="submit" fullWidth icon="add_circle" disabled={busy}>
+          {busy ? 'Salvando…' : submitLabel}
+        </Button>
+        <Button type="button" variant="neutral" fullWidth onClick={onCancel} disabled={busy}>
+          Cancelar
+        </Button>
+      </div>
+    </form>
+  );
+}
diff --git a/app/src/indicators/__tests__/AggregationControl.test.tsx b/app/src/indicators/__tests__/AggregationControl.test.tsx
new file mode 100644
index 0000000..e902c61
--- /dev/null
+++ b/app/src/indicators/__tests__/AggregationControl.test.tsx
@@ -0,0 +1,108 @@
+import { render, screen, within } from '@testing-library/react';
+import userEvent from '@testing-library/user-event';
+import { describe, expect, it, vi } from 'vitest';
+import type { ValueType } from '../../domain/indicator';
+import { AggregationControl } from '../AggregationControl';
+
+function renderControl(
+  valueType: ValueType,
+  frequency: 'single_per_day' | 'multiple_per_day' = 'multiple_per_day',
+  group: 'factor' | 'result' = 'factor',
+  options: { value?: 'sum' | 'mean' | 'last' | 'any'; disabled?: boolean } = {},
+) {
+  const onChange = vi.fn();
+  const view = render(
+    <AggregationControl
+      group={group}
+      valueType={valueType}
+      frequency={frequency}
+      value={options.value ?? 'sum'}
+      onChange={onChange}
+      disabled={options.disabled}
+    />,
+  );
+  return { ...view, onChange };
+}
+
+describe('F-2.03 AggregationControl', () => {
+  it('renders nothing for single-per-day indicators', () => {
+    const { container } = renderControl('numeric', 'single_per_day');
+    expect(container).toBeEmptyDOMElement();
+  });
+
+  it('shows the deterministic suggestion for numbers (factor = sum, result = last)', () => {
+    const { unmount } = renderControl('numeric', 'multiple_per_day', 'factor');
+    expect(screen.getByTestId('aggregation-suggested')).toHaveTextContent('Soma');
+    unmount();
+
+    renderControl('numeric', 'multiple_per_day', 'result');
+    expect(screen.getByTestId('aggregation-suggested')).toHaveTextContent('Último');
+  });
+
+  it('lists only the valid aggregations for the type and explains the effect', async () => {
+    const user = userEvent.setup();
+    const { onChange, rerender } = renderControl('scale', 'multiple_per_day', 'factor', { value: 'mean' });
+    expect(screen.getByTestId('aggregation-suggested')).toHaveTextContent('Média');
+
+    await user.click(screen.getByRole('button', { name: /Configurações avançadas/ }));
+    const control = screen.getByTestId('aggregation-control');
+    const choices = within(control).getAllByRole('radio');
+    expect(choices.map((choice) => choice.textContent)).toEqual(['Soma', 'Média', 'Último']);
+    expect(within(control).queryByRole('radio', { name: 'Presença' })).not.toBeInTheDocument();
+    expect(control).toHaveTextContent('média: 6');
+
+    await user.click(within(control).getByRole('radio', { name: 'Último' }));
+    expect(onChange).toHaveBeenCalledWith('last');
+    rerender(
+      <AggregationControl
+        group="factor"
+        valueType="scale"
+        frequency="multiple_per_day"
+        value="last"
+        onChange={onChange}
+      />,
+    );
+    expect(screen.getByTestId('aggregation-control')).toHaveTextContent('último valor: 8');
+  });
+
+  it('offers presence and last for booleans, with an example of the day value', async () => {
+    const user = userEvent.setup();
+    renderControl('boolean', 'multiple_per_day', 'factor', { value: 'any' });
+    expect(screen.getByTestId('aggregation-suggested')).toHaveTextContent('Presença');
+
+    await user.click(screen.getByRole('button', { name: /Configurações avançadas/ }));
+    const control = screen.getByTestId('aggregation-control');
+    expect(
+      within(control)
+        .getAllByRole('radio')
+        .map((choice) => choice.textContent),
+    ).toEqual(['Presença', 'Último']);
+    expect(control).toHaveTextContent('Se qualquer registro do dia for “Sim”, o dia vale “Sim”.');
+  });
+
+  it('offers only last for ordinals', async () => {
+    const user = userEvent.setup();
+    renderControl('ordinal', 'multiple_per_day', 'result', { value: 'last' });
+    expect(screen.getByTestId('aggregation-suggested')).toHaveTextContent('Último');
+
+    await user.click(screen.getByRole('button', { name: /Configurações avançadas/ }));
+    const control = screen.getByTestId('aggregation-control');
+    expect(
+      within(control)
+        .getAllByRole('radio')
+        .map((choice) => choice.textContent),
+    ).toEqual(['Último']);
+    expect(control).toHaveTextContent('última opção: “Bom”');
+  });
+
+  it('keeps the locked choice visible and disabled with an explanation', () => {
+    renderControl('numeric', 'multiple_per_day', 'result', { value: 'mean', disabled: true });
+    const control = screen.getByTestId('aggregation-control');
+    expect(within(control).getByRole('radio', { name: 'Média' })).toHaveAttribute('aria-checked', 'true');
+    within(control)
+      .getAllByRole('radio')
+      .forEach((choice) => expect(choice).toBeDisabled());
+    expect(screen.getByRole('button', { name: /Configurações avançadas/ })).toBeDisabled();
+    expect(control).toHaveTextContent('Travada após o primeiro registro');
+  });
+});
diff --git a/app/src/indicators/__tests__/IndicatorEditor.test.tsx b/app/src/indicators/__tests__/IndicatorEditor.test.tsx
new file mode 100644
index 0000000..008ca71
--- /dev/null
+++ b/app/src/indicators/__tests__/IndicatorEditor.test.tsx
@@ -0,0 +1,402 @@
+import { fireEvent, render, screen, within } from '@testing-library/react';
+import userEvent from '@testing-library/user-event';
+import { describe, expect, it, vi } from 'vitest';
+import type { IndicatorInput } from '../../domain/indicator';
+import { PrivacyProvider } from '../../privacy/PrivacyContext';
+import { EyeToggle } from '../../design';
+import { IndicatorEditor } from '../IndicatorEditor';
+import { draftFromIndicator, emptyIndicatorDraft, type IndicatorDraft } from '../draft';
+
+function renderEditor(
+  overrides: Partial<IndicatorDraft> = {},
+  options: { locked?: boolean; error?: string | null } = {},
+) {
+  const onSubmit = vi.fn<(input: IndicatorInput) => void>();
+  const onCancel = vi.fn();
+  render(
+    <IndicatorEditor
+      initial={{ ...emptyIndicatorDraft(), ...overrides }}
+      locked={options.locked}
+      submitLabel="Criar Indicador"
+      error={options.error}
+      onSubmit={onSubmit}
+      onCancel={onCancel}
+    />,
+  );
+  return { onSubmit, onCancel };
+}
+
+const nameField = () => screen.getByRole('textbox', { name: /Nome do Indicador/ });
+const submitButton = () => screen.getByRole('button', { name: 'Criar Indicador' });
+
+async function fillName(user: ReturnType<typeof userEvent.setup>, name = 'Energia') {
+  await user.type(nameField(), name);
+}
+
+describe('F-2.03 IndicatorEditor: the four response types', () => {
+  it('creates a boolean factor', async () => {
+    const user = userEvent.setup();
+    const { onSubmit } = renderEditor();
+    await fillName(user, 'Malhei hoje?');
+    await user.click(submitButton());
+
+    expect(onSubmit).toHaveBeenCalledTimes(1);
+    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
+      group: 'factor',
+      valueType: 'boolean',
+      numeric: null,
+      scale: null,
+      options: null,
+      desiredDirection: null,
+      idealRange: null,
+      frequency: 'single_per_day',
+      dailyAggregation: null,
+    });
+  });
+
+  it('creates a scale result with a custom min/max/step', async () => {
+    const user = userEvent.setup();
+    const { onSubmit } = renderEditor();
+    await fillName(user, 'Nível de energia');
+    await user.click(screen.getByRole('radio', { name: 'Resultado' }));
+    await user.click(screen.getByRole('radio', { name: 'Escala' }));
+
+    fireEvent.change(screen.getByRole('textbox', { name: 'Máximo' }), { target: { value: '7' } });
+    fireEvent.change(screen.getByRole('textbox', { name: 'Passo' }), { target: { value: '2' } });
+    await user.click(submitButton());
+
+    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
+      group: 'result',
+      valueType: 'scale',
+      scale: { min: 0, max: 7, step: 2 },
+      numeric: null,
+      options: null,
+      desiredDirection: 'neutral',
+    });
+  });
+
+  it('creates a numeric factor with a suggested unit', async () => {
+    const user = userEvent.setup();
+    const { onSubmit } = renderEditor();
+    await fillName(user, 'Café');
+    await user.click(screen.getByRole('radio', { name: 'Número + unidade' }));
+    await user.selectOptions(screen.getByLabelText('Unidade'), 'mg');
+    await user.click(submitButton());
+
+    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
+      valueType: 'numeric',
+      numeric: { unit: 'mg', min: null, max: null, step: 1 },
+      scale: null,
+      options: null,
+    });
+  });
+
+  it('creates a numeric indicator with a custom unit and no unit', async () => {
+    const user = userEvent.setup();
+    const { onSubmit } = renderEditor();
+    await fillName(user, 'Suplemento');
+    await user.click(screen.getByRole('radio', { name: 'Número + unidade' }));
+    await user.selectOptions(screen.getByLabelText('Unidade'), 'Outra unidade…');
+    await user.type(screen.getByLabelText('Unidade personalizada'), 'gotas');
+    await user.click(submitButton());
+
+    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ numeric: { unit: 'gotas' } });
+  });
+
+  it('creates an ordinal factor with editable options and a limited set', async () => {
+    const user = userEvent.setup();
+    const { onSubmit } = renderEditor();
+    await fillName(user, 'Intensidade');
+    await user.click(screen.getByRole('radio', { name: 'Opções ordenadas' }));
+
+    const first = screen.getByLabelText('Opção 1');
+    await user.clear(first);
+    await user.type(first, 'Leve');
+    await user.click(screen.getByRole('button', { name: 'Adicionar opção' }));
+    await user.type(screen.getByLabelText('Opção 4'), 'Intenso');
+    await user.click(screen.getByRole('button', { name: 'Emoji ⚡' }));
+    await u
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
