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
 await card.getByRole('button', { name: 'Sim' }).click();
          |                                                     ^
      376 |
      377 |     // While the connection is down: pending state, never success (spec 5.4).
      378 |     await expect(page.getByTestId('save-feedback')).toContainText(/salvando|pendente/i);
        at /Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-2.08/pulsar-claude/app/e2e/quick-entry.spec.ts:375:53

    Error Context: test-results/quick-entry-F-2-08-quick-e-f060b-ed-until-the-write-persists-desktop/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/quick-entry-F-2-08-quick-e-f060b-ed-until-the-write-persists-desktop/trace.zip
    Usage:

        yarn playwright show-trace test-results/quick-entry-F-2-08-quick-e-f060b-ed-until-the-write-persists-desktop/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    Test timeout of 30000ms exceeded.

    Error: locator.click: Target page, context or browser has been closed
    Call log:
      - waiting for getByTestId('quick-entry-card-ind_exercise').getByRole('button', { name: 'Sim' })


      373 |     const card = page.getByTestId('quick-entry-card-ind_exercise');
      374 |     await page.context().setOffline(true);
    > 375 |     await card.getByRole('button', { name: 'Sim' }).click();
          |                                                     ^
      376 |
      377 |     // While the connection is down: pending state, never success (spec 5.4).
      378 |     await expect(page.getByTestId('save-feedback')).toContainText(/salvando|pendente/i);
        at /Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-2.08/pulsar-claude/app/e2e/quick-entry.spec.ts:375:53

    Error Context: test-results/quick-entry-F-2-08-quick-e-f060b-ed-until-the-write-persists-desktop-retry1/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/quick-entry-F-2-08-quick-e-f060b-ed-until-the-write-persists-desktop-retry1/trace.zip
    Usage:

        yarn playwright show-trace test-results/quick-entry-F-2-08-quick-e-f060b-ed-until-the-write-persists-desktop-retry1/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  2 failed
    [mobile] › e2e/quick-entry.spec.ts:365:3 › F-2.08 quick entry (/register) › offline answers stay pending (never "saved") until the write persists 
    [desktop] › e2e/quick-entry.spec.ts:365:3 › F-2.08 quick entry (/register) › offline answers stay pending (never "saved") until the write persists 
  12 passed (1.3m)
error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

## Final da resposta do implementador
```json
{
  "summary": "Preenchimento rápido ajustado para conflitos entre dispositivos e virada do dia.",
  "filesChanged": [
    "app/src/data/entries.ts",
    "app/src/data/__tests__/entries-concurrency.test.ts",
    "app/src/design/Slider.tsx",
    "app/src/entry/QuickEntry.tsx",
    "app/src/entry/__tests__/QuickEntry.extra.test.tsx",
    "app/src/pages/QuickEntryPage.tsx",
    ".harness/inbox/questions.jsonl",
    ".harness/inbox/risks.jsonl"
  ],
  "testsRun": "Lint, typecheck, format, builds e 204 testes unitários passaram. E2E bloqueado por EPERM em localhost.",
  "confidence": "low",
  "notes": "Execute yarn test:e2e em ambiente com acesso às portas locais."
}
```

Responda SOMENTE com o bloco ```json:
{"causaRaiz": "…", "categoria": "test|type|lint|logic|env|flaky|design", "padrao": true|false, "dica": "instrução curta e acionável para a próxima tentativa"}

`padrao: true` somente se for um erro recorrente que valha virar lição para outras features.
