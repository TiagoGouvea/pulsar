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
(nenhuma)


# Papel: triagem de falha

Resuma a causa raiz da falha dos gates da feature F-0.07 Página /_design (somente dev/emulador). Não edite arquivos.

## Gates que falharam
### G2 lint-format
yarn run v1.23.0-20220130.1630
$ eslint . --max-warnings=0
Done in 1.42s.
yarn run v1.23.0-20220130.1630
$ prettier --check .
Checking formatting...
[[33mwarn[39m] src/pages/DesignPage.tsx
[[33mwarn[39m] Code style issues found in the above file. Run Prettier with --write to fix.
error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

### G4 unit
js/react-dom-client.development.js:18985:11)[0m
    [36m</pre>[39m
    [36m<p>[39m
      [0m💿 Hey developer 👋[0m
    [36m</p>[39m
    [36m<p>[39m
      [0mYou can provide a way better UX than this when your app throws errors by providing your own [0m
      [36m<code[39m
        [33mstyle[39m=[32m"padding: 2px 4px; background-color: rgba(200, 200, 200, 0.5);"[39m
      [36m>[39m
        [0mErrorBoundary[0m
      [36m</code>[39m
      [0m or[0m
      [0m [0m
      [36m<code[39m
        [33mstyle[39m=[32m"padding: 2px 4px; background-color: rgba(200, 200, 200, 0.5);"[39m
      [36m>[39m
        [0merrorElement[0m
      [36m</code>[39m
      [0m prop on your route.[0m
    [36m</p>[39m
  [36m</div>[39m
[36m</body>[39m
[36m [2m❯[22m usePrivacy src/privacy/PrivacyContext.tsx:[2m23:19[22m[39m
    [90m 21| [39m[35mexport[39m [35mfunction[39m [34musePrivacy[39m()[33m:[39m [33mPrivacyState[39m {
    [90m 22| [39m  [35mconst[39m ctx [33m=[39m [34museContext[39m([33mPrivacyContext[39m)[33m;[39m
    [90m 23| [39m  if (!ctx) throw new Error('usePrivacy must be used inside <PrivacyPr…
    [90m   | [39m                  [31m^[39m
    [90m 24| [39m  [35mreturn[39m ctx[33m;[39m
    [90m 25| [39m}
[90m [2m❯[22m EyeToggle src/design/EyeToggle.tsx:[2m6:43[22m[39m
[90m [2m❯[22m Object.react_stack_bottom_frame node_modules/react-dom/cjs/react-dom-client.development.js:[2m28571:20[22m[39m
[90m [2m❯[22m renderWithHooks node_modules/react-dom/cjs/react-dom-client.development.js:[2m8030:22[22m[39m
[90m [2m❯[22m updateFunctionComponent node_modules/react-dom/cjs/react-dom-client.development.js:[2m10569:19[22m[39m
[90m [2m❯[22m beginWork node_modules/react-dom/cjs/react-dom-client.development.js:[2m12205:18[22m[39m
[90m [2m❯[22m runWithFiberInDEV node_modules/react-dom/cjs/react-dom-client.development.js:[2m1048:13[22m[39m
[90m [2m❯[22m performUnitOfWork node_modules/react-dom/cjs/react-dom-client.development.js:[2m19176:22[22m[39m
[90m [2m❯[22m workLoopSync node_modules/react-dom/cjs/react-dom-client.development.js:[2m19004:41[22m[39m
[90m [2m❯[22m waitForWrapper node_modules/@testing-library/dom/dist/wait-for.js:[2m163:27[22m[39m
[90m [2m❯[22m node_modules/@testing-library/dom/dist/query-helpers.js:[2m86:33[22m[39m
[90m [2m❯[22m src/__tests__/designRoute.test.tsx:[2m20:25[22m[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯[22m[39m


[2m Test Files [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m6 passed[39m[22m[90m (7)[39m
[2m      Tests [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m37 passed[39m[22m[90m (38)[39m
[2m   Start at [22m 15:12:06
[2m   Duration [22m 2.15s[2m (transform 315ms, setup 1.25s, collect 718ms, tests 2.33s, environment 3.13s, prepare 566ms)[22m

error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

## Final da resposta do implementador
```json
{
  "summary": "Catálogo /_design ampliado com tokens, tipografia, ícones e labels privados.",
  "filesChanged": ["app/src/pages/DesignPage.tsx"],
  "testsRun": ["Static route checks: passed", "lint/typecheck/unit/e2e/format:check: bloqueados por dependências ausentes"],
  "confidence": "med",
  "notes": "yarn install falhou por ENOTFOUND registry.yarnpkg.com. Testes protegidos permaneceram intactos."
}
```

Responda SOMENTE com o bloco ```json:
{"causaRaiz": "…", "categoria": "test|type|lint|logic|env|flaky|design", "padrao": true|false, "dica": "instrução curta e acionável para a próxima tentativa"}

`padrao: true` somente se for um erro recorrente que valha virar lição para outras features.
