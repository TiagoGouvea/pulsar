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

Resuma a causa raiz da falha dos gates da feature F-1.03 Acesso anônimo automático e documento do usuário. Não edite arquivos.

## Gates que falharam
### G6 e2e
────────

    Test timeout of 30000ms exceeded.

    Error: page.waitForLoadState: Test timeout of 30000ms exceeded.

      11 |
      12 |     await page.goto(route.path);
    > 13 |     await page.waitForLoadState('networkidle');
         |                ^
      14 |
      15 |     expect(errors).toEqual([]);
      16 |     await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
        at /Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-1.03/pulsar-claude/app/e2e/routes.spec.ts:13:16

    Error Context: test-results/routes-route-dashboard-dashboard-passes-browser-gates-desktop/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/routes-route-dashboard-dashboard-passes-browser-gates-desktop/trace.zip
    Usage:

        yarn playwright show-trace test-results/routes-route-dashboard-dashboard-passes-browser-gates-desktop/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    Test timeout of 30000ms exceeded.

    Error: page.waitForLoadState: Test timeout of 30000ms exceeded.

      11 |
      12 |     await page.goto(route.path);
    > 13 |     await page.waitForLoadState('networkidle');
         |                ^
      14 |
      15 |     expect(errors).toEqual([]);
      16 |     await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
        at /Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-1.03/pulsar-claude/app/e2e/routes.spec.ts:13:16

    Error Context: test-results/routes-route-dashboard-dashboard-passes-browser-gates-desktop-retry1/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/routes-route-dashboard-dashboard-passes-browser-gates-desktop-retry1/trace.zip
    Usage:

        yarn playwright show-trace test-results/routes-route-dashboard-dashboard-passes-browser-gates-desktop-retry1/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  6 failed
    [mobile] › e2e/routes.spec.ts:8:3 › route home (/) passes browser gates ────────────────────────
    [mobile] › e2e/routes.spec.ts:8:3 › route onboarding (/onboarding) passes browser gates ────────
    [mobile] › e2e/routes.spec.ts:8:3 › route dashboard (/dashboard) passes browser gates ──────────
    [desktop] › e2e/routes.spec.ts:8:3 › route home (/) passes browser gates ───────────────────────
    [desktop] › e2e/routes.spec.ts:8:3 › route onboarding (/onboarding) passes browser gates ───────
    [desktop] › e2e/routes.spec.ts:8:3 › route dashboard (/dashboard) passes browser gates ─────────
  18 passed (2.3m)
error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

### G8 privacy-leak
page.goto: Timeout 30000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:4792/", waiting until "networkidle"[22m


### G9 a11y
page.goto: Timeout 30000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:4792/", waiting until "networkidle"[22m


### G10 mobile-layout
page.goto: Timeout 30000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:4792/", waiting until "networkidle"[22m


## Final da resposta do implementador
I fixed both problems the reviewer raised in `AuthProvider`. Lint, typecheck, format check, the 94 unit tests and the 12 runs of the e2e spec (mobile and desktop) all pass.

- **Old state showing after an auth change:** every auth change now starts a new "generation". The provider first goes back to its empty loading state. Then it stops the profile listener for the previous user, so nothing from that user is shown while the new one loads. Any query or error still in flight from an older generation is ignored when it finishes.
- **Stale `onboardingCompleted`:** `userRepository.ts` has a new `watchUserProfile` function that keeps a live listener on `users/{uid}`. The profile updates during the session, and the redirect from `/` uses the current value without a page reload. `ensureUserProfile` still creates the document only if it doesn't exist, so it never overwrites data from another device.

The test file `AuthProvider.test.tsx` (not protected) gained a fake for the Firestore listener and a way to make a document read hang. I added three tests: a profile change during the session, state being cleared on an auth change, and a hung query from the previous user being ignored. No existing assertion was changed.

I didn't run `test:rules`. The e2e runs confirm the security rules let the owner use the new live listener.

```json
{
  "summary": "AuthProvider now resets its state on every auth change and ignores late results and errors from previous auth states. The profile is kept live through onSnapshot on users/{uid}, so the / redirect uses the current onboardingCompleted without a reload. users/{uid} is still created idempotently in a transaction.",
  "filesChanged": [
    "app/src/auth/AuthProvider.tsx",
    "app/src/auth/userRepository.ts",
    "app/src/auth/__tests__/AuthProvider.test.tsx"
  ],
  "testsRun": [
    "yarn lint",
    "yarn typecheck",
    "yarn format:check",
    "yarn test:unit (94 passed)",
    "yarn test:e2e anonymous-start (12 passed, mobile + desktop)"
  ],
  "confidence": "high",
  "notes": "Added three unit tests (profile changes during the session, state cleared on auth switch, ignored pending query from the previous user) and an onSnapshot fake in the unit test mock. The protected e2e spec was not touched."
}
```

Responda SOMENTE com o bloco ```json:
{"causaRaiz": "…", "categoria": "test|type|lint|logic|env|flaky|design", "padrao": true|false, "dica": "instrução curta e acionável para a próxima tentativa"}

`padrao: true` somente se for um erro recorrente que valha virar lição para outras features.
