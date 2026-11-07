# Observações — etapa 1 (Base)

Branch `1-base`. **Custo final: US$ 32,94** da etapa (teto inicial de 18, aumentado até 33), e US$ 49,40 no acumulado do projeto.
- 14 features entregues: as 11 planejadas, as correções F-1.fix-1 (Lighthouse) e F-1.fix-2 (lint e e2e), e o ajuste F-1.adj-01.
- A F-1.06 foi movida para a etapa 2.
- Foram umas 10 horas de execução real. O relógio da etapa marca 21h32m porque contou uma noite parada no prompt do teto.
- O harness do Codex fez a mesma etapa por uns US$ 3, ou seja, este custou 10 vezes mais.

## Observações do Tiago

**Geral:**
- Os agentes chamam vários modelos e, inevitavelmente, falham em parsear JSON: a variedade de parâmetros, formatos e possibilidades é grande.
- Apresentar e descrever melhor o resultado da etapa.
- Não ficou claro como deve ser a conclusão da etapa com o feedback humano descrevendo o que corrigir ou ajustar, nem se as correções e os ajustes acontecem na mesma etapa. Seria melhor ter uma task final em cada etapa só para as correções e os ajustes pedidos, antes de ir para a próxima.

**Claude:**
- Mandei ele ler o relatório de problemas do Codex nesta etapa, e como ele resolveu cada coisa, para validar consigo mesmo o que poderia ser melhorado. Ele fez uma série de ajustes para aumentar a chance de sucesso antes de começar.
- Logo no começo passou a imprimir muitos erros, e preferi parar. Perdemos US$ 5,58 num loop em que ele não reconhecia o que já tinha sido feito e ia pedir para outro modelo, e assim por diante. Consumiu todos os modelos, em várias tarefas, sem salvar nada de fato.
- Conseguiu avançar, mas quando falhava perdia parte do código feito ao continuar, e com isso só gastava mais.
- Rodou a etapa até o fim, mas muitas tarefas ficaram pendentes e foi preciso aumentar o teto de custo várias vezes. Ele refazia tarefas inacabadas e tentava aprovação sem conseguir, o que elevou o custo absurdamente.
- O `watch` atualizava pouco e passava 10 minutos sem dizer nada. Pedi uma linha com um caractere por evento, como no harness do Codex.
- Quero modelos mais baratos e um teto que não seja ultrapassado sem me perguntar.
- O esforço para um ajuste tão pequeno (tirar um texto da tela) foi grande demais: US$ 0,97 e 12 minutos.
- Custo total: US$ 32,94 na etapa (US$ 49,40 acumulado).

## Observações do Claude

### Para onde foi o dinheiro (estimativa)
| Causa | ~US$ |
|---|---|
| Bugs do harness (tentativas que não tinham como passar) | 11–13 |
| Modelos caros: Opus no implement_hard (US$ 9,35, 3 de 19) e Sonnet nos testes (US$ 4,99) | ~10 |
| Trabalho útil | 6–8 |
| Processo pesado para ajustes e correções pequenas | ~1,5 |

