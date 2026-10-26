# Pulsar app — guia para agentes

Leia antes de qualquer mudança: `../docs/Pulsar_Especificacao_Completa.md` (spec, vence conflitos),
`../docs/Pulsar_Arquitetura_e_Implementacao.md`, `../DECISOES.md` e `../design/` (uma pasta por tela com
`screen.png` + `code.html`; tokens em `../design/pulsar_bio_analytics/DESIGN.md`).

## Regras inegociáveis

- Código, nomes, comentários e mensagens de commit em **inglês**; textos de interface **somente pt-BR**.
- App **somente mobile** (alvo 375×812). No computador o layout só estica/desempilha (coluna central até 960 px). Ignore breakpoints de desktop do `code.html`.
- **Sem modo offline**, sem app nativo, sem login por telefone/senha, sem outros idiomas.
- **Timestamps em UTC** (`Timestamp`/ISO). O dia do registro (`localDate`, `YYYY-MM-DD`) é calculado no cliente pelo fuso do navegador. A quota da IA e o lembrete usam o dia de `America/Sao_Paulo`.
- `src/stats/` contém **só lógica pura e determinística** (sem Firebase, React, DOM, `Date.now()` implícito: receba `today` por parâmetro). O ESLint bloqueia imports de `firebase`/`react` ali.
- Nome/sigla/emoji de indicador **só** via `<IndicatorLabel>` (ou `indicatorLabel()` de `src/privacy/label.ts` para textos). Olho fechado = sigla e sem emoji. Gráficos não são mascarados.
- Elementos que mostram nomes reais de propósito (ex.: editor aberto) recebem `data-privacy-allow`.
- Nunca leia/edite `.env`. Nunca rode seed fora do emulador. Não use `.skip`/`.only` nem enfraqueça asserts. Não edite testes protegidos listados em `../.harness/features.json`.
- Prefira código mínimo; antes de criar função/componente, procure algo equivalente (`grep -r` em `src/`) e reutilize.

## Estrutura

```
src/
  design/      tokens.css (CSS variables + @theme do Tailwind) e componentes base:
               Button, Chip, Slider, NumberInput, Toggle, Card, Sheet, EyeToggle (data-testid="eye-toggle"),
               GroupBadge (Fator/Resultado), Icon (Material Symbols em SVG; ícone novo: adicione o nome
               em scripts/icons.ts e rode `yarn icons`, nunca importe a fonte de 3,6 MB), IndicatorLabel.
               Exporte em design/index.ts.
  privacy/     PrivacyContext (estado global do olho) e label.ts (regra nome ↔ sigla).
  stats/       estatística pura (agregação, comparações, tendências, associações, seleção de cartões, templates).
  lib/         firebase.ts (init + emuladores), env.ts, utilitários genéricos.
  pages/       uma página por rota; DesignPage = /_design (somente builds com emulador/dev).
  features/    (a criar) código por domínio: auth, indicators, records, insights, curation, settings.
  test/        setup do Vitest.
scripts/       seed.ts (escreve no emulador) + seed-data.ts (dataset puro e testável).
tests/rules/   testes de Security Rules (@firebase/rules-unit-testing).
e2e/           Playwright: routes.json (rotas dos gates), support.ts, *.spec.ts.
functions/     (etapa 1+) Cloud Functions v2 em southamerica-east1.
```

## Padrões

- React 19 + React Router 7 (`createBrowserRouter` em `src/App.tsx`). Componentes funcionais, named exports (exceto páginas lazy, que usam default).
- Tailwind v4 com tokens do design system (`bg-surface`, `text-on-surface`, `font-display` etc. definidos em `tokens.css`). Não use cores/hex soltos; acrescente tokens se faltar.
- TypeScript strict com `noUncheckedIndexedAccess`. Sem `any`.
- Acesso a Firestore isolado em repositórios por domínio; componentes não chamam o SDK diretamente.
- Todo novo caminho de tela entra em `e2e/routes.json` (`{"path","name","tags":["ui"]}`) para os gates de navegador e captura visual.
- Rotas definidas em `../DECISOES.md`: `/onboarding`, `/dashboard`, `/register`, `/indicators`, `/saved-insights`, `/insights/:hypothesisKey`, `/settings`, `/install`.

## Testes

- Unitários (Vitest + Testing Library, jsdom): `src/**/__tests__/*.test.ts(x)` e `scripts/__tests__/`. Estatística exige testes de borda abaixo/igual/acima de cada limiar da spec 6.5.1.
- Rules: `tests/rules/*.test.ts`, rodam dentro do emulador do Firestore.
- E2E: `e2e/*.spec.ts`, projeto `mobile` (375×812) é o alvo; `desktop` (1280×800) só smoke de layout. Testes visuais marcados com `@visual` no título.
- Sentinelas do seed (`ZQX_ENERGIA_7F3`, `ZQX_SONO_9K2`, `ZQX_FOCO_4M8`, `ZQX_OBS_NOTA_5T1`) nunca podem aparecer com o olho fechado fora de `[data-privacy-allow]`.
- Usuário do seed: `seed-user-0001`; usuários novos são criados pelos próprios testes (anônimos no Auth Emulator).

## Scripts (`yarn <script>` dentro de `app/`)

| script                    | o que faz                                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------------------------- |
| `dev`                     | Vite dev server (5173), usa emuladores                                                                |
| `build`                   | build de produção em `dist/`                                                                          |
| `build:emulator`          | build apontando para emuladores (libera `/_design`)                                                   |
| `lint`                    | ESLint, zero warnings                                                                                 |
| `format` / `format:check` | Prettier (com plugin Tailwind)                                                                        |
| `typecheck`               | `tsc --noEmit`                                                                                        |
| `test:unit`               | Vitest com cobertura v8                                                                               |
| `test:rules`              | sobe emulador do Firestore e roda `tests/rules`                                                       |
| `test:e2e`                | Playwright (exceto `@visual`); sobe `e2e:serve` se 4173 estiver livre                                 |
| `test:visual`             | screenshots `@visual` em `test-results/visual/`                                                       |
| `seed`                    | popula o emulador (recusa sem `FIRESTORE_EMULATOR_HOST`; `--demo` só com `HARNESS_ALLOW_DEMO_SEED=1`) |
| `emulators`               | Auth + Firestore emulados (projeto `demo-pulsar`)                                                     |
| `e2e:serve`               | build com emuladores + emuladores + seed + `vite preview` na porta 4173 (fica rodando)                |

Portas: Firestore 8282, Auth 9299 (fonte única: `firebase.json`, lida por `src/lib/firebase.ts`), preview 4173. Antes de terminar uma tarefa rode no mínimo
`yarn lint && yarn typecheck && yarn format:check && yarn test:unit` e os testes da feature.
