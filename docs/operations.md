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
