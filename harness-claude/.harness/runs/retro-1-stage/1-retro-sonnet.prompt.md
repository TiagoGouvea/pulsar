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
- [L-025] Decisão do humano: Registros podem ser atualizados? → ID determinístico por dia com update permitido só hoje — ID determinístico por dia com update permitido só hoje
- [L-026] Decisão do humano: Quem grava o cache de textos da IA? → Só a Function generateInsightTexts após validação; cliente só lê e valida de novo — Só a Function generateInsightTexts após validação; cliente só lê e valida de novo (padrão)
- [L-027] Decisão do humano: Usar App Check na V1? → Fora da V1 inicial; reavaliar na etapa 7 — Fora da V1 inicial; reavaliar na etapa 7 (padrão)
- [L-028] Decisão do humano: Onde guardar o estado de dispensa do convite de salvar conta? → users/{uid}.saveAccountInviteDismissedAt (timestamp|null) e saveAccountInviteDismissedDayCount (int >= 0|null), validados em F-1.08 — users/{uid}.saveAccountInviteDismissedAt (timestamp|null) e saveAccountInviteDismissedDayCount (int >= 0|null), validados em F-1.08 (padrão)
- [L-029] Decisão do humano: Como resumir indicadores ordinais? → Contagem por opção na ordem configurada (inclui zeros), denominador = dias com resposta, moda com desempate pela ordem; só descritivo — Contagem por opção na ordem configurada (inclui zeros), denominador = dias com resposta, moda com desempate pela ordem; só descritivo (padrão)


# Papel: retrospectiva (stage, etapa 1)

Analise o desempenho recente do harness e mantenha as lições. Não edite arquivos.

Regras para lições:
- Toda lição nova precisa de `evidence` com ids de eventos (`evt-N`) listados abaixo. Sem evidência = rejeitada.
- Prefira editar/consolidar a criar. Máximo ~60 lições ativas por arquivo.
- Aposente lições com baixa eficácia (helpedRate) ou obsoletas; promova as consolidadas (viram parte do AGENTS.md).
- `file: "harness"` só para lições que valem para qualquer projeto.

