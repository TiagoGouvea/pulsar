# Retrospectiva — etapa 2-registro

Run: `run-mvnyl7vo-04a32244`

Estado registrado: verificações automatizadas aprovadas; aguardando aprovação humana.

Snapshot: <https://pulsar-2-registro-d83a9ead72.web.app>

## Resultado e custo

- Tarefas de produto `task-005` e `task-006` e tarefa isolada de correções humanas passaram pelos gates.
- E2E mobile: 30/30 testes passaram após corrigir uma condição de corrida no teste de edição do indicador.
- Etapa: USD 2.646861 confirmado; USD 0.336474 permanece incerto/reservado, não necessariamente cobrado.
- Run completa: USD 6.706153 confirmado; USD 0.469151 incerto/reservado.
- Os números de “pronto” abaixo medem resposta estruturada aceita pelo fluxo; não são benchmark independente de correção.

## Consumo e desempenho dos modelos nesta etapa

| Modelo | Chamadas e resultado | Tokens entrada/saída | Custo confirmado + incerto | Avaliação curta |
| --- | --- | ---: | ---: | --- |
| GLM-5.3 (`glm-5`) | 6: 5 prontas, 1 pediu mudanças | 822.540 / 178.216 | USD 1.802174 + 0 | Melhor confiabilidade técnica; fez implementação e revisão, mas concentrou a maior parte do gasto confirmado. |
| Gemini 3.8 Flash (`gemini-mid`) | 7: 5 prontas, 1 pediu mudanças, 1 falhou | 410.382 / 34.229 | USD 0.522634 + 0.035966 | Bom revisor funcional/visual; amostra útil, mas não perfeito. |
| DeepSeek V4.1 Flash (`deepseek-code`) | 4: 2 prontas, 1 bloqueada, 1 falhou | 270.275 / 85.205 | USD 0.115017 + 0.009975 | Produziu trabalho útil; uma sessão longa terminou sem resposta final e exigiu transferência para outro modelo. |
| Qwen3 Coder Next (`qwen-code`) | 2: 1 pronta, 1 interrompida | 112.897 / 5.604 | USD 0.128234 + 0.011706 | Uma implementação válida; amostra pequena e uma chamada interrompida. |
| GLM-5.3 Flash (`glm-cheap`) | 1: pediu mudanças | 37.054 / 10.289 | USD 0.012290 + 0 | Revisão de baixo custo e aparentemente útil; apenas uma amostra. |
| Gemini 4 Argon (`gemini-argon`) | 1: revisão pronta | 20.327 / 2.034 | USD 0.065566 + 0 | Uma revisão visual útil; amostra insuficiente para medir consistência. |
| GPT-6.1 Terra (`terra-review`) | 9: 9 falhas sem resposta utilizável | 0 / 0 | USD 0 + 0.092952 | Não avaliar a qualidade do modelo: o caminho Pi/OpenRouter falhou quase imediatamente, sem conteúdo. |
| Kimi K3.1 Pro (`kimi-pro`) | 6: 6 falhas sem resposta utilizável | 0 / 0 | USD 0 + 0.175904 | Sem resultado avaliável; suspender até uma chamada de diagnóstico passar. |
| MiniMax M3.1 Flash (`minimax-flash`) | 2: 2 falhas sem resposta utilizável | 0 / 0 | USD 0 + 0.009971 | Sem resultado avaliável no Codex; há evidência melhor no Claude, mas precisa passar pelo nosso runtime. |

Os custos incertos são reservas de chamadas sem custo final conciliado. Uma chamada de USD 0.000955 ficou sem alias no relatório por modelo; corrigir a atribuição de chamadas auxiliares para fechar a soma por modelo exatamente com o ledger.

## Modelos conferidos no harness Claude

Consulta somente de leitura a `harness-claude/harness.config.yaml` para confirmar aliases e IDs; nenhum arquivo do Claude foi alterado.

- `codex-mid` = `gpt-6.1-terra`, executado pelo Codex CLI no harness Claude. Resultados reportados: 9/9 na escrita de testes, 3/25 na implementação agregada (com várias tentativas presas em falhas do gate G11) e 1 revisão de código que pediu mudanças.
- `gemini-lite` = `google/gemini-3.1-flash-lite`, executado via Pi; resultados reportados: 22/22 em triagem, cerca de USD 0.004 por chamada.
- No Codex, `terra-review` usava o mesmo ID Terra via OpenRouter e falhou 9/9 vezes sem conteúdo. Foi adicionado `openai-terra` via API direta para avaliação separada; não assumir equivalência de confiabilidade entre as duas rotas.
- `gemini-lite` foi adicionado via OpenRouter como `google/gemini-3.1-flash-lite`; o custo configurado é USD 0.25/1M tokens de entrada e USD 1.50/1M de saída, sujeito a revalidação no preflight.
- Haiku não será usado no harness Codex, conforme decisão do projeto.

## Problemas observados e melhorias sugeridas

