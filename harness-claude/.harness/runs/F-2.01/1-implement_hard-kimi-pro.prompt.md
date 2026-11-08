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
app/tests/rules/indicators.test.ts
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
- Rode `yarn lint`, `yarn typecheck`, `yarn test:unit` e os e2e relevantes antes de terminar.
- Respeite o `screen.png` e o `code.html` da tela correspondente em `design/` e os tokens de `design/pulsar_bio_analytics/DESIGN.md`; reutilize os componentes de `app/src/design/`.
- Se a feature criar uma tela nova, adicione a rota em `app/e2e/routes.json`.
- Nunca implemente "para o teste" (hardcode, mocks no código de produção): um avaliador de outra família revisa o diff.

## Testes
- Se a lista de testes protegidos acima estiver vazia, **você** escreve os testes de aceite em `app/src/data/__tests__/indicators.test.ts, app/tests/rules/indicators.test.ts` (um por critério de `acceptance`, determinísticos, e2e no projeto `mobile`). Eles ficam protegidos quando a feature for entregue: não escreva testes triviais.

## Escopo
- Faça **somente** o que esta feature pede (descrição e critérios de aceite), mesmo que a spec ou o design mostrem mais.
- Estas features (desta etapa e das próximas) ainda serão feitas por outro implementador; não implemente telas, fluxos nem dados delas:
- F-1.06 (etapa 2) Guarda e2e do modo privado (sentinelas)
- F-2.03 (etapa 2) Editor de indicador
- F-2.05 (etapa 2) Tela Meus indicadores
- F-2.06 (etapa 2) Repositório e regras de registros
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
  "id": "F-2.01",
  "stage": 2,
  "title": "Repositório e regras de indicadores",
  "description": "src/data/indicators.ts + hook useIndicators (onSnapshot): criar (aplicando sugestão de agregação), editar campos editáveis, arquivar/restaurar (archivedAt), reordenar dentro do grupo (sortOrder), sem apagar registros. Campos travados não são enviados depois de lockedAt.\n\nfirestore.rules para users/{uid}/indicators: validação de schema/tipos/tamanhos; após lockedAt != null, group, valueType, numeric (unidade), scale, options, frequency e dailyAggregation são imutáveis; nome/sigla/emoji/sortOrder/archivedAt/desiredDirection/idealRange editáveis; direção só para Resultado; idealRange.min <= max; lockedAt não pode voltar a null.",
  "specRefs": [
    "spec.md#4.1",
    "spec.md#4.5",
    "arquitetura.md#3.2",
    "spec.md#4.3",
    "arquitetura.md#9.2"
  ],
  "covers": [
    "AC-07",
    "AC-08"
  ],
  "acceptance": [
    "Criar grava todos os campos do modelo com createdAt/updatedAt de servidor",
    "Arquivar não apaga registros e tira o indicador do preenchimento",
    "Reordenar preserva a ordem por grupo após reload",
    "Edição de indicador travado só envia nome/sigla/emoji/ordem/status/direção/faixa",
    "Indicador com lockedAt rejeita mudança de grupo/tipo/unidade/escala/opções/frequência/agregação",
    "Indicador com lockedAt aceita mudar nome, sigla, emoji, ordem, arquivamento e direção/faixa",
    "Agregação incompatível com o tipo é rejeitada",
    "Fator com desiredDirection é rejeitado; faixa com min > max é rejeitada"
  ],
  "tests": [
    "app/src/data/__tests__/indicators.test.ts",
    "app/tests/rules/indicators.test.ts"
  ],
  "protectedTests": [
    "app/tests/rules/indicators.test.ts"
  ],
  "tags": [
    "sync",
    "security-rules"
  ],
  "difficulty": "hard",
  "dependsOn": [
    "F-1.01",
    "F-1.03",
    "F-1.08"
  ],
  "status": "in_progress",
  "attempts": 0,
  "costUsd": 0,
  "spendSince": "2026-11-07T18:08:26.278616Z",
  "origin": []
}

## Trechos da spec
<!-- spec.md#4.1 -->
### 4.1 Campos de um indicador

| Campo | Obrigatório? | Regra |
|---|---|---|
| ID | Automático | ID único e imutável. |
| Grupo | Sim | Fator ou Resultado. |
| Nome | Sim | Nome completo, exibido com o olho aberto. |
| Sigla | Não | Se vazia, usar as 3 primeiras letras + `...`; duplicatas são permitidas. |
| Emoji | Não | Opcional e oculto com o olho fechado. |
| Tipo de resposta | Sim | Booleano, escala, ordinal ou número com unidade. |
| Frequência | Sim | Uma resposta por dia ou várias. |
| Agregação diária | Se múltiplos | Sugestão **determinística**, ajustável pelo usuário antes do primeiro registro. |
| Unidade | Conforme tipo | Inclui unidade personalizada/sem unidade. |
| Direção | Apenas Resultado | Maior, menor, faixa ideal ou sem preferência (padrão). |
| Faixa ideal | Opcional | Valor mínimo e máximo configurados pelo usuário. |
| Ordem/status | Automático/editável | Reordenar, arquivar e restaurar. |
| Datas técnicas | Automático | Criação e atualização em UTC. |

**Bloqueio após o primeiro registro:** grupo, tipo de resposta, unidade, configuração da escala/opções, frequência e agregação diária não podem mais ser modificados na V1. Permanecem editáveis: nome, sigla, emoji, ordem, status e direção/faixa ideal do Resultado. Não há rotina de migração de dados na V1.

<!-- spec.md#4.5 -->
### 4.5 Arquivamento e reordenação