## Eventos recentes (id feature papel worker tentativa resultado)
evt-34 F-0.03 review_code codex-mid t1 success $0.61
evt-35 F-0.03 implement deepseek t1 success $0.03
evt-36 F-0.02 review_code codex-mid t2 success $1.09
evt-37 F-0.02 review_ui sonnet t2 success $0.07
evt-38 F-0.02 implement kimi t2 success $0.18
evt-39 F-0.05 review_code codex-mid t1 success $0.37
evt-40 F-0.05 implement deepseek t1 review_rejected $0.04
evt-41 F-0.06 review_code codex-mid t1 success $0.41
evt-42 F-0.06 implement_hard opus t1 review_rejected $0.36
evt-43 F-0.05 review_code gemini-pro t2 failure $0.00
evt-44 F-0.05 review_code haiku t2 success $0.01
evt-45 F-0.05 implement deepseek t2 review_rejected $0.06
evt-46 F-0.05 review_code sonnet t3 success $0.03
evt-47 F-0.05 implement_hard codex-top t3 success $0.81
evt-48 F-0.06 review_code sonnet t2 success $0.03
evt-49 F-0.06 review_ui sonnet t2 success $0.07
evt-50 F-0.06 implement_hard codex-top t2 success $0.47
evt-51 F-0.07 test_writer sonnet t0 success $0.11
evt-52 F-0.07 triage deepseek t1 success $0.00
evt-53 F-0.07 implement_hard codex-top t1 failure gates:G2,G4 $0.71
evt-54 F-0.07 review_code deepseek t2 success $0.01
evt-55 F-0.07 review_ui gemini-flash-or t2 success $0.03
evt-56 F-0.07 implement_hard opus t2 success $0.23
evt-57 F-0.fix-1 review_code codex-mid t1 success $0.03
evt-58 F-0.fix-1 implement_hard sonnet t1 review_rejected $0.13
evt-59 F-0.fix-1 review_code codex-mid t2 success $0.13
evt-60 F-0.fix-1 implement_hard opus t2 success $1.43
evt-61 stage-0 review_ui gemini-flash-or t1 success $0.03
evt-62 retro-0-stage retro sonnet t1 success $0.05
evt-63 approve-0 approval_parser haiku t1 success $0.00
evt-64 smoke-local-gptoss smoke local-gptoss t1 success $0.00
evt-65 smoke-local-small smoke local-small t1 success $0.00
evt-66 smoke-local-gptoss smoke local-gptoss t1 success $0.00
evt-67 smoke-local-small smoke local-small t1 success $0.00
evt-68 smoke-codex-top smoke codex-top t1 success $0.04
evt-69 smoke-codex-mid smoke codex-mid t1 success $0.02
evt-70 smoke-deepseek-flash smoke deepseek-flash t1 success $0.00
evt-71 smoke-qwen-coder smoke qwen-coder t1 success $0.00
evt-72 smoke-minimax smoke minimax t1 success $0.00
evt-73 smoke-kimi-pro smoke kimi-pro t1 failure $0.00
evt-74 smoke-gptoss-or smoke gptoss-or t1 success $0.00
evt-75 smoke-qwen-small-or smoke qwen-small-or t1 success $0.00
evt-76 smoke-glm-or smoke glm-or t1 success $0.00
evt-77 smoke-glm-flash smoke glm-flash t1 success $0.00
evt-78 smoke-kimi-pro smoke kimi-pro t1 success $0.01
evt-79 smoke-gemini-lite smoke gemini-lite t1 success $0.00
evt-80 smoke-gemini smoke gemini t1 success $0.01
evt-81 smoke-gemini-argon smoke gemini-argon t1 success $0.01
evt-82 smoke-gemini smoke gemini t1 success $0.01
evt-83 smoke-gemini-lite smoke gemini-lite t1 success $0.00
evt-84 smoke-gemini-argon smoke gemini-argon t1 success $0.01
evt-85 F-1.02 test_writer sonnet t0 success $0.14
evt-86 F-1.01 test_writer gemini t0 success $0.44
evt-87 F-1.02 triage deepseek t1 success $0.04
evt-88 F-1.02 implement_easy glm-flash t1 failure gates:G8 $0.01
evt-89 F-1.02 implement_easy minimax t2 failure $0.00
evt-90 F-1.02 triage deepseek t3 success $0.30
evt-91 F-1.02 implement_hard opus t3 failure gates:G8 $0.24
evt-92 F-1.01 triage deepseek t1 success $0.19
evt-93 F-1.01 implement kimi t1 failure gates:G8 $0.22
evt-94 F-1.01 implement minimax t2 failure $0.00
evt-95 F-1.02 triage deepseek t4 success $0.64
evt-96 F-1.02 implement_hard opus t4 failure gates:G8 $0.21
evt-97 F-1.01 triage deepseek t3 success $0.12
evt-98 F-1.01 implement_hard opus t3 failure gates:G8 $0.45
evt-99 F-1.02 triage deepseek t5 success $0.00
evt-100 F-1.02 implement_hard opus t5 failure gates:G8 $0.20
evt-101 F-1.08 test_writer codex-mid t0 success $0.06
evt-102 F-1.01 triage deepseek t4 success $0.00
evt-103 F-1.01 implement_hard sonnet t4 failure gates:G8 $0.09
evt-104 F-1.08 test_writer sonnet t0 success $0.16
evt-105 smoke-minimax smoke minimax t1 success $0.00
evt-105 F-1.01 triage deepseek t5 success $0.00
evt-106 F-1.01 implement_hard kimi-pro t5 failure gates:G8 $0.12
evt-107 F-1.10 test_writer sonnet t0 success $0.09
evt-108 F-1.10 implement minimax t1 failure $0.00
evt-109 F-1.08 implement_hard opus t1 protected_violation gates:G3,G7,G8 $0.35
evt-110 F-1.10 triage deepseek t2 success $0.00
evt-111 F-1.10 implement haiku t2 failure gates:G2,G6,G8,G9,G10 $0.02
evt-112 F-1.08 implement_hard sonnet t2 protected_violation gates:G3,G5,G7,G8 $0.09
evt-113 F-1.10 implement_hard sonnet t3 protected_violation gates:G6,G7,G8,G9,G10 $0.09
evt-114 F-1.08 implement_hard opus t3 protected_violation gates:G3,G5,G7,G8 $0.20
evt-115 F-1.08 implement_hard kimi-pro t4 protected_violation gates:G3,G7,G8 $0.05
evt-116 F-1.08 implement_hard opus t5 protected_violation gates:G3,G7,G8 $0.42
evt-117 F-1.10 triage deepseek-flash t4 success $0.01
evt-118 F-1.10 implement_hard kimi-pro t4 failure gates:G8 $0.23
evt-119 F-1.10 triage deepseek t5 success $0.00
evt-120 F-1.10 implement_hard opus t5 failure gates:G8 $0.28
evt-121 F-1.fix-1 test_writer sonnet t0 success $0.10
evt-122 F-1.fix-1 test_writer sonnet t0 success $0.02
evt-124 F-1.02 test_writer sonnet t0 success $0.11
evt-125 F-1.01 test_writer sonnet t0 success $0.15
evt-126 F-1.02 test_writer sonnet t0 success $0.11
evt-127 F-1.01 test_writer sonnet t0 success $0.15
evt-128 F-1.08 test_writer sonnet t0 success $0.14
evt-129 F-1.10 test_writer sonnet t0 success $0.09
evt-130 F-1.02 test_writer sonnet t0 success $0.15
evt-131 F-1.01 test_writer sonnet t0 success $0.22
evt-132 F-1.02 test_writer sonnet t0 success $0.10
evt-133 F-1.02 test_writer sonnet t0 success $0.11
evt-134 F-1.01 test_writer sonnet t0 success $0.17
evt-135 F-1.01 test_writer sonnet t0 success $0.15
evt-136 F-1.02 review_code codex-mid t1 success $0.04
evt-137 F-1.02 implement_easy glm-flash t1 success $0.00
evt-138 F-1.01 test_writer sonnet t0 success $0.15
evt-139 F-1.08 test_writer codex-mid t0 success $0.13
evt-140 F-1.08 test_writer sonnet t0 success $0.11
evt-141 F-1.08 review_code codex-mid t1 success $0.04
evt-142 F-1.08 implement_hard opus t1 review_rejected $0.31
evt-143 F-1.08 review_code codex-mid t2 success $0.03
evt-144 F-1.08 implement_hard opus t2 success $0.33
evt-145 F-1.03 test_writer sonnet t0 success $0.22
evt-146 F-1.03 implement minimax t1 protected_violation gates:G7 $0.02
evt-147 F-1.01 review_code haiku t1 success $0.00
evt-148 F-1.01 implement kimi t1 review_rejected $0.35
evt-149 F-1.03 implement haiku t2 protected_violation gates:G7 $0.08
evt-150 F-1.01 review_code glm-flash t2 success $0.00
evt-151 F-1.01 implement haiku t2 success $0.02
evt-152 F-1.10 test_writer sonnet t0 success $0.10
evt-153 F-1.03 implement_hard opus t3 protected_violation gates:G7 $0.70
evt-154 F-1.03 implement_hard sonnet t4 protected_violation gates:G2,G7 $0.17
evt-155 F-1.03 test_writer sonnet t0 success $0.18
evt-156 F-1.10 test_writer codex-mid t0 success $0.10
evt-157 F-1.10 triage gemini-lite t1 success $0.00
evt-158 F-1.10 implement haiku t1 failure gates:G6,G8,G9,G10 $0.01
evt-159 F-1.03 implement_hard opus t5 protected_violation gates:G3,G6,G7 $0.99
evt-160 F-1.03 test_writer sonnet t0 success $0.19
evt-161 F-1.10 test_writer codex-mid t0 success $0.09
evt-162 F-1.10 triage gemini-lite t1 success $0.00
evt-163 F-1.10 implement haiku t1 failure gates:G6,G8,G9,G10 $0.02
evt-164 F-1.03 review_code codex-mid t1 success $0.07
evt-165 F-1.03 implement deepseek-flash t1 review_rejected $0.04
evt-166 F-1.10 review_code codex-mid t2 success $0.08
evt-167 F-1.10 implement deepseek-flash t2 review_rejected $0.01
evt-168 F-1.10 review_code codex-mid t3 success $0.12
evt-169 F-1.10 implement_hard opus t3 success $0.27
evt-170 F-1.11 test_writer sonnet t0 success $0.16
evt-171 F-1.03 triage gemini-lite t2 success $0.00
evt-172 F-1.03 implement qwen-coder t2 failure gates:G10 $0.31
evt-173 F-1.11 review_code codex-mid t1 success $0.04
evt-174 F-1.11 implement_hard opus t1 review_rejected $0.36
evt-175 F-1.11 review_code codex-mid t2 success $0.05
evt-176 F-1.11 implement_hard opus t2 review_rejected $0.56
evt-177 F-1.11 review_code codex-mid t3 success $0.06
evt-178 F-1.11 implement_hard kimi-pro t3 review_rejected $0.27
evt-179 F-1.11 review_code codex-mid t4 success $0.06
evt-180 F-1.11 implement_hard opus t4 review_rejected $0.63
evt-181 F-1.11 review_code codex-mid t5 success $0.06
evt-182 F-1.11 implement_hard sonnet t5 review_rejected $0.11
evt-183 stage-1 review_ui gemini t0 success $0.14

