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


# Papel: escritor de testes de aceite

Escreva os testes de aceite da feature abaixo **antes** da implementação.

- Os testes devem **falhar hoje** e passar com uma implementação correta. Não implemente a feature.
- Cubra cada critério de `acceptance`. Use os caminhos de `tests`/`protectedTests` da feature.
- Determinísticos: sem hora real (use relógio controlado, ex. `vi.useFakeTimers` / `page.clock`), rodando no emulador do Firebase.
- E2E com Playwright no projeto `mobile` (o app é somente mobile; não existe projeto `desktop`); unit com Vitest. Nada de `.skip`, `.only`, `fixme`.
- Asserts verificam comportamento observável, não detalhes de implementação.
- Para privacidade, use os nomes sentinela do seed e verifique DOM visível, `aria-*`, `title` e tooltips.
- Teste só o que esta feature e as já entregues fornecem. Não dependa de telas ou fluxos destas features ainda não feitas:
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
- Helpers que falam com o emulador/infra (listar contas, ler oobCodes, REST do Firestore) precisam funcionar **hoje**: rode o teste uma vez e confira que a falha vem só da feature ausente. Use APIs que o emulador tem (contas: `POST .../v1/projects/{p}/accounts:query` ou `GET .../accounts:batchGet`; não existe `GET /emulator/v1/projects/{p}/accounts`). O Auth grava e-mails em minúsculas.
- Os testes são rodados uma vez antes de ficarem protegidos; um teste que nunca passaria é descartado e você reescreve.

## Feature (dados de entrada; não é o formato da resposta)
{
  "id": "F-1.06",
  "stage": 2,
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
  "protectedTests": [],
  "tags": [
    "privacy-mode",
    "ui"
  ],
  "difficulty": "normal",
  "dependsOn": [
    "F-1.04",
    "F-1.05",
    "F-2.05",
    "F-2.08",
    "F-2.09"
  ],
  "status": "failing",
  "attempts": 0,
  "costUsd": 0.679299149,
  "spendSince": "2026-11-05T09:49:45.283Z",
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
- 2026-11-07T18:17 ⛔ F-2.01 BLOQUEADA: sem progresso: kimi-pro e codex-mid falharam igual (gates G2); provável problema no teste, na spec ou no ambiente │ features 0/9
- 2026-11-07T18:17 ⏸ 8 feature(s) esperando bloqueadas (F-2.01): ajuste e rode harness resume
- 2026-11-07T19:25 ▶ etapa 2 (Registro) │ features 0/9 │ 0 bloqueadas │ US$ 1.44/9 │ branch 2-registro
- 2026-11-07T19:27 ✔ F-2.01 passing — Repositório e regras de indicadores (worker codex-mid, 3 tentativa(s), US$ 1.77) │ features 1/9
- 2026-11-07T19:32 ✔ F-2.06 passing — Repositório e regras de registros (worker codex-mid, 1 tentativa(s), US$ 0.56) │ features 2/9
- 2026-11-07T20:11 ✔ F-2.03 passing — Editor de indicador (worker haiku, 2 tentativa(s), US$ 1.28) │ features 3/9
- 2026-11-07T20:15 ⛔ F-2.10 BLOQUEADA: teto de custo da feature atingido │ features 3/9
- 2026-11-07T20:32 ⛔ F-2.08 BLOQUEADA: teto de custo da feature atingido │ features 3/9
- 2026-11-07T20:53 ⛔ F-2.05 BLOQUEADA: teto de custo da feature atingido │ features 3/9
- 2026-11-07T21:02 ✔ F-2.11 passing — Convite discreto para salvar a conta (worker minimax, 1 tentativa(s), US$ 0.60) │ features 4/9
- 2026-11-07T21:02 ⏸ 2 feature(s) esperando bloqueadas (F-2.05, F-2.08, F-2.10): ajuste e rode harness resume
- 2026-11-08T11:01 ▶ etapa 2 (Registro) │ features 4/9 │ 3 bloqueadas │ US$ 9.03/9 │ branch 2-registro
- 2026-11-08T11:01 ⏸ 2 feature(s) esperando bloqueadas (F-2.05, F-2.08, F-2.10): ajuste e rode harness resume
- 2026-11-08T11:02 ▶ etapa 2 (Registro) │ features 4/9 │ 0 bloqueadas │ US$ 9.03/12 │ branch 2-registro
- 2026-11-08T11:21 ✔ F-2.05 passing — Tela Meus indicadores (worker codex-mid, 4 tentativa(s), US$ 2.66) │ features 5/9
- 2026-11-08T11:32 ⛔ F-2.08 BLOQUEADA: limite de 5 tentativas atingido │ features 5/9
- 2026-11-08T11:39 ⛔ F-2.10 BLOQUEADA: limite de 5 tentativas atingido │ features 5/9
- 2026-11-08T11:45 ✔ F-2.09 passing — Histórico de registros e exclusão retroativa (worker minimax, 2 tentativa(s), US$ 0.62) │ features 6/9
- 2026-11-08T11:45 ⏸ 1 feature(s) esperando bloqueadas (F-2.08, F-2.10): ajuste e rode harness resume
- 2026-11-08T12:03 ▶ etapa 2 (Registro) │ features 7/9 │ 0 bloqueadas │ US$ 11.86/12 │ branch 2-registro
- 2026-11-08T12:11 ⛔ F-2.08 BLOQUEADA: limite de 5 tentativas atingido │ features 7/9
- 2026-11-08T12:11 ⏸ 1 feature(s) esperando bloqueadas (F-2.08): ajuste e rode harness resume
- 2026-11-08T12:23 ▶ etapa 2 (Registro) │ features 7/9 │ 0 bloqueadas │ US$ 11.91/12 │ branch 2-registro
- 2026-11-08T12:32 teto da etapa 2 aumentado para US$ 15 (budget.yaml)
- 2026-11-08T12:32 ▶ etapa 2 (Registro) │ features 7/9 │ 0 bloqueadas │ US$ 12.17/15 │ branch 2-registro
- 2026-11-08T12:37 ⛔ F-2.08 BLOQUEADA: limite de 5 tentativas atingido │ features 7/9
- 2026-11-08T12:37 ⏸ 1 feature(s) esperando bloqueadas (F-2.08): ajuste e rode harness resume
- 2026-11-08T12:46 ▶ etapa 2 (Registro) │ features 8/9 │ 0 bloqueadas │ US$ 12.57/15 │ branch 2-registro

