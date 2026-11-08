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


# Papel: implementador (tentativa 2)

Implemente a feature abaixo até que os testes passem e o código respeite o design system.

- **Não altere os testes protegidos** (a tentativa é descartada automaticamente se alterar):
app/e2e/empty-dashboard.spec.ts
app/src/__tests__/scaffold.test.ts
app/src/design/__tests__/design-system.f002.test.tsx
app/e2e/routes.spec.ts
app/e2e/visual.spec.ts
app/src/lib/__tests__/time.test.ts
app/src/domain/__tests__/indicator.test.ts
app/tests/rules/users.test.ts
app/e2e/anonymous-start.spec.ts
app/functions/src/__tests__/setup.test.ts
app/functions/src/__tests__/deleteAccount.test.ts
app/e2e/app-shell.spec.ts
app/e2e/fixtures.spec.ts
app/e2e/onboarding.spec.ts
app/e2e/account-link.spec.ts
app/e2e/account-delete.spec.ts
app/e2e/initial-session-loading.spec.ts
app/src/__tests__/initial-session-loading.test.tsx
app/tests/rules/indicators.test.ts
app/src/data/__tests__/entries.test.ts
app/tests/rules/entries.test.ts
- Testes de features já entregues: pode acrescentar casos, mas não remova, renomeie nem enfraqueça os existentes:
app/src/lib/__tests__/firebase.test.ts
app/e2e/design.spec.ts
app/src/__tests__/designRoute.test.tsx
app/tests/rules/usersAdminFields.test.ts
app/src/domain/__tests__/entry.test.ts
app/src/auth/__tests__/AuthProvider.test.tsx
app/src/lib/__tests__/testHelper.test.ts
app/src/app/__tests__/AppShell.test.tsx
app/src/auth/__tests__/userRepository.test.ts
app/e2e/account-link-visual.spec.ts
app/src/auth/__tests__/linkAccount.test.ts
app/e2e/account-delete-reauth.spec.ts
app/src/data/__tests__/indicators.test.ts
app/tests/rules/indicator-lock-transition.test.ts
app/tests/rules/entry-validation-extra.test.ts
- Rode `yarn lint`, `yarn typecheck`, `yarn test:unit` e os e2e relevantes antes de terminar.
- Respeite o `screen.png` e o `code.html` da tela correspondente em `design/` e os tokens de `design/pulsar_bio_analytics/DESIGN.md`; reutilize os componentes de `app/src/design/`.
- Se a feature criar uma tela nova, adicione a rota em `app/e2e/routes.json`.
- Nunca implemente "para o teste" (hardcode, mocks no código de produção): um avaliador de outra família revisa o diff.

## Testes
- Se a lista de testes protegidos acima estiver vazia, **você** escreve os testes de aceite em `app/e2e/empty-dashboard.spec.ts` (um por critério de `acceptance`, determinísticos, e2e no projeto `mobile`). Eles ficam protegidos quando a feature for entregue: não escreva testes triviais.

## Escopo
- Faça **somente** o que esta feature pede (descrição e critérios de aceite), mesmo que a spec ou o design mostrem mais.
- Estas features (desta etapa e das próximas) ainda serão feitas por outro implementador; não implemente telas, fluxos nem dados delas:
- F-1.06 (etapa 2) Guarda e2e do modo privado (sentinelas)
- F-2.03 (etapa 2) Editor de indicador
- F-2.05 (etapa 2) Tela Meus indicadores
- F-2.08 (etapa 2) Preenchimento rápido
- F-2.09 (etapa 2) Histórico de registros e exclusão retroativa
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
- Se precisar navegar para uma tela de outra feature, crie no máximo um placeholder mínimo (título e uma linha, sem lógica).
- Não remova nem reescreva código de features já entregues.
- Se a revisão anterior pedir algo que exija alterar um teste protegido ou sair do escopo, **não faça**: atenda o resto e registre a discordância em `.harness/inbox/questions.jsonl`.

