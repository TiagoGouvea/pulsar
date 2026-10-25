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
(nenhuma)


# Papel: revisor da decomposição (features.json)

Revise o `features.json` gerado pelo inicializador. Não edite arquivos.

Verifique:
- **Cobertura:** todos os critérios de aceite abaixo aparecem em `covers` de alguma feature e os critérios de cada feature são verificáveis.
- **Granularidade:** cada feature cabe numa sessão de agente (até ~5 arquivos); nada genérico demais.
- **Dependências:** `dependsOn` coerente, sem ciclos, sem depender de etapa futura; etapas na ordem fixa.
- **Tags:** `ui` em telas; `statistics`, `security-rules`, `privacy-mode`, `sync` onde couber.

## Critérios de aceite
AC-01: Primeiro acesso anônimo funciona sem cadastro; tutorial e sugestões opcionais de 3–4 indicadores.
AC-02: Conversão para Google ou link mágico preserva UID e registros; tratar conflitos sem perda/mescla automática.
AC-03: Não existe autenticação por telefone/senha na UI da V1.
AC-04: Usuários não conseguem acessar dados uns dos outros; exclusão de conta apaga dados relacionados.
AC-05: Quatro formatos estruturados, observação opcional, frequência única/múltipla por dia.
AC-06: Sugestão **determinística** de agregação por tipo/grupo; usuário ajusta nas configurações avançadas antes do primeiro registro.
AC-07: Nome/sigla/emoji e arquivamento/reordenação; tipo/grupo/unidade/frequência/agregação bloqueados após haver histórico.
AC-08: Resultados aceitam sem preferência (padrão), maior, menor ou faixa ideal configurável.
AC-09: Registrar apenas hoje; substituir registro único de hoje; múltiplos registram eventos independentes.
AC-10: Excluir registro de qualquer dia; não editar valores de dias passados; recalcular o presente com os dados atuais.
AC-11: Persistir UTC; apresentar horário do navegador; sem lógica de viagens nem validação de data no servidor.
AC-12: Descrições desde o primeiro dia; comparação desde o segundo; associações seguem limiares fechados da seção 6.5.1.
AC-13: Até 5 cartões; like salva snapshot; dislike oculta versão; sem reação não cria pendência nem influencia análises futuras.
AC-14: Recalcular deterministicamente após inclusão/exclusão e na mudança de dia.
AC-15: Uma chamada de IA por usuário/dia, até 3 textos, com aceite antes da primeira chamada e fallback automático.
AC-16: Olho global alterna somente **nomes ↔ siglas** dos indicadores; emojis ocultos com olho fechado; gráficos não são mascarados.
AC-17: Design mobile fornecido deve ser validado por humano (metáfora esquerda/direita); no computador o layout só estica/desempilha, sem quebrar.
AC-18: PWA instalável; convite contextual a partir de uso recorrente, precedido por conversão de conta se anônima.
AC-19: Lembrete opcional único às 20h Brasília somente se não houve registro no dia; testes Chrome/Android e Safari/iPhone.
AC-20: Sem aprendizado de horários, offline, app nativo ou outros idiomas além de pt-BR.
AC-21: Seed de um usuário com 30 dias sintéticos e novos usuários criados em testes, sem seed em produção.