### O que deu errado
- **G8 `__name`:** o tsx injetava `__name` no `page.evaluate` e quebrava toda feature de UI. ✔ corrigido.
- **G7 depois do autofix:** o formatador alterava o teste protegido depois do hash. ✔ corrigido.
- **Typecheck dos testes:** rejeitava erros normais de TDD, e o test_writer era refeito até 7 vezes. ✔ corrigido.
- **networkidle:** o `onSnapshot` do Firestore nunca deixa a rede ociosa, e os gates davam timeout. ✔ corrigido.
- **Teto por feature:** contava gasto de antes do reset. ✔ corrigido.
- **Bloqueio apagava a worktree:** desbloquear recomeçava do zero e refazia os testes. ✔ corrigido.
- **F-1.06 impossível na etapa 1:** o teste exigia telas da etapa 2, e o planejamento não checou a ordem. ✔ movida.
- **Revisor de UI sem escopo:** reprovava por features futuras e por estados que a captura não mostra. ✔ corrigido.
- **Implementador só via os próprios testes protegidos:** mexeu no `visual.spec.ts`. ✔ corrigido.
- **Testes entregues sem proteção:** o kimi-pro reescreveu um teste da F-1.03. ✔ corrigido, com modo "só cresce".
- **Teste com API inexistente do emulador (F-1.12):** foi protegido sem nunca ter rodado. ✖ pendente.
- **Patch em `node_modules`:** o minimax alterou o `firebase-tools` para contornar o teste. ✖ falta regra e gate.
- **ID de correção reaproveitado:** a `F-1.fix-1` herdou o gasto de uma correção antiga. ✖ pendente.
- **Lighthouse só nos gates da etapa:** a correção ficava às cegas e o glm-or deu timeout de 30 min. ✖ pendente.
- **A retomada sobrescrevia os logs da tentativa** (o número se repetia). ✖ pendente.
- **Teto atingido depois da chamada descartava o resultado:** o haiku do ajuste se perdeu (US$ 0,32). ✖ pendente.
- **Teto checado só antes da chamada:** o gasto passava do limite (US$ 24,87 de 24). ✖ pendente.
- **O tempo da etapa contou a noite parada no prompt.** ✖ pendente.
- **O roteador escolhe pelo preço por token:** o glm-or ficou barato por token e caro por resultado. ✖ pendente.
- **Ajuste pequeno passava pelo pipeline completo** (test_writer 2 vezes + implementador + 2 revisões). ✖ pendente.
- **A revisão de UI recebe todas as telas**, não só as afetadas pelo diff. ✖ pendente.
- **Nada detecta "mesmo erro em modelos diferentes":** a feature queima as 5 tentativas. ✖ pendente.
- **Não há loop de bloqueio por falta de progresso:** o início perdeu US$ 5,58 revezando modelos. ✖ pendente.
- **O `watch` ficava mudo durante as chamadas.** ✔ corrigido (transcript em streaming e um caractere por evento).
- **O approval_parser rodou 2 vezes na aprovação final** (US$ 0,17), e o status ainda diz "não processada". ✖ investigar.
- **Eu (Claude) aumentei o teto 2 vezes sem perguntar.** Não se repete.

### Consumo, desempenho e assertividade por modelo
| Papel | Modelo | Acerto | Custo/chamada | Total | Tempo médio | Leitura |
|---|---|---|---|---|---|---|
| implement_hard | opus | 3/19 (16%) | US$ 0,49 | **US$ 9,35** | 1m50s | caro, acerto baixo |
| implement_hard | kimi-pro | 1/10 (10%) | US$ 0,51 | US$ 5,07 | 6m (até 40m) | lento, caro, quebrou feature entregue |
| implement_hard | sonnet | 1/12 (8%) | US$ 0,15 | US$ 1,75 | 36s | rápido, mas raso |
| implement_hard | glm-or | 2/4 (50%) | US$ 0,49 | US$ 1,96 | 15m | acerta, mas é lento e gasta muitos tokens |
| implement_hard | codex-mid | 1/5 (20%) | US$ 0,15 | US$ 0,74 | 1m24s | barato e rápido, entrou tarde |
| implement | haiku | 1/8 (13%) | US$ 0,09 | US$ 0,68 | 2m | barato, acerto baixo |
| implement | minimax | 2/8 | US$ 0,03 | US$ 0,25 | 5m | muito barato, mas fez o patch no `node_modules` |
| implement | deepseek-flash / kimi / qwen-coder | 0/7 | US$ 0,06–0,30 | US$ 1,34 | 7–10m | inúteis aqui |
| implement_easy | minimax / glm-flash | 2/5 (40%) | US$ 0,03–0,05 | US$ 0,20 | 2–3m | bons para coisa simples |
| test_writer | sonnet | 33/33 | US$ 0,15 | **US$ 4,99** | 43s | custo multiplicado pelos refazimentos |
| test_writer | codex-mid | 9/9 | US$ 0,14 | US$ 1,40 | 2m | bom, mas errou a API do emulador |
| review_code | haiku | 20/20 (13✔ 7✖) | US$ 0,02 | US$ 0,53 | 23s | **melhor custo-benefício** |
| review_code | codex-mid | 16/16 (3✔ 13✖) | US$ 0,06 | US$ 1,01 | 43s | rigoroso, pegou bloqueadores reais |
| review_ui | haiku | 10/10 | US$ 0,03–0,20 | US$ 0,67 | 49s | bom, depois de corrigido o escopo |
| review_ui | gemini | 5/5 | US$ 0,10 | US$ 0,45 | 1m38s | bom |
| triage | gemini-lite | 11/11 | **US$ 0,002** | US$ 0,02 | 3s | ideal |
| triage | deepseek (pro) | 10/10 | US$ 0,13 | US$ 1,32 | 2m14s | caro para triagem, já removido |
| approval_parser | haiku | 4/4 | US$ 0,09 | US$ 0,35 | 5s | ok, mas rodou em dobro |
| retro | sonnet | 4/4 | US$ 0,16 | US$ 0,63 | 40s | ok |

