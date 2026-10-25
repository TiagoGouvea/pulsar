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
  "id": "F-0.04",
  "title": "Firebase com emuladores e regras-base por UID",
  "description": "firebase.json (Auth 9299, Firestore 8282, Hosting, projeto offline demo-pulsar), src/lib/firebase.ts conectando aos emuladores em builds de emulador, firestore.rules base (dono acessa só users/{uid}/**, internal/** negado) e script test:rules com @firebase/rules-unit-testing. Feito pelo inicializador.",
  "acceptance": [
    "yarn test:rules sobe o emulador do Firestore e roda tests/rules",
    "firestore.rules nega acesso entre UIDs e a internal/",
    "Build de produção não aponta para emuladores"
  ],
  "specRefs": [
    "arquitetura.md#1",
    "arquitetura.md#9.1",
    "spec.md#9"
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
diff --git a/app/src/lib/__tests__/firebase.test.ts b/app/src/lib/__tests__/firebase.test.ts
new file mode 100644
index 0000000..2398d22
--- /dev/null
+++ b/app/src/lib/__tests__/firebase.test.ts
@@ -0,0 +1,40 @@
+import { afterEach, describe, expect, it, vi } from 'vitest';
+
+const sdk = vi.hoisted(() => ({ connectAuthEmulator: vi.fn(), connectFirestoreEmulator: vi.fn() }));
+
+vi.mock('firebase/auth', async (importOriginal) => ({
+  ...(await importOriginal<typeof import('firebase/auth')>()),
+  connectAuthEmulator: sdk.connectAuthEmulator,
+}));
+vi.mock('firebase/firestore', async (importOriginal) => ({
+  ...(await importOriginal<typeof import('firebase/firestore')>()),
+  connectFirestoreEmulator: sdk.connectFirestoreEmulator,
+}));
+
+async function loadFirebase(env: { DEV: boolean; VITE_USE_EMULATORS: string }) {
+  vi.resetModules();
+  vi.stubEnv('DEV', env.DEV);
+  vi.stubEnv('VITE_USE_EMULATORS', env.VITE_USE_EMULATORS);
+  return import('../firebase');
+}
+
+describe('firebase init', () => {
+  afterEach(() => {
+    vi.unstubAllEnvs();
+    vi.clearAllMocks();
+  });
+
+  it('never connects to emulators in a production build', async () => {
+    await loadFirebase({ DEV: false, VITE_USE_EMULATORS: '' });
+    expect(sdk.connectAuthEmulator).not.toHaveBeenCalled();
+    expect(sdk.connectFirestoreEmulator).not.toHaveBeenCalled();
+  });
+
+  it('connects to the ports from firebase.json in emulator builds', async () => {
+    await loadFirebase({ DEV: false, VITE_USE_EMULATORS: 'true' });
+    expect(sdk.connectAuthEmulator).toHaveBeenCalledWith(expect.anything(), 'http://localhost:9299', {
+      disableWarnings: true,
+    });
+    expect(sdk.connectFirestoreEmulator).toHaveBeenCalledWith(expect.anything(), 'localhost', 8282);
+  });
+});
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