## Diagnóstico da tentativa anterior
Avaliação ui reprovou (nota 7.2):
- [major]  In names mode at 375px, the suggestion titles are cut off with no ellipsis ('🏃 Exercício Fís', '☕ Café Expres', 'Concentração ,'). The text runs under the 'Adicionar' button. The mockup ends long names with an ellipsis ('Concentração ...'). → Give the text column min-w-0 and flex-1, and use truncate (text-ellipsis whitespace-nowrap overflow-hidden) on the title. Reserve the button's width with shrink-0.
- [major]  In names mode the acronym chip shows the full name with an emoji ('🏃 Exercício Físico'). This repeats the title right below it. In the mockup, the chip always holds the 3-letter acronym in label-code (EXE, CAF, ENE, CON) and the title shows the full name. The long chip also wraps ('Concentração / Foco' over 2 lines) and pushes 'Fator'/'Resultado' onto another line, so the cards end up different heights. → Keep the chip as the label-code acronym in both modes. Only the title should switch between acronym and name. Put the acronym chip and the type chip on the same row, as in the mockup.
- [minor]  In private mode the 'ENE' and 'CON' cards put the chip and 'Resultado' on separate lines, but the 'EXE' and 'CAF' cards put them on the same line. The cards end up with different heights and alignment. → Use a single chip row that wraps the same way on every card (flex-wrap gap-1), matching the mockup's '[ENE] [RESULTADO]'.
- [minor]  The header leaves out the '#PLS-xxxx | Dia 1' code. The 'Seus dados estão protegidos localmente' card at the bottom of the mockup is also missing. That card may belong to F-2.11; if so, ignore this. → Check whether the badge belongs to this feature. If it does, add the badge in the 'Bem-vindo ao Pulsar' header row.
- [minor]  The screenshots don't show the 'indicadores sem registros' state or the thanks after the first record. The visual criterion for those 2 acceptance states can't be checked here. → Make sure both states use the existing design-system components (EmptyState card / discreet toast) and pt-BR copy.

## Feature (dados de entrada; não é o formato da resposta)
{
  "id": "F-2.10",
  "stage": 2,
  "title": "Dashboard vazio com sugestões",
  "description": "Estado de conta nova (design/dashboard_inicial_estado_vazio): 3–4 sugestões de criação rápida (Exercício e Café como Fatores; Energia e Concentração como Resultados) + 'Criar meu próprio indicador'; nenhum indicador criado automaticamente. Estado 'indicadores sem registros' explica que insights virão; primeiro registro agradece discretamente.",
  "specRefs": [
    "spec.md#3.1",
    "spec.md#5.4"
  ],
  "covers": [
    "AC-01"
  ],
  "acceptance": [
    "Conta nova não tem indicadores até a pessoa tocar numa sugestão",
    "Sugestão cria o indicador com configuração determinística",
    "Estado sem registros e agradecimento do primeiro registro em pt-BR"
  ],
  "tests": [
    "app/e2e/empty-dashboard.spec.ts"
  ],
  "protectedTests": [
    "app/e2e/empty-dashboard.spec.ts"
  ],
  "tags": [
    "ui"
  ],
  "difficulty": "normal",
  "dependsOn": [
    "F-2.01",
    "F-1.07"
  ],
  "status": "in_progress",
  "attempts": 1,
  "costUsd": 0.48463936599999996,
  "origin": []
}

## Trechos da spec
<!-- spec.md#3.1 -->
### 3.1 Primeiro acesso — tutorial e configuração

Tutorial em **três telas**: (1) observe sua rotina/Fatores; (2) acompanhe seus Resultados; (3) descubra possíveis relações. Ter Próximo, Voltar e Pular; registrar conclusão do onboarding.

Na conta nova, apresentar dashboard vazio com **3–4 sugestões** de criação rápida (por exemplo, Energia e Concentração como Resultados; Exercício e Café como Fatores), mais a ação **Criar meu próprio indicador**. **Nenhum indicador é criado automaticamente**.

