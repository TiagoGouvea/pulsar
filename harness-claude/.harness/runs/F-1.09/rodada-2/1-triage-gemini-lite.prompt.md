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

    Expected: "UbZSnmnoVQW4whkfJfYvylinGPdb"
    Received: "W1OLBo0j60aEOIcwyscA0JMxXc2p"

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
```json
{
  "summary": "Listener de perfil restaurado e consulta prévia de métodos de login removida.",
  "filesChanged": [
    "app/src/auth/AuthProvider.tsx",
    "app/src/auth/linkAccount.ts",
    "app/src/auth/__tests__/AuthProvider.test.tsx",
    ".harness/inbox/risks.jsonl"
  ],
  "testsRun": "git diff --check passou. Lint, typecheck, format, unitários e e2e não iniciaram: faltam dependências e a instalação falhou por falta de rede.",
  "confidence": "low",
  "notes": "O z-index do Sheet foi mantido para ficar acima da navegação fixa."
}
```

Responda SOMENTE com o bloco ```json:
{"causaRaiz": "…", "categoria": "test|type|lint|logic|env|flaky|design", "padrao": true|false, "dica": "instrução curta e acionável para a próxima tentativa"}

`padrao: true` somente se for um erro recorrente que valha virar lição para outras features.
