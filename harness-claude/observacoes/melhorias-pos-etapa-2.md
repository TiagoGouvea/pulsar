# Melhorias do harness depois da etapa 2

O que mudou, em que arquivos e por quê. Tudo saiu do que deu errado na etapa 2 (ver `etapa-2.md`) e das observações do Tiago. Os testes do harness passam: **51** (eram 44).

Legenda: **[P]** = mudança no projeto `pulsar-claude`; as demais são do harness.

---

## A. Menos intervenção manual

### 1. `harness unblock <id|all>` — novo comando
- **O que faz:** devolve uma feature `blocked` à fila: status `failing`, zera o orçamento da feature (`spendSince`) e deixa no máximo 2 tentativas (`attempts = min(attempts, máximo − 2)`). Se a etapa já estava em checkpoint, ela volta a `STAGE_RUNNING` para o `resume` funcionar.
- **Onde:** `src/orchestrator.ts` (`unblock`), `src/cli.ts`.
- **Por quê:** na etapa 2 eu editei o `features.json` à mão 3 vezes. Era frágil e dependia de mim.

### 2. `harness accept <id>` — novo comando
- **O que faz:** entrega na branch o código que está no worktree de uma feature reprovada **só em revisão**. Exige que os gates da última tentativa estejam verdes. Faz o commit `feat(F-x)` com `Accepted-by: human`, protege os testes novos (só podem crescer), remove o worktree, marca `passing` e registra um risco em `RISCOS.md`.
- **Onde:** `src/orchestrator.ts` (`accept`), `src/cli.ts`.
- **Por quê:** F-2.10 e F-2.08 foram aceitas por script que eu escrevi; na primeira vez errei os caminhos protegidos (prefixo `pulsar-claude/`). Agora é uma rotina testada que usa os mesmos passos de uma feature que passa normalmente.
- **Cuidado embutido:** recusa se os gates falharam, para não entregar código quebrado; descarta o `.harness` do worktree (rascunho de inbox) que bloquearia o merge.

### 3. Reparo automático de teste de aceite defeituoso
- **O que faz:** quando uma feature falha duas vezes seguidas com a **mesma assinatura de erro** e o erro aparece num teste de aceite dela, o harness chama um modelo de escrita de testes (`test_writer`, prompt novo `prompts/test_repair.md`) para decidir se o teste é o problema. Se for, ele corrige com a menor mudança, sem reduzir o número de asserts; o novo hash é registrado e a feature continua. Se o teste estiver certo, nada muda e a feature bloqueia como antes. Vale **uma vez por feature** (`testRepairs`).
- **Onde:** `src/orchestrator.ts` (`repairTest`), `src/features.ts` (`testRepairs`), `prompts/test_repair.md`.
- **Por quê:** F-2.01 (lint no teste), F-2.08 (corrida do teste offline) e as correções de fim de etapa bloquearam por **teste defeituoso**, e só eu conseguia destravar.

### 4. Feedback num arquivo só, na raiz do harness
- **O que faz:** cada checkpoint cria `feedback-etapa-N.md` na raiz de `harness-claude/`, já com `Status: (aprovado / ajustes)`, uma seção `## Ajustes` com um placeholder e a seção de dúvidas. `harness approve` lê esse arquivo (sem flags nem caminhos). Ao processar ajustes, o arquivo é arquivado como `feedback-etapa-N.rodada-K.md` e o próximo checkpoint cria um novo. Etapas antigas (`checkpoints/etapa-N/APROVACAO.md` + `DUVIDAS.md`) continuam sendo lidas.
- **Onde:** `src/checkpoint.ts` (`feedbackFile`, `buildCheckpoint`, parser de ajustes que agora termina no próximo título), `src/orchestrator.ts` (`approve`, `nextStep`), `src/cli.ts`, `README.md`, `HARNESS_PULSAR.md`.
- **Por quê:** observação do Tiago (arquivos de interação perto da raiz, processo claro, comando curto). Antes eram dois arquivos dois níveis abaixo. O arquivo antigo também ficava com o status velho depois de uma rodada de ajustes.

