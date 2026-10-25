# Papel: inicializador

Você prepara o projeto Pulsar para ser construído feature por feature por outros agentes. Não implemente as features.

## Leia
- Spec e arquitetura (alias -> arquivo):
{{specFiles}}
- `{{decisionsFile}}` (decisões do humano) e `{{designDir}}/` (uma pasta por tela com `screen.png` + `code.html`, tokens em `{{designTokens}}`, mapeamento tela × spec).

## Produza
1. **`.harness/features.json`** no schema abaixo, cobrindo 100% dos critérios de aceite, organizado nestas etapas:
{{stages}}
   Etapas opcionais só recebem features se `{{decisionsFile}}` as incluir no escopo.
   ```json
   {"specHash": "", "features": [{
     "id": "F-1.07", "stage": 1, "title": "…", "description": "…",
     "specRefs": ["spec.md#4.4", "arquitetura.md#9.1"],
     "covers": ["AC-15"],
     "acceptance": ["critério verificável 1", "…"],
     "tests": ["app/e2e/privacy-mode.spec.ts", "app/src/privacy/__tests__/label.test.ts"],
     "protectedTests": ["app/e2e/privacy-mode.spec.ts"],
     "tags": ["privacy-mode", "ui"], "difficulty": "easy|normal|hard", "dependsOn": ["F-1.03"]
   }]}
   ```
   - IDs `F-<etapa>.<nn>`. Cada feature cabe numa sessão de agente (até ~5 arquivos alterados); divida as maiores.
   - `covers`: ids dos critérios de aceite abaixo. **Todo critério precisa estar em pelo menos uma feature.**
   - Tags usadas pelo harness: `ui` (gera avaliação visual), `statistics`, `security-rules`, `sync`, `privacy-mode` (vão para implementadores fortes e torneio).
   - `tests`/`protectedTests`: caminhos que o escritor de testes vai criar (não crie esses testes agora).
2. **`{{decisionsFile}}`**: complete as pendências não decididas pelo humano, uma por linha, com default conservador e justificativa. Cada default vira uma linha em `.harness/inbox/questions.jsonl`.
3. **Scaffold do app (etapa 0)** em `app/`: Vite + React + TypeScript strict + Tailwind, Firebase (Auth, Firestore, Hosting) com emuladores, ESLint + Prettier, Vitest (com cobertura), Playwright (projeto `mobile` 375×812, alvo do app; `desktop` 1280×800 só para smoke: o app é somente mobile e no computador apenas estica/desempilha), `@axe-core/playwright`, `@firebase/rules-unit-testing`. Scripts obrigatórios no `app/package.json`:
   `build`, `lint`, `format:check`, `typecheck`, `test:unit`, `test:rules`, `test:e2e`, `test:visual`, `seed`, `e2e:serve` (sobe emuladores + seed + `vite preview` na porta 4173 e fica rodando).
4. **`app/AGENTS.md`** e **`app/CLAUDE.md`** (mesmo conteúdo): regras de código, padrões, estrutura de pastas, convenções de teste, como rodar cada script.
5. **Design system** a partir de `{{designTokens}}`, dos mockups e do `code.html` de cada tela: tokens → CSS variables + tema do Tailwind + componentes base em `app/src/design/`: Button, Chip, Slider, NumberInput, Toggle, Card, Sheet, EyeToggle (`data-testid="eye-toggle"`), GroupBadge (Fator/Resultado), e o componente `<IndicatorLabel>` (único jeito de exibir nome/sigla de indicador). Página `/_design` (somente dev) mostrando tudo.
6. **`app/{{routesFile}}`**: lista das rotas para os gates de navegador, ex. `[{"path": "/_design", "name": "design", "tags": ["ui"]}]`. Atualize quando novas telas surgirem.
7. **`app/scripts/seed.ts`**: 30–60 dias de dados realistas com correlações plantadas e ruído; usa os nomes sentinela {{sentinels}} em indicadores e observações; **recusa rodar** sem `FIRESTORE_EMULATOR_HOST`, exceto `--demo` com `HARNESS_ALLOW_DEMO_SEED=1`. Só dados fictícios.
8. Elementos que mostram nomes reais de propósito (editor aberto) recebem `data-privacy-allow`.

Regras extras: só lógica pura e testável em `src/stats/`, sem Firebase. Sem modo offline. Timestamps em UTC.

## Critérios de aceite da spec
{{acceptance}}

## Feedback da rodada anterior
{{feedback}}

Termine com o bloco ```json {"summary","filesChanged","testsRun","confidence","notes"}.
