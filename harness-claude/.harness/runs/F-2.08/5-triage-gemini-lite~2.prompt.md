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
(nenhuma)


# Papel: triagem de falha

Resuma a causa raiz da falha dos gates da feature F-2.08 Preenchimento rápido. Não edite arquivos.

## Gates que falharam
### G6 e2e
name: 'Registrar agora' })


      198 |   }) => {
      199 |     await page.goto('/dashboard');
    > 200 |     await page.getByRole('link', { name: 'Registrar agora' }).click();
          |                                                               ^
      201 |     await expect(page).toHaveURL(/\/register$/);
      202 |
      203 |     await expect(page.getByRole('heading', { name: 'Fatores' })).toBeVisible();
        at /Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-2.08/pulsar-claude/app/e2e/quick-entry.spec.ts:200:63

    Error Context: test-results/quick-entry-F-2-08-quick-e-8455a-in-order-and-hides-archived-desktop/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/quick-entry-F-2-08-quick-e-8455a-in-order-and-hides-archived-desktop/trace.zip
    Usage:

        yarn playwright show-trace test-results/quick-entry-F-2-08-quick-e-8455a-in-order-and-hides-archived-desktop/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    Test timeout of 30000ms exceeded.

    Error: locator.click: Target page, context or browser has been closed
    Call log:
      - waiting for getByRole('link', { name: 'Registrar agora' })


      198 |   }) => {
      199 |     await page.goto('/dashboard');
    > 200 |     await page.getByRole('link', { name: 'Registrar agora' }).click();
          |                                                               ^
      201 |     await expect(page).toHaveURL(/\/register$/);
      202 |
      203 |     await expect(page.getByRole('heading', { name: 'Fatores' })).toBeVisible();
        at /Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-2.08/pulsar-claude/app/e2e/quick-entry.spec.ts:200:63

    Error Context: test-results/quick-entry-F-2-08-quick-e-8455a-in-order-and-hides-archived-desktop-retry1/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/quick-entry-F-2-08-quick-e-8455a-in-order-and-hides-archived-desktop-retry1/trace.zip
    Usage:

        yarn playwright show-trace test-results/quick-entry-F-2-08-quick-e-8455a-in-order-and-hides-archived-desktop-retry1/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  2 failed
    [mobile] › e2e/quick-entry.spec.ts:196:3 › F-2.08 quick entry (/register) › groups the active indicators under Fatores/Resultados in order and hides archived 
    [desktop] › e2e/quick-entry.spec.ts:196:3 › F-2.08 quick entry (/register) › groups the active indicators under Fatores/Resultados in order and hides archived 
  12 passed (2.4m)
error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

## Final da resposta do implementador
(retomada: código da tentativa já presente)

Responda SOMENTE com o bloco ```json:
{"causaRaiz": "…", "categoria": "test|type|lint|logic|env|flaky|design", "padrao": true|false, "dica": "instrução curta e acionável para a próxima tentativa"}

`padrao: true` somente se for um erro recorrente que valha virar lição para outras features.
