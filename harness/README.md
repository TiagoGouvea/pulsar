# Harness Pulsar

Harness autônomo e multi-modelo que **constrói o app Pulsar** feature por feature, com gates determinísticos, avaliador independente de outra família de modelo, checkpoints humanos por etapa, aprendizado e orçamento rígido. Spec completa: [`../HARNESS_PULSAR.md`](../HARNESS_PULSAR.md).

## Duas pastas

- **`harness-claude/`** (esta): a fábrica: código do harness, `harness.config.yaml`, `budget.yaml`, `.env`/`secrets/`, estado em `.harness/` e `checkpoints/`.
- **`../pulsar-claude/`** (`project.repo`): o projeto, um repo git próprio com `docs/` (spec), `design/`, `DECISOES.md` e `app/`. Worktrees, branches `stage/N`/`feat/*`, merges e tags acontecem nele.

## Fluxo do humano

```
doctor → smoke → start → (checkpoint etapa N) → testar preview → APROVACAO.md/DUVIDAS.md → approve → … → DONE
```

```bash
cd harness && npm install            # uma vez
cd ..
./harness/bin/harness doctor         # lista o que falta configurar (sai ≠ 0 se algo crítico falhar)
./harness/bin/harness smoke          # microtarefa real com cada worker habilitado → prior do roteador
caffeinate -dimsu ./harness/bin/harness start
```

Ao fim de cada etapa o processo **termina** em `AWAITING_APPROVAL` e notifica o webhook. Então:

1. Abra `checkpoints/etapa-N/RELATORIO.md` (URL do preview) e siga `COMO-TESTAR.md`.
2. Responda as linhas `Resposta:` em `DUVIDAS.md` (as não respondidas mantêm o default escolhido).
3. Em `APROVACAO.md`, escreva `Status: aprovado` ou `Status: ajustes` com a lista de ajustes.
4. `./harness/bin/harness approve` (mostra o resumo e pede confirmação y/n).
   - Ajustes viram features `F-N.adj-XX` na mesma etapa e o harness continua.
   - Aprovado sem ajustes: `stage/N` é mesclado em `main`, tag `etapa-N-aprovada`, segue para a etapa N+1.

| Comando | Faz |
|---|---|
| `doctor [--no-auth] [--no-emulators]` | binários, `.env`, `<preencher>`, auth por provedor, Firebase, LM Studio, insumos, git, orçamento, disco |
| `smoke [workerId…]` | cria `hello.ts` + teste com cada worker; mede tempo/custo/sucesso |
| `start` / `resume` | INIT + loop / continua do estado atual (também depois de crash ou pausa) |
| `status` | fase, etapa, features por status, custo, próximo passo |
| `approve` | processa o checkpoint (ou aceita uma mudança de spec) |
| `pause` | pausa limpa após as tarefas em andamento |
| `report` | gasto por etapa, worker, papel e provedor; custo médio por feature aprovada |
| `apply-proposal <id>` | aplica `.harness/proposals/<id>.diff` (melhorias do post-mortem) |

## Antes do primeiro `start` (checklist)

- [ ] Em `../pulsar-claude/`: `docs/` com a spec e a arquitetura finais (`project.specFiles` em `harness.config.yaml` mapeia `spec.md`/`arquitetura.md` para os arquivos atuais)
- [ ] Em `../pulsar-claude/`: `design/screens/*.png` (≥ 3 mockups), `design/tokens.json` e `DECISOES.md` (partir de `DECISOES.template.md`)
- [ ] `.env` a partir de `.env.example`: uma chave por provedor, dedicada ao harness; service account em `secrets/` (fora do git)
- [ ] IDs `<preencher>` em `harness.config.yaml` (ou `enabled: false` no worker) e preços em `prices.yaml`
- [ ] Limites duros nos consoles (OpenRouter por chave, Anthropic/OpenAI mensal, alertas GCP)
- [ ] `yarn`, `java`, `firebase-tools`, `gemini` instalados; `npx playwright install chromium`
- [ ] LM Studio com os modelos locais (ou desabilite `local-*`)
- [ ] Repo do projeto com remote; trabalhar com o checkout em `main` (as etapas aprovadas são mescladas nele)
- [ ] `doctor` verde e `smoke` revisado

