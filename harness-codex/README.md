# Harness Codex

Harness autônomo baseado na especificação Codex para desenvolver, testar e validar o Pulsar.

Ele opera sobre o workspace da aplicação em `../pulsar-codex`, utilizando as especificações em `../docs` e as referências de design em `../design`.

## Comandos

```bash
# Instalação das dependências
yarn install --frozen-lockfile

# Verificações de ambiente e ferramentas
yarn harness doctor
yarn harness preflight --config harness.config.yaml

# Execução do ciclo autônomo
yarn harness run --config harness.config.yaml

# Monitoramento e controle
yarn harness status --run <runId>
yarn harness dashboard --run <runId>
yarn harness pause --run <runId>
yarn harness resume --run <runId>

# Aprovação humana e relatórios
yarn harness feedback import --run <runId> --file ./human-feedback.md
yarn harness approve --run <runId> --milestone <milestoneId> --revision <revision>
yarn harness budget --run <runId>
yarn harness report --run <runId>
```

## Estrutura do Módulo

* `src/orchestrator/`: Controlador principal e máquina de estados determinística.
* `src/executors/`: Executores de tarefas (Pi SDK e Fake determinístico).
* `src/providers/`: Catálogo de modelos, LM Studio local e probes de credenciais.
* `src/verification/`: Verificação de comandos de teste, lint, build e evidência visual Playwright/Axe.
* `src/budget/`: Ledger contábil e controle transacional de reservas em microdólares.
* `src/state/`: Persistência de auditoria e eventos em SQLite (`.harness/state.sqlite`).
* `src/dashboard/`: Servidor HTTP do painel de controle local.
* `harness.config.yaml`: Configuração de modelos, limites de custo, timeouts e comandos.
* `Harness_Especificacao_Completa_Codex.md`: Especificação técnica completa de implementação.
