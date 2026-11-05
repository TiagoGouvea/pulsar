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
app/e2e/privacy-mode.spec.ts
- Rode `yarn lint`, `yarn typecheck`, `yarn test:unit` e os e2e relevantes antes de terminar.
- Respeite o `screen.png` e o `code.html` da tela correspondente em `design/` e os tokens de `design/pulsar_bio_analytics/DESIGN.md`; reutilize os componentes de `app/src/design/`.
- Se a feature criar uma tela nova, adicione a rota em `app/e2e/routes.json`.
- Nunca implemente "para o teste" (hardcode, mocks no código de produção): um avaliador de outra família revisa o diff.

## Escopo
- Faça **somente** o que esta feature pede (descrição e critérios de aceite), mesmo que a spec ou o design mostrem mais.
- Estas features da etapa ainda serão feitas por outro implementador; não implemente telas, fluxos nem dados delas:
- F-1.07 Tutorial de três telas
- F-1.09 Conversão da conta: Google e link mágico preservando UID
- F-1.12 Tela de conta: sair e excluir conta
- Se precisar navegar para uma tela de outra feature, crie no máximo um placeholder mínimo (título e uma linha, sem lógica).
- Não remova nem reescreva código de features já entregues.

## Diagnóstico da tentativa anterior
Avaliação code reprovou (nota 5):
- [major] app/src/App.tsx Escopo: o diff implementa as telas reais de /dashboard (DashboardPage) e /indicators (IndicatorsPage), com repositórios próprios, substituindo os placeholders. A F-1.06 é uma guarda e2e do modo privado e não pede essas telas, que pertencem a outras features. → Manter na F-1.06 apenas os testes e os ajustes mínimos para expor os atributos de privacidade. Mover as telas e os repositórios para as features de indicadores e registros, ou separá-los em outra feature.
- [major] app/src/auth/AuthProvider.tsx Mudança em código de auth/onboarding já entregue, sem relação com a F-1.06. Após onboardingCompleted, o perfil deixa de ser observado em tempo real. Se qualquer campo do perfil mudar depois (outra aba, outro dispositivo, tela de configurações), o estado fica desatualizado até recarregar. A justificativa do comentário ('no subscribed field remains') não é verificada por nenhum teste. → Reverter esta alteração nesta feature. Se a otimização for desejada, fazê-la em feature própria, com teste de regressão que cubra atualização de perfil.
- [major] app/src/features/records/entryRepository.ts loadEntryNotes lê toda a coleção users/{uid}/entries (sem where, limit ou orderBy) a cada montagem do dashboard. Isso traz valores de todos os registros para a memória, apesar do docstring dizer que os valores ficam fora da visão. O custo cresce com o histórico. O cabeçalho 'Observação do dia' também não bate com o conteúdo, pois exibe notas de todas as datas. → Filtrar no Firestore pelas entradas que têm nota (ou limitar a uma consulta paginada), projetar apenas os campos necessários e ajustar o título ao escopo real dos dados.
- [minor] app/e2e/support.ts SENTINELS é construído com Object.assign sobre um array, misturando acesso por índice e por chave nomeada. É um artifício pouco legível e contraria a instrução de código mínimo e objetivo. → Usar um objeto simples (por exemplo SENTINELS.energy, SENTINELS.sleep) e derivar a lista com Object.values quando precisar iterar.
- [minor] app/e2e/privacy-mode.spec.ts O teste de observações usa um if condicional (allowed.count() === 0) para decidir se clica no botão. O fluxo não é determinístico e o teste pode passar por caminhos diferentes. Além disso, o teste 'closed eye: seeded indicators' verifica apenas toContainText('SON'), uma asserção fraca por substring. → Fazer o clique em 'Ver observação' de forma explícita e obrigatória, sem condicional. Usar asserções exatas, por exemplo pelo texto da sigla em um locator de badge.
- [minor] app/src/pages/DashboardPage.tsx Duplicação: o padrão de useEffect com flag 'active' e busca por user se repete em DashboardPage e IndicatorsPage. O catch do DashboardPage também engole o erro (setNotes([])) sem estado de erro visível, ao contrário do IndicatorsPage. → Extrair um hook compartilhado de carregamento (por exemplo useUserData(loader)) e tratar o erro da mesma forma nas duas telas.
- [minor] app/src/pages/IndicatorsPage.tsx Se user for null, o estado loading permanece true e a tela mostra 'Carregando indicadores…' indefinidamente. → Tratar explicitamente o caso sem usuário (por exemplo, não renderizar o conteúdo ou definir loading=false) ou garantir que a rota só monte com usuário autenticado.
- [minor] app/src/pages/WelcomePage.tsx O EyeToggle foi adicionado à tela de boas-vindas, que não está descrita na spec da F-1.06. Só se justifica se a varredura de rotas exigir o olho em todas as rotas de routes.json. → Confirmar que a rota de boas-vindas está em e2e/routes.json e que a inclusão é necessária. Caso contrário, remover.

