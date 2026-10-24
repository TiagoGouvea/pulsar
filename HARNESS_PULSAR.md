# Harness Pulsar — Instruções completas de implementação

> **Para o Claude CLI:** este documento descreve um **harness autônomo multi-modelo** que você deve implementar.
> **Você NÃO deve implementar o app Pulsar.** Sua tarefa é construir a máquina que vai construí-lo.
> Ao terminar, pare e entregue ao humano o comando `harness doctor` e o `harness smoke` para validação.

---

## 0. Contexto e objetivo

O humano (Tiago) vai fornecer:

- `docs/spec.md`: especificação funcional do Pulsar, já consolidada.
- `docs/arquitetura.md`: arquitetura técnica sugerida (React + TS + Vite + Firebase).
- `design/`: mockups (PNG) das telas principais, mais `tokens.json`.
- `DECISOES.md`: decisões já tomadas por ele.
- Chaves de API, projeto Firebase de desenvolvimento e configuração de orçamento.

O harness deve, **sem supervisão contínua**:

1. Decompor a spec em features atômicas e verificáveis.
2. Implementar feature por feature, com testes, usando **vários modelos de vários provedores** (Claude, OpenAI/Codex, Gemini, GLM, Kimi, DeepSeek e modelos locais).
3. Validar cada feature com gates determinísticos e com um **avaliador independente**, que é sempre de outra família de modelo.
4. Trabalhar em **etapas**. Ao fim de cada etapa: deploy de preview, relatório, dúvidas e riscos. Depois **pausa** até aprovação humana.
5. **Aprender** com o próprio desempenho (lições, roteamento por estatística, retrospectivas).
6. **Controlar orçamento** com tetos rígidos e livro-caixa.

Resultado final esperado: o app Pulsar funcionando, bonito (aderente ao design), testado, com todas as etapas aprovadas pelo humano.

---

## 1. Princípios não negociáveis

1. **Estado em arquivos, nunca na memória do agente.** Cada chamada de worker começa com contexto limpo e lê o estado do disco.
2. **Quem implementa não aprova.** A aprovação vem dos gates determinísticos mais um avaliador de **família diferente** do implementador.
3. **Testes de aceite são protegidos.** O executor não pode editar, pular nem enfraquecer testes de aceite. O gate verifica isso.
4. **Toda suposição vira registro.** Quando falta informação, o agente escolhe o default mais conservador e registra em `inbox/questions.jsonl`.
5. **Nada irreversível sem humano.** Deploy de produção, exclusão de dados reais e mudança de spec ou design exigem aprovação. Previews são permitidos.
6. **Orçamento é gate.** Estourou o teto, o harness pausa e gera checkpoint.
7. **Agnóstico de modelo.** Trocar ou adicionar um modelo é só editar configuração. Nenhum código depende de um provedor específico.
8. **Retomável.** Se o processo cair, `harness resume` continua do último estado consistente, sem perder trabalho e sem duplicar.
9. **Sem segredos no git.** Chaves só em `.env`, que fica no `.gitignore`. Nunca em logs, nunca em prompts.

---

## 2. Estrutura do repositório

```
pulsar/
├── docs/
│   ├── spec.md                  # fornecido pelo humano (congelado; hash registrado)
│   └── arquitetura.md           # fornecido pelo humano
├── design/
│   ├── screens/*.png            # mockups de referência
│   └── tokens.json              # cores, tipografia, espaçamento, raios, sombras
├── DECISOES.md                  # decisões do humano
├── app/                         # o app Pulsar (criado pelo harness na etapa 0)
├── harness/                     # O QUE VOCÊ VAI IMPLEMENTAR
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── cli.ts               # entrypoint: start | resume | status | approve | doctor | smoke | report | pause
│   │   ├── orchestrator.ts      # loop principal / máquina de estados
│   │   ├── state.ts             # leitura/escrita atômica de estado
│   │   ├── features.ts          # features.json: seleção, status, dependências
│   │   ├── router.ts            # escolha de worker por papel (bandit + regras)
│   │   ├── adapters/
│   │   │   ├── types.ts         # interface WorkerAdapter
│   │   │   ├── claude-code.ts   # Claude, GLM (via base URL Z.ai)
│   │   │   ├── codex.ts         # OpenAI
│   │   │   ├── gemini.ts        # Google
│   │   │   ├── pi.ts            # OpenRouter (Kimi, DeepSeek), LM Studio local
│   │   │   └── fake.ts          # worker simulado p/ testes do harness
│   │   ├── gates/
│   │   │   ├── run-gates.ts     # executa todos os gates e gera relatório JSON
│   │   │   ├── protected.ts     # integridade dos testes de aceite
│   │   │   ├── privacy-leak.ts  # varredura de nomes sentinela
│   │   │   ├── visual.ts        # screenshots + regressão
│   │   │   └── quality.ts       # axe, overflow, lighthouse
│   │   ├── evaluator.ts         # avaliação independente (código + UI)
│   │   ├── checkpoint.ts        # pacote de fim de etapa + preview deploy
│   │   ├── budget.ts            # ledger, tetos, alertas
│   │   ├── learning.ts          # lições, retros, routing-stats, proposals
│   │   ├── notify.ts            # webhook genérico
│   │   ├── git.ts               # worktrees, commits, merge, rollback
│   │   ├── prompts.ts           # montagem de prompts (template + contexto + lições)
│   │   └── logger.ts            # events.jsonl
│   ├── prompts/                 # templates .md por papel (seção 9)
│   ├── rubrics/design.md        # rubric visual (seção 10)
│   └── test/                    # testes do próprio harness (seção 15)
├── harness.config.yaml          # workers, papéis, etapas, limites (seção 4)
├── budget.yaml                  # tetos de custo (seção 12)
├── prices.yaml                  # preço por 1M tokens por worker (o humano preenche)
├── .env.example                 # todas as variáveis necessárias (sem valores)
├── .harness/                    # estado de execução (versionado, exceto logs brutos)
│   ├── state.json
│   ├── features.json
│   ├── progress.md
│   ├── events.jsonl
│   ├── ledger.jsonl
│   ├── routing-stats.json
│   ├── spec.hash
│   ├── inbox/questions.jsonl
│   ├── inbox/risks.jsonl
│   ├── lessons/project.md
│   ├── lessons/harness.md       # sobrevive entre projetos
│   ├── proposals/
│   └── runs/<taskId>/           # prompt, transcript, gate report, verdict
└── checkpoints/etapa-N/
    ├── RELATORIO.md
    ├── COMO-TESTAR.md
    ├── DUVIDAS.md
    ├── RISCOS.md
    ├── APROVACAO.md             # o humano escreve aqui
    └── screenshots/
```