## Como funciona

- **Estado em arquivos** (`.harness/`): `state.json` (máquina de estados), `features.json`, `events.jsonl`, `ledger.jsonl`, `routing-stats.json`, `protected.json`, `inbox/`, `lessons/`, `runs/<taskId>/` (prompt, transcript, gate report, veredito). Escrita atômica (tmp + rename).
- **Git** (no repo do projeto): cada feature roda em `.worktrees/<id>` na branch `feat/<id>` criada de `stage/N`; aprovada, é mesclada (`--no-ff`) em `stage/N` via `.worktrees/stage-N`. Commits do harness usam a identidade `pulsar-harness`.
- **Ciclo por feature**: testes de aceite (test_writer, depois protegidos por hash) → implementação (router escolhe o worker; `hard`/tags críticas e após 2 falhas → `implement_hard`; torneio nas tags críticas) → gates G1–G13 → triage em caso de falha → avaliador de código de outra família → avaliador visual (tag `ui`) → merge. Após 5 tentativas: `blocked` + DUVIDAS/RISCOS.
- **Gates**: comandos do app em `harness.config.yaml > gates` (yarn); embutidos: G7 (testes protegidos), G8 (sentinelas de privacidade), G9 (axe), G10 (overflow/alvos 44px), G12 (Lighthouse), G13 (segredos no diff). Os gates de navegador sobem `browser.serveCmd` e carregam o Playwright do próprio app. Rodam serializados (emuladores e portas compartilhados).
- **Roteamento**: bandit (sucesso suavizado ÷ custo ÷ duração) com `explorationRate`; respeita família, visão, disponibilidade (LM Studio), concorrência, exclusividade dos locais e `prefer_cheap` acima de 80% do orçamento.
- **Orçamento**: estimativa antes de cada chamada (média histórica worker×papel); estouro do teto da feature troca de worker e, sem alternativa, bloqueia a feature; estouro de etapa/execução/provedor pausa em `PAUSED_BUDGET` com `checkpoints/etapa-N-parcial/`.
- **Aprendizado**: triage cria lições com evidência (`evt-N`); retro a cada N features e no fim da etapa; lições injetadas por papel/tag (máx. 10); aposentadas (≥ 8 hits, < 30%) ou promovidas para `app/AGENTS.md` (≥ 5 hits, ≥ 70%). O post-mortem só **propõe** mudanças em `.harness/proposals/`.
- **Mudança de spec/design**: hash diferente → `PAUSED_SPEC_CHANGE` + `checkpoints/mudanca-spec.md`; `approve` aceita.
- **Segurança**: workers recebem só as variáveis injetadas (nunca o `.env` inteiro); Claude roda com `--permission-mode dontAsk` e allowlist; Codex com `-s workspace-write`. Recomendado: usuário dedicado do macOS ou devcontainer.

## Adapters (versões verificadas)

| CLI | Versão | Observação |
|---|---|---|
| `claude` | 2.1.310 | `-p --output-format json`; GLM via `ANTHROPIC_BASE_URL` da Z.ai |
| `codex` | 0.163.0 | `exec --json -s workspace-write` |
| `pi` | 1.2.0 | `-p --mode json`; OpenRouter (`openrouter/…`) e LM Studio (`lmstudio/…`, provider em `~/.pi/agent/models.json`) |
| `gemini` | não instalado | flags da documentação oficial; confira com `gemini --help` e ajuste `src/adapters/gemini.ts` |

## Desenvolvimento do harness

```bash
cd harness
npm test          # cenários da seção 16 com o adapter fake (sem custo)
npm run typecheck
```

Estrutura: `src/cli.ts` (comandos), `orchestrator.ts` (máquina de estados e ciclos), `invoke.ts` (única porta de chamada a workers: roteamento, orçamento, ledger, JSON), `router.ts`, `budget.ts`, `learning.ts`, `evaluator.ts`, `checkpoint.ts`, `gates/`, `adapters/`, `prompts/`, `rubrics/`, `test/` (`fixture-app/` valida os gates).
