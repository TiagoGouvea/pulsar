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
- [L-042] Aumente o timeout do `expect.poll` no teste G6 e garanta que o listener de `onAuthStateChanged` esteja propagando corretamente a mudança de usuário após o `linkWithCredential` para o estado da aplicação.
- [L-043] Substitua 'page.waitForLoadState("networkidle")' por 'page.waitForURL()' ou 'page.waitForSelector()' para aguardar um elemento específico da página de destino, evitando a dependência de silêncio de rede.


# Papel: implementador (tentativa 3)

Implemente a feature abaixo até que os testes passem e o código respeite o design system.

- **Não altere os testes protegidos** (a tentativa é descartada automaticamente se alterar):
app/e2e/account-link.spec.ts
- Rode `yarn lint`, `yarn typecheck`, `yarn test:unit` e os e2e relevantes antes de terminar.
- Respeite o `screen.png` e o `code.html` da tela correspondente em `design/` e os tokens de `design/pulsar_bio_analytics/DESIGN.md`; reutilize os componentes de `app/src/design/`.
- Se a feature criar uma tela nova, adicione a rota em `app/e2e/routes.json`.
- Nunca implemente "para o teste" (hardcode, mocks no código de produção): um avaliador de outra família revisa o diff.

## Escopo
- Faça **somente** o que esta feature pede (descrição e critérios de aceite), mesmo que a spec ou o design mostrem mais.
- Estas features da etapa ainda serão feitas por outro implementador; não implemente telas, fluxos nem dados delas:
- F-1.12 Tela de conta: sair e excluir conta
- Se precisar navegar para uma tela de outra feature, crie no máximo um placeholder mínimo (título e uma linha, sem lógica).
- Não remova nem reescreva código de features já entregues.

## Diagnóstico da tentativa anterior
Avaliação ui reprovou (nota 6.9):
- [major]  O card de conta anônima não mostra o UID/chave temporária (ex.: #PLS-9482), que aparece no mockup configura_es_e_conta. A feature trata justamente de preservar o UID, e o usuário não consegue ver o identificador que será mantido. → Exibir o identificador (chip ou linha 'UID #PLS-…') no card de conta, nos dois modos de privacidade. Confirmar na spec (docs/) se o UID é obrigatório na tela.
- [major]  As capturas do dashboard mostram só o estado vazio ('Comece registrando o seu dia'). Não há captura do card 'Garantir dados do Dia 1 e Dia 2' com 'Salvar com Google' e 'Enviar Link Mágico', que é o ponto de entrada da conversão no mockup dashboard_dia_2. Esse fluxo não foi verificado visualmente. → Adicionar capturas com dados semeados (dia 2 e dia 14) mostrando o card de conversão nos modos privado e nomes, em mobile e desktop.
- [major]  Não há capturas dos estados do fluxo de conversão: link mágico enviado, erro no Google, sucesso ao vincular. Para c6 ('carregando, erro e salvo desenhados'), a tela de Configurações sem feedback de estado fica incompleta. → Capturar os estados de sucesso, erro e carregamento da vinculação (Google e link mágico), usando os componentes de estado do design system (Erro e Salvo já existem em design-*).
- [minor]  Há um círculo decorativo rosa-avermelhado no canto superior direito do card de conta, sobreposto ao cabeçalho do card. No desktop ele é cortado pela borda do card. Parece artefato, não elemento de design. → Remover o blob ou limitá-lo aos limites do card, com opacidade violeta sutil, como nas demais superfícies.
- [minor]  O pill 'CONTA ANÔNIMA ATIVA' usa vermelho (cor de erro, #ba1a1a no token). O estado é informativo e não de erro, e os tokens reservam o vermelho para falhas. Pode gerar alarme desnecessário. → Usar o tom de alerta âmbar (baixa confiança) ou um pill neutro/indigo com ícone de cadeado, sem vermelho.
- [minor]  A escala de 0 a 10 é cortada na borda do card: no mobile o último item visível é o 6 seguido de um círculo cortado; no desktop o 9 aparece cortado. Não há indicação de scroll horizontal, o que lê como overflow (c3/c10). → Quebrar a escala em duas linhas (0–5 / 6–10) ou usar grid de 6 colunas com scroll explícito e indicador/fade.
- [minor]  No modo nomes, os nomes de fatores e resultados recebem emojis (🚴, ☕, ⚡) como ícones. Isso foge do sistema de ícones usado no resto da interface (Fator, Resultado, Análise, Registrado) e quebra a consistência entre telas (c5). → Usar os ícones já existentes no design system para cada fator/resultado, não emojis.
- [minor]  As capturas 'home' mostram o onboarding (Passo 1 de 3), o mesmo conteúdo de 'onboarding-*'. Ou a rota home redireciona para o onboarding, ou a captura está errada. Assim, a cobertura real fica duplicada e nenhuma captura mostra o dashboard com dados. → Confirmar a rota de cada captura e renomear ou corrigir os arquivos home-* para refletir a tela real.

## Feature (dados de entrada; não é o formato da resposta)
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
  "status": "in_progress",
  "attempts": 2,
  "costUsd": 5.259979257,
  "spendSince": "2026-11-05T09:49:45.283Z",
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
- 2026-11-02T17:51 ✔ F-1.07 passing — Tutorial de três telas (worker minimax, 2 tentativa(s), US$ 0.47) │ features 9/12
- 2026-11-02T18:11 ⛔ F-1.06 BLOQUEADA: limite de 5 tentativas atingido │ features 9/12
- 2026-11-02T19:31 teto da etapa 1 aumentado para US$ 29 (budget.yaml)
- 2026-11-02T19:31 ▶ etapa 1 (Base) │ features 9/12 │ 1 bloqueadas │ US$ 24.87/29 │ branch 1-base
- 2026-11-02T20:34 ⛔ F-1.09 BLOQUEADA: limite de 5 tentativas atingido │ features 9/12
- 2026-11-02T20:34 ⏸ 1 feature(s) esperando bloqueadas (F-1.06, F-1.09): ajuste e rode harness resume
- 2026-11-05T09:50 ▶ etapa 1 (Base) │ features 9/11 │ 0 bloqueadas │ US$ 27.06/29 │ branch 1-base


## Regras adicionais (feature crítica)

- **Estatística:** amostras e denominadores explícitos; ausência de registro nunca vira zero; `Não` explícito ≠ ausência; respeite os limiares fechados da spec (seção 6.5.1 / arquitetura 5.2); nunca use linguagem causal ("causa", "faz", "provoca").
- **Security Rules:** negar por padrão; acesso só ao próprio UID; validar o schema de cada documento; teste com `@firebase/rules-unit-testing` incluindo tentativas de acesso cruzado.
- **Privacidade:** use sempre o componente `<IndicatorLabel>`, nunca o nome cru do indicador; emojis ocultos com o olho fechado; nada de nomes em `aria-label`, `title`, `alt`, tooltips, `document.title`, `localStorage` ou logs.
- **Sincronização:** operações idempotentes; nunca sobrescrever dados de outro dispositivo sem regra explícita.
