# Observações — etapa 2 (Registro)

Branch `2-registro`. **Custo final: US$ 15,10** da etapa (teto 9 → 12 → 15 → 15,50) e **US$ 64,56** no acumulado do projeto (teto 68).
- 10 de 12 features entregues: as 8 planejadas, a F-1.06 (veio da etapa 1) e a F-2.fix-3. As F-2.fix-1 e F-2.fix-2 ficaram bloqueadas.
- F-2.08 e F-2.10 foram aceitas por você com pendências (estado vazio do preenchimento rápido; agradecimento por dia no dashboard).
- Cerca de 4 h de execução. O preview online não foi publicado (`firebase: command not found`, como na etapa 1).

## Observações do Tiago

**Geral:**
- Sensação de que é meio inevitável ter um agente em paralelo destravando, revertendo um estado aqui ou ali e dando algo por pronto para não ficar em loop infinito.
- Salvar os arquivos com que o humano precisa interagir mais perto da raiz do projeto, e deixar o processo de feedback mais claro: um `feedback.md` por etapa, já com um ou dois placeholders.
- O comando de feedback do harness do Codex é longo demais para dar um feedback: `yarn harness feedback import --config .../harness.config.yaml --run run-mvnyl7vo-04a32244 --milestone 2-registro --task human-corrections --file .../human-review.md`.

**Claude:**
- Esbarrou em muitos casos em que o tester reprovava a feature, e foi preciso ir lá e resolver para destravar o processo.
- Gastou tudo e muito mais, caro demais, e o resultado final não ficou tão incrível.

## Observações do Claude

### O que deu errado
- O worktree novo não tinha `node_modules` e o test_writer rodava antes do `yarn install`: F-2.01 bloqueada logo na largada.
- O teste de aceite foi protegido com erro de lint que o implementador não pode corrigir: 2 tentativas perdidas na F-2.01.
- O teste offline da F-2.08 desligava a rede antes do cartão carregar (corrida no teste): 5 tentativas, US$ 3,08.
- Um teste da F-2.08 dependia do link "Registrar agora" no dashboard, que a F-2.10 removeu: conflito entre features.
- Os testes visuais (G11) da etapa 1 só rodam no fim da etapa 2: nunca tinham sido validados e geraram 3 features de correção.
- F-2.fix-1 e fix-2 gastaram US$ 1,06 repetindo o mesmo erro no mesmo teste.
- O codex-mid repetiu a mesma falha 5 vezes (a regra de "sem progresso" só olha dois modelos diferentes).
- A F-2.10 foi reprovada 4 vezes por itens menores de revisão e usou 5 tentativas (US$ 2,00).
- O worktree da F-2.10 nasceu de um commit sem a F-2.03 e o diff parecia apagar o editor de indicadores.
- Modelos editaram testes protegidos (violação do G7) em F-2.08 e F-2.10.
- A revisão de UI da F-2.08 julgou uma captura sem indicadores: não dava para ver a feature (nota 7,2).
- Timeouts de 27–30 min em minimax e deepseek-flash.
- `harness approve` falhou porque a leitura da aprovação passa pelo teto da etapa (US$ 15,10 de 15).
- Não existe comando para desbloquear uma feature: editei `features.json` à mão 3 vezes.
- Integrei a F-2.10 e a F-2.08 por script próprio e errei o prefixo dos caminhos protegidos na primeira vez.
- Minhas estimativas de custo erraram para baixo (disse US$ 3–5 para a etapa; foram US$ 15).
- Testes de desktop e 3 larguras no G10 encareciam tudo sem necessidade (app só mobile).

### O que poderia ser melhor
- Um comando `harness unblock <id>` e outro `harness accept <id>` (integra, protege testes, remove worktree).
- Preparar o worktree (instalar dependências) antes de qualquer chamada paga.
- Rodar lint e formato nos testes antes de protegê-los.
- Rodar os testes de aceite novos contra a branch integrada antes de protegê-los (pega conflito entre features).
- Rodar G11 uma vez no fim da etapa anterior ou em features `ui`, não só no fim da etapa seguinte.
- Parar a feature de correção na 2ª tentativa se a assinatura do erro não mudar, mesmo com o mesmo modelo.
- Só reprovar revisão por `blocker`/`major`; itens `minor` viram pendência.
- Tirar as capturas de revisão de UI com dados semeados na rota da feature.
- Isentar `approval_parser` e `retro` da checagem de teto (fechar etapa não deve depender de saldo).
- Avisar o teto ao chegar a 80% e checar com o custo estimado da próxima chamada.
- Criar o worktree sempre a partir do HEAD da branch.
- `doctor` verificar se o Firebase CLI existe (preview falhou duas etapas seguidas).

