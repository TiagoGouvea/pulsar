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
- [L-010] Decisão do humano: Tendências podem ser geradas para Fatores? → Não; só Resultados numéricos/escala (spec 6.2 'Tendência de um resultado') — Não; só Resultados numéricos/escala (spec 6.2 'Tendência de um resultado') (padrão)
- [L-011] Decisão do humano: Como ordenar os cartões elegíveis? → Razão efeito/limiar desc, depois dias pareados desc, depois hypothesisKey asc — Razão efeito/limiar desc, depois dias pareados desc, depois hypothesisKey asc (padrão)
- [L-012] Decisão do humano: Quais níveis de evidência rotular? → Só 'Descrição' e 'Possível associação'; sem 'sinal consistente' — Só 'Descrição' e 'Possível associação'; sem 'sinal consistente' (padrão)
- [L-013] Decisão do humano: O que o snapshot de like copia? → Tokens do texto, métricas, amostra, período e nome/sigla/emoji dos indicadores no momento; removível, nunca editável — Tokens do texto, métricas, amostra, período e nome/sigla/emoji dos indicadores no momento; removível, nunca editável (padrão)
- [L-014] Decisão do humano: Limites de tamanho de campos? → Sigla até 4 (exibida como digitada), nome 60, unidade 20, observação 500, opções ordinais 2-7 — Sigla até 4 (exibida como digitada), nome 60, unidade 20, observação 500, opções ordinais 2-7 (padrão)
- [L-015] Decisão do humano: Como representar 'sem resposta' em Sim/Não? → Tocar de novo na opção selecionada limpa a resposta e exclui o registro de hoje — Tocar de novo na opção selecionada limpa a resposta e exclui o registro de hoje (padrão)
- [L-016] Decisão do humano: Qual controle usar para escala? → Pílulas tocáveis até 11 valores; slider nativo acima disso — Pílulas tocáveis até 11 valores; slider nativo acima disso (padrão)
- [L-017] Decisão do humano: Como reordenar indicadores? → Botões subir/descer acessíveis — Botões subir/descer acessíveis (padrão)
- [L-018] Decisão do humano: Onde fica o histórico de registros? → A partir do indicador em Meus indicadores, exclusão com confirmação — A partir do indicador em Meus indicadores, exclusão com confirmação (padrão)
- [L-019] Decisão do humano: Quais rotas usar? → /onboarding, /dashboard, /register, /indicators, /saved-insights, /insights/:hypothesisKey, /settings, /install — /onboarding, /dashboard, /register, /indicators, /saved-insights, /insights/:hypothesisKey, /settings, /install (padrão)


# Papel: triagem de falha

Resuma a causa raiz da falha dos gates da feature F-1.10 Workspace de Cloud Functions com emulador. Não edite arquivos.

