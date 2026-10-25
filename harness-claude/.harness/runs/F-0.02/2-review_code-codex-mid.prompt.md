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
  "id": "F-0.02",
  "title": "Tokens e componentes base do design system",
  "description": "Tokens de design/pulsar_bio_analytics/DESIGN.md como CSS variables + @theme do Tailwind (src/design/tokens.css) e componentes Button, Chip, Slider, NumberInput, Toggle, Card, Sheet, GroupBadge (Fator/Resultado) e Icon em src/design/, exportados por src/design/index.ts. Sem lógica de privacidade (ver F-0.06). Feito pelo inicializador.",
  "acceptance": [
    "Cores, tipografia, raios e espaçamentos vêm de tokens (sem hex soltos nos componentes)",
    "GroupBadge distingue Fator e Resultado por texto, não só por cor",
    "Controles interativos têm alvo de toque >= 44px e rótulo acessível"
  ],
  "specRefs": [
    "spec.md#7.1",
    "spec.md#7.2",
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
diff --git a/app/.prettierignore b/app/.prettierignore
index 505ccf1..78c8fa7 100644
--- a/app/.prettierignore
+++ b/app/.prettierignore
@@ -6,3 +6,5 @@ test-results
 functions/lib
 yarn.lock
 *.log
+# Formatted by the initializer; protected test must not be edited by implementors.
+src/design/__tests__/design-system.f002.test.tsx
diff --git a/app/src/design/Toggle.tsx b/app/src/design/Toggle.tsx
index 7813967..3856fe7 100644
--- a/app/src/design/Toggle.tsx
+++ b/app/src/design/Toggle.tsx
@@ -27,10 +27,10 @@ export function Toggle({ label, description, checked, onChange, disabled }: Togg
         className="flex h-11 w-12 shrink-0 items-center disabled:opacity-50"
       >
         <span
-          className={`relative h-11 w-12 rounded-full transition-colors ${checked ? 'bg-primary-container' : 'bg-outline-variant'}`}
+          className={`relative h-7 w-12 rounded-full transition-colors ${checked ? 'bg-primary-container' : 'bg-outline-variant'}`}
         >
           <span
-            className={`absolute top-1.5 left-1.5 h-8 w-8 rounded-full bg-surface-container-lowest shadow-level-1 transition-transform ${checked ? 'translate-x-2.5' : ''}`}
+            className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-surface-container-lowest shadow-level-1 transition-transform ${checked ? 'translate-x-5' : ''}`}
           />
         </span>
       </button>
diff --git a/app/src/design/__tests__/design-system.f002.test.tsx b/app/src/design/__tests__/design-system.f002.test.tsx
new file mode 100644
index 0000000..10e1375
--- /dev/null
+++ b/app/src/design/__tests__/design-system.f002.test.tsx
@@ -0,0 +1,109 @@
+import { readdirSync, readFileSync } from 'node:fs';
+import { join } from 'node:path';
+import { describe, expect, it, vi } from 'vitest';
+import { render, screen } from '@testing-library/react';
+import { Button, Card, Chip, GroupBadge, Icon, NumberInput, Sheet, Slider, Toggle } from '..';
+
+const designDir = join(__dirname, '..');
+
+// Minimum touch size in px implied by Tailwind sizing classes (h-N / w-N / min-h-N / min-w-N, 1 unit = 4px).
+function touchSize(el: Element, axis: 'h' | 'w'): number {
+  const sizes = [...el.classList]
+    .map((c) => c.match(new RegExp(`^(?:min-)?${axis}-(\\d+(?:\\.\\d+)?)$`)))
+    .filter((m): m is RegExpMatchArray => m !== null)
+    .map((m) => Number(m[1]) * 4);
+  return Math.max(0, ...sizes);
+}
+
+function expectTouchTarget(el: Element) {
+  expect(touchSize(el, 'h'), `height of ${el.outerHTML.slice(0, 80)}`).toBeGreaterThanOrEqual(44);
+  expect(touchSize(el, 'w') || 44, `width of ${el.outerHTML.slice(0, 80)}`).toBeGreaterThanOrEqual(44);
+}
+
+describe('F-0.02 design tokens', () => {
+  const css = readFileSync(join(designDir, 'tokens.css'), 'utf8');
+
+  it('declares colors, typography, radii and spacing inside @theme', () => {
+    expect(css).toContain('@theme');
+    for (const token of ['--color-primary', '--color-secondary', '--font-display', '--radius-', '--spacing-']) {
+      expect(css).toContain(token);
+    }
+  });
+
+  it('components use no hard-coded colors', () => {
+    const files = readdirSync(designDir).filter((f) => f.endsWith('.tsx'));
+    expect(files.length).toBeGreaterThanOrEqual(9);
+    for (const file of files) {
+      const src = readFileSync(join(designDir, file), 'utf8');
+      expect(src, file).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
+      expect(src, file).not.toMatch(/\b(?:rgba?|hsla?)\(/);
+      expect(src, file).not.toMatch(/-\[#/);
+    }
+  });
+});
+
+describe('F-0.02 GroupBadge', () => {
+  it('distinguishes Fator and Resultado by text, not only by color', () => {
+    const { container: a } = render(<GroupBadge group="factor" />);
+    const { container: b } = render(<GroupBadge group="result" />);
+    expect(a.textContent).toContain('Fator');
+    expect(b.textContent).toContain('Resultado');
+    expect(a.textContent).not.toContain('Resultado');
+    expect(b.textContent).not.toContain('Fator');
+  });
+});
+
+describe('F-0.02 touch targets and accessible labels', () => {
+  it('Button and Chip are >= 44px with an accessible name', () => {
+    render(
+      <>
+        <Button>Salvar</Button>
+        <Button size="lg">Continuar</Button>
+        <Chip>Sim</Chip>
+      </>,
+    );
+    for (const name of ['Salvar', 'Continuar', 'Sim']) {
+      expectTouchTarget(screen.getByRole('button', { name }));
+    }
+  });
+
+  it('Toggle is a labelled switch with a >= 44px target', () => {
+    render(<Toggle label="Lembrete diário" checked={false} onChange={vi.fn()} />);
+    expectTouchTarget(screen.getByRole('switch', { name: 'Lembrete diário' }));
+  });
+
+  it('NumberInput steppers and field are labelled and >= 44px', () => {
+    render(<NumberInput label="Água" value={2} onChange={vi.fn()} />);
+    expectTouchTarget(screen.getByRole('button', { name: /diminuir água/i }));
+    expectTouchTarget(screen.getByRole('button', { name: /aumentar água/i }));
+    expect(screen.getByRole('textbox', { name: /água/i })).toBeInTheDocument();
+  });
+
+  it('Slider options are labelled radios with >= 44px targets', () => {
+    render(<Slider label="Energia" value={null} onChange={vi.fn()} />);
+    expect(screen.getByRole('radiogroup', { name: 'Energia' })).toBeInTheDocument();
+    const radios = screen.getAllByRole('radio');
+    expect(radios.length).toBeGreaterThan(1);
+    radios.forEach(expectTouchTarget);
+  });
+
+  it('Sheet is a labelled dialog whose close button is labelled and >= 44px', () => {
+    render(
+      <Sheet open onClose={vi.fn()} title="Novo indicador">
+        <p>conteúdo</p>
+      </Sheet>,
+    );
+    expect(screen.getByRole('dialog', { name: 'Novo indicador' })).toBeInTheDocument();
+    expectTouchTarget(screen.getByRole('button', { name: 'Fechar' }));
+  });
+
+  it('Card and Icon render children/name', () => {
+    render(
+      <Card>
+        <Icon name="add" />
+        corpo
+      </Card>,
+    );
+    expect(screen.getByText('corpo')).toBeInTheDocument();
+  });
+});
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
