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
app/e2e/onboarding.spec.ts
- Rode `yarn lint`, `yarn typecheck`, `yarn test:unit` e os e2e relevantes antes de terminar.
- Respeite o `screen.png` e o `code.html` da tela correspondente em `design/` e os tokens de `design/pulsar_bio_analytics/DESIGN.md`; reutilize os componentes de `app/src/design/`.
- Se a feature criar uma tela nova, adicione a rota em `app/e2e/routes.json`.
- Nunca implemente "para o teste" (hardcode, mocks no código de produção): um avaliador de outra família revisa o diff.

## Escopo
- Faça **somente** o que esta feature pede (descrição e critérios de aceite), mesmo que a spec ou o design mostrem mais.
- Estas features da etapa ainda serão feitas por outro implementador; não implemente telas, fluxos nem dados delas:
- F-1.06 Guarda e2e do modo privado (sentinelas)
- F-1.09 Conversão da conta: Google e link mágico preservando UID
- F-1.12 Tela de conta: sair e excluir conta
- Se precisar navegar para uma tela de outra feature, crie no máximo um placeholder mínimo (título e uma linha, sem lógica).
- Não remova nem reescreva código de features já entregues.

## Diagnóstico da tentativa anterior
Avaliação ui reprovou (nota 6.8):
- [major]  Evidência incompleta: há capturas apenas do passo 1 de 3 (Fatores), em mobile e desktop. Os passos 2 (Resultados) e 3 (Ciência pessoal) não foram capturados, então o tutorial de três telas não pode ser avaliado por inteiro. Os scores acima refletem só o passo 1. → Gerar capturas dos passos 2 e 3 em mobile (375px) e desktop, nos modos privado e nomes, e reavaliar.
- [major]  Na diagrama do hero, o pill 'Q10 Suplemento' sobrepõe o pill 'SLP Leitura' em 375px (a borda direita de um encosta na esquerda do outro, cortando o rótulo 'Suplemento'). Ocorre nos dois modos. → Reduzir o raio da órbita ou o tamanho dos pills no mobile, ou encurtar o rótulo, para que os quatro nós não se sobreponham em 375px.
- [major]  No card 'Exemplos práticos de registro', o nome 'Café Expresso' aparece truncado como 'Café Expre…' por falta de largura, perdendo informação no celular. O mockup mostra o nome completo. → Permitir quebra de linha no título do item (ou reduzir o stepper/alinhar as colunas) para que 'Café Expresso' caiba em 375px sem reticências.
- [minor]  O tutorial mostra siglas (CAF, EXE, Q10, SLP) mesmo no modo 'nomes'. A tela não tem o toggle de privacidade, então não está claro se deve reagir ao modo privado. Não há especificação visível sobre isso. → Confirmar na spec (docs/) se o tutorial segue o modo de privacidade; se sim, aplicar o rótulo completo no modo 'nomes'; se não, documentar a exceção.
- [minor]  Divergência do mockup onboarding_1: o cabeçalho usa wordmark 'PULSAR' e um pill 'Pular introdução' em vez do rótulo 'PULSAR // BIO-EXP' com seta de voltar e avatar; a seta do botão 'Próximo: Resultados' fica à esquerda, enquanto o mockup a coloca à direita. → Alinhar a seta do CTA ao mockup (à direita) e revisar o cabeçalho com a spec; se o desvio for intencional, registrar a decisão.
- [minor]  A tag 'PASSO 1 DE 3 • FATORES', o rótulo 'FATORES' do progresso e a barra de progresso usam violeta, cor de resultados, enquanto os tokens reservam o indigo para fatores. Os chips de fator (EXE/CAF/Q10) já usam azul corretamente. → Usar o indigo (secondary) para a identidade 'Fatores' no passo 1 e o violeta só no passo de resultados, para manter a distinção por cor.
- [minor]  O título 'Observe sua rotina sem burocracia' quebra deixando 'burocracia' sozinho na segunda linha. → Ajustar o texto ou o max-width do título para um quebra de linha mais equilibrado, ou usar text-wrap: balance.

## Feature (dados de entrada; não é o formato da resposta)
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
  "status": "in_progress",
  "attempts": 1,
  "costUsd": 0.33791752999999997,
  "origin": []
}

## Trechos da spec
<!-- spec.md#3.1 -->
### 3.1 Primeiro acesso — tutorial e configuração

Tutorial em **três telas**: (1) observe sua rotina/Fatores; (2) acompanhe seus Resultados; (3) descubra possíveis relações. Ter Próximo, Voltar e Pular; registrar conclusão do onboarding.

Na conta nova, apresentar dashboard vazio com **3–4 sugestões** de criação rápida (por exemplo, Energia e Concentração como Resultados; Exercício e Café como Fatores), mais a ação **Criar meu próprio indicador**. **Nenhum indicador é criado automaticamente**.

O convite para salvar a conta deve aparecer depois de alguma interação útil, não bloquear o uso inicial. O convite para **instalar a PWA** deve aparecer depois de alguns usos, com linguagem como “Instale o Pulsar para acessar mais rápido e receber um lembrete diário”; não prometer melhora clínica ou dos resultados medidos.

<!-- spec.md#6.6 -->
### 6.6 Comunicação responsável

- Nunca transformar uma correlação em “X causou Y”.
- Nunca recomendar que a pessoa aumente/reduza dosagens com base nesses dados.
- Evitar qualificações como “comprovado” ou “certeza” sem fundamento.
- Mostrar observações como “poucos dados”, “associação preliminar”, “mais registros necessários”, conforme critérios claros.
- Resultados de saúde podem ser influenciados por fatores não registrados.
- Múltiplas comparações aumentam a chance de associações coincidentes; limitar e revisar hipóteses.

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

