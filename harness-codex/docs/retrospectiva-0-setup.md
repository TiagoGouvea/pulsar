# Retrospectiva — etapa 0-setup

## Observações do usuário

- Faltou feedback contínuo no terminal durante a execução — exibir início, horário dos eventos, progresso de tarefas e features, tentativas, problemas e bloqueios em linhas curtas.
- Faltaram hora de início e duração total no JSON da etapa — persistir início da run e somar os períodos ativos entre resumes, distinguindo tempo corrido de tempo de execução.
- Faltou imprimir custo ao concluir cada interação com modelo — registrar modelo, tokens, custo confirmado ou incerto e duração em uma linha.
- O crash não foi gravado nos logs da run — capturar encerramentos, sinais, processo e fase, além de preservar o último heartbeat.
- Ao atingir limites, não havia escolha interativa — oferecer continuar, tentar novamente ou parar, respeitando teto de custo e modo não interativo.
- A mensagem final não deixava claro sucesso, falha ou próxima ação — imprimir estado final, resumo, artefatos relevantes e comando recomendado.
- Faltou um log fácil de localizar por chamada — manter um arquivo estruturado por tentativa/modelo, com entrada redigida, resposta, uso, custo e erro.
- Faltou comando de performance da etapa — resumir por modelo tarefas, resultados, tokens, custos, duração e chamadas incertas.
- O Codex não acompanhava visualmente a interface como o Claude — incluir revisão visual real com navegador e evidências Playwright quando aplicável.
- O primeiro processo falhou por link simbólico incorreto no macOS — validar caminhos resolvidos no doctor/preflight e cobrir symlinks em teste.
- Após crash do Zellij, o resume não retomou de imediato — testar recuperação de lease e processo interrompido em cenários reais de terminal.
- Foi necessário corrigir problemas de integração com retornos do PI durante a etapa — validar contrato JSON, aliases de resultado, timeout e reparo de resposta com testes de contrato.
- A run exigiu cerca de dez resumes e correções sucessivas — reduzir a necessidade de intervenção com diagnóstico específico, recuperação idempotente e gates testados antes da execução.
- O painel web simples ajudou a acompanhar etapa e status — manter e ampliar o painel com progresso, custos, tentativas e bloqueios ao vivo.
- A entrega incluiu wizard de boas-vindas animado até um dashboard vazio — registrar como scaffold concluído e priorizar conteúdo funcional nas etapas seguintes.

## Problemas observados pelo Codex

- O checkpoint tentou incluir um pathspec inexistente — validar a lista de arquivos antes do checkpoint e explicar arquivos não encontrados.
- Uma lease podia aparentar controlador ativo após encerramento — reconciliar lease com processo/heartbeat e oferecer recuperação segura.
- O timeout de revisão de 2 minutos era curto e chamadas em sequência demoravam muito — usar limite realista por chamada e limite agregado por etapa; o timeout foi ajustado para 4 minutos.
- Falhas técnicas antigas de revisão contaminavam tentativas posteriores — contar falhas somente desde a última resposta válida.
- Estados `needs_changes` e `revisions_requested` não eram aceitos uniformemente — normalizar aliases para `changes_requested`.
- Resposta válida que pedia ajustes era contabilizada como falha do modelo — separar conclusão técnica de aprovação do conteúdo.
- O diagnóstico podia exibir timeout antigo em vez do bloqueio atual — priorizar o evento de bloqueio e sua tentativa correspondente.
- Qualquer mudança no YAML exigia replanejamento — comparar apenas configuração estrutural e permitir ajustes operacionais entre resumes.
- O limite de três tentativas impedia continuar após revisões válidas — permitir quatro tentativas, mantendo o teto financeiro como restrição.
- A recuperação não reconhecia `changes_requested` — tratar o estado atual e os nomes legados.
- A verificação final chamava `yarn typecheck`, que não existia no app — adicionar script, documentação e teste do gate.
- O Playwright disputava a porta 3000 com outro servidor — reservar porta isolada 3100 com `strictPort` e loopback.
- O bloqueio de verificação mostrava apenas `milestone_verification_failed` — incluir nome do comando, exit code e caminho do log.
- Métricas por modelo não estavam agregadas — gerar relatórios Markdown, JSON e CSV com sucesso técnico, resultados, tokens e custos.

## Melhorias para próximas etapas

- Exibir progresso e custo no terminal durante toda execução e resume.
- Persistir tempos por run e etapa sem contar duas vezes períodos retomados.
- Garantir logs de processo, sessão e provedor mesmo em crash ou timeout.
- Permitir decisão humana em limites configuráveis, sem ultrapassar orçamento autorizado.
- Ter uma saída final inequívoca para sucesso, bloqueio, pausa e falha.
- Manter histórico por chamada com dados sensíveis redigidos e artefatos ligados à tentativa.
- Publicar métricas comparáveis por modelo e papel em cada relatório de etapa.
- Exercitar crash, retomada, parsing do PI, port collision e gates de build em testes de recuperação.
- Usar navegador para evidência visual, além de checks estruturais e screenshots.
