# Relatório Comparativo da Etapa 2 (`2-registro`): Balanço Geral, Custos, Tokens, Modelos e Plano de Unificação

Este documento consolida a análise do **Observador** sobre a **Etapa 2 (`2-registro` — CRUD de Indicadores, Preenchimento Rápido Diário, Histórico, Modo Privado e Convite de Conta)** nos dois harnesses (`harness-claude` e `harness-codex`), avaliando se o Claude evoluiu, o que surpreendeu, o que foi frustrante, o que nunca mais deve se repetir e o desenho para **unificar os dois harnesses no estilo enxuto do Codex usando apenas JSON/JSONL (sem SQLite)**.

---

## 1. Visão Geral Comparativa — Etapa 2 (`2-registro`)

Na Etapa 2, ambos os harnesses concluíram e aprovaram o escopo funcional de Indicadores e Registros Diários. O `harness-claude` reduziu seu custo pela metade em relação à Etapa 1 (de US$ 32,94 para **US$ 15,10**), mas o **`harness-codex` manteve sua consistência enxuta, fechando a Etapa 2 por US$ 2,65 confirmados (~5,7x mais barato que o Claude)**:

| Métrica | `harness-claude` (`pulsar-claude/`) | `harness-codex` (`pulsar-codex/`) |
| :--- | :--- | :--- |
| **Escopo entregue na Etapa 2** | **10 de 12 features entregues** (`F-1.06`, `F-2.01`, `F-2.03`, `F-2.05`, `F-2.06`, `F-2.08`, `F-2.09`, `F-2.10`, `F-2.11` e `F-2.fix-3`; `F-2.fix-1` e `fix-2` bloqueadas). | **2 macro-tarefas de produto + 1 tarefa de correção humana aprovadas** (`task-005`: CRUD/regras de indicadores; `task-006`: registro diário, histórico e modo privado). |
| **Testes E2E / Gates Finais** | `F-2.08` e `F-2.10` integradas manualmente com pendências menores; Nota de UI: **7.7 (aprovado)**. | **30/30 testes E2E mobile passando** após ajuste de condição de corrida. |
| **Preview Publicado** | Falhou pela 2ª vez seguida (`firebase: command not found` no `baseEnv`). | Publicado: [`pulsar-2-registro-d83a9ead72.web.app`](https://pulsar-2-registro-d83a9ead72.web.app). |
| **Chamadas a Modelos na Etapa 2** | **95 chamadas** (100% remotas). | **40 chamadas** (23 com resposta + 17 falhas imediatas de catálogo/rota no Pi). |
| **Custo da Etapa 2 (`2-registro`)** | **US$ 15,10** *(teto subiu 9 $\rightarrow$ 12 $\rightarrow$ 15 $\rightarrow$ 15,50)* | **US$ 2,65 confirmado** + **US$ 0,34 incerto** = **US$ 2,98** *(teto era US$ 9)* |
| **Custo Acumulado (Etapas 0 + 1 + 2)** | **US$ 64,56** *(de US$ 68,00 de teto do projeto — restam só US$ 3,44!)* | **US$ 6,71 confirmado** + **US$ 0,47 incerto** = **US$ 7,18** *(de US$ 60,00 de teto)* |
| **Tokens de Entrada (s/ cache)** | **5.145.841** (~5,15M) | **1.694.129** (~1,69M) |
| **Tokens de Saída (gerados)** | **783.142** (~0,78M) | **316.765** (~0,32M) |
| **Tokens de Cache (`cacheRead`)** | Não registrado no `ledger.jsonl` | **29.087.827** (~29,09M) |
| **Tempo de Execução** | ~4h de execução ativa. | ~2h30m de execução ativa. |

---

## 2. O Claude Melhorou ou Ficou na Mesma?

**Melhorou no custo unitário por chamada (cortou o gasto pela metade), mas continuou preso nos mesmos problemas estruturais de arquitetura:**

1. **Onde o Claude melhorou:**
   * Tirar o `opus` da implementação e colocar `codex-mid` (`gpt-6.1-terra`), `minimax` e `gemini-lite` derrubou o custo da etapa de **US$ 32,94 para US$ 15,10** e as chamadas de **210 para 95**.
   * A triagem com `gemini-lite` funcionou com **100% de acerto (22/22) custando US$ 0,08 no total**.
   * Remover o projeto `desktop` do Playwright e testar apenas mobile (375×812) deixou os gates mais rápidos.
2. **Onde o Claude ficou na mesma (e continuou dando dor de cabeça):**
   * **Dependência de "Agente Babá" em paralelo:** Foi preciso editar `features.json` na mão 3 vezes para desbloquear features e rodar um script manual por fora para integrar `F-2.08` e `F-2.10`.
   * **A arquitetura de `test_writer` separado + testes protegidos (G7) continuou sabotando a execução:**
     * Na `F-2.01`, o `test_writer` gerou um teste com erro de lint e o harness **protegeu o arquivo com erro de lint**. Como o implementador é proibido pelo G7 de tocar no teste protegido, era **fisicamente impossível** passar no Gate G2 (lint) — queimando tentativas à toa!
     * Na `F-2.08`, o `test_writer` escreveu um teste offline com *race condition* (desligava a rede antes de o componente montar), queimando **5 tentativas e US$ 3,08** sem que o bug fosse do produto.
   * **Estouro do Orçamento Global:** Com US$ 64,56 gastos em apenas 3 etapas (0, 1 e 2), o `harness-claude` já consumiu **95% do orçamento previsto para as 8 etapas (US$ 68)**, enquanto o `harness-codex` consumiu apenas **11% (US$ 6,71 de US$ 60)**!

---

## 3. O Que Ficou Além do Esperado vs. O Que Foi Frustrante

### 🌟 O que ficou além do esperado (Destaques Positivos)
1. **`z-ai/glm-5.3` (`glm-5`) carregando a Etapa 2 do Codex nas costas:**
   * Fez **6 chamadas no Codex (5 entregas prontas + 1 revisão certeira pedindo mudanças)**, com **zero falhas técnicas**, resolvendo tanto implementação quanto revisão por **US$ 1,80**.
2. **`codex-mid` (`gpt-6.1-terra` via Codex CLI) escrevendo testes e regras no Claude:**
   * Fez **9/9 (100%) no `test_writer`** em ~1 minuto por **US$ 0,12/chamada**, aprovou `F-2.06` (regras complexas de registros imutáveis no Firestore) de primeira por US$ 0,56 e resolveu o `F-2.fix-3` por US$ 0,28.
3. **`minimax/minimax-m3.1-flash` no Claude:**
   * Entregou 3 features completas (`F-1.06` sentinelas de privacidade, `F-2.09` histórico/exclusão e `F-2.11` banner de convite) gastando apenas **US$ 0,50 somados**!
4. **`gemini-lite` (`gemini-3.1-flash-lite`) na Triagem:**
   * **22/22 chamadas perfeitas** em 5 segundos cada, custando **US$ 0,004 por diagnóstico**.

### 😤 O que foi frustrante
1. **Ter que operar um agente paralelo como "mecânico do harness" durante a corrida:**
   * Em vez de largar o harness rodando e só voltar para revisar o produto, foi necessário intervir nos dois para destravar estados, reverter bloqueios e aceitar features presas em testes flaky.
2. **17 chamadas "fantasmas" no Codex por falta de probe prévio:**
   * No Codex, o `gpt-6.1-terra` via OpenRouter (`terra-review`, 9 falhas), o `kimi-k3.1-pro` (6 falhas) e o `minimax-flash` (2 falhas) falharam imediatamente sem devolver texto, mas o orquestrador continuou sorteando esses aliases ao longo da etapa e acumulando US$ 0,28 em reservas incertas.
3. **Ergonomia ruim para dar feedback humano no Codex:**
   * Ter que digitar `yarn harness feedback import --config .../harness.config.yaml --run run-mvnyl7vo-04a32244 --milestone 2-registro --task human-corrections --file .../human-review.md` toda vez que quiser pedir um ajuste na tela.
4. **Conflito de revisão por ninharias (`minor` issues) no Claude:**
   * A `F-2.10` foi reprovada **4 vezes seguidas** pelos revisores por detalhes cosméticos (`minor`), queimando 5 tentativas e US$ 2,00.

---

## 4. O Que NUNCA MAIS Deveria Acontecer (Regras de Ouro)

1. **Nunca proteger um teste antes de validar que ele passa no Lint/Typecheck e não conflita com a branch:**
   * Proteger um arquivo de teste que tem erro de ESLint/Prettier cria um *deadlock* insolúvel (o Gate G2 reprova pelo lint e o Gate G7 reprova se o modelo corrigir o lint).
2. **Nunca deixar um mesmo modelo repetir 5 vezes a mesma falha idêntica:**
   * Na `F-2.fix-1` e `fix-2`, a trava "sem progresso" do Claude exigia *dois modelos diferentes* falhando; como a fila só tinha o `codex-mid`, ele bateu a cabeça **10 vezes no mesmo timeout de 5s do Firebase Auth** (que levava 8s para fechar o popup). Se a assinatura do erro se repetir na 2ª tentativa (mesmo com o mesmo modelo), deve parar na hora.
3. **Nunca bloquear comandos de fechamento/aprovação (`harness approve`) por teto de orçamento:**
   * Impedir o humano de aprovar a etapa já concluída porque o gasto bateu US$ 15,10 de US$ 15,00 não faz sentido — chamadas administrativas finais devem ser isentas de bloqueio de teto.
4. **Nunca manter na rotação da run um modelo que devolveu resposta vazia / erro de catálogo (Circuit Breaker):**
   * Se um alias falhar com resposta vazia ou erro de transporte 2 vezes na run, ele deve ser automaticamente desabilitado pelo resto da sessão.
5. **Nunca deixar um worktree nascer sem `node_modules` ou fora do `HEAD` atual da branch:**
   * Na `F-2.01` o worktree rodou sem dependências instaladas, e na `F-2.10` nasceu de um commit antigo fazendo o diff parecer que estava apagando a `F-2.03`.

---

## 5. Muitas Tarefas vs. Poucas Tarefas: A Prova Definitiva da Etapa 2

A Etapa 2 deu a prova cabal de **por que ter poucas tarefas coesas (estilo Codex: 2 tarefas) é superior a ter muitas micro-features (estilo Claude: 12 features)**:

* **No Claude (12 features):**
  * A feature **`F-2.08` (Preenchimento rápido)** criou um teste E2E que clicava no link *"Registrar agora"* do Dashboard.
  * Pouco depois, a feature **`F-2.10` (Dashboard vazio com sugestões)** remodelou o Dashboard e removeu/alterou o link *"Registrar agora"* em um dos estados.
  * Resultado: **uma feature quebrou o teste da outra**, gerando 3 rodadas de `F-2.fix-1/2/3`, 12 tentativas extras e intervenção manual!
* **No Codex (2 tarefas: `task-005` Indicadores + `task-006` Registro e Dashboard):**
  * Como o fluxo de registro e sua integração na tela estavam juntos na mesma tarefa coesa (`task-006`), o modelo enxergou as duas pontas ao mesmo tempo, sem criar conflito consigo mesmo e gastando **US$ 2,65 contra US$ 15,10**.

---

## 6. Tabelas de Custos e Tokens da Etapa 2 (`2-registro`)

### 6.1 `harness-claude` — Consumo por Modelo e Papel (Etapa 2)

| Provedor | Worker (`Modelo`) | Chamadas | Tokens Entrada | Tokens Saída | Total Tokens (s/ cache) | Custo (USD) | % do Custo |
| :--- | :--- | :---: | ---: | ---: | ---: | ---: | ---: |
| **Anthropic** | `haiku` (`claude-haiku-5-5`) | 21 | 639.071 | 65.334 | 704.405 | **US$ 5,4738** | 36,3% |
| **OpenAI** | `codex-mid` (`gpt-6.1-terra` via CLI) | 35 | 2.375.790 | 179.841 | 2.555.631 | **US$ 4,4634** | 29,6% |
| **OpenRouter** | `glm-or` (`z-ai/glm-5.3`) | 2 | 304.379 | 118.341 | 422.720 | **US$ 2,3334** | 15,5% |
| **OpenRouter** | `kimi-pro` (`kimi-k3.1-pro`) | 1 | 127.374 | 15.276 | 142.650 | **US$ 0,8508** | 5,6% |
| **Anthropic** | `sonnet` (`claude-sonnet-5-5`) | 3 | 112.025 | 10.248 | 122.273 | **US$ 0,8326** | 5,5% |
| **OpenRouter** | `minimax` (`minimax-m3.1-flash`) | 5 | 462.083 | 212.673 | 674.756 | **US$ 0,5043** | 3,3% |
| **OpenRouter** | `deepseek-flash` (`v4.1-flash-1017`) | 3 | 758.952 | 169.638 | 928.590 | **US$ 0,3345** | 2,2% |
| **Google/OR** | `gemini-argon` (`gemini-4-argon`) | 1 | 59.797 | 785 | 60.582 | **US$ 0,1496** | 1,0% |
| **Google/OR** | `gemini-lite` (`gemini-3.1-flash-lite`) | 22 | 236.450 | 5.802 | 242.252 | **US$ 0,0789** | 0,5% |
| **Google/OR** | `gemini` (`gemini-3.8-flash`) | 1 | 53.282 | 3.492 | 56.774 | **US$ 0,0746** | 0,5% |
| **OpenRouter** | `glm-flash` (`glm-5.3-flash`) | 1 | 16.638 | 1.712 | 18.350 | **US$ 0,0014** | 0,01% |
| **Total Etapa 2** | **11 modelos (0 locais)** | **95** | **5.145.841** | **783.142** | **5.928.983** | **US$ 15,0973** | **100%** |

**Por Papel no `harness-claude` (Etapa 2):**
* `implement_hard`: 26 chamadas $\rightarrow$ **US$ 4,16**
* `test_writer`: 11 chamadas $\rightarrow$ **US$ 3,40** (sendo US$ 2,33 em apenas 2 chamadas do `glm-or`!)
* `implement`: 10 chamadas $\rightarrow$ **US$ 2,96**
* `review_code`: 14 chamadas $\rightarrow$ **US$ 2,71**
* `review_ui`: 8 chamadas $\rightarrow$ **US$ 1,31**
* `retro` (US$ 0,37) + `triage` (US$ 0,19) + `approval_parser` (US$ 0,001) $\rightarrow$ **US$ 0,56**

---

### 6.2 `harness-codex` — Consumo por Modelo (Etapa 2)

| Provedor | Modelo (`alias`) | Chamadas (Úteis/Total) | Tokens In / Out | Tokens Cache (`cacheRead`) | Custo Confirmado | Custo Incerto |
| :--- | :--- | :---: | ---: | ---: | ---: | ---: |
| **OpenRouter** | `z-ai/glm-5.3` (`glm-5`) | **6 / 6 (100%)** | 822.540 / 178.216 | 19.072.960 | **US$ 1,8022** | US$ 0,0000 |
| **OpenRouter** | `google/gemini-3.8-flash` (`gemini-mid`) | **6 / 7 (86%)** | 410.382 / 34.229 | 519.692 | **US$ 0,5226** | US$ 0,0360 |
| **OpenRouter** | `qwen/qwen3-coder-next` (`qwen-code`) | 1 / 2 (50%) | 112.897 / 5.604 | 1.574.336 | **US$ 0,1282** | US$ 0,0117 |
| **OpenRouter** | `deepseek/deepseek-v4.1-flash-1017` | 2 / 4 (50%) | 270.275 / 85.205 | 7.822.208 | **US$ 0,1150** | US$ 0,0100 |
| **OpenRouter** | `google/gemini-4-argon` (`gemini-argon`) | **1 / 1 (100%)** | 20.327 / 2.034 | 45.723 | **US$ 0,0656** | US$ 0,0000 |
| **OpenRouter** | `z-ai/glm-5.3-flash` (`glm-cheap`) | **1 / 1 (100%)** | 37.054 / 10.289 | 52.908 | **US$ 0,0123** | US$ 0,0000 |
| **OpenRouter** | `openai/gpt-6.1-terra` (`terra-review`) | **0 / 9 (0%)** | 0 / 0 | 0 | **US$ 0,0000** | US$ 0,0930 |
| **OpenRouter** | `moonshotai/kimi-k3.1-pro` (`kimi-pro`) | **0 / 6 (0%)** | 0 / 0 | 0 | **US$ 0,0000** | US$ 0,1759 |
| **OpenRouter** | `minimax/minimax-m3.1-flash` | **0 / 2 (0%)** | 0 / 0 | 0 | **US$ 0,0000** | US$ 0,0100 |
| **Total Etapa 2** | **9 modelos (0 locais)** | **17 / 38** | **1.694.129 / 316.765** | **29.087.827** | **US$ 2,6469** | **US$ 0,3365** |

---

## 7. Plano de Unificação: Estilo Codex Enxuto + 100% JSON/JSONL (Sem SQLite)

Após 3 etapas completas (`0-setup`, `1-base` e `2-registro`), os números não deixam dúvida: **o modelo operacional do Codex é 9x mais econômico no acumulado (US$ 7,18 vs. US$ 64,56)** porque trabalha com **2 a 3 tarefas coesas por etapa**, sem `test_writer` separado e com gates pesados apenas no fechamento do marco.

Por outro lado, o `harness-codex` atual tem **7.134 linhas de código** porque carrega uma camada pesada de **SQLite (17 tabelas, migrações, leases, reservas em `BigInt`, joins)** e comandos CLI verbosos.

### Como converter e simplificar o Codex para JSON/JSONL puro (reduzindo ~2.500 linhas de código):

1. **Substituir `src/state/store.ts` + `migrations.ts` + `budget/ledger.ts` (~1.400 linhas de SQLite) por 4 arquivos JSON/JSONL versionados no Git:**
   * **`.harness/plan.json` (Imutável após o `plan`):** Lista os `milestones` (`0-setup`..`7-polimento`) e as `tasks` (`task-001`..`task-014`) com seus requisitos e critérios.
   * **`.harness/state.json` (Escrita atômica `.tmp` + `rename`, ~50 linhas):** Guarda apenas o estado vivo da execução:
     * `runId`, `state` (`running`, `awaiting_human`, `blocked`, `paused`), `currentMilestone`, `revision`
     * `stageTimes: { "2-registro": { startedAt, finishedAt, activeMs } }`
     * `tasks: { "task-005": { state: "passed", attempts: 1, revision: "..." } }`
     * `disabledModels: []` (Circuit Breaker automático da sessão)
   * **`.harness/calls.jsonl` (Append-only, 1 linha por chamada de modelo):**
     * Substitui de uma só vez as tabelas `attempts`, `sessions`, `provider_calls`, `cost_reservations`, `ledger_entries` e `routing_observations`!
     * Cada linha tem: `{ ts, milestoneId, taskId, attempt, role, alias, provider, modelId, modality, status, durationMs, tokensIn, tokensOut, tokensCached, costUsd, uncertainUsd, summary, changedFiles }`.
     * Os relatórios `budget-report.md`, `model-performance.md` e `work-attribution.md` passam a ser gerados fazendo um simples `.filter()` e `.reduce()` em memória sobre o `calls.jsonl` (zero SQL!).
   * **`.harness/events.jsonl` (Append-only):** Eventos de controle, gates e aceites humanos.

2. **Simplificar drasticamente os Comandos e o Feedback Humano (inspirado no Claude):**
   * Eliminar a necessidade de passar `--config harness.config.yaml --run <runId> --milestone <id> --revision <hash>` em todo comando!
   * Como só existe 1 execução ativa no projeto, o CLI assume `harness.config.yaml` por padrão e lê a etapa/revisão atual direto do `.harness/state.json`:
     * `yarn harness run` / `yarn harness resume` / `yarn harness status` / `yarn harness dashboard`
     * **Feedback humano direto na raiz:** Ao pausar no fim da etapa, o harness gera **`feedback.md`** na raiz do `harness-codex` com:
       ```markdown
       Status: pendente   # mude para: aprovado  OU  ajustes

       ## Ajustes solicitados
       - (escreva aqui se quiser pedir correções nesta etapa)
       ```
     * E um único comando curto: **`yarn harness approve`** (se `Status: aprovado`, fecha a etapa; se `Status: ajustes`, cria a task `human-corrections`, executa, roda os gates e volta para revisão).

3. **Trazer as 3 melhores peças leves do Claude para dentro do Codex:**
   * **Adapters de CLI (`codex` / `claude`) ao lado do `PiExecutor`:** Permite que o Codex chame `gpt-6.1-terra` direto via Codex CLI ou API direta sem sofrer com falhas de rota vazia do Pi/OpenRouter.
   * **Formatador JSON barato (`gemini-lite`) como fallback de parse:** Se o modelo trabalhar por 10 minutos e errar o JSON final, passa o texto para o `gemini-lite` (US$ 0,002) formatar em JSON válido, salvando 100% do trabalho da tentativa.
   * **Gates de Mobile Layout (44px + sem overflow em 375/390px) e Revisão de UI com escopo do diff** no fechamento da etapa.
