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
  "id": "F-1.06",
  "title": "Guarda e2e do modo privado (sentinelas)",
  "description": "Teste e2e que, com o usuário do seed, percorre todas as rotas de e2e/routes.json com o olho fechado e verifica que ZQX_ENERGIA_7F3, ZQX_SONO_9K2, ZQX_FOCO_4M8 e ZQX_OBS_NOTA_5T1 não aparecem fora de [data-privacy-allow]; abrir o olho revela nomes e emojis; recarregar volta a siglas. Gráficos não são mascarados.",
  "acceptance": [
    "Olho fechado: nenhuma sentinela de nome de indicador visível fora de [data-privacy-allow]",
    "Observações (ZQX_OBS_NOTA_5T1) só aparecem onde a pessoa abre a nota explicitamente e marcadas com data-privacy-allow",
    "Olho aberto: nomes e emojis aparecem",
    "Reload reinicia em siglas"
  ],
  "specRefs": [
    "spec.md#4.4",
    "spec.md#13",
    "arquitetura.md#2"
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
diff --git a/DECISOES.md b/DECISOES.md
index ec80745..9bbb382 100644
--- a/DECISOES.md
+++ b/DECISOES.md
@@ -29,6 +29,7 @@
 ## Outras
 - Região: Firestore e Functions em `southamerica-east1`.
 - Idioma único pt-BR; app somente mobile (desktop só estica/desempilha).
+- **Guarda do modo privado**: o atributo que marca conteúdo revelado de propósito é `data-privacy-allow` (fonte única: `app/src/privacy/allow.ts`); a guarda e2e percorre todas as rotas de `app/e2e/routes.json` com as sentinelas do seed (`ZQX_ENERGIA_7F3`, `ZQX_SONO_9K2`, `ZQX_FOCO_4M8`, `ZQX_OBS_NOTA_5T1`, vindas de `app/scripts/seed-data.ts`). Nome/sigla/emoji de indicador só pode ser renderizado por `<IndicatorLabel>` (ou `indicatorLabel()`): o ESLint bloqueia `indicator.name` direto no JSX. Justificativa: o nome de um indicador é informação pessoal e não pode vazar com o olho fechado; a guarda precisa de uma fonte única para não divergir do seed.
 
 ## Pendências completadas pelo inicializador (defaults conservadores — confirmar no checkpoint da etapa 0)
 - **Convite de instalar a PWA ("alguns usos")**: registros em ≥ 5 dias distintos **e** conta já convertida; se anônima, mostra a conversão. Justificativa: mais tarde que o convite de salvar conta (3 dias), nunca antes da conversão.
diff --git a/app/AGENTS.md b/app/AGENTS.md
index f686951..2ccc59a 100644
--- a/app/AGENTS.md
+++ b/app/AGENTS.md
@@ -12,7 +12,7 @@ Leia antes de qualquer mudança: `../docs/Pulsar_Especificacao_Completa.md` (spe
 - **Timestamps em UTC** (`Timestamp`/ISO). O dia do registro (`localDate`, `YYYY-MM-DD`) é calculado no cliente pelo fuso do navegador. A quota da IA e o lembrete usam o dia de `America/Sao_Paulo`.
 - `src/stats/` contém **só lógica pura e determinística** (sem Firebase, React, DOM, `Date.now()` implícito: receba `today` por parâmetro). O ESLint bloqueia imports de `firebase`/`react` ali.
 - Nome/sigla/emoji de indicador **só** via `<IndicatorLabel>` (ou `indicatorLabel()` de `src/privacy/label.ts` para textos). Olho fechado = sigla e sem emoji. Gráficos não são mascarados.
-- Elementos que mostram nomes reais de propósito (ex.: editor aberto) recebem `data-privacy-allow`.
+- Elementos que mostram nomes reais de propósito (ex.: editor aberto) recebem `data-privacy-allow` (use `privacyAllowProps()` de `src/privacy/allow.ts`; é a fonte única do atributo). O ESLint bloqueia `indicator.name` renderizado direto no JSX.
 - Nunca leia/edite `.env`. Nunca rode seed fora do emulador. Não use `.skip`/`.only` nem enfraqueça asserts. Não edite testes protegidos listados em `../.harness/features.json`.
 - Prefira código mínimo; antes de criar função/componente, procure algo equivalente (`grep -r` em `src/`) e reutilize.
 
diff --git a/app/e2e/privacy-mode.spec.ts b/app/e2e/privacy-mode.spec.ts
new file mode 100644
index 0000000..ad973a3
--- /dev/null
+++ b/app/e2e/privacy-mode.spec.ts
@@ -0,0 +1,168 @@
+import type { Page } from '@playwright/test';
+import { expect, test } from './fixtures';
+import { appRoutes, SENTINELS } from './support';
+
+const FIXED_NOW = '2026-11-08T18:00:00Z';
+const NOTE = 'ZQX_OBS_NOTA_5T1';
+const INDICATORS = [
+  { name: 'ZQX_SONO_9K2', abbreviation: 'SON', emoji: '💤', id: 'ind_sleep' },
+  { name: 'ZQX_ENERGIA_7F3', abbreviation: 'ENE', emoji: '⚡', id: 'ind_energy' },
+  { name: 'ZQX_FOCO_4M8', abbreviation: 'FOC', emoji: '🎯', id: 'ind_focus' },
+] as const;
+
+// Include text exposed by assistive technology, native titles, form values and visible tooltips.
+async function exposedContent(page: Page, outsideAllowList = true): Promise<string> {
+  return page.evaluate((outside) => {
+    const content: string[] = [];
+    for (const element of document.querySelectorAll('*')) {
+      if (outside && element.closest('[data-privacy-allow]')) continue;
+      if (!element.getClientRects().length) continue;
+      const style = getComputedStyle(element);
+      if (style.visibility === 'hidden' || style.display === 'none') continue;
+      for (const child of element.childNodes) {
+        if (child.nodeType === Node.TEXT_NODE) content.push(child.textContent ?? '');
+      }
+      for (const attribute of element.attributes) {
+        if (attribute.name === 'title' || attribute.name.startsWith('aria-')) {
+          content.push(attribute.value);
+          if (attribute.name === 'aria-labelledby' || attribute.name === 'aria-describedby') {
+            for (const id of attribute.value.split(/\s+/)) {
+              const target = document.getElementById(id);
+              if (target) content.push(target.textContent ?? '');
+            }
+          }
+        }
+      }
+      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
+        content.push(element.value, element.placeholder);
+      }
+    }
+    return content.join('\n');
+  }, outsideAllowList);
+}
+
+async function expectNoLeaks(page: Page) {
+  const exposed = await exposedContent(page);
+  for (const sentinel of SENTINELS)
+    expect(exposed, `Private content leaked: ${sentinel}`).not.toContain(sentinel);
+}
+
+async function inspectTooltips(page: Page) {
+  const targets = page.locator('[title], [aria-describedby], [data-tooltip]');
+  const count = await targets.count();
+  for (let index = 0; index < count; index++) {
+    const target = targets.nth(index);
+    if (!(await target.isVisible())) continue;
+    await target.hover();
+    await expectNoLeaks(page);
+  }
+}
+
+async function waitForRoute(page: Page, path: string) {
+  if (path === '/indicators') {
+    await expect(page.getByTestId('result-list').getByText('ENE', { exact: true })).toBeVisible();
+  } else if (path === '/register') {
+    await expect(page.getByTestId('quick-entry-card-ind_energy')).toBeVisible();
+  } else if (path === '/indicators/:id/edit') {
+    await expect(page.getByRole('textbox', { name: /nome do indicador/i })).toHaveValue('ZQX_ENERGIA_7F3');
+  } else if (path === '/indicators/new') {
+    await expect(page.getByRole('dialog', { name: 'Novo Indicador' })).toBeVisible();
+  } else if (path === '/onboarding') {
+    await expect(page.locator('h1')).toBeVisible();
+  } else if (path === '/_design') {
+    await expect(page.getByRole('heading', { name: 'Design system' })).toBeVisible();
+  } else if (path === '/saved-insights') {
+    await expect(page.getByRole('heading', { name: 'Conclusões salvas' })).toBeVisible();
+  } else if (path === '/settings') {
+    await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible();
+  } else {
+    await expect(page.getByRole('link', { name: 'Registrar agora' })).toBeVisible();
+  }
+}
+
+for (const route of appRoutes) {
+  test(`closed eye protects seed content on ${route.path}`, async ({ seedPage: page }) => {
+    await page.clock.setFixedTime(new Date(FIXED_NOW));
+    await page.goto(route.path.replace(':id', 'ind_energy'));
+    await waitForRoute(page, route.path);
+    const eye = page.getByTestId('eye-toggle');
+    if (await eye.count()) await expect(eye).toHaveAttribute('aria-pressed', 'false');
+    await expectNoLeaks(page);
+    expect(await exposedContent(page, false)).not.toContain(NOTE);
+    await inspectTooltips(page);
+  });
+}
+
+test('the eye reveals seed names and emoji across navigation, and reload returns to abbreviations', async ({
+  seedPage: page,
+}) => {
+  await page.clock.setFixedTime(new Date(FIXED_NOW));
+  await page.goto('/indicators');
+  await expect(page.getByTestId('result-list').getByText('ENE', { exact: true })).toBeVisible();
+  const eye = page.getByTestId('eye-toggle');
+  await expect(eye).toHaveAttribute('aria-pressed', 'false');
+  for (const indicator of INDICATORS) {
+    const label = page.getByTestId('indicator-card').filter({ hasText: indicator.abbreviation });
+    await expect(label).toContainText(indicator.abbreviation);
+    await expect(label).not.toContainText(indicator.name);
+    await expect(label).not.toContainText(indicator.emoji);
+  }
+  await expectNoLeaks(page);
+
+  await eye.click();
+  await expect(eye).toHaveAttribute('aria-pressed', 'true');
+  for (const indicator of INDICATORS) {
+    const card = page.getByTestId('indicator-card').filter({ hasText: indicator.name });
+    await expect(card).toBeVisible();
+    await expect(card).toContainText(indicator.emoji);
+  }
+
+  await page
+    .getByRole('navigation', { name: 'Navegação principal' })
+    .getByRole('link', { name: 'Registrar' })
+    .click();
+  await expect(eye).toHaveAttribute('aria-pressed', 'true');
+  for (const indicator of INDICATORS) {
+    const card = page.getByTestId(`quick-entry-card-${indicator.id}`);
+    await expect(card).toContainText(indicator.name);
+    await expect(card).toContainText(indicator.emoji);
+  }
+
+  await page.reload();
+  await expect(eye).toHaveAttribute('aria-pressed', 'false');
+  for (const indicator of INDICATORS) {
+    const card = page.getByTestId(`quick-entry-card-${indicator.id}`);
+    await expect(card).toContainText(indicator.abbreviation);
+    await expect(card).not.toContainText(indicator.name);
+    await expect(card).not.toContainText(indicator.emoji);
+  }
+  await expectNoLeaks(page);
+});
+
+test('seed observations are visible only after explicitly opening a note', async ({ seedPage: page }) => {
+  await page.clock.setFixedTime(new Date(FIXED_NOW));
+  await page.goto('/indicators');
+  const card = page.getByTestId('indicator-card').filter({ hasText: 'ENE' });
+  await expect(card).toBeVisible();
+  await card.getByRole('button', { name: /opções do indicador/i }).click();
+  await page
+    .getByRole('dialog', { name: /opções do indicador/i })
+    .getByRole('button', { name: /histórico/i })
+    .click();
+  const history = page.getByRole('dialog', { name: /histórico de registros/i });
+  await expect(history).toBeVisible();
+  const noteButton = history.getByRole('button', { name: /ver observação/i }).first();
+  await expect(noteButton).toBeVisible();
+  expect(await exposedContent(page, false)).not.toContain(NOTE);
+  await expectNoLeaks(page);
+  await inspectTooltips(page);
+
+  await noteButton.click();
+  const note = history.locator('[data-privacy-allow]').getByText(NOTE, { exact: false });
+  await expect(note).toBeVisible();
+  await expectNoLeaks(page);
+  await inspectTooltips(page);
+  await history.getByRole('button', { name: /ocultar observação/i }).click();
+  await expect(note).not.toBeVisible();
+  expect(await exposedContent(page, false)).not.toContain(NOTE);
+});
diff --git a/app/e2e/support.ts b/app/e2e/support.ts
index 3fdc35b..021ee37 100644
--- a/app/e2e/support.ts
+++ b/app/e2e/support.ts
@@ -1,4 +1,6 @@
 import type { Page } from '@playwright/test';
+import { SENTINELS as SEED_SENTINELS } from '../scripts/seed-data';
+import { PRIVACY_ALLOW_ATTRIBUTE } from '../src/privacy/allow';
 import routes from './routes.json' with { type: 'json' };
 
 export interface AppRoute {
@@ -9,15 +11,27 @@ export interface AppRoute {
 
 export const appRoutes: AppRoute[] = routes;
 
-export const SENTINELS = ['ZQX_ENERGIA_7F3', 'ZQX_SONO_9K2', 'ZQX_FOCO_4M8', 'ZQX_OBS_NOTA_5T1'];
+/**
+ * Names planted in the seed dataset. They come from the seed itself (single source of truth), so
+ * the privacy guard can never check a sentinel the seed does not use.
+ */
+export const SENTINELS: string[] = [
+  SEED_SENTINELS.energy,
+  SEED_SENTINELS.sleep,
+  SEED_SENTINELS.focus,
+  SEED_SENTINELS.note,
+];
+
+/** Elements that show real indicator names on purpose (explicit editing, opened observation). */
+export const PRIVACY_ALLOW_SELECTOR = `[${PRIVACY_ALLOW_ATTRIBUTE}]`;
 
 // Visible text of the page, ignoring elements that show real names on purpose ([data-privacy-allow]).
 export function visibleTextOutsideAllowList(page: Page): Promise<string> {
-  return page.evaluate(() => {
+  return page.evaluate((allowSelector) => {
     const clone = document.body.cloneNode(true) as HTMLElement;
-    clone.querySelectorAll('[data-privacy-allow], script, style').forEach((el) => el.remove());
+    clone.querySelectorAll(`${allowSelector}, script, style`).forEach((el) => el.remove());
     return clone.textContent ?? '';
-  });
+  }, PRIVACY_ALLOW_SELECTOR);
 }
 
 export function hasHorizontalOverflow(page: Page): Promise<boolean> {
diff --git a/app/eslint.config.js b/app/eslint.config.js
index 2733e00..65f0f0c 100644
--- a/app/eslint.config.js
+++ b/app/eslint.config.js
@@ -26,6 +26,29 @@ export default tseslint.config(
       'no-restricted-imports': ['error', { patterns: ['firebase', 'firebase/*', 'react', 'react-*'] }],
     },
   },
+  {
+    // Privacy guard (spec 4.4): the name/sigla/emoji of an indicator is rendered only by
+    // <IndicatorLabel> (or indicatorLabel()), which obeys the global eye. Rendering the raw name
+    // in JSX would leak it while the eye is closed, so the guard forbids it in the markup.
+    files: ['src/**/*.tsx'],
+    rules: {
+      'no-restricted-syntax': [
+        'error',
+        {
+          selector:
+            "JSXExpressionContainer MemberExpression[property.name='name'][object.name=/^(indicator|indicatorSource)$/]",
+          message:
+            'Renderize nome/sigla/emoji de indicador apenas com <IndicatorLabel> (ou indicatorLabel() de src/privacy/label.ts).',
+        },
+        {
+          selector:
+            "JSXExpressionContainer MemberExpression[property.name='name'][object.property.name='indicator']",
+          message:
+            'Renderize nome/sigla/emoji de indicador apenas com <IndicatorLabel> (ou indicatorLabel() de src/privacy/label.ts).',
+        },
+      ],
+    },
+  },
   {
     files: ['scripts/**/*.ts', 'e2e/**/*.ts', 'tests/**/*.ts'],
     rules: { 'no-console': 'off', 'react-hooks/rules-of-hooks': 'off' },
diff --git a/app/src/indicators/EntryHistorySheet.tsx b/app/src/indicators/EntryHistorySheet.tsx
index 264a00e..d4ee82c 100644
--- a/app/src/indicators/EntryHistorySheet.tsx
+++ b/app/src/indicators/EntryHistorySheet.tsx
@@ -4,6 +4,7 @@ import { listIndicatorEntries, type HistoryEntry } from '../data/entryHistory';
 import type { StoredIndicator as Indicator } from '../data/indicators';
 import { Button, EmptyState, Icon, IndicatorLabel, Sheet } from '../design';
 import { formatDate, formatTime } from '../lib/time';
+import { privacyAllowProps } from '../privacy/allow';
 import { entryValueLabel } from './entryValue';
 
 interface EntryHistorySheetProps {
@@ -159,7 +160,7 @@ export function EntryHistorySheet({ indicator, uid, onClose }: EntryHistorySheet
                   </div>
                   {noteRevealed && entry.note && (
                     <p
-                      data-privacy-allow
+                      {...privacyAllowProps()}
                       className="rounded-md bg-surface-container px-3 py-2 font-body-sm text-body-sm text-on-surface-variant"
                     >
                       {entry.note}
diff --git a/app/src/indicators/IndicatorEditor.tsx b/app/src/indicators/IndicatorEditor.tsx
index 2ccf4f7..6db2951 100644
--- a/app/src/indicators/IndicatorEditor.tsx
+++ b/app/src/indicators/IndicatorEditor.tsx
@@ -1,6 +1,7 @@
 import { useId, useState, type FormEvent, type ReactNode } from 'react';
 import type { IndicatorInput, OrdinalOption, ValueType } from '../domain/indicator';
 import { abbreviationOf } from '../privacy/label';
+import { privacyAllowProps } from '../privacy/allow';
 import { Button, Chip, Icon, type IconName } from '../design';
 import { AggregationControl } from './AggregationControl';
 import { suggestedAggregation } from './aggregation';
@@ -292,7 +293,7 @@ export function IndicatorEditor({
           {/* Explicit editing shows the real name on purpose (spec 4.4). */}
           <input
             id={nameId}
-            data-privacy-allow
+            {...privacyAllowProps()}
             type="text"
             value={draft.name}
             maxLength={60}
diff --git a/app/src/indicators/__tests__/EntryHistorySheet.test.tsx b/app/src/indicators/__tests__/EntryHistorySheet.test.tsx
new file mode 100644
index 0000000..cd57e67
--- /dev/null
+++ b/app/src/indicators/__tests__/EntryHistorySheet.test.tsx
@@ -0,0 +1,85 @@
+import { render, screen, within } from '@testing-library/react';
+import userEvent from '@testing-library/user-event';
+import { beforeEach, describe, expect, it, vi } from 'vitest';
+import type { StoredIndicator } from '../../data/indicators';
+import { PrivacyProvider } from '../../privacy/PrivacyContext';
+import { EntryHistorySheet } from '../EntryHistorySheet';
+
+const { listIndicatorEntries } = vi.hoisted(() => ({ listIndicatorEntries: vi.fn() }));
+
+vi.mock('../../data/entryHistory', () => ({ listIndicatorEntries }));
+vi.mock('../../data/entries', () => ({ deleteEntry: vi.fn() }));
+
+const indicator: StoredIndicator = {
+  id: 'ind_energy',
+  group: 'result',
+  name: 'ZQX_ENERGIA_7F3',
+  abbreviation: 'ENE',
+  emoji: '⚡',
+  valueType: 'scale',
+  numeric: null,
+  scale: { min: 0, max: 10, step: 1 },
+  options: null,
+  desiredDirection: 'higher',
+  idealRange: null,
+  frequency: 'multiple_per_day',
+  dailyAggregation: 'mean',
+  sortOrder: 1000,
+  archivedAt: null,
+  lockedAt: null,
+  createdAt: null,
+  updatedAt: null,
+};
+
+const observation = 'ZQX_OBS_NOTA_5T1 reunião longa pela manhã';
+
+function renderSheet() {
+  return render(
+    <PrivacyProvider>
+      <EntryHistorySheet indicator={indicator} uid="seed-user-0001" onClose={() => {}} />
+    </PrivacyProvider>,
+  );
+}
+
+describe('EntryHistorySheet: observations of the privacy mode', () => {
+  beforeEach(() => {
+    listIndicatorEntries.mockReset();
+    listIndicatorEntries.mockResolvedValue([
+      {
+        id: 'entry-1',
+        indicatorId: 'ind_energy',
+        localDate: '2026-11-08',
+        recordedAt: '2026-11-08T15:00:00Z',
+        valueType: 'scale',
+        value: { number: 7 },
+        note: observation,
+      },
+    ]);
+  });
+
+  it('keeps the observation out of the page until the person opens it explicitly', async () => {
+    renderSheet();
+    const dialog = await screen.findByRole('dialog', { name: 'Histórico de registros' });
+    expect(dialog).not.toHaveTextContent(observation);
+    expect(screen.getByRole('button', { name: /ver observação/i })).toBeInTheDocument();
+
+    await userEvent.click(screen.getByRole('button', { name: /ver observação/i }));
+    const note = screen.getByText(observation);
+    expect(note).toBeVisible();
+    // Revealed on purpose: the privacy guard must ignore this element.
+    expect(note).toHaveAttribute('data-privacy-allow');
+  });
+
+  it('hides the observation again and keeps the indicator name in its acronym', async () => {
+    renderSheet();
+    const dialog = await screen.findByRole('dialog', { name: 'Histórico de registros' });
+    await userEvent.click(screen.getByRole('button', { name: /ver observação/i }));
+    await userEvent.click(screen.getByRole('button', { name: /ocultar observação/i }));
+    expect(screen.queryByText(observation)).not.toBeInTheDocument();
+
+    // Eye closed: the indicator is shown as its acronym, without name nor emoji.
+    expect(within(dialog).getByText('ENE')).toBeInTheDocument();
+    expect(dialog).not.toHaveTextContent('ZQX_ENERGIA_7F3');
+    expect(dialog).not.toHaveTextContent('⚡');
+  });
+});
diff --git a/app/src/pages/DesignPage.tsx b/app/src/pages/DesignPage.tsx
index f8272bf..df0dce1 100644
--- a/app/src/pages/DesignPage.tsx
+++ b/app/src/pages/DesignPage.tsx
@@ -12,6 +12,7 @@ import {
   Slider,
   Toggle,
 } from '../design';
+import { privacyAllowProps } from '../privacy/allow';
 
 // Dev-only catalog of the design system (route /_design, emulator builds only).
 const samples = {
@@ -241,7 +242,7 @@ export default function DesignPage() {
             <span className="px-1 font-label-md text-label-md">Nome do indicador</span>
             {/* Explicit editing shows the real name on purpose (spec 4.4). */}
             <input
-              data-privacy-allow
+              {...privacyAllowProps()}
               value={name}
               onChange={(e) => setName(e.target.value)}
               className="h-12 rounded-full bg-surface-container-low px-4 font-body-lg text-body-lg focus:ring-2 focus:ring-primary-container focus:outline-none"
diff --git a/app/src/privacy/__tests__/allow.test.ts b/app/src/privacy/__tests__/allow.test.ts
new file mode 100644
index 0000000..087c369
--- /dev/null
+++ b/app/src/privacy/__tests__/allow.test.ts
@@ -0,0 +1,9 @@
+import { describe, expect, it } from 'vitest';
+import { PRIVACY_ALLOW_ATTRIBUTE, privacyAllowProps } from '../allow';
+
+describe('privacy allow contract', () => {
+  it('marks intentionally revealed content with the attribute the e2e guard looks for', () => {
+    expect(PRIVACY_ALLOW_ATTRIBUTE).toBe('data-privacy-allow');
+    expect(privacyAllowProps()).toEqual({ 'data-privacy-allow': 'true' });
+  });
+});
diff --git a/app/src/privacy/allow.ts b/app/src/privacy/allow.ts
new file mode 100644
index 0000000..f999537
--- /dev/null
+++ b/app/src/privacy/allow.ts
@@ -0,0 +1,16 @@
+/**
+ * Contract of the privacy guard (spec 4.4 and F-1.06).
+ *
+ * While the global eye is closed, indicator names are hidden everywhere. The only exception is
+ * content the person explicitly opened: the indicator editor (the real name inside the form
+ * field) and an observation revealed on purpose. Those elements carry `data-privacy-allow`, and
+ * the e2e guard (e2e/privacy-mode.spec.ts) ignores everything inside them.
+ *
+ * The attribute name lives here so the app and the guard cannot drift apart.
+ */
+export const PRIVACY_ALLOW_ATTRIBUTE = 'data-privacy-allow';
+
+/** Props that mark an element as intentionally revealing the real indicator name. */
+export function privacyAllowProps(): Record<string, string> {
+  return { [PRIVACY_ALLOW_ATTRIBUTE]: 'true' };
+}
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
