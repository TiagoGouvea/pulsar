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
### G6 e2e
yarn run v1.23.0-20220130.1630
$ sh scripts/port-lock.sh playwright test --grep-invert @visual
[WebServer] [WebServer] error pulsar-functions@: The engine "node" is incompatible with this module. Expected version "^22". Got "24.22.0"
[WebServer] [WebServer] error Commands cannot run with an incompatible environment.
[WebServer] [WebServer] error Command failed with exit code 1.
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
Implementei a feature F-1.10, mas não consegui rodar nenhum teste nem lint: o Bash foi negado em todas as chamadas, então não houve `yarn install`, `yarn lint`, `typecheck`, `test:unit` nem o e2e. As verificações abaixo são só por leitura.

**Escolhas que fiz**
- `functions/` é um pacote próprio em CommonJS, Node `^22`, com `firebase-functions` v6 e um único `healthcheck` em `southamerica-east1` (via `setGlobalOptions`).
- Porta do emulador de functions: **5001**, a mesma que o teste protegido usa como padrão.
- `test:functions` compila as functions e roda `vitest run --root functions` dentro do emulador, com a trava de portas como os outros scripts.
- `emulators` e `e2e:serve` agora incluem `functions` e buildam antes.
- `app/functions/lib/` foi para o `.gitignore` da raiz. Lint e Prettier já ignoravam `functions/lib`, então não mexi neles.
- Não há tela nova, então não mexi em `routes.json` nem em `design/`.

**Arquivos alterados**
- `app/firebase.json`: bloco `functions` (source, predeploy, ignore) e `emulators.functions.port = 5001`.
- `app/package.json`: novo `test:functions`; `emulators` e `e2e:serve` com `functions`.
- `app/functions/package.json`, `app/functions/tsconfig.json`, `app/functions/src/index.ts`: novos.
- `.gitignore`: `app/functions/lib/`.

**Verificação por leitura**
- O teste protegido `setup.test.ts` não foi tocado.
- A porta, a URL `/demo-pulsar/southamerica-east1/healthcheck` e o 404 em `us-central1` batem com a config.
- `functions/lib` já estava ignorado em `eslint.config.js` e `.prettierignore`.
- O `vitest` do app só inclui `src/` e `scripts/`, então os testes de functions não entram no `test:unit`.

**Pendências**
- Antes de `test:functions`, é preciso rodar `yarn --cwd functions install` (L-030). Isso não foi feito.
- Os gates ainda precisam ser rodados, com o Bash liberado: `yarn lint`, `yarn typecheck`, `yarn format:check`, `yarn test:unit` e `yarn test:functions`.

```json
{
  "summary": "Workspace app/functions (Node ^22, firebase-functions v6, healthcheck em southamerica-east1), porta 5001 do emulador de functions no firebase.json, script test:functions com port-lock, emulators/e2e:serve incluindo functions, app/functions/lib no .gitignore. Nada rodado: Bash negado em todas as chamadas.",
  "filesChanged": [
    "app/firebase.json",
    "app/package.json",
    "app/functions/package.json",
    "app/functions/tsconfig.json",
    "app/functions/src/index.ts",
    ".gitignore"
  ],
  "testsRun": [],
  "confidence": "low",
  "notes": "Bash negado (don't-ask mode) em todas as chamadas: não rodei yarn install, lint, format:check, typecheck, test:unit nem test:functions. Verificação só por leitura. Pré-requisito para test:functions: yarn --cwd functions install. Porta 5001 escolhida para o emulador de functions (mesmo default do teste protegido). Sem tela nova: routes.json e design/ não alterados."
}
```

Responda SOMENTE com o bloco ```json:
{"causaRaiz": "…", "categoria": "test|type|lint|logic|env|flaky|design", "padrao": true|false, "dica": "instrução curta e acionável para a próxima tentativa"}

`padrao: true` somente se for um erro recorrente que valha virar lição para outras features.
