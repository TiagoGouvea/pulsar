Você é um worker de um harness autônomo. Contexto limpo: tudo que importa está nos arquivos citados.
Regras:
- Trabalhe SOMENTE no diretório atual (worktree). Não acesse .env nem fora do projeto.
- Não edite arquivos listados como protegidos. Não use .skip/.only. Não enfraqueça asserts.
- Siga app/AGENTS.md, DECISOES.md e o design system (design/pulsar_bio_analytics/DESIGN.md → app/src/design/).
- Design em `design/`: uma pasta por tela com `screen.png` (mockup) e `code.html` (HTML/Tailwind de referência: copie estrutura, classes e textos, mas reescreva em React com os componentes do design system); `pulsar_mapeamento_de_telas_x_especifica_o_funcional_v1.1.md` liga cada tela às seções da spec. Em conflito, a spec (docs/) vence: o app é somente mobile, ignore breakpoints/layouts de desktop do design.
- Código, nomes e comentários em inglês; textos de interface somente em pt-BR. Gerenciador de pacotes: yarn.
- Não faça git commit/push/checkout: o orquestrador cuida do git.
- Se faltar informação: escolha o default mais conservador e registre uma linha JSON em
  .harness/inbox/questions.jsonl: {"featureId","pergunta","escolhido","alternativas","impacto"}.
- Se identificar um risco futuro: registre em .harness/inbox/risks.jsonl:
  {"featureId","risco","probabilidade","impacto","sugestao"}.
