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


# Papel: checagem dos testes de aceite recém-escritos

Os testes abaixo foram escritos **antes** do código da feature F-2.09 Histórico de registros e exclusão retroativa e rodados uma vez. Falhar agora é o esperado **quando** a falha vem do que a feature ainda vai implementar (tela, texto, botão, função ou módulo inexistente).

Decida se algum teste está **quebrado por si só**, ou seja, nunca vai passar mesmo com uma implementação correta. Exemplos:
- helper do teste chamando uma API do emulador ou de infraestrutura que não existe ou responde 404/405 (ex.: `GET /emulator/v1/.../accounts`);
- assert em resposta de API externa ou do emulador que falha antes de qualquer interação com o app;
- dado que o emulador normaliza (e-mail em minúsculas, ids) comparado de forma literal;
- erro de sintaxe, import de pacote inexistente, seletor ou fixture do próprio teste inválido;
- dependência de telas ou fluxos de features ainda não feitas (lista abaixo).

Features ainda não feitas (o teste não pode depender delas):
- F-1.06 (etapa 2) Guarda e2e do modo privado (sentinelas)
- F-2.08 (etapa 2) Preenchimento rápido
- F-2.10 (etapa 2) Dashboard vazio com sugestões
- F-3.01 (etapa 3) Estatística: agregação diária e séries da janela
- F-3.02 (etapa 3) Estatística: retrato do dia, comparação entre dias e distribuições ordinais
- F-3.03 (etapa 3) Estatística: tendências de Resultados
- F-3.04 (etapa 3) Estatística: associações com fator booleano
- F-3.05 (etapa 3) Estatística: Spearman fator numérico x resultado numérico
- F-3.06 (etapa 3) Seleção de insights (até 5 cartões) e versões de evidência
- F-3.07 (etapa 3) Textos determinísticos dos insights (templates pt-BR)
- F-3.08 (etapa 3) Motor de recálculo no cliente
- F-3.09 (etapa 3) Dashboard com insights
- F-3.10 (etapa 3) Cartão de insight e mini gráficos
- F-3.11 (etapa 3) Detalhes do insight (Entender análise)
- F-3.12 (etapa 3) Regra de evidência nova material após dislike
- F-4.01 (etapa 4) Dados de curadoria: like, dislike e snapshots
- F-4.02 (etapa 4) Regras: snapshots e feedback
- F-4.03 (etapa 4) Dislikes no recálculo: ocultar e permitir retorno com evidência nova
- F-4.04 (etapa 4) Like e dislike nos cartões
- F-4.05 (etapa 4) Conclusões salvas (timeline)
- F-5.01 (etapa 5) PWA instalável sem offline
- F-5.02 (etapa 5) Convite interno para instalar
- F-5.03 (etapa 5) Opt-in do lembrete e token FCM
- F-5.04 (etapa 5) Function agendada do lembrete das 20h
- F-5.05 (etapa 5) Roteiro de testes manuais Chrome/Android e Safari/iPhone
- F-6.01 (etapa 6) Consentimento da IA
- F-6.02 (etapa 6) Function generateInsightTexts com quota diária
- F-6.03 (etapa 6) Integração da IA no dashboard com cache e fallback
- F-6.04 (etapa 6) Validação de saída da IA
- F-6.05 (etapa 6) Regras: cache de textos da IA
- F-7.01 (etapa 7) Guardas de escopo
- F-7.02 (etapa 7) Auditoria de layout mobile e esticado no desktop
- F-7.03 (etapa 7) Roteiro de validação humana do design
- F-7.04 (etapa 7) Jornadas ponta a ponta com seed e usuários novos
- F-7.05 (etapa 7) Endurecimento de regras e hosting
- F-7.06 (etapa 7) Orçamento de bundle e fonte de ícones

