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

Resuma a causa raiz da falha dos gates da feature F-0.02 Tokens e componentes base do design system. Não edite arquivos.

## Gates que falharam
### G2 lint-format
yarn run v1.23.0-20220130.1630
$ eslint . --max-warnings=0
Done in 0.52s.
yarn run v1.23.0-20220130.1630
$ prettier --check .
Checking formatting...
[[33mwarn[39m] src/design/__tests__/design-system.f002.test.tsx
[[33mwarn[39m] Code style issues found in the above file. Run Prettier with --write to fix.
error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

## Final da resposta do implementador
All the feature requirements are already met. Here's the summary:

**Existing components** (all implemented by the initializer):
- `tokens.css` — CSS variables + `@theme` with colors, typography, radii, spacing
- `Button` — primary/factor/neutral/ghost/danger variants, md/lg sizes
- `Chip` — pill toggle with selected/unselected states, factor/result/neutral tones
- `Slider` — pill bar for ≤11 discrete values, native range fallback for more
- `NumberInput` — stepper buttons with +/- controls, decimal input
- `Toggle` — labelled switch for settings
- `Card` — level-1 surface with rounded-lg and shadow
- `Sheet` — bottom sheet modal with escape/dimmer close
- `GroupBadge` — distinguishes **Fator** (indigo, icon `input`) and **Resultado** (violet, icon `insights`) by text + icon + color
- `Icon` — Material Symbols Outlined wrapper
- `EyeToggle`, `IndicatorLabel` — privacy-aware components
- `index.ts` — re-exports all components

**Verification results:**
- `yarn lint` — zero warnings ✅
- `yarn typecheck` — clean ✅
- `yarn test:unit` — all 34 tests pass ✅
- `yarn format:check` — fails only on the protected test file (pre-existing formatting from initializer commit `59fd811`, I cannot edit protected tests)

**Lessons already addressed:**
- G4: `--coverage` already removed from `test:unit` script; coverage configured via `vitest.config` block ✅
- G10: Touch targets already ≥44px — Slider radios use `min-w-[44px]`, Toggle uses `h-11 w-12`, NumberInput steppers use `h-12 w-12` ✅

```json
{
  "summary": "F-0.02 já implementado pelo inicializador. Todos os componentes (Button, Chip, Slider, NumberInput, Toggle, Card, Sheet, GroupBadge, Icon, EyeToggle, IndicatorLabel) e tokens.css existem e exportam via index.ts. GroupBadge distingue Fator/Resultado por texto+ícone+cor. Touch targets ≥44px em todos controles interativos.",
  "filesChanged": [],
  "testsRun": 34,
  "confidence": "high",
  "notes": "Feature já concluída na inicialização (commit 59fd811). format:check falha no arquivo protegido design-system.f002.test.tsx — problema pré-existente do inicializador, não posso editar testes protegidos."
}
```

Responda SOMENTE com o bloco ```json:
{"causaRaiz": "…", "categoria": "test|type|lint|logic|env|flaky|design", "padrao": true|false, "dica": "instrução curta e acionável para a próxima tentativa"}

`padrao: true` somente se for um erro recorrente que valha virar lição para outras features.
