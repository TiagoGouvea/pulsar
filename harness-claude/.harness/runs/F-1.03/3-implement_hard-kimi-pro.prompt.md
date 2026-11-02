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
- [L-039] Substitua waitForLoadState('networkidle') por verificações de estado da aplicação ou locator.waitFor() em elementos específicos, evitando depender do estado ocioso da rede quando houver conexões de longa duração.
- [L-001] Cobertura (G4): não passe --coverage no script do package.json se a config do vitest já ativa coverage, para não duplicar a configuração. Touch targets (G10): todo controle interativo (radios, switch, input) deve ter pelo menos 44px, por exemplo min-w-[44px] e h-11.


# Papel: implementador (tentativa 3)

Implemente a feature abaixo até que os testes passem e o código respeite o design system.

- **Não altere os testes protegidos** (a tentativa é descartada automaticamente se alterar):
app/e2e/anonymous-start.spec.ts
- Rode `yarn lint`, `yarn typecheck`, `yarn test:unit` e os e2e relevantes antes de terminar.
- Respeite o `screen.png` e o `code.html` da tela correspondente em `design/` e os tokens de `design/pulsar_bio_analytics/DESIGN.md`; reutilize os componentes de `app/src/design/`.
- Se a feature criar uma tela nova, adicione a rota em `app/e2e/routes.json`.
- Nunca implemente "para o teste" (hardcode, mocks no código de produção): um avaliador de outra família revisa o diff.

## Escopo
- Faça **somente** o que esta feature pede (descrição e critérios de aceite), mesmo que a spec ou o design mostrem mais.
- Estas features da etapa ainda serão feitas por outro implementador; não implemente telas, fluxos nem dados delas:
- F-1.04 AppShell: cabeçalho com olho, navegação inferior e layout esticável
- F-1.05 Fixtures de e2e: usuário do seed e usuários novos
- F-1.06 Guarda e2e do modo privado (sentinelas)
- F-1.07 Tutorial de três telas
- F-1.09 Conversão da conta: Google e link mágico preservando UID
- F-1.12 Tela de conta: sair e excluir conta
- Se precisar navegar para uma tela de outra feature, crie no máximo um placeholder mínimo (título e uma linha, sem lógica).
- Não remova nem reescreva código de features já entregues.

## Diagnóstico da tentativa anterior
Causa raiz (test): O uso de 'networkidle' no Playwright (page.waitForLoadState('networkidle')) causa timeouts quando há conexões de rede persistentes (como listeners do Firebase/Firestore via onSnapshot, implementados para a feature F-1.03), pois o evento 'networkidle' nunca é disparado enquanto o listener estiver ativo.
Dica: Substitua waitForLoadState('networkidle') por verificações de estado da aplicação ou locator.waitFor() em elementos específicos, evitando depender do estado ocioso da rede quando houver conexões de longa duração.

Gates que falharam:
### G6 e2e
────────

    Test timeout of 30000ms exceeded.

    Error: page.waitForLoadState: Test timeout of 30000ms exceeded.

      11 |
      12 |     await page.goto(route.path);
    > 13 |     await page.waitForLoadState('networkidle');
         |                ^
      14 |
      15 |     expect(errors).toEqual([]);
      16 |     await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
        at /Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-1.03/pulsar-claude/app/e2e/routes.spec.ts:13:16

    Error Context: test-results/routes-route-dashboard-dashboard-passes-browser-gates-desktop/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/routes-route-dashboard-dashboard-passes-browser-gates-desktop/trace.zip
    Usage:

        yarn playwright show-trace test-results/routes-route-dashboard-dashboard-passes-browser-gates-desktop/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    Test timeout of 30000ms exceeded.

    Error: page.waitForLoadState: Test timeout of 30000ms exceeded.

      11 |
      12 |     await page.goto(route.path);
    > 13 |     await page.waitForLoadState('networkidle');
         |                ^
      14 |
      15 |     expect(errors).toEqual([]);
      16 |     await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
        at /Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-1.03/pulsar-claude/app/e2e/routes.spec.ts:13:16

    Error Context: test-results/routes-route-dashboard-dashboard-passes-browser-gates-desktop-retry1/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/routes-route-dashboard-dashboard-passes-browser-gates-desktop-retry1/trace.zip
    Usage:

        yarn playwright show-trace test-results/routes-route-dashboard-dashboard-passes-browser-gates-desktop-retry1/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  6 failed
    [mobile] › e2e/routes.spec.ts:8:3 › route home (/) passes browser gates ────────────────────────
    [mobile] › e2e/routes.spec.ts:8:3 › route onboarding (/onboarding) passes browser gates ────────
    [mobile] › e2e/routes.spec.ts:8:3 › route dashboard (/dashboard) passes browser gates ──────────
    [desktop] › e2e/routes.spec.ts:8:3 › route home (/) passes browser gates ───────────────────────
    [desktop] › e2e/routes.spec.ts:8:3 › route onboarding (/onboarding) passes browser gates ───────
    [desktop] › e2e/routes.spec.ts:8:3 › route dashboard (/dashboard) passes browser gates ─────────
  18 passed (2.3m)
