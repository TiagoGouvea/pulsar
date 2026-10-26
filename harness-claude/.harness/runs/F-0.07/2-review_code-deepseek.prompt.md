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
(nenhuma)


# Papel: avaliador de código (independente)

Você é de outra família de modelo e não escreveu este código. Não edite arquivos.

Verifique:
- O código atende **de fato** aos critérios de aceite, sem implementar "para o teste" (hardcode, mocks indevidos, condicionais de teste em produção).
- Segurança (Security Rules, dados entre usuários, segredos), privacidade (nomes de indicadores só via `<IndicatorLabel>`), aderência à spec e qualidade (tipos, legibilidade, duplicação).

## Feature
```json
{
  "id": "F-0.07",
  "title": "Página /_design (somente dev/emulador)",
  "description": "src/pages/DesignPage.tsx mostrando tokens e todos os componentes base, EyeToggle e IndicatorLabel com exemplos (com e sem sigla/emoji); rota registrada só em builds de dev/emulador e listada em e2e/routes.json. Feito pelo inicializador.",
  "acceptance": [
    "/_design passa axe sem violações serious/critical e sem overflow horizontal em 375 e 1280",
    "/_design não existe no build de produção",
    "Alternar o olho em /_design troca nomes por siglas nos exemplos"
  ],
  "specRefs": [
    "spec.md#7.1",
    "arquitetura.md#2"
  ]
}
```

## Gates
G1 install-build: ok
G2 lint-format: ok
G3 typecheck: ok
G4 unit: ok
G5 security-rules: pulado
G6 e2e: ok
G7 protected-tests: ok
G8 privacy-leak: pulado
G9 a11y: ok
G10 mobile-layout: ok
G11 visual-regression: pulado
G12 lighthouse: pulado
G13 secrets: ok