## Lições atuais
# Lições do projeto (geradas pelo harness). Formato YAML.
- id: L-001
  scope:
    roles:
      - implement
      - implement_hard
    tags: []
  rule: "Cobertura (G4): não passe --coverage no script do package.json se a
    config do vitest já ativa coverage, para não duplicar a configuração. Touch
    targets (G10): todo controle interativo (radios, switch, input) deve ter
    pelo menos 44px, por exemplo min-w-[44px] e h-11."
  evidence:
    - evt-24
  added: 2026-10-25
  hits: 33
  helped: 11
  helpedRate: 0.3333333333333333
  status: active
- id: L-002
  scope:
    roles:
      - implement
      - implement_hard
    tags:
      - ui
  rule: Rode `yarn format:fix` (Prettier --write) nos arquivos que você criar ou
    alterar antes de entregar. Isso evita falhas em format:check, como a G2 de
    evt-33.
  evidence:
    - evt-32
  added: 2026-10-25
  hits: 5
  helped: 3
  helpedRate: 0.6
  status: active
- id: L-003
  scope:
    roles:
      - implement
      - implement_hard
    tags:
      - gates
  rule: Antes de terminar, rode localmente os gates que costumam falhar
    (format:check, lint, typecheck, test:unit, coverage). Falhas G2/G4 em
    evt-25, evt-33 e evt-53 vieram de formatação ou configuração de coverage que
    um yarn format:fix e um yarn test:unit teriam pego.
  evidence:
    - evt-25
    - evt-33
    - evt-53
  added: 2026-10-26
  hits: 0
  helped: 0
  helpedRate: null
  status: active
