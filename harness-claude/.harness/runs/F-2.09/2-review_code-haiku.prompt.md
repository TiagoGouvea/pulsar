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
  "id": "F-2.09",
  "title": "Histórico de registros e exclusão retroativa",
  "description": "A partir do indicador (Meus indicadores) abrir histórico com registros (data/hora no fuso do navegador, valor, observação ao tocar com data-privacy-allow) e excluir qualquer registro com confirmação. Sem edição de valores passados.",
  "acceptance": [
    "Lista mostra horários no fuso do navegador",
    "Excluir pede confirmação e remove o registro",
    "Não há controle para editar valor de dia passado"
  ],
  "specRefs": [
    "spec.md#5.2",
    "spec.md#5.3",
    "arquitetura.md#3.3"
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
diff --git a/app/e2e/entry-history.spec.ts b/app/e2e/entry-history.spec.ts
new file mode 100644
index 0000000..94faa31
--- /dev/null
+++ b/app/e2e/entry-history.spec.ts
@@ -0,0 +1,252 @@
+import type { APIRequestContext, Locator, Page } from '@playwright/test';
+import firebaseJson from '../firebase.json' with { type: 'json' };
+import { currentUid, expect, test } from './fixtures';
+import { hasHorizontalOverflow, SENTINELS } from './support';
+
+const DOCUMENTS = `http://127.0.0.1:${firebaseJson.emulators.firestore.port}/v1/projects/demo-pulsar/databases/(default)/documents`;
+const OWNER = { Authorization: 'Bearer owner' };
+const INDICATOR = 'history-energy';
+const OTHER_INDICATOR = 'history-sleep';
+const NOTE = 'ZQX_OBS_NOTA_5T1';
+const FIXED_NOW = '2026-11-08T18:00:00Z';
+
+type FirestoreFields = Record<string, unknown>;
+
+async function putDocument(request: APIRequestContext, path: string, fields: FirestoreFields) {
+  const response = await request.patch(`${DOCUMENTS}/${path}`, { headers: OWNER, data: { fields } });
+  expect(response.ok(), `write ${path}: ${response.status()}`).toBeTruthy();
+  const readback = await request.get(`${DOCUMENTS}/${path}`, { headers: OWNER });
+  expect(readback.ok(), `read ${path}: ${readback.status()}`).toBeTruthy();
+  expect((await readback.json()).fields).toMatchObject(fields);
+}
+
+async function prepareHistory(page: Page, request: APIRequestContext): Promise<string> {
+  const uid = await currentUid(page);
+  expect(uid).toBeTruthy();
+  if (!uid) throw new Error('Anonymous session did not start');
+  await page.clock.setFixedTime(new Date(FIXED_NOW));
+  const indicatorFields = (name: string, abbreviation: string, order: number): FirestoreFields => ({
+    group: { stringValue: 'result' },
+    name: { stringValue: name },
+    abbreviation: { stringValue: abbreviation },
+    emoji: { stringValue: '⚡' },
+    valueType: { stringValue: 'scale' },
+    numeric: { nullValue: null },
+    scale: {
+      mapValue: {
+        fields: { min: { integerValue: '0' }, max: { integerValue: '10' }, step: { integerValue: '1' } },
+      },
+    },
+    options: { nullValue: null },
+    desiredDirection: { stringValue: 'higher' },
+    idealRange: { nullValue: null },
+    frequency: { stringValue: 'multiple_per_day' },
+    dailyAggregation: { stringValue: 'mean' },
+    sortOrder: { integerValue: String(order) },
+    archivedAt: { nullValue: null },
+    lockedAt: { timestampValue: '2026-10-20T12:00:00Z' },
+    createdAt: { timestampValue: '2026-10-20T12:00:00Z' },
+    updatedAt: { timestampValue: '2026-10-20T12:00:00Z' },
+  });
+  await putDocument(
+    request,
+    `users/${uid}/indicators/${INDICATOR}`,
+    indicatorFields('ZQX_ENERGIA_7F3', 'ENE', 1000),
+  );
+  await putDocument(
+    request,
+    `users/${uid}/indicators/${OTHER_INDICATOR}`,
+    indicatorFields('ZQX_SONO_9K2', 'SON', 2000),
+  );
+
+  const entry = (
+    indicatorId: string,
+    localDate: string,
+    recordedAt: string,
+    value: number,
+    note: string | null,
+  ): FirestoreFields => ({
+    indicatorId: { stringValue: indicatorId },
+    localDate: { stringValue: localDate },
+    recordedAt: { timestampValue: recordedAt },
+    valueType: { stringValue: 'scale' },
+    value: { mapValue: { fields: { number: { integerValue: String(value) } } } },
+    note: note === null ? { nullValue: null } : { stringValue: note },
+  });
+  // The first entry was recorded on October 24 in another timezone; in São Paulo it is October 23.
+  await putDocument(
+    request,
+    `users/${uid}/entries/past-one`,
+    entry(INDICATOR, '2026-10-24', '2026-10-24T01:15:00Z', 2, NOTE),
+  );
+  await putDocument(
+    request,
+    `users/${uid}/entries/past-two`,
+    entry(INDICATOR, '2026-10-24', '2026-10-24T03:40:00Z', 8, null),
+  );
+  await putDocument(
+    request,
+    `users/${uid}/entries/today`,
+    entry(INDICATOR, '2026-11-08', '2026-11-08T13:45:00Z', 9, null),
+  );
+  await putDocument(
+    request,
+    `users/${uid}/entries/other`,
+    entry(OTHER_INDICATOR, '2026-10-24', '2026-10-24T05:20:00Z', 6, null),
+  );
+  return uid;
+}
+
+async function openHistory(page: Page): Promise<Locator> {
+  await page.goto('/indicators');
+  const eye = page.getByTestId('eye-toggle');
+  if ((await eye.getAttribute('aria-pressed')) !== 'false') await eye.click();
+  await expect(eye).toHaveAttribute('aria-pressed', 'false');
+  const card = page
+    .getByTestId('indicator-card')
+    .filter({ has: page.locator('[data-indicator-label]', { hasText: 'ENE' }) });
+  await expect(card).toBeVisible();
+  const direct = card
+    .getByRole('button', { name: /hist[oó]rico/i })
+    .or(card.getByRole('link', { name: /hist[oó]rico/i }));
+  if (await direct.count()) {
+    await direct.first().click();
+  } else {
+    await card.getByRole('button', { name: /op(ç|c)ões|mais ações/i }).click();
+    const options = page.getByRole('dialog');
+    await expect(options).toBeVisible();
+    await options
+      .getByRole('button', { name: /hist[oó]rico/i })
+      .or(options.getByRole('link', { name: /hist[oó]rico/i }))
+      .first()
+      .click();
+  }
+  const historyDialog = page.getByRole('dialog', { name: /hist[oó]rico/i });
+  if (await historyDialog.isVisible()) return historyDialog;
+  await expect(page.getByRole('heading', { name: /hist[oó]rico/i })).toBeVisible();
+  return page.locator('main');
+}
+
+function recordWithTime(history: Locator, time: string): Locator {
+  return history.getByText(time, { exact: false }).first().locator('xpath=ancestor::*[.//button or .//a][1]');
+}
+
+async function exposedOutsideAllowList(page: Page): Promise<string> {
+  return page.evaluate(() => {
+    const exposed: string[] = [];
+    for (const element of document.querySelectorAll('*')) {
+      if (element.closest('[data-privacy-allow]') || !element.getClientRects().length) continue;
+      const style = getComputedStyle(element);
+      if (style.visibility === 'hidden' || style.display === 'none') continue;
+      for (const node of element.childNodes)
+        if (node.nodeType === Node.TEXT_NODE) exposed.push(node.textContent ?? '');
+      for (const attribute of element.attributes) {
+        if (attribute.name === 'title' || attribute.name.startsWith('aria-')) exposed.push(attribute.value);
+      }
+    }
+    return exposed.join('\n');
+  });
+}
+
+async function expectNoPrivateLeak(page: Page) {
+  const exposed = await exposedOutsideAllowList(page);
+  for (const sentinel of SENTINELS) expect(exposed).not.toContain(sentinel);
+}
+
+async function storedEntryStatus(request: APIRequestContext, uid: string, entryId: string): Promise<number> {
+  return (await request.get(`${DOCUMENTS}/users/${uid}/entries/${entryId}`, { headers: OWNER })).status();
+}
+
+async function requestDeletion(history: Locator, time: string) {
+  const record = recordWithTime(history, time);
+  await expect(record).toBeVisible();
+  await record.getByRole('button', { name: /excluir|apagar|remover/i }).click();
+}
+
+test.describe('F-2.09 entry history', () => {
+  test('shows each value and browser-local date and time, with a private note revealed on demand', async ({
+    freshUserPage: page,
+    request,
+  }, testInfo) => {
+    if (testInfo.project.name !== 'mobile') return;
+    await prepareHistory(page, request);
+    const history = await openHistory(page);
+    await expect(history.getByText('22:15', { exact: false })).toBeVisible();
+    await expect(history.getByText('00:40', { exact: false })).toBeVisible();
+    await expect(history.getByText('10:45', { exact: false })).toBeVisible();
+    await expect(history).toContainText(/23\s*(?:\/|-|\.|de\s+)\s*(?:10|out(?:ubro)?)/i);
+    await expect(history).toContainText(/24\s*(?:\/|-|\.|de\s+)\s*(?:10|out(?:ubro)?)/i);
+    await expect(recordWithTime(history, '22:15')).toContainText(/\b2\b/);
+    await expect(recordWithTime(history, '00:40')).toContainText(/\b8\b/);
+    await expect(recordWithTime(history, '10:45')).toContainText(/\b9\b/);
+    await expect(history.getByText('02:20', { exact: false })).toHaveCount(0);
+    await expectNoPrivateLeak(page);
+    await expect(page.getByText(NOTE)).not.toBeVisible();
+
+    const past = recordWithTime(history, '22:15');
+    const noteButton = past.getByRole('button', { name: /observa(ç|c)ão|nota/i });
+    if (await noteButton.count()) await noteButton.first().click();
+    else await history.getByText('22:15', { exact: false }).first().click();
+    await expect(page.locator('[data-privacy-allow]').getByText(NOTE)).toBeVisible();
+    await expectNoPrivateLeak(page);
+  });
+
+  test('confirms deletion of past and current entries, keeps other entries, and persists after reload', async ({
+    freshUserPage: page,
+    request,
+  }, testInfo) => {
+    if (testInfo.project.name !== 'mobile') return;
+    const uid = await prepareHistory(page, request);
+    let history = await openHistory(page);
+    await requestDeletion(history, '22:15');
+    let confirmation = page.getByRole('dialog', { name: /excluir|apagar|remover/i });
+    await expect(confirmation).toBeVisible();
+    await confirmation.getByRole('button', { name: /cancelar/i }).click();
+    await expect(history.getByText('22:15', { exact: false })).toBeVisible();
+    expect(await storedEntryStatus(request, uid, 'past-one')).toBe(200);
+
+    await requestDeletion(history, '22:15');
+    confirmation = page.getByRole('dialog', { name: /excluir|apagar|remover/i });
+    await expect(confirmation).toBeVisible();
+    await confirmation.getByRole('button', { name: /excluir|apagar|remover/i }).click();
+    await expect(history.getByText('22:15', { exact: false })).toHaveCount(0);
+    await expect.poll(() => storedEntryStatus(request, uid, 'past-one')).toBe(404);
+    expect(await storedEntryStatus(request, uid, 'past-two')).toBe(200);
+    expect(await storedEntryStatus(request, uid, 'other')).toBe(200);
+    await expect(history.getByText('00:40', { exact: false })).toBeVisible();
+
+    await requestDeletion(history, '10:45');
+    confirmation = page.getByRole('dialog', { name: /excluir|apagar|remover/i });
+    await expect(confirmation).toBeVisible();
+    await confirmation.getByRole('button', { name: /excluir|apagar|remover/i }).click();
+    await expect.poll(() => storedEntryStatus(request, uid, 'today')).toBe(404);
+    await page.reload();
+    history = await openHistory(page);
+    await expect(history.getByText('22:15', { exact: false })).toHaveCount(0);
+    await expect(history.getByText('10:45', { exact: false })).toHaveCount(0);
+    await expect(history.getByText('00:40', { exact: false })).toBeVisible();
+  });
+
+  test('offers no control to edit a past value', async ({ freshUserPage: page, request }, testInfo) => {
+    if (testInfo.project.name !== 'mobile') return;
+    await prepareHistory(page, request);
+    const history = await openHistory(page);
+    await expect(history.getByText('22:15', { exact: false })).toBeVisible();
+    await expect(history.getByRole('button', { name: /editar|alterar|modificar/i })).toHaveCount(0);
+    await expect(history.getByRole('link', { name: /editar|alterar|modificar/i })).toHaveCount(0);
+    await expect(
+      history.locator('input:not([type="hidden"]), textarea, select, [contenteditable="true"]'),
+    ).toHaveCount(0);
+  });
+
+  test('history opens without breaking on desktop', async ({ freshUserPage: page, request }, testInfo) => {
+    if (testInfo.project.name !== 'desktop') return;
+    await prepareHistory(page, request);
+    const errors: string[] = [];
+    page.on('pageerror', (error) => errors.push(error.message));
+    const history = await openHistory(page);
+    await expect(history).toBeVisible();
+    expect(await hasHorizontalOverflow(page)).toBe(false);
+    expect(errors).toEqual([]);
+  });
+});
diff --git a/app/scripts/icons.ts b/app/scripts/icons.ts
index 11b03d4..48b5343 100644
--- a/app/scripts/icons.ts
+++ b/app/scripts/icons.ts
@@ -18,11 +18,13 @@ const names = [
   'close',
   'cloud_sync',
   'coffee',
+  'delete',
   'drag_indicator',
   'expand_more',
   'edit_note',
   'fitness_center',
   'healing',
+  'history',
   'info',
   'input',
   'insights',
@@ -31,6 +33,7 @@ const names = [
   'medication',
   'more_vert',
   'no_accounts',
+  'notes',
   'output',
   'person',
   'psychology',
diff --git a/app/src/data/entryHistory.ts b/app/src/data/entryHistory.ts
new file mode 100644
index 0000000..079777a
--- /dev/null
+++ b/app/src/data/entryHistory.ts
@@ -0,0 +1,66 @@
+/**
+ * Read side of the entry history (spec 5.2 and 5.3).
+ *
+ * The list of records of an indicator is read through the Firestore REST API: the SDK's
+ * `getDocs` sits on top of the watch stream, which stays open and keeps every route
+ * network-active (the browser gates wait for network silence). The REST list is a unary
+ * request, so the history screen stays quiet.
+ *
+ * Records are immutable (the Security Rules deny `update`): the only write allowed here is
+ * the deletion, done by `deleteEntry` in `./entries`.
+ */
+import type { EntryValue } from '../domain/entry';
+import type { ValueType } from '../domain/indicator';
+import { listDocuments } from './firestoreRest';
+
+export interface HistoryEntry {
+  id: string;
+  indicatorId: string;
+  /** Day key (YYYY-MM-DD) computed by the browser when the record was saved. */
+  localDate: string;
+  /** Instant of the record, in UTC (as persisted). */
+  recordedAt: string;
+  valueType: ValueType;
+  value: EntryValue | null;
+  /** Optional observation (free text complementing the structured value). */
+  note: string | null;
+}
+
+const VALUE_TYPES: ValueType[] = ['boolean', 'scale', 'ordinal', 'numeric'];
+
+function parseValueType(raw: unknown): ValueType {
+  return VALUE_TYPES.includes(raw as ValueType) ? (raw as ValueType) : 'numeric';
+}
+
+function parseValue(raw: unknown): EntryValue | null {
+  if (raw === null || typeof raw !== 'object') return null;
+  const record = raw as Record<string, unknown>;
+  if (typeof record.boolean === 'boolean') return { boolean: record.boolean };
+  if (typeof record.number === 'number') return { number: record.number };
+  if (typeof record.optionId === 'string') return { optionId: record.optionId };
+  return null;
+}
+
+function parseEntry(id: string, fields: Record<string, unknown>): HistoryEntry {
+  return {
+    id,
+    indicatorId: typeof fields.indicatorId === 'string' ? fields.indicatorId : '',
+    localDate: typeof fields.localDate === 'string' ? fields.localDate : '',
+    recordedAt: typeof fields.recordedAt === 'string' ? fields.recordedAt : '',
+    valueType: parseValueType(fields.valueType),
+    value: parseValue(fields.value),
+    note: typeof fields.note === 'string' && fields.note.length > 0 ? fields.note : null,
+  };
+}
+
+/**
+ * Every record of an indicator, most recent first. The instant is persisted in UTC; the screen
+ * shows it in the browser timezone.
+ */
+export async function listIndicatorEntries(uid: string, indicatorId: string): Promise<HistoryEntry[]> {
+  const documents = await listDocuments(['users', uid, 'entries']);
+  return documents
+    .filter((document) => document.fields.indicatorId === indicatorId)
+    .map((document) => parseEntry(document.id, document.fields))
+    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt) || b.id.localeCompare(a.id));
+}
diff --git a/app/src/design/icons.ts b/app/src/design/icons.ts
index 4766114..ba674ff 100644
--- a/app/src/design/icons.ts
+++ b/app/src/design/icons.ts
@@ -20,6 +20,8 @@ export const iconPaths = {
     'M160 -160L160 -240L269 -240Q218 -284 189 -346Q160 -408 160 -480Q160 -592 228 -677.5Q296 -763 400 -790L400 -706Q330 -681 285 -619.5Q240 -558 240 -480Q240 -426 261.5 -380.5Q283 -335 320 -302L320 -400L400 -400L400 -160ZM600 -160Q550 -160 515 -195Q480 -230 480 -280Q480 -328 513 -362.5Q546 -397 594 -399Q611 -435 644.5 -457.5Q678 -480 720 -480Q773 -480 811.5 -445.5Q850 -411 858 -360L858 -360Q900 -360 930 -331Q960 -302 960 -261Q960 -219 931 -189.5Q902 -160 860 -160ZM716 -520Q709 -561 689 -596Q669 -631 640 -658L640 -560L560 -560L560 -800L800 -800L800 -720L691 -720Q734 -682 761.5 -631Q789 -580 797 -520ZM600 -240L860 -240Q868 -240 874 -246Q880 -252 880 -260Q880 -268 874 -274Q868 -280 860 -280L790 -280L790 -330Q790 -359 769.5 -379.5Q749 -400 720 -400Q691 -400 670.5 -379.5Q650 -359 650 -330L650 -320L600 -320Q583 -320 571.5 -308.5Q560 -297 560 -280Q560 -263 571.5 -251.5Q583 -240 600 -240ZM720 -320Q720 -320 720 -320Q720 -320 720 -320Q720 -320 720 -320Q720 -320 720 -320L720 -320L720 -320Q720 -320 720 -320Q720 -320 720 -320Q720 -320 720 -320Q720 -320 720 -320L720 -320L720 -320Q720 -320 720 -320Q720 -320 720 -320Q720 -320 720 -320Q720 -320 720 -320Z',
   coffee:
     'M440 -240Q323 -240 241.5 -321.5Q160 -403 160 -520L160 -760Q160 -793 183.5 -816.5Q207 -840 240 -840L740 -840Q798 -840 839 -799Q880 -758 880 -700Q880 -642 839 -601Q798 -560 740 -560L720 -560L720 -520Q720 -403 638.5 -321.5Q557 -240 440 -240ZM240 -640L640 -640L640 -760L240 -760ZM440 -320Q523 -320 581.5 -378.5Q640 -437 640 -520L640 -560L240 -560L240 -520Q240 -437 298.5 -378.5Q357 -320 440 -320ZM720 -640L740 -640Q765 -640 782.5 -657.5Q800 -675 800 -700Q800 -725 782.5 -742.5Q765 -760 740 -760L720 -760ZM160 -120L160 -200L800 -200L800 -120ZM440 -560Q440 -560 440 -560Q440 -560 440 -560L440 -560L440 -560L440 -560Q440 -560 440 -560Q440 -560 440 -560Z',
+  delete:
+    'M280 -120Q247 -120 223.5 -143.5Q200 -167 200 -200L200 -720L160 -720L160 -800L360 -800L360 -840L600 -840L600 -800L800 -800L800 -720L760 -720L760 -200Q760 -167 736.5 -143.5Q713 -120 680 -120ZM680 -720L280 -720L280 -200Q280 -200 280 -200Q280 -200 280 -200L680 -200Q680 -200 680 -200Q680 -200 680 -200ZM360 -280L440 -280L440 -640L360 -640ZM520 -280L600 -280L600 -640L520 -640ZM280 -720L280 -720L280 -200Q280 -200 280 -200Q280 -200 280 -200L280 -200Q280 -200 280 -200Q280 -200 280 -200Z',
   drag_indicator:
     'M360 -160Q327 -160 303.5 -183.5Q280 -207 280 -240Q280 -273 303.5 -296.5Q327 -320 360 -320Q393 -320 416.5 -296.5Q440 -273 440 -240Q440 -207 416.5 -183.5Q393 -160 360 -160ZM600 -160Q567 -160 543.5 -183.5Q520 -207 520 -240Q520 -273 543.5 -296.5Q567 -320 600 -320Q633 -320 656.5 -296.5Q680 -273 680 -240Q680 -207 656.5 -183.5Q633 -160 600 -160ZM360 -400Q327 -400 303.5 -423.5Q280 -447 280 -480Q280 -513 303.5 -536.5Q327 -560 360 -560Q393 -560 416.5 -536.5Q440 -513 440 -480Q440 -447 416.5 -423.5Q393 -400 360 -400ZM600 -400Q567 -400 543.5 -423.5Q520 -447 520 -480Q520 -513 543.5 -536.5Q567 -560 600 -560Q633 -560 656.5 -536.5Q680 -513 680 -480Q680 -447 656.5 -423.5Q633 -400 600 -400ZM360 -640Q327 -640 303.5 -663.5Q280 -687 280 -720Q280 -753 303.5 -776.5Q327 -800 360 -800Q393 -800 416.5 -776.5Q440 -753 440 -720Q440 -687 416.5 -663.5Q393 -640 360 -640ZM600 -640Q567 -640 543.5 -663.5Q520 -687 520 -720Q520 -753 543.5 -776.5Q567 -800 600 -800Q633 -800 656.5 -776.5Q680 -753 680 -720Q680 -687 656.5 -663.5Q633 -640 600 -640Z',
   expand_more: 'M480 -345L240 -585L296 -641L480 -457L664 -641L720 -585Z',
@@ -29,6 +31,8 @@ export const iconPaths = {
     'M536 -84L480 -140L622 -282L282 -622L140 -480L84 -536L140 -594L84 -650L168 -734L112 -792L168 -848L226 -792L310 -876L366 -820L424 -876L480 -820L338 -678L678 -338L820 -480L876 -424L820 -366L876 -310L792 -226L848 -168L792 -112L734 -168L650 -84L594 -140Z',
   healing:
     'M480 -254L330 -104Q307 -81 274 -81Q241 -81 218 -104L104 -218Q81 -241 81 -274Q81 -307 104 -330L254 -480L104 -630Q81 -653 81 -686Q81 -719 104 -742L218 -856Q241 -879 274 -879Q307 -879 330 -856L480 -706L630 -856Q653 -879 686 -879Q719 -879 742 -856L856 -742Q879 -719 879 -686Q879 -653 856 -630L706 -480L856 -330Q879 -307 879 -274Q879 -241 856 -218L742 -104Q719 -81 686 -81Q653 -81 630 -104ZM480 -520Q497 -520 508.5 -531.5Q520 -543 520 -560Q520 -577 508.5 -588.5Q497 -600 480 -600Q463 -600 451.5 -588.5Q440 -577 440 -560Q440 -543 451.5 -531.5Q463 -520 480 -520ZM310 -536L424 -650L274 -800Q274 -800 274 -800Q274 -800 274 -800L160 -686Q160 -686 160 -686Q160 -686 160 -686ZM400 -440Q417 -440 428.5 -451.5Q440 -463 440 -480Q440 -497 428.5 -508.5Q417 -520 400 -520Q383 -520 371.5 -508.5Q360 -497 360 -480Q360 -463 371.5 -451.5Q383 -440 400 -440ZM480 -360Q497 -360 508.5 -371.5Q520 -383 520 -400Q520 -417 508.5 -428.5Q497 -440 480 -440Q463 -440 451.5 -428.5Q440 -417 440 -400Q440 -383 451.5 -371.5Q463 -360 480 -360ZM560 -440Q577 -440 588.5 -451.5Q600 -463 600 -480Q600 -497 588.5 -508.5Q577 -520 560 -520Q543 -520 531.5 -508.5Q520 -497 520 -480Q520 -463 531.5 -451.5Q543 -440 560 -440ZM536 -310L686 -160Q686 -160 686 -160Q686 -160 686 -160L800 -274Q800 -274 800 -274Q800 -274 800 -274L650 -424ZM339 -621L339 -621L339 -621L339 -621L339 -621L339 -621L339 -621Q339 -621 339 -621Q339 -621 339 -621L339 -621Q339 -621 339 -621Q339 -621 339 -621L339 -621L339 -621L339 -621L339 -621ZM621 -339L621 -339L621 -339L621 -339L621 -339L621 -339Q621 -339 621 -339Q621 -339 621 -339L621 -339Q621 -339 621 -339Q621 -339 621 -339L621 -339L621 -339L621 -339L621 -339L621 -339Z',
+  history:
+    'M480 -120Q342 -120 239.5 -211.5Q137 -303 122 -440L204 -440Q218 -336 296.5 -268Q375 -200 480 -200Q597 -200 678.5 -281.5Q760 -363 760 -480Q760 -597 678.5 -678.5Q597 -760 480 -760Q411 -760 351 -728Q291 -696 250 -640L360 -640L360 -560L120 -560L120 -800L200 -800L200 -706Q251 -770 324.5 -805Q398 -840 480 -840Q555 -840 620.5 -811.5Q686 -783 734.5 -734.5Q783 -686 811.5 -620.5Q840 -555 840 -480Q840 -405 811.5 -339.5Q783 -274 734.5 -225.5Q686 -177 620.5 -148.5Q555 -120 480 -120ZM592 -312L440 -464L440 -680L520 -680L520 -496L648 -368Z',
   info: 'M440 -280L520 -280L520 -520L440 -520ZM480 -600Q497 -600 508.5 -611.5Q520 -623 520 -640Q520 -657 508.5 -668.5Q497 -680 480 -680Q463 -680 451.5 -668.5Q440 -657 440 -640Q440 -623 451.5 -611.5Q463 -600 480 -600ZM480 -80Q397 -80 324 -111.5Q251 -143 197 -197Q143 -251 111.5 -324Q80 -397 80 -480Q80 -563 111.5 -636Q143 -709 197 -763Q251 -817 324 -848.5Q397 -880 480 -880Q563 -880 636 -848.5Q709 -817 763 -763Q817 -709 848.5 -636Q880 -563 880 -480Q880 -397 848.5 -324Q817 -251 763 -197Q709 -143 636 -111.5Q563 -80 480 -80ZM480 -160Q614 -160 707 -253Q800 -346 800 -480Q800 -614 707 -707Q614 -800 480 -800Q346 -800 253 -707Q160 -614 160 -480Q160 -346 253 -253Q346 -160 480 -160ZM480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Z',
   input:
     'M160 -160Q127 -160 103.5 -183.5Q80 -207 80 -240L80 -360L160 -360L160 -240Q160 -240 160 -240Q160 -240 160 -240L800 -240Q800 -240 800 -240Q800 -240 800 -240L800 -720Q800 -720 800 -720Q800 -720 800 -720L160 -720Q160 -720 160 -720Q160 -720 160 -720L160 -600L80 -600L80 -720Q80 -753 103.5 -776.5Q127 -800 160 -800L800 -800Q833 -800 856.5 -776.5Q880 -753 880 -720L880 -240Q880 -207 856.5 -183.5Q833 -160 800 -160ZM460 -300L404 -358L487 -440L80 -440L80 -520L487 -520L404 -602L460 -660L640 -480Z',
@@ -44,6 +48,8 @@ export const iconPaths = {
     'M480 -160Q447 -160 423.5 -183.5Q400 -207 400 -240Q400 -273 423.5 -296.5Q447 -320 480 -320Q513 -320 536.5 -296.5Q560 -273 560 -240Q560 -207 536.5 -183.5Q513 -160 480 -160ZM480 -400Q447 -400 423.5 -423.5Q400 -447 400 -480Q400 -513 423.5 -536.5Q447 -560 480 -560Q513 -560 536.5 -536.5Q560 -513 560 -480Q560 -447 536.5 -423.5Q513 -400 480 -400ZM480 -640Q447 -640 423.5 -663.5Q400 -687 400 -720Q400 -753 423.5 -776.5Q447 -800 480 -800Q513 -800 536.5 -776.5Q560 -753 560 -720Q560 -687 536.5 -663.5Q513 -640 480 -640Z',
   no_accounts:
     'M608 -522L422 -708Q436 -714 450.5 -717Q465 -720 480 -720Q539 -720 579.5 -679.5Q620 -639 620 -580Q620 -565 617 -550.5Q614 -536 608 -522ZM234 -276Q285 -315 348 -337.5Q411 -360 480 -360Q498 -360 514.5 -358.5Q531 -357 549 -354L461 -442Q414 -448 380.5 -481.5Q347 -515 341 -562L227 -676Q195 -635 177.5 -585.5Q160 -536 160 -480Q160 -421 179.5 -369Q199 -317 234 -276ZM732 -284Q764 -325 782 -374.5Q800 -424 800 -480Q800 -613 706.5 -706.5Q613 -800 480 -800Q424 -800 374.5 -782Q325 -764 284 -732ZM480 -80Q398 -80 325 -111.5Q252 -143 197.5 -197.5Q143 -252 111.5 -325Q80 -398 80 -480Q80 -563 111.5 -635.5Q143 -708 197.5 -762.5Q252 -817 325 -848.5Q398 -880 480 -880Q563 -880 635.5 -848.5Q708 -817 762.5 -762.5Q817 -708 848.5 -635.5Q880 -563 880 -480Q880 -398 848.5 -325Q817 -252 762.5 -197.5Q708 -143 635.5 -111.5Q563 -80 480 -80ZM480 -160Q533 -160 580 -175.5Q627 -191 666 -220Q627 -249 580 -264.5Q533 -280 480 -280Q427 -280 380 -264.5Q333 -249 294 -220Q333 -191 380 -175.5Q427 -160 480 -160ZM480 -220Q480 -220 480 -220Q480 -220 480 -220Q480 -220 480 -220Q480 -220 480 -220Q480 -220 480 -220Q480 -220 480 -220Q480 -220 480 -220Q480 -220 480 -220Z',
+  notes:
+    'M120 -240L120 -320L600 -320L600 -240ZM120 -440L120 -520L840 -520L840 -440ZM120 -640L120 -720L840 -720L840 -640Z',
   output:
     'M200 -120Q167 -120 143.5 -143.5Q120 -167 120 -200L120 -760Q120 -793 143.5 -816.5Q167 -840 200 -840L760 -840Q793 -840 816.5 -816.5Q840 -793 840 -760L840 -680L760 -680L760 -760Q760 -760 760 -760Q760 -760 760 -760L200 -760Q200 -760 200 -760Q200 -760 200 -760L200 -200Q200 -200 200 -200Q200 -200 200 -200L760 -200Q760 -200 760 -200Q760 -200 760 -200L760 -280L840 -280L840 -200Q840 -167 816.5 -143.5Q793 -120 760 -120ZM680 -280L624 -336L727 -440L360 -440L360 -520L727 -520L624 -624L680 -680L880 -480Z',
   person:
diff --git a/app/src/indicators/EntryHistorySheet.tsx b/app/src/indicators/EntryHistorySheet.tsx
new file mode 100644
index 0000000..264a00e
--- /dev/null
+++ b/app/src/indicators/EntryHistorySheet.tsx
@@ -0,0 +1,198 @@
+import { useCallback, useEffect, useState } from 'react';
+import { deleteEntry } from '../data/entries';
+import { listIndicatorEntries, type HistoryEntry } from '../data/entryHistory';
+import type { StoredIndicator as Indicator } from '../data/indicators';
+import { Button, EmptyState, Icon, IndicatorLabel, Sheet } from '../design';
+import { formatDate, formatTime } from '../lib/time';
+import { entryValueLabel } from './entryValue';
+
+interface EntryHistorySheetProps {
+  /** Indicator whose records are shown (null closes the sheet). */
+  indicator: Indicator | null;
+  uid: string;
+  onClose: () => void;
+}
+
+/**
+ * History of the records of an indicator (spec 5.2 and 5.3): each record shows the date and the
+ * time in the browser timezone, the recorded value and the optional observation, revealed only
+ * when the user asks for it. A record can be deleted (with confirmation) but never edited.
+ */
+export function EntryHistorySheet({ indicator, uid, onClose }: EntryHistorySheetProps) {
+  const indicatorId = indicator?.id ?? null;
+  const [entries, setEntries] = useState<HistoryEntry[]>([]);
+  const [loading, setLoading] = useState(false);
+  const [error, setError] = useState<string | null>(null);
+  const [pendingDelete, setPendingDelete] = useState<HistoryEntry | null>(null);
+  const [revealedNotes, setRevealedNotes] = useState<ReadonlySet<string>>(() => new Set());
+  const [deleting, setDeleting] = useState(false);
+
+  const load = useCallback(async () => {
+    if (!indicatorId) return;
+    setLoading(true);
+    try {
+      setEntries(await listIndicatorEntries(uid, indicatorId));
+      setError(null);
+    } catch {
+      setError('Não foi possível carregar o histórico. Tente novamente.');
+    } finally {
+      setLoading(false);
+    }
+  }, [indicatorId, uid]);
+
+  useEffect(() => {
+    if (!indicatorId) return;
+    setRevealedNotes(new Set());
+    void load();
+  }, [indicatorId, load]);
+
+  function toggleNote(entryId: string) {
+    setRevealedNotes((current) => {
+      const next = new Set(current);
+      if (!next.delete(entryId)) next.add(entryId);
+      return next;
+    });
+  }
+
+  async function confirmDelete() {
+    if (!pendingDelete) return;
+    const target = pendingDelete;
+    setDeleting(true);
+    try {
+      await deleteEntry(uid, target.id);
+      setEntries((current) => current.filter((entry) => entry.id !== target.id));
+      setPendingDelete(null);
+      setError(null);
+    } catch {
+      setError('Não foi possível excluir o registro. Tente novamente.');
+    } finally {
+      setDeleting(false);
+    }
+  }
+
+  return (
+    <>
+      <Sheet
+        open={indicator !== null}
+        onClose={onClose}
+        title="Histórico de registros"
+        description="Data e hora no fuso do seu navegador. Registros não podem ser editados."
+      >
+        <div className="flex flex-col gap-space-md pb-2">
+          {indicator && (
+            <div className="flex items-center gap-2">
+              <IndicatorLabel indicator={indicator} variant="badge" group={indicator.group} />
+              <span className="font-body-sm text-body-sm text-on-surface-variant">
+                {entries.length} {entries.length === 1 ? 'registro' : 'registros'}
+              </span>
+            </div>
+          )}
+
+          {error && (
+            <p
+              role="alert"
+              className="rounded-md bg-error-container px-3 py-2 font-body-sm text-body-sm text-on-error-container"
+            >
+              {error}
+            </p>
+          )}
+
+          {loading && (
+            <p role="status" className="font-body-md text-body-md text-on-surface-variant">
+              Carregando registros…
+            </p>
+          )}
+
+          {!loading && entries.length === 0 && (
+            <EmptyState
+              icon="history"
+              title="Nenhum registro ainda"
+              description="Os registros deste indicador vão aparecer aqui, com data e hora."
+            />
+          )}
+
+          <ul className="flex flex-col gap-space-sm">
+            {entries.map((entry) => {
+              const noteRevealed = revealedNotes.has(entry.id);
+              return (
+                <li
+                  key={entry.id}
+                  data-testid="history-entry"
+                  className="flex flex-col gap-2 rounded-lg bg-surface-container-low p-3"
+                >
+                  <div className="flex items-center gap-3">
+                    <div className="flex w-16 shrink-0 flex-col items-start">
+                      <span className="font-headline-md text-headline-md text-on-surface">
+                        {formatTime(entry.recordedAt)}
+                      </span>{' '}
+                      <span className="font-body-sm text-body-sm text-on-surface-variant">
+                        {formatDate(entry.recordedAt)}
+                      </span>
+                    </div>{' '}
+                    <span className="min-w-0 flex-1 truncate font-label-lg text-label-lg text-on-surface">
+                      {entryValueLabel(
+                        indicator ?? { valueType: entry.valueType, numeric: null, options: null },
+                        entry.value,
+                      )}
+                    </span>
+                    <div className="flex shrink-0 items-center">
+                      {entry.note && (
+                        <button
+                          type="button"
+                          aria-label={noteRevealed ? 'Ocultar observação' : 'Ver observação'}
+                          aria-expanded={noteRevealed}
+                          onClick={() => toggleNote(entry.id)}
+                          className="flex size-11 items-center justify-center rounded-full text-outline transition-colors hover:bg-surface-container hover:text-on-surface"
+                        >
+                          <Icon name="notes" className="text-[18px]" />
+                        </button>
+                      )}
+                      <button
+                        type="button"
+                        aria-label="Excluir registro"
+                        onClick={() => setPendingDelete(entry)}
+                        className="flex size-11 items-center justify-center rounded-full text-outline transition-colors hover:bg-surface-container hover:text-error"
+                      >
+                        <Icon name="delete" className="text-[18px]" />
+                      </button>
+                    </div>
+                  </div>
+                  {noteRevealed && entry.note && (
+                    <p
+                      data-privacy-allow
+                      className="rounded-md bg-surface-container px-3 py-2 font-body-sm text-body-sm text-on-surface-variant"
+                    >
+                      {entry.note}
+                    </p>
+                  )}
+                </li>
+              );
+            })}
+          </ul>
+        </div>
+      </Sheet>
+
+      <Sheet
+        open={pendingDelete !== null}
+        onClose={() => setPendingDelete(null)}
+        title="Excluir registro"
+        description="Esta ação não pode ser desfeita."
+      >
+        <div className="flex flex-col gap-2 pb-2">
+          <Button variant="neutral" fullWidth onClick={() => setPendingDelete(null)}>
+            Cancelar
+          </Button>
+          <Button
+            variant="danger"
+            icon="delete"
+            fullWidth
+            disabled={deleting}
+            onClick={() => void confirmDelete()}
+          >
+            Excluir registro
+          </Button>
+        </div>
+      </Sheet>
+    </>
+  );
+}
diff --git a/app/src/indicators/entryValue.ts b/app/src/indicators/entryValue.ts
new file mode 100644
index 0000000..9fa8383
--- /dev/null
+++ b/app/src/indicators/entryValue.ts
@@ -0,0 +1,25 @@
+/**
+ * pt-BR label of a recorded value, according to the type of the indicator (spec 5.2).
+ * Pure helper: no React, no Firebase, no DOM.
+ */
+import type { EntryValue } from '../domain/entry';
+import type { IndicatorInput } from '../domain/indicator';
+
+type ValueSource = Pick<IndicatorInput, 'valueType' | 'numeric' | 'options'>;
+
+/** "Sim"/"Não", "7", "7 xícaras" or the label of the chosen ordinal option. */
+export function entryValueLabel(indicator: ValueSource, value: EntryValue | null): string {
+  if (!value) return '—';
+  if (indicator.valueType === 'boolean' && 'boolean' in value) {
+    return value.boolean ? 'Sim' : 'Não';
+  }
+  if (indicator.valueType === 'ordinal' && 'optionId' in value) {
+    const option = indicator.options?.find((entry) => entry.id === value.optionId);
+    return option?.label ?? value.optionId;
+  }
+  if ('number' in value) {
+    const unit = indicator.valueType === 'numeric' ? indicator.numeric?.unit : null;
+    return unit ? `${value.number} ${unit}` : `${value.number}`;
+  }
+  return '—';
+}
diff --git a/app/src/lib/time.ts b/app/src/lib/time.ts
index 71af012..1e3ad2b 100644
--- a/app/src/lib/time.ts
+++ b/app/src/lib/time.ts
@@ -62,6 +62,19 @@ export function formatDateTime(input: Date | string): string {
   return `${formatDate(date)} ${hours}:${minutes}`;
 }
 
+/** Formats a date (or ISO string) as "hh:mm" (24h) in the browser timezone. */
+export function formatTime(input: Date | string): string {
+  const date = typeof input === 'string' ? new Date(input) : input;
+  const parts = new Intl.DateTimeFormat('pt-BR', {
+    hour: '2-digit',
+    minute: '2-digit',
+    hourCycle: 'h23',
+  }).formatToParts(date);
+  const get = (type: Intl.DateTimeFormatPartTypes): string =>
+    parts.find((part) => part.type === type)?.value ?? '';
+  return `${get('hour')}:${get('minute')}`;
+}
+
 /**
  * Day key (YYYY-MM-DD) in America/Sao_Paulo, independent of the browser timezone.
  * Used for the AI quota and reminders.
diff --git a/app/src/pages/IndicatorsPage.tsx b/app/src/pages/IndicatorsPage.tsx
index 72e6098..c309267 100644
--- a/app/src/pages/IndicatorsPage.tsx
+++ b/app/src/pages/IndicatorsPage.tsx
@@ -10,6 +10,7 @@ import {
 } from '../data/indicators';
 import { Button, EmptyState, Icon, Sheet } from '../design';
 import type { IndicatorGroup } from '../design';
+import { EntryHistorySheet } from '../indicators/EntryHistorySheet';
 import { ArchivedIndicatorCard, IndicatorCard } from '../indicators/IndicatorCard';
 
 /** Filters of the list: everything, only factors, only results or only archived ones. */
@@ -73,6 +74,7 @@ export function IndicatorsPage() {
   const [filter, setFilter] = useState<ListFilter>('all');
   const [archivedOpen, setArchivedOpen] = useState(true);
   const [optionsFor, setOptionsFor] = useState<Indicator | null>(null);
+  const [historyFor, setHistoryFor] = useState<Indicator | null>(null);
   const [infoOpen, setInfoOpen] = useState(false);
   const [actionError, setActionError] = useState<string | null>(null);
 
@@ -124,6 +126,12 @@ export function IndicatorsPage() {
     navigate(`/indicators/${indicator.id}/edit`);
   }
 
+  /** Opens the history of the records of an indicator (spec 5.2). */
+  function openHistory(indicator: Indicator) {
+    setOptionsFor(null);
+    setHistoryFor(indicator);
+  }
+
   return (
     <div className="flex flex-col gap-space-lg pb-8">
       <div className="flex flex-col gap-space-md pt-2">
@@ -314,6 +322,14 @@ export function IndicatorsPage() {
           <Button variant="neutral" icon="edit_note" fullWidth onClick={() => optionsFor && edit(optionsFor)}>
             Editar Parâmetros
           </Button>
+          <Button
+            variant="neutral"
+            icon="history"
+            fullWidth
+            onClick={() => optionsFor && openHistory(optionsFor)}
+          >
+            Histórico de Registros
+          </Button>
           <Button
             variant="danger"
             icon="inventory_2"
@@ -325,6 +341,8 @@ export function IndicatorsPage() {
         </div>
       </Sheet>
 
+      <EntryHistorySheet indicator={historyFor} uid={uid} onClose={() => setHistoryFor(null)} />
+
       <Sheet
         open={infoOpen}
         onClose={() => setInfoOpen(false)}
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