error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

### G8 privacy-leak
page.goto: Timeout 30000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:4792/", waiting until "networkidle"[22m


### G9 a11y
page.goto: Timeout 30000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:4792/", waiting until "networkidle"[22m


### G10 mobile-layout
page.goto: Timeout 30000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:4792/", waiting until "networkidle"[22m


## Feature (dados de entrada; não é o formato da resposta)
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
  "difficulty": "hard",
  "dependsOn": [
    "F-0.04",
    "F-0.05",
    "F-1.08"
  ],
  "status": "in_progress",
  "attempts": 2,
  "costUsd": 6.570651169999999,
  "spendSince": "2026-11-02T15:19:46.503Z",
  "origin": []
}

## Trechos da spec
<!-- spec.md#3 -->
## 3. Público, acesso e contas

O cadastro é aberto, porém o primeiro acesso **não exige criar uma conta permanente**.

1. Na primeira visita, o app cria uma conta via **Firebase Anonymous Authentication** e preserva o UID para os registros do usuário.
2. O usuário pode começar imediatamente: tutorial, sugestões de indicadores, preenchimento e dashboard.
3. Depois de começar a usar, o app convida discretamente a **salvar a conta** por **Google** ou **link mágico por e-mail**. Não oferecer senha ou telefone na V1.
4. A conversão vincula a credencial ao **mesmo usuário anônimo**; não executar login separado que crie novo UID por engano.
5. Se a credencial pertencer a outra conta existente, apresentar conflito e opções claras; **nunca mesclar, substituir ou apagar dados automaticamente**.
6. Enquanto a conta for anônima, explicar que perder a sessão/navegador ou trocar de aparelho pode significar perder o acesso aos dados.
7. Antes do **convite do próprio Pulsar para instalar a PWA**, exigir que a pessoa converta sua conta para Google ou e-mail. A instalação pelo menu do navegador não pode ser impedida.
8. A pessoa pode sair, excluir registros específicos, excluir sua conta e apagar os dados pessoais associados.

Os dados são privados por UID. Não há funcionalidade de compartilhamento público.

### 3.1 Primeiro acesso — tutorial e configuração

Tutorial em **três telas**: (1) observe sua rotina/Fatores; (2) acompanhe seus Resultados; (3) descubra possíveis relações. Ter Próximo, Voltar e Pular; registrar conclusão do onboarding.

Na conta nova, apresentar dashboard vazio com **3–4 sugestões** de criação rápida (por exemplo, Energia e Concentração como Resultados; Exercício e Café como Fatores), mais a ação **Criar meu próprio indicador**. **Nenhum indicador é criado automaticamente**.

O convite para salvar a conta deve aparecer depois de alguma interação útil, não bloquear o uso inicial. O convite para **instalar a PWA** deve aparecer depois de alguns usos, com linguagem como “Instale o Pulsar para acessar mais rápido e receber um lembrete diário”; não prometer melhora clínica ou dos resultados medidos.

<!-- spec.md#3.1 -->
### 3.1 Primeiro acesso — tutorial e configuração

Tutorial em **três telas**: (1) observe sua rotina/Fatores; (2) acompanhe seus Resultados; (3) descubra possíveis relações. Ter Próximo, Voltar e Pular; registrar conclusão do onboarding.

Na conta nova, apresentar dashboard vazio com **3–4 sugestões** de criação rápida (por exemplo, Energia e Concentração como Resultados; Exercício e Café como Fatores), mais a ação **Criar meu próprio indicador**. **Nenhum indicador é criado automaticamente**.

O convite para salvar a conta deve aparecer depois de alguma interação útil, não bloquear o uso inicial. O convite para **instalar a PWA** deve aparecer depois de alguns usos, com linguagem como “Instale o Pulsar para acessar mais rápido e receber um lembrete diário”; não prometer melhora clínica ou dos resultados medidos.

<!-- arquitetura.md#3.1 -->
### 3.1 Usuário