Stack do harness: **Node LTS + TypeScript**, `zod` para validar configs e saídas JSON, `execa` para os subprocessos, `yaml`, `vitest` para os testes do harness. Sem dependências pesadas.

---

## 3. Adapters de worker

### 3.1 Interface

```ts
interface WorkerSpec {
  id: string;                 // ex: "sonnet"
  cli: "claude" | "codex" | "gemini" | "pi" | "fake";
  model: string;
  family: "anthropic" | "openai" | "google" | "zhipu" | "moonshot" | "deepseek" | "qwen" | "local-other";
  tier: "high" | "mid" | "low" | "local";
  vision: boolean;
  billing: "api" | "subscription" | "local";
  env?: Record<string, string>;      // nomes de vars do .env a injetar (ex: base URL do GLM)
  maxContextTokens?: number;
  concurrency: number;               // locais = 1
  timeoutMin: number;
}

interface WorkerRun {
  workerId: string;
  role: Role;
  cwd: string;                       // worktree da tarefa
  prompt: string;
  attachments?: string[];            // caminhos de imagens (avaliador visual)
}

interface WorkerResult {
  ok: boolean;
  exitCode: number;
  finalText: string;                 // última mensagem do agente
  structured?: unknown;              // JSON extraído e validado com zod quando o papel exige
  usage: { inputTokens: number; outputTokens: number; cachedTokens?: number; costUsd?: number };
  durationMs: number;
  transcriptPath: string;
}
```

### 3.2 Regras para cada adapter

- Rodar a CLI em **modo não interativo com saída JSON**.
- **IMPORTANTE:** flags de CLI mudam com frequência. **Antes de implementar cada adapter, rode `<cli> --help`** e use as flags reais da versão instalada. Documente a versão testada no topo do arquivo do adapter. Referência esperada (a confirmar):
  - Claude Code: `claude -p "<prompt>" --output-format json --model <model>`, com permissões configuradas para uso headless (allowlist de ferramentas em `.claude/settings.json` do worktree).
  - Codex: `codex exec --json --model <model> "<prompt>"`.
  - Gemini CLI: modo prompt não interativo com saída JSON.
  - Pi: `pi -p "<prompt>" --mode json --model <provider/model>`; provedores customizados via `~/.pi/agent/models.json` (LM Studio em `http://localhost:1234/v1`).
- **GLM** roda pelo adapter `claude-code`, injetando `ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic` e o token da Z.ai. Motivo: o GLM Coding Plan só vale em ferramentas oficialmente suportadas.
- **Custo:**
  - se a CLI reportar custo, use-o;
  - senão, calcule por `prices.yaml`;
  - para `billing: subscription`, registre tokens e número de prompts e marque custo marginal 0.
- **Timeout:** ao estourar, mate a árvore de processos e marque a tentativa como `timeout`.
- **Transcript:** salve sempre em `.harness/runs/<taskId>/<attempt>-<workerId>.jsonl`.
- **Locais:** antes de chamar, verifique no LM Studio (`GET /v1/models`) se o endpoint responde. Se não responder, o router exclui o worker temporariamente. Concurrency 1. Nunca rode dois locais grandes ao mesmo tempo.
- **Segurança de execução:** os workers rodam com permissões amplas **somente dentro do worktree da tarefa**. Proíba escrita fora de `pulsar/` e acesso ao `.env` (o orquestrador injeta só as vars necessárias). Recomende ao humano rodar o harness num usuário dedicado ou num devcontainer.

### 3.3 Adapter `fake`

É obrigatório. Ele simula os workers com respostas roteirizadas (sucesso, falha, timeout, JSON inválido, tentativa de editar teste protegido, estouro de custo). Serve para testar o orquestrador inteiro sem gastar dinheiro.

---

## 4. `harness.config.yaml`

O Claude CLI cria este arquivo com os valores abaixo. Os IDs marcados `<preencher>` ficam para o humano. O `harness doctor` falha enquanto houver `<preencher>` em worker habilitado.

