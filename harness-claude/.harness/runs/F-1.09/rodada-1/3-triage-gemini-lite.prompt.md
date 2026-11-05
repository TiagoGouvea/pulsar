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
ck();
    > 215 |     await expect.poll(() => currentUid(page), { timeout: 15_000 }).toBe(existingUid);
          |                                                                    ^
      216 |
      217 |     // Nothing was merged into, replaced or deleted from either account.
      218 |     await expectRecordIntact(existingUid, 'e2e-existing', 'E2E_EXISTING_KEEP');
        at /Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-1.09/pulsar-claude/app/e2e/account-link.spec.ts:215:68

    Error Context: test-results/account-link-account-link--e55fe-and-never-merges-or-deletes-mobile/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/account-link-account-link--e55fe-and-never-merges-or-deletes-mobile/trace.zip
    Usage:

        yarn playwright show-trace test-results/account-link-account-link--e55fe-and-never-merges-or-deletes-mobile/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    Error: expect(received).toBe(expected) // Object.is equality

    Expected: "WmNAi17k1N1NhdwGsSiyoiybA5ra"
    Received: "Xuas9ofH1e81647pD3hveooVjwOd"

    Call Log:
    - Timeout 15000ms exceeded while waiting on the predicate

      213 |
      214 |     await dialog.getByRole('button', { name: /^confirmar/i }).click();
    > 215 |     await expect.poll(() => currentUid(page), { timeout: 15_000 }).toBe(existingUid);
          |                                                                    ^
      216 |
      217 |     // Nothing was merged into, replaced or deleted from either account.
      218 |     await expectRecordIntact(existingUid, 'e2e-existing', 'E2E_EXISTING_KEEP');
        at /Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-1.09/pulsar-claude/app/e2e/account-link.spec.ts:215:68

    Error Context: test-results/account-link-account-link--e55fe-and-never-merges-or-deletes-mobile-retry1/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/account-link-account-link--e55fe-and-never-merges-or-deletes-mobile-retry1/trace.zip
    Usage:

        yarn playwright show-trace test-results/account-link-account-link--e55fe-and-never-merges-or-deletes-mobile-retry1/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  2 failed
    [mobile] › e2e/account-link.spec.ts:109:3 › account link › no password or phone field or wording anywhere in the UI 
    [mobile] › e2e/account-link.spec.ts:192:3 › account link › entering the existing account needs a second confirmation and never merges or deletes 
  92 passed (1.3m)
error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

## Final da resposta do implementador
Apliquei as correções do review, mas não consegui rodar `yarn lint`, `typecheck`, `test:unit` nem os e2e. O Bash foi negado neste ambiente (modo "don't ask"), então nada foi executado nem verificado.

**O que mudou**
- **`AuthProvider.tsx`** (major): o listener de perfil voltou para usuários anônimos. Ele só para quando `onboardingCompleted` vira `true`, então o `RootRedirect` não manda mais de volta ao onboarding na mesma sessão. Adicionei um teste em `AuthProvider.test.tsx` para esse caso: usuário anônimo, onboarding concluído na sessão, listener encerrado.
- **`linkAccount.ts`**:
  - Removi o `fetchSignInMethodsForEmail`, que funcionava como sonda de e-mails cadastrados. O conflito agora vem só do `auth/email-already-in-use` do `linkWithCredential`.
  - `requireCurrentUser()` devolve o `User` uma única vez, e os `user!` saíram.
- **`SettingsPage.tsx`**: quando falta completar o e-mail, `not-a-link` e `needs-email` agora mostram uma mensagem de erro em pt-BR em vez de nada.
- **`e2e/fixtures.ts`**: o monkeypatch de `fetch` e o replay de cliques do emulador só rodam em `account-link.spec.ts` (decidido por `testInfo.file`). Como o spec é protegido, não dava para criar uma fixture opt-in. Os outros specs que usam `freshUserPage` ficam como antes.
- **`Sheet.tsx`**: mantive o `z-[60]`. O Sheet só é usado em `SettingsPage`, `DesignPage` e nos testes, e precisa ficar acima do header e da navegação do `AppShell` (`z-50`). Nada depende dele em `z-50`.

**L-041**
- No HEAD atual, `App.tsx` não importa `IndicatorsPage` nem `DashboardPage`: as rotas usam `PlaceholderPage`.
- `WelcomePage` e o `EyeToggle` também não aparecem no código que li.
- Não encontrei nada da tentativa 1 para reativar e, sem Bash, não consegui comparar com o commit dela. Não toquei nesses pontos.
- A parte do `watchUserProfile` (só enquanto `!profile.onboardingCompleted`) já estava em vigor.

**Risco principal**
- Sem a pré-checagem, o e2e de conflito por link mágico depende de o emulador devolver `auth/email-already-in-use` no `linkWithCredential`.
- Rode `yarn lint && yarn typecheck && yarn test:unit` e `yarn e2e account-link` antes de aceitar.

```json
{"summary":"Addressed review: restored profile listener for anonymous users (+test), removed email enumeration pre-check, requireCurrentUser() without non-null assertions, SettingsPage feedback for not-a-link/needs-email, scoped e2e fixture workarounds to account-link spec; kept Sheet z-[60] (justified).","filesChanged":["app/src/auth/AuthProvider.tsx","app/src/auth/linkAccount.ts","app/src/pages/SettingsPage.tsx","app/e2e/fixtures.ts","app/src/auth/__tests__/AuthProvider.test.tsx"],"testsRun":[],"confidence":"low","notes":"Bash was denied in this environment, so lint/typecheck/unit/e2e were NOT run. Verify the e2e email-link conflict still yields auth/email-already-in-use from linkWithCredential in the emulator now that the fetchSignInMethodsForEmail pre-check is gone."}
```

Responda SOMENTE com o bloco ```json:
{"causaRaiz": "…", "categoria": "test|type|lint|logic|env|flaky|design", "padrao": true|false, "dica": "instrução curta e acionável para a próxima tentativa"}

`padrao: true` somente se for um erro recorrente que valha virar lição para outras features.
