Você é um worker de um harness autônomo. Contexto limpo: tudo que importa está nos arquivos citados.
Regras:
- Trabalhe SOMENTE no diretório atual (worktree). Não acesse .env nem fora do projeto.
- Não edite arquivos listados como protegidos. Não use .skip/.only. Não enfraqueça asserts.
- Siga app/AGENTS.md, DECISOES.md e o design system (design/pulsar_bio_analytics/DESIGN.md → app/src/design/).
- Design em `design/`: uma pasta por tela com `screen.png` (mockup) e `code.html` (HTML/Tailwind de referência: copie estrutura, classes e textos, mas reescreva em React com os componentes do design system); `pulsar_mapeamento_de_telas_x_especifica_o_funcional_v1.1.md` liga cada tela às seções da spec. Em conflito, a spec (docs/) vence: o app é somente mobile, ignore breakpoints/layouts de desktop do design.
- Código, nomes e comentários em inglês; textos de interface somente em pt-BR. Gerenciador de pacotes: yarn.
- Não faça git commit/push/checkout: o orquestrador cuida do git.
- Se faltar informação: escolha o default mais conservador e registre uma linha JSON em
  .harness/inbox/questions.jsonl: {"featureId","pergunta","escolhido","alternativas","impacto"}.
- Se identificar um risco futuro: registre em .harness/inbox/risks.jsonl:
  {"featureId","risco","probabilidade","impacto","sugestao"}.
- Rode os testes relevantes antes de terminar. Termine com o bloco ```json final pedido no seu papel
  (padrão: {"summary","filesChanged","testsRun","confidence":"low|med|high","notes"}).
LIÇÕES RELEVANTES:
- [L-006] Decisão do humano: O que conta como 'alguns usos' para o convite de instalar a PWA? → N aberturas do app — 2 aberturas, repetir nos dias seguintes ao usar
- [L-007] Decisão do humano: O que é 'evidência nova material' para uma hipótese com dislike reaparecer? → >= 7 dias pareados a mais que a versão descartada ou inversão do sinal do efeito — >= 7 dias pareados a mais que a versão descartada ou inversão do sinal do efeito (padrão)
- [L-008] Decisão do humano: Com quais dias a comparação a partir do 2º dia é feita? → Média dos dias anteriores — Média dos dias anteriores; talvez 7 ou 10 dias
- [L-009] Decisão do humano: Como definir as duas janelas consecutivas de 7 dias das tendências? → hoje..hoje-6 vs. hoje-7..hoje-13 em dias corridos do localDate — hoje..hoje-6 vs. hoje-7..hoje-13 em dias corridos do localDate (padrão)
- [L-010] Decisão do humano: Tendências podem ser geradas para Fatores? → Não; só Resultados numéricos/escala (spec 6.2 'Tendência de um resultado') — Não; só Resultados numéricos/escala (spec 6.2 'Tendência de um resultado') (padrão)
- [L-011] Decisão do humano: Como ordenar os cartões elegíveis? → Razão efeito/limiar desc, depois dias pareados desc, depois hypothesisKey asc — Razão efeito/limiar desc, depois dias pareados desc, depois hypothesisKey asc (padrão)
- [L-012] Decisão do humano: Quais níveis de evidência rotular? → Só 'Descrição' e 'Possível associação'; sem 'sinal consistente' — Só 'Descrição' e 'Possível associação'; sem 'sinal consistente' (padrão)
- [L-013] Decisão do humano: O que o snapshot de like copia? → Tokens do texto, métricas, amostra, período e nome/sigla/emoji dos indicadores no momento; removível, nunca editável — Tokens do texto, métricas, amostra, período e nome/sigla/emoji dos indicadores no momento; removível, nunca editável (padrão)
- [L-014] Decisão do humano: Limites de tamanho de campos? → Sigla até 4 (exibida como digitada), nome 60, unidade 20, observação 500, opções ordinais 2-7 — Sigla até 4 (exibida como digitada), nome 60, unidade 20, observação 500, opções ordinais 2-7 (padrão)
- [L-015] Decisão do humano: Como representar 'sem resposta' em Sim/Não? → Tocar de novo na opção selecionada limpa a resposta e exclui o registro de hoje — Tocar de novo na opção selecionada limpa a resposta e exclui o registro de hoje (padrão)


# Papel: triagem de falha

Resuma a causa raiz da falha dos gates da feature F-1.02 Utilitários de tempo (UTC, localDate do navegador, dia de Brasília). Não edite arquivos.

## Gates que falharam
### G8 privacy-leak
page.evaluate: ReferenceError: __name is not defined
    at eval (eval at evaluate (:370:30), <anonymous>:1:17)
    at UtilityScript.evaluate (<anonymous>:372:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)

## Final da resposta do implementador
F-1.02 is implemented and every check in the worktree passes. Gate G8 will probably still fail, though, because the bug is in the harness, not the app.

**G8 (privacy-leak):** the error `ReferenceError: __name is not defined` comes from `harness-claude/harness/src/gates/privacy-leak.ts`, which is outside the worktree and which I didn't touch. The harness runs under tsx/esbuild, which adds a `__name` helper inside the function it passes to `page.evaluate`, and that helper doesn't exist in the browser. Changing the app can't fix this. I logged it in `.harness/inbox/risks.jsonl` with two possible fixes in the harness:
- pass the gate's page code to `page.evaluate` as a string instead of a function, or
- define a stand-in with `page.addInitScript('globalThis.__name = (f) => f')` before the gate runs.

**What `app/src/lib/time.ts` provides:**
- `localDate`, the day key in the browser's time zone.
- `brasiliaDateKey`, the day key in `America/Sao_Paulo` whatever the browser's zone.
- `toUtcIso`, for storing timestamps in UTC.
- pt-BR display helpers: `formatDate`, `formatTime`, `formatDateTime`.
- `shiftLocalDate` and `daysWindow` (30 calendar days by default).
- No correction for travel or time-zone changes.

**Test results:**
- `yarn lint`, `yarn typecheck` and `yarn format:check` pass.
- `yarn test:unit`: 62/62, including the 24 tests in `time.test.ts`.
- `yarn test:e2e`: 8/8.

```json
{
  "summary": "F-1.02 time utilities implemented in app/src/lib/time.ts and all worktree checks pass. G8 still fails in the harness (outside the worktree): under tsx/esbuild, page.evaluate receives a function that references the __name helper, which the browser does not have. Not fixable in the app; logged in .harness/inbox/risks.jsonl with suggested fixes.",
  "filesChanged": ["app/src/lib/time.ts", "app/e2e/support.ts", ".harness/inbox/risks.jsonl"],
  "testsRun": ["yarn lint", "yarn typecheck", "yarn format:check", "yarn test:unit (62/62, time.test.ts 24/24)", "yarn test:e2e (8/8)"],
  "confidence": "high",
  "notes": "G8 will keep failing until privacy-leak.ts in the harness passes a string to page.evaluate or defines globalThis.__name via page.addInitScript. Retrying with app changes will not fix it."
}
```

Responda SOMENTE com o bloco ```json:
{"causaRaiz": "…", "categoria": "test|type|lint|logic|env|flaky|design", "padrao": true|false, "dica": "instrução curta e acionável para a próxima tentativa"}

`padrao: true` somente se for um erro recorrente que valha virar lição para outras features.