```yaml
project:
  name: pulsar
  appDir: app
  specFiles: [docs/spec.md, docs/arquitetura.md]
  designDir: design
  decisionsFile: DECISOES.md
  language: pt-BR

workers:
  # --- Anthropic ---
  fable:        { cli: claude, model: claude-fable-5-1,   family: anthropic, tier: high, vision: true,  billing: api, concurrency: 1, timeoutMin: 60, enabled: false }
  opus:         { cli: claude, model: claude-opus-5-5,    family: anthropic, tier: high, vision: true,  billing: api, concurrency: 2, timeoutMin: 45 }
  sonnet:       { cli: claude, model: claude-sonnet-5-5,  family: anthropic, tier: mid,  vision: true,  billing: api, concurrency: 3, timeoutMin: 40 }
  haiku:        { cli: claude, model: claude-haiku-5-5,   family: anthropic, tier: low,  vision: true,  billing: api, concurrency: 3, timeoutMin: 15 }
  # --- OpenAI ---
  codex-top:    { cli: codex,  model: "<preencher>",      family: openai,    tier: high, vision: true,  billing: api, concurrency: 2, timeoutMin: 45 }
  codex-mini:   { cli: codex,  model: "<preencher>",      family: openai,    tier: low,  vision: false, billing: api, concurrency: 2, timeoutMin: 20 }
  # --- Google ---
  gemini-pro:   { cli: gemini, model: "<preencher>",      family: google,    tier: high, vision: true,  billing: api, concurrency: 2, timeoutMin: 45 }
  gemini-flash: { cli: gemini, model: "<preencher>",      family: google,    tier: low,  vision: true,  billing: api, concurrency: 3, timeoutMin: 20 }
  # --- Open source via assinatura / OpenRouter ---
  glm:          { cli: claude, model: "<preencher>",      family: zhipu,     tier: mid,  vision: false, billing: subscription, concurrency: 2, timeoutMin: 40,
                  env: { ANTHROPIC_BASE_URL: ZAI_ANTHROPIC_BASE_URL, ANTHROPIC_AUTH_TOKEN: ZAI_API_KEY } }
  kimi:         { cli: pi,     model: "openrouter/<preencher>", family: moonshot, tier: mid, vision: false, billing: api, concurrency: 2, timeoutMin: 40 }
  deepseek:     { cli: pi,     model: "openrouter/<preencher>", family: deepseek, tier: low, vision: false, billing: api, concurrency: 2, timeoutMin: 30 }
  # --- Locais (LM Studio, http://localhost:1234/v1) ---
  local-gptoss: { cli: pi, model: "lmstudio/gpt-oss-20b",                       family: openai, tier: local, vision: false, billing: local, concurrency: 1, timeoutMin: 30, maxContextTokens: 32000 }
  local-coder:  { cli: pi, model: "lmstudio/qwen3-coder-30b-a3b-instruct",      family: qwen,   tier: local, vision: false, billing: local, concurrency: 1, timeoutMin: 40, maxContextTokens: 32000, requiresFreeRamGb: 18 }
  local-small:  { cli: pi, model: "lmstudio/qwen3.5-9b",                        family: qwen,   tier: local, vision: false, billing: local, concurrency: 1, timeoutMin: 15, maxContextTokens: 32000 }
  # os IDs "lmstudio/..." devem ser conferidos com GET /v1/models do LM Studio
  # --- Testes ---
  fake:         { cli: fake,   model: fake, family: local-other, tier: low, vision: true, billing: local, concurrency: 4, timeoutMin: 1, enabled: false }

roles:
  initializer:   { pool: [opus],                           note: "decompõe spec, scaffold, design system" }
  test_writer:   { pool: [opus, codex-top],                note: "escreve testes de aceite ANTES da implementação" }
  implement:     { pool: [sonnet, glm, kimi, local-coder], note: "features comuns" }
  implement_hard:{ pool: [opus, codex-top],                note: "estatística, security rules, sincronização, privacidade" }
  review_code:   { pool: [codex-top, gemini-pro, opus],    rule: different_family_from_implementer }
  review_ui:     { pool: [gemini-pro, opus],               rule: different_family_from_implementer, requires: vision }
  triage:        { pool: [local-small, haiku, deepseek, gemini-flash] }
  retro:         { pool: [opus] }
  postmortem:    { pool: [opus] }

routing:
  explorationRate: 0.10        # 10% das tarefas testam worker fora do melhor histórico
  escalateAfterFailures: 2     # implement -> implement_hard
  maxAttemptsPerFeature: 5     # depois: bloqueia a feature e registra em DUVIDAS
  tournament:
    enabled: true
    tags: [statistics, security-rules, privacy-mode]   # features críticas
    contenders: 2
    judge: review_code

loop:
  maxParallelTasks: 2          # worktrees simultâneas (locais contam como exclusivos)
  retroEveryNFeatures: 10
  stopOnSpecChange: true

notify:
  webhookEnv: NOTIFY_WEBHOOK_URL   # POST JSON genérico (Telegram/e-mail/WhatsApp/Agento)
  events: [checkpoint_ready, budget_80, budget_100, blocked, run_finished, crash]
```

---

## 5. Etapas (checkpoints humanos)

O inicializador associa cada feature a uma etapa. A ordem é fixa:

| Etapa | Conteúdo | Saída para teste humano |
|---|---|---|
| **0. Setup** | Scaffold Vite + React + TS + Tailwind, Firebase (Auth, Firestore, Hosting), emuladores, CI local, design system (tokens → CSS vars + componentes base), gerador de seed, primeiros testes | App vazio com design system visível numa página `/_design` (dev only) |
| **1. Base** | Auth, tutorial, sugestões iniciais, CRUD de indicadores, siglas, modo privado global, arquivamento, reordenação, Security Rules | Criar conta, configurar indicadores, alternar o olho |
| **2. Registro** | Painel de registro rápido, os 4 tipos, único vs múltiplos por dia, observação, regra sem retroativo, feedback de salvamento/erro | Registrar um dia completo no celular |
| **3. Insights** | Agregação diária, retrato do dia, tendências, associações com filtros de qualidade, cartões, "Entenda a análise", mini gráficos | Dashboard com dados seed de 30 dias |
| **4. Curadoria** | Like, dislike, timeline, chaves de hipótese/evidência, deduplicação | Curtir e descartar insights |
| **5. PWA e push** | Somente se `DECISOES.md` incluir no escopo | Instalar o PWA, receber lembrete |
| **6. IA generativa** | Somente se `DECISOES.md` incluir no escopo | Textos de insight com consentimento |
| **7. Polimento** | Acessibilidade, performance, estados vazios e de erro, revisão visual completa, exclusão de conta | Rodada final em celular e desktop |

Uma etapa termina quando todas as suas features estão `passing` e os gates da etapa inteira passaram (regressão completa, não só os da feature).

---

## 6. `features.json`

```json
{
  "specHash": "sha256...",
  "features": [
    {
      "id": "F-1.07",
      "stage": 1,
      "title": "Modo privado: siglas substituem nomes em todas as telas",
      "description": "…",
      "specRefs": ["spec.md#4.4", "spec.md#10-interface-e-privacidade"],
      "acceptance": [
        "Ao abrir o app, nenhum nome completo de indicador aparece no DOM visível, aria-label, title ou tooltip",
        "Tocar no olho revela nomes em todas as telas; tocar de novo oculta",
        "Recarregar a página volta ao modo privado"
      ],
      "tests": ["app/e2e/privacy-mode.spec.ts", "app/src/privacy/__tests__/label.test.ts"],
      "protectedTests": ["app/e2e/privacy-mode.spec.ts"],
      "tags": ["privacy-mode", "ui"],
      "difficulty": "hard",
      "dependsOn": ["F-1.03"],
      "status": "failing",
      "attempts": 0,
      "history": []
    }
  ]
}
```

- `status`: `failing | in_progress | passing | blocked`.
- Só o **orquestrador** muda `status`, nunca um worker.
- Tamanho de feature: implementável em uma sessão de agente (até cerca de 5 arquivos alterados). Se for maior, o inicializador divide.
- O inicializador mapeia **todos** os critérios de aceite da seção 10 da spec para pelo menos uma feature. O `doctor` verifica essa cobertura.

---

## 7. Loop do orquestrador

### 7.1 Máquina de estados (`state.json`)

```
INIT → STAGE_RUNNING → STAGE_GATES → CHECKPOINT_READY → AWAITING_APPROVAL
     → (aprovado) STAGE_RUNNING (próxima) ... → DONE
Qualquer estado → PAUSED_BUDGET | PAUSED_SPEC_CHANGE | PAUSED_MANUAL | CRASHED
```

### 7.2 Fase INIT (uma vez)

1. Verificar `doctor`. Se falhar, aborta.
2. Registrar o hash da spec e do design.
3. Chamar o **inicializador**, que deve:
   - criar `features.json` completo;
   - criar o `DECISOES.md`, complementando pendências não decididas pelo humano com defaults conservadores. Cada default vira item em `inbox/questions.jsonl`;
   - criar o scaffold do app (etapa 0) e o `app/AGENTS.md` + `app/CLAUDE.md` com as regras do projeto;
   - gerar o design system a partir de `design/tokens.json` e dos mockups.
4. Um avaliador de outra família revisa o `features.json` (cobertura da spec, granularidade, dependências). Se reprovar, volta para o inicializador, no máximo 2 vezes.

### 7.3 Ciclo por feature

```
1. Selecionar próxima feature `failing` da etapa atual com dependências `passing`.
2. Criar worktree: git worktree add .worktrees/<id> -b feat/<id>
3. Se a feature não tem testes de aceite: chamar test_writer → commitar testes → marcar como protegidos
   (hash registrado em .harness/protected.json).
4. Escolher worker (router.ts) para implement ou implement_hard.
   Se a tag estiver em tournament.tags: criar N worktrees e rodar N workers diferentes.
5. Montar prompt (prompts.ts): template do papel + feature + trechos da spec + design refs relevantes
   + lições filtradas (top 5–10 por papel/tag) + resumo do progress.md + regras.
6. Executar worker. Registrar evento + ledger.
7. Rodar gates (seção 8) no worktree.
8. Se gates falham: triage (modelo barato) resume causa raiz em JSON → nova tentativa com o diagnóstico.
   Após `escalateAfterFailures`, sobe para implement_hard.
   Após `maxAttemptsPerFeature`: status `blocked`, registrar em questions + risks, seguir para a próxima.
9. Se gates passam: avaliador de código (família diferente) e, se a feature tem tag `ui`, avaliador visual.
   Reprovação → volta ao passo 8 com os issues do avaliador.
10. Aprovado: merge na branch da etapa (stage/N), commit com mensagem padronizada, remover worktree,
    status `passing`, atualizar progress.md, routing-stats, ledger.
11. A cada `retroEveryNFeatures`: retro (seção 11).
12. Checar orçamento (seção 12) antes de cada chamada de worker.
```