## Gates que falharam
### G2 lint-format
yarn run v1.23.0-20220130.1630
$ eslint . --max-warnings=0
Done in 1.01s.
yarn run v1.23.0-20220130.1630
$ prettier --check .
Checking formatting...
[[33mwarn[39m] dist/assets/DesignPage-CMS2MXH1.js
[[33mwarn[39m] dist/assets/index-C25T4tPZ.js
[[33mwarn[39m] dist/assets/index-DHyBZkT4.css
[[33mwarn[39m] dist/index.html
[[33mwarn[39m] src/design/__tests__/design-system.f002.test.tsx
[[33mwarn[39m] Code style issues found in 5 files. Run Prettier with --write to fix.
error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

### G6 e2e
yarn run v1.23.0-20220130.1630
$ sh scripts/port-lock.sh playwright test --grep-invert @visual
[WebServer] [WebServer] error pulsar-functions@: The engine "node" is incompatible with this module. Expected version "22". Got "24.22.1"
[WebServer] [WebServer] error Commands cannot run with an incompatible environment.
[WebServer] [WebServer] [WebServer] error Command failed with exit code 1.
Error: Process from config.webServer was not able to start. Exit code: 1

error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

### G8 privacy-leak
servidor não respondeu em http://localhost:4792 (yarn e2e:serve)

### G9 a11y
servidor não respondeu em http://localhost:4792 (yarn e2e:serve)

### G10 mobile-layout
servidor não respondeu em http://localhost:4792 (yarn e2e:serve)

## Final da resposta do implementador
, typecheck, test:unit, test:functions e e2e ficaram sem execução. A implementação foi feita só por leitura e escrita de arquivos, e não há resultado de teste para reportar.

**O que foi feito**

- **`app/functions/`** (novo workspace):
  - `package.json`: `main: lib/index.js`, `engines.node: 22`, script `build: tsc`, deps `firebase-functions ^6.3.0` e `firebase-admin ^13.4.0`.
  - `tsconfig.json`: `outDir: lib`, `strict: true`, `include: src`, exclui `__tests__`.
  - `src/index.ts`: `setGlobalOptions({ region: 'southamerica-east1', maxInstances: 10 })` e `export const healthcheck` como `onRequest({ invoker: 'private' })`.
- **`app/firebase.json`**: bloco `functions` (`source: functions`, `runtime: nodejs22`) e porta do emulador `functions: 5001`.
- **`app/package.json`**:
  - `test:functions`: builda o workspace e roda `vitest run --root functions` dentro de `emulators:exec --only functions`, com a trava de porta.
  - `e2e:serve`: builda as functions antes e inclui `functions` no `--only`.
- **`.gitignore` (raiz)**: adicionado `functions/lib/`.
- **`app/.prettierignore`**: contém `functions/lib`. O `eslint.config.js` já ignorava `functions/lib`.
- **`.harness/inbox/`**: uma entrada em `questions.jsonl` com os defaults escolhidos e duas em `risks.jsonl`.

**Pendências para o próximo passo (precisam de shell)**

1. `yarn --cwd app/functions install` para gerar o `yarn.lock` e instalar as deps. Sem isso, o build e o emulador não sobem.
2. Rodar `yarn --cwd app test:functions` e confirmar que `setup.test.ts` passa.
3. Rodar `yarn lint`, `yarn typecheck`, `yarn format:check` e `yarn test:unit` em `app/`.
4. Confirmar que `app/functions/src/index.ts` passa no ESLint, que o `format:check` aceita os arquivos novos e que o build do emulador não quebra.
5. Conferir `git diff app/.prettierignore`. A ferramenta reportou o arquivo como "updated", então ele pode ter sobrescrito conteúdo anterior.

Não há rota nova de tela, então `e2e/routes.json` não foi alterado.

```json
{
  "summary": "Workspace app/functions criado (TS, Node 22, firebase-functions v2, southamerica-east1, healthcheck privado), emulador functions:5001 no firebase.json, scripts test:functions e e2e:serve atualizados, functions/lib ignorado no git e no prettier. Nada foi executado: Bash negado na sessão.",
  "filesChanged": [
    "app/functions/package.json",
    "app/functions/tsconfig.json",
    "app/functions/src/index.ts",
    "app/firebase.json",
    "app/package.json",
    "app/.prettierignore",
    ".gitignore",
    ".harness/inbox/questions.jsonl",
    ".harness/inbox/risks.jsonl"
  ],
  "testsRun": [],
  "confidence": "low",
  "notes": "Bash negado em todas as tentativas (modo don't ask), então nenhum gate foi executado: lint, typecheck, format:check, test:unit, test:functions e e2e ficaram pendentes. Dependências de app/functions não instaladas (sem yarn.lock). Conferir git diff de app/.prettierignore (possível sobrescrita). Defaults escolhidos registrados em questions.jsonl."
}
```

Responda SOMENTE com o bloco ```json:
{"causaRaiz": "…", "categoria": "test|type|lint|logic|env|flaky|design", "padrao": true|false, "dica": "instrução curta e acionável para a próxima tentativa"}

`padrao: true` somente se for um erro recorrente que valha virar lição para outras features.
