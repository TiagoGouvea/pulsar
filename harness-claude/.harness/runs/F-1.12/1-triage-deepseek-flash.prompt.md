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

Resuma a causa raiz da falha dos gates da feature F-1.12 Tela de conta: sair e excluir conta. Não edite arquivos.

## Gates que falharam
### G6 e2e
> 29 |   expect(response.ok).toBe(true);
         |                       ^
      30 |   const body = (await response.json()) as {
      31 |     users?: { localId: string }[];
      32 |     userInfo?: { localId: string }[];
        at authUserIds (/Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-1.12/pulsar-claude/app/e2e/account-delete.spec.ts:29:23)
        at /Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-1.12/pulsar-claude/app/e2e/account-delete.spec.ts:207:12

    Error Context: test-results/account-delete-account-del-16794-s-a-clean-anonymous-session-mobile/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/account-delete-account-del-16794-s-a-clean-anonymous-session-mobile/trace.zip
    Usage:

        yarn playwright show-trace test-results/account-delete-account-del-16794-s-a-clean-anonymous-session-mobile/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    Error: expect(received).toBe(expected) // Object.is equality

    Expected: true
    Received: false

      27 | async function authUserIds(): Promise<string[]> {
      28 |   const response = await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { headers: OWNER });
    > 29 |   expect(response.ok).toBe(true);
         |                       ^
      30 |   const body = (await response.json()) as {
      31 |     users?: { localId: string }[];
      32 |     userInfo?: { localId: string }[];
        at authUserIds (/Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-1.12/pulsar-claude/app/e2e/account-delete.spec.ts:29:23)
        at /Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-1.12/pulsar-claude/app/e2e/account-delete.spec.ts:207:12

    Error Context: test-results/account-delete-account-del-16794-s-a-clean-anonymous-session-mobile-retry1/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/account-delete-account-del-16794-s-a-clean-anonymous-session-mobile-retry1/trace.zip
    Usage:

        yarn playwright show-trace test-results/account-delete-account-del-16794-s-a-clean-anonymous-session-mobile-retry1/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  2 failed
    [mobile] › e2e/account-delete.spec.ts:177:3 › account deletion and sign-out › a linked account must reauthenticate before it can be deleted 
    [mobile] › e2e/account-delete.spec.ts:200:3 › account deletion and sign-out › deletion removes the old account and starts a clean anonymous session 
  102 passed (55.5s)
error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

## Final da resposta do implementador
e Functions, com emulador na porta 5001.
- **Vinculação** (`auth/linkAccount.ts`): `sendEmailLink` ganhou um parâmetro opcional; adicionei `isReauthLink` e `completeEmailReauth`.

**Verificação**
- `yarn lint`, `yarn typecheck` e `yarn test:unit` passam (129 testes).
- `account-link.spec.ts` passa inteiro (14/14).
- `account-delete.spec.ts`: 8 de 10 passam. Os dois que falham são:
  - "a linked account must reauthenticate…" (mobile): o spec monta o e-mail com o UID em caixa mista, mas o emulador grava e-mails em minúsculas, então o link nunca é encontrado.
  - "deletion removes the old account…" (mobile): `authUserIds()` faz `GET /emulator/v1/projects/{p}/accounts`, e o firebase-tools 15.34.1 só implementa `DELETE` nessa rota.
- Para validar o fluxo que esses testes não alcançam, rodei um spec temporário com só essas duas correções: exclusão anônima e exclusão vinculada com reautenticação por link passam, em mobile e desktop.

**Pendências que você precisa resolver**
- **Remover `app/e2e/tmp-verify-delete.spec.ts` e `app/test-results/`.** Tentei apagar e a permissão de Bash foi negada. Não é para ficar no repositório.
- Os dois defeitos do spec protegido precisam de uma decisão. Registrei ambos em `.harness/inbox/questions.jsonl`, junto com o risco de `requires-recent-login` em `risks.jsonl`.

**Escolhas que fiz sem te consultar**
- A reautenticação é sempre pedida antes da exclusão de conta vinculada, mesmo com login recente. Isso segue o teste protegido.
- Usei o `variant="danger"` do design system para excluir, no lugar do `bg-error-container` do `code.html`.
- Não adicionei ícones novos, para não precisar rodar `yarn icons`.

```json
{"summary":"Tela de conta: sair (com aviso para anônimo) e excluir conta (confirmação EXCLUIR, reautenticação para não anônimos, chama deleteAccount e volta a /onboarding com sessão anônima nova).","filesChanged":["app/src/pages/SettingsPage.tsx","app/src/auth/accountSession.ts","app/src/auth/linkAccount.ts","app/src/lib/firebase.ts",".harness/inbox/questions.jsonl",".harness/inbox/risks.jsonl"],"testsRun":["yarn --cwd app lint: pass","yarn --cwd app typecheck: pass","yarn --cwd app test:unit: 129/129 pass","yarn --cwd app test:e2e e2e/account-link.spec.ts: 14/14 pass","yarn --cwd app test:e2e e2e/account-delete.spec.ts: 8/10 pass; 2 fail on protected-spec defects (GET accounts unsupported by emulator; mixed-case email vs lowercase oobCodes)","temp spec e2e/tmp-verify-delete.spec.ts (to be deleted): anonymous deletion and linked reauth+delete pass on mobile and desktop"],"confidence":"med","notes":"Protected spec account-delete.spec.ts cannot pass as written in this environment (two defects, logged in questions.jsonl); not altered. Temporary file app/e2e/tmp-verify-delete.spec.ts and app/test-results/ must be removed manually (rm denied). Prettier check not run on the temp file. Choices: reauth always required for linked accounts (per protected test), danger variant instead of error-container, no new icons."}
```

Responda SOMENTE com o bloco ```json:
{"causaRaiz": "…", "categoria": "test|type|lint|logic|env|flaky|design", "padrao": true|false, "dica": "instrução curta e acionável para a próxima tentativa"}

`padrao: true` somente se for um erro recorrente que valha virar lição para outras features.
