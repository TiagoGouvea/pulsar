# Relatório Comparativo da Etapa 0 (`0-setup`): Custos, Tokens, Modelos e Aprendizados

Este documento consolida a auditoria técnica, financeira e operacional da **Etapa 0 (`0-setup`)** entre o **`harness-claude`** e o **`harness-codex`**, cruzando os registros locais (`ledger.jsonl`, transcripts `.jsonl` e `state.sqlite`), os relatórios gerados por cada harness e a reconciliação direta com as APIs e painéis dos provedores.

---

## 1. Escopo Entregue na Etapa 0 (`0-setup`)

| Aspecto | `harness-claude` (`pulsar-claude/`) | `harness-codex` (`pulsar-codex/`) |
| :--- | :--- | :--- |
| **Granularidade do Plano** | Decompôs a spec inteira no `INIT` e executou **8 features** na Etapa 0 (`F-0.01` a `F-0.07` + `F-0.fix-1`). | Executou **1 macro-tarefa** para a Etapa 0 (`task-001` cobrindo `REQ-0-001`). |
| **O que foi entregue** | Scaffold Vite + React + TS + Tailwind; tokens e componentes base (`GroupBadge` com texto + cor, alvos $\ge$ 44px); regras-base do Firestore por UID e testes no emulador; Playwright (`e2e:serve`, axe, regressão visual); Modo Privado (`PrivacyContext`, `EyeToggle`, `IndicatorLabel` com siglas); rota `/_design` restrita a dev; seed sintético determinístico de 30 dias com correlações plantadas; correção de Lighthouse (`F-0.fix-1`). | Scaffold Vite + React + TS + Tailwind v4 + Firebase; design system mobile-first; wizard de onboarding animado até o estado inicial do dashboard vazio; suíte Vitest (unit), ESLint, Typecheck, Build e Playwright (e2e na porta 3100). |
| **Coleta de Dúvidas** | Gerou `checkpoints/etapa-0/DUVIDAS.md` (61 perguntas brutas deduplicadas para **24 perguntas** com alternativas `A/B/C/D`, respondidas pelo humano). | Sem coleta dinâmica (`human-review.md` com texto estático). |
| **Registro de Riscos** | **15 riscos** documentados em `checkpoints/etapa-0/RISCOS.md`. | Registrados apenas como findings técnicos de revisão no SQLite. |
| **Deploy de Preview** | Publicado automaticamente em `https://pulsar-claude--etapa-0-opqcsxol.web.app`. | Apenas execução local. |
| **Intervenções / Resumes** | ~8 paradas com ajustes e `harness resume` (tempo corrido: 19,6h). | ~10 retomadas e correções sucessivas com `yarn harness resume`. |

---

## 2. Reconciliação de Custos e Auditoria das APIs

### 2.1 Como totalizar o custo com segurança (Logs vs. APIs)
* **Fonte da verdade para dinheiro ($):** Painel ou API de faturamento de cada provedor. Quando um processo sofre *timeout*, *crash* ou queda de terminal no meio de uma chamada, os tokens já gerados são cobrados na nuvem, mas o CLI local encerra sem retornar o bloco JSON final de `usage` (gravando `$0.00` no Claude ou `uncertain` no Codex).
* **Fonte da verdade para atribuição (features, papéis, modelos locais vs. remotos):** Logs locais (`ledger.jsonl` + `.result.json` no Claude; `state.sqlite` + `model-call.json` no Codex).

### 2.2 Reconciliação Provedor a Provedor (`harness-claude`)
1. **OpenRouter (`Harness Claude`: US$ 0,593 e 2,94M tokens no painel):**
   * **Consulta direta via API (`GET https://openrouter.ai/api/v1/key` com a chave de `harness-claude/.env`):**
     * `spend_usd`: **US$ 0,592946** (de US$ 20,00 de limite; saldo restante: **US$ 19,41**).
   * **Por que os tokens deram `2.94M` no OpenRouter vs. `536k` no `ledger.jsonl` inicial?**
     * A função `record()` (`src/budget.ts`) grava apenas `tokensIn` e `tokensOut` no `ledger.jsonl`, omitindo `cachedTokens` (`cacheRead`).
     * Somando os transcripts brutos em `harness-claude/.harness/runs/**/*.jsonl`:
       $$\text{486.325 (input)} + \text{44.884 (output)} + \text{2.407.157 (cacheRead)} = \mathbf{2.938.366\text{ tokens (2,94M)}}$$
   * **Por que o custo deu US$ 0,593 no OpenRouter vs. US$ 0,440 no `ledger.jsonl` inicial?**
     * O Pi calculava `usage.cost.total` usando sua tabela interna de preços (que divergia do valor efetivamente tarifado pelo OpenRouter). Após o ajuste no commit `e27d27b`, o adapter `pi.ts` passou a consultar `GET /api/v1/generation?id=<gen-id>` do OpenRouter e reconciliou o `ledger.jsonl` para **US$ 0,60**.