- O usuário pode **arquivar** um indicador que não usa mais.
- Indicadores arquivados deixam de aparecer no preenchimento cotidiano.
- O histórico permanece e pode continuar contribuindo para análises históricas, com identificação de que o indicador está arquivado.
- Permitir consultar arquivados e restaurar.
- Reordenação livre dentro de **Fatores** e **Resultados**; preservar a ordem escolhida.
- Não apagar automaticamente registros ao arquivar.

<!-- arquitetura.md#3.2 -->
### 3.2 Indicador

```json
{
  "group": "factor",
  "name": "Quantidade de café",
  "abbreviation": "CAF",
  "emoji": "☕",
  "valueType": "numeric",
  "numeric": { "unit": "xícaras", "min": 0, "max": null, "step": 0.5 },
  "scale": null,
  "options": null,
  "desiredDirection": null,
  "idealRange": null,
  "frequency": "multiple_per_day",
  "dailyAggregation": "sum",
  "sortOrder": 1000,
  "archivedAt": null,
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

- `group`: `factor | result`; `valueType`: `boolean | scale | ordinal | numeric`.
- `frequency`: `single_per_day | multiple_per_day`.
- `dailyAggregation`: `sum | mean | last | any`; null/não aplicável para frequência única.
- `desiredDirection` (Resultados): `neutral` (**default**) | `higher` | `lower` | `target_range`.
- `idealRange`: `{ "min": number, "max": number }` obrigatório apenas para `target_range`, com `min <= max`.
- `sum` e `mean` para números/escalas; `any` para booleano (presença de `true`); `last` onde fizer sentido, inclusive ordinal. Impedir opções incompatíveis no formulário e na validação.
- Sugestão de agregação é **determinística e baseada em grupo/tipo**: Fator numérico `sum`, Resultado numérico `last`, escala `mean`, booleano `any`, ordinal `last`. Se múltiplos, usuário pode escolher opção compatível **antes** do primeiro registro. Sem IA para escolher agregação.
- Após qualquer registro, `group`, `valueType`, unidade, parâmetros de escala/opções, `frequency` e `dailyAggregation` ficam bloqueados. Nome, sigla, emoji, posição, status e direção/faixa ideal permanecem editáveis.
- Não usar nome/sigla (podem repetir) como chave de relacionamento. Campo de bloqueio (por exemplo, registro de esquema imutável) deve ser protegido com regras, para não depender apenas de esconder opções no frontend.

<!-- spec.md#4.3 -->
### 4.3 Direção desejável para Resultados

Opções da V1:
- **Sem preferência (padrão):** apresentar tendências/descritivos sem dizer que melhorar significa subir ou descer.
- **Quanto maior, melhor:** energia, concentração.
- **Quanto menor, melhor:** dor, ansiedade.
- **Faixa ideal:** dois números informados pelo usuário para **Resultados numéricos ou de escala**, `minIdeal` e `maxIdeal`, com `minIdeal <= maxIdeal`; dentro ou fora da faixa. Não sugerir alvos clínicos automaticamente.

Fatores não têm direção desejável. O usuário pode alterar a direção/faixa ideal de Resultados com histórico: isso muda a interpretação **atual**, não os valores registrados e nem snapshots de insights salvos.

<!-- arquitetura.md#9.2 -->
### 9.2 Controles adicionais

- App Check quando suportado, sem bloquear emuladores/ambiente local.
- Bloquear acesso a campos internos de quota, idempotência, push e billing por clientes. Validar tipos e tamanho de observações e unidades.
- Excluir a conta por Cloud Function com autenticação recente/reautenticação quando necessária, percorrendo subcoleções e removendo Auth depois de concluir a limpeza.
- Para congelar configurações com histórico, não confiar apenas no estado do React: usar salvaguardas de regras e fluxo seguro de persistência, com testes de alterações indevidas.
- Não impor verificação rígida de data no servidor nem cálculos especiais de timezone/viagens na V1.
- Segurança mínima de dados pessoais, consentimento para IA e exclusão; sem suíte burocrática de conformidade LGPD.

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
- 2026-11-02T15:19 ✖ interrompido por SIGINT em STAGE_RUNNING: rode harness resume para continuar
- 2026-11-02T15:20 ▶ etapa 1 (Base) │ features 5/12 │ 0 bloqueadas │ US$ 18.63/24 │ branch 1-base
- 2026-11-02T15:43 ✖ interrompido por SIGINT em STAGE_RUNNING: rode harness resume para continuar
- 2026-11-02T15:49 ▶ etapa 1 (Base) │ features 5/12 │ 0 bloqueadas │ US$ 20.21/24 │ branch 1-base
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


## Regras adicionais (feature crítica)

- **Estatística:** amostras e denominadores explícitos; ausência de registro nunca vira zero; `Não` explícito ≠ ausência; respeite os limiares fechados da spec (seção 6.5.1 / arquitetura 5.2); nunca use linguagem causal ("causa", "faz", "provoca").
- **Security Rules:** negar por padrão; acesso só ao próprio UID; validar o schema de cada documento; teste com `@firebase/rules-unit-testing` incluindo tentativas de acesso cruzado.
- **Privacidade:** use sempre o componente `<IndicatorLabel>`, nunca o nome cru do indicador; emojis ocultos com o olho fechado; nada de nomes em `aria-label`, `title`, `alt`, tooltips, `document.title`, `localStorage` ou logs.
- **Sincronização:** operações idempotentes; nunca sobrescrever dados de outro dispositivo sem regra explícita.
