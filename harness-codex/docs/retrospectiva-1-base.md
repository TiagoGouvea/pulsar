# Retrospectiva — etapa 1-base

## Resultado

- Etapa aprovada pelo usuário; branch `1-base` preservado.
- Snapshot permanente: [pulsar-1-base-58c9a8a203.web.app](https://pulsar-1-base-58c9a8a203.web.app).
- Escopo entregue: autenticação, onboarding, isolamento por UID, regras de segurança e exclusão segura.
- Métricas abaixo cobrem somente `1-base`, não o `0-setup`.
- Foram 47 chamadas registradas ou recuperadas: 8 entregaram resultado estruturado utilizável e 39 falharam ou foram interrompidas (17% de sucesso técnico). Isso mede o protocolo do harness, não a qualidade geral do modelo.
- Custo da etapa: US$ 2,537998 confirmado e US$ 0,054660 incerto. O valor incerto permanece reservado para chamadas sem reconciliação completa.

## Modelos e consumo

“Resultado utilizável” significa que a chamada terminou e entregou o contrato esperado pelo harness. Tokens são entrada/saída registrados; para respostas locais vazias ou não parseáveis, o harness não registrou tokens finais, embora tenha havido processamento e tempo de execução.

| Modelo / papel | Chamadas utilizáveis | Tokens entrada/saída | Custo confirmado | Custo incerto | Desempenho observado |
| --- | ---: | ---: | ---: | ---: | --- |
| DeepSeek V4.1 Flash (`deepseek-code`, implementação) | 2/4 | 694.171/182.190 | US$ 0,268184 | US$ 0,004932 | Média ~8m52s; 2 falhas técnicas. |
| GPT-6.1 Sol via OpenRouter (`sol-top`, implementação) | 1/2 | 922.530/57.124 | US$ 1,885998 | US$ 0 | Uma entrega passou; uma sessão interrompida foi reconciliada. Maior custo da etapa. |
| GPT-6.1 Sol direto (`openai-sol`, implementação) | 0/1 | 123.803/2.070 | US$ 0,140601 | US$ 0 | Interrompido; custo reconciliado, sem resultado final utilizável. |
| Gemini 3.8 Flash (`gemini-mid`, revisão) | 3/4 | 127.687/12.747 | US$ 0,156404 | US$ 0,031083 | Média ~53s; 3 respostas utilizáveis, uma falha de contrato. |
| GLM 5.3 Flash (`glm-cheap`, revisão) | 1/1 | 14.758/6.115 | US$ 0,001646 | US$ 0 | Revisão utilizável de `task-004`; amostra pequena. |
| MiniMax M3.1 Flash (`minimax-flash`, implementação/revisão) | 1/3 | 302.762/86.900 | US$ 0,085169 | US$ 0,009954 | Uma implementação utilizável; duas falhas, incluindo timeout e revisão inválida. |
| Qwen3 Coder Next (`qwen-code`, implementação remota) | 0/1 | 0/0 | US$ 0 | US$ 0,006594 | Timeout de 15 minutos, sem resultado final. |
| GPT-6 Luna (`luna-cheap`, revisão) | 0/1 | 0/0 | US$ 0 | US$ 0,002097 | `claimedChecks` inválido. |

### Modelos locais removidos dos próximos pools

30 chamadas locais terminaram sem resultado utilizável e sem custo de API; os registros somam aproximadamente 36 minutos de execução.

| Modelo LM Studio | Chamadas | Resultado observado |
| --- | ---: | --- |
| Qwen 3.5 9B MLX (`local-qwen`) | 7 | Sessões com ferramentas, mas resposta final vazia/não parseável. |
| Qwen 3.5 9B OptiQ (`local-qwen-optiq`) | 5 | Teste direto chegou a produzir JSON no canal `reasoning_content`; a sessão Pi não entregou texto final aproveitável. |
| Qwen3 Coder 30B (`local-coder`) | 7 | LM Studio recusou o carregamento por recursos insuficientes. |
| Qwen3 Coder 30B MLX (`local-coder-mlx`) | 5 | LM Studio recusou o carregamento por recursos insuficientes. |
| GPT-OSS 20B GGUF (`local-gptoss-gguf`) | 4 | Resposta final vazia ou fora do contrato. |
| GPT-OSS 20B MLX (`local-review`) | 2 | Teste Chat Completions passou, mas o caminho de execução configurado não foi compatível; resposta final de tarefa falhou. |

Os testes de saída estruturada indicaram causas diferentes, não uma incapacidade uniforme dos modelos: alguns Qwen devolveram o JSON em `reasoning_content` com `content` vazio; e o harness direciona a família GPT-OSS para Responses, embora o smoke test do GPT-OSS MLX tenha passado por Chat Completions e falhado no caminho Responses. O Coder 30B foi barrado pelo limite de recursos do LM Studio. Evidências em `.harness/local-model-tests/structured-*` e nos traces das tentativas.

**Decisão para 2-registro:** retirar todos os modelos locais dos pools ativos, sem apagar seus cadastros nem tratá-los como opções de fallback. Só voltar a testar localmente após corrigir e validar o caminho LM Studio → Pi → resposta estruturada.

## Problemas marcantes e aprendizados

- O Pi inicialmente não reconheceu DeepSeek V4.1 Flash; foi necessário atualizar seu catálogo e validar o ID exato antes de continuar.
- DeepSeek e MiniMax trabalharam por 15 minutos, acionaram dezenas de ferramentas e modificaram arquivos, mas terminaram sem resposta final nem lista confiável de arquivos entregues; `resume` não continua o estado interno do modelo.
- Uma interrupção humana deixou custo incerto até conferência e reconciliação com o provedor. Interrupções e sessões sem relatório de uso precisam continuar explicitamente marcadas no orçamento.
- O contrato JSON falhou em modelos locais e remotos: saída vazia, JSON inválido e campos incompatíveis como `claimedChecks`. `json-llm-repair` ajuda com texto malformado, mas não corrige resposta vazia nem garante schema.
- O feedback humano foi importado inicialmente no nível do marco; corrigimos a associação por tarefa, mas reabrir uma tarefa ampla ainda permitiu mudanças além do pedido. A etapa precisa de uma tarefa final própria para correções.
- A verificação WebKit/Safari bloqueou a etapa. A repetição posterior não substitui o fato de que foi necessário um agente externo para corrigir o bug real no app; o harness precisa tornar a falha reproduzível e encaminhar sua correção.
- A saída do terminal melhorou, mas ainda não bastou para deixar claro o que concluiu, o que bloqueou e qual é a próxima ação após um resume.

## Ajustes para a próxima etapa

- Usar horários de terminal em UTC−3, mantendo timestamps UTC nos arquivos estruturados para auditoria.
- Antes da execução, validar cada modelo pelo runtime Pi real: ID resolvido, ferramentas funcionando e resposta final estruturada no canal que o harness realmente consome.
- Usar saída estruturada nativa quando suportada; distinguir erro de provedor, canal vazio, JSON inválido e violação de schema; não repetir a mesma incompatibilidade em vários modelos sem diagnóstico.
- Fazer preflight dos modelos e imprimir alias, família, ID e motivo da seleção/fallback. Não trocar DeepSeek por outro modelo silenciosamente.
- Adotar pool remoto sem Claude e sem modelos locais. IDs planejados: `openai/gpt-6.1-terra` em tarefas normais; `openai/gpt-6.1-sol` apenas em escalação; Gemini para revisão visual/independente; e modelos open-weight remotos `deepseek/deepseek-v4.1-flash-1017`, `z-ai/glm-5.3` (completo), `qwen/qwen3-coder-next`, `minimax/minimax-m3.1-flash` e `moonshotai/kimi-k3.1-pro`.
- Avaliar `google/gemini-4-argon` como candidato de maior capacidade para revisão visual ou crítica, após preflight; não substituir o Gemini já testado sem comparação no harness.
- Testar `moonshotai/kimi-k3.1-pro` em uma tarefa delimitada, comparando resultado, tempo e custo com um modelo já conhecido; não o colocar como fallback automático até medir no nosso harness.
- Testar `z-ai/glm-5.3` completo separadamente do atual GLM 5.3 Flash. O sucesso do Flash nesta etapa é um sinal positivo, mas ainda uma amostra pequena.
- Usar limite claro de modelos por tarefa, com escalada de qualidade explícita e confirmação humana antes de uma chamada excepcionalmente cara; qualidade é prioridade dentro do teto da etapa.
- Ao timeout/interrupção, congelar a atribuição do trabalho parcial, mostrar diff e traces, classificar o estado e propor recuperação focada antes de começar uma nova sessão.
- Criar, ao final de cada marco, uma task `human-corrections` com checklist estrito dos pedidos; iterar correções e verificações até aprovação, sem reabrir tarefas de escopo amplo.
- Em falha Playwright/WebKit, guardar trace, screenshot, navegador, seletor e erro; tentar reproduzir/corrigir no contexto da tarefa, repetir o teste afetado e a suíte completa; se persistir, parar com diagnóstico acionável para o usuário.
- Fechar toda sessão com status em linguagem direta: entregas, testes, pendências, custo confirmado/incerto, URL da versão e próxima ação/comando. O mesmo resumo deve aparecer após `resume`.

## Referências da execução

- [Relatório final](../.harness/runs/run-mvnyl7vo-04a32244/final-report.md)
- [Desempenho e orçamento completos da run](../.harness/runs/run-mvnyl7vo-04a32244/model-performance.md)
- [Trace do timeout DeepSeek em `task-004`](../.harness/runs/run-mvnyl7vo-04a32244/tasks/task-004/attempt-001/session-trace.jsonl)
- [Atribuição DeepSeek em `task-004`](../.harness/runs/run-mvnyl7vo-04a32244/tasks/task-004/attempt-001/work-attribution.json)
- [Trace do timeout MiniMax em `task-004`](../.harness/runs/run-mvnyl7vo-04a32244/tasks/task-004/attempt-002/session-trace.jsonl)
- [Atribuição MiniMax em `task-004`](../.harness/runs/run-mvnyl7vo-04a32244/tasks/task-004/attempt-002/work-attribution.json)

## Melhorias incorporadas para `2-registro`

- [Plano operacional e matriz de modelos da etapa 2-registro](PREPARACAO-2-REGISTRO.md).
- Pools atualizados: sem Claude, sem modelos locais ativos; GLM completo, Gemini 4 Argon, GPT-6.1 Terra/Sol, Kimi K3.1 Pro, DeepSeek, Qwen Coder e MiniMax com papéis/ordens explícitos.
- Comando `models probe --inference` valida um alias pelo runtime Pi real, incluindo ferramenta, resposta JSON e evidências; tem teto de diagnóstico explícito e não roda automaticamente.
- Console usa `HH:mm:ss` em São Paulo e cores semânticas somente em TTY; timestamps persistidos continuam UTC.
- Fechamento e resume imprimem progresso da etapa/projeto, custos, relatório, snapshot, próxima etapa e comandos completos de aprovação/feedback/resume.
- Feedback humano tem destino padrão `human-corrections`, preserva tarefas originais e roda ciclo de validação/revisão até novo gate humano.
- Gate de etapa conecta captura estrutural, screenshots e revisão visual independente; falhas geram tarefa de correção ou bloqueio acionável.
- Playwright conserva trace, screenshot e vídeo de testes falhos em pasta apontada pelo diagnóstico de E2E.
- Verificações finais deste bloco (lint, typecheck, testes) registradas após implementação completa.
