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

Alterações operacionais em timeout, orçamento, modelos e roteamento podem ser aplicadas entre retomadas. Mudanças nas especificações, etapas, workspace, perfil do projeto ou limite de tentativas por tarefa exigem um novo planejamento. O arquivo de configuração completo continua registrado para auditoria.

O índice de sucesso técnico por modelo fica em `model-performance.md`, `.json` e `.csv` dentro da pasta da run. Para atualizá-lo manualmente:

```bash
yarn harness models performance --config harness.config.yaml --run <runId>
```

O feedback humano é importado explicitamente e versionado. Editar silenciosamente `human-review.md` não aprova nada.

## Branch por etapa

O harness não executa `git switch`, não cria branches e não remove branches. Ao iniciar uma etapa, registra o branch corrente e bloqueia a continuação se ele mudar antes da aprovação.

Fluxo manual entre etapas:

1. Concluir, verificar e aprovar a etapa no branch atual.
2. Criar ou selecionar manualmente o branch da próxima etapa.
3. Executar `resume`; o novo branch será fixado para essa etapa.

Ordem aprovada dos branches:

1. `0-setup`
2. `1-base`
3. `2-registro`
4. `3-insights`
5. `4-curadoria`
6. `5-pwa-push`
7. `6-ia-generativa`
8. `7-polimento`

Não é necessário worktree para a execução serial configurada. Um worktree criado manualmente pode ser mantido: o doctor o reconhece pelo `git-common-dir`, registra seu branch corrente e nunca troca branches. O harness não cria, remove nem reorganiza worktrees automaticamente.
