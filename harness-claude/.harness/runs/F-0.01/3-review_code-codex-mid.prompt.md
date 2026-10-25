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
  "id": "F-0.01",
  "title": "Scaffold: Vite, TypeScript, Tailwind, lint e Vitest",
  "description": "package.json com yarn, Vite + React 19 + React Router, TypeScript strict (noUncheckedIndexedAccess), Tailwind v4, ESLint (bloqueia firebase/react em src/stats/) + Prettier, Vitest com cobertura v8 e index.html com lang pt-BR. Arquivos: package.json, vite.config.ts, tsconfig.json, eslint.config.js, index.html. Feito pelo inicializador.",
  "acceptance": [
    "yarn build, lint, format:check, typecheck e test:unit rodam a partir de app/",
    "<html lang=\"pt-BR\"> e nenhuma outra língua de interface",
    "Import de firebase ou react em src/stats/ falha no lint"
  ],
  "specRefs": [
    "arquitetura.md#1",
    "spec.md#7.2"
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
diff --git a/app/package.json b/app/package.json
index 4cf5a37..37d34be 100644
--- a/app/package.json
+++ b/app/package.json
@@ -15,7 +15,7 @@
     "format": "prettier --write .",
     "format:check": "prettier --check .",
     "typecheck": "tsc --noEmit -p tsconfig.json",
-    "test:unit": "vitest run --coverage",
+    "test:unit": "vitest run",
     "test:rules": "firebase emulators:exec --project demo-pulsar --only firestore \"vitest run --config vitest.rules.config.ts\"",
     "test:e2e": "playwright test --grep-invert @visual",
     "test:visual": "playwright test --grep @visual",
diff --git a/app/src/__tests__/scaffold.test.ts b/app/src/__tests__/scaffold.test.ts
new file mode 100644
index 0000000..9592e8b
--- /dev/null
+++ b/app/src/__tests__/scaffold.test.ts
@@ -0,0 +1,61 @@
+// @vitest-environment node
+import { readFileSync } from 'node:fs';
+import { resolve } from 'node:path';
+import { ESLint } from 'eslint';
+import { describe, expect, it } from 'vitest';
+
+const root = resolve(__dirname, '../..');
+const read = (file: string) => readFileSync(resolve(root, file), 'utf8');
+
+describe('scaffold scripts', () => {
+  const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
+
+  it.each(['build', 'lint', 'format:check', 'typecheck', 'test:unit'])('defines the %s script', (name) => {
+    expect(pkg.scripts[name]).toBeTruthy();
+  });
+
+  it('runs unit tests with v8 coverage', () => {
+    expect(pkg.scripts['test:unit']).toContain('vitest');
+    expect(read('vite.config.ts')).toContain("provider: 'v8'");
+  });
+
+  it('uses strict TypeScript with noUncheckedIndexedAccess', () => {
+    const tsconfig = read('tsconfig.json');
+    expect(tsconfig).toMatch(/"strict"\s*:\s*true/);
+    expect(tsconfig).toMatch(/"noUncheckedIndexedAccess"\s*:\s*true/);
+  });
+});
+
+describe('index.html language', () => {
+  const html = read('index.html');
+
+  it('declares pt-BR on <html>', () => {
+    expect(html).toMatch(/<html[^>]*\slang="pt-BR"/);
+  });
+
+  it('declares no other interface language', () => {
+    const langs = [...html.matchAll(/\slang="([^"]*)"/g)].map((m) => m[1]);
+    expect(langs).toEqual(['pt-BR']);
+  });
+});
+
+describe('lint boundary for src/stats', () => {
+  const lint = async (code: string) => {
+    const eslint = new ESLint({ cwd: root });
+    const [result] = await eslint.lintText(code, { filePath: resolve(root, 'src/stats/__probe__.ts') });
+    return result?.messages.filter((m) => m.ruleId === 'no-restricted-imports') ?? [];
+  };
+
+  it.each([
+    ["import { initializeApp } from 'firebase/app';", 'firebase subpath'],
+    ["import { getApp } from 'firebase';", 'firebase root'],
+    ["import { useState } from 'react';", 'react'],
+    ["import { createRoot } from 'react-dom/client';", 'react-dom'],
+  ])('rejects %s (%s)', async (code) => {
+    expect((await lint(`${code}\nexport const x = 1;\n`)).length).toBeGreaterThan(0);
+  });
+
+  it('allows pure imports', async () => {
+    expect(await lint("import { join } from 'node:path';\nexport const x = join;\n")).toHaveLength(0);
+  });
+});
diff --git a/app/src/design/NumberInput.tsx b/app/src/design/NumberInput.tsx
index a04f0c8..c8b2272 100644
--- a/app/src/design/NumberInput.tsx
+++ b/app/src/design/NumberInput.tsx
@@ -43,7 +43,7 @@ export function NumberInput({ label, value, onChange, unit, step = 1, min, max }
             const n = parseDecimal(text);
             onChange(n === null ? null : clamp(n));
           }}