- id: L-004
  scope:
    roles:
      - implement
      - implement_hard
    tags:
      - review
  rule: Implementações com deepseek e sonnet foram rejeitadas na revisão de código
    em várias tentativas (evt-40, evt-45, evt-42, evt-58). Releia os critérios
    de aceite da feature item por item e confira cada um no código antes de
    entregar. Isso vale em especial para features de UI e de modo privado.
  evidence:
    - evt-40
    - evt-42
    - evt-45
    - evt-58
  added: 2026-10-26
  hits: 0
  helped: 0
  helpedRate: null
  status: active
- id: L-006
  scope:
    roles: []
    tags: []
  rule: "Decisão do humano: O que conta como 'alguns usos' para o convite de
    instalar a PWA? → N aberturas do app — 2 aberturas, repetir nos dias
    seguintes ao usar"
  evidence:
    - checkpoints/etapa-0/DUVIDAS.md#Q-1
  added: 2026-10-27
  hits: 8
  helped: 2
  helpedRate: 0.25
  status: retired
- id: L-007
  scope:
    roles: []
    tags: []
  rule: "Decisão do humano: O que é 'evidência nova material' para uma hipótese
    com dislike reaparecer? → >= 7 dias pareados a mais que a versão descartada
    ou inversão do sinal do efeito — >= 7 dias pareados a mais que a versão
    descartada ou inversão do sinal do efeito (padrão)"
  evidence:
    - checkpoints/etapa-0/DUVIDAS.md#Q-2
  added: 2026-10-27
  hits: 8
  helped: 2
  helpedRate: 0.25
  status: retired
- id: L-008
  scope:
    roles: []
    tags: []
  rule: "Decisão do humano: Com quais dias a comparação a partir do 2º dia é
    feita? → Média dos dias anteriores — Média dos dias anteriores; talvez 7 ou
    10 dias"
  evidence:
    - checkpoints/etapa-0/DUVIDAS.md#Q-3
  added: 2026-10-27
  hits: 8
  helped: 2
  helpedRate: 0.25
  status: retired
- id: L-009
  scope:
    roles: []
    tags: []
  rule: "Decisão do humano: Como definir as duas janelas consecutivas de 7 dias
    das tendências? → hoje..hoje-6 vs. hoje-7..hoje-13 em dias corridos do
    localDate — hoje..hoje-6 vs. hoje-7..hoje-13 em dias corridos do localDate
    (padrão)"
  evidence:
    - checkpoints/etapa-0/DUVIDAS.md#Q-4
  added: 2026-10-27
  hits: 8
  helped: 2
  helpedRate: 0.25
  status: retired