2. **Anthropic (`harness-pulsar`: US$ 13,73 no Console vs. US$ 11,73 no `ledger.jsonl`):**
   * A diferença de exatos **US$ 2,00** decorre das linhas 9 e 10 do `ledger.jsonl` (`2026-10-25T15:37:20Z` e `15:39:13Z`): duas chamadas do `opus` no papel `initializer` que caíram (inclusive por fim de crédito inicial) antes do Claude Code emitir o JSON final. O harness registrou `tokensIn: 0, costUsd: 0`, mas os tokens consumidos antes da queda (~US$ 2,00) foram faturados pela Anthropic:
     $$\text{US\$ 11,73 (logado)} + \text{US\$ 2,00 (2 chamadas opus interrompidas)} = \mathbf{US\$ 13,73}$$
3. **OpenAI (`codex-top`, `codex-mid`, `codex-mini`):**
   * Durante a Etapa 0, o adapter do Codex contava em dobro os tokens em cache (`cached_input_tokens`), inflando o custo em **US$ 3,11**. O problema foi corrigido e 15 entradas de estorno (`role: "correction"`, totalizando `-US$ 3,1145`) foram lançadas no `ledger.jsonl`, fechando o custo líquido de OpenAI em **US$ 3,93**.

### 2.3 Reconciliação no `harness-codex` (Descoberta sobre a chave `.env`)
* **Consulta direta via API (`GET https://openrouter.ai/api/v1/key` com a chave de `harness-codex/.env`):**
  * A chave dedicada configurada em `harness-codex/.env` (`sk-or-v1-bc0...067e`) retornou **`spend_usd: US$ 0,00`**!
  * **Causa raiz identificada:** O `harness-codex` (`tsx src/cli/index.ts`) **não carrega automaticamente o arquivo `.env` da sua pasta**. Como `process.env.OPENROUTER_API_KEY` já existia exportada no `~/.zshrc` da máquina (`sk-or-v1-7c5...1b2d`), todas as 12 chamadas OpenRouter do Codex (US$ 1,52 confirmado + US$ 0,08 incerto) foram cobradas na chave global do `.zshrc` em vez da chave dedicada do `harness-codex/.env`.

---

## 3. Resumo Consolidado: Custos, Tokens e Local vs. Remoto

### 3.1 Comparativo Geral da Etapa 0

| Métrica | `harness-claude` | `harness-codex` (`run-mvnyl7vo-04a32244`) |
| :--- | :--- | :--- |
| **Chamadas totais a modelos** | **83 chamadas** (50 na Etapa 0 + 31 doctor/smoke + 2 quedas) | **18 chamadas** (4 de implementação + 14 de revisão) |
| **Custo Logado pelo Harness** | **US$ 16,26** *(após reconciliação OpenRouter no ledger)* | **US$ 1,52 confirmado** + **US$ 0,08 incerto** = **US$ 1,60** |
| **Custo Real nas APIs** | **~US$ 18,26** *(Anthropic $13,73 + OpenAI $3,93 + OpenRouter $0,59)* | **~US$ 1,60** *(100% via OpenRouter + LM Studio local)* |
| **Tokens de Entrada (sem cache)** | **3.711.565** (~3,71M) | **492.579** (~0,49M) |
| **Tokens de Saída (gerados)** | **362.352** (~0,36M) | **148.002** (~0,15M) |
| **Tokens de Cache Lidos (`cacheRead`)** | **16.642.649** (~16,64M nos transcripts brutos) | **14.706.678** (~14,71M) |
| **Total de Tokens Processados (c/ cache)** | **~20,72 Milhões de tokens** | **~15,35 Milhões de tokens** |
| **Uso de Modelos Remotos** | **79 chamadas** (95,2% — 70 API paga + 9 assinatura) | **12 chamadas** (66,7% — todas OpenRouter) |
| **Uso de Modelos Locais (LM Studio)** | **4 chamadas** (4,8% — 5.707 tokens em smoke/doctor) | **6 chamadas** (33,3% — todas as 6 falharam na Etapa 0) |

