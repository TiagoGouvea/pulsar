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
  hits: 54
  helped: 16
  helpedRate: 0.2962962962962963
  status: retired
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
  status: promoted
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
  rule: "Revisões rejeitadas foram a principal causa de retrabalho: F-1.03,
    F-1.04, F-1.06, F-1.09, F-1.11 e F-1.12 tiveram 2 a 5 rejeições seguidas,
    inclusive com opus. Antes de implementar, leia o último verdict-N.json da
    feature e trate cada ponto apontado. Antes de entregar, confira item por
    item os critérios de aceite, cada um com um teste ou trecho de código que o
    comprove. Exemplos: a ordem de limpeza antes da remoção no Auth,
    requires-recent-login, o isolamento entre UIDs e a mensagem de erro de rede
    em pt-BR que não indica sucesso. Não descarte o trabalho de tentativas
    anteriores sem comparar com o HEAD."
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
  status: retired
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
  status: retired
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
  status: retired
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
  status: retired
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
  status: retired
- id: L-030
  scope:
    roles:
      - implement
      - implement_hard
    tags: []
  rule: "Em functions/package.json use 'engines.node' compatível com o Node do
    ambiente (ex.: '^22') e rode yarn install dentro de functions/ antes de
    qualquer teste ou emulador."
  evidence:
    - evt-157
  added: 2026-11-02
  hits: 8
  helped: 1
  helpedRate: 0.125
  status: retired
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
  status: retired
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
  status: retired
- id: L-033
  scope:
    roles:
      - implement
      - implement_hard
    tags:
      - protected
  rule: Nunca edite arquivos listados em .harness/protected.json (testes escritos
    pelo test_writer, configs protegidas). Violações G7/protected_violation
    repetidas em F-1.08, F-1.03 e F-1.10 (evt-109, evt-112, evt-113, evt-114,
    evt-115, evt-116, evt-146, evt-149, evt-153, evt-154, evt-159) consumiram
    todas as tentativas, inclusive com opus. Antes de editar qualquer arquivo,
    confira se ele está na lista de protegidos; se o teste parecer errado,
    ajuste o código de produção ou registre em .harness/inbox/questions.jsonl em
    vez de alterar o teste.
  evidence:
    - evt-109
    - evt-112
    - evt-114
    - evt-153
    - evt-159
  added: 2026-11-02
  hits: 0
  helped: 0
  helpedRate: null
  status: promoted
- id: L-034
  scope:
    roles:
      - implement
      - implement_hard
    tags:
      - gates
  rule: "G8 falhou em sequência para F-1.01, F-1.02 e F-1.10 mesmo com modelos
    fortes (evt-91, evt-96, evt-98, evt-100, evt-120). Leia o relatório do gate
    G8 (gate-report) antes de alterar código, rode localmente o mesmo comando do
    gate e só entregue quando ele passar. Não repita a mesma abordagem entre
    tentativas: compare com o erro da tentativa anterior."
  evidence:
    - evt-91
    - evt-96
    - evt-98
    - evt-100
    - evt-120
  added: 2026-11-02
  hits: 0
  helped: 0
  helpedRate: null
  status: promoted
- id: L-035
  scope:
    roles:
      - implement
      - implement_hard
    tags:
      - review
  rule: "F-1.11 foi rejeitada na revisão 5 vezes seguidas (evt-174, evt-176,
    evt-178, evt-180, evt-182) e passou depois (evt-188) com o mesmo opus,
    depois de uma revisão feita pelo gemini (evt-187). Antes de implementar,
    leia o último parecer de revisão (verdict-N.json) e trate cada ponto
    apontado. Confirme cada critério de aceite com um teste ou trecho de código:
    ordem de limpeza, requires-recent-login e isolamento entre UIDs."
  evidence:
    - evt-174
    - evt-176
    - evt-178
    - evt-180
    - evt-182
  added: 2026-11-02
  hits: 0
  helped: 0
  helpedRate: null
  status: retired
- id: L-036
  scope:
    roles:
      - implement
      - implement_hard
    tags:
      - functions
  rule: "Modelos baratos (minimax, haiku) falharam repetidamente em features de
    infraestrutura de functions/emulador (F-1.10: evt-108, evt-111, evt-158,
    evt-163, G6/G8/G9/G10). Para features de infra com emulador, rode yarn
    install em app/ e app/functions antes dos gates e use roteamento para
    implement_hard desde a primeira tentativa."
  evidence:
    - evt-108
    - evt-111
    - evt-158
    - evt-163
  added: 2026-11-02
  hits: 0
  helped: 0
  helpedRate: null
  status: active
- id: L-037
  scope:
    roles:
      - implement
      - implement_hard
    tags:
      - protected
  rule: Se o gate G7 (protected_violation) falhar, não tente a mesma edição de
    novo. A violação se repetiu até com modelos fortes (opus em evt-153/evt-159,
    codex-mid em evt-261). Antes de entregar, rode `git status` e `git diff
    --stat` e reverta toda alteração em arquivos listados em
    .harness/protected.json, inclusive mudanças de formatação ou de import.
    Corrija o código de produção para satisfazer o teste existente. Se o teste
    parecer errado, registre a dúvida em .harness/inbox/questions.jsonl.
  evidence:
    - evt-146
    - evt-149
    - evt-153
    - evt-154
    - evt-159
  added: 2026-11-02
  hits: 0
  helped: 0
  helpedRate: null
  status: active
