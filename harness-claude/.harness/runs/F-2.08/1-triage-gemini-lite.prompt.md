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
### G4 unit
epository.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/privacy/__tests__/label.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m src/account/__tests__/invite.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m src/lib/__tests__/testHelper.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m✓[39m src/__tests__/scaffold.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 558[2mms[22m[39m
   [33m[2m✓[22m[39m lint boundary for src/stats[2m > [22mrejects import { initializeApp } from 'firebase/app'; (firebase subpath) [33m 509[2mms[22m[39m
 [32m✓[39m src/indicators/__tests__/IndicatorEditor.test.tsx [2m([22m[2m19 tests[22m[2m)[22m[33m 2488[2mms[22m[39m
   [33m[2m✓[22m[39m F-2.03 IndicatorEditor: the four response types[2m > [22mcreates an ordinal factor with editable options and a limited set [33m 462[2mms[22m[39m

[31m⎯⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Tests 1 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m

[41m[1m FAIL [22m[49m src/entry/__tests__/QuickEntry.test.tsx[2m > [22mF-2.08 QuickEntry (preenchimento rápido)[2m > [22mnever alerts about missing answers; the optional note travels with the entry
[31m[1mAssertionError[22m: expected 'Salvamento automático ativoPronto par…' not to match /faltando|preencha|obrigat/i[39m

[32m- Expected:[39m 
/faltando|preencha|obrigat/i

[31m+ Received:[39m 
"Salvamento automático ativoPronto para registrarRegistro de Hoje8 de novembro de 2026Nenhum campo é obrigatório. Responda apenas o que quiser registrar agora em poucos toques.FatoresO que fiz, consumi ou viviEXESimNãoResultadosComo fiquei ou o que percebi/mediObservação do dia (opcional)A observação acompanha os próximos registros e não afeta o cálculo estatístico.Voltar ao Dashboard"

[36m [2m❯[22m src/entry/__tests__/QuickEntry.test.tsx:[2m376:49[22m[39m
    [90m374| [39m    [90m// Partially filled day: no completeness alert anywhere (spec 5.4).[39m
    [90m375| [39m    [34mexpect[39m(screen[33m.[39m[34mqueryByRole[39m([32m'alert'[39m))[33m.[39m[34mtoBeNull[39m()[33m;[39m
    [90m376| [39m    expect(document.body.textContent ?? '').not.toMatch(/faltando|pree…
    [90m   | [39m                                                [31m^[39m
    [90m377| [39m    expect(screen.getByText(/nenhum campo é obrigatório/i)).toBeInTheD…
    [90m378| [39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯[22m[39m


[2m Test Files [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m22 passed[39m[22m[90m (23)[39m
[2m      Tests [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m192 passed[39m[22m[90m (193)[39m
[2m   Start at [22m 08:04:46
[2m   Duration [22m 3.48s[2m (transform 776ms, setup 3.79s, collect 1.69s, tests 5.78s, environment 6.58s, prepare 1.32s)[22m

error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

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

### G8 privacy-leak
servidor não respondeu em http://localhost:4792 (yarn e2e:serve)

### G9 a11y
servidor não respondeu em http://localhost:4792 (yarn e2e:serve)

### G10 mobile-layout
servidor não respondeu em http://localhost:4792 (yarn e2e:serve)

## Final da resposta do implementador
```json
{
  "summary": "Preenchimento rápido implementado; validação incompleta.",
  "filesChanged": ["app/src/App.tsx", "app/src/data/entries.ts", "app/src/design/NumberInput.tsx", "app/src/entry/QuickEntry.tsx", "app/src/entry/__tests__/QuickEntry.extra.test.tsx", "app/src/pages/QuickEntryPage.tsx", ".harness/inbox/questions.jsonl"],
  "testsRun": "Lint, typecheck e formatação passaram. Unitários: 192/193 passaram com ajuste de ambiente. E2E não iniciou.",
  "confidence": "low",
  "notes": "Um teste unitário tem asserções contraditórias. O ambiente bloqueou as portas dos emuladores. Ambos os impedimentos foram registrados."
}
```

Responda SOMENTE com o bloco ```json:
{"causaRaiz": "…", "categoria": "test|type|lint|logic|env|flaky|design", "padrao": true|false, "dica": "instrução curta e acionável para a próxima tentativa"}

`padrao: true` somente se for um erro recorrente que valha virar lição para outras features.