## features.json
```json
{
  "specHash": "",
  "features": [
    {
      "id": "F-0.01",
      "stage": 0,
      "title": "Scaffold do app e scripts obrigatórios",
      "description": "Vite + React 19 + TypeScript strict + Tailwind v4, Firebase (Auth, Firestore, Hosting) com emuladores no projeto offline demo-pulsar, ESLint + Prettier, Vitest com cobertura, Playwright (mobile 375x812 e desktop 1280x800 smoke), axe, rules-unit-testing, regras-base por UID e gates de navegador sobre e2e/routes.json. Feito pelo inicializador.",
      "specRefs": [
        "arquitetura.md#1",
        "arquitetura.md#9.1",
        "spec.md#7.2"
      ],
      "covers": [
        "AC-20"
      ],
      "acceptance": [
        "yarn build, lint, format:check, typecheck, test:unit, test:rules, test:e2e e test:visual rodam a partir de app/",
        "yarn e2e:serve sobe emuladores auth+firestore, roda o seed e serve vite preview em http://localhost:4173",
        "<html lang=\"pt-BR\"> e nenhuma outra língua de interface",
        "firestore.rules nega acesso entre UIDs e a internal/"
      ],
      "tests": [
        "app/e2e/routes.spec.ts",
        "app/tests/rules/baseline.test.ts"
      ],
      "protectedTests": [
        "app/e2e/routes.spec.ts",
        "app/tests/rules/baseline.test.ts"
      ],
      "tags": [],
      "difficulty": "normal",
      "dependsOn": [],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-0.02",
      "stage": 0,
      "title": "Design system, IndicatorLabel e página /_design",
      "description": "Tokens de design/pulsar_bio_analytics/DESIGN.md como CSS variables + tema Tailwind (src/design/tokens.css); componentes Button, Chip, Slider, NumberInput, Toggle, Card, Sheet, EyeToggle, GroupBadge e IndicatorLabel (único jeito de exibir nome/sigla/emoji). Página /_design só em builds de dev/emulador. Feito pelo inicializador.",
      "specRefs": [
        "spec.md#4.4",
        "spec.md#7.1",
        "spec.md#7.2",
        "arquitetura.md#2"
      ],
      "covers": [
        "AC-16",
        "AC-17"
      ],
      "acceptance": [
        "Olho inicia fechado (siglas), alterna nome <-> sigla e oculta emoji com olho fechado",
        "Sigla ausente vira 3 primeiras letras do nome + '...'",
        "/_design passa axe sem violações serious/critical e sem overflow horizontal em 375 e 1280",
        "/_design não existe no build de produção"
      ],
      "tests": [
        "app/src/design/__tests__/IndicatorLabel.test.tsx",
        "app/src/privacy/__tests__/label.test.ts",
        "app/e2e/routes.spec.ts",
        "app/e2e/visual.spec.ts"
      ],
      "protectedTests": [
        "app/src/privacy/__tests__/label.test.ts"
      ],
      "tags": [
        "ui",
        "privacy-mode"
      ],
      "difficulty": "normal",
      "dependsOn": [
        "F-0.01"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-0.03",
      "stage": 0,
      "title": "Seed sintético do usuário de desenvolvimento",
      "description": "scripts/seed-data.ts (gerador puro e determinístico, 45 dias, correlações plantadas, ruído, sentinelas ZQX_*) e scripts/seed.ts (grava via Admin SDK; recusa sem FIRESTORE_EMULATOR_HOST, exceto --demo com HARNESS_ALLOW_DEMO_SEED=1 e --project não-prod). Feito pelo inicializador.",
      "specRefs": [
        "spec.md#10",
        "arquitetura.md#11",
        "arquitetura.md#12"
      ],
      "covers": [
        "AC-21"
      ],
      "acceptance": [
        "Seed é determinístico para a mesma data",
        "Cobre Não explícito vs ausência, 0 vs ausência, múltiplos por dia, valor extremo, indicador arquivado e sem sigla",
        "Exercício -> energia com diferença >= 1,5 ponto plantada; sono -> foco monotônico; café x dor sem relação",
        "Recusa rodar fora do emulador sem opt-in explícito"
      ],
      "tests": [
        "app/scripts/__tests__/seed-data.test.ts"
      ],
      "protectedTests": [
        "app/scripts/__tests__/seed-data.test.ts"
      ],
      "tags": [],
      "difficulty": "easy",
      "dependsOn": [
        "F-0.01"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
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
      "tags": [
        "statistics"
      ],
      "difficulty": "normal",
      "dependsOn": [
        "F-0.01"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-1.02",
      "stage": 1,
      "title": "Utilitários de tempo (UTC, localDate do navegador, dia de Brasília)",
      "description": "src/lib/time.ts: localDate (YYYY-MM-DD) no fuso do navegador no momento do registro, formatação pt-BR de data/hora no fuso do navegador, chave de dia de Brasília (para quota de IA e lembrete), helpers de janela de 30 dias corridos. Sem lógica de viagens.",
      "specRefs": [
        "spec.md#5.2",
        "arquitetura.md#1.1",
        "arquitetura.md#3.3"
      ],
      "covers": [
        "AC-11"
      ],
      "acceptance": [
        "localDate usa o fuso do navegador (testado com TZ diferentes) e muda à meia-noite local",
        "Timestamps persistidos são UTC; exibição usa Intl pt-BR no fuso do navegador",
        "brasiliaDateKey usa America/Sao_Paulo independentemente do fuso do navegador",
        "Nenhuma correção por viagem/mudança de fuso"
      ],
      "tests": [
        "app/src/lib/__tests__/time.test.ts"
      ],
      "protectedTests": [
        "app/src/lib/__tests__/time.test.ts"
      ],
      "tags": [],
      "difficulty": "easy",
      "dependsOn": [
        "F-0.01"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-1.03",
      "stage": 1,
      "title": "Acesso anônimo automático e documento do usuário",
      "description": "AuthProvider (src/auth/) que faz signInAnonymously na primeira visita, preserva a sessão, cria users/{uid} (createdAt, onboardingCompleted=false, aiConsent=false, reminderEnabled=false) e expõe estado de carregamento. Rotas: / redireciona para /onboarding (se não concluído) ou /dashboard.",
      "specRefs": [
        "spec.md#3",
        "spec.md#3.1",
        "arquitetura.md#3.1"
      ],
      "covers": [
        "AC-01"
      ],
      "acceptance": [
        "Primeira visita entra sem cadastro, sem e-mail e sem tela de login",
        "Recarregar a página mantém o mesmo UID",
        "users/{uid} é criado uma única vez com os defaults",
        "Erro de rede mostra mensagem em pt-BR, sem indicar sucesso"
      ],
      "tests": [
        "app/e2e/anonymous-start.spec.ts",
        "app/src/auth/__tests__/AuthProvider.test.tsx"
      ],
      "protectedTests": [
        "app/e2e/anonymous-start.spec.ts"
      ],
      "tags": [
        "sync"
      ],
      "difficulty": "normal",
      "dependsOn": [
        "F-0.01"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-1.04",
      "stage": 1,
      "title": "AppShell: cabeçalho com olho, navegação inferior e layout esticável",
      "description": "Cabeçalho (marca Pulsar, EyeToggle, atalho de perfil -> /settings) e barra inferior Dashboard / Registrar / Indicadores / Conclusões conforme design/*/code.html. Coluna central com max-width var(--container-app); no desktop só estica e listas podem desempilhar (grid auto-fit). Rotas placeholder: /dashboard, /register, /indicators, /saved-insights, /settings. Atualizar e2e/routes.json.",
      "specRefs": [
        "spec.md#6.1",
        "spec.md#7.2",
        "spec.md#7.3",
        "arquitetura.md#2"
      ],
      "covers": [
        "AC-16",
        "AC-17"
      ],
      "acceptance": [
        "Olho global presente em todas as telas autenticadas (data-testid=eye-toggle)",
        "Navegação inferior com rótulos e ícones; item ativo com aria-current=page",
        "Sem overflow horizontal em 375x812 e 1280x800; sem breakpoints específicos de desktop",
        "Alvos de toque >= 44px"
      ],
      "tests": [
        "app/e2e/app-shell.spec.ts"
      ],
      "protectedTests": [
        "app/e2e/app-shell.spec.ts"
      ],
      "tags": [
        "ui",
        "privacy-mode"
      ],
      "difficulty": "normal",
      "dependsOn": [
        "F-0.02",
        "F-1.03"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-1.05",
      "stage": 1,
      "title": "Fixtures de e2e: usuário do seed e usuários novos",
      "description": "Em builds de emulador, expor um helper de teste (ex.: window.__pulsarTest.signInWithCustomToken) e fixtures Playwright em app/e2e/fixtures.ts: seedPage (entra como seed-user-0001 via custom token do Auth Emulator) e freshUserPage (novo anônimo por teste). Nunca incluído no build de produção.",
      "specRefs": [
        "spec.md#10",
        "arquitetura.md#12"
      ],
      "covers": [
        "AC-21"
      ],
      "acceptance": [
        "Fixture seedPage abre o app autenticado como o usuário do seed",
        "Fixture freshUserPage cria um UID novo por teste",
        "Build de produção não contém o helper (verificado por busca no dist/)"
      ],
      "tests": [
        "app/e2e/fixtures.spec.ts"
      ],
      "protectedTests": [],
      "tags": [],
      "difficulty": "normal",
      "dependsOn": [
        "F-1.03"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-1.06",
      "stage": 1,
      "title": "Guarda e2e do modo privado (sentinelas)",
      "description": "Teste e2e que, com o usuário do seed, percorre todas as rotas de e2e/routes.json com o olho fechado e verifica que ZQX_ENERGIA_7F3, ZQX_SONO_9K2, ZQX_FOCO_4M8 e ZQX_OBS_NOTA_5T1 não aparecem fora de [data-privacy-allow]; abrir o olho revela nomes e emojis; recarregar volta a siglas. Gráficos não são mascarados.",
      "specRefs": [
        "spec.md#4.4",
        "spec.md#13",
        "arquitetura.md#2"
      ],
      "covers": [
        "AC-16"
      ],
      "acceptance": [
        "Olho fechado: nenhuma sentinela de nome de indicador visível fora de [data-privacy-allow]",
        "Observações (ZQX_OBS_NOTA_5T1) só aparecem onde a pessoa abre a nota explicitamente e marcadas com data-privacy-allow",
        "Olho aberto: nomes e emojis aparecem",
        "Reload reinicia em siglas"
      ],
      "tests": [
        "app/e2e/privacy-mode.spec.ts"
      ],
      "protectedTests": [
        "app/e2e/privacy-mode.spec.ts"
      ],
      "tags": [
        "privacy-mode",
        "ui"
      ],
      "difficulty": "normal",
      "dependsOn": [
        "F-1.04",
        "F-1.05"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-1.07",
      "stage": 1,
      "title": "Tutorial de três telas",
      "description": "/onboarding com 3 passos (Fatores, Resultados, Associações e privacidade) seguindo design/onboarding_1_fatores, onboarding_2_resultados e onboarding_3_associa_es; Próximo, Voltar e Pular; ao concluir ou pular grava onboardingCompleted=true e vai ao dashboard.",
      "specRefs": [
        "spec.md#3.1",
        "spec.md#6.6"
      ],
      "covers": [
        "AC-01"
      ],
      "acceptance": [
        "Três telas com Próximo/Voltar/Pular",
        "Concluir ou pular grava onboardingCompleted=true e não reaparece",
        "Tela 3 explica que correlação não é causalidade, o modo de siglas e a conta anônima"
      ],
      "tests": [
        "app/e2e/onboarding.spec.ts"
      ],
      "protectedTests": [
        "app/e2e/onboarding.spec.ts"
      ],
      "tags": [
        "ui"
      ],
      "difficulty": "easy",
      "dependsOn": [
        "F-1.04"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-1.08",
      "stage": 1,
      "title": "Regras: documento do usuário e campos protegidos",
      "description": "firestore.rules: users/{uid} só aceita campos conhecidos com tipos válidos (onboardingCompleted, aiConsent, reminderEnabled, lastInsightRefreshAt, createdAt); campos administrativos e internal/ só via Admin SDK; isolamento entre UIDs incluindo anônimos.",
      "specRefs": [
        "spec.md#9",
        "arquitetura.md#9.1",
        "arquitetura.md#9.2"
      ],
      "covers": [
        "AC-04"
      ],
      "acceptance": [
        "UID A não lê nem escreve nada sob users/B (anônimo e permanente)",
        "Campos desconhecidos ou de tipo errado em users/{uid} são rejeitados",
        "internal/** inacessível a clientes"
      ],
      "tests": [
        "app/tests/rules/users.test.ts"
      ],
      "protectedTests": [
        "app/tests/rules/users.test.ts"
      ],
      "tags": [
        "security-rules"
      ],
      "difficulty": "normal",
      "dependsOn": [
        "F-0.01"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-1.09",
      "stage": 1,
      "title": "Conversão da conta: Google e link mágico preservando UID",
      "description": "Configurações > Conta (design/configura_es_e_conta): vincular Google (linkWithPopup) ou e-mail por link (sendSignInLinkToEmail + linkWithCredential, guardando o e-mail digitado). Verificar UID antes/depois. Se a credencial já pertence a outro UID, mostrar conflito com opções explícitas (cancelar / entrar na conta existente após confirmação), sem mesclar, substituir ou apagar dados. Sem senha nem telefone na UI.",
      "specRefs": [
        "spec.md#3",
        "arquitetura.md#3.1"
      ],
      "covers": [
        "AC-02",
        "AC-03"
      ],
      "acceptance": [
        "Após vincular Google ou link mágico o UID é o mesmo e os registros continuam acessíveis",
        "credential-already-in-use / email-already-in-use abre resolução explícita; nada é mesclado ou apagado",
        "Nenhum campo de senha ou telefone em toda a UI",
        "Conta anônima mostra aviso de que perder o navegador pode significar perder os dados"
      ],
      "tests": [
        "app/src/auth/__tests__/linkAccount.test.ts",
        "app/e2e/account-link.spec.ts"
      ],
      "protectedTests": [
        "app/e2e/account-link.spec.ts"
      ],
      "tags": [
        "ui",
        "sync"
      ],
      "difficulty": "hard",
      "dependsOn": [
        "F-1.03",
        "F-1.04",
        "F-1.05"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-1.10",
      "stage": 1,
      "title": "Workspace de Cloud Functions com emulador",
      "description": "app/functions (TypeScript, Node 22, firebase-functions v2, região southamerica-east1), emulador de functions no firebase.json, e2e:serve incluindo o emulador de functions, script test:functions (vitest + emuladores). Sem funções de negócio ainda além de um healthcheck interno.",
      "specRefs": [
        "arquitetura.md#1",
        "DECISOES.md#Outras"
      ],
      "covers": [],
      "acceptance": [
        "yarn --cwd app test:functions roda testes de functions contra emuladores",
        "Região padrão southamerica-east1",
        "Build das functions em functions/lib ignorado pelo lint/format"
      ],
      "tests": [
        "app/functions/src/__tests__/setup.test.ts"
      ],
      "protectedTests": [],
      "tags": [],
      "difficulty": "normal",
      "dependsOn": [
        "F-0.01"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-1.11",
      "stage": 1,
      "title": "Function deleteAccount: exclusão integral",
      "description": "Callable v2 deleteAccount: exige auth; contas não anônimas exigem auth_time recente (<= 5 min); apaga recursivamente users/{uid} (todas as subcoleções, tokens de push, feedback, conclusões), documentos em internal/ do UID e, por último, o usuário do Auth. Idempotente.",
      "specRefs": [
        "spec.md#3",
        "spec.md#9",
        "arquitetura.md#9.2",
        "DECISOES.md#Exclusão de conta"
      ],
      "covers": [
        "AC-04"
      ],
      "acceptance": [
        "Após a chamada não resta documento sob users/{uid} nem em internal/ para o UID",
        "Usuário removido do Auth somente depois da limpeza",
        "Conta Google/e-mail sem login recente recebe erro requires-recent-login",
        "Um UID não consegue excluir outro"
      ],
      "tests": [
        "app/functions/src/__tests__/deleteAccount.test.ts"
      ],
      "protectedTests": [
        "app/functions/src/__tests__/deleteAccount.test.ts"
      ],
      "tags": [
        "security-rules"
      ],
      "difficulty": "hard",
      "dependsOn": [
        "F-1.10"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-1.12",
      "stage": 1,
      "title": "Tela de conta: sair e excluir conta",
      "description": "Em Configurações > Conta: sair (com aviso extra para anônimo: perderá acesso) e excluir conta com confirmação digitando EXCLUIR e reautenticação quando não anônima; chama deleteAccount e volta ao início com nova sessão anônima.",
      "specRefs": [
        "spec.md#3",
        "spec.md#7.3",
        "DECISOES.md#Exclusão de conta"
      ],
      "covers": [
        "AC-04"
      ],
      "acceptance": [
        "Botão excluir só habilita após digitar EXCLUIR",
        "Conta não anônima pede reautenticação antes",
        "Após excluir, o app volta ao início sem dados do usuário anterior",
        "Sair de conta anônima exige confirmação explícita"
      ],
      "tests": [
        "app/e2e/account-delete.spec.ts"
      ],
      "protectedTests": [
        "app/e2e/account-delete.spec.ts"
      ],
      "tags": [
        "ui"
      ],
      "difficulty": "normal",
      "dependsOn": [
        "F-1.09",
        "F-1.11"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-2.01",
      "stage": 2,
      "title": "Repositório de indicadores",
      "description": "src/data/indicators.ts + hook useIndicators (onSnapshot): criar (aplicando sugestão de agregação), editar campos editáveis, arquivar/restaurar (archivedAt), reordenar dentro do grupo (sortOrder), sem apagar registros. Campos travados não são enviados depois de lockedAt.",
      "specRefs": [
        "spec.md#4.1",
        "spec.md#4.5",
        "arquitetura.md#3.2"
      ],
      "covers": [
        "AC-07"
      ],
      "acceptance": [
        "Criar grava todos os campos do modelo com createdAt/updatedAt de servidor",
        "Arquivar não apaga registros e tira o indicador do preenchimento",
        "Reordenar preserva a ordem por grupo após reload",
        "Edição de indicador travado só envia nome/sigla/emoji/ordem/status/direção/faixa"
      ],
      "tests": [
        "app/src/data/__tests__/indicators.test.ts"
      ],
      "protectedTests": [],
      "tags": [
        "sync"
      ],
      "difficulty": "normal",
      "dependsOn": [
        "F-1.01",
        "F-1.03"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-2.02",
      "stage": 2,
      "title": "Regras: schema e trava de indicadores",
      "description": "firestore.rules para users/{uid}/indicators: validação de schema/tipos/tamanhos; após lockedAt != null, group, valueType, numeric (unidade), scale, options, frequency e dailyAggregation são imutáveis; nome/sigla/emoji/sortOrder/archivedAt/desiredDirection/idealRange editáveis; direção só para Resultado; idealRange.min <= max; lockedAt não pode voltar a null.",
      "specRefs": [
        "spec.md#4.1",
        "spec.md#4.3",
        "arquitetura.md#3.2",
        "arquitetura.md#9.2"
      ],
      "covers": [
        "AC-07",
        "AC-08"
      ],
      "acceptance": [
        "Indicador com lockedAt rejeita mudança de grupo/tipo/unidade/escala/opções/frequência/agregação",
        "Indicador com lockedAt aceita mudar nome, sigla, emoji, ordem, arquivamento e direção/faixa",
        "Agregação incompatível com o tipo é rejeitada",
        "Fator com desiredDirection é rejeitado; faixa com min > max é rejeitada"
      ],
      "tests": [
        "app/tests/rules/indicators.test.ts"
      ],
      "protectedTests": [
        "app/tests/rules/indicators.test.ts"
      ],
      "tags": [
        "security-rules"
      ],
      "difficulty": "hard",
      "dependsOn": [
        "F-1.08",
        "F-1.01"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-2.03",
      "stage": 2,
      "title": "Editor de indicador (parte 1): grupo, identificação e tipo",
      "description": "Sheet 'Novo Indicador' (design/novo_indicador_modal): grupo Fator/Resultado, nome (input com data-privacy-allow), sigla (até 4), emoji opcional, tipo de resposta (Sim/Não, Escala, Opções ordenadas, Número + unidade) com configuração: escala min/max/passo (padrão 0–10 passo 1), 2–7 opções ordenadas editáveis, unidades sugeridas da spec + personalizada + sem unidade.",
      "specRefs": [
        "spec.md#4.1",
        "spec.md#4.2",
        "spec.md#4.4"
      ],
      "covers": [
        "AC-05",
        "AC-07"
      ],
      "acceptance": [
        "Os quatro tipos podem ser criados com sua configuração",
        "Nome é obrigatório; sigla vazia mostra prévia 'Abc...'",
        "Campo de nome mostra o nome real (data-privacy-allow) mesmo com olho fechado",
        "Mensagens de validação em pt-BR"
      ],
      "tests": [
        "app/src/indicators/__tests__/IndicatorEditor.test.tsx",
        "app/e2e/indicator-create.spec.ts"
      ],
      "protectedTests": [
        "app/e2e/indicator-create.spec.ts"
      ],
      "tags": [
        "ui"
      ],
      "difficulty": "normal",
      "dependsOn": [
        "F-2.01",
        "F-1.04"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-2.04",
      "stage": 2,
      "title": "Editor de indicador (parte 2): frequência, agregação, direção e trava",
      "description": "Frequência única/múltipla; com múltipla, mostrar agregação sugerida e 'Configurações avançadas' com apenas agregações válidas e um exemplo do efeito; Resultado: direção (sem preferência padrão, maior, menor, faixa ideal com min/max para numérico/escala). Em edição de indicador com histórico, campos travados aparecem desabilitados com explicação.",
      "specRefs": [
        "spec.md#4.1",
        "spec.md#4.1.1",
        "spec.md#4.3",
        "arquitetura.md#4"
      ],
      "covers": [
        "AC-06",
        "AC-07",
        "AC-08"
      ],
      "acceptance": [
        "Agregação não aparece para frequência única",
        "Configurações avançadas listam só opções válidas e mostram exemplo",
        "Direção padrão 'Sem preferência'; faixa ideal exige min <= max",
        "Com histórico, tipo/grupo/unidade/frequência/agregação ficam bloqueados e direção/faixa continuam editáveis"
      ],
      "tests": [
        "app/src/indicators/__tests__/AggregationControl.test.tsx",
        "app/e2e/indicator-edit-lock.spec.ts"
      ],
      "protectedTests": [
        "app/e2e/indicator-edit-lock.spec.ts"
      ],
      "tags": [
        "ui"
      ],
      "difficulty": "normal",
      "dependsOn": [
        "F-2.03"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-2.05",
      "stage": 2,
      "title": "Tela Meus indicadores",
      "description": "/indicators conforme design/meus_indicadores: listas separadas Fatores e Resultados com IndicatorLabel, tipo e agregação; reordenar com botões subir/descer; arquivar/restaurar; seção de arquivados; abrir editor.",
      "specRefs": [
        "spec.md#4.5",
        "spec.md#7.3"
      ],
      "covers": [
        "AC-07"
      ],
      "acceptance": [
        "Fatores e Resultados distinguíveis sem depender só de cor",
        "Reordenar dentro do grupo persiste",
        "Arquivados aparecem em seção própria e podem ser restaurados",
        "Nomes seguem o olho global"
      ],
      "tests": [
        "app/e2e/indicators-list.spec.ts"
      ],
      "protectedTests": [
        "app/e2e/indicators-list.spec.ts"
      ],
      "tags": [
        "ui",
        "privacy-mode"
      ],
      "difficulty": "normal",
      "dependsOn": [
        "F-2.03"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-2.06",
      "stage": 2,
      "title": "Repositório de registros",
      "description": "src/data/entries.ts: saveEntry só para o localDate de hoje; único por dia usa ID determinístico indicatorId_localDate e substitui; múltiplo gera ID único por evento; recordedAt serverTimestamp (UTC); note opcional; no primeiro registro grava lockedAt no indicador na mesma transação/batch; deleteEntry de qualquer dia. Estados pendente/erro sem sucesso antecipado.",
      "specRefs": [
        "spec.md#5.2",
        "spec.md#5.4",
        "arquitetura.md#3.3"
      ],
      "covers": [
        "AC-09",
        "AC-10",
        "AC-11"
      ],
      "acceptance": [
        "Não existe API para criar registro em data passada",
        "Único por dia: segundo save no mesmo dia substitui o documento",
        "Múltiplo: cada save cria documento independente",
        "Exclusão funciona para qualquer dia; não há edição de valores de dias passados",
        "Promise só resolve após persistência confirmada"
      ],
      "tests": [
        "app/src/data/__tests__/entries.test.ts"
      ],
      "protectedTests": [
        "app/src/data/__tests__/entries.test.ts"
      ],
      "tags": [
        "sync"
      ],
      "difficulty": "hard",
      "dependsOn": [
        "F-2.01",
        "F-1.02"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-2.07",
      "stage": 2,
      "title": "Regras: registros",
      "description": "firestore.rules para users/{uid}/entries: valor compatível com o tipo do indicador (get), indicador do mesmo UID e travado (getAfter lockedAt), note string <= 500, update só mantendo indicatorId/localDate/valueType; sem validação de data no servidor.",
      "specRefs": [
        "spec.md#5.2",
        "spec.md#9",
        "arquitetura.md#3.3",
        "arquitetura.md#9.2"
      ],
      "covers": [
        "AC-04",
        "AC-10",
        "AC-11"
      ],
      "acceptance": [
        "Valor incompatível com o tipo é rejeitado; opção inexistente é rejeitada",
        "Registro para indicador inexistente ou de outro UID é rejeitado",
        "Nenhuma regra compara localDate com a data do servidor",
        "Exclusão permitida ao dono para qualquer data"
      ],
      "tests": [
        "app/tests/rules/entries.test.ts"
      ],
      "protectedTests": [
        "app/tests/rules/entries.test.ts"
      ],
      "tags": [
        "security-rules"
      ],
      "difficulty": "hard",
      "dependsOn": [
        "F-2.02"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
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
        "F-2.04"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-2.09",
      "stage": 2,
      "title": "Histórico de registros e exclusão retroativa",
      "description": "A partir do indicador (Meus indicadores) abrir histórico com registros (data/hora no fuso do navegador, valor, observação ao tocar com data-privacy-allow) e excluir qualquer registro com confirmação. Sem edição de valores passados.",
      "specRefs": [
        "spec.md#5.2",
        "spec.md#5.3",
        "arquitetura.md#3.3"
      ],
      "covers": [
        "AC-10",
        "AC-11"
      ],
      "acceptance": [
        "Lista mostra horários no fuso do navegador",
        "Excluir pede confirmação e remove o registro",
        "Não há controle para editar valor de dia passado"
      ],
      "tests": [
        "app/e2e/entry-history.spec.ts"
      ],
      "protectedTests": [
        "app/e2e/entry-history.spec.ts"
      ],
      "tags": [
        "ui",
        "privacy-mode"
      ],
      "difficulty": "normal",
      "dependsOn": [
        "F-2.06",
        "F-2.05"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
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
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-2.11",
      "stage": 2,
      "title": "Convite discreto para salvar a conta",
      "description": "Regra pura (src/account/invite.ts): mostrar banner dispensável no dashboard para conta anônima com registros em 3 dias distintos; dispensado, volta só após mais 7 dias com registro. Banner leva à conversão (F-1.09). Estado de dispensa salvo em users/{uid}.",
      "specRefs": [
        "spec.md#3",
        "DECISOES.md#Login"
      ],
      "covers": [
        "AC-02",
        "AC-01"
      ],
      "acceptance": [
        "Não aparece com < 3 dias distintos; aparece com 3",
        "Dispensado só reaparece após 7 novos dias com registro",
        "Nunca aparece para conta já convertida; nunca bloqueia o uso"
      ],
      "tests": [
        "app/src/account/__tests__/invite.test.ts",
        "app/e2e/save-account-banner.spec.ts"
      ],
      "protectedTests": [
        "app/src/account/__tests__/invite.test.ts"
      ],
      "tags": [
        "ui"
      ],
      "difficulty": "normal",
      "dependsOn": [
        "F-2.06",
        "F-1.09"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-3.01",
      "stage": 3,
      "title": "Estatística: agregação diária e séries da janela",
      "description": "src/stats/daily.ts (puro): agrega registros por indicador/dia (sum, mean, last com desempate por ID estável, any; único usa o valor do dia), monta séries diárias da janela de 30 dias corridos terminando hoje; ausência fica ausente (nunca false/0).",
      "specRefs": [
        "spec.md#4.1.1",
        "arquitetura.md#4",
        "arquitetura.md#5.3"
      ],
      "covers": [
        "AC-06",
        "AC-14"
      ],
      "acceptance": [
        "sum/mean/last/any corretos, inclusive last com timestamps iguais",
        "Dia sem registro não aparece na série; false e 0 são preservados",
        "Janela = 30 dias corridos incluindo hoje",
        "Funções determinísticas (mesma entrada => mesma saída)"
      ],
      "tests": [
        "app/src/stats/__tests__/daily.test.ts"
      ],
      "protectedTests": [
        "app/src/stats/__tests__/daily.test.ts"
      ],
      "tags": [
        "statistics"
      ],
      "difficulty": "normal",
      "dependsOn": [
        "F-1.01"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-3.02",
      "stage": 3,
      "title": "Estatística: retrato do dia e comparação entre dias",
      "description": "src/stats/descriptive.ts: retrato do dia (>= 1 registro hoje), comparação simples entre hoje e o dia anterior mais recente com valor comparável do mesmo indicador (>= 2 dias), frequência de fator booleano 'Sim em X dos últimos N dias com resposta'. Nunca gera associação com 2 dias.",
      "specRefs": [
        "spec.md#6.1",
        "spec.md#6.2",
        "spec.md#6.5.1",
        "spec.md#13"
      ],
      "covers": [
        "AC-12"
      ],
      "acceptance": [
        "Dia 1 com registro => retrato; sem registro => nada",
        "Dia 2 com registros comparáveis => comparação; 1 dia => nenhuma",
        "Denominadores contam só dias com resposta"
      ],
      "tests": [
        "app/src/stats/__tests__/descriptive.test.ts"
      ],
      "protectedTests": [
        "app/src/stats/__tests__/descriptive.test.ts"
      ],
      "tags": [
        "statistics"
      ],
      "difficulty": "normal",
      "dependsOn": [
        "F-3.01"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-3.03",
      "stage": 3,
      "title": "Estatística: tendências",
      "description": "src/stats/trend.ts: duas janelas consecutivas de 7 dias corridos (hoje..hoje-6 e anteriores), >= 4 dias válidos em cada; escala 0–10: |diferença| >= 1 ponto; numérico livre (e escalas fora de 0–10): |diferença| >= 0,8 x desvio-padrão amostral (n-1) da série reunida; desvio 0 => não exibe.",
      "specRefs": [
        "spec.md#6.5.1",
        "arquitetura.md#5.2",
        "arquitetura.md#5.3"
      ],
      "covers": [
        "AC-12"
      ],
      "acceptance": [
        "Testes de borda abaixo/igual/acima para 4 dias por janela, 1 ponto e 0,8 DP",
        ">= inclui igualdade",
        "Desvio-padrão zero não gera tendência",
        "Ordinal não gera tendência"
      ],
      "tests": [
        "app/src/stats/__tests__/trend.test.ts"
      ],
      "protectedTests": [
        "app/src/stats/__tests__/trend.test.ts"
      ],
      "tags": [
        "statistics"
      ],
      "difficulty": "normal",
      "dependsOn": [
        "F-3.01"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-3.04",
      "stage": 3,
      "title": "Estatística: associações com fator booleano",
      "description": "src/stats/association.ts: só dias pareados com resposta explícita; Fator booleano x Resultado 0–10 (>= 14 pares, >= 5 Sim e >= 5 Não, |dif. médias| >= 1,5); x Resultado numérico livre (mesmas contagens, |dif| >= 0,8 x DP amostral do Resultado nos pares, DP 0 => nada); x Resultado booleano (>= 14 pares, >= 5 por grupo, |dif. proporção Sim| >= 25 pp).",
      "specRefs": [
        "spec.md#6.2",
        "spec.md#6.5.1",
        "arquitetura.md#5.2",
        "arquitetura.md#5.4"
      ],
      "covers": [
        "AC-12"
      ],
      "acceptance": [
        "Testes de borda abaixo/igual/acima para 14 pares, 5 por grupo, 1,5 ponto, 0,8 DP e 25 pp",
        "Ausência nunca entra no grupo Não",
        "Ordinal nunca gera associação",
        "Seed: exercício x energia elegível; café x dor não"
      ],
      "tests": [
        "app/src/stats/__tests__/association-boolean.test.ts"
      ],
      "protectedTests": [
        "app/src/stats/__tests__/association-boolean.test.ts"
      ],
      "tags": [
        "statistics"
      ],
      "difficulty": "hard",
      "dependsOn": [
        "F-3.01"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-3.05",
      "stage": 3,
      "title": "Estatística: Spearman fator numérico x resultado numérico",
      "description": "Spearman com postos médios para empates; Fator numérico/escala x Resultado numérico/escala: >= 16 dias pareados, >= 4 valores distintos em cada variável, |rho| >= 0,55; série constante não gera associação nem divisão por zero.",
      "specRefs": [
        "spec.md#6.5.1",
        "arquitetura.md#5.2",
        "arquitetura.md#5.3"
      ],
      "covers": [
        "AC-12"
      ],
      "acceptance": [
        "rho correto com empates (comparado a valores de referência)",
        "Bordas abaixo/igual/acima para 16 pares, 4 distintos e 0,55",
        "Série constante => nenhuma associação",
        "Seed: sono x foco elegível"
      ],
      "tests": [
        "app/src/stats/__tests__/spearman.test.ts"
      ],
      "protectedTests": [
        "app/src/stats/__tests__/spearman.test.ts"
      ],
      "tags": [
        "statistics"
      ],
      "difficulty": "hard",
      "dependsOn": [
        "F-3.01"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-3.06",
      "stage": 3,
      "title": "Seleção de insights (até 5 cartões) e versões de evidência",
      "description": "src/stats/select.ts: recebe candidatos e devolve até 5 cartões (até 2 associações, até 2 tendências, ao menos 1 resumo factual, redistribuindo vagas), ordenados por força relativa ao limiar, amostra e hypothesisKey (determinístico); um cartão por par; hypothesisKey estável e evidenceVersion = hash determinístico de período+amostra+métricas; exclui versões com dislike.",
      "specRefs": [
        "spec.md#6.4",
        "spec.md#6.5.1",
        "arquitetura.md#3.4",
        "arquitetura.md#5.2"
      ],
      "covers": [
        "AC-13",
        "AC-14"
      ],
      "acceptance": [
        "Nunca mais de 5 cartões; nunca mais de 2 associações ou 2 tendências",
        "Mesma entrada => mesma seleção e mesmos evidenceVersion",
        "Versão com dislike não é selecionada",
        "Cartões sem reação não afetam seleção futura (função não recebe histórico de exibição)"
      ],
      "tests": [
        "app/src/stats/__tests__/select.test.ts"
      ],
      "protectedTests": [
        "app/src/stats/__tests__/select.test.ts"
      ],
      "tags": [
        "statistics"
      ],
      "difficulty": "normal",
      "dependsOn": [
        "F-3.02",
        "F-3.03",
        "F-3.04",
        "F-3.05"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-3.07",
      "stage": 3,
      "title": "Textos determinísticos dos insights (templates pt-BR)",
      "description": "src/insights/templates.ts: frases estruturadas em tokens (texto, número formatado pt-BR, referência a indicatorId) renderizadas por <InsightText> usando IndicatorLabel; linguagem responsável (possível associação, poucos dados), período e dias válidos; nunca 'causou', 'comprovado', 'certeza' ou recomendação de dose.",
      "specRefs": [
        "spec.md#6.3",
        "spec.md#6.6",
        "arquitetura.md#3.4",
        "arquitetura.md#5.5"
      ],
      "covers": [
        "AC-12",
        "AC-16"
      ],
      "acceptance": [
        "Todo nome de indicador no texto passa por IndicatorLabel (sigla com olho fechado)",
        "Números em formato pt-BR (vírgula decimal)",
        "Lista de termos proibidos verificada por teste",
        "Sempre mostra base (dias) e período"
      ],
      "tests": [
        "app/src/insights/__tests__/templates.test.ts",
        "app/src/insights/__tests__/InsightText.test.tsx"
      ],
      "protectedTests": [
        "app/src/insights/__tests__/templates.test.ts"
      ],
      "tags": [
        "privacy-mode"
      ],
      "difficulty": "normal",
      "dependsOn": [
        "F-3.06"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-3.08",
      "stage": 3,
      "title": "Motor de recálculo no cliente",
      "description": "Hook useInsights: carrega indicadores e registros da janela de 30 dias, recalcula imediatamente após inclusão/substituição/exclusão confirmada, na abertura do app e quando o localDate muda (visibilitychange/focus/timer). Sem job diário. Atualiza lastInsightRefreshAt.",
      "specRefs": [
        "spec.md#6.5",
        "arquitetura.md#5.1",
        "arquitetura.md#7"
      ],
      "covers": [
        "AC-14"
      ],
      "acceptance": [
        "Excluir registro antigo atualiza o dashboard com os dados atuais",
        "Virada de dia local (relógio simulado) recalcula sem recarregar",
        "Snapshots salvos não são recalculados"
      ],
      "tests": [
        "app/src/insights/__tests__/useInsights.test.tsx",
        "app/e2e/recalculation.spec.ts"
      ],
      "protectedTests": [
        "app/e2e/recalculation.spec.ts"
      ],
      "tags": [
        "sync",
        "statistics"
      ],
      "difficulty": "hard",
      "dependsOn": [
        "F-3.06",
        "F-2.06"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-3.09",
      "stage": 3,
      "title": "Dashboard com insights",
      "description": "/dashboard conforme design/dashboard_insights, dashboard_dia_2_compara_es_iniciais e dashboard_dia_14_primeira_correla_o: saudação, botão 'Registrar agora', Resumo de hoje (somente o preenchido), lista de até 5 cartões, atalho para Conclusões salvas, estados carregando/erro/dados insuficientes.",
      "specRefs": [
        "spec.md#6.1",
        "spec.md#6.3",
        "spec.md#5.4"
      ],
      "covers": [
        "AC-12",
        "AC-17"
      ],
      "acceptance": [
        "Dia 1: retrato; dia 2: comparação; associação só quando elegível",
        "Nunca mais de 5 cartões",
        "Resumo de hoje não cobra indicadores não respondidos",
        "Layout estica no desktop sem quebrar"
      ],
      "tests": [
        "app/e2e/dashboard.spec.ts"
      ],
      "protectedTests": [
        "app/e2e/dashboard.spec.ts"
      ],
      "tags": [
        "ui",
        "privacy-mode"
      ],
      "difficulty": "normal",
      "dependsOn": [
        "F-3.08",
        "F-3.07",
        "F-2.10"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-3.10",
      "stage": 3,
      "title": "Cartão de insight e mini gráficos",
      "description": "InsightCard com categoria (Comparação/Tendência/Associação/Retrato), frase, base e período, 'Entender análise', espaço para like/dislike, e mini gráficos SVG próprios (barras de comparação, sparkline, pontos de frequência). Gráficos não são mascarados; só rótulos de indicador seguem o olho.",
      "specRefs": [
        "spec.md#6.3",
        "spec.md#4.4",
        "arquitetura.md#2"
      ],
      "covers": [
        "AC-16",
        "AC-13"
      ],
      "acceptance": [
        "Valores, eixos e traçados idênticos com olho aberto ou fechado",
        "Legendas com nome de indicador usam IndicatorLabel",
        "Cartão mostra base (n dias) e período"
      ],
      "tests": [
        "app/src/insights/__tests__/InsightCard.test.tsx"
      ],
      "protectedTests": [
        "app/src/insights/__tests__/InsightCard.test.tsx"
      ],
      "tags": [
        "ui",
        "privacy-mode"
      ],
      "difficulty": "normal",
      "dependsOn": [
        "F-3.07"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-3.11",
      "stage": 3,
      "title": "Detalhes do insight (Entender análise)",
      "description": "/insights/:hypothesisKey conforme design/detalhes_do_insight: números usados, grupos comparados, amostra e denominadores, período, critério atendido (limiar), metodologia resumida e ressalva de não causalidade.",
      "specRefs": [
        "spec.md#6.3",
        "spec.md#6.6",
        "arquitetura.md#5.5"
      ],
      "covers": [
        "AC-12"
      ],
      "acceptance": [
        "Mostra n, período e valores reais do cálculo",
        "Mostra o limiar aplicado (ex.: >= 1,5 ponto)",
        "Ressalva de correlação/causalidade sempre visível"
      ],
      "tests": [
        "app/e2e/insight-detail.spec.ts"
      ],
      "protectedTests": [
        "app/e2e/insight-detail.spec.ts"
      ],
      "tags": [
        "ui",
        "privacy-mode"
      ],
      "difficulty": "normal",
      "dependsOn": [
        "F-3.09"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-4.01",
      "stage": 4,
      "title": "Dados de curadoria: like, dislike e snapshots",
      "description": "src/data/feedback.ts: like grava insightFeedback (liked) e savedInsights com snapshot imutável (tokens do texto, métricas, amostra, período, likedAt e cópia de nome/sigla/emoji dos indicadores no momento); dislike grava insightFeedback (disliked) com hypothesisKey+evidenceVersion. Sem reação nada é gravado.",
      "specRefs": [
        "spec.md#6.4",
        "arquitetura.md#3.5"
      ],
      "covers": [
        "AC-13"
      ],
      "acceptance": [
        "Like cria snapshot que não muda após excluir registros ou renomear indicador",
        "Dislike oculta aquela versão",
        "Nenhuma escrita para cartões sem reação"
      ],
      "tests": [
        "app/src/data/__tests__/feedback.test.ts"
      ],
      "protectedTests": [],
      "tags": [
        "sync"
      ],
      "difficulty": "normal",
      "dependsOn": [
        "F-3.06"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-4.02",
      "stage": 4,
      "title": "Regras: snapshots e feedback",
      "description": "firestore.rules: savedInsights só create (com schema) e delete pelo dono, nunca update; insightFeedback só create/delete, action liked|disliked; tamanhos limitados.",
      "specRefs": [
        "spec.md#6.4",
        "arquitetura.md#3.5",
        "arquitetura.md#9.2"
      ],
      "covers": [
        "AC-13"
      ],
      "acceptance": [
        "Update em savedInsights é rejeitado",
        "insightFeedback com action inválida é rejeitado",
        "Outro UID não lê conclusões salvas"
      ],
      "tests": [
        "app/tests/rules/saved-insights.test.ts"
      ],
      "protectedTests": [
        "app/tests/rules/saved-insights.test.ts"
      ],
      "tags": [
        "security-rules"
      ],
      "difficulty": "normal",
      "dependsOn": [
        "F-1.08"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-4.03",
      "stage": 4,
      "title": "Regra de evidência nova material após dislike",
      "description": "src/stats/reappear.ts (puro): hipótese com dislike só volta quando a evidência muda materialmente: >= 7 dias pareados a mais que na versão descartada OU inversão do sinal do efeito; mudança só de texto/IA nunca conta.",
      "specRefs": [
        "spec.md#6.4",
        "spec.md#13",
        "arquitetura.md#3.5"
      ],
      "covers": [
        "AC-13"
      ],
      "acceptance": [
        "Mesmos dados com nova redação não reaparecem",
        "+6 pares não reaparece; +7 reaparece",
        "Inversão de sinal reaparece"
      ],
      "tests": [
        "app/src/stats/__tests__/reappear.test.ts"
      ],
      "protectedTests": [
        "app/src/stats/__tests__/reappear.test.ts"
      ],
      "tags": [
        "statistics"
      ],
      "difficulty": "normal",
      "dependsOn": [
        "F-3.06"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-4.04",
      "stage": 4,
      "title": "Like e dislike nos cartões",
      "description": "Botões like/dislike com aria-pressed e rótulos em pt-BR; like confirma 'Salvo em Conclusões'; dislike remove o cartão imediatamente; não existe caixa de pendências.",
      "specRefs": [
        "spec.md#6.3",
        "spec.md#6.4"
      ],
      "covers": [
        "AC-13"
      ],
      "acceptance": [
        "Like salva e aparece em Conclusões",
        "Dislike some do dashboard e não volta com os mesmos dados",
        "Sem reação, o cartão some quando deixa de ser elegível e nada é salvo"
      ],
      "tests": [
        "app/e2e/insight-feedback.spec.ts"
      ],
      "protectedTests": [
        "app/e2e/insight-feedback.spec.ts"
      ],
      "tags": [
        "ui"
      ],
      "difficulty": "normal",
      "dependsOn": [
        "F-4.01",
        "F-4.03",
        "F-3.10"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-4.05",
      "stage": 4,
      "title": "Conclusões salvas (timeline)",
      "description": "/saved-insights conforme design/conclus_es_salvas: timeline privada dos snapshots em ordem de likedAt, com data salva, período, métricas e amostra; detalhe do snapshot; rótulos seguem o olho usando os dados congelados do snapshot.",
      "specRefs": [
        "spec.md#6.4",
        "spec.md#13"
      ],
      "covers": [
        "AC-13"
      ],
      "acceptance": [
        "Snapshot mantém números e data originais após novos registros/exclusões",
        "Estado vazio explica como salvar conclusões",
        "Nomes seguem o olho global"
      ],
      "tests": [
        "app/e2e/saved-insights.spec.ts"
      ],
      "protectedTests": [
        "app/e2e/saved-insights.spec.ts"
      ],
      "tags": [
        "ui",
        "privacy-mode"
      ],
      "difficulty": "normal",
      "dependsOn": [
        "F-4.04"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-5.01",
      "stage": 5,
      "title": "PWA instalável sem offline",
      "description": "manifest.webmanifest (nome Pulsar, ícones 192/512/maskable, display standalone, lang pt-BR, cores do design), service worker mínimo sem cache de fetch (só para instalabilidade/push), meta tags iOS.",
      "specRefs": [
        "spec.md#8",
        "arquitetura.md#8.1",
        "arquitetura.md#8.3"
      ],
      "covers": [
        "AC-18",
        "AC-20"
      ],
      "acceptance": [
        "Manifest válido e app instalável no Chrome",
        "Service worker não intercepta nem cacheia requisições",
        "Sem modo offline"
      ],
      "tests": [
        "app/e2e/pwa-manifest.spec.ts"
      ],
      "protectedTests": [
        "app/e2e/pwa-manifest.spec.ts"
      ],
      "tags": [],
      "difficulty": "normal",
      "dependsOn": [
        "F-1.04"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-5.02",
      "stage": 5,
      "title": "Convite interno para instalar",
      "description": "Regra pura: convite após uso recorrente (registros em >= 5 dias distintos) e somente para conta convertida; se anônima, oferecer antes a conversão. Android: beforeinstallprompt; iPhone: instruções 'Adicionar à Tela de Início' e aviso de sessão separada. Texto: 'Instale o Pulsar para acessar mais rápido e receber um lembrete diário'.",
      "specRefs": [
        "spec.md#3",
        "spec.md#8",
        "arquitetura.md#8.1"
      ],
      "covers": [
        "AC-18"
      ],
      "acceptance": [
        "Conta anônima nunca vê o convite de instalar, vê a conversão",
        "Conta convertida com >= 5 dias vê o convite; < 5 não",
        "Sem promessa de melhora clínica"
      ],
      "tests": [
        "app/src/pwa/__tests__/installInvite.test.ts",
        "app/e2e/install-invite.spec.ts"
      ],
      "protectedTests": [
        "app/src/pwa/__tests__/installInvite.test.ts"
      ],
      "tags": [
        "ui"
      ],
      "difficulty": "normal",
      "dependsOn": [
        "F-5.01",
        "F-1.09"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-5.03",
      "stage": 5,
      "title": "Opt-in do lembrete e token FCM",
      "description": "Configurações: Toggle 'Lembrete diário às 20h (Brasília)'; pede permissão só após o gesto; registra token FCM em users/{uid}/pushSubscriptions/{deviceId} (lastSeenAt, consent); desativar remove token e grava reminderEnabled=false; sem suporte/permissão negada mostra explicação e o app segue normal.",
      "specRefs": [
        "spec.md#8",
        "arquitetura.md#3.6",
        "arquitetura.md#8.2"
      ],
      "covers": [
        "AC-19"
      ],
      "acceptance": [
        "Permissão nunca é pedida sem ação explícita",
        "Opt-out remove o token e desliga o lembrete",
        "Navegador sem suporte não quebra a tela",
        "Nenhum horário configurável"
      ],
      "tests": [
        "app/e2e/reminder-optin.spec.ts",
        "app/tests/rules/push-subscriptions.test.ts"
      ],
      "protectedTests": [
        "app/tests/rules/push-subscriptions.test.ts"
      ],
      "tags": [
        "ui",
        "security-rules"
      ],
      "difficulty": "normal",
      "dependsOn": [
        "F-5.01",
        "F-1.08"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-5.04",
      "stage": 5,
      "title": "Function agendada do lembrete das 20h",
      "description": "onSchedule('0 20 * * *', timeZone America/Sao_Paulo, southamerica-east1): seleciona usuários com reminderEnabled e token válido, pula quem tem registro no dia de Brasília (recordedAt no intervalo do dia), grava chave idempotente internal/reminders/{brasiliaDate}_{uid} em transação antes de enviar, usa só o token mais recente, texto genérico 'Quer registrar como foi seu dia no Pulsar?', remove tokens inválidos.",
      "specRefs": [
        "spec.md#8",
        "arquitetura.md#8.2",
        "arquitetura.md#8.3"
      ],
      "covers": [
        "AC-19"
      ],
      "acceptance": [
        "Reexecução no mesmo dia não envia de novo",
        "Usuário com registro no dia de Brasília não recebe",
        "Payload sem nome, sigla ou observação",
        "Vários dispositivos => um envio ao mais recente"
      ],
      "tests": [
        "app/functions/src/__tests__/dailyReminder.test.ts"
      ],
      "protectedTests": [
        "app/functions/src/__tests__/dailyReminder.test.ts"
      ],
      "tags": [
        "security-rules"
      ],
      "difficulty": "hard",
      "dependsOn": [
        "F-1.10",
        "F-5.03"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-5.05",
      "stage": 5,
      "title": "Roteiro de testes manuais Chrome/Android e Safari/iPhone",
      "description": "app/docs/manual-tests.md: roteiro de instalação, sessão separada no iPhone, push na Tela de Início, opt-in/opt-out e conversão antes do convite, com campos para registrar resultado por dispositivo.",
      "specRefs": [
        "spec.md#8",
        "arquitetura.md#8.3",
        "arquitetura.md#12"
      ],
      "covers": [
        "AC-19",
        "AC-18"
      ],
      "acceptance": [
        "Roteiro cobre Chrome/Android e Safari/iPhone",
        "Inclui cenários sem suporte/permissão negada"
      ],
      "tests": [],
      "protectedTests": [],
      "tags": [],
      "difficulty": "easy",
      "dependsOn": [
        "F-5.04",
        "F-5.02"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-6.01",
      "stage": 6,
      "title": "Consentimento da IA",
      "description": "Na primeira ativação, diálogo com o texto da arquitetura 6.3 e ação explícita; grava aiConsent; Configurações permite revogar. Sem consentimento nenhum envio ocorre e os templates seguem funcionando.",
      "specRefs": [
        "spec.md#6.5",
        "spec.md#9",
        "arquitetura.md#6.3"
      ],
      "covers": [
        "AC-15"
      ],
      "acceptance": [
        "Nenhuma chamada à function antes de aiConsent=true",
        "Revogar volta a templates imediatamente",
        "Texto do aceite em pt-BR conforme arquitetura 6.3"
      ],
      "tests": [
        "app/e2e/ai-consent.spec.ts"
      ],
      "protectedTests": [
        "app/e2e/ai-consent.spec.ts"
      ],
      "tags": [
        "ui"
      ],
      "difficulty": "normal",
      "dependsOn": [
        "F-1.04",
        "F-1.08"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-6.02",
      "stage": 6,
      "title": "Function generateInsightTexts com quota diária",
      "description": "Callable v2 (southamerica-east1): exige auth e aiConsent; valida payload (até 3 candidatos, só IDs simbólicos tipo F1/R1 e números já calculados, sem notas nem histórico); quota de 1 chamada/UID/dia de Brasília em internal/aiQuota/{uid}_{date} via transação (concorrência); provedor Vertex AI Gemini (@google/genai, modelo por env, timeout e teto de tokens) e provedor fake no emulador; erro/timeout => resposta de fallback sem retry automático.",
      "specRefs": [
        "spec.md#6.5",
        "arquitetura.md#6.1",
        "arquitetura.md#6.2",
        "DECISOES.md#Escopo da V1"
      ],
      "covers": [
        "AC-15"
      ],
      "acceptance": [
        "Duas chamadas paralelas no mesmo dia => só uma chega ao provedor",
        "Mais de 3 itens ou campos extras (ex.: note) => invalid-argument",
        "Sem consentimento => failed-precondition, provedor não é chamado",
        "Nenhuma chave de API no cliente"
      ],
      "tests": [
        "app/functions/src/__tests__/generateInsightTexts.test.ts"
      ],
      "protectedTests": [
        "app/functions/src/__tests__/generateInsightTexts.test.ts"
      ],
      "tags": [
        "security-rules"
      ],
      "difficulty": "hard",
      "dependsOn": [
        "F-1.10",
        "F-6.01"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-6.03",
      "stage": 6,
      "title": "Integração da IA no dashboard com cache e fallback",
      "description": "Após o primeiro ciclo de preenchimento do dia que produza candidatos elegíveis novos, chama generateInsightTexts uma vez; cacheia em users/{uid}/aiTexts/{date}_{hypothesisKey}_{evidenceVersion}; troca placeholders por IndicatorLabel; se os números mudarem no mesmo dia usa template; qualquer falha usa template sem erro visível.",
      "specRefs": [
        "spec.md#6.5",
        "arquitetura.md#6.2",
        "arquitetura.md#3.4"
      ],
      "covers": [
        "AC-15",
        "AC-16"
      ],
      "acceptance": [
        "No máximo uma chamada por dia no cliente (e quota no servidor)",
        "Texto da IA respeita o olho (placeholders -> IndicatorLabel)",
        "Falha/quota/sem consentimento => templates determinísticos",
        "Sem candidatos novos => nenhuma chamada"
      ],
      "tests": [
        "app/src/ai/__tests__/aiTexts.test.ts",
        "app/e2e/ai-fallback.spec.ts"
      ],
      "protectedTests": [
        "app/e2e/ai-fallback.spec.ts"
      ],
      "tags": [
        "privacy-mode",
        "sync"
      ],
      "difficulty": "hard",
      "dependsOn": [
        "F-6.02",
        "F-3.09"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-6.04",
      "stage": 6,
      "title": "Validação de saída da IA",
      "description": "Validador puro (functions e cliente): texto só referencia placeholders enviados, não contém números ausentes da entrada, nem termos causais/de dose proibidos, e respeita tamanho máximo; inválido => template.",
      "specRefs": [
        "spec.md#6.6",
        "arquitetura.md#6.1"
      ],
      "covers": [
        "AC-15",
        "AC-12"
      ],
      "acceptance": [
        "Placeholder desconhecido => rejeitado",
        "Número inventado => rejeitado",
        "'causou', 'comprovado', recomendação de dose => rejeitado"
      ],
      "tests": [
        "app/src/ai/__tests__/validateAiText.test.ts"
      ],
      "protectedTests": [
        "app/src/ai/__tests__/validateAiText.test.ts"
      ],
      "tags": [
        "statistics"
      ],
      "difficulty": "normal",
      "dependsOn": [
        "F-6.02"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-7.01",
      "stage": 7,
      "title": "Guardas de escopo",
      "description": "Teste e2e que percorre as rotas e garante: nenhum campo de senha/telefone, nenhum seletor de idioma, html lang pt-BR, nenhum horário de lembrete configurável, service worker sem cache offline.",
      "specRefs": [
        "spec.md#1.2",
        "spec.md#10"
      ],
      "covers": [
        "AC-03",
        "AC-20"
      ],
      "acceptance": [
        "Nenhum input type=password ou tel em nenhuma rota",
        "Sem textos em outros idiomas na UI",
        "App offline não carrega (sem cache)"
      ],
      "tests": [
        "app/e2e/scope-guards.spec.ts"
      ],
      "protectedTests": [
        "app/e2e/scope-guards.spec.ts"
      ],
      "tags": [],
      "difficulty": "easy",
      "dependsOn": [
        "F-5.01",
        "F-1.09"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-7.02",
      "stage": 7,
      "title": "Auditoria de layout mobile e esticado no desktop",
      "description": "Revisar todas as rotas em 375x812 e 1280x800: coluna central, sem overflow, listas/cartões desempilham em grid auto-fit, navegação inferior centralizada, alvos de toque; ajustar divergências do design.",
      "specRefs": [
        "spec.md#7.2",
        "arquitetura.md#12"
      ],
      "covers": [
        "AC-17"
      ],
      "acceptance": [
        "Nenhuma rota com overflow horizontal nos dois tamanhos",
        "Sem media queries de desktop dedicadas",
        "axe sem violações serious/critical"
      ],
      "tests": [
        "app/e2e/layout-audit.spec.ts"
      ],
      "protectedTests": [
        "app/e2e/layout-audit.spec.ts"
      ],
      "tags": [
        "ui"
      ],
      "difficulty": "normal",
      "dependsOn": [
        "F-4.05",
        "F-3.11"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-7.03",
      "stage": 7,
      "title": "Roteiro de validação humana do design",
      "description": "app/docs/design-validation.md com capturas (test:visual) por tela e checklist para a validação humana da metáfora Fatores à esquerda / Resultados à direita versus seções verticais e do esticamento no computador.",
      "specRefs": [
        "spec.md#7.1",
        "spec.md#12",
        "arquitetura.md#13"
      ],
      "covers": [
        "AC-17"
      ],
      "acceptance": [
        "Checklist lista cada tela e o mockup correspondente",
        "Pergunta explícita sobre esquerda/direita registrada para o humano"
      ],
      "tests": [
        "app/e2e/visual.spec.ts"
      ],
      "protectedTests": [],
      "tags": [
        "ui"
      ],
      "difficulty": "easy",
      "dependsOn": [
        "F-7.02"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-7.04",
      "stage": 7,
      "title": "Jornadas ponta a ponta com seed e usuários novos",
      "description": "E2E das jornadas da spec 13: dia 1/dia 2 com relógio simulado (sem associação com 2 dias), discrição visual, curtir (snapshot estável após exclusão), descartar e reencontrar com evidência nova; usuários novos criados no teste; seed nunca roda em produção.",
      "specRefs": [
        "spec.md#13",
        "spec.md#10",
        "arquitetura.md#12"
      ],
      "covers": [
        "AC-21",
        "AC-14",
        "AC-13",
        "AC-12"
      ],
      "acceptance": [
        "Jornadas 1, 3, 4 e 5 passam no mobile",
        "Usuário do seed mostra associações plantadas e não mostra café x dor",
        "seed.ts recusa rodar sem emulador"
      ],
      "tests": [
        "app/e2e/journeys.spec.ts"
      ],
      "protectedTests": [
        "app/e2e/journeys.spec.ts"
      ],
      "tags": [
        "ui",
        "statistics"
      ],
      "difficulty": "hard",
      "dependsOn": [
        "F-4.05",
        "F-3.11"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-7.05",
      "stage": 7,
      "title": "Endurecimento de regras e hosting",
      "description": "Revisão final de firestore.rules (limites de tamanho de nome 60, sigla 4, unidade 20, observação 500, opções 7; campos internos), headers de segurança no Hosting (CSP compatível com Firebase), decisão sobre App Check registrada; teste de que nenhuma regra valida datas.",
      "specRefs": [
        "spec.md#9",
        "arquitetura.md#9.2"
      ],
      "covers": [
        "AC-04",
        "AC-11"
      ],
      "acceptance": [
        "Strings acima do limite rejeitadas pelas regras",
        "Headers de segurança presentes",
        "Regras sem comparação de data com request.time para registros"
      ],
      "tests": [
        "app/tests/rules/hardening.test.ts"
      ],
      "protectedTests": [
        "app/tests/rules/hardening.test.ts"
      ],
      "tags": [
        "security-rules"
      ],
      "difficulty": "normal",
      "dependsOn": [
        "F-2.07",
        "F-4.02",
        "F-5.03"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    },
    {
      "id": "F-7.06",
      "stage": 7,
      "title": "Orçamento de bundle e fonte de ícones",
      "description": "Substituir a fonte Material Symbols completa (~3,6 MB) por subconjunto dos ícones usados ou SVGs; definir orçamento de bundle verificado no build.",
      "specRefs": [
        "arquitetura.md#10"
      ],
      "covers": [],
      "acceptance": [
        "Fonte/ícones de ícone < 300 KB",
        "Todos os ícones usados continuam renderizando (test:visual)"
      ],
      "tests": [
        "app/e2e/visual.spec.ts"
      ],
      "protectedTests": [],
      "tags": [
        "ui"
      ],
      "difficulty": "easy",
      "dependsOn": [
        "F-7.02"
      ],
      "status": "failing",
      "attempts": 0,
      "costUsd": 0,
      "history": []
    }
  ]
}
```

Responda SOMENTE com o bloco ```json: {"pass": true|false, "issues": ["problema concreto e como corrigir", "…"]}
