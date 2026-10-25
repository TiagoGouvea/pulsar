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


# Papel: inicializador

Você prepara o projeto Pulsar para ser construído feature por feature por outros agentes. Não implemente as features.

## Leia
- Spec e arquitetura (alias -> arquivo):
spec.md -> docs/Pulsar_Especificacao_Completa.md
arquitetura.md -> docs/Pulsar_Arquitetura_e_Implementacao.md
- `DECISOES.md` (decisões do humano) e `design/` (uma pasta por tela com `screen.png` + `code.html`, tokens em `design/pulsar_bio_analytics/DESIGN.md`, mapeamento tela × spec).

## Produza
1. **`.harness/features.json`** no schema abaixo, cobrindo 100% dos critérios de aceite, organizado nestas etapas:
0. Setup
1. Base
2. Registro
3. Insights
4. Curadoria
5. PWA e push (só se DECISOES.md incluir no escopo)
6. IA generativa (só se DECISOES.md incluir no escopo)
7. Polimento
   Etapas opcionais só recebem features se `DECISOES.md` as incluir no escopo.
   ```json
   {"specHash": "", "features": [{
     "id": "F-1.07", "stage": 1, "title": "…", "description": "…",
     "specRefs": ["spec.md#4.4", "arquitetura.md#9.1"],
     "covers": ["AC-15"],
     "acceptance": ["critério verificável 1", "…"],
     "tests": ["app/e2e/privacy-mode.spec.ts", "app/src/privacy/__tests__/label.test.ts"],
     "protectedTests": ["app/e2e/privacy-mode.spec.ts"],
     "tags": ["privacy-mode", "ui"], "difficulty": "easy|normal|hard", "dependsOn": ["F-1.03"]
   }]}
   ```
   - IDs `F-<etapa>.<nn>`. Cada feature cabe numa sessão de agente (até ~5 arquivos alterados); divida as maiores.
   - `covers`: ids dos critérios de aceite abaixo. **Todo critério precisa estar em pelo menos uma feature.**
   - Tags usadas pelo harness: `ui` (gera avaliação visual), `statistics`, `security-rules`, `sync`, `privacy-mode` (vão para implementadores fortes e torneio).
   - `tests`/`protectedTests`: caminhos que o escritor de testes vai criar (não crie esses testes agora).
2. **`DECISOES.md`**: complete as pendências não decididas pelo humano, uma por linha, com default conservador e justificativa. Cada default vira uma linha em `.harness/inbox/questions.jsonl`.
3. **Scaffold do app (etapa 0)** em `app/`: Vite + React + TypeScript strict + Tailwind, Firebase (Auth, Firestore, Hosting) com emuladores, ESLint + Prettier, Vitest (com cobertura), Playwright (projeto `mobile` 375×812, alvo do app; `desktop` 1280×800 só para smoke: o app é somente mobile e no computador apenas estica/desempilha), `@axe-core/playwright`, `@firebase/rules-unit-testing`. Scripts obrigatórios no `app/package.json`:
   `build`, `lint`, `format:check`, `typecheck`, `test:unit`, `test:rules`, `test:e2e`, `test:visual`, `seed`, `e2e:serve` (sobe emuladores + seed + `vite preview` na porta 4173 e fica rodando).
4. **`app/AGENTS.md`** e **`app/CLAUDE.md`** (mesmo conteúdo): regras de código, padrões, estrutura de pastas, convenções de teste, como rodar cada script.
5. **Design system** a partir de `design/pulsar_bio_analytics/DESIGN.md`, dos mockups e do `code.html` de cada tela: tokens → CSS variables + tema do Tailwind + componentes base em `app/src/design/`: Button, Chip, Slider, NumberInput, Toggle, Card, Sheet, EyeToggle (`data-testid="eye-toggle"`), GroupBadge (Fator/Resultado), e o componente `<IndicatorLabel>` (único jeito de exibir nome/sigla de indicador). Página `/_design` (somente dev) mostrando tudo.
6. **`app/e2e/routes.json`**: lista das rotas para os gates de navegador, ex. `[{"path": "/_design", "name": "design", "tags": ["ui"]}]`. Atualize quando novas telas surgirem.
7. **`app/scripts/seed.ts`**: 30–60 dias de dados realistas com correlações plantadas e ruído; usa os nomes sentinela ZQX_ENERGIA_7F3, ZQX_SONO_9K2, ZQX_FOCO_4M8, ZQX_OBS_NOTA_5T1 em indicadores e observações; **recusa rodar** sem `FIRESTORE_EMULATOR_HOST`, exceto `--demo` com `HARNESS_ALLOW_DEMO_SEED=1`. Só dados fictícios.
8. Elementos que mostram nomes reais de propósito (editor aberto) recebem `data-privacy-allow`.

Regras extras: só lógica pura e testável em `src/stats/`, sem Firebase. Sem modo offline. Timestamps em UTC.

## Critérios de aceite da spec
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

## Feedback da rodada anterior
Avaliação features reprovou (nota 0):
- [?]  "F-0.01 e F-0.02 excedem muito a granularidade de uma sessão (~5 arquivos): divida scaffold/gates/regras-base e, no design system, tokens+componentes base, privacidade/IndicatorLabel e página /_design."
- [?]  "F-1.05 depende do usuário seed e do mecanismo de custom token, mas não depende de F-0.03. Adicione F-0.03 a dependsOn."
- [?]  "F-2.11 grava o estado de dispensa do banner em users/{uid}, porém F-1.08 rejeita campos desconhecidos e não prevê esse campo. Defina o campo, tipo e regra em F-1.08 (ou crie feature de regra dedicada) e faça F-2.11 depender dela."
- [?]  "F-2.08 e F-2.09 executam escritas/exclusões de entries em e2e, mas não dependem de F-2.07; F-2.10 cria sugestões no Firestore, mas não depende de F-2.02. Adicione essas dependências para que os fluxos não rodem antes das Rules necessárias."
- [?]  "F-4.03 assina feedback e F-4.04 grava like/dislike, mas ambos podem executar antes de F-4.02, que libera e valida esses documentos nas Rules. Inclua F-4.02 em dependsOn dos dois."
- [?]  "F-7.04 exige seed, login como seed-user e jornadas reais de preenchimento, mas não depende de F-0.03, F-1.05 nem F-2.08. Adicione as dependências para tornar seus critérios executáveis."
- [?]  "F-3.02 não cobre distribuições/resumos de indicadores ordinais, exigidos explicitamente pela spec/arquitetura; acrescente geração determinística dessas distribuições e testes de ausência, opções e denominadores."
- [?]  "F-3.03 deve afirmar e testar que tendências são geradas somente para Resultados; a spec define 'Tendência de um resultado'. Hoje a descrição permite que a função seja aplicada a Fatores por engano."

Termine com o bloco ```json {"summary","filesChanged","testsRun","confidence","notes"}.
