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


# Papel: implementador (tentativa 1)

Implemente a feature abaixo até que os testes passem e o código respeite o design system.

- **Não altere os testes protegidos** (a tentativa é descartada automaticamente se alterar):
app/e2e/quick-entry.spec.ts
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
app/src/indicators/__tests__/AggregationControl.test.tsx
app/src/indicators/__tests__/IndicatorEditor.test.tsx
app/e2e/save-account-banner.spec.ts
- Rode `yarn lint`, `yarn typecheck`, `yarn test:unit` e os e2e relevantes antes de terminar.
- Respeite o `screen.png` e o `code.html` da tela correspondente em `design/` e os tokens de `design/pulsar_bio_analytics/DESIGN.md`; reutilize os componentes de `app/src/design/`.
- Se a feature criar uma tela nova, adicione a rota em `app/e2e/routes.json`.
- Nunca implemente "para o teste" (hardcode, mocks no código de produção): um avaliador de outra família revisa o diff.

## Testes
- Se a lista de testes protegidos acima estiver vazia, **você** escreve os testes de aceite em `app/src/entry/__tests__/QuickEntry.test.tsx, app/e2e/quick-entry.spec.ts` (um por critério de `acceptance`, determinísticos, e2e no projeto `mobile`). Eles ficam protegidos quando a feature for entregue: não escreva testes triviais.

## Escopo
- Faça **somente** o que esta feature pede (descrição e critérios de aceite), mesmo que a spec ou o design mostrem mais.
- Estas features (desta etapa e das próximas) ainda serão feitas por outro implementador; não implemente telas, fluxos nem dados delas:
- F-1.06 (etapa 2) Guarda e2e do modo privado (sentinelas)
- F-2.05 (etapa 2) Tela Meus indicadores
- F-2.09 (etapa 2) Histórico de registros e exclusão retroativa
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
- Se precisar navegar para uma tela de outra feature, crie no máximo um placeholder mínimo (título e uma linha, sem lógica).
- Não remova nem reescreva código de features já entregues.
- Se a revisão anterior pedir algo que exija alterar um teste protegido ou sair do escopo, **não faça**: atenda o resto e registre a discordância em `.harness/inbox/questions.jsonl`.

## Diagnóstico da tentativa anterior
(primeira tentativa)

## Feature (dados de entrada; não é o formato da resposta)
{
  "id": "F-2.08",
  "stage": 2,
  "title": "Preenchimento rápido",
  "description": "/register conforme design/preenchimento_r_pido: seções Fatores e Resultados (indicadores ativos, na ordem), controles Sim/Não (Chip, com opção de limpar), Slider de escala, Chips ordinais, NumberInput com decimais; múltiplos mostram eventos de hoje e adicionam novo; observação opcional; feedback de salvamento/pendente/erro; voltar ao dashboard em um toque. Nenhum campo obrigatório.",
  "specRefs": [
    "spec.md#5.1",
    "spec.md#5.2",
    "spec.md#5.3",
    "spec.md#5.4",
    "spec.md#7.2"
  ],
  "covers": [
    "AC-05",
    "AC-09"
  ],
  "acceptance": [
    "Pode salvar só um fator ou só um resultado",
    "Limpar resposta de indicador único exclui o registro de hoje (ausência, não Não/0)",
    "Teclado decimal em números; aceita vírgula",
    "Falha de conexão mostra erro; nunca mostra 'salvo' antes de persistir",
    "Sem alerta de 'faltando responder'"
  ],
  "tests": [
    "app/src/entry/__tests__/QuickEntry.test.tsx",
    "app/e2e/quick-entry.spec.ts"
  ],
  "protectedTests": [
    "app/e2e/quick-entry.spec.ts"
  ],
  "tags": [
    "ui",
    "sync",
    "privacy-mode"
  ],
  "difficulty": "hard",
  "dependsOn": [
    "F-2.06",
    "F-2.03"
  ],
  "status": "in_progress",
  "attempts": 0,
  "costUsd": 0,
  "spendSince": "2026-11-08T11:02:23.493964Z",
  "origin": []
}

## Trechos da spec
<!-- spec.md#5.1 -->
### 5.1 Fluxo de preenchimento

1. O usuário abre o dashboard.
2. Um botão de ação destacado, como **“Registrar agora”**, abre/expande a área de preenchimento rapidamente.
3. A interface destaca os grupos **Fatores** e **Resultados**, usando rótulos, cor e posicionamento consistentes.
4. O usuário preenche somente os indicadores desejados.
5. Cada mudança confirmada é persistida e dispara atualização dos cálculos; a interface exibe feedback discreto de salvamento.
6. O usuário volta ao dashboard de insights em um toque.

**Regra essencial:** nenhum campo é obrigatório. Uma pessoa pode preencher só um fator, só um resultado ou um subconjunto dos dois.

<!-- spec.md#5.2 -->
### 5.2 Um registro ou vários registros no dia