---

### 3.2 Detalhamento por Provedor e Worker — `harness-claude`

| Provedor | Worker / Modelo | Modalidade | Chamadas | Tokens (In + Out) | Tokens c/ Cache | Custo Logado | Custo Real API |
| :--- | :--- | :--- | :---: | ---: | ---: | ---: | ---: |
| **Anthropic** | `opus` (`claude-opus-5-5`) | Remoto (API) | 16 | 874.649 | ~10,90M | US$ 10,91 | ~US$ 12,91 |
| **Anthropic** | `sonnet` (`claude-sonnet-5-5`) | Remoto (API) | 11 | 212.512 | ~0,22M | US$ 0,81 | US$ 0,81 |
| **Anthropic** | `haiku` (`claude-haiku-5-5`) | Remoto (API) | 2 | 34.405 | ~0,03M | US$ 0,01 | US$ 0,01 |
| **OpenAI** | `codex-top` (`gpt-5.6-sol`) | Remoto (API) | 7 | 308.076 | ~0,62M | US$ 2,27 | US$ 2,27 |
| **OpenAI** | `codex-mid` (`gpt-5.6-terra`) | Remoto (API) | 12 | 1.917.140 | ~3,95M | US$ 1,66 | US$ 1,66 |
| **OpenAI** | `codex-mini` (`gpt-5.6-luna`) | Remoto (API) | 1 | 54.178 | ~0,05M | US$ 0,005 | US$ 0,005 |
| **OpenRouter** | `kimi` (`moonshotai/kimi-k2.7-code`) | Remoto (API) | 6 | 58.104 | 812.528 | US$ 0,20 | ~US$ 0,27 |
| **OpenRouter** | `deepseek` (`deepseek/deepseek-v4-pro`) | Remoto (API) | 9 | 299.153 | 1.629.462 | US$ 0,18 | ~US$ 0,26 |
| **OpenRouter** | `gemini-flash-or` (`gemini-3.1-flash-lite`) | Remoto (API) | 3 | 174.517 | 496.378 | US$ 0,05 | ~US$ 0,06 |
| **Google Agy** | `gemini-pro` (`gemini-3.8-flash-high`) | Remoto (Assinatura) | 6 | 70.606 | 70.606 | US$ 0,00 | US$ 0,00 |
| **Z.ai** | `glm` (`glm-5.3` via plano Lite) | Remoto (Assinatura) | 6 | 64.870 | 64.870 | US$ 0,002 | US$ 0,002 |
| **LM Studio** | `local-gptoss` (`gpt-oss-20b`) | **Local** | 4 | 5.707 | 5.707 | **US$ 0,00** | **US$ 0,00** |

**Distribuição de Custo por Papel no `harness-claude`:**
* `initializer` (`opus`): **US$ 7,91 logados** (~US$ 9,91 reais) — 49% do custo total foi gasto apenas para decompor a especificação nas features das 8 etapas e gerar o scaffold inicial.
* `implement_hard` (`opus`, `codex-top`, `sonnet`): **US$ 4,90**.
* `review_code` (`codex-mid`, `sonnet`, `haiku`, `deepseek`): **US$ 1,28 líquido** (após estorno de US$ 3,11 do cache do Codex).
* `implement` (`deepseek`, `kimi`, `sonnet`, `glm`): **US$ 0,42**.
* `test_writer` (`sonnet`): **US$ 0,33**.
* `review_ui` (`sonnet`, `gemini-flash-or`): **US$ 0,19**.
* `doctor` + `smoke` + `retro` + `triage`: **US$ 1,07**.

---

### 3.3 Detalhamento por Provedor e Modelo — `harness-codex` (`run-mvnyl7vo-04a32244`)

