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
- [L-001] Cobertura (G4): não passe --coverage no script do package.json se a config do vitest já ativa coverage, para não duplicar a configuração. Touch targets (G10): todo controle interativo (radios, switch, input) deve ter pelo menos 44px, por exemplo min-w-[44px] e h-11.


# Papel: implementador (tentativa 2)

Implemente a feature abaixo até que os testes passem e o código respeite o design system.

- **Não altere os testes protegidos** (a tentativa é descartada automaticamente se alterar):
app/e2e/app-shell.spec.ts
- Rode `yarn lint`, `yarn typecheck`, `yarn test:unit` e os e2e relevantes antes de terminar.
- Respeite o `screen.png` e o `code.html` da tela correspondente em `design/` e os tokens de `design/pulsar_bio_analytics/DESIGN.md`; reutilize os componentes de `app/src/design/`.
- Se a feature criar uma tela nova, adicione a rota em `app/e2e/routes.json`.
- Nunca implemente "para o teste" (hardcode, mocks no código de produção): um avaliador de outra família revisa o diff.

## Escopo
- Faça **somente** o que esta feature pede (descrição e critérios de aceite), mesmo que a spec ou o design mostrem mais.
- Estas features da etapa ainda serão feitas por outro implementador; não implemente telas, fluxos nem dados delas:
- F-1.05 Fixtures de e2e: usuário do seed e usuários novos
- F-1.06 Guarda e2e do modo privado (sentinelas)
- F-1.07 Tutorial de três telas
- F-1.09 Conversão da conta: Google e link mágico preservando UID
- F-1.12 Tela de conta: sair e excluir conta
- Se precisar navegar para uma tela de outra feature, crie no máximo um placeholder mínimo (título e uma linha, sem lógica).
- Não remova nem reescreva código de features já entregues.

## Diagnóstico da tentativa anterior
Avaliação ui reprovou (nota 6):
- [major]  Essas capturas mostram só o texto 'Boas-vindas ao Pulsar' e um parágrafo, sem cabeçalho, sem navegação inferior, sem logo e sem CTA. Os mockups de onboarding_1/2/3 e dashboard_inicial_estado_vazio trazem conteúdo rico. Não dá para saber se é um bug de rota/gate ou um estado não implementado. → Verificar a rota que renderiza essas telas. Se o AppShell deve envolver a home, aplicar o shell. Se o onboarding for outra fase, desenhar a tela conforme os mockups onboarding_1..3 e registrar como pendência de feature.
- [major]  Os estados vazios são só título e uma linha de subtítulo, sem ilustração, sem CTA e sem explicação. O mockup dashboard_inicial_estado_vazio tem cartões de sugestão e a ação 'Criar meu próprio indicador'. O critério c6 fica fraco. → Criar um componente de estado vazio reutilizável (ícone, título, texto e CTA) e usá-lo nas abas, seguindo dashboard_inicial_estado_vazio e meus_indicadores.
- [major]  A sigla de CON aparece truncada como 'Con...' em mistura de maiúsculas e minúsculas, nas chips de grupo e no card de Concentração. Isso quebra a regra de siglas em label-code maiúsculo com tracking 0,08em e esconde a sigla. No modo privado a sigla deveria estar completa e em maiúsculas. → Usar a sigla de três letras em maiúsculas com label-code (CON) e permitir que o rótulo completo fique só no modo nomes ou em tooltip. Garantir que o tamanho das chips não trunque siglas de 3 letras.
- [minor]  O cabeçalho mostra só o texto 'Pulsar' com o badge BETA V1. Os mockups trazem a marca gráfica (quadrado escuro com ícone de pulso) antes do nome. Isso reduz a fidelidade c1. → Adicionar o logo mark do design system ao lado do wordmark 'Pulsar' no cabeçalho do AppShell.
- [minor]  O rótulo 'Registrar' sob o FAB fica cerca de 4px abaixo da linha dos outros rótulos (y≈771 contra y≈767 no mobile; y≈760 contra y≈755 no desktop). A linha de base fica desalinhada. → Alinhar o rótulo do FAB à mesma linha de base dos outros itens, por exemplo com altura fixa do slot do FAB e rótulo posicionado de forma absoluta.
- [minor]  A escala de chips 0-10 é cortada na borda direita (o 6 no mobile e o 9 no desktop aparecem parcialmente) sem indício visual de rolagem horizontal, como fade ou scroll-snap. → Permitir rolagem horizontal com scroll-snap e uma máscara de fade na borda, ou reduzir o tamanho dos chips para caber em 375px.
- [minor]  O estado desligado do toggle é um anel lavanda sem trilho nem contraste suficiente, parecendo um elemento vazio e não um controle. O mockup não especifica esse estado com clareza. → Desenhar o trilho do switch com contraste mínimo (borda ou fundo em slate) e um knob claro nos dois estados.