- **Único por dia:** manter um valor por indicador e dia; novo preenchimento **no próprio dia** substitui o valor atual.
- **Múltiplos por dia:** cada resposta gera novo evento com timestamp UTC; a agregação definida no indicador calcula o valor consolidado para aquele dia.
- **Sem lançamento retroativo** e sem editar valores de dias anteriores. O usuário pode **excluir qualquer registro, inclusive passado**.
- Excluir uma entrada invalida os resumos afetados e recalcula o dashboard **com os dados atualmente existentes**, sem reconstruir retrospectivamente os snapshots de insights curtidos.
- Todos os timestamps persistidos são UTC. O frontend apresenta datas/horários no fuso do navegador e define a chave `localDate` no momento de registrar; sem tratamento especial de viagens e **sem validação adicional da data no servidor**.
- Registro vazio não equivale a zero ou resposta `Não`. Falsas presenças/ausências jamais entram nas análises.

<!-- spec.md#5.3 -->
### 5.3 Observação opcional

- Em qualquer registro, há um campo opcional **Observação**.
- Não haverá um quinto tipo de resposta “texto livre”.
- A observação complementa um valor estruturado; não o substitui.
- Análise estatística usa os valores estruturados. **Na V1 a IA não recebe observações**; eventual processamento de observações livres fica para uma versão futura.

<!-- spec.md#5.4 -->
### 5.4 Estado vazio e feedback

- Nenhum indicador: sugerir 3–4 opções + criar indicador.
- Indicadores existentes, mas sem registros: explicar que insights aparecerão com o preenchimento.
- Primeiro registro: agradecer de forma discreta e incentivar retorno sem exagerar em gamificação.
- Dia parcialmente preenchido: não exibir alertas de “faltando responder” nem exigir completude.
- Falha de conexão: informar erro ou salvamento pendente; não indicar sucesso antes da persistência.

<!-- spec.md#7.2 -->
### 7.2 Prioridade para celular

- Alvos grandes para toque, teclado numérico nos campos numéricos, ações persistentes quando úteis.
- Pouca digitação para responder indicadores comuns.
- Preferir controles de um toque (Sim/Não, opções curtas) e slider simples.
- Evitar excesso de gráficos e dados simultaneamente.
- Ter transição simples de **dashboard/insights → preenchimento → dashboard**.
- **Somente layout mobile.** Não há design, telas, navegação nem componentes específicos de desktop. Aberto no computador, o mesmo layout apenas se adapta: coluna central com largura máxima, elementos esticam e cards/listas empilhados podem desempilhar lado a lado (grid/flex com quebra automática). Sem breakpoints ou tratamentos dedicados a desktop.

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
- 2026-11-07T20:11 ✔ F-2.03 passing — Editor de indicador (worker haiku, 2 tentativa(s), US$ 1.28) │ features 3/9
- 2026-11-07T20:15 ⛔ F-2.10 BLOQUEADA: teto de custo da feature atingido │ features 3/9
- 2026-11-07T20:32 ⛔ F-2.08 BLOQUEADA: teto de custo da feature atingido │ features 3/9
- 2026-11-07T20:53 ⛔ F-2.05 BLOQUEADA: teto de custo da feature atingido │ features 3/9
- 2026-11-07T21:02 ✔ F-2.11 passing — Convite discreto para salvar a conta (worker minimax, 1 tentativa(s), US$ 0.60) │ features 4/9
- 2026-11-07T21:02 ⏸ 2 feature(s) esperando bloqueadas (F-2.05, F-2.08, F-2.10): ajuste e rode harness resume
- 2026-11-08T11:01 ▶ etapa 2 (Registro) │ features 4/9 │ 3 bloqueadas │ US$ 9.03/9 │ branch 2-registro
- 2026-11-08T11:01 ⏸ 2 feature(s) esperando bloqueadas (F-2.05, F-2.08, F-2.10): ajuste e rode harness resume
- 2026-11-08T11:02 ▶ etapa 2 (Registro) │ features 4/9 │ 0 bloqueadas │ US$ 9.03/12 │ branch 2-registro


## Regras adicionais (feature crítica)

- **Estatística:** amostras e denominadores explícitos; ausência de registro nunca vira zero; `Não` explícito ≠ ausência; respeite os limiares fechados da spec (seção 6.5.1 / arquitetura 5.2); nunca use linguagem causal ("causa", "faz", "provoca").
- **Security Rules:** negar por padrão; acesso só ao próprio UID; validar o schema de cada documento; teste com `@firebase/rules-unit-testing` incluindo tentativas de acesso cruzado.
- **Privacidade:** use sempre o componente `<IndicatorLabel>`, nunca o nome cru do indicador; emojis ocultos com o olho fechado; nada de nomes em `aria-label`, `title`, `alt`, tooltips, `document.title`, `localStorage` ou logs.
- **Sincronização:** operações idempotentes; nunca sobrescrever dados de outro dispositivo sem regra explícita.