## Saída da execução
```
$ yarn -s test:e2e e2e/entry-history.spec.ts
ees/F-2.09/pulsar-claude/app/e2e/entry-history.spec.ts:173:21

    Error Context: test-results/entry-history-F-2-09-entry-c5b52-ate-note-revealed-on-demand-mobile/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/entry-history-F-2-09-entry-c5b52-ate-note-revealed-on-demand-mobile/trace.zip
    Usage:

        yarn playwright show-trace test-results/entry-history-F-2-09-entry-c5b52-ate-note-revealed-on-demand-mobile/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  2) [mobile] › e2e/entry-history.spec.ts:194:3 › F-2.09 entry history › confirms deletion of past and current entries, keeps other entries, and persists after reload 

    Test timeout of 30000ms exceeded.

    Error: locator.click: Target page, context or browser has been closed
    Call log:
      - waiting for getByRole('dialog').getByRole('button', { name: /hist[oó]rico/i }).or(getByRole('dialog').getByRole('link', { name: /hist[oó]rico/i })).first()


      120 |       .or(options.getByRole('link', { name: /hist[oó]rico/i }))
      121 |       .first()
    > 122 |       .click();
          |        ^
      123 |   }
      124 |   const historyDialog = page.getByRole('dialog', { name: /hist[oó]rico/i });
      125 |   if (await historyDialog.isVisible()) return historyDialog;
        at openHistory (/Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-2.09/pulsar-claude/app/e2e/entry-history.spec.ts:122:8)
        at /Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-2.09/pulsar-claude/app/e2e/entry-history.spec.ts:200:19

    Error Context: test-results/entry-history-F-2-09-entry-30f6e-s-and-persists-after-reload-mobile/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/entry-history-F-2-09-entry-30f6e-s-and-persists-after-reload-mobile/trace.zip
    Usage:

        yarn playwright show-trace test-results/entry-history-F-2-09-entry-30f6e-s-and-persists-after-reload-mobile/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  3) [mobile] › e2e/entry-history.spec.ts:230:3 › F-2.09 entry history › offers no control to edit a past value 

    Test timeout of 30000ms exceeded.

    Error: locator.click: Target page, context or browser has been closed
    Call log:
      - waiting for getByRole('dialog').getByRole('button', { name: /hist[oó]rico/i }).or(getByRole('dialog').getByRole('link', { name: /hist[oó]rico/i })).first()


      120 |       .or(options.getByRole('link', { name: /hist[oó]rico/i }))
      121 |       .first()
    > 122 |       .click();
          |        ^
      123 |   }
      124 |   const historyDialog = page.getByRole('dialog', { name: /hist[oó]rico/i });
      125 |   if (await historyDialog.isVisible()) return historyDialog;
        at openHistory (/Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-2.09/pulsar-claude/app/e2e/entry-history.spec.ts:122:8)
        at /Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-2.09/pulsar-claude/app/e2e/entry-history.spec.ts:233:21

    Error Context: test-results/entry-history-F-2-09-entry-f32a1-ontrol-to-edit-a-past-value-mobile/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/entry-history-F-2-09-entry-f32a1-ontrol-to-edit-a-past-value-mobile/trace.zip
    Usage:

        yarn playwright show-trace test-results/entry-history-F-2-09-entry-f32a1-ontrol-to-edit-a-past-value-mobile/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  4) [desktop] › e2e/entry-history.spec.ts:242:3 › F-2.09 entry history › history opens without breaking on desktop 

    Test timeout of 30000ms exceeded.

    Error: locator.click: Target page, context or browser has been closed
    Call log:
      - waiting for getByRole('dialog').getByRole('button', { name: /hist[oó]rico/i }).or(getByRole('dialog').getByRole('link', { name: /hist[oó]rico/i })).first()


      120 |       .or(options.getByRole('link', { name: /hist[oó]rico/i }))
      121 |       .first()
    > 122 |       .click();
          |        ^
      123 |   }
      124 |   const historyDialog = page.getByRole('dialog', { name: /hist[oó]rico/i });
      125 |   if (await historyDialog.isVisible()) return historyDialog;
        at openHistory (/Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-2.09/pulsar-claude/app/e2e/entry-history.spec.ts:122:8)
        at /Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-2.09/pulsar-claude/app/e2e/entry-history.spec.ts:247:21

    Error Context: test-results/entry-history-F-2-09-entry-07d34-without-breaking-on-desktop-desktop/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/entry-history-F-2-09-entry-07d34-without-breaking-on-desktop-desktop/trace.zip
    Usage:

        yarn playwright show-trace test-results/entry-history-F-2-09-entry-07d34-without-breaking-on-desktop-desktop/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  4 failed
    [mobile] › e2e/entry-history.spec.ts:167:3 › F-2.09 entry history › shows each value and browser-local date and time, with a private note revealed on demand 
    [mobile] › e2e/entry-history.spec.ts:194:3 › F-2.09 entry history › confirms deletion of past and current entries, keeps other entries, and persists after reload 
    [mobile] › e2e/entry-history.spec.ts:230:3 › F-2.09 entry history › offers no control to edit a past value 
    [desktop] › e2e/entry-history.spec.ts:242:3 › F-2.09 entry history › history opens without breaking on desktop 
  4 passed (52.2s)

```

Responda SOMENTE com o bloco ```json:
{"testeQuebrado": true|false, "motivo": "qual teste/linha e por quê (vazio se false)"}