**Usar mais:**
- codex-mid (GPT-6.1 Terra) em testes, implement_hard e revisão. Foi a escolha do Codex.
- haiku nas revisões.
- gemini-lite na triagem e no parser.
- minimax e glm-flash em fáceis e ajustes.

**Usar menos ou tirar:**
- opus só no inicializador.
- sonnet só na retro.
- kimi-pro por último, com timeout menor.
- glm-or como reserva.
- deepseek-flash, kimi e qwen-coder fora do implement.

## Plano para a etapa 2 (harness)

**Custo e loops (prioridade máxima):**
1. **Pausar sem progresso:** 2 modelos diferentes com o mesmo erro no mesmo gate fazem o harness parar e avisar. Não deve revezar todos os modelos.
2. **Rodar o teste novo antes de protegê-lo:** falha de infraestrutura (404/405, emulador, rota inexistente) volta para o test_writer.
3. **Teto:** perguntar antes da chamada que não cabe no que sobra. Nunca descartar o resultado de uma chamada já paga.
4. **Roteador por custo real por sucesso** (custo × tentativas, mais tempo), e não por preço de token.
5. **Filas no estilo Codex:**
   - test_writer: [codex-mid]
   - implement: [minimax, haiku, codex-mid]
   - implement_easy: [minimax, glm-flash, haiku]
   - implement_hard: [codex-mid, glm-or, kimi-pro]

**Robustez:**

6. **Saída dos modelos sem JSON frágil:** extrair o JSON de qualquer lugar da resposta, aceitar variações de chaves, validar com o schema e, na falha, fazer uma retentativa de formato com um modelo barato (gemini-lite) a partir do texto. Hoje vários modelos falham só no formato.
7. **Proibir alterar `node_modules`, lockfiles, dependências e scripts de infraestrutura** sem pedir, pelo prompt e com um gate de diff.
8. **G12 (Lighthouse) no gate da feature de correção,** para o implementador ver a nota.
9. **IDs `fix-K` e `adj-K` únicos e logs de tentativa que não se sobrescrevem.**
10. **Checar no planejamento** se o teste de uma feature depende de telas de etapas futuras, o caso da F-1.06.

**Fim de etapa e feedback humano:**

11. **Etapa com uma task final de "Correções e ajustes":** o humano escreve os ajustes no `APROVACAO.md` e eles viram features `adj` da mesma etapa. O harness roda só essas, refaz os gates da etapa e gera um novo checkpoint. A etapa só fecha com `aprovado`. Esse fluxo deve ficar explícito no checkpoint e no terminal.
12. **Ajuste ou feature `easy` sem test_writer:** o implementador ajusta o teste existente, e os gates e a revisão continuam valendo. Meta: menos de US$ 0,15 por ajuste.
13. **Revisão de UI só com as telas afetadas pelo diff.**
14. **Relatório da etapa mais claro** (`RELATORIO.md` e o bloco final do terminal): o que foi entregue, por tela, com captura; o que ficou de fora e por quê; custo por feature e por modelo; o que testar; o próximo comando.
15. **Investigar o approval_parser em dobro** e o "aprovação não processada".

