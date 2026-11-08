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

Os testes abaixo foram escritos **antes** do código da feature F-2.08 Preenchimento rápido e rodados uma vez. Falhar agora é o esperado **quando** a falha vem do que a feature ainda vai implementar (tela, texto, botão, função ou módulo inexistente).

Decida se algum teste está **quebrado por si só**, ou seja, nunca vai passar mesmo com uma implementação correta. Exemplos:
- helper do teste chamando uma API do emulador ou de infraestrutura que não existe ou responde 404/405 (ex.: `GET /emulator/v1/.../accounts`);
- assert em resposta de API externa ou do emulador que falha antes de qualquer interação com o app;
- dado que o emulador normaliza (e-mail em minúsculas, ids) comparado de forma literal;
- erro de sintaxe, import de pacote inexistente, seletor ou fixture do próprio teste inválido;
- dependência de telas ou fluxos de features ainda não feitas (lista abaixo).

Features ainda não feitas (o teste não pode depender delas):
- F-1.06 (etapa 2) Guarda e2e do modo privado (sentinelas)
- F-2.05 (etapa 2) Tela Meus indicadores
- F-2.09 (etapa 2) Histórico de registros e exclusão retroativa
- F-2.10 (etapa 2) Dashboard vazio com sugestões
- F-2.11 (etapa 2) Convite discreto para salvar a conta
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
$ yarn -s test:e2e e2e/quick-entry.spec.ts
8:25

    Error Context: test-results/quick-entry-F-2-08-quick-e-f1ac5--accept-the-comma-separator-desktop/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/quick-entry-F-2-08-quick-e-f1ac5--accept-the-comma-separator-desktop/trace.zip
    Usage:

        yarn playwright show-trace test-results/quick-entry-F-2-08-quick-e-f1ac5--accept-the-comma-separator-desktop/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  13) [desktop] › e2e/quick-entry.spec.ts:333:3 › F-2.08 quick entry (/register) › multiple-per-day indicators list today events and append new ones 

    Error: expect(locator).toHaveCount(expected) failed

    Locator:  getByTestId('quick-entry-card-ind_coffee').getByTestId('entry-event')
    Expected: 1
    Received: 0
    Timeout:  5000ms

    Call log:
      - Expect "toHaveCount" getByTestId('quick-entry-card-ind_coffee').getByTestId('entry-event') with timeout 5000ms
      - waiting for getByTestId('quick-entry-card-ind_coffee').getByTestId('entry-event')
        14 × locator resolved to 0 elements
           - unexpected value "0"


      346 |     const card = page.getByTestId('quick-entry-card-ind_coffee');
      347 |     const events = card.getByTestId('entry-event');
    > 348 |     await expect(events).toHaveCount(1);
          |                          ^
      349 |     await expect(events.first()).toContainText('1');
      350 |
      351 |     // A new answer adds a new event for today (spec 5.2), it does not edit the old one.
        at /Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-2.08/pulsar-claude/app/e2e/quick-entry.spec.ts:348:26

    Error Context: test-results/quick-entry-F-2-08-quick-e-47810--events-and-append-new-ones-desktop/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/quick-entry-F-2-08-quick-e-47810--events-and-append-new-ones-desktop/trace.zip
    Usage:

        yarn playwright show-trace test-results/quick-entry-F-2-08-quick-e-47810--events-and-append-new-ones-desktop/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  14) [desktop] › e2e/quick-entry.spec.ts:365:3 › F-2.08 quick entry (/register) › offline answers stay pending (never "saved") until the write persists 

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

    Error Context: test-results/quick-entry-F-2-08-quick-e-f060b-ed-until-the-write-persists-desktop/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/quick-entry-F-2-08-quick-e-f060b-ed-until-the-write-persists-desktop/trace.zip
    Usage:

        yarn playwright show-trace test-results/quick-entry-F-2-08-quick-e-f060b-ed-until-the-write-persists-desktop/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  14 failed
    [mobile] › e2e/quick-entry.spec.ts:196:3 › F-2.08 quick entry (/register) › groups the active indicators under Fatores/Resultados in order and hides archived 
    [mobile] › e2e/quick-entry.spec.ts:234:3 › F-2.08 quick entry (/register) › saves only one factor, persists with the local day key and returns in one touch 
    [mobile] › e2e/quick-entry.spec.ts:270:3 › F-2.08 quick entry (/register) › saves only one result from the scale pills 
    [mobile] › e2e/quick-entry.spec.ts:289:3 › F-2.08 quick entry (/register) › clearing a single-per-day answer removes today record (absence, not Não/0) 
    [mobile] › e2e/quick-entry.spec.ts:309:3 › F-2.08 quick entry (/register) › numeric fields use the decimal keyboard and accept the comma separator 
    [mobile] › e2e/quick-entry.spec.ts:333:3 › F-2.08 quick entry (/register) › multiple-per-day indicators list today events and append new ones 
    [mobile] › e2e/quick-entry.spec.ts:365:3 › F-2.08 quick entry (/register) › offline answers stay pending (never "saved") until the write persists 
    [desktop] › e2e/quick-entry.spec.ts:196:3 › F-2.08 quick entry (/register) › groups the active indicators under Fatores/Resultados in order and hides archived 
    [desktop] › e2e/quick-entry.spec.ts:234:3 › F-2.08 quick entry (/register) › saves only one factor, persists with the local day key and returns in one touch 
    [desktop] › e2e/quick-entry.spec.ts:270:3 › F-2.08 quick entry (/register) › saves only one result from the scale pills 
    [desktop] › e2e/quick-entry.spec.ts:289:3 › F-2.08 quick entry (/register) › clearing a single-per-day answer removes today record (absence, not Não/0) 
    [desktop] › e2e/quick-entry.spec.ts:309:3 › F-2.08 quick entry (/register) › numeric fields use the decimal keyboard and accept the comma separator 
    [desktop] › e2e/quick-entry.spec.ts:333:3 › F-2.08 quick entry (/register) › multiple-per-day indicators list today events and append new ones 
    [desktop] › e2e/quick-entry.spec.ts:365:3 › F-2.08 quick entry (/register) › offline answers stay pending (never "saved") until the write persists 

```

Responda SOMENTE com o bloco ```json:
{"testeQuebrado": true|false, "motivo": "qual teste/linha e por quê (vazio se false)"}
