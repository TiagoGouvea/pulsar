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

Resuma a causa raiz da falha dos gates da feature F-1.09 Conversão da conta: Google e link mágico preservando UID. Não edite arquivos.

## Gates que falharam
### G6 e2e
tate: Target page, context or browser has been closed

      114 |     for (const path of paths) {
      115 |       await page.goto(path);
    > 116 |       await page.waitForLoadState('networkidle');
          |                  ^
      117 |       if (path === '/settings') await page.getByRole('button', { name: /enviar link mágico/i }).click();
      118 |       await expect(page.locator('input[type="password"], input[type="tel"]')).toHaveCount(0);
      119 |       await expect(page.locator('input[autocomplete*="password"], input[autocomplete^="tel"]')).toHaveCount(
        at /Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-1.09/pulsar-claude/app/e2e/account-link.spec.ts:116:18

    Error Context: test-results/account-link-account-link--8061f--wording-anywhere-in-the-UI-mobile/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/account-link-account-link--8061f--wording-anywhere-in-the-UI-mobile/trace.zip
    Usage:

        yarn playwright show-trace test-results/account-link-account-link--8061f--wording-anywhere-in-the-UI-mobile/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    Test timeout of 30000ms exceeded.

    Error: page.waitForLoadState: Target page, context or browser has been closed

      114 |     for (const path of paths) {
      115 |       await page.goto(path);
    > 116 |       await page.waitForLoadState('networkidle');
          |                  ^
      117 |       if (path === '/settings') await page.getByRole('button', { name: /enviar link mágico/i }).click();
      118 |       await expect(page.locator('input[type="password"], input[type="tel"]')).toHaveCount(0);
      119 |       await expect(page.locator('input[autocomplete*="password"], input[autocomplete^="tel"]')).toHaveCount(
        at /Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-1.09/pulsar-claude/app/e2e/account-link.spec.ts:116:18

    Error Context: test-results/account-link-account-link--8061f--wording-anywhere-in-the-UI-mobile-retry1/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/account-link-account-link--8061f--wording-anywhere-in-the-UI-mobile-retry1/trace.zip
    Usage:

        yarn playwright show-trace test-results/account-link-account-link--8061f--wording-anywhere-in-the-UI-mobile-retry1/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  1 failed
    [mobile] › e2e/account-link.spec.ts:109:3 › account link › no password or phone field or wording anywhere in the UI 
  93 passed (1.3m)
error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

## Final da resposta do implementador
Mudei o fluxo de conflito por link de e-mail, mas não rodei nenhum teste: o Bash foi negado neste ambiente, então lint, typecheck, unit e e2e não foram executados.

**Causa que encontrei**
- O diagnóstico anterior apontou um problema de timing no `expect.poll`. Não é isso: o teste falhou igual na retentativa, com a UID recebida sempre diferente da esperada, então o erro é determinístico.
- Minha hipótese, que não confirmei: o Auth Emulator consome o código do link de e-mail na tentativa de `linkWithCredential` que falha com EMAIL_EXISTS.
- Se for isso, "Confirmar entrada" chama `signInWithCredential` com um código já gasto, falha, e a sessão continua anônima.
- Aumentar o timeout não resolveria.

**Mudança em `app/src/auth/linkAccount.ts`**
- Em `completeEmailLinkOnce`, chamo `fetchSignInMethodsForEmail` antes de `linkWithCredential`.
- Se o e-mail já tem conta, devolvo o conflito `email-already-in-use` sem consumir o código. A credencial continua válida para o "Entrar na conta existente".
- Se a consulta falhar ou vier vazia, por exemplo com proteção contra enumeração, segue o caminho antigo: `linkWithCredential` reporta o conflito.
- Não é uma sondagem de existência de e-mail. A pessoa precisa ter o link, ou seja, já provou ser dona da caixa de entrada.
- Os testes unitários de `linkAccount.test.ts` não deveriam quebrar, porque o `.catch` cobre o `auth` mockado. Também não conferi isso.

**Pendências**
- O teste "no password or phone…" também falhou na tentativa anterior. Ele usa `networkidle` em todas as rotas, e o arquivo é protegido. Não consegui diagnosticar sem rodar, e não toquei nele.
- A lição L-041 fala de `IndicatorsPage`, `DashboardPage`, `EyeToggle` e `watchUserProfile`, mas esse estado não existe neste worktree. O `App.tsx` usa `PlaceholderPage` e o `watchUserProfile` já é restrito a `!onboardingCompleted`. Deixei como está.
- Para validar, rode:
  - `yarn lint && yarn typecheck && yarn test:unit`
  - `yarn test:e2e e2e/account-link.spec.ts`
- Se o G6 ainda falhar, olhe o `error-context.md` do teste. Ele deve mostrar qual erro aparece no `role="alert"` após "Confirmar".

```json
{
  "summary": "Pre-check existing account via fetchSignInMethodsForEmail before linkWithCredential so the single-use e-mail link code is not consumed by a failed link; the explicit 'enter existing account' sign-in can then reuse the credential.",
  "filesChanged": ["app/src/auth/linkAccount.ts"],
  "testsRun": [],
  "confidence": "low",
  "notes": "Bash was denied in this environment, so no lint/typecheck/unit/e2e was run. The root cause (emulator consuming the oobCode on failed link) is a hypothesis from code reading, not verified. The 'no password or phone' networkidle test failure was not investigated; the test file is protected."
}
```

Responda SOMENTE com o bloco ```json:
{"causaRaiz": "…", "categoria": "test|type|lint|logic|env|flaky|design", "padrao": true|false, "dica": "instrução curta e acionável para a próxima tentativa"}

`padrao: true` somente se for um erro recorrente que valha virar lição para outras features.