### 7.4 Fim de etapa

1. Rodar a suíte completa (todos os testes de todas as etapas já feitas) na branch `stage/N`.
2. Avaliação visual completa de todas as telas.
3. Gerar o pacote de checkpoint (seção 13), fazer o deploy de preview e notificar.
4. Estado `AWAITING_APPROVAL`. O processo **termina** (não fica bloqueado esperando).

### 7.5 `harness approve`

1. Ler `checkpoints/etapa-N/APROVACAO.md` e as respostas em `DUVIDAS.md`.
2. Um modelo barato converte as respostas em JSON: `{aprovado: bool, ajustes: [...], respostasDuvidas: [...]}`. Depois o humano confirma o resumo no terminal (y/n).
3. Ajustes viram novas features na etapa N (com prefixo `F-N.adj-`). Respostas a dúvidas atualizam `DECISOES.md` e `lessons/project.md`.
4. Se a etapa foi aprovada sem ajustes: merge de `stage/N` em `main`, tag `etapa-N-aprovada`, e o harness segue para a etapa N+1.

### 7.6 Retomada e robustez

- Toda escrita de estado é atômica (escreve num arquivo temporário e depois faz `rename`).
- Ao reiniciar, uma feature que ficou `in_progress` volta para `failing`. Worktrees órfãs são removidas. Nenhuma tentativa é contada em dobro.
- **Mudança de spec ou design** (hash diferente): o harness pausa, gera um diff e um resumo do impacto em `checkpoints/mudanca-spec.md`, e espera `harness approve`.
- Crash de worker não derruba o orquestrador. Crash do orquestrador gera notificação.

---

## 8. Gates (validação determinística)

`run-gates.ts` gera `gate-report.json`, com status e detalhes de cada gate. Uma feature passa somente se todos os gates obrigatórios passarem.

| # | Gate | Ferramenta | Obrigatório |
|---|---|---|---|
| G1 | Install/build | `npm ci`, `vite build` | sim |
| G2 | Lint + format | ESLint + Prettier | sim |
| G3 | Typecheck | `tsc --noEmit` (strict) | sim |
| G4 | Unit | Vitest (cobertura mínima 80% em `src/stats/` e `src/privacy/`) | sim |
| G5 | Security Rules | `@firebase/rules-unit-testing` no emulador | sim (a partir da etapa 1) |
| G6 | E2E | Playwright no emulador, projetos `mobile` (375×812) e `desktop` (1280×800) | sim |
| G7 | Testes protegidos | hash dos arquivos protegidos; proibido `.skip`, `.only`, `test.fixme` e redução no número de asserts | sim |
| G8 | Vazamento de privacidade | ver 8.1 | sim (a partir da etapa 1) |
| G9 | Acessibilidade | `@axe-core/playwright`, zero violações `serious` ou `critical` | sim |
| G10 | Layout mobile | sem overflow horizontal em 320, 375 e 414px; alvos de toque ≥ 44px | sim |
| G11 | Regressão visual | screenshots do Playwright; baseline atualizada só após aprovação de etapa | sim após a etapa 1 |
| G12 | Lighthouse | PWA, performance ≥ 85, a11y ≥ 95 (mobile) | só no fim de etapa e na etapa 7 |
| G13 | Segredos | varredura do diff (padrões de chave e `.env`) | sim |

### 8.1 Gate de vazamento de privacidade

- O seed de teste cria indicadores com **nomes sentinela** únicos, como `ZQX_ENERGIA_7F3`, e observações sentinela.
- Com o modo privado ativo, o Playwright percorre todas as rotas e estados (dashboard, registro, editor fechado, timeline, gráficos com hover, tooltips).
- Ele coleta `innerText`, `aria-*`, `title`, `alt`, o `document.title`, os textos dos gráficos (SVG e canvas via acessibilidade) e o `localStorage`.
- Ele também intercepta as requisições de rede, para checar logs e analytics.
- Qualquer ocorrência de sentinela fora do editor aberto intencionalmente reprova o gate.

### 8.2 Seed

- `app/scripts/seed.ts` gera de 30 a 60 dias de dados realistas, com correlações plantadas (para validar que o motor detecta) e ruído (para validar que ele não inventa associação).
- **Só roda contra o emulador.** O script recusa execução se `FIRESTORE_EMULATOR_HOST` não estiver definido.
- Essa é a exceção autorizada à regra "sem retroativo", apenas para testes.

---

## 9. Prompts por papel (`harness/prompts/*.md`)

Todos os prompts começam com o mesmo bloco de regras comuns:

```
Você é um worker de um harness autônomo. Contexto limpo: tudo que importa está nos arquivos citados.
Regras:
- Trabalhe SOMENTE no diretório atual (worktree). Não acesse .env nem fora do projeto.
- Não edite arquivos listados como protegidos. Não use .skip/.only. Não enfraqueça asserts.
- Siga app/AGENTS.md, DECISOES.md e o design system (design/tokens.json → app/src/design/).
- Se faltar informação: escolha o default mais conservador e registre uma linha JSON em
  .harness/inbox/questions.jsonl: {"featureId","pergunta","escolhido","alternativas","impacto"}.
- Se identificar um risco futuro: registre em .harness/inbox/risks.jsonl:
  {"featureId","risco","probabilidade","impacto","sugestao"}.
- Rode os testes relevantes antes de terminar. Termine com um bloco JSON final:
  {"summary","filesChanged","testsRun","confidence":"low|med|high","notes"}.
LIÇÕES RELEVANTES:
{{lessons}}
```