- id: L-010
  scope:
    roles: []
    tags: []
  rule: "Decisão do humano: Tendências podem ser geradas para Fatores? → Não; só
    Resultados numéricos/escala (spec 6.2 'Tendência de um resultado') — Não; só
    Resultados numéricos/escala (spec 6.2 'Tendência de um resultado') (padrão)"
  evidence:
    - checkpoints/etapa-0/DUVIDAS.md#Q-5
  added: 2026-10-27
  hits: 9
  helped: 2
  helpedRate: 0.2222222222222222
  status: retired
- id: L-011
  scope:
    roles: []
    tags: []
  rule: "Decisão do humano: Como ordenar os cartões elegíveis? → Razão
    efeito/limiar desc, depois dias pareados desc, depois hypothesisKey asc —
    Razão efeito/limiar desc, depois dias pareados desc, depois hypothesisKey
    asc (padrão)"
  evidence:
    - checkpoints/etapa-0/DUVIDAS.md#Q-6
  added: 2026-10-27
  hits: 8
  helped: 2
  helpedRate: 0.25
  status: retired
- id: L-012
  scope:
    roles: []
    tags: []
  rule: "Decisão do humano: Quais níveis de evidência rotular? → Só 'Descrição' e
    'Possível associação'; sem 'sinal consistente' — Só 'Descrição' e 'Possível
    associação'; sem 'sinal consistente' (padrão)"
  evidence:
    - checkpoints/etapa-0/DUVIDAS.md#Q-7
  added: 2026-10-27
  hits: 8
  helped: 2
  helpedRate: 0.25
  status: retired
- id: L-013
  scope:
    roles: []
    tags: []
  rule: "Decisão do humano: O que o snapshot de like copia? → Tokens do texto,
    métricas, amostra, período e nome/sigla/emoji dos indicadores no momento;
    removível, nunca editável — Tokens do texto, métricas, amostra, período e
    nome/sigla/emoji dos indicadores no momento; removível, nunca editável
    (padrão)"
  evidence:
    - checkpoints/etapa-0/DUVIDAS.md#Q-8
  added: 2026-10-27
  hits: 8
  helped: 2
  helpedRate: 0.25
  status: retired
- id: L-014
  scope:
    roles: []
    tags: []
  rule: "Decisão do humano: Limites de tamanho de campos? → Sigla até 4 (exibida
    como digitada), nome 60, unidade 20, observação 500, opções ordinais 2-7 —
    Sigla até 4 (exibida como digitada), nome 60, unidade 20, observação 500,
    opções ordinais 2-7 (padrão)"
  evidence:
    - checkpoints/etapa-0/DUVIDAS.md#Q-9
  added: 2026-10-27
  hits: 8
  helped: 2
  helpedRate: 0.25
  status: retired
- id: L-015
  scope:
    roles: []
    tags: []
  rule: "Decisão do humano: Como representar 'sem resposta' em Sim/Não? → Tocar de
    novo na opção selecionada limpa a resposta e exclui o registro de hoje —
    Tocar de novo na opção selecionada limpa a resposta e exclui o registro de
    hoje (padrão)"
  evidence:
    - checkpoints/etapa-0/DUVIDAS.md#Q-10
  added: 2026-10-27
  hits: 8
  helped: 2
  helpedRate: 0.25
  status: retired
- id: L-016
  scope:
    roles: []
    tags: []
  rule: "Decisão do humano: Qual controle usar para escala? → Pílulas tocáveis até
    11 valores; slider nativo acima disso — Pílulas tocáveis até 11 valores;
    slider nativo acima disso (padrão)"
  evidence:
    - checkpoints/etapa-0/DUVIDAS.md#Q-11
  added: 2026-10-27
  hits: 8
  helped: 2
  helpedRate: 0.25
  status: retired
- id: L-017
  scope:
    roles: []
    tags: []
  rule: "Decisão do humano: Como reordenar indicadores? → Botões subir/descer
    acessíveis — Botões subir/descer acessíveis (padrão)"
  evidence:
    - checkpoints/etapa-0/DUVIDAS.md#Q-12
  added: 2026-10-27
  hits: 8
  helped: 1
  helpedRate: 0.125
  status: retired
- id: L-018
  scope:
    roles: []
    tags: []
  rule: "Decisão do humano: Onde fica o histórico de registros? → A partir do
    indicador em Meus indicadores, exclusão com confirmação — A partir do
    indicador em Meus indicadores, exclusão com confirmação (padrão)"
  evidence:
    - checkpoints/etapa-0/DUVIDAS.md#Q-13
  added: 2026-10-27
  hits: 8
  helped: 2
  helpedRate: 0.25
  status: retired