| Provedor | Alias (`modelId`) | Modalidade | Papéis | Chamadas | Sucesso Técnico | Tokens (In / Out) | Tokens Cache | Custo Confirmado / Incerto |
| :--- | :--- | :--- | :--- | :---: | :---: | ---: | ---: | ---: |
| **OpenRouter** | `qwen-code` (`qwen/qwen3-coder-next`) | Remoto (API) | `implementer` | 1 | **1 / 1 (100%)** | 285.552 / 64.689 | 10.887.072 | **US$ 0,8481** / $0,00 |
| **OpenRouter** | `deepseek-code` (`deepseek/deepseek-v4-pro-0813`) | Remoto (API) | `implementer`, `functionalReviewer` | 4 | 3 / 4 (75%) | 86.767 / 46.368 | 1.217.536 | **US$ 0,5274** / $0,0131 |
| **OpenRouter** | `gemini-mid` (`google/gemini-3.8-flash`) | Remoto (API) | `functionalReviewer` | 3 | 1 / 3 (33%) | 53.597 / 4.119 | 35.255 | **US$ 0,0583** / $0,0618 |
| **OpenRouter** | `glm-cheap` (`z-ai/glm-5.3-flash`) | Remoto (API) | `implementer`, `functionalReviewer` | 2 | 1 / 2 (50%) | 66.648 / 25.593 | 2.542.144 | **US$ 0,0815** / $0,0011 |
| **OpenRouter** | `luna-cheap` (`openai/gpt-6-luna`) | Remoto (API) | `functionalReviewer` | 2 | 1 / 2 (50%) | 15 / 7.226 | 24.671 | **US$ 0,0061** / $0,0021 |
| **LM Studio** | `local-qwen` (`qwen3.5-9b-mlx`) | **Local** | `implementer`, `functionalReviewer` | 3 | **0 / 3 (0%)** | 0 / 0 | 0 | **US$ 0,00** / $0,00 |
| **LM Studio** | `local-review` (`mlx-community/gpt-oss-20b`) | **Local** | `functionalReviewer` | 3 | **0 / 3 (0%)** | 0 / 0 | 0 | **US$ 0,00** / $0,00 |

---

## 4. Melhorias Implementadas Pós-Etapa 0 (commits `2a31e6b`..`efef9b3`)

Ambos os harnesses registraram retrospectivas (`harness-claude/observacoes/etapa-0.md` e `harness-codex/docs/retrospectiva-0-setup.md`) e aplicaram melhorias estruturais antes da Etapa 1:

### No `harness-claude`:
* **Telemetria ao vivo no terminal + `harness watch`:** Imprime 1 linha por chamada com feature, papel, modelo (marcando `(local)`), tentativa, resultado, duração, custo da chamada, gasto da etapa e progresso `features x/y`.
* **Comandos `harness models [--stage N]` e `harness costs`:** Tabela de desempenho por modelo/papel e reconciliação automática do `ledger.jsonl` contra a API do provedor.
* **Custo real do OpenRouter via API de geração:** O `pi.ts` agora consulta `GET /api/v1/generation?id=<gen-id>` para gravar o custo real faturado pelo OpenRouter.
* **Remoção automática de workers sem cota (`QUOTA_RE` / `PAUSED_QUOTA`)** e prompt interativo para elevar teto de orçamento (`budget.yaml`).
* **Autofix (`yarn format && yarn lint --fix`)** antes dos gates e trava compartilhada de portas (`port-lock.sh` + portas 4791/4792).
* **Redução de custo de `implement_hard` e `review_code`:** `sonnet` passou a ser o primeiro da fila em `implement_hard` (antes de `opus`), e o `review_code` agora lê o `diff` focado em vez de abrir dezenas de arquivos.

### No `harness-codex`:
* **Reparo automático de JSON (`repairPrompt` em `pi.ts`)** e suporte à API `openai-responses` para o modelo local `gpt-oss-20b`.
* **Telemetria ao vivo no terminal** e gravação de `model-call.json`, `raw-response.txt`, `execution-error.json` e `session-trace.jsonl` em cada tentativa.
* **Relatório `yarn harness models performance --milestone <id>`:** Gera `.md`, `.json` e `.csv` com chamadas, tokens de entrada/saída, duração média e custo confirmado/incerto por modelo.
* **Recuperação de crash e lease por heartbeat (`run_sessions`):** Não soma o tempo parado entre `resume`s e separa falhas técnicas do Pi (`pi_execution_failed`) das tentativas funcionais da tarefa.