-          className="w-full bg-transparent text-center font-stat-display text-stat-display text-on-surface focus:outline-none"
+          className="h-11 w-full bg-transparent text-center font-stat-display text-stat-display text-on-surface focus:outline-none"
         />
         {unit && (
           <span className="font-label-code text-label-code text-on-surface-variant uppercase">{unit}</span>
diff --git a/app/src/design/Slider.tsx b/app/src/design/Slider.tsx
index 603668c..d353988 100644
--- a/app/src/design/Slider.tsx
+++ b/app/src/design/Slider.tsx
@@ -40,7 +40,11 @@ export function Slider({
         </div>
       )}
       {count <= MAX_PILLS ? (
-        <div role="radiogroup" aria-label={label} className="flex items-center justify-between gap-0.5 py-1">
+        <div
+          role="radiogroup"
+          aria-label={label}
+          className="flex items-center justify-between gap-0.5 overflow-x-auto py-1"
+        >
           {Array.from({ length: count }, (_, i) => Number((min + i * step).toFixed(6))).map((n) => (
             <button
               key={n}
@@ -48,7 +52,7 @@ export function Slider({
               role="radio"
               aria-checked={value === n}
               onClick={() => onChange(n)}
-              className={`flex h-11 min-w-0 flex-1 items-center justify-center rounded-full font-label-code text-label-code transition-transform active:scale-90 ${value === n ? `${selected} font-headline-md text-headline-md shadow-md` : 'bg-surface-container text-on-surface-variant'}`}
+              className={`flex h-11 min-w-[44px] flex-1 items-center justify-center rounded-full font-label-code text-label-code transition-transform active:scale-90 ${value === n ? `${selected} font-headline-md text-headline-md shadow-md` : 'bg-surface-container text-on-surface-variant'}`}
             >
               {n}
             </button>
diff --git a/app/src/design/Toggle.tsx b/app/src/design/Toggle.tsx
index 4f2aafd..3856fe7 100644
--- a/app/src/design/Toggle.tsx
+++ b/app/src/design/Toggle.tsx
@@ -24,11 +24,15 @@ export function Toggle({ label, description, checked, onChange, disabled }: Togg
         aria-label={label}
         disabled={disabled}
         onClick={() => onChange(!checked)}
-        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-primary-container' : 'bg-outline-variant'}`}
+        className="flex h-11 w-12 shrink-0 items-center disabled:opacity-50"
       >
         <span
-          className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-surface-container-lowest shadow-level-1 transition-transform ${checked ? 'translate-x-5' : ''}`}
-        />
+          className={`relative h-7 w-12 rounded-full transition-colors ${checked ? 'bg-primary-container' : 'bg-outline-variant'}`}
+        >
+          <span
+            className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-surface-container-lowest shadow-level-1 transition-transform ${checked ? 'translate-x-5' : ''}`}
+          />
+        </span>
       </button>
     </label>
   );
diff --git a/app/vite.config.ts b/app/vite.config.ts
index a97eca3..c2e82da 100644
--- a/app/vite.config.ts
+++ b/app/vite.config.ts
@@ -12,6 +12,7 @@ export default defineConfig({
     setupFiles: ['./src/test/setup.ts'],
     include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
     coverage: {
+      enabled: true,
       provider: 'v8',
       reporter: ['text-summary', 'html', 'json-summary'],
       include: ['src/**/*.{ts,tsx}', 'scripts/**/*.ts'],
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
