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
  "id": "F-1.fix-2",
  "title": "Suíte completa da etapa falhou nos gates G2, G6",
  "description": "G2: yarn run v1.23.0-20220130.1630\n$ eslint . --max-warnings=0\nDone in 0.93s.\nyarn run v1.23.0-20220130.1630\n$ prettier --check .\nChecking formatting...\n[\u001b[33mwarn\u001b[39m] src/lib/functions.ts\n[\u001b[33mwarn\u001b[39m] Code style issues found in the above file. Run Prettier with --write to fix.\nerror Command failed with exit code 1.\ninfo Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.\n\nG6: getByRole('dialog')\n\n\n      205 |\n      206 |     const dialog = page.getByRole('dialog');\n    > 207 |     await expect(dialog).toBeVisible({ timeout: 15_000 });\n          |                          ^\n      208 |     await dialog.getByRole('button', { name: /entrar na conta existente/i }).click();\n      209 |\n      210 |     // Still the anonymous user until the person explicitly confirms.\n        at /Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/stage-1/pulsar-claude/app/e2e/account-link.spec.ts:207:26\n\n    Error Context: test-results/account-link-account-link--e55fe-and-never-merges-or-deletes-mobile/error-context.md\n\n    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────\n    test-results/account-link-account-link--e55fe-and-never-merges-or-deletes-mobile/trace.zip\n    Usage:\n\n        yarn playwright show-trace test-results/account-link-account-link--e55fe-and-never-merges-or-deletes-mobile/trace.zip\n\n    ────────────────────────────────────────────────────────────────────────────────────────────────\n\n  1 failed\n    [mobile] › e2e/account-link.spec.ts:145:3 › account link › Google keeps the UID and the records \n  1 flaky\n    [mobile] › e2e/account-link.spec.ts:192:3 › account link › entering the existing account needs a second confirmation and never merges or deletes \n  104 passed (1.3m)\nerror Command failed with exit code 1.\ninfo Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.",
  "acceptance": [
    "Todos os gates obrigatórios da etapa passam na suíte completa",
    "Nenhum teste protegido é alterado"
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
diff --git a/app/src/auth/__tests__/linkAccount.test.ts b/app/src/auth/__tests__/linkAccount.test.ts
index 1f54012..fcb6e14 100644
--- a/app/src/auth/__tests__/linkAccount.test.ts
+++ b/app/src/auth/__tests__/linkAccount.test.ts
@@ -1,4 +1,5 @@
 import { beforeEach, describe, expect, it, vi } from 'vitest';
+import { browserPopupRedirectResolver } from 'firebase/auth';
 
 // Contract under test (src/auth/linkAccount.ts):
 //   linkWithGoogle(): Promise<LinkResult>
@@ -94,6 +95,7 @@ describe('linkWithGoogle', () => {
     expect(result).toEqual({ status: 'linked', uid: 'anon-uid-1' });
     expect(mocks.linkWithPopup).toHaveBeenCalledTimes(1);
     expect(mocks.linkWithPopup.mock.calls[0]?.[0]).toBe(mocks.currentUser);
+    expect(mocks.linkWithPopup.mock.calls[0]?.[2]).toBe(browserPopupRedirectResolver);
     expectNothingDestructive();
   });
 
diff --git a/app/src/auth/linkAccount.ts b/app/src/auth/linkAccount.ts
index e8f2308..86df7b5 100644
--- a/app/src/auth/linkAccount.ts
+++ b/app/src/auth/linkAccount.ts
@@ -1,4 +1,5 @@
 import {
+  browserPopupRedirectResolver,
   EmailAuthProvider,
   fetchSignInMethodsForEmail,
   GoogleAuthProvider,
@@ -85,7 +86,7 @@ export async function linkWithGoogle(): Promise<LinkResult> {
   const user = requireCurrentUser();
   const uidBefore = user.uid;
   try {
-    const result = await linkWithPopup(user, new GoogleAuthProvider());
+    const result = await linkWithPopup(user, new GoogleAuthProvider(), browserPopupRedirectResolver);
     assertSameUid(uidBefore, result.user.uid);
     return { status: 'linked', uid: result.user.uid };
   } catch (error) {
diff --git a/app/src/lib/functions.ts b/app/src/lib/functions.ts
index 2ffad55..740e5fa 100644
--- a/app/src/lib/functions.ts
+++ b/app/src/lib/functions.ts
@@ -11,4 +11,4 @@ export const functions = getFunctions(firebaseApp, 'southamerica-east1');
 if (emulatorsEnabled) {
   const host = window.location.hostname || '127.0.0.1';
   connectFunctionsEmulator(functions, host, emulators.functions.port);
-}
\ No newline at end of file
+}
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
