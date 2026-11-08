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

Resuma a causa raiz da falha dos gates da feature F-2.fix-3 Suíte completa da etapa falhou nos gates G6, G11. Não edite arquivos.

## Gates que falharam
### G11 visual-regression
oContainText(expected) failed

    Locator: getByRole('alert')
    Expected substring: "cancelada"
    Timeout: 5000ms
    Error: element(s) not found

    Call log:
      - Expect "toContainText" getByRole('alert') with timeout 5000ms
      - waiting for getByRole('alert')


      27 |   await capture('google-loading');
      28 |   await popup.close();
    > 29 |   await expect(page.getByRole('alert')).toContainText('cancelada');
         |                                         ^
      30 |   await capture('google-error');
      31 |
      32 |   await page.getByRole('button', { name: /enviar link mágico/i }).click();
        at /Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-2.fix-3/pulsar-claude/app/e2e/account-link-visual.spec.ts:29:41

    Error Context: test-results/account-link-visual-account-linking-states-visual-mobile/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/account-link-visual-account-linking-states-visual-mobile/trace.zip
    Usage:

        yarn playwright show-trace test-results/account-link-visual-account-linking-states-visual-mobile/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    Error: expect(locator).toContainText(expected) failed

    Locator: getByRole('alert')
    Expected substring: "cancelada"
    Timeout: 5000ms
    Error: element(s) not found

    Call log:
      - Expect "toContainText" getByRole('alert') with timeout 5000ms
      - waiting for getByRole('alert')


      27 |   await capture('google-loading');
      28 |   await popup.close();
    > 29 |   await expect(page.getByRole('alert')).toContainText('cancelada');
         |                                         ^
      30 |   await capture('google-error');
      31 |
      32 |   await page.getByRole('button', { name: /enviar link mágico/i }).click();
        at /Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-2.fix-3/pulsar-claude/app/e2e/account-link-visual.spec.ts:29:41

    Error Context: test-results/account-link-visual-account-linking-states-visual-mobile-retry1/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/account-link-visual-account-linking-states-visual-mobile-retry1/trace.zip
    Usage:

        yarn playwright show-trace test-results/account-link-visual-account-linking-states-visual-mobile-retry1/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  1 failed
    [mobile] › e2e/account-link-visual.spec.ts:6:1 › account linking states @visual ────────────────
  10 passed (28.8s)
error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

## Final da resposta do implementador
Bloqueada: faltam dependências; `yarn lint` falhou com `eslint: command not found`. O bloqueio foi registrado para o orquestrador. Nenhum código ou teste protegido foi alterado.

```json
{"summary":"Bloqueada por infraestrutura","filesChanged":[".harness/inbox/questions.jsonl"],"testsRun":["yarn lint: falhou"],"confidence":"low","notes":"Dependências precisam ser preparadas antes de retomar."}
```

Responda SOMENTE com o bloco ```json:
{"causaRaiz": "…", "categoria": "test|type|lint|logic|env|flaky|design", "padrao": true|false, "dica": "instrução curta e acionável para a próxima tentativa"}

`padrao: true` somente se for um erro recorrente que valha virar lição para outras features.