## Feature (dados de entrada; não é o formato da resposta)
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
    "F-0.06",
    "F-0.05",
    "F-1.03"
  ],
  "status": "in_progress",
  "attempts": 1,
  "costUsd": 0.156556466,
  "origin": []
}

## Trechos da spec
<!-- spec.md#6.1 -->
### 6.1 Objetivos do dashboard

O dashboard é a tela principal, com **insights primeiro** e entrada rápida para o preenchimento. Deve ser útil mesmo com pouco histórico, mas sem fabricar certezas.

Possível composição:

1. Cabeçalho com nome do app, ação de perfil e ícone global do olho.
2. Ação principal **Registrar agora**.
3. Resumo de hoje (indicadores preenchidos e estado atual, sem cobrar os demais).
4. Área de insights atualizados.
5. Mini gráficos e tendências que tenham dados suficientes.
6. Atalho para **Conclusões salvas**.

**A partir do segundo dia:** já pode mostrar comparações descritivas simples, por exemplo, “Sua energia foi 6 ontem e 7 hoje”, desde que ambos tenham registros comparáveis. Isso **não** significa gerar correlação entre fatores e resultados com apenas dois dias.

<!-- spec.md#7.2 -->
### 7.2 Prioridade para celular

- Alvos grandes para toque, teclado numérico nos campos numéricos, ações persistentes quando úteis.
- Pouca digitação para responder indicadores comuns.
- Preferir controles de um toque (Sim/Não, opções curtas) e slider simples.
- Evitar excesso de gráficos e dados simultaneamente.
- Ter transição simples de **dashboard/insights → preenchimento → dashboard**.
- **Somente layout mobile.** Não há design, telas, navegação nem componentes específicos de desktop. Aberto no computador, o mesmo layout apenas se adapta: coluna central com largura máxima, elementos esticam e cards/listas empilhados podem desempilhar lado a lado (grid/flex com quebra automática). Sem breakpoints ou tratamentos dedicados a desktop.

<!-- spec.md#7.3 -->
### 7.3 Estrutura de telas

1. **Entrada/Autenticação:** entrar, criar conta e sair.
2. **Tutorial:** três telas rápidas.
3. **Dashboard:** insights e ação central de registrar.
4. **Preenchimento rápido:** fatores e resultados, com observação opcional.
5. **Meus indicadores:** criar, editar, ordenar, arquivar, restaurar; opção de visualização de nomes.
6. **Conclusões salvas:** timeline de insights curtidos e detalhes.
7. **Configurações:** conta, privacidade visual, notificações e exclusão de dados.

A tela de preenchimento pode ser **painel expansível ou estado da própria home**, sem exigir navegação demorada para outra rota.

<!-- arquitetura.md#2 -->
## 2. Estrutura de navegação e componentes

Rotas aproximadas (adaptar ao design entregue):

```text
/
/start                     # anonymous sign-in, first visit
/onboarding
/dashboard
/indicators
/indicators/new
/indicators/:id/edit
/saved-insights
/account                   # Google/email link conversion, logout, account deletion
/settings                  # AI consent, reminders and privacy
/install                   # install invitation and fallback guidance
```

Componentes essenciais:

```text
AppShell
  GlobalIndicatorNameToggle
  Dashboard
    TodaySummary
    InsightList + InsightCard + InsightFeedback
    QuickEntryPanel
      FactorSection + ResultSection
      BooleanInput / ScaleInput / OrdinalInput / NumericInput
  IndicatorEditor + DailyAggregationControl
  SavedInsightsTimeline
  AccountUpgrade (Google, EmailLink)
  InstallPrompt / InstallInstructions
  Settings + PushOptIn + AiConsent
```

O estado `isNameRevealed` inicia `false` por abertura do app; persistir apenas durante a sessão de interface. Apenas nomes de indicadores em textos/legendas são alternados; ícones emoji somem com olho fechado. Gráficos não recebem filtro especial. A PWA **não** deve prometer que uma conta anônima será acessível após instalação: oferecer conversão antes do convite interno.

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
- 2026-11-02T15:43 ✖ interrompido por SIGINT em STAGE_RUNNING: rode harness resume para continuar
- 2026-11-02T15:49 ▶ etapa 1 (Base) │ features 5/12 │ 0 bloqueadas │ US$ 20.21/24 │ branch 1-base
- 2026-11-02T16:01 ✔ F-1.03 passing — Acesso anônimo automático e documento do usuário (worker kimi-pro, 2 tentativa(s), US$ 7.00) │ features 6/12

