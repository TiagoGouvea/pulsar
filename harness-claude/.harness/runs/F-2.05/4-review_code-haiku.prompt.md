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
  "id": "F-2.05",
  "title": "Tela Meus indicadores",
  "description": "/indicators conforme design/meus_indicadores: listas separadas Fatores e Resultados com IndicatorLabel, tipo e agregação; reordenar com botões subir/descer; arquivar/restaurar; seção de arquivados; abrir editor.",
  "acceptance": [
    "Fatores e Resultados distinguíveis sem depender só de cor",
    "Reordenar dentro do grupo persiste",
    "Arquivados aparecem em seção própria e podem ser restaurados",
    "Nomes seguem o olho global"
  ],
  "specRefs": [
    "spec.md#4.5",
    "spec.md#7.3"
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
diff --git a/app/e2e/indicators-list.spec.ts b/app/e2e/indicators-list.spec.ts
new file mode 100644
index 0000000..1a77389
--- /dev/null
+++ b/app/e2e/indicators-list.spec.ts
@@ -0,0 +1,360 @@
+import type { APIRequestContext, Locator, Page } from '@playwright/test';
+import firebaseJson from '../firebase.json' with { type: 'json' };
+import { currentUid, expect, test } from './fixtures';
+import { hasHorizontalOverflow, SENTINELS } from './support';
+
+/**
+ * Acceptance tests for F-2.05 "Meus indicadores" (/indicators), spec 4.5 + 7.3.
+ *
+ * DOM contract expected from the screen (asserted here, so the implementation must provide it):
+ *  - Active lists: data-testid="factor-list" / "result-list"; archived: data-testid="archived-list".
+ *  - Every indicator row: data-testid="indicator-card" containing the shared [data-indicator-label]
+ *    span (IndicatorLabel honors the global eye: closed -> abbreviation, open -> full name).
+ *  - Groups are labeled with visible text "Fatores" / "Resultados" / "Arquivados"
+ *    (distinguishable without relying on color alone).
+ *  - Reordering uses per-card buttons whose accessible name matches "Subir"/"Descer"
+ *    (or "mover para cima/baixo"), per DECISOES.md.
+ *  - Card actions (editar/arquivar/restaurar) are either direct buttons on the card or items of a
+ *    bottom sheet (role=dialog) opened by an "Opções ..." trigger (design meus_indicadores).
+ */
+
+const PROJECT = 'demo-pulsar';
+const FIRESTORE_DOCUMENTS = `http://127.0.0.1:${firebaseJson.emulators.firestore.port}/v1/projects/${PROJECT}/databases/(default)/documents`;
+
+const MOVE_DOWN = /descer|baixo/i;
+const ACTION_EDIT = /editar/i;
+const ACTION_ARCHIVE = /arquivar/i;
+const ACTION_RESTORE = /restaurar/i;
+const OPTIONS_TRIGGER = /op(ç|c)ões|mais ações/i;
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
+type StoredDoc = Record<string, unknown> & { id: string };
+
+/** Reads the user's indicators straight from the Firestore emulator (rules bypassed as owner). */
+async function readIndicators(request: APIRequestContext, uid: string): Promise<StoredDoc[]> {
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
+interface RestIndicatorDoc {
+  name: string;
+  abbreviation: string;
+  sortOrder: number;
+  archived?: boolean;
+}
+
+/** Creates a minimal boolean factor for the user through the Firestore emulator REST API. */
+async function createIndicatorDoc(
+  request: APIRequestContext,
+  uid: string,
+  id: string,
+  indicator: RestIndicatorDoc,
+): Promise<void> {
+  const response = await request.post(`${FIRESTORE_DOCUMENTS}/users/${uid}/indicators?documentId=${id}`, {
+    headers: { Authorization: 'Bearer owner' },
+    data: {
+      fields: {
+        group: { stringValue: 'factor' },
+        name: { stringValue: indicator.name },
+        abbreviation: { stringValue: indicator.abbreviation },
+        emoji: { nullValue: null },
+        valueType: { stringValue: 'boolean' },
+        numeric: { nullValue: null },
+        scale: { nullValue: null },
+        options: { nullValue: null },
+        desiredDirection: { nullValue: null },
+        idealRange: { nullValue: null },
+        frequency: { stringValue: 'single_per_day' },
+        dailyAggregation: { nullValue: null },
+        sortOrder: { integerValue: String(indicator.sortOrder) },
+        archivedAt: indicator.archived ? { timestampValue: '2026-01-01T00:00:00Z' } : { nullValue: null },
+        lockedAt: { nullValue: null },
+        createdAt: { timestampValue: '2026-01-01T00:00:00Z' },
+        updatedAt: { timestampValue: '2026-01-01T00:00:00Z' },
+      },
+    },
+  });
+  expect(response.ok()).toBeTruthy();
+}
+
+/** The card of the indicator whose label (abbreviation or full name) contains `label`. */
+function listCard(page: Page, list: string, label: string): Locator {
+  return page
+    .getByTestId(list)
+    .getByTestId('indicator-card')
+    .filter({ has: page.locator('[data-indicator-label]', { hasText: label }) });
+}
+
+/** Visible order of the indicator labels inside one list. */
+async function listLabels(page: Page, list: string): Promise<string[]> {
+  return page
+    .getByTestId(list)
+    .getByTestId('indicator-card')
+    .evaluateAll((cards: Element[]) =>
+      cards.map((card) => card.querySelector('[data-indicator-label]')?.textContent ?? ''),
+    );
+}
+
+/** Closes the global eye so cards show abbreviations, regardless of the persisted default. */
+async function closeEye(page: Page): Promise<void> {
+  const eye = page.getByTestId('eye-toggle');
+  if ((await eye.getAttribute('aria-pressed')) !== 'false') await eye.click();
+  await expect(eye).toHaveAttribute('aria-pressed', 'false');
+}
+
+/**
+ * Some implementations filter lists behind "Todos / Fatores / Resultados / Arquivados" pills
+ * (design meus_indicadores). Make sure both active lists are on screen before asserting on them.
+ */
+async function showAllLists(page: Page): Promise<void> {
+  const todos = page.getByRole('button', { name: /todos/i });
+  if (await todos.count()) await todos.first().click();
+}
+
+/** Expands the archived section when it is collapsed (toggle button or filter pill). */
+async function revealArchivedCard(page: Page, card: Locator): Promise<void> {
+  if (await card.isVisible()) return;
+  const toggle = page.getByRole('button', { name: /arquivados/i });
+  if (await toggle.count()) await toggle.first().click();
+  await expect(card).toBeVisible();
+}
+
+/** Triggers a card action, either via a direct control or through the "Opções" bottom sheet. */
+async function clickCardAction(page: Page, card: Locator, action: RegExp): Promise<void> {
+  const direct = card.getByRole('button', { name: action }).or(card.getByRole('link', { name: action }));
+  if (await direct.count()) {
+    await direct.first().click();
+    return;
+  }
+  await card.getByRole('button', { name: OPTIONS_TRIGGER }).first().click();
+  const sheet = page.getByRole('dialog');
+  await expect(sheet).toBeVisible();
+  await sheet.getByRole('button', { name: action }).first().click();
+}
+
+/** Everything a screen reader or a screenshot could expose: visible text, aria-*, title, tooltips. */
+async function exposedText(page: Page): Promise<string> {
+  return page.evaluate(() => {
+    const attributes = Array.from(document.querySelectorAll('*')).flatMap((element) =>
+      Array.from(element.attributes)
+        .filter((attribute) => attribute.name === 'title' || attribute.name.startsWith('aria-'))
+        .map((attribute) => attribute.value),
+    );
+    const tooltips = Array.from(document.querySelectorAll('[role="tooltip"]')).map(
+      (element) => element.textContent ?? '',
+    );
+    return [document.body.innerText, ...attributes, ...tooltips].join('\n');
+  });
+}
+
+test.describe('F-2.05 indicators list', () => {
+  test('factors and results are listed in separate, labeled groups', async ({ seedPage: page }, testInfo) => {
+    if (testInfo.project.name !== 'mobile') return;
+    await page.goto('/indicators');
+    await closeEye(page);
+    await showAllLists(page);
+
+    // Groups are labeled with text, not only with color (AC-07).
+    await expect(page.getByText('Fatores', { exact: true }).first()).toBeVisible();
+    await expect(page.getByText('Resultados', { exact: true }).first()).toBeVisible();
+    await expect(page.getByText('Arquivados', { exact: true }).first()).toBeVisible();
+
+    for (const label of ['EXE', 'SON', 'CAF']) {
+      await expect(listCard(page, 'factor-list', label)).toBeVisible();
+    }
+    for (const label of ['ENE', 'FOC']) {
+      await expect(listCard(page, 'result-list', label)).toBeVisible();
+    }
+
+    // The archived indicator (Coenzima Q10) is not in the active lists: it lives in its own section.
+    await expect(listCard(page, 'factor-list', 'Q10')).toHaveCount(0);
+    const archivedCard = listCard(page, 'archived-list', 'Q10');
+    await expect(archivedCard).toHaveCount(1);
+    await revealArchivedCard(page, archivedCard);
+    await expect(archivedCard).toContainText(/arquivado/i);
+
+    // Cards tell the response type and the daily aggregation (design meus_indicadores).
+    await expect(listCard(page, 'factor-list', 'EXE')).toContainText(/booleano|sim\s*\/\s*não/i);
+    await expect(listCard(page, 'factor-list', 'CAF')).toContainText(/soma/i);
+    const energy = listCard(page, 'result-list', 'ENE');
+    await expect(energy).toContainText(/escala/i);
+    await expect(energy).toContainText('Média');
+
+    // "Novo Indicador" opens the creation editor (F-2.03 route).
+    const novo = page
+      .getByRole('button', { name: /novo indicador/i })
+      .or(page.getByRole('link', { name: /novo indicador/i }));
+    await novo.first().click();
+    await expect(page).toHaveURL(/\/indicators\/new$/);
+    await expect(page.getByRole('dialog', { name: 'Novo Indicador' })).toBeVisible();
+  });
+
+  test('indicator names follow the global eye toggle', async ({ seedPage: page }, testInfo) => {
+    if (testInfo.project.name !== 'mobile') return;
+    await page.goto('/indicators');
+    await closeEye(page);
+    const eye = page.getByTestId('eye-toggle');
+
+    // Closed: abbreviations only; real names never leak, not even via aria-*, title or tooltips.
+    await expect(listCard(page, 'factor-list', 'SON')).toBeVisible();
+    let exposed = await exposedText(page);
+    for (const sentinel of SENTINELS) expect(exposed).not.toContain(sentinel);
+    await expect(page.getByTestId('factor-list')).not.toContainText('💤');
+
+    // Open: the real names (and emojis) replace the abbreviations.
+    await eye.click();
+    await expect(eye).toHaveAttribute('aria-pressed', 'true');
+    await expect(listCard(page, 'factor-list', 'ZQX_SONO_9K2')).toBeVisible();
+    await expect(listCard(page, 'result-list', 'ZQX_ENERGIA_7F3')).toBeVisible();
+    await expect(listCard(page, 'result-list', 'ZQX_FOCO_4M8')).toBeVisible();
+
+    // Closed again: the names are hidden once more.
+    await eye.click();
+    await expect(eye).toHaveAttribute('aria-pressed', 'false');
+    await expect(listCard(page, 'factor-list', 'SON')).toBeVisible();
+    exposed = await exposedText(page);
+    for (const sentinel of SENTINELS) expect(exposed).not.toContain(sentinel);
+  });
+
+  test('reordering within the group persists after reload and is stored', async ({
+    freshUserPage: page,
+    request,
+  }, testInfo) => {
+    if (testInfo.project.name !== 'mobile') return;
+    const owner = (await currentUid(page)) ?? '';
+    expect(owner).not.toBe('');
+    await createIndicatorDoc(request, owner, 'ind_alf', {
+      name: 'Alfa',
+      abbreviation: 'ALF',
+      sortOrder: 1000,
+    });
+    await createIndicatorDoc(request, owner, 'ind_bet', {
+      name: 'Beta',
+      abbreviation: 'BET',
+      sortOrder: 2000,
+    });
+    await createIndicatorDoc(request, owner, 'ind_gam', {
+      name: 'Gama',
+      abbreviation: 'GAM',
+      sortOrder: 3000,
+    });
+
+    await page.goto('/indicators');
+    await closeEye(page);
+    await showAllLists(page);
+    await expect(listCard(page, 'factor-list', 'ALF')).toBeVisible();
+    await expect.poll(() => listLabels(page, 'factor-list')).toEqual(['ALF', 'BET', 'GAM']);
+
+    await listCard(page, 'factor-list', 'ALF').getByRole('button', { name: MOVE_DOWN }).click();
+    await expect.poll(() => listLabels(page, 'factor-list')).toEqual(['BET', 'ALF', 'GAM']);
+
+    // The chosen order survives a full reload (persisted, not just local state).
+    await page.reload();
+    await expect.poll(() => listLabels(page, 'factor-list')).toEqual(['BET', 'ALF', 'GAM']);
+
+    const stored = await readIndicators(request, owner);
+    const sortOrderOf = (id: string) => stored.find((doc) => doc.id === id)?.sortOrder as number;
+    expect(sortOrderOf('ind_alf')).toBeGreaterThan(sortOrderOf('ind_bet'));
+  });
+
+  test('archived indicators live in their own section and can be restored', async ({
+    freshUserPage: page,
+    request,
+  }, testInfo) => {
+    if (testInfo.project.name !== 'mobile') return;
+    const owner = (await currentUid(page)) ?? '';
+    expect(owner).not.toBe('');
+    await createIndicatorDoc(request, owner, 'ind_alf', {
+      name: 'Alfa',
+      abbreviation: 'ALF',
+      sortOrder: 1000,
+    });
+
+    await page.goto('/indicators');
+    await closeEye(page);
+    await showAllLists(page);
+    const activeCard = listCard(page, 'factor-list', 'ALF');
+    await expect(activeCard).toBeVisible();
+
+    await clickCardAction(page, activeCard, ACTION_ARCHIVE);
+
+    await expect(listCard(page, 'factor-list', 'ALF')).toHaveCount(0);
+    const archivedCard = listCard(page, 'archived-list', 'ALF');
+    await expect(archivedCard).toHaveCount(1);
+    await revealArchivedCard(page, archivedCard);
+    await expect(archivedCard).toContainText(/arquivado/i);
+
+    let stored = await readIndicators(request, owner);
+    expect(stored.find((doc) => doc.id === 'ind_alf')?.archivedAt).not.toBeNull();
+
+    // Still archived after a reload (persisted, not just local state).
+    await page.reload();
+    await showAllLists(page);
+    await expect(listCard(page, 'factor-list', 'ALF')).toHaveCount(0);
+    await expect(listCard(page, 'archived-list', 'ALF')).toHaveCount(1);
+
+    await revealArchivedCard(page, listCard(page, 'archived-list', 'ALF'));
+    await clickCardAction(page, listCard(page, 'archived-list', 'ALF'), ACTION_RESTORE);
+    await showAllLists(page);
+    await expect(listCard(page, 'factor-list', 'ALF')).toBeVisible();
+    await expect(listCard(page, 'archived-list', 'ALF')).toHaveCount(0);
+
+    stored = await readIndicators(request, owner);
+    expect(stored.find((doc) => doc.id === 'ind_alf')?.archivedAt).toBeNull();
+  });
+
+  test('a listed indicator opens its editor', async ({ seedPage: page }, testInfo) => {
+    if (testInfo.project.name !== 'mobile') return;
+    await page.goto('/indicators');
+    await closeEye(page);
+    await showAllLists(page);
+    const coffeeCard = listCard(page, 'factor-list', 'CAF');
+    await expect(coffeeCard).toBeVisible();
+
+    await clickCardAction(page, coffeeCard, ACTION_EDIT);
+
+    await expect(page).toHaveURL(/\/indicators\/[^/]+\/edit$/);
+    await expect(page.getByRole('dialog', { name: 'Editar Indicador' })).toBeVisible();
+    await expect(page.getByRole('textbox', { name: /Nome do Indicador/ })).toHaveValue('Café');
+  });
+
+  test('indicators screen opens without breaking (desktop smoke)', async ({ freshUserPage: page }) => {
+    const errors: string[] = [];
+    page.on('pageerror', (error) => errors.push(error.message));
+    await page.goto('/indicators');
+    await expect(page.getByTestId('eye-toggle')).toBeVisible();
+    expect(await hasHorizontalOverflow(page)).toBe(false);
+    expect(errors).toEqual([]);
+  });
+});
diff --git a/app/scripts/icons.ts b/app/scripts/icons.ts
index 6a99c3f..11b03d4 100644
--- a/app/scripts/icons.ts
+++ b/app/scripts/icons.ts
@@ -9,24 +9,33 @@ const names = [
   'add_circle',
   'analytics',
   'arrow_back',
+  'arrow_downward',
   'arrow_forward',
+  'arrow_upward',
   'bedtime',
   'bolt',
   'check_circle',
   'close',
   'cloud_sync',
   'coffee',
+  'drag_indicator',
+  'expand_more',
   'edit_note',
   'fitness_center',
   'healing',
+  'info',
   'input',
   'insights',
+  'inventory_2',
   'lightbulb',
   'medication',
+  'more_vert',
   'no_accounts',
+  'output',
   'person',
   'psychology',
   'remove',
+  'restore',
   'science',
   'ssid_chart',
   'touch_app',
diff --git a/app/src/App.tsx b/app/src/App.tsx
index e3a76c6..20e7949 100644
--- a/app/src/App.tsx
+++ b/app/src/App.tsx
@@ -7,6 +7,7 @@ import { emulatorsEnabled } from './lib/env';
 import { DashboardPage } from './pages/DashboardPage';
 import { HomePlaceholder } from './pages/HomePlaceholder';
 import { IndicatorEditorPage } from './pages/IndicatorEditorPage';
+import { IndicatorsPage } from './pages/IndicatorsPage';
 import { OnboardingPage } from './pages/OnboardingPage';
 import { PlaceholderPage } from './pages/PlaceholderPage';
 import { SettingsPage } from './pages/SettingsPage';
@@ -73,13 +74,7 @@ const routes: RouteObject[] = [
         path: '/indicators',
         element: (
           <AppShell>
-            <PlaceholderPage
-              title="Meus indicadores"
-              icon="tune"
-              emptyTitle="Nenhum indicador ainda"
-              description="Crie seus indicadores para acompanhar fatores e resultados ao longo do tempo."
-              headerAction={{ label: 'Novo Indicador', to: '/indicators/new' }}
-            />
+            <IndicatorsPage />
           </AppShell>
         ),
       },
diff --git a/app/src/data/__tests__/indicators.test.ts b/app/src/data/__tests__/indicators.test.ts
index 4e65da9..e2a7772 100644
--- a/app/src/data/__tests__/indicators.test.ts
+++ b/app/src/data/__tests__/indicators.test.ts
@@ -350,6 +350,26 @@ describe('indicator repository', () => {
     expect(store.writes).toHaveLength(0);
   });
 
+  it('rejects a stale reorder when another device changes the order during the transaction', async () => {
+    store.documents.set(path('factor-a'), saved({ sortOrder: 1000 }));
+    store.documents.set(path('factor-b'), saved({ sortOrder: 2000 }));
+    store.conflict = () => store.documents.set(path('factor-a'), saved({ sortOrder: 3000 }));
+    const { reorderIndicators } = await import('../indicators');
+    await expect(
+      reorderIndicators(
+        'alice',
+        'factor',
+        ['factor-b', 'factor-a'],
+        new Map([
+          ['factor-a', 1000],
+          ['factor-b', 2000],
+        ]),
+      ),
+    ).rejects.toThrow('Indicator order changed.');
+    expect(store.writes).toHaveLength(0);
+    expect(store.documents.get(path('factor-a'))?.sortOrder).toBe(3000);
+  });
+
   it('clears the previous account immediately when the subscribed user changes', async () => {
     store.documents.set(path('coffee'), saved());
     const { useIndicators } = await repository();
diff --git a/app/src/data/firestoreRest.ts b/app/src/data/firestoreRest.ts
new file mode 100644
index 0000000..94cbcce
--- /dev/null
+++ b/app/src/data/firestoreRest.ts
@@ -0,0 +1,87 @@
+/**
+ * One-shot reads through the Firestore REST API.
+ *
+ * The JS SDK answers a collection query with a streaming request whose connection stays open for
+ * about a minute after the result (the client keeps the channel alive), so a screen that reads a
+ * collection never reaches the browser's "network idle" state. The REST list is a single HTTP
+ * request: the screen reads, renders and releases the connection right away.
+ *
+ * The requests carry the signed-in user's ID token, so the Security Rules are enforced exactly as
+ * they are for the SDK.
+ */
+import { emulators } from '../../firebase.json';
+import { auth, firebaseApp } from '../lib/firebase';
+import { emulatorsEnabled } from '../lib/env';
+
+/** Firestore value as the REST API encodes it. */
+export type RestValue = Record<string, unknown>;
+
+export interface RestDocument {
+  id: string;
+  fields: Record<string, unknown>;
+}
+
+export function decodeValue(value: RestValue): unknown {
+  if ('nullValue' in value) return null;
+  if ('stringValue' in value) return value.stringValue;
+  if ('booleanValue' in value) return value.booleanValue;
+  if ('integerValue' in value) return Number(value.integerValue);
+  if ('doubleValue' in value) return Number(value.doubleValue);
+  if ('timestampValue' in value) return value.timestampValue;
+  if ('mapValue' in value) {
+    const map = value.mapValue as { fields?: Record<string, RestValue> };
+    return decodeFields(map.fields);
+  }
+  if ('arrayValue' in value) {
+    const array = value.arrayValue as { values?: RestValue[] };
+    return (array.values ?? []).map(decodeValue);
+  }
+  return undefined;
+}
+
+export function decodeFields(fields: Record<string, RestValue> = {}): Record<string, unknown> {
+  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
+}
+
+function restBaseUrl(): string {
+  if (emulatorsEnabled) {
+    const host = window.location.hostname || '127.0.0.1';
+    return `http://${host}:${emulators.firestore.port}`;
+  }
+  return 'https://firestore.googleapis.com';
+}
+
+/** Lists every document of a collection, following the pagination of the API. */
+export async function listDocuments(collectionPath: string[]): Promise<RestDocument[]> {
+  const user = auth.currentUser;
+  if (!user) throw new Error('There is no signed-in user.');
+  const token = await user.getIdToken();
+  const project = firebaseApp.options.projectId ?? 'demo-pulsar';
+  const path = collectionPath.map(encodeURIComponent).join('/');
+  const documents: RestDocument[] = [];
+  let pageToken: string | undefined;
+
+  do {
+    const url = new URL(`${restBaseUrl()}/v1/projects/${project}/databases/(default)/documents/${path}`);
+    url.searchParams.set('pageSize', '300');
+    if (pageToken) url.searchParams.set('pageToken', pageToken);
+
+    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
+    if (!response.ok) {
+      throw new Error(`Firestore read failed with status ${response.status}.`);
+    }
+    const body = (await response.json()) as {
+      documents?: { name: string; fields?: Record<string, RestValue> }[];
+      nextPageToken?: string;
+    };
+    for (const document of body.documents ?? []) {
+      documents.push({
+        id: document.name.split('/').pop() ?? '',
+        fields: decodeFields(document.fields),
+      });
+    }
+    pageToken = body.nextPageToken;
+  } while (pageToken);
+
+  return documents;
+}
diff --git a/app/src/data/indicators.ts b/app/src/data/indicators.ts
index 7fe8dbf..91f110d 100644
--- a/app/src/data/indicators.ts
+++ b/app/src/data/indicators.ts
@@ -207,8 +207,16 @@ async function setArchived(uid: string, id: string, archived: boolean): Promise<
   });
 }
 
-export async function reorderIndicators(uid: string, group: IndicatorGroup, ids: string[]): Promise<void> {
+export async function reorderIndicators(
+  uid: string,
+  group: IndicatorGroup,
+  ids: string[],
+  expectedOrder?: ReadonlyMap<string, number>,
+): Promise<void> {
   if (new Set(ids).size !== ids.length) throw new Error('Indicator IDs must be unique.');
+  if (expectedOrder && (expectedOrder.size !== ids.length || ids.some((id) => !expectedOrder.has(id)))) {
+    throw new Error('Expected indicator order does not match the requested group.');
+  }
 
   await runTransaction(db, async (transaction) => {
     const references = ids.map((id) => indicatorRef(uid, id));
@@ -218,6 +226,12 @@ export async function reorderIndicators(uid: string, group: IndicatorGroup, ids:
       if (snapshot.data().group !== group) {
         throw new Error('Indicators can only be reordered within their own group.');
       }
+      if (
+        expectedOrder &&
+        (snapshot.data().archivedAt != null || snapshot.data().sortOrder !== expectedOrder.get(snapshot.id))
+      ) {
+        throw new Error('Indicator order changed.');
+      }
     });
     references.forEach((reference, index) => {
       transaction.update(reference, {
diff --git a/app/src/design/icons.ts b/app/src/design/icons.ts
index e552a27..4766114 100644
--- a/app/src/design/icons.ts
+++ b/app/src/design/icons.ts
@@ -6,7 +6,9 @@ export const iconPaths = {
   analytics:
     'M280 -280L360 -280L360 -480L280 -480ZM600 -280L680 -280L680 -680L600 -680ZM440 -280L520 -280L520 -400L440 -400ZM440 -480L520 -480L520 -560L440 -560ZM200 -120Q167 -120 143.5 -143.5Q120 -167 120 -200L120 -760Q120 -793 143.5 -816.5Q167 -840 200 -840L760 -840Q793 -840 816.5 -816.5Q840 -793 840 -760L840 -200Q840 -167 816.5 -143.5Q793 -120 760 -120ZM200 -200L760 -200Q760 -200 760 -200Q760 -200 760 -200L760 -760Q760 -760 760 -760Q760 -760 760 -760L200 -760Q200 -760 200 -760Q200 -760 200 -760L200 -200Q200 -200 200 -200Q200 -200 200 -200ZM200 -760L200 -760Q200 -760 200 -760Q200 -760 200 -760L200 -200Q200 -200 200 -200Q200 -200 200 -200L200 -200Q200 -200 200 -200Q200 -200 200 -200L200 -760Q200 -760 200 -760Q200 -760 200 -760Z',
   arrow_back: 'M313 -440L537 -216L480 -160L160 -480L480 -800L537 -744L313 -520L800 -520L800 -440Z',
+  arrow_downward: 'M440 -800L440 -313L216 -537L160 -480L480 -160L800 -480L744 -537L520 -313L520 -800Z',
   arrow_forward: 'M647 -440L160 -440L160 -520L647 -520L423 -744L480 -800L800 -480L480 -160L423 -216Z',
+  arrow_upward: 'M440 -160L440 -647L216 -423L160 -480L480 -800L800 -480L744 -423L520 -647L520 -160Z',
   bedtime:
     'M484 -80Q400 -80 326.5 -112Q253 -144 198.5 -198.5Q144 -253 112 -326.5Q80 -400 80 -484Q80 -630 173 -741.5Q266 -853 410 -880Q392 -781 421 -686.5Q450 -592 521 -521Q592 -450 686.5 -421Q781 -392 880 -410Q854 -266 742 -173Q630 -80 484 -80ZM484 -160Q572 -160 647 -204Q722 -248 765 -325Q679 -333 602 -368.5Q525 -404 464 -465Q403 -526 367 -603Q331 -680 324 -766Q247 -723 203.5 -647.5Q160 -572 160 -484Q160 -349 254.5 -254.5Q349 -160 484 -160ZM464 -465Q464 -465 464 -465Q464 -465 464 -465Q464 -465 464 -465Q464 -465 464 -465Q464 -465 464 -465Q464 -465 464 -465Q464 -465 464 -465Q464 -465 464 -465Q464 -465 464 -465Q464 -465 464 -465Z',
   bolt: 'M422 -232L629 -480L469 -480L498 -707L313 -440L452 -440ZM320 -80L360 -360L160 -360L520 -880L600 -880L560 -560L800 -560L400 -80ZM471 -470L471 -470L471 -470L471 -470L471 -470L471 -470Z',
@@ -18,27 +20,39 @@ export const iconPaths = {
     'M160 -160L160 -240L269 -240Q218 -284 189 -346Q160 -408 160 -480Q160 -592 228 -677.5Q296 -763 400 -790L400 -706Q330 -681 285 -619.5Q240 -558 240 -480Q240 -426 261.5 -380.5Q283 -335 320 -302L320 -400L400 -400L400 -160ZM600 -160Q550 -160 515 -195Q480 -230 480 -280Q480 -328 513 -362.5Q546 -397 594 -399Q611 -435 644.5 -457.5Q678 -480 720 -480Q773 -480 811.5 -445.5Q850 -411 858 -360L858 -360Q900 -360 930 -331Q960 -302 960 -261Q960 -219 931 -189.5Q902 -160 860 -160ZM716 -520Q709 -561 689 -596Q669 -631 640 -658L640 -560L560 -560L560 -800L800 -800L800 -720L691 -720Q734 -682 761.5 -631Q789 -580 797 -520ZM600 -240L860 -240Q868 -240 874 -246Q880 -252 880 -260Q880 -268 874 -274Q868 -280 860 -280L790 -280L790 -330Q790 -359 769.5 -379.5Q749 -400 720 -400Q691 -400 670.5 -379.5Q650 -359 650 -330L650 -320L600 -320Q583 -320 571.5 -308.5Q560 -297 560 -280Q560 -263 571.5 -251.5Q583 -240 600 -240ZM720 -320Q720 -320 720 -320Q720 -320 720 -320Q720 -320 720 -320Q720 -320 720 -320L720 -320L720 -320Q720 -320 720 -320Q720 -320 720 -320Q720 -320 720 -320Q720 -320 720 -320L720 -320L720 -320Q720 -320 720 -320Q720 -320 720 -320Q720 -320 720 -320Q720 -320 720 -320Z',
   coffee:
     'M440 -240Q323 -240 241.5 -321.5Q160 -403 160 -520L160 -760Q160 -793 183.5 -816.5Q207 -840 240 -840L740 -840Q798 -840 839 -799Q880 -758 880 -700Q880 -642 839 -601Q798 -560 740 -560L720 -560L720 -520Q720 -403 638.5 -321.5Q557 -240 440 -240ZM240 -640L640 -640L640 -760L240 -760ZM440 -320Q523 -320 581.5 -378.5Q640 -437 640 -520L640 -560L240 -560L240 -520Q240 -437 298.5 -378.5Q357 -320 440 -320ZM720 -640L740 -640Q765 -640 782.5 -657.5Q800 -675 800 -700Q800 -725 782.5 -742.5Q765 -760 740 -760L720 -760ZM160 -120L160 -200L800 -200L800 -120ZM440 -560Q440 -560 440 -560Q440 -560 440 -560L440 -560L440 -560L440 -560Q440 -560 440 -560Q440 -560 440 -560Z',
+  drag_indicator:
+    'M360 -160Q327 -160 303.5 -183.5Q280 -207 280 -240Q280 -273 303.5 -296.5Q327 -320 360 -320Q393 -320 416.5 -296.5Q440 -273 440 -240Q440 -207 416.5 -183.5Q393 -160 360 -160ZM600 -160Q567 -160 543.5 -183.5Q520 -207 520 -240Q520 -273 543.5 -296.5Q567 -320 600 -320Q633 -320 656.5 -296.5Q680 -273 680 -240Q680 -207 656.5 -183.5Q633 -160 600 -160ZM360 -400Q327 -400 303.5 -423.5Q280 -447 280 -480Q280 -513 303.5 -536.5Q327 -560 360 -560Q393 -560 416.5 -536.5Q440 -513 440 -480Q440 -447 416.5 -423.5Q393 -400 360 -400ZM600 -400Q567 -400 543.5 -423.5Q520 -447 520 -480Q520 -513 543.5 -536.5Q567 -560 600 -560Q633 -560 656.5 -536.5Q680 -513 680 -480Q680 -447 656.5 -423.5Q633 -400 600 -400ZM360 -640Q327 -640 303.5 -663.5Q280 -687 280 -720Q280 -753 303.5 -776.5Q327 -800 360 -800Q393 -800 416.5 -776.5Q440 -753 440 -720Q440 -687 416.5 -663.5Q393 -640 360 -640ZM600 -640Q567 -640 543.5 -663.5Q520 -687 520 -720Q520 -753 543.5 -776.5Q567 -800 600 -800Q633 -800 656.5 -776.5Q680 -753 680 -720Q680 -687 656.5 -663.5Q633 -640 600 -640Z',
+  expand_more: 'M480 -345L240 -585L296 -641L480 -457L664 -641L720 -585Z',
   edit_note:
     'M160 -400L160 -480L440 -480L440 -400ZM160 -560L160 -640L600 -640L600 -560ZM160 -720L160 -800L600 -800L600 -720ZM520 -160L520 -283L741 -503Q750 -512 761 -516Q772 -520 783 -520Q795 -520 806 -515.5Q817 -511 826 -502L863 -465Q871 -456 875.5 -445Q880 -434 880 -423Q880 -412 876 -400.5Q872 -389 863 -380L643 -160ZM820 -423L820 -423L783 -460L783 -460ZM580 -220L618 -220L739 -342L721 -361L702 -379L580 -258ZM721 -361L702 -379L702 -379L739 -342L739 -342Z',
   fitness_center:
     'M536 -84L480 -140L622 -282L282 -622L140 -480L84 -536L140 -594L84 -650L168 -734L112 -792L168 -848L226 -792L310 -876L366 -820L424 -876L480 -820L338 -678L678 -338L820 -480L876 -424L820 -366L876 -310L792 -226L848 -168L792 -112L734 -168L650 -84L594 -140Z',
   healing:
     'M480 -254L330 -104Q307 -81 274 -81Q241 -81 218 -104L104 -218Q81 -241 81 -274Q81 -307 104 -330L254 -480L104 -630Q81 -653 81 -686Q81 -719 104 -742L218 -856Q241 -879 274 -879Q307 -879 330 -856L480 -706L630 -856Q653 -879 686 -879Q719 -879 742 -856L856 -742Q879 -719 879 -686Q879 -653 856 -630L706 -480L856 -330Q879 -307 879 -274Q879 -241 856 -218L742 -104Q719 -81 686 -81Q653 -81 630 -104ZM480 -520Q497 -520 508.5 -531.5Q520 -543 520 -560Q520 -577 508.5 -588.5Q497 -600 480 -600Q463 -600 451.5 -588.5Q440 -577 440 -560Q440 -543 451.5 -531.5Q463 -520 480 -520ZM310 -536L424 -650L274 -800Q274 -800 274 -800Q274 -800 274 -800L160 -686Q160 -686 160 -686Q160 -686 160 -686ZM400 -440Q417 -440 428.5 -451.5Q440 -463 440 -480Q440 -497 428.5 -508.5Q417 -520 400 -520Q383 -520 371.5 -508.5Q360 -497 360 -480Q360 -463 371.5 -451.5Q383 -440 400 -440ZM480 -360Q497 -360 508.5 -371.5Q520 -383 520 -400Q520 -417 508.5 -428.5Q497 -440 480 -440Q463 -440 451.5 -428.5Q440 -417 440 -400Q440 -383 451.5 -371.5Q463 -360 480 -360ZM560 -440Q577 -440 588.5 -451.5Q600 -463 600 -480Q600 -497 588.5 -508.5Q577 -520 560 -520Q543 -520 531.5 -508.5Q520 -497 520 -480Q520 -463 531.5 -451.5Q543 -440 560 -440ZM536 -310L686 -160Q686 -160 686 -160Q686 -160 686 -160L800 -274Q800 -274 800 -274Q800 -274 800 -274L650 -424ZM339 -621L339 -621L339 -621L339 -621L339 -621L339 -621L339 -621Q339 -621 339 -621Q339 -621 339 -621L339 -621Q339 -621 339 -621Q339 -621 339 -621L339 -621L339 -621L339 -621L339 -621ZM621 -339L621 -339L621 -339L621 -339L621 -339L621 -339Q621 -339 621 -339Q621 -339 621 -339L621 -339Q621 -339 621 -339Q621 -339 621 -339L621 -339L621 -339L621 -339L621 -339L621 -339Z',
+  info: 'M440 -280L520 -280L520 -520L440 -520ZM480 -600Q497 -600 508.5 -611.5Q520 -623 520 -640Q520 -657 508.5 -668.5Q497 -680 480 -680Q463 -680 451.5 -668.5Q440 -657 440 -640Q440 -623 451.5 -611.5Q463 -600 480 -600ZM480 -80Q397 -80 324 -111.5Q251 -143 197 -197Q143 -251 111.5 -324Q80 -397 80 -480Q80 -563 111.5 -636Q143 -709 197 -763Q251 -817 324 -848.5Q397 -880 480 -880Q563 -880 636 -848.5Q709 -817 763 -763Q817 -709 848.5 -636Q880 -563 880 -480Q880 -397 848.5 -324Q817 -251 763 -197Q709 -143 636 -111.5Q563 -80 480 -80ZM480 -160Q614 -160 707 -253Q800 -346 800 -480Q800 -614 707 -707Q614 -800 480 -800Q346 -800 253 -707Q160 -614 160 -480Q160 -346 253 -253Q346 -160 480 -160ZM480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Z',
   input:
     'M160 -160Q127 -160 103.5 -183.5Q80 -207 80 -240L80 -360L160 -360L160 -240Q160 -240 160 -240Q160 -240 160 -240L800 -240Q800 -240 800 -240Q800 -240 800 -240L800 -720Q800 -720 800 -720Q800 -720 800 -720L160 -720Q160 -720 160 -720Q160 -720 160 -720L160 -600L80 -600L80 -720Q80 -753 103.5 -776.5Q127 -800 160 -800L800 -800Q833 -800 856.5 -776.5Q880 -753 880 -720L880 -240Q880 -207 856.5 -183.5Q833 -160 800 -160ZM460 -300L404 -358L487 -440L80 -440L80 -520L487 -520L404 -602L460 -660L640 -480Z',
   insights:
     'M120 -160Q87 -160 63.5 -183.5Q40 -207 40 -240Q40 -273 63.5 -296.5Q87 -320 120 -320Q126 -320 130.5 -320Q135 -320 140 -318L322 -500Q320 -505 320 -509.5Q320 -514 320 -520Q320 -553 343.5 -576.5Q367 -600 400 -600Q433 -600 456.5 -576.5Q480 -553 480 -520Q480 -518 478 -500L580 -398Q585 -400 589.5 -400Q594 -400 600 -400Q606 -400 610.5 -400Q615 -400 620 -398L762 -540Q760 -545 760 -549.5Q760 -554 760 -560Q760 -593 783.5 -616.5Q807 -640 840 -640Q873 -640 896.5 -616.5Q920 -593 920 -560Q920 -527 896.5 -503.5Q873 -480 840 -480Q834 -480 829.5 -480Q825 -480 820 -482L678 -340Q680 -335 680 -330.5Q680 -326 680 -320Q680 -287 656.5 -263.5Q633 -240 600 -240Q567 -240 543.5 -263.5Q520 -287 520 -320Q520 -326 520 -330.5Q520 -335 522 -340L420 -442Q415 -440 410.5 -440Q406 -440 400 -440Q398 -440 380 -442L198 -260Q200 -255 200 -250.5Q200 -246 200 -240Q200 -207 176.5 -183.5Q153 -160 120 -160ZM160 -561L135 -615L81 -640L135 -665L160 -719L185 -665L239 -640L185 -615ZM600 -600L562 -682L480 -720L562 -758L600 -840L638 -758L720 -720L638 -682Z',
+  inventory_2:
+    'M200 -80Q167 -80 143.5 -103.5Q120 -127 120 -160L120 -611Q102 -622 91 -639.5Q80 -657 80 -680L80 -800Q80 -833 103.5 -856.5Q127 -880 160 -880L800 -880Q833 -880 856.5 -856.5Q880 -833 880 -800L880 -680Q880 -657 869 -639.5Q858 -622 840 -611L840 -160Q840 -127 816.5 -103.5Q793 -80 760 -80ZM200 -600L200 -160Q200 -160 200 -160Q200 -160 200 -160L760 -160Q760 -160 760 -160Q760 -160 760 -160L760 -600ZM160 -680L800 -680Q800 -680 800 -680Q800 -680 800 -680L800 -800Q800 -800 800 -800Q800 -800 800 -800L160 -800Q160 -800 160 -800Q160 -800 160 -800L160 -680Q160 -680 160 -680Q160 -680 160 -680ZM360 -400L600 -400L600 -480L360 -480ZM480 -380L480 -380L480 -380Q480 -380 480 -380Q480 -380 480 -380L480 -380Q480 -380 480 -380Q480 -380 480 -380Z',
   lightbulb:
     'M480 -80Q447 -80 423.5 -103.5Q400 -127 400 -160L560 -160Q560 -127 536.5 -103.5Q513 -80 480 -80ZM320 -200L320 -280L640 -280L640 -200ZM330 -320Q261 -361 220.5 -430Q180 -499 180 -580Q180 -705 267.5 -792.5Q355 -880 480 -880Q605 -880 692.5 -792.5Q780 -705 780 -580Q780 -499 739.5 -430Q699 -361 630 -320ZM354 -400L606 -400Q651 -432 675.5 -479Q700 -526 700 -580Q700 -672 636 -736Q572 -800 480 -800Q388 -800 324 -736Q260 -672 260 -580Q260 -526 284.5 -479Q309 -432 354 -400ZM480 -400Q480 -400 480 -400Q480 -400 480 -400Q480 -400 480 -400Q480 -400 480 -400Q480 -400 480 -400Q480 -400 480 -400Q480 -400 480 -400Q480 -400 480 -400Z',
   medication:
     'M420 -260L540 -260L540 -360L640 -360L640 -480L540 -480L540 -580L420 -580L420 -480L320 -480L320 -360L420 -360ZM280 -120Q247 -120 223.5 -143.5Q200 -167 200 -200L200 -640Q200 -673 223.5 -696.5Q247 -720 280 -720L680 -720Q713 -720 736.5 -696.5Q760 -673 760 -640L760 -200Q760 -167 736.5 -143.5Q713 -120 680 -120ZM280 -200L680 -200Q680 -200 680 -200Q680 -200 680 -200L680 -640Q680 -640 680 -640Q680 -640 680 -640L280 -640Q280 -640 280 -640Q280 -640 280 -640L280 -200Q280 -200 280 -200Q280 -200 280 -200ZM240 -760L240 -840L720 -840L720 -760ZM280 -640L280 -640Q280 -640 280 -640Q280 -640 280 -640L280 -200Q280 -200 280 -200Q280 -200 280 -200L280 -200Q280 -200 280 -200Q280 -200 280 -200L280 -640Q280 -640 280 -640Q280 -640 280 -640Z',
+  more_vert:
+    'M480 -160Q447 -160 423.5 -183.5Q400 -207 400 -240Q400 -273 423.5 -296.5Q447 -320 480 -320Q513 -320 536.5 -296.5Q560 -273 560 -240Q560 -207 536.5 -183.5Q513 -160 480 -160ZM480 -400Q447 -400 423.5 -423.5Q400 -447 400 -480Q400 -513 423.5 -536.5Q447 -560 480 -560Q513 -560 536.5 -536.5Q560 -513 560 -480Q560 -447 536.5 -423.5Q513 -400 480 -400ZM480 -640Q447 -640 423.5 -663.5Q400 -687 400 -720Q400 -753 423.5 -776.5Q447 -800 480 -800Q513 -800 536.5 -776.5Q560 -753 560 -720Q560 -687 536.5 -663.5Q513 -640 480 -640Z',
   no_accounts:
     'M608 -522L422 -708Q436 -714 450.5 -717Q465 -720 480 -720Q539 -720 579.5 -679.5Q620 -639 620 -580Q620 -565 617 -550.5Q614 -536 608 -522ZM234 -276Q285 -315 348 -337.5Q411 -360 480 -360Q498 -360 514.5 -358.5Q531 -357 549 -354L461 -442Q414 -448 380.5 -481.5Q347 -515 341 -562L227 -676Q195 -635 177.5 -585.5Q160 -536 160 -480Q160 -421 179.5 -369Q199 -317 234 -276ZM732 -284Q764 -325 782 -374.5Q800 -424 800 -480Q800 -613 706.5 -706.5Q613 -800 480 -800Q424 -800 374.5 -782Q325 -764 284 -732ZM480 -80Q398 -80 325 -111.5Q252 -143 197.5 -197.5Q143 -252 111.5 -325Q80 -398 80 -480Q80 -563 111.5 -635.5Q143 -708 197.5 -762.5Q252 -817 325 -848.5Q398 -880 480 -880Q563 -880 635.5 -848.5Q708 -817 762.5 -762.5Q817 -708 848.5 -635.5Q880 -563 880 -480Q880 -398 848.5 -325Q817 -252 762.5 -197.5Q708 -143 635.5 -111.5Q563 -80 480 -80ZM480 -160Q533 -160 580 -175.5Q627 -191 666 -220Q627 -249 580 -264.5Q533 -280 480 -280Q427 -280 380 -264.5Q333 -249 294 -220Q333 -191 380 -175.5Q427 -160 480 -160ZM480 -220Q480 -220 480 -220Q480 -220 480 -220Q480 -220 480 -220Q480 -220 480 -220Q480 -220 480 -220Q480 -220 480 -220Q480 -220 480 -220Q480 -220 480 -220Z',
+  output:
+    'M200 -120Q167 -120 143.5 -143.5Q120 -167 120 -200L120 -760Q120 -793 143.5 -816.5Q167 -840 200 -840L760 -840Q793 -840 816.5 -816.5Q840 -793 840 -760L840 -680L760 -680L760 -760Q760 -760 760 -760Q760 -760 760 -760L200 -760Q200 -760 200 -760Q200 -760 200 -760L200 -200Q200 -200 200 -200Q200 -200 200 -200L760 -200Q760 -200 760 -200Q760 -200 760 -200L760 -280L840 -280L840 -200Q840 -167 816.5 -143.5Q793 -120 760 -120ZM680 -280L624 -336L727 -440L360 -440L360 -520L727 -520L624 -624L680 -680L880 -480Z',
   person:
     'M480 -480Q414 -480 367 -527Q320 -574 320 -640Q320 -706 367 -753Q414 -800 480 -800Q546 -800 593 -753Q640 -706 640 -640Q640 -574 593 -527Q546 -480 480 -480ZM160 -160L160 -272Q160 -306 177.5 -334.5Q195 -363 224 -378Q286 -409 350 -424.5Q414 -440 480 -440Q546 -440 610 -424.5Q674 -409 736 -378Q765 -363 782.5 -334.5Q800 -306 800 -272L800 -160ZM240 -240L720 -240L720 -272Q720 -283 714.5 -292Q709 -301 700 -306Q646 -333 591 -346.5Q536 -360 480 -360Q424 -360 369 -346.5Q314 -333 260 -306Q251 -301 245.5 -292Q240 -283 240 -272ZM480 -560Q513 -560 536.5 -583.5Q560 -607 560 -640Q560 -673 536.5 -696.5Q513 -720 480 -720Q447 -720 423.5 -696.5Q400 -673 400 -640Q400 -607 423.5 -583.5Q447 -560 480 -560ZM480 -640Q480 -640 480 -640Q480 -640 480 -640Q480 -640 480 -640Q480 -640 480 -640Q480 -640 480 -640Q480 -640 480 -640Q480 -640 480 -640Q480 -640 480 -640ZM480 -240L480 -240Q480 -240 480 -240Q480 -240 480 -240Q480 -240 480 -240Q480 -240 480 -240Q480 -240 480 -240Q480 -240 480 -240Q480 -240 480 -240Q480 -240 480 -240L480 -240Z',
   psychology:
     'M240 -80L240 -252Q183 -304 151.5 -373.5Q120 -443 120 -520Q120 -670 225 -775Q330 -880 480 -880Q605 -880 701.5 -806.5Q798 -733 827 -615L879 -410Q884 -391 872 -375.5Q860 -360 840 -360L760 -360L760 -240Q760 -207 736.5 -183.5Q713 -160 680 -160L600 -160L600 -80L520 -80L520 -240L680 -240Q680 -240 680 -240Q680 -240 680 -240L680 -440L788 -440L750 -595Q727 -686 652 -743Q577 -800 480 -800Q364 -800 282 -719Q200 -638 200 -522Q200 -462 224.5 -408Q249 -354 294 -312L320 -288L320 -80ZM494 -440L494 -440L494 -440Q494 -440 494 -440Q494 -440 494 -440Q494 -440 494 -440Q494 -440 494 -440Q494 -440 494 -440Q494 -440 494 -440L494 -440L494 -440L494 -440Q494 -440 494 -440Q494 -440 494 -440L494 -440L494 -440ZM440 -360L520 -360L526 -410Q534 -413 540.5 -417Q547 -421 552 -426L598 -406L638 -474L598 -504Q600 -512 600 -520Q600 -528 598 -536L638 -566L598 -634L552 -614Q547 -619 540.5 -623Q534 -627 526 -630L520 -680L440 -680L434 -630Q426 -627 419.5 -623Q413 -619 408 -614L362 -634L322 -566L362 -536Q360 -528 360 -520Q360 -512 362 -504L322 -474L362 -406L408 -426Q413 -421 419.5 -417Q426 -413 434 -410ZM480 -460Q455 -460 437.5 -477.5Q420 -495 420 -520Q420 -545 437.5 -562.5Q455 -580 480 -580Q505 -580 522.5 -562.5Q540 -545 540 -520Q540 -495 522.5 -477.5Q505 -460 480 -460Z',
   remove: 'M200 -440L200 -520L760 -520L760 -440Z',
+  restore:
+    'M480 -120Q342 -120 239.5 -211.5Q137 -303 122 -440L204 -440Q218 -336 296.5 -268Q375 -200 480 -200Q597 -200 678.5 -281.5Q760 -363 760 -480Q760 -597 678.5 -678.5Q597 -760 480 -760Q411 -760 351 -728Q291 -696 250 -640L360 -640L360 -560L120 -560L120 -800L200 -800L200 -706Q251 -770 324.5 -805Q398 -840 480 -840Q555 -840 620.5 -811.5Q686 -783 734.5 -734.5Q783 -686 811.5 -620.5Q840 -555 840 -480Q840 -405 811.5 -339.5Q783 -274 734.5 -225.5Q686 -177 620.5 -148.5Q555 -120 480 -120ZM592 -312L440 -464L440 -680L520 -680L520 -496L648 -368Z',
   science:
     'M200 -120Q149 -120 127.5 -165.5Q106 -211 138 -250L360 -520L360 -760L320 -760Q303 -760 291.5 -771.5Q280 -783 280 -800Q280 -817 291.5 -828.5Q303 -840 320 -840L640 -840Q657 -840 668.5 -828.5Q680 -817 680 -800Q680 -783 668.5 -771.5Q657 -760 640 -760L600 -760L600 -520L822 -250Q854 -211 832.5 -165.5Q811 -120 760 -120ZM200 -200L760 -200L520 -492L520 -760L440 -760L440 -492ZM480 -480L480 -480L480 -480L480 -480L480 -480L480 -480Z',
   ssid_chart:
diff --git a/app/src/indicators/IndicatorCard.tsx b/app/src/indicators/IndicatorCard.tsx
new file mode 100644
index 0000000..fa0caed
--- /dev/null
+++ b/app/src/indicators/IndicatorCard.tsx
@@ -0,0 +1,164 @@
+import { GroupBadge, Icon, IndicatorLabel, type IconName } from '../design';
+import type { StoredIndicator as Indicator } from '../data/indicators';
+import {
+  aggregationSummary,
+  directionSummary,
+  frequencyLabel,
+  idealRangeSummary,
+  valueTypeLabel,
+} from './summary';
+
+const TYPE_ICON: Record<Indicator['valueType'], IconName> = {
+  boolean: 'check_circle',
+  scale: 'ssid_chart',
+  numeric: 'vital_signs',
+  ordinal: 'analytics',
+};
+
+/** Small metadata pill of the card (type, frequency, aggregation, direction). */
+function MetaChip({
+  icon,
+  children,
+  tone = 'neutral',
+}: {
+  icon?: IconName;
+  children: string;
+  tone?: 'neutral' | 'factor' | 'result';
+}) {
+  const tones = {
+    neutral: 'bg-surface-container-low text-on-surface-variant',
+    factor: 'bg-secondary-fixed text-on-secondary-fixed',
+    result: 'bg-primary-fixed text-on-primary-fixed',
+  } as const;
+  return (
+    <span
+      className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-label-md text-label-md ${tones[tone]}`}
+    >
+      {icon && <Icon name={icon} className="text-[14px]" />}
+      {children}
+    </span>
+  );
+}
+
+interface IndicatorCardProps {
+  indicator: Indicator;
+  /** True when the card is the first one of its group (nothing to move up). */
+  first: boolean;
+  /** True when the card is the last one of its group (nothing to move down). */
+  last: boolean;
+  onMoveUp: () => void;
+  onMoveDown: () => void;
+  onOpenOptions: () => void;
+}
+
+/**
+ * Active indicator card (design/meus_indicadores): acronym, name, type, frequency and
+ * aggregation, plus the reorder and options controls.
+ */
+export function IndicatorCard({
+  indicator,
+  first,
+  last,
+  onMoveUp,
+  onMoveDown,
+  onOpenOptions,
+}: IndicatorCardProps) {
+  const aggregation = aggregationSummary(indicator);
+  const direction = directionSummary(indicator);
+  const idealRange = idealRangeSummary(indicator);
+
+  return (
+    <article
+      data-testid="indicator-card"
+      className="flex flex-col gap-space-sm rounded-lg bg-surface-container-lowest p-3 shadow-level-1"
+    >
+      <div className="flex items-center gap-2">
+        <div className="flex min-w-0 flex-1 items-center gap-2">
+          <h3 className="min-w-0 truncate font-label-lg text-label-lg text-on-surface">
+            <IndicatorLabel indicator={indicator} />
+          </h3>
+        </div>
+        <div className="flex shrink-0 items-center">
+          <button
+            type="button"
+            aria-label="Subir indicador"
+            disabled={first}
+            onClick={onMoveUp}
+            className="flex size-11 items-center justify-center rounded-full text-outline transition-colors hover:bg-surface-container hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-30"
+          >
+            <Icon name="arrow_upward" className="text-[18px]" />
+          </button>
+          <button
+            type="button"
+            aria-label="Descer indicador"
+            disabled={last}
+            onClick={onMoveDown}
+            className="flex size-11 items-center justify-center rounded-full text-outline transition-colors hover:bg-surface-container hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-30"
+          >
+            <Icon name="arrow_downward" className="text-[18px]" />
+          </button>
+          <button
+            type="button"
+            aria-label="Opções do indicador"
+            onClick={onOpenOptions}
+            className="flex size-11 items-center justify-center rounded-full text-outline transition-colors hover:bg-surface-container hover:text-on-surface"
+          >
+            <Icon name="more_vert" className="text-[18px]" />
+          </button>
+        </div>
+      </div>
+
+      <div className="flex flex-wrap items-center gap-1">
+        <MetaChip icon={TYPE_ICON[indicator.valueType]}>{valueTypeLabel(indicator)}</MetaChip>
+        <MetaChip>{frequencyLabel(indicator)}</MetaChip>
+        {aggregation && (
+          <MetaChip tone={indicator.group === 'factor' ? 'factor' : 'result'}>{aggregation}</MetaChip>
+        )}
+        {direction && <MetaChip tone="result">{direction}</MetaChip>}
+        {idealRange && <MetaChip tone="result">{idealRange}</MetaChip>}
+      </div>
+    </article>
+  );
+}
+
+interface ArchivedIndicatorCardProps {
+  indicator: Indicator;
+  onRestore: () => void;
+}
+
+/**
+ * Archived indicator card: it keeps its history, leaves the daily entry and can be restored.
+ */
+export function ArchivedIndicatorCard({ indicator, onRestore }: ArchivedIndicatorCardProps) {
+  return (
+    <article
+      data-testid="indicator-card"
+      className="flex flex-col gap-space-sm rounded-lg bg-surface-container-lowest p-3 shadow-level-1"
+    >
+      <div className="flex items-center gap-2">
+        <h3 className="min-w-0 flex-1 truncate font-label-lg text-label-lg text-on-surface-variant">
+          <IndicatorLabel indicator={indicator} />
+        </h3>
+        <span className="shrink-0 rounded-full bg-surface-container-high px-2.5 py-1 font-label-code text-label-code tracking-wider text-on-surface-variant uppercase">
+          Arquivado
+        </span>
+      </div>
+      <div>
+        <GroupBadge group={indicator.group} />
+      </div>
+      <div className="flex items-center justify-between gap-2">
+        <span className="min-w-0 truncate font-body-sm text-body-sm text-on-surface-variant">
+          {valueTypeLabel(indicator)} • Desativado
+        </span>
+        <button
+          type="button"
+          onClick={onRestore}
+          className="flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-primary-fixed px-3 font-label-md text-label-md text-primary transition-transform active:scale-95"
+        >
+          <Icon name="restore" className="text-[16px]" />
+          Restaurar
+        </button>
+      </div>
+    </article>
+  );
+}
diff --git a/app/src/indicators/__tests__/IndicatorCard.test.tsx b/app/src/indicators/__tests__/IndicatorCard.test.tsx
new file mode 100644
index 0000000..b54a7e9
--- /dev/null
+++ b/app/src/indicators/__tests__/IndicatorCard.test.tsx
@@ -0,0 +1,63 @@
+import { render, screen, within } from '@testing-library/react';
+import userEvent from '@testing-library/user-event';
+import { describe, expect, it, vi } from 'vitest';
+import type { StoredIndicator } from '../../data/indicators';
+import { EyeToggle } from '../../design';
+import { PrivacyProvider } from '../../privacy/PrivacyContext';
+import { ArchivedIndicatorCard, IndicatorCard } from '../IndicatorCard';
+
+const indicator: StoredIndicator = {
+  id: 'one',
+  group: 'factor',
+  name: 'Sono privado',
+  abbreviation: null,
+  emoji: '💤',
+  valueType: 'boolean',
+  numeric: null,
+  scale: null,
+  options: null,
+  desiredDirection: null,
+  idealRange: null,
+  frequency: 'single_per_day',
+  dailyAggregation: null,
+  sortOrder: 1000,
+  archivedAt: null,
+  lockedAt: null,
+  createdAt: null,
+  updatedAt: null,
+};
+
+describe('indicator cards', () => {
+  it('uses the global eye for labels and keeps names out of action attributes', async () => {
+    render(
+      <PrivacyProvider>
+        <EyeToggle />
+        <IndicatorCard
+          indicator={indicator}
+          first={false}
+          last={false}
+          onMoveUp={vi.fn()}
+          onMoveDown={vi.fn()}
+          onOpenOptions={vi.fn()}
+        />
+        <ArchivedIndicatorCard indicator={indicator} onRestore={vi.fn()} />
+      </PrivacyProvider>,
+    );
+    const cards = screen.getAllByTestId('indicator-card');
+    for (const card of cards) {
+      expect(within(card).getByText('Son...')).toBeInTheDocument();
+      expect(card).not.toHaveTextContent('Sono privado');
+      expect(card).not.toHaveTextContent('💤');
+      for (const element of card.querySelectorAll('[aria-label], [title]')) {
+        expect(element.getAttribute('aria-label') ?? '').not.toContain('Son');
+        expect(element.getAttribute('title') ?? '').not.toContain('Son');
+      }
+    }
+    await userEvent.click(screen.getByTestId('eye-toggle'));
+    for (const card of cards) {
+      expect(within(card).getByText('Sono privado')).toBeInTheDocument();
+      expect(within(card).getByText('💤')).toBeInTheDocument();
+      expect(card.querySelectorAll('[data-indicator-label]')).toHaveLength(1);
+    }
+  });
+});
diff --git a/app/src/indicators/__tests__/summary.test.ts b/app/src/indicators/__tests__/summary.test.ts
new file mode 100644
index 0000000..38a3b4b
--- /dev/null
+++ b/app/src/indicators/__tests__/summary.test.ts
@@ -0,0 +1,78 @@
+import { describe, expect, it } from 'vitest';
+import type { IndicatorInput } from '../../domain/indicator';
+import {
+  aggregationSummary,
+  directionSummary,
+  frequencyLabel,
+  idealRangeSummary,
+  valueTypeLabel,
+} from '../summary';
+
+const base: IndicatorInput = {
+  group: 'factor',
+  name: 'Exercício',
+  abbreviation: 'EXE',
+  emoji: null,
+  valueType: 'boolean',
+  numeric: null,
+  scale: null,
+  options: null,
+  desiredDirection: null,
+  idealRange: null,
+  frequency: 'single_per_day',
+  dailyAggregation: null,
+};
+
+describe('indicator summary labels', () => {
+  it('describes the response type in pt-BR', () => {
+    expect(valueTypeLabel(base)).toBe('Booleano (Sim/Não)');
+    expect(valueTypeLabel({ ...base, valueType: 'scale', scale: { min: 0, max: 10, step: 1 } })).toBe(
+      'Escala 0–10',
+    );
+    expect(
+      valueTypeLabel({
+        ...base,
+        valueType: 'numeric',
+        numeric: { unit: 'mg', min: 0, max: null, step: 50 },
+      }),
+    ).toBe('Numérico (mg)');
+    expect(
+      valueTypeLabel({
+        ...base,
+        valueType: 'ordinal',
+        options: [
+          { id: 'a', label: 'Ruim' },
+          { id: 'b', label: 'Bom' },
+        ],
+      }),
+    ).toBe('Ordinal');
+  });
+
+  it('describes the daily frequency', () => {
+    expect(frequencyLabel(base)).toBe('1x ao dia');
+    expect(frequencyLabel({ ...base, frequency: 'multiple_per_day' })).toBe('Múltiplos registros');
+  });
+
+  it('shows the aggregation only when it applies', () => {
+    expect(aggregationSummary(base)).toBeNull();
+    expect(
+      aggregationSummary({
+        ...base,
+        valueType: 'numeric',
+        numeric: { unit: 'xícaras', min: 0, max: null, step: 0.5 },
+        frequency: 'multiple_per_day',
+        dailyAggregation: 'sum',
+      }),
+    ).toBe('Soma');
+  });
+
+  it('shows the direction and the ideal range of results', () => {
+    expect(directionSummary(base)).toBeNull();
+    expect(directionSummary({ ...base, group: 'result', desiredDirection: 'higher' })).toBe(
+      'Quanto maior, melhor',
+    );
+    expect(idealRangeSummary({ ...base, group: 'result', idealRange: { min: 7, max: 10 } })).toBe(
+      'Faixa ideal (7 a 10)',
+    );
+  });
+});
diff --git a/app/src/indicators/summary.ts b/app/src/indicators/summary.ts
new file mode 100644
index 0000000..5e8db28
--- /dev/null
+++ b/app/src/indicators/summary.ts
@@ -0,0 +1,42 @@
+/**
+ * Short pt-BR labels of the indicator configuration shown in the list screen
+ * (design/meus_indicadores). Pure helpers: no React, no Firebase, no DOM.
+ */
+import type { IndicatorInput } from '../domain/indicator';
+import { aggregationLabel } from './aggregation';
+import { DIRECTION_OPTIONS } from './catalog';
+
+/** "Booleano (Sim/Não)", "Escala 0–10", "Numérico (mg)", "Ordinal". */
+export function valueTypeLabel(indicator: IndicatorInput): string {
+  if (indicator.valueType === 'boolean') return 'Booleano (Sim/Não)';
+  if (indicator.valueType === 'scale') {
+    return indicator.scale ? `Escala ${indicator.scale.min}–${indicator.scale.max}` : 'Escala';
+  }
+  if (indicator.valueType === 'numeric') {
+    return indicator.numeric?.unit ? `Numérico (${indicator.numeric.unit})` : 'Numérico';
+  }
+  return 'Ordinal';
+}
+
+/** "1x ao dia" or "Múltiplos registros". */
+export function frequencyLabel(indicator: IndicatorInput): string {
+  return indicator.frequency === 'single_per_day' ? '1x ao dia' : 'Múltiplos registros';
+}
+
+/** Daily aggregation of the indicator, when it applies (single-per-day has none). */
+export function aggregationSummary(indicator: IndicatorInput): string | null {
+  return indicator.dailyAggregation ? aggregationLabel(indicator.dailyAggregation) : null;
+}
+
+/** Desired direction of a result, when it has one. */
+export function directionSummary(indicator: IndicatorInput): string | null {
+  if (!indicator.desiredDirection) return null;
+  const option = DIRECTION_OPTIONS.find((entry) => entry.value === indicator.desiredDirection);
+  return option ? option.label : null;
+}
+
+/** Ideal range of a result, when it has one. */
+export function idealRangeSummary(indicator: IndicatorInput): string | null {
+  if (!indicator.idealRange) return null;
+  return `Faixa ideal (${indicator.idealRange.min} a ${indicator.idealRange.max})`;
+}
diff --git a/app/src/pages/IndicatorsPage.tsx b/app/src/pages/IndicatorsPage.tsx
new file mode 100644
index 0000000..72e6098
--- /dev/null
+++ b/app/src/pages/IndicatorsPage.tsx
@@ -0,0 +1,349 @@
+import { useState } from 'react';
+import { Link, useNavigate } from 'react-router';
+import { useAuth } from '../auth/AuthProvider';
+import {
+  archiveIndicator,
+  reorderIndicators,
+  restoreIndicator,
+  useIndicators,
+  type StoredIndicator as Indicator,
+} from '../data/indicators';
+import { Button, EmptyState, Icon, Sheet } from '../design';
+import type { IndicatorGroup } from '../design';
+import { ArchivedIndicatorCard, IndicatorCard } from '../indicators/IndicatorCard';
+
+/** Filters of the list: everything, only factors, only results or only archived ones. */
+type ListFilter = 'all' | 'factor' | 'result' | 'archived';
+
+const FILTER_LABELS: { value: ListFilter; label: string }[] = [
+  { value: 'all', label: 'Todos' },
+  { value: 'factor', label: 'Fatores' },
+  { value: 'result', label: 'Resultados' },
+  { value: 'archived', label: 'Arquivados' },
+];
+
+const GROUP_SUBTITLES: Record<IndicatorGroup, string> = {
+  factor: 'O que fiz, consumi ou vivi',
+  result: 'Como fiquei ou o que percebi',
+};
+
+const GROUP_ICON: Record<IndicatorGroup, 'input' | 'output'> = {
+  factor: 'input',
+  result: 'output',
+};
+
+const linkClass =
+  'flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary-container px-5 font-label-lg text-label-lg text-on-primary shadow-md shadow-primary/20 transition-transform active:scale-[0.98]';
+
+function SectionHeader({ group, title, count }: { group: IndicatorGroup; title: string; count: number }) {
+  return (
+    <div className="flex items-center justify-between gap-2">
+      <div className="flex min-w-0 items-center gap-2">
+        <span
+          className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
+            group === 'factor' ? 'bg-secondary text-on-secondary' : 'bg-primary text-on-primary'
+          }`}
+        >
+          <Icon name={GROUP_ICON[group]} className="text-[16px]" />
+        </span>
+        <div className="flex min-w-0 flex-col">
+          <h2 className="font-headline-md text-headline-md tracking-tight text-on-surface">{title}</h2>
+          <span className="font-label-code text-label-code tracking-wider text-on-surface-variant uppercase">
+            {GROUP_SUBTITLES[group]}
+          </span>
+        </div>
+      </div>
+      <span className="shrink-0 rounded-full bg-surface-container-high px-2.5 py-1 font-label-code text-label-code text-on-surface-variant">
+        {count} {count === 1 ? 'Ativo' : 'Ativos'}
+      </span>
+    </div>
+  );
+}
+
+/**
+ * "Meus indicadores" (/indicators): factors and results in separate lists, with reorder,
+ * archive/restore and the entry to the indicator editor (spec 4.5 and 7.3).
+ */
+export function IndicatorsPage() {
+  const { user } = useAuth();
+  const uid = user?.uid ?? '';
+  const navigate = useNavigate();
+
+  const { indicators, loading, error: loadError } = useIndicators(uid);
+  const [filter, setFilter] = useState<ListFilter>('all');
+  const [archivedOpen, setArchivedOpen] = useState(true);
+  const [optionsFor, setOptionsFor] = useState<Indicator | null>(null);
+  const [infoOpen, setInfoOpen] = useState(false);
+  const [actionError, setActionError] = useState<string | null>(null);
+
+  const active = indicators.filter((indicator) => indicator.archivedAt == null);
+  const archived = indicators.filter((indicator) => indicator.archivedAt != null);
+  const factors = active.filter((indicator) => indicator.group === 'factor');
+  const results = active.filter((indicator) => indicator.group === 'result');
+
+  const counts: Record<ListFilter, number> = {
+    all: active.length,
+    factor: factors.length,
+    result: results.length,
+    archived: archived.length,
+  };
+
+  async function run(action: () => Promise<void>) {
+    setActionError(null);
+    try {
+      await action();
+    } catch {
+      setActionError('Não foi possível atualizar os indicadores. Tente novamente.');
+    }
+  }
+  /** Moves an indicator one position up or down inside its own group (spec 4.5). */
+  function move(indicator: Indicator, direction: -1 | 1) {
+    const siblings = active.filter((item) => item.grou
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
