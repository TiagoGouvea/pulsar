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
- [L-031] Rode `yarn test:e2e` localmente para confirmar se o erro reproduz. Se sim, reescreva `visibleTextOutsideAllowList` e `hasHorizontalOverflow` em `app/e2e/support.ts` usando `page.evaluate('string')` em vez de `page.evaluate(() => {...})` — a string não passa pelo esbuild e elimina o risco de vazamento de helpers. Verifique também se o `e2e:serve` está 100% funcional (emuladores, seed, preview). Se o erro não reproduzir localmente, é provável que o ambiente de gates esteja com cache de build stale ou versão do Playwright diferente.
- [L-032] 1) Antes de declarar gates passando, rode também test:e2e. 2) Se o erro persistir, troque page.evaluate(() => {...}) por page.evaluate('(() => {...})()') em support.ts (função como string evita o transform do esbuild). 3) Considere pinar a versão do Playwright em vez de usar ^1.53.0 que resolveu para 1.64.1.
- [L-001] Cobertura (G4): não passe --coverage no script do package.json se a config do vitest já ativa coverage, para não duplicar a configuração. Touch targets (G10): todo controle interativo (radios, switch, input) deve ter pelo menos 44px, por exemplo min-w-[44px] e h-11.
- [L-030] Reexecute o gate sem alterar time.ts. '__name is not defined' em page.evaluate é artefato do transform Babel do Playwright, não bug da feature. Se persistir, pin a versão do @playwright/test no yarn.lock ou remova o gatilho do helper (ex.: inline o callback de page.evaluate / defina um shim global __name) e reporte; não caia na armadilha de depurar o código da feature.
- [L-006] Decisão do humano: O que conta como 'alguns usos' para o convite de instalar a PWA? → N aberturas do app — 2 aberturas, repetir nos dias seguintes ao usar
- [L-007] Decisão do humano: O que é 'evidência nova material' para uma hipótese com dislike reaparecer? → >= 7 dias pareados a mais que a versão descartada ou inversão do sinal do efeito — >= 7 dias pareados a mais que a versão descartada ou inversão do sinal do efeito (padrão)
- [L-008] Decisão do humano: Com quais dias a comparação a partir do 2º dia é feita? → Média dos dias anteriores — Média dos dias anteriores; talvez 7 ou 10 dias
- [L-009] Decisão do humano: Como definir as duas janelas consecutivas de 7 dias das tendências? → hoje..hoje-6 vs. hoje-7..hoje-13 em dias corridos do localDate — hoje..hoje-6 vs. hoje-7..hoje-13 em dias corridos do localDate (padrão)
- [L-010] Decisão do humano: Tendências podem ser geradas para Fatores? → Não; só Resultados numéricos/escala (spec 6.2 'Tendência de um resultado') — Não; só Resultados numéricos/escala (spec 6.2 'Tendência de um resultado') (padrão)
- [L-011] Decisão do humano: Como ordenar os cartões elegíveis? → Razão efeito/limiar desc, depois dias pareados desc, depois hypothesisKey asc — Razão efeito/limiar desc, depois dias pareados desc, depois hypothesisKey asc (padrão)


# Papel: implementador (tentativa 2)

Implemente a feature abaixo até que os testes passem e o código respeite o design system.

- **Não altere os testes protegidos** (a tentativa é descartada automaticamente se alterar):
app/src/domain/__tests__/indicator.test.ts
- Rode `yarn lint`, `yarn typecheck`, `yarn test:unit` e os e2e relevantes antes de terminar.
- Respeite o `screen.png` e o `code.html` da tela correspondente em `design/` e os tokens de `design/pulsar_bio_analytics/DESIGN.md`; reutilize os componentes de `app/src/design/`.
- Se a feature criar uma tela nova, adicione a rota em `app/e2e/routes.json`.
- Nunca implemente "para o teste" (hardcode, mocks no código de produção): um avaliador de outra família revisa o diff.

## Diagnóstico da tentativa anterior
Causa raiz (flaky): Playwright 1.64.1 usa esbuild para transformar os arquivos TypeScript de teste; o transform injeta o helper __name em callbacks de page.evaluate, mas __name não está definido no contexto de execução do navegador onde o callback é serializado e avaliado
Dica: 1) Antes de declarar gates passando, rode também test:e2e. 2) Se o erro persistir, troque page.evaluate(() => {...}) por page.evaluate('(() => {...})()') em support.ts (função como string evita o transform do esbuild). 3) Considere pinar a versão do Playwright em vez de usar ^1.53.0 que resolveu para 1.64.1.

Gates que falharam:
### G8 privacy-leak
page.evaluate: ReferenceError: __name is not defined
    at eval (eval at evaluate (:370:30), <anonymous>:1:17)
    at UtilityScript.evaluate (<anonymous>:372:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)

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
  "costUsd": 0.8433984768,
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

