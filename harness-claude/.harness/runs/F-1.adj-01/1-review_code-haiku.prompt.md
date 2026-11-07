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
  "id": "F-1.adj-01",
  "title": "Remover o texto \"Preparando seu espaço\" durante a carga inicial",
  "description": "Durante a carga inicial (bootstrap da sessão anônima) aparece por um instante o texto \"Preparando seu espaço\" e a tela pisca. O humano prefere não mostrar nada durante a carga, para evitar o piscar.",
  "acceptance": [
    "Durante a carga inicial da sessão, o texto \"Preparando seu espaço\" não aparece em momento algum",
    "Enquanto a sessão carrega, nenhum texto ou indicador visível é mostrado; a tela fica vazia, só com o fundo, até o conteúdo final aparecer"
  ],
  "specRefs": []
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
diff --git a/app/e2e/initial-session-loading.spec.ts b/app/e2e/initial-session-loading.spec.ts
new file mode 100644
index 0000000..83555d3
--- /dev/null
+++ b/app/e2e/initial-session-loading.spec.ts
@@ -0,0 +1,81 @@
+import { expect, test } from '@playwright/test';
+
+test('initial session stays blank until onboarding is ready', async ({ page }, testInfo) => {
+  await page.clock.setFixedTime(new Date('2026-01-15T12:00:00Z'));
+
+  if (testInfo.project.name === 'desktop') {
+    await page.goto('/');
+    await expect(page.getByRole('heading', { name: 'Observe sua rotina sem burocracia' })).toBeVisible();
+    return;
+  }
+
+  let releaseSignIn = () => {};
+  const signInGate = new Promise<void>((resolve) => {
+    releaseSignIn = resolve;
+  });
+  let signInStarted = false;
+  await page.route('**/accounts:signUp*', async (route) => {
+    signInStarted = true;
+    await signInGate;
+    await route.continue();
+  });
+
+  await page.addInitScript(() => {
+    const recordVisibleMessage = () => {
+      if (document.body?.innerText.includes('Preparando seu espaço')) {
+        sessionStorage.setItem('initialSessionMessageSeen', 'true');
+      }
+    };
+    new MutationObserver(recordVisibleMessage).observe(document, {
+      childList: true,
+      subtree: true,
+      characterData: true,
+      attributes: true,
+    });
+    recordVisibleMessage();
+  });
+
+  await page.goto('/', { waitUntil: 'domcontentloaded' });
+  try {
+    await expect.poll(() => signInStarted).toBe(true);
+    await page.evaluate(
+      () =>
+        new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
+    );
+
+    const visibleText = await page.locator('body').innerText();
+    const screenshot = await page.screenshot();
+    const nonBackgroundPixels = await page.evaluate(async (base64) => {
+      const image = new Image();
+      image.src = `data:image/png;base64,${base64}`;
+      await image.decode();
+      const canvas = document.createElement('canvas');
+      canvas.width = image.width;
+      canvas.height = image.height;
+      const context = canvas.getContext('2d');
+      if (!context) throw new Error('Canvas is unavailable');
+      context.drawImage(image, 0, 0);
+      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
+      let different = 0;
+      for (let index = 4; index < pixels.length; index += 4) {
+        if (
+          pixels[index] !== pixels[0] ||
+          pixels[index + 1] !== pixels[1] ||
+          pixels[index + 2] !== pixels[2] ||
+          pixels[index + 3] !== pixels[3]
+        ) {
+          different++;
+        }
+      }
+      return different;
+    }, screenshot.toString('base64'));
+
+    expect.soft(visibleText.trim(), 'the loading screen has no visible text').toBe('');
+    expect.soft(nonBackgroundPixels, 'the loading screen contains only its background').toBe(0);
+  } finally {
+    releaseSignIn();
+  }
+
+  await expect(page.getByRole('heading', { name: 'Observe sua rotina sem burocracia' })).toBeVisible();
+  expect(await page.evaluate(() => sessionStorage.getItem('initialSessionMessageSeen'))).toBeNull();
+});
diff --git a/app/src/App.tsx b/app/src/App.tsx
index c42f37a..97df5a8 100644
--- a/app/src/App.tsx
+++ b/app/src/App.tsx
@@ -11,7 +11,6 @@ import { SettingsPage } from './pages/SettingsPage';
 import { PrivacyProvider } from './privacy/PrivacyContext';
 
 const DesignPage = lazy(() => import('./pages/DesignPage'));
-const textClass = 'font-body-lg text-body-lg text-on-surface-variant';
 
 // App routes only render once the anonymous session and users/{uid} are ready; errors never look like success.
 function AuthGate() {
@@ -27,14 +26,8 @@ function AuthGate() {
         </Button>
       </HomePlaceholder>
     );
-  if (loading)
-    return (
-      <HomePlaceholder>
-        <p role="status" className={textClass}>
-          Preparando seu espaço…
-        </p>
-      </HomePlaceholder>
-    );
+  // Render nothing while loading (only the body background) to avoid a flash of interim content.
+  if (loading) return null;
   return <Outlet />;
 }
 
diff --git a/app/src/__tests__/initial-session-loading.test.tsx b/app/src/__tests__/initial-session-loading.test.tsx
new file mode 100644
index 0000000..e75510f
--- /dev/null
+++ b/app/src/__tests__/initial-session-loading.test.tsx
@@ -0,0 +1,21 @@
+import { render, screen } from '@testing-library/react';
+import type { ReactNode } from 'react';
+import { afterEach, expect, it, vi } from 'vitest';
+import { App } from '../App';
+
+vi.mock('../auth/AuthProvider', () => ({
+  AuthProvider: ({ children }: { children: ReactNode }) => children,
+  useAuth: () => ({ loading: true, error: null, user: null, profile: null }),
+}));
+
+afterEach(() => vi.useRealTimers());
+
+it('shows no visible text while the initial session is loading', () => {
+  vi.useFakeTimers();
+  vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
+  render(<App />);
+
+  for (const element of screen.queryAllByText(/\S/)) {
+    expect.soft(element).not.toBeVisible();
+  }
+});
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