### 9.1 `initializer.md`

- Ler a spec completa, a arquitetura, o `DECISOES.md` e os mockups.
- Produzir o `features.json` (schema da seção 6), cobrindo 100% da seção 10 da spec, organizado nas etapas da seção 5.
- Preencher no `DECISOES.md` as pendências restantes, uma por linha, com a justificativa.
- Criar o scaffold do app, o `app/AGENTS.md` (regras de código, padrões, estrutura de pastas, convenções de teste) e o design system (tokens → CSS variables + Tailwind theme + componentes base: Button, Chip, Slider, NumberInput, Toggle, Card, Sheet, EyeToggle, GroupBadge Fator/Resultado).
- Só lógica pura e testável em `src/stats/`, sem Firebase.

### 9.2 `test_writer.md`

- Para a feature recebida, escrever os testes de aceite (e2e e/ou unit) que falham hoje e passariam com uma implementação correta.
- Não implementar a feature.
- Testes determinísticos, sem dependência de hora real (usar relógio controlado), rodando no emulador.

### 9.3 `implement.md` / `implement_hard.md`

- Implementar a feature até que os testes passem e o código respeite o design system.
- Não alterar testes protegidos.
- `implement_hard` acrescenta:
  - **Estatística:** amostras e denominadores explícitos; ausência nunca vira zero; nunca linguagem causal.
  - **Rules:** negar por padrão e validar o schema.
  - **Privacidade:** usar sempre o componente `<IndicatorLabel>`, nunca o nome cru.

### 9.4 `triage.md`

- Entrada: gate report e o final do transcript.
- Saída, somente JSON: `{"causaRaiz","categoria":"test|type|lint|logic|env|flaky|design","padrao":bool,"dica"}`.

### 9.5 `review_code.md`

- Entrada: diff, feature, critérios de aceite e gate report.
- Verificar se o código atende de fato aos critérios, sem implementar "para o teste" (hardcode, mocks indevidos). Verificar também segurança, privacidade, aderência à spec e qualidade.
- Saída JSON: `{"pass":bool,"score":0-10,"issues":[{"severidade":"blocker|major|minor","arquivo","descricao","sugestao"}]}`.
- Reprova se houver qualquer `blocker` ou score < 7.

### 9.6 `review_ui.md`

- Entrada: screenshots (mobile e desktop) das telas afetadas, mockups de referência, `tokens.json` e o rubric (seção 10).
- Saída JSON: `{"pass":bool,"score":0-10,"porCriterio":{...},"issues":[...]}`.
- Reprova se o score for < 7.5 ou se qualquer critério crítico for < 6.

### 9.7 `retro.md` e `postmortem.md`

Seção 11.

---

## 10. Rubric de design (`harness/rubrics/design.md`)

Notas de 0 a 10 por critério. Os critérios marcados com * são críticos.

1. *Fidelidade ao mockup e aos tokens (cores, tipografia, espaçamento, raios).
2. *Distinção Fatores × Resultados imediata, sem depender só de cor (ícone, rótulo e posição).
3. *Legibilidade e uso no celular: alvos grandes, contraste, nada espremido em 375px.
4. Hierarquia visual: a ação principal ("Registrar agora") é óbvia e os insights são escaneáveis.
5. Consistência entre telas (componentes, estados, ícones).
6. Estados vazio, carregando, erro e salvo estão desenhados, não são improvisados.
7. Densidade adequada: sem excesso de gráficos e números simultâneos.
8. Microinterações discretas: feedback de salvamento sem gamificação exagerada.
9. Modo privado com estética coerente: as siglas não quebram o layout.
10. Desktop aproveita o espaço (duas colunas) sem parecer celular esticado.

---

## 11. Aprendizado do harness

### 11.1 Registros

- **`events.jsonl`:** só o orquestrador escreve. Um evento por tentativa: `{ts, taskId, featureId, stage, role, workerId, family, attempt, outcome, failedGates, tokens, costUsd, durationMs, tags}`.
- **`routing-stats.json`:** por `workerId × role × tag`, guarda `{tentativas, sucessos, custoMedio, duracaoMedia, falhasPorGate}`.
- **`lessons/project.md`** e **`lessons/harness.md`**, uma lição por bloco:

```yaml
- id: L-014
  scope: { roles: [implement], tags: [security-rules] }
  rule: "Rodar rules tests antes do e2e; falha de regra parece bug de UI."
  evidence: [evt-212, evt-219]
  added: 2026-10-24
  hits: 0
  helpedRate: null
  status: active   # active | retired | promoted
```

### 11.2 Quando o harness aprende

| Momento | Ação | Papel |
|---|---|---|
| Cada falha | Triage gera a causa raiz. Se `padrao: true`, cria uma lição candidata | triage |
| A cada N features | Retro: lê eventos, diagnósticos e lições; cria, edita, aposenta ou promove lições | retro |
| Fim de etapa | Retro da etapa + seção "Aprendizados" no RELATORIO.md | retro |
| Fim da execução | Post-mortem: propõe mudanças nos prompts, papéis, gates e config em `proposals/*.diff` | postmortem |

