# Checkpoints, Comunicação Humana e Tratamento de Bloqueios

Este documento analisa como os harnesses do **Claude** (`harness-claude`) e do **Codex** (`harness-codex`) estruturam a interação com o usuário humano no encerramento de etapas, a coleta de dúvidas e o comportamento frente a erros sem solução (como falta de credenciais/chaves de API).

---

## 1. Comunicação com o Humano ao Fim de Cada Etapa

Ambas as arquiteturas preveem pausas para aceite humano ao fim de cada ciclo ou marco, porém diferem na completude do pacote entregue e na autonomia do fluxo.

### Claude (`harness-claude`)
Gera um pacote de entrega isolado no diretório `checkpoints/etapa-N/`:

* **`RELATORIO.md`:** Consolida as features entregues, tempo decorrido, custo financeiro real por worker e etapa, taxa de sucesso dos modelos e link do ambiente de preview.
* **`COMO-TESTAR.md`:** Roteiro prático (10 a 15 minutos em mobile e desktop) indicando o que validar e como usar as credenciais/dados de teste gerados via seed.
* **`DUVIDAS.md` (Coleta dinâmica de dúvidas):**
  * Durante as sessões de trabalho, se faltar definição de regra de negócio, os modelos adotam a opção mais conservadora e gravam no inbox (`questions.jsonl`).
  * No fechamento da etapa, essas dúvidas são deduplicadas e consolidadas por feature, exibindo: *Pergunta*, *Escolhido por padrão*, *Alternativas*, *Impacto* e o campo `Resposta: ` em branco para preenchimento humano.
* **`RISCOS.md`:** Tabela contendo riscos arquiteturais, de segurança ou de performance levantados pelos workers durante a execução.
* **`APROVACAO.md`:** Arquivo padronizado para o humano definir `Status: (aprovado / ajustes)` e elencar ajustes linha por linha.
* **Deploy de Preview Automatizado:** Executa `firebase hosting:channel:deploy etapa-N` e disponibiliza a URL pública de homologação diretamente no relatório.
* **Notificação Remota Ativa:** Dispara webhook via POST (`notify.ts`) para serviços externos (Telegram, WhatsApp, API HTTP), sinalizando que a etapa está pronta para validação humana.
* **Processamento do Feedback:**
  * O humano responde as dúvidas em `DUVIDAS.md`, edita `APROVACAO.md` e executa `harness approve`.
  * O harness aciona o papel `approval_parser` (modelo barato) para converter as respostas em JSON estruturado, confirma a ação no terminal (`y/n`), injeta as respostas em `DECISOES.md` e converte eventuais ajustes em novas features (`F-N.adj-01`), retomando o fluxo.

### Codex (`harness-codex`)
A interação apoia-se em relatórios estáticos em disco e em um servidor web local:

* **`human-review.md`:** Gerado em `.harness/runs/<runId>/milestones/<milestoneId>/`. Lista as tarefas finalizadas, o commit git atual e a matriz de rastreabilidade de requisitos.
* **Coleta de Dúvidas:** **Inexistente em tempo de execução.** O gerador do Codex inclui texto estático padrão: *"Nenhuma dúvida adicional foi criada automaticamente."*, pois não possui rotina de coleta nos agentes.
* **Painel Web Local:** Disponibiliza um servidor HTTP local (`dashboard/server.ts`), acessível via `yarn harness dashboard --run <runId>`. Permite inspecionar o status das tarefas, logs e aprovar o marco via interface gráfica.
* **Notificação Remota:** **Ausente.** O harness opera estritamente local; não há suporte a webhooks ou alertas push/e-mail.
* **Processamento do Feedback:**
  * O humano deve aprovar via CLI (`yarn harness approve --run <id> --milestone <id> --revision <hash>`) ou importar um arquivo de texto com `yarn harness feedback import --run <id> --file feedback.md`.

---

## 2. Tratamento de Problemas Sem Solução (Ex: Falta de Chaves de API)

### Claude (`harness-claude`)
Adota **prevenção estática**, **fallback em pool** e **isolamento da falha por feature**:

1. **Validação Prévia (`harness doctor`):**
   * Antes do início, valida binários, emuladores e conectividade de cada CLI.
   * Workers com `enabled: true` no `harness.config.yaml` que possuam variáveis vazias ou `<preencher>` no `.env` reprovam o `doctor`, impedindo a execução de largar quebrada.