**Medição:**

16. **Tempo ativo sem contar a espera nos prompts** (teto, confirmação).
17. **`watch`:** já tem a linha de caracteres. Falta mostrar a fase fora das chamadas (qual gate está rodando).

## Melhorias aplicadas antes da etapa 2

- **JSON das respostas:** o harness procura todos os objetos JSON da resposta e escolhe o que bate com o schema. Tolera vírgula sobrando e chaves em inglês. Se mesmo assim falhar, o papel `formatter` (gemini-lite, glm-flash ou haiku) só reescreve a resposta no formato, sem refazer o trabalho.
- **Sem progresso, pausa:** 2 modelos diferentes com a mesma assinatura de falha bloqueiam a feature, com o motivo "provável problema no teste, na spec ou no ambiente", em vez de girar a fila inteira.
- **Trabalho pago não se perde:**
  - se a chamada ao modelo terminou e o harness parou (teto, Ctrl+C), a retomada avalia o código sem chamar o modelo de novo;
  - a worktree fica guardada no bloqueio;
  - os logs de tentativa não são sobrescritos.
- **Testes de aceite rodam 1 vez antes de ficarem protegidos.** Uma triagem barata separa "falha porque o código ainda não existe" de "teste quebrado por si só" (API inexistente do emulador, dado normalizado, tela de feature futura). Quando o teste está quebrado, o test_writer refaz.
- **Contra trapaça nos testes:**
  - o G7 reprova linhas que mexem em `node_modules` ou usam patch-package;
  - os testes de features entregues ficam protegidos em modo "só cresce";
  - os prompts proíbem mexer em dependências, scripts e infraestrutura.
- **Roteador pelo custo de um sucesso:** (custo + tempo × US$ 2/h) ÷ taxa de acerto.
- **Filas:**
  - test_writer: [codex-mid, glm-or]
  - implement: [deepseek-flash, minimax, haiku, codex-mid]
  - implement_easy: [deepseek-flash, minimax, glm-flash, haiku]
  - implement_hard: [codex-mid, glm-or, kimi-pro], com o kimi-pro em timeout de 20 min.
- **deepseek-flash com 2ª chance:** foi o craque do harness do Codex. Aqui teve 0/3, mas só em F-1.03 e F-1.10, na fase dos bugs do harness e do revisor sem escopo, e por US$ 0,01 a 0,11 por tentativa. O histórico de implement dele foi zerado.
- **Ajustes do humano:** sem test_writer, na fila `implement_easy`. O `APROVACAO.md` e a confirmação explicam a rodada de ajustes da mesma etapa. A leitura do `APROVACAO.md` fica em cache (o approve não paga duas vezes).
- **Revisão de UI** só com as telas tocadas pelo diff.
- **Correções de gates da etapa** (Lighthouse etc.) rodam esses gates na própria feature de correção.
- **IDs de fix e adj únicos.**
- **RELATORIO.md** com tabela por feature, custo por modelo e próximos passos.
- **Tempo ativo** não conta a espera nos prompts.
- **`watch`:** um caractere por evento do modelo e, entre as chamadas, o gate que está rodando.
- **Menos tarefas e mais coesas:** a etapa 2 caiu de 12 para 9 features. O editor de indicador agora é uma feature só, e cada repositório vai junto com as regras dele. O review_features passa a reprovar fatiamento em "parte 1/parte 2".
- **test_writer só nas features críticas** (security-rules, statistics, privacy-mode e hard). Nas demais, o implementador escreve os testes na mesma sessão. O revisor confere a cobertura, e os testes ficam protegidos quando a feature é entregue.
- **Gates em camadas:**
  - em cada feature, o G6 roda só os e2e da própria feature;
  - os gates G8, G9 e G10 só rodam em features de UI ou de privacy-mode;
  - o G11 (visual) e a suíte e2e completa rodam no fim da etapa.
