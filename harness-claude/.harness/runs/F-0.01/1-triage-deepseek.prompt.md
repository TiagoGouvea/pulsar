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

Resuma a causa raiz da falha dos gates da feature F-0.01 Scaffold: Vite, TypeScript, Tailwind, lint e Vitest. Não edite arquivos.

## Gates que falharam
### G4 unit
yarn run v1.23.0-20220130.1630
$ vitest run --coverage --coverage
file:///Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-0.01/pulsar-claude/app/node_modules/vitest/dist/chunks/cac.BfaZ95xE.js:1269
			throw new Error(`Expected a single value for option "${command}", received [${received}]`);
			      ^

Error: Expected a single value for option "--coverage ", received [true, true]
    at transform (file:///Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-0.01/pulsar-claude/app/node_modules/vitest/dist/chunks/cac.BfaZ95xE.js:1269:10)
    at setDotProp (file:///Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-0.01/pulsar-claude/app/node_modules/vitest/dist/chunks/cac.BfaZ95xE.js:207:22)
    at CAC.mri (file:///Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-0.01/pulsar-claude/app/node_modules/vitest/dist/chunks/cac.BfaZ95xE.js:591:9)
    at CAC.parse (file:///Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-0.01/pulsar-claude/app/node_modules/vitest/dist/chunks/cac.BfaZ95xE.js:508:27)
    at file:///Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-0.01/pulsar-claude/app/node_modules/vitest/dist/cli.js:27:13
    at ModuleJob.run (node:internal/modules/esm/module_job:561:25)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async node:internal/modules/esm/loader:647:26
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:101:5)

Node.js v24.22.1
error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

### G10 mobile-layout
ype="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w375: alvo de toque 26x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w375: alvo de toque 26x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w375: alvo de toque 26x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w375: alvo de toque 26x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w375: alvo de toque 26x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w375: alvo de toque 26x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w375: alvo de toque 26x44 < 44px: <button type="button" role="radio" aria-checked="true" class="flex h-11 min-w-0 
design/w375: alvo de toque 26x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w375: alvo de toque 26x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w375: alvo de toque 26x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w375: alvo de toque 48x28 < 44px: <button type="button" role="switch" aria-checked="false" aria-label="Lembrete di
design/w414: alvo de toque 226x36 < 44px: <input inputmode="decimal" placeholder="—" class="w-full bg-transparent text-cen
design/w414: alvo de toque 30x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w414: alvo de toque 30x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w414: alvo de toque 30x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w414: alvo de toque 30x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w414: alvo de toque 30x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w414: alvo de toque 30x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w414: alvo de toque 30x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w414: alvo de toque 30x44 < 44px: <button type="button" role="radio" aria-checked="true" class="flex h-11 min-w-0 
design/w414: alvo de toque 30x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w414: alvo de toque 30x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w414: alvo de toque 30x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w414: alvo de toque 48x28 < 44px: <button type="button" role="switch" aria-checked="false" aria-label="Lembrete di

## Final da resposta do implementador
Não alterei nenhum arquivo nesta tentativa. Não consegui rodar `yarn lint`, `typecheck`, `format:check`, `test:unit` nem `build`, porque a execução do Bash foi negada (modo "don't ask"). Isso vale para a verificação que eu faria com `yarn install`. Não tentei contornar a negação.

O que consegui ler (`package.json`, `eslint.config.js`, `vite.config.ts`, `tsconfig.json`, `index.html`) indica que o scaffold já cumpre os critérios, mas nenhum comando foi executado:
- **Scripts:** `build`, `lint`, `format:check`, `typecheck` e `test:unit` existem no `package.json`.
- **Cobertura:** `test:unit` usa `vitest run --coverage`, e `vite.config.ts` define `provider: 'v8'`.
- **TypeScript:** o `tsconfig.json` tem `strict: true` e `noUncheckedIndexedAccess: true`.
- **Idioma:** `index.html` tem `<html lang="pt-BR">` e nenhum outro atributo `lang`.
- **Lint em `src/stats/`:** `no-restricted-imports` bloqueia `firebase`, `firebase/*`, `react` e `react-*`. O teste protegido espera erro para `firebase`, `firebase/app`, `react` e `react-dom/client`, e o padrão `react-*` cobre `react-dom/client`.

Para fechar a feature, preciso que alguém (você ou o orquestrador) rode `cd app && yarn install --frozen-lockfile && yarn lint && yarn typecheck && yarn format:check && yarn test:unit && yarn build`. Se algum falhar, me passe a saída e eu corrijo. Se preferir, libere o Bash e eu rodo.

```json
{
  "summary": "No changes made. Scaffold files already appear to satisfy F-0.01 on static inspection, but I could not run any checks because Bash execution was denied.",
  "filesChanged": [],
  "testsRun": [],
  "confidence": "low",
  "notes": "Unverified: lint, typecheck, format:check, test:unit and build were never run. Needs a run from app/ (yarn install --frozen-lockfile first) to confirm."
}
```

Responda SOMENTE com o bloco ```json:
{"causaRaiz": "…", "categoria": "test|type|lint|logic|env|flaky|design", "padrao": true|false, "dica": "instrução curta e acionável para a próxima tentativa"}

`padrao: true` somente se for um erro recorrente que valha virar lição para outras features.