---

## B. Menos desperdício (o que mais custou)

### 5. Lint e formato dos testes antes de protegê-los
- **O que faz:** depois de escrever os testes, o harness roda o gate G2 (lint + formato). Se algum erro citar os arquivos de teste novos, o `test_writer` refaz uma vez com a saída do lint, antes de o hash ser registrado. Erros em outros arquivos são ignorados.
- **Onde:** `src/orchestrator.ts` (`lintErrorsIn`, `ensureAcceptanceTests`).
- **Por quê:** o teste da F-2.01 foi protegido com `'_name' is assigned a value but never used`. O implementador não pode editar teste protegido, então as 2 tentativas seguintes falharam no G2 (US$ 1,05 perdido).

### 6. Feature de correção para na 2ª falha idêntica, mesmo com o mesmo modelo
- **O que faz:** features `F-N.fix-*` bloqueiam na 2ª tentativa com a mesma assinatura de erro (antes só quando dois modelos diferentes falhavam igual). Antes de bloquear, o reparo do item 3 é tentado.
- **Onde:** `src/orchestrator.ts` (condição de "sem progresso").
- **Por quê:** F-2.fix-1 e F-2.fix-2 gastaram US$ 1,06 repetindo o mesmo erro do G11 com o codex-mid.

### 7. G11 (regressão visual) em features de UI, não só no fim da etapa
- **O que faz:** o G11 roda na feature com os `@visual` dos próprios specs (`yarn test:visual --pass-with-no-tests {tests}`), só em features com a tag `ui`; no fim da etapa roda todos. A configuração antiga era `scope: stage`.
- **Onde:** `harness.config.yaml` (G11).
- **Por quê:** os testes visuais da etapa 1 nunca tinham rodado e só falharam no fim da etapa 2, gerando 3 features de correção (US$ 1,34).

### 8. Revisão só reprova por `blocker` ou `major`; os `minor` viram pendência
- **O que faz:** `codeRules` e `uiRules` rejeitam se houver issue `blocker`/`major`, ou se o revisor reprovar sem listar motivo. Itens `minor` não reprovam e são gravados em `RISCOS.md`. Os critérios críticos de UI (c1–c3 ≥ 6) continuam valendo. Antes havia limites de nota (7 e 7,5).
- **Onde:** `src/evaluator.ts`, `src/orchestrator.ts` (registro dos menores).
- **Por quê:** a F-2.10 usou 5 tentativas (US$ 2,00) e a F-2.08 foi reprovada em UI (nota 7,2) por detalhes de acabamento.

### 9. Capturas da revisão de UI com dados do usuário de teste
- **O que faz:** uma rota em `routes.json` pode ter um campo `setup`: um trecho de JavaScript executado na página antes da captura. A sessão fica para as rotas seguintes. [P] Em `pulsar-claude/app/e2e/routes.json`, as rotas `register` e `indicators` entram como o usuário de teste (`seed-user-0001`), então a captura mostra indicadores e registros reais. Verifiquei gerando a captura de `/register`: aparecem Exercício, Sono, Café, Energia e Foco.
- **Onde:** `src/gates/browser.ts` (`forEachPage`, parâmetro `useSetup`), `src/gates/visual.ts`, [P] `e2e/routes.json`.
- **Por quê:** a revisão de UI da F-2.08 julgou uma tela vazia e não conseguiu avaliar a feature.

### 10. Diff por merge-base (causa do "diff apagando a F-2.03")
- **O que faz:** `diff` e `changedFiles` usam `base...HEAD` (merge-base) em vez de `base HEAD`.
- **Onde:** `src/git.ts`.
- **Por quê:** o revisor da F-2.10 viu o diff como "apaga o editor de indicadores" (nota 3) porque a F-2.03 entrou na branch enquanto a F-2.10 rodava; comparar com a ponta da branch mostrava a F-2.03 como remoção. Não era problema no worktree.

---

## C. Teto e custo