### 11.3 Como as lições são lidas

- O `prompts.ts` filtra as lições `active` por papel e tag da feature e injeta no máximo 10, ordenadas por `helpedRate` e recência.
- Lições `promoted` (com `helpedRate` ≥ 0.7 e ≥ 5 hits) passam a fazer parte de `app/AGENTS.md`.
- **Aposentadoria:** uma lição com ≥ 8 hits e `helpedRate` < 0.3 vai para `retired`.
- Lição sem evidência é rejeitada.
- Cada arquivo de lições tem no máximo cerca de 60 lições ativas; a retro consolida.

### 11.4 Roteamento adaptativo

- O `router.ts` escolhe o worker por bandit, ponderando a taxa de sucesso por custo esperado e por duração, com `explorationRate` de exploração.
- Respeita `rule: different_family_from_implementer`, `requires: vision`, disponibilidade (locais), concurrency e orçamento restante. Com o orçamento acima de 80%, prefere tier `low` e `local`.

### 11.5 Mudanças no próprio harness

- Nunca durante a execução.
- Ficam em `proposals/` e só são aplicadas com `harness apply-proposal <id>`, por ação humana.

---

## 12. Orçamento

### 12.1 `budget.yaml`

```yaml
currency: USD
caps:
  run: 150            # execução inteira
  stage: 40           # por etapa
  feature: 6          # por feature (todas as tentativas + reviews)
  dailyByProvider:
    anthropic: 40
    openai: 25
    google: 20
    openrouter: 15
alerts: [0.5, 0.8, 1.0]
onSoftLimit: prefer_cheap    # >= 80%: router prioriza low/local
onHardLimit: pause_and_checkpoint
```

Os valores são sugestão inicial. O humano ajusta.

### 12.2 Funcionamento

- O `budget.ts` mantém o `ledger.jsonl`, com uma linha por chamada: `{ts, workerId, provider, role, featureId, stage, tokensIn, tokensOut, costUsd, billing}`.
- **Antes** de cada chamada, estima o custo (média histórica do worker × papel). Se a estimativa estourar algum teto, troca de worker ou pausa.
- A 80%, notifica e ativa `prefer_cheap`. A 100%, gera o estado `PAUSED_BUDGET` e um checkpoint parcial.
- `harness report` mostra o gasto por etapa, worker, papel e provedor, além do custo médio por feature aprovada.
- Assinaturas (GLM) aparecem com custo marginal 0, mas com a contagem de prompts.
- **Limites duros externos** (o humano configura; o `doctor` só lembra):
  - OpenRouter: guardrail por chave, com reset diário;
  - consoles da Anthropic e da OpenAI: limite mensal;
  - Google Cloud: alertas de orçamento, que não bloqueiam.
- Use uma chave de API por provedor, dedicada ao harness.

---

## 13. Pacote de checkpoint (`checkpoints/etapa-N/`)

| Arquivo | Conteúdo |
|---|---|
| `RELATORIO.md` | Features entregues; critérios da spec atendidos; o que ficou `blocked` e por quê; custo e tempo da etapa; workers usados e taxas de sucesso; aprendizados; URL do preview |
| `COMO-TESTAR.md` | Roteiro de 10 a 15 minutos, passo a passo, no celular e no desktop; como carregar o seed de demonstração no preview; o que observar |
| `DUVIDAS.md` | Itens de `inbox/questions.jsonl` agrupados e deduplicados. Cada um tem a pergunta, o que foi escolhido, as alternativas, o impacto e uma linha `Resposta:` vazia para o humano |
| `RISCOS.md` | Itens de `inbox/risks.jsonl` com probabilidade, impacto, sugestão e status |
| `APROVACAO.md` | Template: `Status: (aprovado / ajustes)` + uma lista de ajustes |
| `screenshots/` | Todas as telas e estados, em mobile e desktop, com e sem modo privado |

**Preview:**
- Comando: `firebase hosting:channel:deploy etapa-N --expires 14d`, apontando para o projeto de desenvolvimento.
- Para o humano ter dados no preview, o seed de demonstração cria uma conta demo **no projeto de desenvolvimento**. É uma exceção controlada: a flag `--demo` exige a confirmação `HARNESS_ALLOW_DEMO_SEED=1`.
- O seed só usa dados fictícios.

---

## 14. Variáveis de ambiente (`.env.example`)

```
# Provedores
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=
OPENROUTER_API_KEY=
ZAI_API_KEY=
ZAI_ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic

# Local
LMSTUDIO_BASE_URL=http://localhost:1234/v1

# Firebase (projeto de desenvolvimento)
FIREBASE_PROJECT_ID=
GOOGLE_APPLICATION_CREDENTIALS=./secrets/firebase-sa.json   # fora do git
FIREBASE_WEB_CONFIG_JSON=                                    # config pública do app web

# GitHub
GITHUB_TOKEN=
GITHUB_REPO=owner/pulsar

# Notificações
NOTIFY_WEBHOOK_URL=

# Flags
HARNESS_ALLOW_DEMO_SEED=0
```

---

## 15. Comandos do harness

