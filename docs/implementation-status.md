# Estado da implementação

## Implementado e verificável localmente

- CLI, schemas, SQLite/WAL/migrações, estados, eventos, leases e retomada.
- Executor fake, sessões Pi por tarefa, catálogo, probes, roteamento por capacidade.
- Sessões independentes de revisão, provider calls auditáveis e ciclo automático unload/load/unload no LM Studio.
- Requisitos/DAG, contexto seletivo, verificadores, revisão por hash e gate humano.
- Ledger em micros de USD, reservas, valores incertos e relatórios.
- Screenshots Playwright, painel local protegido, background e fixture.

## Implementado, pendente de acesso real

- Probes pagos de inferência remota e adaptadores adicionais além de LM Studio/OpenRouter.
- Revisão visual independente com um modelo de visão validado.
- Firebase remoto, preview e integrações que exigem projeto/credenciais.

## Limitações conhecidas

- `workspace_process` limita por convenção/cwd, não por sandbox de sistema.
- A decomposição determinística inicial agrupa requisitos em `milestone-001`; o schema suporta vários marcos.
- O parser determinístico exige cabeçalhos `REQ-*`; extração livre por modelo deve ser adicionada como tarefa orçada, nunca como fonte sem validação.
- Limpeza automática por retenção e reconciliação tardia via APIs de billing são extensões futuras.