- Rode os testes relevantes antes de terminar. Termine com o bloco ```json final pedido no seu papel
  (padrão: {"summary","filesChanged","testsRun","confidence":"low|med|high","notes"}).
LIÇÕES RELEVANTES:
- [L-015] Decisão do humano: Como representar 'sem resposta' em Sim/Não? → Tocar de novo na opção selecionada limpa a resposta e exclui o registro de hoje — Tocar de novo na opção selecionada limpa a resposta e exclui o registro de hoje (padrão)
- [L-016] Decisão do humano: Qual controle usar para escala? → Pílulas tocáveis até 11 valores; slider nativo acima disso — Pílulas tocáveis até 11 valores; slider nativo acima disso (padrão)
- [L-017] Decisão do humano: Como reordenar indicadores? → Botões subir/descer acessíveis — Botões subir/descer acessíveis (padrão)
- [L-018] Decisão do humano: Onde fica o histórico de registros? → A partir do indicador em Meus indicadores, exclusão com confirmação — A partir do indicador em Meus indicadores, exclusão com confirmação (padrão)
- [L-019] Decisão do humano: Quais rotas usar? → /onboarding, /dashboard, /register, /indicators, /saved-insights, /insights/:hypothesisKey, /settings, /install — /onboarding, /dashboard, /register, /indicators, /saved-insights, /insights/:hypothesisKey, /settings, /install (padrão)
- [L-020] Decisão do humano: Como o layout se comporta no computador? → Coluna central até 960 px; listas de cartões em grid auto-fit (mín. 300 px) — Coluna central até 960 px; listas de cartões em grid auto-fit (mín. 300 px) (padrão)
- [L-021] Decisão do humano: Como resolver conflito de credencial na conversão? → Opções 'Cancelar' ou 'Entrar na conta existente' com aviso; nada é apagado nem mesclado — Opções 'Cancelar' ou 'Entrar na conta existente' com aviso; nada é apagado nem mesclado (padrão)
- [L-022] Decisão do humano: De onde servir ícones e fontes? → Material Symbols, Geist e Space Grotesk via pacotes npm, sem CDN — Material Symbols, Geist e Space Grotesk via pacotes npm, sem CDN (padrão)
- [L-023] Decisão do humano: Como identificar e autenticar o usuário do seed? → seed-user-0001 (seed@pulsar.test, sem senha), 30 dias terminando hoje, login e2e por custom token; --demo só com HARNESS_ALLOW_DEMO_SEED=1 e --project sem 'prod' — seed-user-0001 (seed@pulsar.test, sem senha), 30 dias terminando hoje, login e2e por custom token; --demo só com HARNESS_ALLOW_DEMO_SEED=1 e --project sem 'prod' (padrão)
- [L-024] Decisão do humano: Quais portas usar nos emuladores? → Firestore 8282, Auth 9299 (fonte única app/firebase.json) — Firestore 8282, Auth 9299 (fonte única app/firebase.json) (padrão)


# Papel: implementador (tentativa 2)

Implemente a feature abaixo até que os testes passem e o código respeite o design system.

- **Não altere os testes protegidos** (a tentativa é descartada automaticamente se alterar):
app/src/domain/__tests__/indicator.test.ts
- Rode `yarn lint`, `yarn typecheck`, `yarn test:unit` e os e2e relevantes antes de terminar.
- Respeite o `screen.png` e o `code.html` da tela correspondente em `design/` e os tokens de `design/pulsar_bio_analytics/DESIGN.md`; reutilize os componentes de `app/src/design/`.
- Se a feature criar uma tela nova, adicione a rota em `app/e2e/routes.json`.
- Nunca implemente "para o teste" (hardcode, mocks no código de produção): um avaliador de outra família revisa o diff.

## Diagnóstico da tentativa anterior
Avaliação code reprovou (nota 3):
- [blocker] app/firestore.rules O diff troca as regras de users/{uid} por `allow read, write: if isOwner(uid)`. Isso remove a validação de schema (campos permitidos e tipos), o bloqueio de leitura de campos administrativos, o `allow delete: if false` e a proteção de documentos com campos administrativos mal posicionados. Nada disso faz parte de F-1.01, que é um domínio puro sem Firebase. → Reverter app/firestore.rules para a versão anterior ao diff. Se a mudança for necessária, abrir feature própria com revisão de segurança, sem misturá-la ao domínio de indicadores.
- [blocker] app/tests/rules/users.test.ts e app/tests/rules/usersAdminFields.test.ts Os dois testes protegidos de regras de segurança foram excluídos inteiros. Isso enfraquece a cobertura de isolamento, validação de schema, campos administrativos e internal/**. O G7 (protected-tests) está marcado como ok, mas a exclusão viola a regra de não enfraquecer asserts. → Restaurar os dois arquivos a partir do commit anterior e manter as regras originais, de modo que os testes voltem a passar sem alteração.
- [major] app/src/domain/entry.ts ValidationError e ValidationResult são redeclarados aqui, com a mesma forma que já existe em indicator.ts. Isso é duplicação, contra a regra de centralização do projeto. → Importar ValidationError e ValidationResult de './indicator' (ou mover ambos para um módulo compartilhado, por exemplo src/domain/validation.ts) e remover a cópia de entry.ts.
- [minor] app/src/domain/entry.ts Os ramos de `numeric` e `scale` em validateEntryValue repetem a checagem de número finito. As mensagens de erro e os limites também são construídos de forma repetida, o que deixa a função mais longa do que precisa. → Extrair uma checagem comum de número finito e tratar numeric/scale no mesmo bloco, com a verificação de faixa específica de cada tipo.
- [minor] app/scripts/seed-data.ts Os novos `import type` foram colocados depois de declarações (`SEED_TZ_OFFSET`), o que quebra a convenção de imports no topo do arquivo. → Mover os imports para o topo do arquivo, antes de qualquer declaração.
- [minor] app/.prettierignore O novo arquivo app/src/domain/__tests__/indicator.test.ts foi adicionado ao .prettierignore. Como é um arquivo novo e não um teste protegido, essa exclusão não tem justificativa e tira o teste da formatação automática. → Remover a linha do .prettierignore e formatar o arquivo normalmente.

## Feature (dados de entrada; não é o formato da resposta)
{
  "id": "F-1.01",
  "stage": 1,
  "title": "Modelo de domínio de indicadores e registros (puro)",
  "description": "src/domain/: tipos Indicator/Entry/EntryValue conforme arquitetura 3.2/3.3; validação pura (nome obrigatório, sigla <= 4 chars, opções ordinais 2–7, escala min<max e step>0, faixa ideal min<=max só para Resultado numérico/escala, compatibilidade valor x tipo); sugestão determinística de agregação por grupo/tipo e lista de agregações válidas por tipo. Sem Firebase. Fazer scripts/seed-data.ts usar estes tipos.",
  "specRefs": [
    "spec.md#4.1",
    "spec.md#4.1.1",
    "spec.md#4.2",
    "spec.md#4.3",
    "arquitetura.md#3.2",
    "arquitetura.md#3.3",
    "arquitetura.md#4"
  ],
  "covers": [
    "AC-05",
    "AC-06",
    "AC-08"
  ],
  "acceptance": [
    "suggestAggregation: Fator numérico=sum, Resultado numérico=last, escala=mean, booleano=any, ordinal=last; nunca usa o nome",
    "allowedAggregations: numérico/escala {sum,mean,last}; booleano {any,last}; ordinal {last}; frequência única => null",
    "Resultado aceita neutral (padrão), higher, lower, target_range; Fator não tem direção",
    "target_range exige idealRange com min <= max; rejeita min > max",
    "Valor {boolean}|{number}|{optionId} é validado contra o tipo do indicador e opções existentes"
  ],
  "tests": [
    "app/src/domain/__tests__/indicator.test.ts",
    "app/src/domain/__tests__/entry.test.ts"
  ],
  "protectedTests": [
    "app/src/domain/__tests__/indicator.test.ts"
  ],
  "tags": [],
  "difficulty": "normal",
  "dependsOn": [
    "F-0.01"
  ],
  "status": "in_progress",
  "attempts": 1,
  "costUsd": 2.9768382812,
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

<!-- spec.md#4.1.1 -->
### 4.1.1 Agregação quando há múltiplos registros

Não usar IA nem interpretação do **nome** do indicador. A agregação sugerida depende somente da configuração estruturada:

| Configuração | Padrão sugerido |
|---|---|
| Fator numérico | Soma |
| Resultado numérico | Último valor |
| Escala 0–10 | Média |
| Booleano | Presença de qualquer `Sim` |
| Opções categóricas | Último valor |

Em **configurações avançadas**, oferecer apenas agregações válidas para o tipo: **Soma**, **Média**, **Último** e **Presença**. Ex.: número/escala aceita soma, média e último; booleano aceita presença e último; ordinal aceita último. Mostrar um exemplo do efeito da escolha. Para registro único diário, não mostrar agregação: usar o valor do dia. Nunca converter falta de resposta em `Não` ou zero. A agregação fica bloqueada quando existir histórico.

<!-- spec.md#4.2 -->
### 4.2 Tipos de resposta

#### A. Sim / não (booleano)

Controle em dois estados, com opção de deixar sem resposta.

Exemplos:
- Fator: “Malhei hoje?” → Sim / Não.
- Fator: “Tomei óleo de coco?” → Sim / Não.
- Resultado: “Tive dor de cabeça?” → Sim / Não.
- Resultado: “Tive insônia?” → Sim / Não.

**Importante:** não respondido é diferente de **Não**.

#### B. Escala numérica (por exemplo, 0–10)

Slider ou seleção compacta, com mínimo, máximo e passo configuráveis; sugestão padrão **0 a 10, passo 1**.

Exemplos:
- Resultado: energia, concentração, disposição, ansiedade, dor.
- Fator: intensidade percebida do exercício.

Não presumir que um valor mais alto é sempre melhor: essa orientação é configurada nos **Resultados**.

#### C. Opções categóricas ordenadas

Alternativas personalizáveis, apresentadas como botões/chips com ordem conhecida.

Exemplos:
- “Pouco / Médio / Muito”.
- “Ruim / Regular / Bom”.
- “Leve / Moderado / Intenso”.

Sugestão: de 2 a 7 opções para não perder agilidade no celular. Internamente preservar a ordem para comparação estatística, sem fingir precisão numérica que não existe.

#### D. Número com unidade

Campo numérico com teclado adequado, aceitando inteiros e **decimais**.

Exemplos:
- Fator: Q10 → 200 mg; café → 3 xícaras; sono → 7,5 horas; suplemento → 2 comprimidos.
- Resultado: peso → 78,5 kg; frequência cardíaca → 65 bpm; temperatura → 36,6 °C.

Unidades sugeridas, com possibilidade de **unidade personalizada**:

| Categoria | Unidades iniciais sugeridas |
|---|---|
| Quantidade | unidade(s), comprimido(s), cápsula(s), dose(s), xícara(s), porção(ões) |
| Tempo | minuto(s), hora(s) |
| Massa | mg, g, kg |
| Volume | mL, L |
| Medidas fisiológicas | bpm, °C, %, mmHg |
| Outra | Sem unidade; unidade digitada pelo usuário |

A unidade é metadado do indicador e **não determina um objetivo ideal**. Ex.: tomar Q10 não pressupõe uma dose desejável.

<!-- spec.md#4.3 -->
### 4.3 Direção desejável para Resultados

Opções da V1:
- **Sem preferência (padrão):** apresentar tendências/descritivos sem dizer que melhorar significa subir ou descer.
- **Quanto maior, melhor:** energia, concentração.
- **Quanto menor, melhor:** dor, ansiedade.
- **Faixa ideal:** dois números informados pelo usuário para **Resultados numéricos ou de escala**, `minIdeal` e `maxIdeal`, com `minIdeal <= maxIdeal`; dentro ou fora da faixa. Não sugerir alvos clínicos automaticamente.

Fatores não têm direção desejável. O usuário pode alterar a direção/faixa ideal de Resultados com histórico: isso muda a interpretação **atual**, não os valores registrados e nem snapshots de insights salvos.

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

<!-- arquitetura.md#4 -->
## 4. Políticas de agregação diária

O indicador define se aceita um ou vários registros por dia. O sistema calcula uma sugestão automática **sem IA**, baseada exclusivamente no tipo/grupo, mas o usuário pode escolher uma agregação compatível antes de registrar pela primeira vez.

| Indicador | Frequência | Agregação sugerida |
|---|---|---|
| Café / Q10 / água (Fator numérico) | Múltipla | `sum` |
| Peso (Resultado numérico) | Única ou múltipla | `last` se múltipla |
| Energia / concentração (escala) | Múltipla | `mean` |
| Exercício (booleano) | Única ou múltipla | `any` se múltipla |
| Humor (ordinal) | Múltipla | `last` |

Agregações da V1: `sum` (soma de incrementos), `mean` (média aritmética), `last` (último timestamp; desempate por ID estável), `any` (verdadeiro quando ao menos um registro é `true`). O indicador único por dia retorna seu valor diretamente. Os valores de uma entrada aditiva significam **quantidade daquele evento**, não acumulado no dia.

Nunca aplicar uma agregação a tipo incompatível; uma série incompleta não deve ter registros ausentes computados como zero/Não. Para associações por dia, cruzar somente dias com Fator e Resultado agregados válidos.

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
- 2026-10-25T16:09 INIT concluído: 63 features
- 2026-10-25T16:14 F-0.01 passing — Scaffold: Vite, TypeScript, Tailwind, lint e Vitest (worker opus, 3 tentativa(s), US$ 0.79)
- 2026-10-25T16:17 F-0.04 passing — Firebase com emuladores e regras-base por UID (worker opus, 1 tentativa(s), US$ 1.06)
- 2026-10-25T16:20 F-0.03 passing — Seed sintético do usuário de desenvolvimento (worker deepseek, 1 tentativa(s), US$ 0.63)
- 2026-10-25T16:22 F-0.02 passing — Tokens e componentes base do design system (worker kimi, 2 tentativa(s), US$ 1.52)
- 2026-10-25T18:08 F-0.05 passing — Playwright, gates de navegador e e2e:serve (worker codex-top, 3 tentativa(s), US$ 1.06)
- 2026-10-25T18:09 F-0.06 passing — Modo privado: PrivacyContext, EyeToggle e IndicatorLabel (worker codex-top, 2 tentativa(s), US$ 1.06)
- 2026-10-25T18:16 F-0.07 passing — Página /_design (somente dev/emulador) (worker opus, 2 tentativa(s), US$ 1.09)
- 2026-10-26T10:52 F-0.fix-1 passing — Suíte completa da etapa falhou nos gates G12 (worker opus, 2 tentativa(s), US$ 1.71)
- 2026-10-27T21:53 etapa 0 aprovada (commits em 0-setup; merge e branches da próxima etapa ficam com o humano)
- 2026-11-01T18:13 ▶ etapa 1 (Base) │ features 0/12 │ 0 bloqueadas │ US$ 0.00/10 │ branch 1-base
- 2026-11-01T18:38 ⛔ F-1.02 BLOQUEADA: limite de 5 tentativas atingido │ features 0/12
- 2026-11-01T18:42 ⛔ F-1.01 BLOQUEADA: limite de 5 tentativas atingido │ features 0/12
- 2026-11-01T18:52 ⛔ F-1.08 BLOQUEADA: limite de 5 tentativas atingido │ features 0/12
- 2026-11-01T19:01 ⛔ F-1.10 BLOQUEADA: limite de 5 tentativas atingido │ features 0/12
- 2026-11-01T19:02 ▶ etapa 1 (Base) │ features 0/13 │ 4 bloqueadas │ US$ 5.46/10 │ branch 1-base
- 2026-11-01T19:03 ⛔ F-1.fix-1 BLOQUEADA: test_writer não produziu testes de aceite │ features 0/13
- 2026-11-01T19:04 ✖ interrompido por SIGINT em STAGE_GATES: rode harness resume para continuar
- 2026-11-02T12:18 ▶ etapa 1 (Base) │ features 0/12 │ 0 bloqueadas │ US$ 5.58/10 │ branch 1-base
- 2026-11-02T12:19 ⛔ F-1.02 BLOQUEADA: test_writer não produziu testes de aceite │ features 0/12
- 2026-11-02T12:20 ⛔ F-1.01 BLOQUEADA: test_writer não produziu testes de aceite │ features 0/12
- 2026-11-02T12:20 ✖ interrompido por SIGINT em STAGE_RUNNING: rode harness resume para continuar
- 2026-11-02T12:22 ▶ etapa 1 (Base) │ features 0/12 │ 0 bloqueadas │ US$ 6.32/10 │ branch 1-base
- 2026-11-02T12:23 ⛔ F-1.02 BLOQUEADA: test_writer não produziu testes de aceite │ features 0/12
- 2026-11-02T12:23 ✖ interrompido por SIGINT em STAGE_RUNNING: rode harness resume para continuar
- 2026-11-02T12:25 ▶ etapa 1 (Base) │ features 0/12 │ 0 bloqueadas │ US$ 6.78/10 │ branch 1-base
- 2026-11-02T12:29 ✔ F-1.02 passing — Utilitários de tempo (UTC, localDate do navegador, dia de Brasília) (worker glm-flash, 1 tentativa(s), US$ 2.40) │ features 1/12
- 2026-11-02T12:29 ✖ interrompido por SIGINT em STAGE_RUNNING: rode harness resume para continuar
- 2026-11-02T12:29 ▶ etapa 1 (Base) │ features 1/12 │ 0 bloqueadas │ US$ 7.25/10 │ branch 1-base
- 2026-11-02T12:37 ✔ F-1.08 passing — Regras: documento do usuário e campos protegidos (worker opus, 2 tentativa(s), US$ 2.42) │ features 2/12