- id: L-019
  scope:
    roles: []
    tags: []
  rule: "Decisão do humano: Quais rotas usar? → /onboarding, /dashboard,
    /register, /indicators, /saved-insights, /insights/:hypothesisKey,
    /settings, /install — /onboarding, /dashboard, /register, /indicators,
    /saved-insights, /insights/:hypothesisKey, /settings, /install (padrão)"
  evidence:
    - checkpoints/etapa-0/DUVIDAS.md#Q-14
  added: 2026-10-27
  hits: 8
  helped: 2
  helpedRate: 0.25
  status: retired
- id: L-020
  scope:
    roles: []
    tags: []
  rule: "Decisão do humano: Como o layout se comporta no computador? → Coluna
    central até 960 px; listas de cartões em grid auto-fit (mín. 300 px) —
    Coluna central até 960 px; listas de cartões em grid auto-fit (mín. 300 px)
    (padrão)"
  evidence:
    - checkpoints/etapa-0/DUVIDAS.md#Q-15
  added: 2026-10-27
  hits: 8
  helped: 2
  helpedRate: 0.25
  status: retired
- id: L-021
  scope:
    roles: []
    tags: []
  rule: "Decisão do humano: Como resolver conflito de credencial na conversão? →
    Opções 'Cancelar' ou 'Entrar na conta existente' com aviso; nada é apagado
    nem mesclado — Opções 'Cancelar' ou 'Entrar na conta existente' com aviso;
    nada é apagado nem mesclado (padrão)"
  evidence:
    - checkpoints/etapa-0/DUVIDAS.md#Q-16
  added: 2026-10-27
  hits: 8
  helped: 2
  helpedRate: 0.25
  status: retired
- id: L-022
  scope:
    roles: []
    tags: []
  rule: "Decisão do humano: De onde servir ícones e fontes? → Material Symbols,
    Geist e Space Grotesk via pacotes npm, sem CDN — Material Symbols, Geist e
    Space Grotesk via pacotes npm, sem CDN (padrão)"
  evidence:
    - checkpoints/etapa-0/DUVIDAS.md#Q-17
  added: 2026-10-27
  hits: 8
  helped: 2
  helpedRate: 0.25
  status: retired
- id: L-023
  scope:
    roles: []
    tags: []
  rule: "Decisão do humano: Como identificar e autenticar o usuário do seed? →
    seed-user-0001 (seed@pulsar.test, sem senha), 30 dias terminando hoje, login
    e2e por custom token; --demo só com HARNESS_ALLOW_DEMO_SEED=1 e --project
    sem 'prod' — seed-user-0001 (seed@pulsar.test, sem senha), 30 dias
    terminando hoje, login e2e por custom token; --demo só com
    HARNESS_ALLOW_DEMO_SEED=1 e --project sem 'prod' (padrão)"
  evidence:
    - checkpoints/etapa-0/DUVIDAS.md#Q-18
  added: 2026-10-27
  hits: 8
  helped: 2
  helpedRate: 0.25
  status: retired
- id: L-024
  scope:
    roles: []
    tags: []
  rule: "Decisão do humano: Quais portas usar nos emuladores? → Firestore 8282,
    Auth 9299 (fonte única app/firebase.json) — Firestore 8282, Auth 9299 (fonte
    única app/firebase.json) (padrão)"
  evidence:
    - checkpoints/etapa-0/DUVIDAS.md#Q-19
  added: 2026-10-27
  hits: 8
  helped: 2
  helpedRate: 0.25
  status: retired
- id: L-025
  scope:
    roles: []
    tags: []
  rule: "Decisão do humano: Registros podem ser atualizados? → ID determinístico
    por dia com update permitido só hoje — ID determinístico por dia com update
    permitido só hoje"
  evidence:
    - checkpoints/etapa-0/DUVIDAS.md#Q-20
  added: 2026-10-27
  hits: 5
  helped: 0
  helpedRate: 0
  status: active
- id: L-026
  scope:
    roles: []
    tags: []
  rule: "Decisão do humano: Quem grava o cache de textos da IA? → Só a Function
    generateInsightTexts após validação; cliente só lê e valida de novo — Só a
    Function generateInsightTexts após validação; cliente só lê e valida de novo
    (padrão)"
  evidence:
    - checkpoints/etapa-0/DUVIDAS.md#Q-21
  added: 2026-10-27
  hits: 5
  helped: 0
  helpedRate: 0
  status: active
