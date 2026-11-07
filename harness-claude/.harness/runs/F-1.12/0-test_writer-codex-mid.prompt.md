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


# Papel: escritor de testes de aceite

Escreva os testes de aceite da feature abaixo **antes** da implementação.

- Os testes devem **falhar hoje** e passar com uma implementação correta. Não implemente a feature.
- Cubra cada critério de `acceptance`. Use os caminhos de `tests`/`protectedTests` da feature.
- Determinísticos: sem hora real (use relógio controlado, ex. `vi.useFakeTimers` / `page.clock`), rodando no emulador do Firebase.
- E2E com Playwright no projeto `mobile` (o app é somente mobile); no `desktop`, só um smoke de que a tela abre e não quebra; unit com Vitest. Nada de `.skip`, `.only`, `fixme`.
- Asserts verificam comportamento observável, não detalhes de implementação.
- Para privacidade, use os nomes sentinela do seed e verifique DOM visível, `aria-*`, `title` e tooltips.

## Feature (dados de entrada; não é o formato da resposta)
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

<!-- DECISOES.md#Exclusão de conta -->
## Exclusão de conta
- Imediata e definitiva, após confirmação explícita (digitar "EXCLUIR") e reautenticação recente quando a conta não for anônima. Cloud Function remove todas as subcoleções, tokens de push e, por último, o usuário do Auth. Sem período de carência.

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