2. **Fallback Dinâmico no Roteamento:**
   * Se a chamada a um worker falhar por credencial ou indisponibilidade, o roteador busca outro worker habilitado dentro do mesmo pool funcional (ex: troca `sonnet` por `glm`, `kimi` ou modelo local).
3. **Bloqueio Localizado (Resiliência do Loop):**
   * Se nenhum worker puder atender à tarefa (pool esgotado), o orquestrador aciona a rotina `block(feature, reason)`:
     * Marca apenas aquela feature como `status: "blocked"`.
     * Registra em `DUVIDAS.md` a ocorrência e pergunta ao humano como prosseguir.
     * Registra o evento de risco e notifica via webhook com evento `blocked`.
     * **O orquestrador NÃO encerra:** ele pula a feature impedida e continua o ciclo executando as demais features independentes da etapa.
4. **Tratamento de Estouro de Orçamento e Falhas Globais:**
   * Se o orçamento da etapa ou da execução estourar, entra no estado `PAUSED_BUDGET`, gera um checkpoint parcial (`checkpoints/etapa-N-parcial/`), notifica e encerra com segurança.
   * Se o orquestrador quebrar (crash imprevisto), salva o erro em `state.json` (`CRASHED`) e emite webhook. O humano corrige o ambiente e executa `harness resume` para retomar do último ponto consistente sem perda de trabalho.

### Codex (`harness-codex`)
Adota **parada global por reincidência de erro**:

1. **Validação Prévia (`yarn harness doctor` / `preflight`):**
   * Verifica ferramentas e variáveis mínimas, registrando avisos e bloqueios em `preflight.md`.
2. **Tratamento de Falhas em Execução:**
   * Se faltar credencial no `.env`, o executor `pi.ts` lança a exceção `Credencial ausente: <VAR>`, registrando a tentativa como `pi_execution_failed`.
   * O orquestrador computa o hash da assinatura da falha (`failure_signature`).
   * Como a credencial continua ausente, a repetição é detectada na tentativa seguinte.
3. **Bloqueio Total do Orquestrador:**
   * Ao atingir o limite configurado de falhas idênticas (`maxSameFailureCount = 2`), o controlador:
     * Marca a tarefa como `blocked`.
     * **Marca o estado da execução inteira como `blocked`** (`setRunState(runId, "blocked")`).
     * **Interrompe o processo imediatamente.** Nenhuma tarefa independente subsequente é executada.
4. **Visibilidade do Problema:**
   * Como não há webhook, a parada é silenciosa para o usuário externo. A constatação depende de checagem manual no terminal (`yarn harness status`) ou via banco SQLite (`.harness/state.sqlite`).
   * Para continuar após configurar a credencial, é necessário invocar `yarn harness resume --run <runId>`.

---

## 3. Resumo Comparativo

| Aspecto | Claude (`harness-claude`) | Codex (`harness-codex`) |
| :--- | :--- | :--- |
| **Formato de Checkpoint** | Pacote completo em `checkpoints/etapa-N/` (relatório, testes, dúvidas, riscos e screenshots). | Arquivos Markdown em `.harness/runs/...` e interface web no `dashboard`. |
| **Roteiro de Testes** | Gerado dinamicamente em `COMO-TESTAR.md` com instruções para mobile e desktop. | Instruções genéricas em `human-review.md`. |
| **Coleta de Dúvidas de IA** | **Sim.** Deduplica perguntas registradas pelos modelos e gera formulário preenchível em `DUVIDAS.md`. | **Não.** Exibe apenas mensagem estática de ausência de dúvidas. |
| **Canal de Notificação** | Webhook HTTP ativo (compatível com Telegram, WhatsApp, Agento, etc.). | Apenas monitoramento passivo local via CLI ou painel web. |
| **Publicação de Preview** | Automatizada via canal de preview no Firebase Hosting. | Manual ou dependente de configuração externa. |
| **Falta de Chave / Erro Crítico** | Bloqueia a feature específica, notifica e **continua as demais tarefas**. | Repete o erro 2 vezes e **paralisa toda a execução** do harness. |
| **Retomada pós-correção** | `harness resume` | `yarn harness resume --run <runId>` |
