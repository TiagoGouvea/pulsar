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
                   ^
      41 | }
      42 |
      43 | /** Creates a permanent account (outside the app) that already owns the given e-mail. */
        at expectRecordIntact (/Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-1.09/pulsar-claude/app/e2e/account-link.spec.ts:40:52)
        at /Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-1.09/pulsar-claude/app/e2e/account-link.spec.ts:189:5

    Error Context: test-results/account-link-account-link--c2905-changes-and-deletes-nothing-mobile-retry1/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/account-link-account-link--c2905-changes-and-deletes-nothing-mobile-retry1/trace.zip
    Usage:

        yarn playwright show-trace test-results/account-link-account-link--c2905-changes-and-deletes-nothing-mobile-retry1/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  2) [mobile] › e2e/account-link.spec.ts:145:3 › account link › Google keeps the UID and the records 

    Test timeout of 30000ms exceeded.

    Error: locator.click: Target page, context or browser has been closed
    Call log:
      - waiting for getByRole('button', { name: /auto-generate user information/i })


      153 |     const popup = await popupPromise;
      154 |     await popup.getByRole('button', { name: /add new account/i }).click();
    > 155 |     await popup.getByRole('button', { name: /auto-generate user information/i }).click();
          |                                                                                  ^
      156 |     await popup.getByRole('button', { name: /sign in with google\.com/i }).click();
      157 |
      158 |     await expect(page.getByTestId('account-status')).not.toContainText(/conta anônima/i, { timeout: 15_000 });
        at /Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-1.09/pulsar-claude/app/e2e/account-link.spec.ts:155:82

    Error Context: test-results/account-link-account-link--d977d-eps-the-UID-and-the-records-mobile/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/account-link-account-link--d977d-eps-the-UID-and-the-records-mobile/trace.zip
    Usage:

        yarn playwright show-trace test-results/account-link-account-link--d977d-eps-the-UID-and-the-records-mobile/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  1 failed
    [mobile] › e2e/account-link.spec.ts:163:3 › account link › e-mail already in use opens an explicit resolution; cancel changes and deletes nothing 
  1 flaky
    [mobile] › e2e/account-link.spec.ts:145:3 › account link › Google keeps the UID and the records 
  92 passed (48.5s)
error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

## Final da resposta do implementador
Implementei os ajustes de vinculação e conflito sem alterar o teste protegido:

- Persistência do e-mail antes da navegação, com rollback se o envio falhar.
- Remoção da URL de ação antes da troca confirmada de conta.
- Listener do perfil restrito para permitir que `networkidle` termine.
- Contradição da fixture de “Cancelar” registrada em `.harness/inbox/questions.jsonl`.

Validações: lint, typecheck, formatação e 117 testes unitários passaram. O E2E teve 13/14 testes aprovados; o restante exige um documento da conta existente que a fixture não cria e que não pode ser criado sem login ou escrita indevida no UID alheio.

```json
{
  "summary": "Fluxo de conversão por Google e link mágico ajustado, preservando UID e conflito explícito sem operações destrutivas.",
  "filesChanged": [
    "app/src/auth/AuthProvider.tsx",
    "app/src/auth/linkAccount.ts",
    "app/src/pages/SettingsPage.tsx",
    ".harness/inbox/questions.jsonl"
  ],
  "testsRun": [
    "yarn lint — passou",
    "yarn typecheck — passou",
    "yarn format:check — passou",
    "yarn test:unit — 117 testes passaram",
    "yarn test:e2e e2e/account-link.spec.ts --workers=1 — 13 passaram, 1 falhou por users/{existingUid} ausente na fixture após Cancelar"
  ],
  "confidence": "low",
  "notes": "Nenhum teste protegido foi alterado. A falha restante e a decisão conservadora estão documentadas no inbox."
}
```

Responda SOMENTE com o bloco ```json:
{"causaRaiz": "…", "categoria": "test|type|lint|logic|env|flaky|design", "padrao": true|false, "dica": "instrução curta e acionável para a próxima tentativa"}

`padrao: true` somente se for um erro recorrente que valha virar lição para outras features.
