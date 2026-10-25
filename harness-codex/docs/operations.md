# Operação e recuperação

Uma run foreground persiste antes e depois de cada tentativa. `SIGINT` encerra o processo; a lease expira e `resume` reconcilia a revisão antes de continuar.

```bash
yarn harness status --config harness.config.yaml --run <runId>
yarn harness pause --config harness.config.yaml --run <runId>
yarn harness resume --config harness.config.yaml --run <runId>
yarn harness stop --config harness.config.yaml --run <runId>
```

Background grava `controller.log` na pasta da run. Fechar o terminal não depende de Zellij. Em macOS, se desejado, o humano pode iniciar manualmente com `caffeinate`; o harness não altera energia global.

Bloqueios ficam no estado/eventos com causa. Corrija configuração ou dependência e use `resume`. Não apague `state.sqlite` para destravar: isso perde auditoria e reservas incertas.

O feedback humano é importado explicitamente e versionado. Editar silenciosamente `human-review.md` não aprova nada.

## Branch por etapa

O harness não executa `git switch`, não cria branches e não remove branches. Ao iniciar uma etapa, registra o branch corrente e bloqueia a continuação se ele mudar antes da aprovação.

Fluxo manual entre etapas:

1. Concluir, verificar e aprovar a etapa no branch atual.
2. Criar ou selecionar manualmente o branch da próxima etapa.
3. Executar `resume`; o novo branch será fixado para essa etapa.

Não é necessário worktree para a execução serial configurada. Worktrees só seriam úteis para trabalho simultâneo em branches diferentes, cenário que este harness não executa automaticamente.