## Feature (dados de entrada; não é o formato da resposta)
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
  "status": "in_progress",
  "attempts": 1,
  "costUsd": 0.20396879,
  "origin": []
}

## Trechos da spec
<!-- spec.md#4.4 -->
### 4.4 Siglas e modo privado (“olhinho”)

O app inicia com nomes de indicadores **ocultos**, exibindo siglas. O olho global alterna entre sigla e nome completo em listagem, preenchimento, dashboard, texto de insights e timeline; reabrir o aplicativo reinicia em siglas.

- Sigla definida: mostrar como foi digitada; siglas duplicadas são permitidas.
- Sigla ausente: mostrar as **3 primeiras letras do nome + `...`**, sem tratamento de colisões.
- **Emoji oculto** enquanto os nomes estiverem ocultos, mesmo quando houver emoji cadastrado.
- **Não existe um modo privado especial para gráficos:** exibir normalmente traçados, eixos, valores e dados. Somente os **nomes dos indicadores** eventualmente usados em rótulos/legendas seguem a regra sigla/nome.
- Na edição explícita de indicador, mostrar o nome completo no campo de formulário para permitir a alteração.

Essa é uma função de discrição visual, não substitui autenticação nem regras de segurança.

<!-- spec.md#13 -->
## 13. Exemplos de jornadas

### Jornada 1 — Primeiros dois dias

**Dia 1:** pessoa cria conta, conclui tutorial, aceita “Energia” como Resultado e “Exercício” como Fator. Registra energia 5/10 e exercício = Sim. Dashboard mostra o retrato do dia, não uma conclusão sobre o exercício.

**Dia 2:** registra energia 7/10 e exercício = Não. Dashboard pode comparar 5 e 7 com os respectivos dias, mas **não** afirma que parar de treinar melhora energia com apenas duas observações.

### Jornada 2 — Suplementos e concentração

Pessoa cria:
- Fator `Q10`: número em mg, um registro/dia.
- Resultado `Concentração`: escala 0–10, quanto maior melhor, múltiplos registros/dia.

Após dados suficientes, o app pode comparar concentrações agregadas por dia em grupos com quantidades distintas de Q10 registradas, desde que haja cobertura e contraste suficientes. Exibe amostra, diferença observada e ressalva de que não se pode atribuir causalidade.

### Jornada 3 — Discrição visual

Uma pessoa abre o aplicativo ao lado de terceiros. Ela vê `Con...`, `Q10` e outros códigos, não nomes completos. Ao tocar no olho, revela os nomes para se orientar; ao tocar de novo, oculta. Ao abrir o app novamente, os nomes aparecem ocultos por padrão.

### Jornada 4 — Curtir uma descoberta

O app exibe um insight sobre exercícios e disposição. A pessoa dá like; o cartão entra na timeline com os dados que justificavam a descoberta naquele dia. Semanas depois, a associação perde força; a conclusão antiga permanece no histórico como **registro do que se observou naquele momento**, não como verdade permanente.

### Jornada 5 — Descartar e reencontrar

Um insight preliminar não parece útil e recebe dislike. O app deixa de exibir a mesma versão no dashboard. Um mês depois, novos registros fortalecem essa associação; o app pode apresentar **uma nova versão**, com outra amostra e explicação.

---

**Nota:** este documento registra decisões discutidas e sugestões explicitamente separadas. Ele não constitui orientação médica nem valida, por si só, associações estatísticas como relações de causa e efeito.

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
- 2026-11-02T16:20 ✔ F-1.05 passing — Fixtures de e2e: usuário do seed e usuários novos (worker minimax, 1 tentativa(s), US$ 0.23) │ features 7/12
- 2026-11-02T16:56 ✔ F-1.04 passing — AppShell: cabeçalho com olho, navegação inferior e layout esticável (worker sonnet, 4 tentativa(s), US$ 0.69) │ features 8/12

