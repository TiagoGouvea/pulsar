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
  "id": "F-2.fix-3",
  "title": "Suíte completa da etapa falhou nos gates G6, G11",
  "description": "G6: ecord-thanks')).toHaveCount(0);\n        at /Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/stage-2/pulsar-claude/app/e2e/empty-dashboard-regressions.spec.ts:221:57\n\n    Error Context: test-results/empty-dashboard-regression-63e06-il-a-second-day-is-recorded-mobile-retry1/error-context.md\n\n    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────\n    test-results/empty-dashboard-regression-63e06-il-a-second-day-is-recorded-mobile-retry1/trace.zip\n    Usage:\n\n        yarn playwright show-trace test-results/empty-dashboard-regression-63e06-il-a-second-day-is-recorded-mobile-retry1/trace.zip\n\n    ────────────────────────────────────────────────────────────────────────────────────────────────\n\n  4 failed\n    [mobile] › e2e/account-delete.spec.ts:207:3 › account deletion and sign-out › deletion removes the old account and starts a clean anonymous session \n    [mobile] › e2e/account-delete.spec.ts:244:3 › account deletion and sign-out › anonymous sign-out requires an explicit confirmation and warns about lost access \n    [mobile] › e2e/account-link.spec.ts:109:3 › account link › no password or phone field or wording anywhere in the UI \n    [mobile] › e2e/empty-dashboard-regressions.spec.ts:210:1 › first filling with several indicators is acknowledged until a second day is recorded \n  97 passed (1.3m)\nerror Command failed with exit code 1.\ninfo Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.\n\nG11: cted substring: \"cancelada\"\n    Timeout: 5000ms\n    Error: element(s) not found\n\n    Call log:\n      - Expect \"toContainText\" getByRole('alert') with timeout 5000ms\n      - waiting for getByRole('alert')\n\n\n      27 |   await capture('google-loading');\n      28 |   await popup.close();\n    > 29 |   await expect(page.getByRole('alert')).toContainText('cancelada');\n         |                                         ^\n      30 |   await capture('google-error');\n      31 |\n      32 |   await page.getByRole('button', { name: /enviar link mágico/i }).click();\n        at /Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/stage-2/pulsar-claude/app/e2e/account-link-visual.spec.ts:29:41\n\n    Error Context: test-results/account-link-visual-account-linking-states-visual-mobile-retry1/error-context.md\n\n    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────\n    test-results/account-link-visual-account-linking-states-visual-mobile-retry1/trace.zip\n    Usage:\n\n        yarn playwright show-trace test-results/account-link-visual-account-linking-states-visual-mobile-retry1/trace.zip\n\n    ────────────────────────────────────────────────────────────────────────────────────────────────\n\n  1 failed\n    [mobile] › e2e/account-link-visual.spec.ts:6:1 › account linking states @visual ────────────────\n  10 passed (27.6s)\nerror Command failed with exit code 1.\ninfo Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.",
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
G8 privacy-leak: pulado
G9 a11y: pulado
G10 mobile-layout: pulado
G11 visual-regression: ok
G12 lighthouse: pulado
G13 secrets: ok

## Diff
```diff
diff --git a/app/e2e/account-link-visual.spec.ts b/app/e2e/account-link-visual.spec.ts
index 9860461..9eedb82 100644
--- a/app/e2e/account-link-visual.spec.ts
+++ b/app/e2e/account-link-visual.spec.ts
@@ -26,7 +26,7 @@ test('account linking states @visual', async ({ freshUserPage: page }, testInfo)
   await expect(page.getByRole('status')).toContainText('Processando');
   await capture('google-loading');
   await popup.close();
-  await expect(page.getByRole('alert')).toContainText('cancelada');
+  await expect(page.getByRole('alert')).toContainText('cancelada', { timeout: 15_000 });
   await capture('google-error');
 
   await page.getByRole('button', { name: /enviar link mágico/i }).click();
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