- id: L-027
  scope:
    roles: []
    tags: []
  rule: "Decisão do humano: Usar App Check na V1? → Fora da V1 inicial; reavaliar
    na etapa 7 — Fora da V1 inicial; reavaliar na etapa 7 (padrão)"
  evidence:
    - checkpoints/etapa-0/DUVIDAS.md#Q-22
  added: 2026-10-27
  hits: 5
  helped: 0
  helpedRate: 0
  status: active
- id: L-028
  scope:
    roles: []
    tags: []
  rule: "Decisão do humano: Onde guardar o estado de dispensa do convite de salvar
    conta? → users/{uid}.saveAccountInviteDismissedAt (timestamp|null) e
    saveAccountInviteDismissedDayCount (int >= 0|null), validados em F-1.08 —
    users/{uid}.saveAccountInviteDismissedAt (timestamp|null) e
    saveAccountInviteDismissedDayCount (int >= 0|null), validados em F-1.08
    (padrão)"
  evidence:
    - checkpoints/etapa-0/DUVIDAS.md#Q-23
  added: 2026-10-27
  hits: 5
  helped: 0
  helpedRate: 0
  status: active
- id: L-029
  scope:
    roles: []
    tags: []
  rule: "Decisão do humano: Como resumir indicadores ordinais? → Contagem por
    opção na ordem configurada (inclui zeros), denominador = dias com resposta,
    moda com desempate pela ordem; só descritivo — Contagem por opção na ordem
    configurada (inclui zeros), denominador = dias com resposta, moda com
    desempate pela ordem; só descritivo (padrão)"
  evidence:
    - checkpoints/etapa-0/DUVIDAS.md#Q-24
  added: 2026-10-27
  hits: 5
  helped: 0
  helpedRate: 0
  status: active
- id: L-030
  scope:
    roles:
      - implement
      - implement_hard
    tags: []
  rule: Ajustar 'engines.node' para '^22' no functions/package.json para maior
    flexibilidade e garantir a instalação das dependências (yarn install) dentro
    do diretório 'functions/' antes de iniciar qualquer script de teste ou
    emulador.
  evidence:
    - evt-157
  added: 2026-11-02
  hits: 5
  helped: 0
  helpedRate: 0
  status: active
- id: L-031
  scope:
    roles:
      - implement
      - implement_hard
    tags: []
  rule: Garanta a compatibilidade da versão do Node no ambiente e execute `yarn
    install` em todos os diretórios com `package.json` (raiz e `functions/`)
    antes de tentar iniciar o servidor de testes ou rodar os gates.
  evidence:
    - evt-162
  added: 2026-11-02
  hits: 5
  helped: 0
  helpedRate: 0
  status: active
- id: L-032
  scope:
    roles:
      - implement
      - implement_hard
    tags:
      - sync
  rule: Sempre adicione 'max-w-full overflow-hidden' no wrapper principal e
    utilize 'break-words' ou 'truncate' em textos longos para garantir que o
    layout se contenha dentro de containers estreitos.
  evidence:
    - evt-171
  added: 2026-11-02
  hits: 0
  helped: 0
  helpedRate: null
  status: active

# Lições do harness — sobrevivem entre projetos. Formato YAML.
- id: L-005
  scope:
    roles:
      - review_code
    tags: []
  rule: Se gemini-pro falhar como revisor, use o fallback (haiku ou sonnet). Ele
    resolveu a revisão sem custo extra relevante em evt-43/evt-44 e
    evt-19/evt-20.
  evidence:
    - evt-19
    - evt-20
    - evt-43
    - evt-44
  added: 2026-10-26
  hits: 0
  helped: 0
  helpedRate: null
  status: active


