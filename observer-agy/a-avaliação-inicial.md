# Avaliação Comparativa dos Harnesses: Claude vs Codex

Este documento consolida a análise técnica e objetiva entre as especificações e as implementações de harness autônomo multi-modelo desenvolvidas em `Pulsar/claude` e `Pulsar/codex`.

---

## 1. Especificação do Harness

### Claude (`HARNESS_PULSAR.md`)
* **Abordagem:** Pragmática e diretamente alinhada aos requisitos reais do aplicativo Pulsar.
* **Pontos fortes:**
  * Define 13 gates determinísticos (G1 a G13), incluindo integridade de testes protegidos e varredura de sentinelas de privacidade.
  * Estratégia de decomposição via LLM (`initializer`) a partir da spec humana real.
  * Mecanismo de torneio entre modelos para features de alta complexidade/risco (regras de segurança, privacidade).
  * Roteamento adaptativo (Multi-Armed Bandit) com política de exploração e regras de exclusão de mesma família para revisões.
* **Pontos a melhorar:** Depende de configuração manual de credenciais e mapeamento de flags de CLI que podem variar com versões.

### Codex (`Harness_Especificacao_Completa_Codex.md`)
* **Abordagem:** Formalista e orientada a contratos rigorosos, com ênfase em controle transacional (SQLite/WAL) e políticas de isolamento de memória no Mac M5.
* **Pontos fortes:**
  * Tratamento formal de integridade de dados e auditoria em banco relacional.
  * Especificação detalhada de preflight, checklists de ambiente e isolamento de privilégios.
* **Pontos a melhorar:**
  * Amarras contratuais excessivamente rígidas e sintéticas: o parser de requisitos exige cabeçalhos estritos via regex (`^## REQ-\d+ [required]`), tornando-o incompatível com a especificação real do Pulsar sem prévia reescrita manual.

| Modelo | Nota | Justificativa Objetiva |
| :--- | :---: | :--- |
| **Claude** | **9.5** | Especificação completa, viável e orientada ao produto real sem impor contratos sintéticos artificiais. |
| **Codex** | **7.5** | Rigor técnico e arquitetural elevado, mas excessivamente burocrático e dependente de formato sintético de requisitos. |

---

## 2. Código Implementado

### Claude (`Pulsar/claude/harness/src/`)
* **Status:** Implementação completa e executável.
* **Destaques da implementação:**
  * Isolamento real de execução usando Git Worktrees (`git.ts`), garantindo branches limpas por tarefa (`feat/<id>`).
  * 5 adapters de worker implementados (`claude-code`, `codex`, `gemini/agy`, `pi` e `fake`).
  * Suite com os 13 gates determinísticos em `src/gates/`.
  * Multi-armed bandit funcional para seleção de modelos baseado em taxa de sucesso, custo e latência.
  * Suite de testes com 28 testes no Vitest cobrindo 14 fluxos complexos do orquestrador (100% passando).

### Codex (`Pulsar/codex/src/`)
* **Status:** Implementação parcial com módulos desconectados do orquestrador.
* **Destaques e inconsistências:**
  * Marcos de entrega hardcodados como `"milestone-001"` no controlador principal (`controller.ts`).
  * Catálogo multimodelo não reflete a execução real: `createExecutor` suporta apenas `FakeExecutor` ou `PiExecutor`, delegando toda a integração ao SDK do Pi e ignorando CLIs diretas de Claude ou Codex.
  * **Código inoperante (Dead Code):** A verificação visual com Playwright/Axe (`visual.ts`) e o módulo de aprendizado (`lessons.ts`) foram implementados, mas nunca são acionados pelo loop do orquestrador.
  * Sem isolamento por worktree; modificações ocorrem diretamente no workspace de trabalho.

| Modelo | Nota | Justificativa Objetiva |
| :--- | :---: | :--- |
| **Claude** | **9.5** | Código modular, adapters nativos funcionais, isolamento em worktrees e 100% dos testes da suíte passando. |
| **Codex** | **5.5** | Entrega incompleta em relação à própria spec: marcos hardcodados, dependência exclusiva do Pi SDK e módulos-chave inativos no loop. |

---

## 3. Avaliação de Resultados Pós-Ciclo

### Claude
* **Fluxo:**
  1. Execução determinística dos Gates G1 a G13 (build, lint, typecheck, vitest, rules emulator, Playwright e2e, a11y, layout mobile, sentinelas de privacidade).
  2. Proteção de testes de aceite (Gate G7): monitora hashes dos testes protegidos, barrando tentativas de burlar testes via `.skip`, `.only` ou remoção de asserções.
  3. Em caso de falha nos gates, aciona modelo barato (`triage`) para extrair diagnóstico estruturado em JSON antes da próxima tentativa.
  4. Passando nos gates determinísticos, aciona `review_code` (modelo de família diferente da do implementador) exigindo nota $\ge 7$ e zero blockers.
  5. Para tarefas de interface, aciona `review_ui` (modelo multimodal) avaliando screenshots contra a rubrica de design tokens (nota $\ge 7.5$).
