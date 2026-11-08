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
app/src/data/__tests__/entries.test.ts
app/tests/rules/entries.test.ts
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
- Rode `yarn lint`, `yarn typecheck`, `yarn test:unit` e os e2e relevantes antes de terminar.
- Respeite o `screen.png` e o `code.html` da tela correspondente em `design/` e os tokens de `design/pulsar_bio_analytics/DESIGN.md`; reutilize os componentes de `app/src/design/`.
- Se a feature criar uma tela nova, adicione a rota em `app/e2e/routes.json`.
- Nunca implemente "para o teste" (hardcode, mocks no código de produção): um avaliador de outra família revisa o diff.

## Testes
- Se a lista de testes protegidos acima estiver vazia, **você** escreve os testes de aceite em `app/src/data/__tests__/entries.test.ts, app/tests/rules/entries.test.ts` (um por critério de `acceptance`, determinísticos, e2e no projeto `mobile`). Eles ficam protegidos quando a feature for entregue: não escreva testes triviais.

## Escopo
- Faça **somente** o que esta feature pede (descrição e critérios de aceite), mesmo que a spec ou o design mostrem mais.
- Estas features (desta etapa e das próximas) ainda serão feitas por outro implementador; não implemente telas, fluxos nem dados delas:
- F-1.06 (etapa 2) Guarda e2e do modo privado (sentinelas)
- F-2.03 (etapa 2) Editor de indicador
- F-2.05 (etapa 2) Tela Meus indicadores
- F-2.08 (etapa 2) Preenchimento rápido
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
- Se precisar navegar para uma tela de outra feature, crie no máximo um placeholder mínimo (título e uma linha, sem lógica).
- Não remova nem reescreva código de features já entregues.
- Se a revisão anterior pedir algo que exija alterar um teste protegido ou sair do escopo, **não faça**: atenda o resto e registre a discordância em `.harness/inbox/questions.jsonl`.

## Diagnóstico da tentativa anterior
(primeira tentativa)

## Feature (dados de entrada; não é o formato da resposta)
{
  "id": "F-2.06",
  "stage": 2,
  "title": "Repositório e regras de registros",
  "description": "src/data/entries.ts: saveEntry só para o localDate de hoje; registros são imutáveis (nunca usa update/set sobre documento existente): único por dia substitui o de hoje com um batch atômico 'cria novo documento (ID gerado) + exclui o registro de hoje do indicador' (DECISOES.md#Registros imutáveis); múltiplo gera ID único por evento; recordedAt serverTimestamp (UTC); note opcional; no primeiro registro grava lockedAt no indicador na mesma transação/batch; deleteEntry de qualquer dia. Estados pendente/erro sem sucesso antecipado.\n\nfirestore.rules para users/{uid}/entries: create com valor compatível com o tipo do indicador (get), indicador do mesmo UID e travado (getAfter lockedAt), note string <= 500, campos exatos; update sempre negado (registros imutáveis: nenhum valor de nenhum dia pode ser reescrito por escrita direta); delete pelo dono em qualquer data. A substituição do único de hoje é create + delete em batch (F-2.06). Sem validação de data no servidor.",
  "specRefs": [
    "spec.md#5.2",
    "spec.md#5.4",
    "arquitetura.md#3.3",
    "spec.md#9",
    "arquitetura.md#9.2",
    "DECISOES.md#Registros imutáveis"
  ],
  "covers": [
    "AC-09",
    "AC-10",
    "AC-11",
    "AC-04"
  ],
  "acceptance": [
    "Não existe API para criar registro em data passada",
    "Único por dia: segundo save no mesmo dia deixa exatamente um registro de hoje (o novo), via create + delete no mesmo batch; nenhuma chamada de update",
    "Remover a resposta de hoje de indicador único exclui o registro (ausência)",
    "Múltiplo: cada save cria documento independente",
    "Exclusão funciona para qualquer dia; não há edição de valores de dias passados",
    "Promise só resolve após persistência confirmada",
    "update em qualquer registro (passado ou de hoje, inclusive só mudando value ou note) é rejeitado",
    "Batch create (novo ID) + delete do registro de hoje é aceito para o dono",
    "Valor incompatível com o tipo é rejeitado; opção inexistente é rejeitada",
    "Registro para indicador inexistente ou de outro UID é rejeitado",
    "Nenhuma regra compara localDate com a data do servidor",
    "Exclusão permitida ao dono para qualquer data"
  ],
  "tests": [
    "app/src/data/__tests__/entries.test.ts",
    "app/tests/rules/entries.test.ts"
  ],
  "protectedTests": [
    "app/src/data/__tests__/entries.test.ts",
    "app/tests/rules/entries.test.ts"
  ],
  "tags": [
    "sync",
    "security-rules"
  ],
  "difficulty": "hard",
  "dependsOn": [
    "F-2.01",
    "F-1.02"
  ],
  "status": "in_progress",
  "attempts": 0,
  "costUsd": 0,
  "origin": []
}

## Trechos da spec
<!-- spec.md#5.2 -->
### 5.2 Um registro ou vários registros no dia

