# Harness Codex

Harness autônomo da trilha Codex no monorepo Pulsar.

Ele opera somente sobre `../pulsar-codex`, utilizando as especificações em `./docs` e as referências visuais em `../design`. As operações Git permanecem no branch atual e são limitadas aos arquivos da trilha Codex.

## Comandos

```bash
# Instalação das dependências
yarn install --frozen-lockfile

# Verificações de ambiente e ferramentas
yarn harness doctor --config harness.config.yaml
yarn harness preflight --config harness.config.yaml
yarn harness models list --config harness.config.yaml
# Smoke real, limitado ao alias escolhido; confere runtime Pi, tool de leitura e contrato JSON
yarn harness models probe --config harness.config.yaml --alias deepseek-code --inference

# Execução do ciclo autônomo
yarn harness run --config harness.config.yaml

# Monitoramento e controle
yarn harness status --config harness.config.yaml --run <runId>
yarn harness diagnostics --config harness.config.yaml --run <runId>
yarn harness reconcile-call --config harness.config.yaml --run <runId> --call <providerCallId> --actual-cost <usd> --note "evidência do provedor"
yarn harness models performance --config harness.config.yaml --run <runId>
yarn harness worklog --config harness.config.yaml --run <runId> [--milestone <id>]
yarn harness dashboard --config harness.config.yaml --run <runId>
yarn harness pause --config harness.config.yaml --run <runId>
yarn harness resume --config harness.config.yaml --run <runId>

# Aprovação humana e relatórios
yarn harness feedback import --config harness.config.yaml --run <runId> --milestone <etapa> --task human-corrections --file ./feedback.md
yarn harness approve --config harness.config.yaml --run <runId> --milestone <milestoneId> --revision <revision>
yarn harness budget --config harness.config.yaml --run <runId>
yarn harness report --config harness.config.yaml --run <runId>
yarn harness hosting snapshot --config harness.config.yaml --run <runId> --milestone <id>
```

Logs, recuperação após crash, limites interativos e checagens Firebase: [Operação e recuperação](docs/OPERACAO_E_RECUPERACAO.md).

## Próxima etapa: `3-insights`

As conclusões, modelos por papel e mudanças aplicadas após `2-registro` estão em [Retrospectiva 2-registro](docs/retrospectiva-2-registro.md). Antes de iniciar `3-insights`, execute os preflights e probes indicados no relatório. `openai-terra` e `gemini-lite` foram adicionados; chamadas pela rota OpenRouter para Terra, Kimi e MiniMax permanecem fora dos pools até passar um probe. Modelos locais ficam desabilitados e Claude não é usado.

Após cada gate humano, o terminal imprime o comando exato para aprovar ou importar correções, o estado, progresso da etapa/projeto, custos, relatório, snapshot e etapa seguinte. O harness não troca de branch: a seleção continua manual.

## Política de branches

O harness nunca cria, troca ou remove branches. O branch corrente é fixado ao iniciar cada etapa e precisa permanecer o mesmo até sua verificação e aprovação. Para usar um branch por etapa: aprove a etapa atual, crie ou selecione manualmente o próximo branch e só então retome a run. Worktrees criados manualmente são reconhecidos e preservados, mas não são gerenciados pelo harness.

Sequência: `0-setup`, `1-base`, `2-registro`, `3-insights`, `4-curadoria`, `5-pwa-push`, `6-ia-generativa`, `7-polimento`.

## Estrutura do Módulo

* `src/orchestrator/`: Controlador principal e máquina de estados determinística.
* `src/executors/`: Executores de tarefas (Pi SDK e Fake determinístico).
* `src/providers/`: Catálogo de modelos, LM Studio local e probes de credenciais.
* `src/verification/`: Verificação de comandos de teste, lint, build e evidência visual Playwright/Axe.
* `src/budget/`: Ledger contábil e controle transacional de reservas em microdólares.
* `src/state/`: Estado transacional em SQLite (`.harness/state.sqlite`) com espelhos por execução em JSON e eventos em JSONL (`.harness/runs/<id>/state.json` e `events.jsonl`).
* `src/dashboard/`: Servidor HTTP do painel de controle local.
* `harness.config.yaml`: Configuração de modelos, limites de custo, timeouts e comandos.
* `Harness_Especificacao_Completa_Codex.md`: Especificação técnica completa de implementação.