| Comando | Faz |
|---|---|
| `harness doctor` | Verifica tudo (ver 15.1). Sai com código ≠ 0 se algo crítico falhar |
| `harness smoke` | Executa uma microtarefa real (ex.: criar `hello.ts` + teste) com **cada** worker habilitado; mede tempo, custo e sucesso; grava em `routing-stats` como prior |
| `harness start` | INIT + loop até o primeiro checkpoint |
| `harness resume` | Continua do estado atual |
| `harness status` | Etapa, features por status, custo acumulado, próximo passo |
| `harness approve` | Processa a aprovação da etapa (7.5) |
| `harness pause` | Pausa limpa após a tarefa atual |
| `harness report` | Relatório de custo e desempenho |
| `harness apply-proposal <id>` | Aplica uma proposta de melhoria do harness (humano) |

### 15.1 `doctor` verifica

- Binários e versões: node, npm, git, java (emulador), firebase, playwright (browsers instalados), claude, codex, gemini, pi.
- Variáveis do `.env` necessárias para os workers habilitados. Nenhum `<preencher>` em worker habilitado.
- Autenticação de cada CLI, com uma chamada mínima por provedor.
- Firebase: projeto acessível, service account válida, emuladores sobem e descem.
- LM Studio: endpoint responde e os modelos configurados estão listados.
- `docs/spec.md`, `docs/arquitetura.md`, `design/tokens.json` e pelo menos 3 mockups existem.
- Git limpo e remoto configurado.
- `budget.yaml` e `prices.yaml` válidos, com lembrete dos limites externos.
- Disco livre ≥ 20 GB. Se rodar local, RAM disponível para os modelos locais.
- No macOS: aviso para usar `caffeinate -dimsu` durante a execução.

---

## 16. Testes do próprio harness

Obrigatórios e rodando com o adapter `fake`, sem custo:

1. Fluxo feliz: 3 features em 2 etapas → checkpoint → approve → DONE.
2. Falha → triage → retry → escalonamento → sucesso.
3. Feature atinge o limite de tentativas → `blocked` → aparece em DUVIDAS e RISCOS.
4. Worker tenta editar um teste protegido → G7 reprova → tentativa descartada.
5. Avaliador da mesma família nunca é escolhido.
6. Estouro de teto de feature e de etapa → troca de worker → pausa com checkpoint parcial.
7. Crash no meio de uma tarefa → `resume` sem duplicar e sem worktree órfã.
8. Mudança no hash da spec → `PAUSED_SPEC_CHANGE`.
9. JSON inválido do worker → tratado como falha, com uma retentativa de formatação.
10. Lições: criação com evidência, injeção filtrada, aposentadoria por baixa eficácia.
11. Router: o bandit converge para o melhor worker simulado e mantém a exploração.
12. `approve` converte as respostas do humano em features de ajuste.

---

## 17. Ordem de implementação para o Claude CLI

Implemente nesta ordem e faça commit ao fim de cada fase:

1. **H1:** estrutura de pastas, `package.json`, configs com schema `zod`, `state.ts`, `logger.ts`, `.env.example`, `.gitignore`.
2. **H2:** interface de adapter + `fake.ts` + os adapters reais (consultando `--help` de cada CLI instalada).
3. **H3:** `git.ts` (worktrees, merge, rollback) e `features.ts`.
4. **H4:** `orchestrator.ts` com a máquina de estados e o ciclo da seção 7, usando só o `fake`.
5. **H5:** `gates/` completo. Como o app ainda não existe, crie um **app-fixture mínimo** em `harness/test/fixture-app` para validar os gates.
6. **H6:** `evaluator.ts`, `router.ts` com o bandit e a regra de família.
7. **H7:** `budget.ts` + `report`.
8. **H8:** `learning.ts` (lições, retro, postmortem, proposals).
9. **H9:** `checkpoint.ts`, preview deploy, `notify.ts` e `approve`.
10. **H10:** `prompts/` e `rubrics/` (textos da seção 9 e 10), `doctor` e `smoke`.
11. **H11:** todos os testes da seção 16 passando + `README.md` do harness com o guia do humano.

**Critério de pronto do harness:**
- Os testes da seção 16 estão verdes.
- `harness doctor` roda e lista claramente o que o humano ainda precisa configurar.
- O README explica o fluxo: doctor → smoke → start → checkpoint → approve.

**Depois disso, pare.** Não rode `harness start`. Entregue ao humano:
1. a lista do que falta configurar, conforme o `doctor`;
2. o comando `harness smoke` para calibrar os workers;
3. o comando `harness start` para iniciar o projeto.

---

## 18. Checklist do humano antes do `harness start`

- [ ] `docs/spec.md` e `docs/arquitetura.md` finais
- [ ] `design/` com os mockups e o `tokens.json`
- [ ] `DECISOES.md`: login, escopo (push e IA na V1?), limiares estatísticos, virada do dia, offline, exclusão de conta
- [ ] Projeto Firebase de desenvolvimento + service account + Hosting habilitado (plano Blaze se push e Functions estiverem no escopo, com alerta de orçamento)
- [ ] Chaves de API no `.env`, uma por provedor, dedicada ao harness
- [ ] IDs dos modelos preenchidos em `harness.config.yaml` e preços em `prices.yaml`
- [ ] Limites duros configurados no OpenRouter, na Anthropic, na OpenAI e no GCP
- [ ] LM Studio rodando com os 3 modelos (se usar locais)
- [ ] Repositório no GitHub + token
- [ ] Webhook de notificação
- [ ] Máquina: Mac na tomada com `caffeinate`, ou VPS (nesse caso, sem os locais)
- [ ] `harness doctor` verde
- [ ] `harness smoke` executado e revisado
