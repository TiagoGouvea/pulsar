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
  hits: 15
  helped: 8
  helpedRate: 0.5333333333333333
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
  hits: 0
  helped: 0
  helpedRate: null
  status: active
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
  hits: 0
  helped: 0
  helpedRate: null
  status: active
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
  hits: 0
  helped: 0
  helpedRate: null
  status: active
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
  hits: 0
  helped: 0
  helpedRate: null
  status: active
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
  hits: 0
  helped: 0
  helpedRate: null
  status: active
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
  hits: 0
  helped: 0
  helpedRate: null
  status: active
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
  hits: 0
  helped: 0
  helpedRate: null
  status: active
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
  hits: 0
  helped: 0
  helpedRate: null
  status: active
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
  hits: 0
  helped: 0
  helpedRate: null
  status: active
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
  hits: 0
  helped: 0
  helpedRate: null
  status: active
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
  hits: 0
  helped: 0
  helpedRate: null
  status: active
- id: L-017
  scope:
    roles: []
    tags: []
  rule: "Decisão do humano: Como reordenar indicadores? → Botões subir/descer
    acessíveis — Botões subir/descer acessíveis (padrão)"
  evidence:
    - checkpoints/etapa-0/DUVIDAS.md#Q-12
  added: 2026-10-27
  hits: 0
  helped: 0
  helpedRate: null
  status: active
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
  hits: 0
  helped: 0
  helpedRate: null
  status: active
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
  hits: 0
  helped: 0
  helpedRate: null
  status: active
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
  hits: 0
  helped: 0
  helpedRate: null
  status: active
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
  hits: 0
  helped: 0
  helpedRate: null
  status: active
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
  hits: 0
  helped: 0
  helpedRate: null
  status: active
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
  hits: 0
  helped: 0
  helpedRate: null
  status: active
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
  hits: 0
  helped: 0
  helpedRate: null
  status: active
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
  hits: 0
  helped: 0
  helpedRate: null
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
  hits: 0
  helped: 0
  helpedRate: null
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
  hits: 0
  helped: 0
  helpedRate: null
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
  hits: 0
  helped: 0
  helpedRate: null
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
  hits: 0
  helped: 0
  helpedRate: null
  status: active