- **Único por dia:** manter um valor por indicador e dia; novo preenchimento **no próprio dia** substitui o valor atual.
- **Múltiplos por dia:** cada resposta gera novo evento com timestamp UTC; a agregação definida no indicador calcula o valor consolidado para aquele dia.
- **Sem lançamento retroativo** e sem editar valores de dias anteriores. O usuário pode **excluir qualquer registro, inclusive passado**.
- Excluir uma entrada invalida os resumos afetados e recalcula o dashboard **com os dados atualmente existentes**, sem reconstruir retrospectivamente os snapshots de insights curtidos.
- Todos os timestamps persistidos são UTC. O frontend apresenta datas/horários no fuso do navegador e define a chave `localDate` no momento de registrar; sem tratamento especial de viagens e **sem validação adicional da data no servidor**.
- Registro vazio não equivale a zero ou resposta `Não`. Falsas presenças/ausências jamais entram nas análises.

<!-- spec.md#5.4 -->
### 5.4 Estado vazio e feedback

- Nenhum indicador: sugerir 3–4 opções + criar indicador.
- Indicadores existentes, mas sem registros: explicar que insights aparecerão com o preenchimento.
- Primeiro registro: agradecer de forma discreta e incentivar retorno sem exagerar em gamificação.
- Dia parcialmente preenchido: não exibir alertas de “faltando responder” nem exigir completude.
- Falha de conexão: informar erro ou salvamento pendente; não indicar sucesso antes da persistência.

<!-- arquitetura.md#3.3 -->
### 3.3 Registro

```json
{
  "indicatorId": "ind_abc",
  "localDate": "2026-10-24",
  "recordedAt": "serverTimestamp",
  "valueType": "numeric",
  "value": { "number": 1.5 },
  "note": "Depois do almoço"
}
```

Valores possíveis de `value`: `{ "boolean": true }`, `{ "number": 7 }`, `{ "optionId": "high" }`. Sempre verificar compatibilidade com o tipo do indicador; `note` é opcional, sem tipo de indicador exclusivamente textual.

- Para `single_per_day`, ID determinístico por `indicatorId + localDate`; nova resposta do **dia vigente** substitui o documento.
- Para `multiple_per_day`, usar IDs únicos; guardar cada resposta de forma independente.
- **Excluir** um registro antigo é permitido. **Editar** valores de dias antigos ou criar registros retroativos não é permitido na interface.
- Guardar timestamps em UTC e `localDate` calculada no navegador no momento de registrar; front mostra hora local conforme o dispositivo. Sem tratamento especial de viagens/timezones e **sem validar data de registro no servidor**.
- Ao excluir/substituir, invalidar agregados daquele dia e recalcular insights da janela atual; **não reprocessar snapshots históricos salvos por like**.
- Não imputar ausência como `false` ou 0. Distinguir `false`, `0` e ausência de registro.

<!-- spec.md#9 -->
## 9. Privacidade, segurança e confiança

- Firestore com **Security Rules por UID** e testes de isolamento entre usuários, incluindo contas anônimas.
- Contas anônimas têm dados privados, mas sua recuperabilidade depende da sessão; o app explica isso e oferece conversão.
- Acesso à IA exige consentimento curto e explícito antes de compartilhar agregados; permitir revogar. Não enviar observações livres ou histórico bruto desnecessariamente.
- Excluir conta deve remover usuário do Firebase Auth e seus dados relacionados (subcoleções, feedback, conclusões, preferências e tokens de push), por operação segura no backend.
- HTTPS; chaves de servidor apenas no backend; não gravar nomes/notas sensíveis em logs ou payloads de notificação.
- Não criar um sistema burocrático de conformidade LGPD para a V1; manter essas proteções mínimas mesmo sendo um projeto pessoal.

<!-- arquitetura.md#9.2 -->
### 9.2 Controles adicionais

- App Check quando suportado, sem bloquear emuladores/ambiente local.
- Bloquear acesso a campos internos de quota, idempotência, push e billing por clientes. Validar tipos e tamanho de observações e unidades.
- Excluir a conta por Cloud Function com autenticação recente/reautenticação quando necessária, percorrendo subcoleções e removendo Auth depois de concluir a limpeza.
- Para congelar configurações com histórico, não confiar apenas no estado do React: usar salvaguardas de regras e fluxo seguro de persistência, com testes de alterações indevidas.
- Não impor verificação rígida de data no servidor nem cálculos especiais de timezone/viagens na V1.
- Segurança mínima de dados pessoais, consentimento para IA e exclusão; sem suíte burocrática de conformidade LGPD.

<!-- DECISOES.md#Registros imutáveis -->


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
- 2026-11-02T16:01 ✔ F-1.03 passing — Acesso anônimo automático e documento do usuário (worker kimi-pro, 2 tentativa(s), US$ 7.00) │ features 6/12
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


## Regras adicionais (feature crítica)

- **Estatística:** amostras e denominadores explícitos; ausência de registro nunca vira zero; `Não` explícito ≠ ausência; respeite os limiares fechados da spec (seção 6.5.1 / arquitetura 5.2); nunca use linguagem causal ("causa", "faz", "provoca").
- **Security Rules:** negar por padrão; acesso só ao próprio UID; validar o schema de cada documento; teste com `@firebase/rules-unit-testing` incluindo tentativas de acesso cruzado.
- **Privacidade:** use sempre o componente `<IndicatorLabel>`, nunca o nome cru do indicador; emojis ocultos com o olho fechado; nada de nomes em `aria-label`, `title`, `alt`, tooltips, `document.title`, `localStorage` ou logs.
- **Sincronização:** operações idempotentes; nunca sobrescrever dados de outro dispositivo sem regra explícita.
