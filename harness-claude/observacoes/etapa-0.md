# Observações — etapa 0 (Setup)

Branch `0-setup`. Custo final: US$ 15,49 da etapa (teto 16), US$ 16,10 acumulado. 8 features entregues (7 + F-0.fix-1).

## Observações do Tiago

**Senti falta, precisa ajustar:**
- Senti falta de feedback no terminal enquanto o processo corria.
- Registrar no JSON da etapa a hora de início e o tempo total de processamento; pensar como lidar com resume.
- Printar no console: hora de início, hora em cada log, x/y tarefas feitas, x/y features feitas, eventos com mais de uma tentativa, problemas, bloqueios e tempo total ao final. Uma linha sempre que possível.
- Printar no terminal, em uma única linha, o custo de cada interação com um modelo.
- Ao crashar, o crash não foi registrado nos arquivos de log próprios.
- Ao chegar num limite, perguntar no terminal e deixar o usuário decidir se tenta novamente ou não.
- Ao terminar, o terminal não deixava claro se foi sucesso ou falha, nem o que ver ou fazer em seguida.
- Ter um arquivo de log para cada chamada e resultado.
- Não há onde ver a performance por modelo: quero um comando para ver como cada modelo se saiu na etapa.

**Como foi:**
- Falhou no meio do primeiro processo por falta de crédito na API. O resume funcionou certinho.
- O terminal (zellij) crashou; ao dar resume, voltou ao processo certinho.
- Não havia comando pronto para ver o andamento geral; acompanhei com `tail`.
- Até concluir a etapa esbarrou em vários erros (parse de JSON, cálculo de consumo); fomos ajustando e dando resume.
- Parou e precisou de ajuste + resume 8 vezes.
- Ao final gerou um arquivo de dúvidas com 61 perguntas, muitas duplicadas; resumido para 24.

## Observações do Claude

**O que deu errado:**
- O inicializador caiu no meio por falta de crédito na Anthropic e perdeu US$ 4,71.
- O inicializador rodou quatro vezes e gastou US$ 7,91 no total.
- O revisor reprovou o plano do inicializador três vezes, e ele seguiu mesmo assim.
- O commit falhou porque o inicializador pôs `.harness/` no `.gitignore` do projeto.
- O resume depois do crash refazia a decomposição das features.
- O `recover()` apagava a worktree do inicializador.
- O doctor apontava 44 diferenças falsas no design, por causa de data e permissão dos arquivos.
- O adapter do Codex cobrava duas vezes os tokens em cache e inflou o gasto em US$ 3,11.
- O orçamento pausou a etapa duas vezes por causa desse gasto inflado.
- A cota do Gemini via agy acabou, e o harness seguiu tentando usá-lo.
- O Kimi copiou o JSON da feature na retentativa de formato.
- A retentativa de formato não mostrava o formato de resposta esperado.
- O codex-mid lia entre 160 mil e 470 mil tokens por revisão.
- A revisão custou mais que a implementação.
- O codex-top custou entre US$ 0,47 e US$ 0,82 por chamada e falhou numa delas.
- A tag `privacy-mode` mandava quase toda feature de UI para a fila cara.
- O DeepSeek acertou 1 de 4 implementações.
- Um worker deixou um teste de debug sem asserts no e2e.
- O Lighthouse reprovou a `/_design`, e isso exigiu uma feature extra de correção.
- O preview de produção não tinha nada testável na etapa 0.
- O `COMO-TESTAR.md` não avisou que a etapa 0 não teria interface.
- O `DUVIDAS.md` veio com 61 perguntas, a maioria duplicada.
- As alternativas das dúvidas não tinham letras.
- O parser não lia as respostas quando o editor punha uma linha em branco.
- O `approve` começava a próxima etapa sem que o humano pedisse.
- O app usava a porta 4173, a mesma do projeto do Codex.
- O checkout principal não tinha `node_modules`, e o `e2e:serve` falhou.

**Já corrigido durante a etapa:** cobrança do cache do Codex (com correção no ledger), commit com `.harness/` ignorado, resume sem refazer a decomposição, worktree do init preservada, doctor do design, retentativa de formato, Gemini via OpenRouter, revisão começando por modelos baratos, implement_hard começando pelo Sonnet, dúvidas deduplicadas e com letras, parser tolerante a linha em branco, `approve` sem iniciar a próxima etapa, portas 4791/4792.

**O que poderia ser melhor:**
- Checar o saldo das APIs antes de chamadas caras.
- Não deixar o inicializador seguir com o plano reprovado sem avisar.
- Deduplicar as dúvidas no momento do registro, e não só no relatório.
- Tirar automaticamente da rotação um worker com cota esgotada.
- Limitar o contexto lido pelo revisor de código.
- Validar o custo de cada adapter contra a fatura real.
- Mostrar no relatório a taxa de sucesso por modelo.
- Corrigir o custo médio inflado do codex-mid no `routing-stats.json`.
- Medir o sucesso da revisão pelo veredito, e não só pelo formato da resposta.
- Mostrar o progresso das chamadas ao vivo.
- Rodar lint e format antes dos gates, porque G2 e G4 foram as falhas mais comuns.
- Gerar portas exclusivas por projeto já no scaffold.
- Explicar no checkpoint o que dá e o que não dá para testar na etapa.
- Gerar o `COMO-TESTAR.md` com as portas atuais da config.
- Encerrar os servidores de teste ao fim de cada gate.
- Apagar arquivos `tmp-*` dos workers antes do commit.

## Performance por modelo (etapa 0)

| Papel | Modelo | Sucesso | Custo médio |
|---|---|---|---|
| implement | deepseek | 1/4 | US$ 0,04 |
| implement | kimi | 1/2 | US$ 0,10 |
| implement | sonnet | 0/1 | US$ 0,07 |
| implement_hard | opus | 3/4 | US$ 0,34 |
| implement_hard | codex-top | 2/3 | US$ 0,66 |
| test_writer | sonnet | 3/3 | US$ 0,11 |
| review_code | codex-mid | 9/9 | ~US$ 0,16 (real) |
| review_code | sonnet / haiku / deepseek | 4/4 | US$ 0,005–0,03 |
| review_ui | sonnet / gemini-flash-or | 3/3 | US$ 0,03–0,07 |
| triage | deepseek | 3/3 | US$ 0,005 |
| initializer | opus | 3/6 | US$ 1,32 |