O convite para salvar a conta deve aparecer depois de alguma interação útil, não bloquear o uso inicial. O convite para **instalar a PWA** deve aparecer depois de alguns usos, com linguagem como “Instale o Pulsar para acessar mais rápido e receber um lembrete diário”; não prometer melhora clínica ou dos resultados medidos.

<!-- spec.md#5.4 -->
### 5.4 Estado vazio e feedback

- Nenhum indicador: sugerir 3–4 opções + criar indicador.
- Indicadores existentes, mas sem registros: explicar que insights aparecerão com o preenchimento.
- Primeiro registro: agradecer de forma discreta e incentivar retorno sem exagerar em gamificação.
- Dia parcialmente preenchido: não exibir alertas de “faltando responder” nem exigir completude.
- Falha de conexão: informar erro ou salvamento pendente; não indicar sucesso antes da persistência.

## Design
design/pulsar_bio_analytics/DESIGN.md
design/conclus_es_salvas/screen.png
design/configura_es_e_conta/screen.png
design/dashboard_dia_14_primeira_correla_o/screen.png
design/dashboard_dia_2_compara_es_iniciais/screen.png
design/dashboard_inicial_estado_vazio/screen.png
design/dashboard_insights/screen.png
design/detalhes_do_insight/screen.png
design/meus_indicadores/screen.png
design/novo_indicador_modal/screen.png
design/onboarding_1_fatores/screen.png
design/onboarding_2_resultados/screen.png
design/onboarding_3_associa_es/screen.png
design/preenchimento_r_pido/screen.png