## Diff
```diff
diff --git a/app/e2e/design.spec.ts b/app/e2e/design.spec.ts
new file mode 100644
index 0000000..2f5a6f1
--- /dev/null
+++ b/app/e2e/design.spec.ts
@@ -0,0 +1,36 @@
+import { expect, test } from '@playwright/test';
+import { hasHorizontalOverflow } from './support';
+
+// /_design catalog (dev/emulator builds only): eye toggle swaps names for abbreviations in the examples.
+test('/_design shows abbreviations by default and names after opening the eye', async ({ page }) => {
+  await page.goto('/_design');
+  const labels = page.locator('[data-indicator-label]');
+  await expect(labels.first()).toBeVisible();
+
+  const body = page.locator('main');
+  await expect(body).toContainText('EXE');
+  await expect(body).toContainText('ENE');
+  await expect(body).not.toContainText('Exercício Físico');
+  await expect(body).not.toContainText('🏃');
+
+  const eye = page.getByTestId('eye-toggle');
+  await expect(eye).toHaveAttribute('aria-pressed', 'false');
+  await eye.click();
+  await expect(eye).toHaveAttribute('aria-pressed', 'true');
+  await expect(body).toContainText('Exercício Físico');
+  await expect(body).toContainText('Nível de Energia');
+  await expect(body).toContainText('🏃');
+
+  // Indicator without abbreviation/emoji keeps rendering in both states.
+  await expect(body).toContainText('Concentração');
+
+  await eye.click();
+  await expect(body).not.toContainText('Exercício Físico');
+  await expect(body).not.toContainText('🏃');
+});
+
+test('/_design has no horizontal overflow with the eye open', async ({ page }) => {
+  await page.goto('/_design');
+  await page.getByTestId('eye-toggle').click();
+  expect(await hasHorizontalOverflow(page)).toBe(false);
+});
diff --git a/app/src/App.tsx b/app/src/App.tsx
index 89e1b37..3de0f57 100644
--- a/app/src/App.tsx
+++ b/app/src/App.tsx
@@ -2,6 +2,7 @@ import { lazy, Suspense } from 'react';
 import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router';
 import { emulatorsEnabled } from './lib/env';
 import { HomePlaceholder } from './pages/HomePlaceholder';
+import { PrivacyProvider } from './privacy/PrivacyContext';
 
 const DesignPage = lazy(() => import('./pages/DesignPage'));
 
@@ -24,5 +25,9 @@ const routes: RouteObject[] = [
 const router = createBrowserRouter(routes);
 
 export function App() {
-  return <RouterProvider router={router} />;
+  return (
+    <PrivacyProvider>
+      <RouterProvider router={router} />
+    </PrivacyProvider>
+  );
 }
diff --git a/app/src/__tests__/designRoute.test.tsx b/app/src/__tests__/designRoute.test.tsx
new file mode 100644
index 0000000..0bcafaf
--- /dev/null
+++ b/app/src/__tests__/designRoute.test.tsx
@@ -0,0 +1,27 @@
+import { render, screen } from '@testing-library/react';
+import { afterEach, describe, expect, it, vi } from 'vitest';
+
+async function renderAppAt(path: string, emulatorsEnabled: boolean) {
+  vi.resetModules();
+  vi.doMock('../lib/env', () => ({ emulatorsEnabled }));
+  window.history.pushState({}, '', path);
+  const { App } = await import('../App');
+  render(<App />);
+}
+
+describe('/_design route gating', () => {
+  afterEach(() => {
+    vi.doUnmock('../lib/env');
+    window.history.pushState({}, '', '/');
+  });
+
+  it('renders the design catalog in emulator/dev builds', async () => {
+    await renderAppAt('/_design', true);
+    expect(await screen.findByRole('heading', { name: 'Design system' })).toBeTruthy();
+  });
+
+  it('does not exist in production builds', async () => {
+    await renderAppAt('/_design', false);
+    expect(screen.queryByRole('heading', { name: 'Design system' })).toBeNull();
+  });
+});
diff --git a/app/src/main.tsx b/app/src/main.tsx
index 9bb434d..c8a2e6b 100644
--- a/app/src/main.tsx
+++ b/app/src/main.tsx
@@ -2,12 +2,9 @@ import { StrictMode } from 'react';
 import { createRoot } from 'react-dom/client';
 import './design/tokens.css';
 import { App } from './App';
-import { PrivacyProvider } from './privacy/PrivacyContext';
 
 createRoot(document.getElementById('root')!).render(
   <StrictMode>
-    <PrivacyProvider>
-      <App />
-    </PrivacyProvider>
+    <App />
   </StrictMode>,
 );
diff --git a/app/src/pages/DesignPage.tsx b/app/src/pages/DesignPage.tsx
index 70dbf1a..8639338 100644
--- a/app/src/pages/DesignPage.tsx
+++ b/app/src/pages/DesignPage.tsx
@@ -5,6 +5,7 @@ import {
   Chip,
   EyeToggle,
   GroupBadge,
+  Icon,
   IndicatorLabel,
   NumberInput,
   Sheet,
@@ -20,6 +21,22 @@ const samples = {
   focus: { name: 'Concentração', abbreviation: null, emoji: null },
 };
 
+const colorTokens = [
+  { name: 'Primária · resultados', className: 'bg-primary-container' },
+  { name: 'Secundária · fatores', className: 'bg-secondary' },
+  { name: 'Terciária · positivo', className: 'bg-tertiary-container' },
+  { name: 'Alerta · baixa confiança', className: 'bg-warning' },
+  { name: 'Erro', className: 'bg-error' },
+  { name: 'Superfície', className: 'bg-surface-container' },
+] as const;
+
+const iconSamples = [
+  { name: 'input', label: 'Fator' },
+  { name: 'insights', label: 'Resultado' },
+  { name: 'analytics', label: 'Análise' },
+  { name: 'check_circle', label: 'Registrado' },
+] as const;
+
 function Section({ title, children }: { title: string; children: ReactNode }) {
   return (
     <section className="flex flex-col gap-space-md">
@@ -51,6 +68,25 @@ export default function DesignPage() {
         <EyeToggle />
       </header>
 
+      <Section title="Tokens">
+        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-space-sm">
+          {colorTokens.map((token) => (
+            <div
+              key={token.name}
+              className="flex min-w-0 items-center gap-2 rounded-md bg-surface-container-lowest p-2 shadow-level-1"
+            >
+              <span aria-hidden="true" className={`h-8 w-8 shrink-0 rounded-full ${token.className}`} />
+              <span className="font-label-md text-label-md text-on-surface-variant">{token.name}</span>
+            </div>
+          ))}
+        </div>
+        <Card>
+          <p className="font-headline-md text-headline-md">Título de seção</p>
+          <p className="font-body-lg text-body-lg">Texto de leitura e controles</p>
+          <p className="font-label-code text-label-code tracking-wider uppercase">ENE · 7,4</p>
+        </Card>
+      </Section>
+
       <Section title="Grupos e indicadores">
         <div className="flex flex-wrap items-center gap-2">
           <GroupBadge group="factor" />
@@ -85,6 +121,20 @@ export default function DesignPage() {
         </div>
       </Section>
 
+      <Section title="Ícones">
+        <div className="flex flex-wrap gap-2">
+          {iconSamples.map((icon) => (
+            <span
+              key={icon.name}
+              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-surface-container px-3 font-label-md text-label-md"
+            >
+              <Icon name={icon.name} className="text-[20px]" />
+              {icon.label}
+            </span>
+          ))}
+        </div>
+      </Section>
+
       <Section title="Cartões e controles">
         <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-space-lg">
           <Card>
@@ -105,12 +155,19 @@ export default function DesignPage() {
           </Card>
           <Card>
             <IndicatorLabel indicator={samples.coffee} variant="badge" group="factor" />
-            <NumberInput label="Café" unit="xícaras" value={cups} onChange={setCups} min={0} step={0.5} />
+            <NumberInput
+              label="Quantidade do fator"
+              unit="xícaras"
+              value={cups}
+              onChange={setCups}
+              min={0}
+              step={0.5}
+            />
           </Card>
           <Card>
             <IndicatorLabel indicator={samples.energy} variant="badge" group="result" />
             <Slider
-              label="Energia"
+              label="Escala do resultado"
               value={scale}
               onChange={setScale}
               minLabel="0 (Esgotado)"
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