```json
{
  "createdAt": "serverTimestamp",
  "onboardingCompleted": true,
  "aiConsent": false,
  "reminderEnabled": false,
  "lastInsightRefreshAt": "serverTimestamp"
}
```

Autenticação: entrar como anônimo e armazenar sob o UID anônimo. Ao converter, vincular Google ou credencial de **e-mail por link** ao usuário atual (API Firebase equivalente a `linkWithPopup`/`linkWithCredential` conforme o provedor). **Verificar o UID antes e depois**. Se a credencial pertencer a outro UID, não trocar silenciosamente de usuário, não mesclar coleções e não excluir registros; exibir uma resolução explícita de conflito. E-mail por link deve manter o endereço digitado para completar a vinculação, com cuidados ao abrir em outro dispositivo.

O Firebase pode exigir habilitar o provedor e-mail/senha no console para usar link mágico; **não oferecer senha como método na UI**. Não habilitar limpeza automática de contas anônimas sem analisar impacto. Antes de recomendar instalação da PWA, exigir conversão para conta permanente. No iPhone, a PWA pode usar armazenamento de sessão separado do Safari.

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
- 2026-11-02T12:48 ✔ F-1.01 passing — Modelo de domínio de indicadores e registros (puro) (worker haiku, 2 tentativa(s), US$ 3.00) │ features 3/12
- 2026-11-02T12:56 teto da etapa 1 aumentado para US$ 18 (budget.yaml)
- 2026-11-02T12:56 ▶ etapa 1 (Base) │ features 3/12 │ 0 bloqueadas │ US$ 10.04/18 │ branch 1-base
- 2026-11-02T13:05 ⛔ F-1.03 BLOQUEADA: limite de 5 tentativas atingido │ features 3/12
- 2026-11-02T13:06 ✖ interrompido por SIGINT em STAGE_RUNNING: rode harness resume para continuar
- 2026-11-02T13:08 ▶ etapa 1 (Base) │ features 3/12 │ 0 bloqueadas │ US$ 11.33/18 │ branch 1-base
- 2026-11-02T13:21 ✔ F-1.10 passing — Workspace de Cloud Functions com emulador (worker opus, 3 tentativa(s), US$ 1.61) │ features 4/12
- 2026-11-02T13:24 ⛔ F-1.03 BLOQUEADA: teto de custo da feature atingido │ features 4/12
- 2026-11-02T13:48 ⛔ F-1.11 BLOQUEADA: limite de 5 tentativas atingido │ features 4/12
- 2026-11-02T14:14 ▶ etapa 1 (Base) │ features 4/12 │ 0 bloqueadas │ US$ 15.12/18 │ branch 1-base
- 2026-11-02T14:20 ✔ F-1.11 passing — Function deleteAccount: exclusão integral (worker opus, 1 tentativa(s), US$ 2.97) │ features 5/12
- 2026-11-02T14:49 ⛔ F-1.03 BLOQUEADA: teto de custo da feature atingido │ features 5/12
- 2026-11-02T15:02 ▶ etapa 1 (Base) │ features 5/12 │ 0 bloqueadas │ US$ 16.98/24 │ branch 1-base
- 2026-11-02T15:11 ⛔ F-1.03 BLOQUEADA: teto de custo da feature atingido │ features 5/12
- 2026-11-02T15:16 ▶ etapa 1 (Base) │ features 5/13 │ 1 bloqueadas │ US$ 18.21/24 │ branch 1-base
- 2026-11-02T15:19 ✖ interrompido por SIGINT em STAGE_RUNNING: rode harness resume para continuar
- 2026-11-02T15:20 ▶ etapa 1 (Base) │ features 5/12 │ 0 bloqueadas │ US$ 18.63/24 │ branch 1-base


## Regras adicionais (feature crítica)

- **Estatística:** amostras e denominadores explícitos; ausência de registro nunca vira zero; `Não` explícito ≠ ausência; respeite os limiares fechados da spec (seção 6.5.1 / arquitetura 5.2); nunca use linguagem causal ("causa", "faz", "provoca").
- **Security Rules:** negar por padrão; acesso só ao próprio UID; validar o schema de cada documento; teste com `@firebase/rules-unit-testing` incluindo tentativas de acesso cruzado.
- **Privacidade:** use sempre o componente `<IndicatorLabel>`, nunca o nome cru do indicador; emojis ocultos com o olho fechado; nada de nomes em `aria-label`, `title`, `alt`, tooltips, `document.title`, `localStorage` ou logs.
- **Sincronização:** operações idempotentes; nunca sobrescrever dados de outro dispositivo sem regra explícita.
