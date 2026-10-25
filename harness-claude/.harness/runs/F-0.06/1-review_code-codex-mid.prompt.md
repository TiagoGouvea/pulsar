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
  "id": "F-0.06",
  "title": "Modo privado: PrivacyContext, EyeToggle e IndicatorLabel",
  "description": "src/privacy/label.ts (regra pura nome <-> sigla, sigla ausente = 3 letras + '...', emoji só com olho aberto), src/privacy/PrivacyContext.tsx (estado em memória, inicia fechado a cada carga), EyeToggle (data-testid=eye-toggle, aria-pressed) e <IndicatorLabel> em src/design/ como único jeito de exibir nome/sigla/emoji. Feito pelo inicializador.",
  "acceptance": [
    "Olho inicia fechado (siglas), alterna nome <-> sigla e oculta emoji com olho fechado",
    "Sigla ausente vira 3 primeiras letras do nome + '...'",
    "Estado do olho não é persistido: recarregar volta a siglas"
  ],
  "specRefs": [
    "spec.md#4.4",
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
diff --git a/app/e2e/privacy.spec.ts b/app/e2e/privacy.spec.ts
new file mode 100644
index 0000000..9258cbd
--- /dev/null
+++ b/app/e2e/privacy.spec.ts
@@ -0,0 +1,26 @@
+import { expect, test } from '@playwright/test';
+
+// AC-16: eye starts closed, toggles name <-> abbreviation (emoji only when open) and is not persisted.
+test('eye toggle starts closed, reveals names and resets to abbreviations on reload', async ({ page }) => {
+  await page.goto('/_design');
+  const eye = page.getByTestId('eye-toggle');
+  const labels = page.locator('[data-indicator-label]');
+
+  await expect(eye).toHaveAttribute('aria-pressed', 'false');
+  await expect(labels.first()).toBeVisible();
+  const closed = (await labels.allTextContents()).join(' ');
+  expect(closed).toContain('ENE');
+  expect(closed).toContain('Con...');
+  expect(closed).not.toContain('Nível de Energia');
+  expect(closed).not.toContain('⚡');
+
+  await eye.click();
+  await expect(eye).toHaveAttribute('aria-pressed', 'true');
+  const open = (await labels.allTextContents()).join(' ');
+  expect(open).toContain('Nível de Energia');
+  expect(open).toContain('⚡');
+
+  await page.reload();
+  await expect(eye).toHaveAttribute('aria-pressed', 'false');
+  expect((await labels.allTextContents()).join(' ')).not.toContain('Nível de Energia');
+});
diff --git a/app/src/design/__tests__/IndicatorLabel.test.tsx b/app/src/design/__tests__/IndicatorLabel.test.tsx
index ed1a4e0..aec44f2 100644
--- a/app/src/design/__tests__/IndicatorLabel.test.tsx
+++ b/app/src/design/__tests__/IndicatorLabel.test.tsx
@@ -24,4 +24,24 @@ describe('IndicatorLabel + EyeToggle', () => {
     expect(screen.getByText('Nível de Energia')).toBeInTheDocument();
     expect(screen.getByText('⚡')).toBeInTheDocument();
   });
+
+  it('falls back to 3 letters + "..." and restarts closed on a new mount without persisting', async () => {
+    const tree = (
+      <PrivacyProvider>
+        <EyeToggle />
+        <IndicatorLabel indicator={{ name: 'Concentração', abbreviation: null }} />
+      </PrivacyProvider>
+    );
+    const { unmount } = render(tree);
+    expect(screen.getByText('Con...')).toBeInTheDocument();
+    await userEvent.click(screen.getByTestId('eye-toggle'));
+    expect(screen.getByText('Concentração')).toBeInTheDocument();
+    expect(localStorage.length + sessionStorage.length).toBe(0);
+    expect(screen.getByTestId('eye-toggle').getAttribute('aria-label')).not.toContain('Concentração');
+
+    unmount();
+    render(tree);
+    expect(screen.getByTestId('eye-toggle')).toHaveAttribute('aria-pressed', 'false');
+    expect(screen.getByText('Con...')).toBeInTheDocument();
+  });
 });
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
