# Operação e recuperação do Harness Codex

## Acompanhar uma execução

- O terminal mostra timestamp, etapa/tarefa, tentativa, modelo, tokens, custo e duração.
- Cada sessão do controlador atualiza `runs/<id>/run-summary.json`; pausas entre sessões não entram no tempo ativo.
- Cada interação grava `model-call.json` junto do `result.json`, `session-trace.jsonl` e demais evidências da tentativa.
- Quando a resposta não puder ser interpretada, `raw-response.txt` preserva o texto inicial e a tentativa de reparo após mascarar segredos conhecidos; o arquivo é local, restrito ao usuário (0600) e limitado a 64 mil caracteres. Ele pode conter trechos de código/contexto: não o compartilhe publicamente sem revisar.
- O painel `yarn harness dashboard --config harness.config.yaml --run <id>` exibe tarefas, eventos e totais por modelo.
- `yarn harness models performance --config harness.config.yaml --run <id> [--milestone 1-base]` gera taxa técnica, tokens, duração média e custos, por modelo e opcionalmente por etapa.
- `yarn harness diagnostics --config harness.config.yaml --run <id>` explica o bloqueio; `yarn harness report ...` gera o resumo e próximo passo.

## Resume e crash

Retome com `yarn harness resume --config harness.config.yaml --run <id>`. Sessões interrompidas são fechadas no último heartbeat registrado, e não no momento do resume, para que o tempo parado não seja contado. Chamadas interrompidas permanecem sujeitas à reconciliação do orçamento; custo sem uso confirmado é marcado como incerto e não é tratado como zero.

Se a revisão independente esgotar as tentativas configuradas e a tarefa ficar em `verifying`, o resume normal não inicia novas chamadas. Após revisar o diagnóstico, autorize a continuação do pool ainda não tentado com `yarn harness resume --config harness.config.yaml --run <id> --retry-review <task-id>`. A autorização é registrada com a lista de modelos elegíveis restantes, preserva as tentativas anteriores, não repete modelos que falharam na sequência atual e continua primeiro pelos revisores principais e depois pelos revisores de emergência. Cada chamada ainda passa pela reserva de orçamento; se o pool se esgotar, o harness bloqueia com os modelos tentados em vez de repeti-los.

Para reconciliar uma cobrança incerta, confira o custo no histórico do provedor e use `yarn harness reconcile-call --config harness.config.yaml --run <id> --call <callId> --actual-cost <usd> --note "fonte/evidência"`. Isso substitui a reserva incerta pelo custo confirmado e grava a auditoria. Se uma implementação foi interrompida sem resultado, acrescente `--retry-task` para marcá-la como falha técnica e deixar a tarefa apta ao próximo `resume`. Informe custo `0` somente quando o histórico confirmar que não houve cobrança. A mesma chamada não pode ser reconciliada duas vezes.

SIGINT, SIGTERM e SIGHUP solicitam pausa controlada. Encerramento forçado do processo não pode ser gravado no instante do crash; o próximo resume registra a sessão anterior como interrompida. Preserve `.harness/runs/<id>` para manter logs, banco e evidências.

## Limites e aprovação

Ao atingir o limite de tentativas, uma execução interativa pergunta se deve autorizar exatamente mais uma tentativa. A decisão fica registrada no SQLite; execuções sem TTY não tentam novamente. A autorização nunca amplia tetos de custo. Se o orçamento não comportar a próxima chamada, nenhuma chamada paga é iniciada; revise `budget-report.md` e altere o orçamento explicitamente antes de retomar.

## Firebase

Antes de etapas que alterem Auth ou Security Rules, execute `yarn harness preflight --config harness.config.yaml`. O preflight verifica `firebase.json`, o arquivo de Rules, configuração de Auth/Firestore Emulator, infraestrutura de testes de Rules e endpoints definidos no ambiente. Configure `FIRESTORE_EMULATOR_HOST` e `FIREBASE_AUTH_EMULATOR_HOST` apenas com hosts locais para testes; endpoints não locais bloqueiam o preflight. Deploy de produção continua desabilitado por padrão.