* **Solidez da lógica:** Alta. Validações determinísticas e baratas precedem chamadas caras de IA; separação rigorosa de papéis impede autoaprovação.

### Codex
* **Fluxo:**
  1. Após o término da sessão do Pi, o orquestrador executa apenas `yarn test` por tarefa.
  2. Validações críticas de integridade (`typecheck`, `lint`, `build` e `e2e`) não rodam por tarefa; ficam acumuladas para o encerramento do marco.
  3. Não possui gate de proteção de testes: o worker pode modificar ou comentar asserções para obter sucesso no `yarn test`.
  4. Revisão independente (`functionalReviewer`) utiliza prompt de texto genérico solicitando verificação de critérios em modo somente-leitura; aprova se `blockers` for vazio.
  5. A captura visual (`captureVisualEvidence`) não faz parte do fluxo do controlador.
* **Solidez da lógica:** Baixa. Permite acúmulo de erros de tipagem/lint entre tarefas e deixa brechas para autoaprovação por alteração de testes.

| Modelo | Nota | Justificativa Objetiva |
| :--- | :---: | :--- |
| **Claude** | **9.5** | Pipeline em duas fases (gates determinísticos + revisão semântica/visual cruzada) com proteção ativa de testes de aceite. |
| **Codex** | **5.0** | Verificação frágil por tarefa (apenas unit tests), sem proteção contra manipulação de testes e com adiamento de typecheck/build. |

---

## 4. Captura e Persistência de Custos

### Claude
* **Captura:**
  * Captura direta do custo real retornado pelas ferramentas (Claude Code via `total_cost_usd` e Pi/OpenRouter via `usage.cost.total`).
  * Fallback paramétrico para CLIs que reportam apenas tokens (Gemini/agy e Codex CLI): calcula `(tokensIn * p.input + tokensOut * p.output + cached * p.cached) / 1e6` usando `prices.yaml`.
  * Suporte a faturamento por assinatura (ex: GLM via Z.ai): custo marginal registrado como $0.00, mantendo a contagem precisa de tokens e prompts.
* **Persistência:**
  * Registros append-only em `.harness/ledger.jsonl` com granularidade por tarefa, etapa, modelo e papel.
  * Auditoria de eventos em `.harness/events.jsonl` e consolidação de custo acumulado no `.harness/features.json`.
* **Confiabilidade:** Alta, com mecanismos de contingência para precificação offline de tokens.

### Codex
* **Captura:**
  * Delega ao SDK do Pi a leitura de `session.getSessionStats()`.
  * Se o provedor informar o custo, converte para microdólares inteiros (`BigInt`).
  * **Falha identificada:** Se a API do modelo retornar apenas o volume de tokens sem o valor financeiro consolidado (comum em provedores OpenAI diretos ou endpoints customizados), o código atribui `0n` ao custo final. A tabela de preços existente na configuração é utilizada unicamente para a pré-reserva (estimativa), e não para calcular o débito real a partir dos tokens.
* **Persistência:**
  * Banco de dados relacional SQLite em `.harness/state.sqlite` (`provider_calls`, `cost_reservations`, `ledger_entries`) utilizando inteiros para evitar imprecisões de ponto flutuante.
  * Relatórios periódicos exportados em `.harness/runs/<runId>/budget-report.md`.
* **Confiabilidade:** Média-baixa. Arquitetura de persistência sólida (SQLite ACID), porém vulnerável a subnotificação de custos em chamadas que não retornam o valor em dólares mastigado.

| Modelo | Nota | Justificativa Objetiva |
| :--- | :---: | :--- |
| **Claude** | **9.0** | Captura híbrida robusta (lê custo da API ou calcula a partir dos tokens via `prices.yaml`), gravada em ledger append-only. |
| **Codex** | **6.0** | Boa modelagem transacional em SQLite, mas com falha lógica que zera custos reais se o provedor retornar apenas tokens. |

---

## 5. Resumo Consolidado

| Critério Avaliado | Claude | Codex |
| :--- | :---: | :---: |
| 1. Especificação do Harness | **9.5** | **7.5** |
| 2. Código Implementado | **9.5** | **5.5** |
| 3. Avaliação de Resultados Pós-Ciclo | **9.5** | **5.0** |
| 4. Captura e Persistência de Custos | **9.0** | **6.0** |
| **Média Final** | **9.38** | **6.00** |