### 11. Fechar a etapa não depende de saldo
- **O que faz:** os papéis `approval_parser`, `retro`, `postmortem` e `formatter` não passam pelos tetos da etapa e da feature (continuam sob o teto do projeto e os tetos por provedor).
- **Onde:** `src/budget.ts` (`CAP_EXEMPT_ROLES`, `breach`), `src/invoke.ts` (passa o papel).
- **Por quê:** o `harness approve` falhou com "teto de orçamento atingido: stage" para ler um arquivo, uma chamada de centavos.

### 12. Aviso de orçamento com os números
- **O que faz:** os alertas (50/80/100%) mostram etapa e projeto: `orçamento em 80% (etapa US$ x/y · projeto US$ a/b)`.
- **Onde:** `src/orchestrator.ts` (`onSpend`).
- **Observação:** o aviso a 80% e a checagem **antes** de cada chamada, com o custo estimado (`breach` usa a média das últimas 20 chamadas do modelo no papel), **já existiam**; só faltava mostrar os valores.

### 13. `doctor` avisa se o Firebase CLI não existe
- **O que faz:** com o preview habilitado e sem `firebase` no PATH, o `doctor` mostra um aviso com a instrução de instalação.
- **Onde:** `src/doctor.ts`.
- **Por quê:** o preview não foi publicado nas etapas 1 e 2 (`firebase: command not found`), sem aviso antes.

---

## D. Já aplicado durante a etapa 2 (entra no mesmo commit)

- `yarn install` antes do test_writer, no worktree novo (`src/orchestrator.ts`). Sem isso a F-2.01 foi bloqueada na largada.
- Filas de modelos (`harness.config.yaml`): `implement = [codex-mid, minimax, deepseek-flash]`, `test_writer = [codex-mid]`, `implement_hard = [codex-mid, kimi-pro]`; timeout de minimax e deepseek-flash em 12 min.
- App só mobile: projeto `desktop` removido do Playwright, `VIEWPORTS` só mobile (G8, G11, capturas), G10 em 320 e 375 (`src/gates/browser.ts`, `src/gates/quality.ts`, prompts `review_ui.md` e `test_writer.md`).
- `HARNESS_VISUAL=1`: navegadores visíveis, e2e com `--headed --workers=1`, uma tarefa por vez (`src/config.ts`, `src/gates/*`, `src/orchestrator.ts`).
- Teto da etapa 2 em US$ 15,50 (`budget.yaml`), decidido pelo Tiago.
- [P] Já commitados antes: `3047154` (e2e só mobile), `8eca199` e `2b04794` (link "Registrar agora" no dashboard), integração das F-2.10 e F-2.08.

## E. O que não mudei

- **Item 5 do plano (testes novos contra a branch integrada):** já era assim. O worktree novo nasce no topo da branch e o dry-run do `test_writer` roda nele. O que sobra é a mudança *posterior* de outra feature (F-2.10 removeu o link de que o teste da F-2.08 dependia); o reparo do item 3 cobre o caso em que o defeito está no teste. Quando o defeito está no código, a feature precisa de ajuste, como aconteceu.
- **Item 10 do plano (worktree sempre do HEAD):** o worktree nasce no HEAD, e a causa real do problema era o diff (item 10 acima).
- Nenhum teto foi alterado por mim, só o do Tiago.

## F. Testes novos (`test/`)
- 13 `unblock` devolve a feature e ela conclui. 14 e 14b `accept` entrega / recusa com gates vermelhos. 15 feature de correção para na 2ª falha idêntica. 16 reparo do teste defeituoso. 17 feedback na raiz e revisão que só reprova por major/blocker. 18 lint no teste refeito antes de proteger. Atualizados: regras dos avaliadores e o fluxo de checkpoint/approve (agora com `feedback-etapa-N.md`).

## G. Pendente (decisão sua)
- **Teto do projeto:** US$ 64,56 de 68 gastos. Os tetos das etapas 3 a 7 somam US$ 33.
- Criar a branch da etapa 3 antes de `harness resume`.