- id: L-038
  scope:
    roles:
      - implement
      - implement_hard
    tags:
      - review
  rule: F-1.03 foi rejeitada na revisão com deepseek-flash e qwen-coder (evt-165,
    evt-190, evt-192), mesmo depois de a F-1.11 passar na revisão (evt-188) com
    um revisor diferente (gemini). Antes de entregar, leia o último
    verdict-N.json e responda a cada ponto apontado no código. Confira também se
    o fluxo de erro de rede mostra mensagem em pt-BR e não indica sucesso.
  evidence:
    - evt-165
    - evt-190
    - evt-192
  added: 2026-11-02
  hits: 0
  helped: 0
  helpedRate: null
  status: retired
- id: L-039
  scope:
    roles:
      - implement
      - implement_hard
    tags:
      - sync
  rule: Substitua waitForLoadState('networkidle') por verificações de estado da
    aplicação ou locator.waitFor() em elementos específicos, evitando depender
    do estado ocioso da rede quando houver conexões de longa duração.
  evidence:
    - evt-200
  added: 2026-11-02
  hits: 8
  helped: 1
  helpedRate: 0.125
  status: retired
- id: L-040
  scope:
    roles:
      - implement
      - implement_hard
    tags:
      - privacy-mode
      - ui
  rule: O teste E2E não deve depender de dados reais não implementados; use mocks
    ou aguarde a implementação do dashboard/indicadores antes de habilitar os
    testes que validam o conteúdo dessas áreas.
  evidence:
    - evt-232
  added: 2026-11-02
  hits: 8
  helped: 0
  helpedRate: 0
  status: retired
- id: L-041
  scope:
    roles:
      - implement
      - implement_hard
    tags:
      - privacy-mode
      - ui
  rule: "Reative o que a tentativa 1 já entregou: importe `IndicatorsPage` e
    `DashboardPage` em `src/App.tsx` (removendo `PlaceholderPage` dessas rotas),
    devolva o `EyeToggle` ao header de `WelcomePage`, e volte a restringir
    `watchUserProfile` (só enquanto `!profile.onboardingCompleted`) para o
    `networkidle` fechar e o smoke test caber em 30s; rode `yarn e2e
    --grep-invert @visual` (ou `yarn test:e2e`) e não reescreva/descarte o
    trabalho de tentativas anteriores sem comparar com o HEAD."
  evidence:
    - evt-237
  added: 2026-11-02
  hits: 8
  helped: 0
  helpedRate: 0
  status: retired
- id: L-042
  scope:
    roles:
      - implement
      - implement_hard
    tags:
      - ui
      - sync
  rule: Aumente o timeout do `expect.poll` no teste G6 e garanta que o listener de
    `onAuthStateChanged` esteja propagando corretamente a mudança de usuário
    após o `linkWithCredential` para o estado da aplicação.
  evidence:
    - evt-245
  added: 2026-11-02
  hits: 8
  helped: 1
  helpedRate: 0.125
  status: retired
- id: L-043
  scope:
    roles:
      - implement
      - implement_hard
    tags:
      - ui
      - sync
  rule: Substitua 'page.waitForLoadState("networkidle")' por 'page.waitForURL()'
    ou 'page.waitForSelector()' para aguardar um elemento específico da página
    de destino, evitando a dependência de silêncio de rede.
  evidence:
    - evt-247
  added: 2026-11-02
  hits: 8
  helped: 1
  helpedRate: 0.125
  status: retired
- id: L-044
  scope:
    roles:
      - implement
      - implement_hard
    tags:
      - ui
      - sync
  rule: Ajuste a cor do texto ou do fundo no seletor `.break-all` na SettingsPage
    para atender ao ratio de contraste mínimo exigido.
  evidence:
    - evt-256
  added: 2026-11-05
  hits: 6
  helped: 2
  helpedRate: 0.3333333333333333
  status: retired
- id: L-045
  scope:
    roles:
      - implement
      - implement_hard
    tags:
      - e2e
      - gates
  rule: O G6 (e2e) foi o gate que mais falhou na etapa 1. Ele derrubou F-1.06,
    F-1.09 e F-1.12 com haiku, sonnet, kimi-pro e codex-mid, e só a F-1.09
    consumiu 14 tentativas. Antes de alterar código, abra o gate-report e anote
    o nome exato do teste que falhou e a mensagem de erro. Depois rode só esse
    spec contra os emuladores (yarn e2e --grep "<título>") e entregue só quando
    ele passar. Em fluxos de auth (vincular, sair, excluir), espere um elemento
    de UI que dependa do novo estado de onAuthStateChanged com locator.waitFor
    ou waitForURL. Não use networkidle e não aumente timeouts.
  evidence:
    - evt-230
    - evt-233
    - evt-238
    - evt-242
    - evt-246
    - evt-248
    - evt-252
    - evt-257
    - evt-267
  added: 2026-11-07
  hits: 0
  helped: 0
  helpedRate: null
  status: active
- id: L-046
  scope:
    roles:
      - implement
      - implement_hard
    tags:
      - gates
      - fix
  rule: "Em features F-N.fix-* (suíte da etapa falhou), leia o gate-report da
    etapa e reproduza só os gates que falharam, por exemplo yarn format:check
    para G2 ou o spec e2e citado para G6. Faça a correção mínima. Não rode a
    suíte e2e completa várias vezes: a F-1.fix-1 estourou o tempo assim
    (evt-274), e a F-1.fix-2 passou de primeira com uma correção focada
    (evt-276)."
  evidence:
    - evt-274
    - evt-276
  added: 2026-11-07
  hits: 0
  helped: 0
  helpedRate: null
  status: active
