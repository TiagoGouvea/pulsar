# Preparação do Harness Codex — etapa `2-registro`

Este documento registra o pacote aplicado depois da retrospectiva `1-base`. As decisões preservam o branch corrente e não autorizam o harness a trocar de branch.

## Modelos ativos e ordem dos pools

Não há modelos Claude. Os modelos LM Studio permanecem cadastrados para histórico, mas estão desabilitados e não participam de fallback nem de revisão.

| Papel | Ordem de preferência |
| --- | --- |
| Planejamento | GPT-6.1 Terra → Gemini 3.8 Flash → GLM 5.3 → GPT-6.1 Sol |
| Autoria de testes | GPT-6.1 Terra → GLM 5.3 → DeepSeek V4.1 Flash → Qwen3 Coder Next → Gemini 3.8 Flash → MiniMax M3.1 Flash |
| Implementação comum | DeepSeek V4.1 Flash → GLM 5.3 → MiniMax M3.1 Flash → Kimi K3.1 Pro → Qwen3 Coder Next → GPT-6.1 Terra |
| Implementação crítica | GPT-6.1 Terra → Kimi K3.1 Pro → GPT-6.1 Sol via OpenRouter → GPT-6.1 Sol via API OpenAI |
| Revisão funcional | Gemini 3.8 Flash → GLM 5.3 → GLM 5.3 Flash → GPT-6.1 Terra → Kimi K3.1 Pro |
| Revisão visual | Gemini 3.8 Flash → Gemini 4 Argon → GPT-6.1 Terra |
| Segurança | Gemini 4 Argon → GPT-6.1 Terra → GPT-6.1 Sol via OpenRouter → GPT-6.1 Sol via API OpenAI → GLM 5.3 |
| Diagnóstico | GLM 5.3 → DeepSeek V4.1 Flash → MiniMax M3.1 Flash → Gemini 3.8 Flash → GPT-6 Luna |
| Aprendizados | Gemini 3.8 Flash → GPT-6.1 Terra → GLM 5.3 |

O limite atual é de quatro tentativas por tarefa; portanto, os modelos posteriores são fallback e não serão chamados automaticamente depois do teto. `Kimi K3.1 Pro` entra deliberadamente no pool de implementação e no hard pool para uma avaliação controlada, mas custa na faixa de GPT-6.1 Sol/Gemini 4 Argon. O harness reserva o custo antes da chamada e respeita o teto de US$ 9 da etapa.

Referências de preço/ID consultadas no OpenRouter: [GPT-6.1 Terra](https://openrouter.ai/openai/gpt-6.1-terra), [Gemini 4 Argon](https://openrouter.ai/google/gemini-4-argon), [GLM 5.3](https://openrouter.ai/z-ai/glm-5.3), [Kimi K3.1 Pro](https://openrouter.ai/moonshotai/kimi-k3.1-pro), [MiniMax M3.1 Flash](https://openrouter.ai/minimax/minimax-m3.1-flash). O preflight consulta o catálogo e bloqueia modelo ausente ou preço acima do configurado; revise `harness.config.yaml` se os preços mudarem.

## Preflight e resposta estruturada

Antes da execução:

```bash
yarn harness doctor --config harness.config.yaml
yarn harness preflight --config harness.config.yaml
yarn harness models list --config harness.config.yaml
```

`preflight` verifica credenciais, ID e preço atual no OpenRouter. Ele não cobra inferência. Para validar um candidato de verdade através do mesmo runtime Pi da execução — incluindo chamada de ferramenta, JSON final e parser/contrato do harness — execute um alias por vez:

```bash
yarn harness models probe --config harness.config.yaml --alias deepseek-code --inference
```

Esse smoke test remoto é pago, exige `budget.diagnosticsLimit`, estima o custo antes de iniciar, limita a saída, registra trace e resultado em `.harness/model-probes/` e não altera o projeto. Faça smoke dos aliases que pretende usar; não rode todos sem necessidade.

Durante as tarefas, o harness registra separadamente setup/runtime, timeout, resposta vazia, JSON inválido e falha de contrato. `json-llm-repair` continua ativo; quando não resolver, o trace e o texto seguro da resposta ficam preservados para diagnóstico. Falha técnica permite fallback apenas para um alias ainda não tentado e dentro do limite. O modelo escolhido e sua modalidade `local/remoto` são impressos explicitamente.

## Correções humanas isoladas

No gate, anote os itens como checklist objetivo em `feedback.md`, com comportamento esperado e passos de reprodução. Importe sem apontar para uma tarefa funcional ampla:

```bash
yarn harness feedback import --config harness.config.yaml --run <runId> --milestone 2-registro --task human-corrections --file ./feedback.md
yarn harness resume --config harness.config.yaml --run <runId>
```

O primeiro envio cria `human-corrections-2-registro`, preserva as tarefas originais e registra todo feedback dessa etapa. O agente recebe instrução explícita para corrigir somente os itens recebidos; itens ambíguos devem ser esclarecidos, não ampliados. Depois da correção, typecheck, lint, testes, build, E2E, evidência visual e gate humano rodam novamente. Novos itens no próximo gate são anexados à mesma tarefa; não se volta a reabrir uma implementação de escopo amplo automaticamente.

## Revisão visual e recuperação de E2E

Depois dos gates automatizados e da publicação do snapshot permanente, o harness captura screenshot para cada largura configurada, erros de console, requests, overflow e violações Axe. Registra evidência em `milestones/<etapa>/visual/visual-evidence.json` e executa revisão somente-leitura com um modelo que anuncia capacidade de visão. O prompt lista as imagens e instrui o agente Pi a lê-las pelas ferramentas de leitura.

Achados estruturais ou visuais são salvos como feedback da tarefa isolada de correções; a run pausa com a tarefa e o caminho do artefato, e `resume` a executa. Falha de captura ou esgotamento da revisão bloqueia com evidência, sem aprovar silenciosamente.

No E2E do projeto, Playwright conserva trace, screenshots e vídeo de testes que falham. O terminal mostra o caminho de `e2e.log` e da pasta `e2e-artifacts`, incluindo diagnóstico do Safari/WebKit para reprodução focada.

## Terminal e encerramento

- Horário humano no terminal: `HH:mm:ss` em `America/Sao_Paulo`; JSON, SQLite e traces continuam com timestamp UTC completo.
- Cores ANSI aparecem apenas em TTY e respeitam `NO_COLOR`: azul = início, verde = sucesso, amarelo = alerta/recuperação, vermelho = falha/bloqueio; marcadores continuam visíveis sem cor.
- Não há resumo periódico a cada minuto: os símbolos de turnos/ferramentas se acumulam na linha, e os resumos saem em eventos importantes.
- Fim de sessão e `resume` informam resultado, tarefas/features da etapa e do projeto, custos confirmados/incertos, relatório, snapshot, bloqueio e comando seguinte.
- Ao aguardar revisão humana, o terminal imprime comandos completos de feedback e aprovação, o ID/hash da revisão e a próxima etapa. Após aprovação, lembra que qualquer troca de branch é manual.

## Como iniciar

1. Execute o preflight acima; use smoke Pi nos modelos remotos escolhidos se ainda não foram validados nesta máquina/chave.
2. Confirme que o branch corrente é o branch que você escolheu para `2-registro`. O harness apenas confere/fixa o branch, jamais troca.
3. Como a run aprovada de `1-base` já contém o plano das etapas seguintes, use o `resume` impresso no gate. Se optar por uma nova run, confirme antes que o plano não repetirá etapas aprovadas.

O resumo de falhas e decisões de `1-base` permanece em [retrospectiva-1-base](retrospectiva-1-base.md).