## Features da etapa
F-1.01 [passing] Modelo de domínio de indicadores e registros (puro): suggestAggregation: Fator numérico=sum, Resultado numérico=last, escala=mean, booleano=any, ordinal=last; nunca usa o nome | allowedAggregations: numérico/escala {sum,mean,last}; booleano {any,last}; ordinal {last}; frequência única => null | Resultado aceita neutral (padrão), higher, lower, target_range; Fator não tem direção | target_range exige idealRange com min <= max; rejeita min > max | Valor {boolean}|{number}|{optionId} é validado contra o tipo do indicador e opções existentes
F-1.02 [passing] Utilitários de tempo (UTC, localDate do navegador, dia de Brasília): localDate usa o fuso do navegador (testado com TZ diferentes) e muda à meia-noite local | Timestamps persistidos são UTC; exibição usa Intl pt-BR no fuso do navegador | brasiliaDateKey usa America/Sao_Paulo independentemente do fuso do navegador | Nenhuma correção por viagem/mudança de fuso
F-1.03 [blocked] Acesso anônimo automático e documento do usuário: Primeira visita entra sem cadastro, sem e-mail e sem tela de login | Recarregar a página mantém o mesmo UID | users/{uid} é criado uma única vez com os defaults | Erro de rede mostra mensagem em pt-BR, sem indicar sucesso
F-1.04 [failing] AppShell: cabeçalho com olho, navegação inferior e layout esticável: Olho global presente em todas as telas autenticadas (data-testid=eye-toggle) | Navegação inferior com rótulos e ícones; item ativo com aria-current=page | Sem overflow horizontal em 375x812 e 1280x800; sem breakpoints específicos de desktop | Alvos de toque >= 44px
F-1.05 [failing] Fixtures de e2e: usuário do seed e usuários novos: Fixture seedPage abre o app autenticado como o usuário do seed | Fixture freshUserPage cria um UID novo por teste | Build de produção não contém o helper (verificado por busca no dist/)
F-1.06 [failing] Guarda e2e do modo privado (sentinelas): Olho fechado: nenhuma sentinela de nome de indicador visível fora de [data-privacy-allow] | Observações (ZQX_OBS_NOTA_5T1) só aparecem onde a pessoa abre a nota explicitamente e marcadas com data-privacy-allow | Olho aberto: nomes e emojis aparecem | Reload reinicia em siglas
F-1.07 [failing] Tutorial de três telas: Três telas com Próximo/Voltar/Pular | Concluir ou pular grava onboardingCompleted=true e não reaparece | Tela 3 explica que correlação não é causalidade, o modo de siglas e a conta anônima
F-1.08 [passing] Regras: documento do usuário e campos protegidos: UID A não lê nem escreve nada sob users/B (anônimo e permanente) | Campos desconhecidos ou de tipo errado em users/{uid} são rejeitados | Dono pode gravar saveAccountInviteDismissedAt (timestamp ou null) e saveAccountInviteDismissedDayCount (inteiro >= 0 ou null); string, negativo ou decimal são rejeitados | internal/** inacessível a clientes
F-1.09 [failing] Conversão da conta: Google e link mágico preservando UID: Após vincular Google ou link mágico o UID é o mesmo e os registros continuam acessíveis | credential-already-in-use / email-already-in-use abre resolução explícita; nada é mesclado ou apagado | Nenhum campo de senha ou telefone em toda a UI | Conta anônima mostra aviso de que perder o navegador pode significar perder os dados
F-1.10 [passing] Workspace de Cloud Functions com emulador: yarn --cwd app test:functions roda testes de functions contra emuladores | Região padrão southamerica-east1 | Build das functions em functions/lib ignorado pelo lint/format
F-1.11 [blocked] Function deleteAccount: exclusão integral: Após a chamada não resta documento sob users/{uid} nem em internal/ para o UID | Usuário removido do Auth somente depois da limpeza | Conta Google/e-mail sem login recente recebe erro requires-recent-login | Um UID não consegue excluir outro
F-1.12 [failing] Tela de conta: sair e excluir conta: Botão excluir só habilita após digitar EXCLUIR | Conta não anônima pede reautenticação antes | Após excluir, o app volta ao início sem dados do usuário anterior | Sair de conta anônima exige confirmação explícita

Responda SOMENTE com o bloco ```json:
{"create": [{"scope": {"roles": ["implement"], "tags": ["security-rules"]}, "rule": "…", "evidence": ["evt-12"], "file": "project|harness"}],
 "edit": [{"id": "L-003", "rule": "…"}], "retire": ["L-001"], "promote": ["L-004"],
 "aprendizados": "markdown curto para o RELATORIO.md",
 "comoTestar": "se kind=stage: comece com 'O que dá para testar nesta etapa' e 'O que ainda não existe' (telas/fluxos que só chegam em etapas futuras), para o humano não esperar o que não foi feito. Depois, roteiro de 10–15 min, passo a passo, no celular (no computador, só conferir que estica/desempilha sem quebrar). Rodar localmente: em app/, `yarn install` e `yarn e2e:serve` (emuladores + seed), abrir http://localhost:4792; no celular, http://IP-DA-MAQUINA:4792 na mesma rede. Diga também o que não aparece no preview de produção (rotas só de dev/emulador). O que observar."}