### Consumo e desempenho por modelo (etapa 2)
| Papel | Modelo | Resultado | Custo/chamada | Total | Tempo médio |
|---|---|---|---|---|---|
| implement_hard | codex-mid | 4/27 (15%)* | 0,122 | 3,31 | 51 s |
| implement_hard | kimi-pro | 0/1 | 0,851 | 0,85 | 3m13 |
| implement | minimax | 3/5 (60%) | 0,101 | 0,50 | 16 min |
| implement | haiku | 1/3 (33%) | 0,711 | 2,13 | 3m49 |
| implement | deepseek-flash | 0/2 | 0,162 | 0,32 | 27 min |
| test_writer | codex-mid | 9/9 | 0,118 | 1,06 | 1 min |
| test_writer | glm-or | 2/2 | 1,167 | 2,33 | 11 min |
| review_code | haiku | 10/10 (8✔ 2✖) | 0,201 | 2,01 | 21 s |
| review_code | sonnet | 2/2 | 0,230 | 0,46 | 25 s |
| review_code | gemini-argon / codex-mid | 1/1 cada | 0,150 / 0,094 | 0,24 | ~1 min |
| review_ui | haiku | 7/7 (5✔ 2✖) | 0,177 | 1,24 | 25 s |
| review_ui | gemini | 1/1 | 0,075 | 0,07 | 1m11 |
| triage | gemini-lite | 22/22 | 0,004 | 0,08 | 5 s |
| retro | sonnet | 1/1 | 0,373 | 0,37 | 58 s |

\* A taxa do codex-mid está distorcida: 11 falhas do G11 foram em features de correção para um teste que falhava sozinho.

- **codex-mid:** melhor escritor de testes (9/9, US$ 0,12, 1 min); como implementador é rápido e barato, mas viola testes protegidos e não resolve erro de teste ou de ambiente.
- **minimax:** entregou F-1.06, F-2.09 e F-2.11 por US$ 0,50 no total; o problema é o tempo (16 min, 2 timeouts).
- **haiku:** caro como implementador (US$ 0,71 por chamada); como revisor é confiável, mas 15 chamadas somam US$ 3,25.
- **glm-or e kimi-pro:** caros por chamada (US$ 1,17 e US$ 0,85) sem ganho sobre o codex-mid.
- **deepseek-flash:** 0/2 e 27 min por tentativa; só serve na triagem.
- **gemini-lite:** 22/22 na triagem a US$ 0,004; melhor custo-benefício da etapa.
- **sonnet:** bom revisor e na retro, caro demais para implementar.

### Usar mais / menos
- **Mais:** gemini-lite (triagem), codex-mid (testes e implementação), minimax (features simples), gemini (revisão de UI), gemini-argon e codex-mid (revisão de código).
- **Menos:** haiku como implementador, kimi-pro, glm-or, deepseek-flash (só triagem).

### Já aplicado durante a etapa
- Fila: `implement = [codex-mid, minimax, deepseek-flash]`, `test_writer = [codex-mid]`, `implement_hard = [codex-mid, kimi-pro]`; timeout de minimax/deepseek-flash em 12 min.
- `yarn install` antes do test_writer.
- App só mobile: projeto `desktop` removido do Playwright; G8/G11/revisão em 375×812; G10 em 320 e 375.
- `HARNESS_VISUAL=1`: navegadores visíveis, e2e com `--headed --workers=1`, uma tarefa por vez.

### Plano para a etapa 3
0. Menos intervenção manual (observação do Tiago): `unblock`/`accept`, feature reprovada por teste defeituoso destravada pelo próprio harness, sem agente em paralelo.
0. Feedback simples: um `feedback-etapa-N.md` na raiz do harness, criado com placeholders; `harness approve` lê esse arquivo (sem flags, sem caminhos).
1. Implementar `unblock` e `accept` e a isenção de teto no fechamento da etapa.
2. Lint dos testes e dry-run contra a branch integrada antes de proteger.
3. Parar feature de correção na 2ª tentativa com a mesma assinatura de erro.
4. Reprovar revisão só por `blocker`/`major`.
5. Capturas de UI com dados semeados.
6. Decidir o teto do projeto: restam US$ 3,44 para as etapas 3 a 7 (tetos somam US$ 33).