- DeepSeek excedeu o timeout de implementação e terminou sem resposta final → inspecionar e validar diff parcial antes de marcar falha ou iniciar outra implementação.
- Várias rotas Pi/OpenRouter terminaram vazias ou com erro de catálogo → fazer probe curto do modelo e das ferramentas antes de incluí-lo numa execução.
- Respostas fora do schema e JSON vazio geraram retries improdutivos → separar falha vazia/transporte de JSON inválido e não chamar reparador sem texto.
- O harness não expôs status HTTP, request ID e corpo bruto do provedor nos erros vazios → registrar esses campos com mascaramento de segredos.
- Modelos indisponíveis reapareceram em ciclos de revisão/correção → circuito de falha por alias durante a run, com reentrada só por comando explícito.
- A revisão E2E falhou por sincronização do teste, não por bug confirmado do produto → aguardar estado/dialog específico e classificar falhas determinísticas antes de chamar modelos.
- O snapshot de Registro não persistia porque as Firestore Rules do projeto ainda não estavam publicadas → preflight deve testar regras/Firestore Emulator e reportar claramente qualquer deploy de produção necessário.
- Os tempos de atribuição incluem pelo menos uma duração impossível e uma chamada sem alias → validar unidades e reconciliar `model-call.json`, banco e relatório agregado.
- A distinção entre tarefa de produto, tarefa humana e contagem total de features ficou confusa → exibir progresso separado por categoria e não contar correções humanas como feature.
- `resume`, feedback e gate humano foram fáceis de confundir → imprimir estado, próxima ação e comando curto apropriado em toda saída final.

## Observações do usuário

- A sensação foi de precisar de agente paralelo para destravar, reverter estados ou aceitar algo como pronto e evitar loop infinito.
- Arquivos de interação humana devem ficar mais próximos da raiz do projeto, com um `feedback.md` por etapa e um ou dois placeholders.
- O comando completo de `feedback import` é longo demais para usar repetidamente.
- O Codex falhou duas vezes durante a etapa, exigindo ajustes no harness e `resume`.
- O projeto foi entregue com dois bugs e recebeu feedback humano.
- Ao terminar uma execução, o terminal deve explicar melhor os comandos disponíveis.

## Observações do Codex

- O gate automatizado encontrou uma corrida no E2E de edição; com espera explícita e seletor contextual, a suíte mobile passou 30/30.
- O fluxo de sessão não continuava dentro do mesmo agente após timeout; o trabalho parcial precisava de inspeção e nova sessão.
- A saída vazia de Terra/Kimi/MiniMax não foi explicada pelos logs atuais, e o custo de algumas chamadas permaneceu incerto.
- O relatório de custo por modelo cobre chamadas conhecidas, mas precisa atribuir chamadas auxiliares e reservas sem esconder divergências.
- A análise de “assertividade” deve separar sucesso de protocolo, aprovação de gate e defeito real confirmado pelo usuário.

## Ajustes já aplicados para a próxima etapa

- Adicionado `openai-terra` usando o ID verificado `gpt-6.1-terra` pela API direta OpenAI; os pools o usam em autoria de testes, implementação, tarefas críticas e revisão funcional.
- Adicionado `gemini-lite` com ID verificado `google/gemini-3.1-flash-lite` para diagnóstico e formatação JSON.
- Desabilitado o alias Terra via OpenRouter e removidos Kimi e MiniMax dos pools ativos até o probe de runtime; aliases permanecem cadastrados para histórico.
- Reduzidos limites de entrada/saída do formatador para manter a chamada dentro do teto configurado de USD 0.005.
- O preflight foi tentado após a configuração: a credencial `OPENAI_API_KEY` existe, mas as consultas dos modelos OpenRouter retornaram `fetch failed` neste ambiente; nenhuma inferência/probe foi feita.
- Ainda é necessário repetir preflight com acesso ao catálogo e fazer probes pagos/limitados de `openai-terra` e `gemini-lite` antes da run 3-insights.

## Trabalho necessário antes da etapa 3-insights

1. Rodar `doctor`, `preflight` e `models list`; confirmar chaves, catálogo Pi e preços atuais sem iniciar a etapa.
2. Fazer probe controlado de `openai-terra` e `gemini-lite`; conferir ferramenta, JSON/schema, tokens, duração e custo real. Não iniciar a run se qualquer um falhar.
3. Ajustar o CLI para criar/importar feedback por padrão em um caminho curto e previsível (`harness-codex/feedback/3-insights.md`), com template e placeholders; aceitar esse caminho sem exigir `--file` absoluto.
4. Adicionar um comando curto de feedback e explicar no terminal, sem ambiguidade, diferenças entre revisar, aprovar, importar correções, `resume`, `status` e `diagnostics`.
5. Separar estados de chamada: catálogo/runtime, transporte/vazio, parse/schema, timeout, rejeição de revisão e falha determinística de gate; cada classe deve ter retry/fallback próprio.
6. Preservar diff e evidências após timeout; oferecer recuperação resumida em nova sessão sem declarar que o agente continuou internamente.
7. Bloquear repetição de alias que falhou sem resposta durante a mesma revisão/run, salvo retry manual com motivo registrado.
8. Melhorar relatório final com comandos seguintes, progresso por marco/projeto, custo confirmado/incerto e modelos por papel; consertar tempos e atribuições discrepantes.
9. Tornar gate de concorrência explícito: detectar edição externa/branch drift e oferecer decisão registrada de aceitar, inspecionar ou descartar — nunca marcar pronto silenciosamente.
10. Fortalecer E2E mobile com sincronização por estado, artefatos e critérios de aceitação que cubram os fluxos funcionais pedidos; manter as larguras móveis 390 e 430 px.
11. Fazer checagem Firebase prévia e usar emuladores para testes; pedir autorização explícita antes de publicar regras ou dados de produção.
12. Ao finalizar a implementação dessas mudanças, rodar typecheck, lint, testes unitários e suíte E2E uma vez como bloco final.