## Progresso recente
- 2026-11-02T16:20 ✔ F-1.05 passing — Fixtures de e2e: usuário do seed e usuários novos (worker minimax, 1 tentativa(s), US$ 0.23) │ features 7/12
- 2026-11-02T16:56 ✔ F-1.04 passing — AppShell: cabeçalho com olho, navegação inferior e layout esticável (worker sonnet, 4 tentativa(s), US$ 0.69) │ features 8/12
- 2026-11-02T17:51 ✔ F-1.07 passing — Tutorial de três telas (worker minimax, 2 tentativa(s), US$ 0.47) │ features 9/12
- 2026-11-02T18:11 ⛔ F-1.06 BLOQUEADA: limite de 5 tentativas atingido │ features 9/12
- 2026-11-02T19:31 teto da etapa 1 aumentado para US$ 29 (budget.yaml)
- 2026-11-02T19:31 ▶ etapa 1 (Base) │ features 9/12 │ 1 bloqueadas │ US$ 24.87/29 │ branch 1-base
- 2026-11-02T20:34 ⛔ F-1.09 BLOQUEADA: limite de 5 tentativas atingido │ features 9/12
- 2026-11-02T20:34 ⏸ 1 feature(s) esperando bloqueadas (F-1.06, F-1.09): ajuste e rode harness resume
- 2026-11-05T09:50 ▶ etapa 1 (Base) │ features 9/11 │ 0 bloqueadas │ US$ 27.06/29 │ branch 1-base
- 2026-11-05T10:30 ⛔ F-1.09 BLOQUEADA: limite de 5 tentativas atingido │ features 9/11
- 2026-11-05T10:30 ⏸ 1 feature(s) esperando bloqueadas (F-1.09): ajuste e rode harness resume
- 2026-11-06T23:24 ▶ etapa 1 (Base) │ features 9/11 │ 0 bloqueadas │ US$ 28.41/30 │ branch 1-base
- 2026-11-06T23:42 ✔ F-1.09 passing — Conversão da conta: Google e link mágico preservando UID (worker glm-or, 1 tentativa(s), US$ 6.47) │ features 10/11
- 2026-11-07T00:12 ✖ interrompido por SIGINT em STAGE_RUNNING: rode harness resume para continuar
- 2026-11-07T00:19 ▶ etapa 1 (Base) │ features 10/11 │ 0 bloqueadas │ US$ 29.72/31 │ branch 1-base
- 2026-11-07T00:34 ✔ F-1.12 passing — Tela de conta: sair e excluir conta (worker glm-or, 3 tentativa(s), US$ 1.30) │ features 11/11
- 2026-11-07T00:39 ▶ etapa 1 (Base) │ features 11/12 │ 0 bloqueadas │ US$ 30.39/31 │ branch 1-base
- 2026-11-07T11:26 ▶ etapa 1 (Base) │ features 12/12 │ 0 bloqueadas │ US$ 30.89/31 │ branch 1-base
- 2026-11-07T11:31 ▶ etapa 1 (Base) │ features 12/13 │ 0 bloqueadas │ US$ 30.89/31 │ branch 1-base
- 2026-11-07T11:31 teto da etapa 1 aumentado para US$ 32 (budget.yaml)
- 2026-11-07T11:31 ▶ etapa 1 (Base) │ features 12/13 │ 0 bloqueadas │ US$ 30.89/32 │ branch 1-base
- 2026-11-07T11:35 ✔ F-1.fix-2 passing — Suíte completa da etapa falhou nos gates G2, G6 (worker codex-mid, 1 tentativa(s), US$ 0.24) │ features 13/13
- 2026-11-07T12:59 etapa 1: 1 ajuste(s) viraram features F-1.adj-*; rodando agora
- 2026-11-07T12:59 ▶ etapa 1 (Base) │ features 13/14 │ 0 bloqueadas │ US$ 31.53/32 │ branch 1-base
- 2026-11-07T13:06 teto da etapa 1 aumentado para US$ 33 (budget.yaml)
- 2026-11-07T13:06 ▶ etapa 1 (Base) │ features 13/14 │ 0 bloqueadas │ US$ 32.22/33 │ branch 1-base
- 2026-11-07T13:11 ✔ F-1.adj-01 passing — Remover o texto "Preparando seu espaço" durante a carga inicial (worker minimax, 1 tentativa(s), US$ 0.97) │ features 14/14
- 2026-11-07T14:24 ✔ etapa 1 aprovada · commits em 1-base
- 2026-11-07T17:58 ▶ etapa 2 (Registro) │ features 0/9 │ 0 bloqueadas │ US$ 0.00/9 │ branch 2-registro
- 2026-11-07T17:59 ⛔ F-2.01 BLOQUEADA: test_writer não produziu testes de aceite │ features 0/9
- 2026-11-07T17:59 ⏸ 8 feature(s) esperando bloqueadas (F-2.01): ajuste e rode harness resume
- 2026-11-07T18:08 ▶ etapa 2 (Registro) │ features 0/9 │ 1 bloqueadas │ US$ 0.14/9 │ branch 2-registro
- 2026-11-07T18:08 ⏸ 8 feature(s) esperando bloqueadas (F-2.01): ajuste e rode harness resume
- 2026-11-07T18:08 ▶ etapa 2 (Registro) │ features 0/9 │ 0 bloqueadas │ US$ 0.14/9 │ branch 2-registro
- 2026-11-07T18:17 ⛔ F-2.01 BLOQUEADA: sem progresso: kimi-pro e codex-mid falharam igual (gates G2); provável problema no teste, na spec ou no ambiente │ features 0/9
- 2026-11-07T18:17 ⏸ 8 feature(s) esperando bloqueadas (F-2.01): ajuste e rode harness resume
- 2026-11-07T19:25 ▶ etapa 2 (Registro) │ features 0/9 │ 0 bloqueadas │ US$ 1.44/9 │ branch 2-registro
- 2026-11-07T19:27 ✔ F-2.01 passing — Repositório e regras de indicadores (worker codex-mid, 3 tentativa(s), US$ 1.77) │ features 1/9
- 2026-11-07T19:32 ✔ F-2.06 passing — Repositório e regras de registros (worker codex-mid, 1 tentativa(s), US$ 0.56) │ features 2/9

