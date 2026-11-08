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
- E2E com Playwright no projeto `mobile` (o app é somente mobile); no `desktop`, só um smoke de que a tela abre e não quebra; unit com Vitest. Nada de `.skip`, `.only`, `fixme`.
- Asserts verificam comportamento observável, não detalhes de implementação.
- Para privacidade, use os nomes sentinela do seed e verifique DOM visível, `aria-*`, `title` e tooltips.
- Teste só o que esta feature e as já entregues fornecem. Não dependa de telas ou fluxos destas features ainda não feitas:
- F-1.06 (etapa 2) Guarda e2e do modo privado (sentinelas)
- F-2.08 (etapa 2) Preenchimento rápido
- F-2.09 (etapa 2) Histórico de registros e exclusão retroativa
- F-2.10 (etapa 2) Dashboard vazio com sugestões
- F-2.11 (etapa 2) Convite discreto para salvar a conta
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
  "origin": []
}

## Trechos da spec
<!-- spec.md#4.5 -->
### 4.5 Arquivamento e reordenação

- O usuário pode **arquivar** um indicador que não usa mais.
- Indicadores arquivados deixam de aparecer no preenchimento cotidiano.
- O histórico permanece e pode continuar contribuindo para análises históricas, com identificação de que o indicador está arquivado.
- Permitir consultar arquivados e restaurar.
- Reordenação livre dentro de **Fatores** e **Resultados**; preservar a ordem escolhida.
- Não apagar automaticamente registros ao arquivar.

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
- 2026-11-02T16:56 ✔ F-1.04 passing — AppShell: cabeçalho com olho, navegação inferior e layout esticável (worker sonnet, 4 tentativa(s), US$ 0.69) │ features 8/12
- 2026-11-02T17:51 ✔ F-1.07 passing — Tutorial de três telas (worker minimax, 2 tentativa(s), US$ 0.47) │ features 9/12
- 2026-11-02T18:11 ⛔ F-1.06 BLOQUEADA: limite de 5 tentativas atingido │ features 9/12
- 2026-11-02T19:31 teto da etapa 1 aumentado para US$ 29 (budget.yaml)
- 2026-11-02T19:31 ▶ etapa 1 (Base) │ features 9/12 │ 1 bloqueadas │ US$ 24.87/29 │ branch 1-base
- 2026-11-02T20:34 ⛔ F-1.09 BLOQUEADA: limite de 5 tentativas atingido │ features 9/12
- 2026-11-02T20:34 ⏸ 1 feature(s) esperando bloqueadas (F-1.06, F-1.09): ajuste e rode harness resume
- 2026-11-05T09:50 ▶ etapa 1 (Base) │ features 9/11 │ 0 bloqueadas │ US$ 27.06/29 │ branch 1-base
- 2026-11-05T10:30 ⛔ F-1.09 BLOQUEADA: limite de 5 tentativas atingido │ features 9/11
- 2026-11-05T10:30 ⏸ 1 feature(s) esperando bloqueadas (F-1.09): ajuste e rode harness resume
- 2026-11-06T23:24 ▶ etapa 1 (Base) │ features 9/11 │ 0 bloqueadas │ US$ 28.41/30 │ branch 1-base
- 2026-11-06T23:42 ✔ F-1.09 passing — Conversão da conta: Google e link mágico preservando UID (worker glm-or, 1 tentativa(s), US$ 6.47) │ features 10/11
- 2026-11-07T00:12 ✖ interrompido por SIGINT em STAGE_RUNNING: rode harness resume para continuar
- 2026-11-07T00:19 ▶ etapa 1 (Base) │ features 10/11 │ 0 bloqueadas │ US$ 29.72/31 │ branch 1-base
- 2026-11-07T00:34 ✔ F-1.12 passing — Tela de conta: sair e excluir conta (worker glm-or, 3 tentativa(s), US$ 1.30) │ features 11/11
- 2026-11-07T00:39 ▶ etapa 1 (Base) │ features 11/12 │ 0 bloqueadas │ US$ 30.39/31 │ branch 1-base
- 2026-11-07T11:26 ▶ etapa 1 (Base) │ features 12/12 │ 0 bloqueadas │ US$ 30.89/31 │ branch 1-base
- 2026-11-07T11:31 ▶ etapa 1 (Base) │ features 12/13 │ 0 bloqueadas │ US$ 30.89/31 │ branch 1-base
- 2026-11-07T11:31 teto da etapa 1 aumentado para US$ 32 (budget.yaml)
- 2026-11-07T11:31 ▶ etapa 1 (Base) │ features 12/13 │ 0 bloqueadas │ US$ 30.89/32 │ branch 1-base
- 2026-11-07T11:35 ✔ F-1.fix-2 passing — Suíte completa da etapa falhou nos gates G2, G6 (worker codex-mid, 1 tentativa(s), US$ 0.24) │ features 13/13
- 2026-11-07T12:59 etapa 1: 1 ajuste(s) viraram features F-1.adj-*; rodando agora
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

