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
ngs-settings-passes-browser-gates-mobile-retry1/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  2) [desktop] › e2e/routes.spec.ts:8:3 › route settings (/settings) passes browser gates ──────────

    Error: expect(received).toEqual(expected) // deep equality

    - Expected  - 1
    + Received  + 3

    - Array []
    + Array [
    +   "color-contrast: Elements must meet minimum color contrast ratio thresholds @ .break-all",
    + ]

      25 |     expect(
      26 |       blocking.map((v) => `${v.id}: ${v.help} @ ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    > 27 |     ).toEqual([]);
         |       ^
      28 |   });
      29 | }
      30 |
        at /Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-1.09/pulsar-claude/app/e2e/routes.spec.ts:27:7

    Error Context: test-results/routes-route-settings-settings-passes-browser-gates-desktop/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/routes-route-settings-settings-passes-browser-gates-desktop/trace.zip
    Usage:

        yarn playwright show-trace test-results/routes-route-settings-settings-passes-browser-gates-desktop/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    Error: expect(received).toEqual(expected) // deep equality

    - Expected  - 1
    + Received  + 3

    - Array []
    + Array [
    +   "color-contrast: Elements must meet minimum color contrast ratio thresholds @ .break-all",
    + ]

      25 |     expect(
      26 |       blocking.map((v) => `${v.id}: ${v.help} @ ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    > 27 |     ).toEqual([]);
         |       ^
      28 |   });
      29 | }
      30 |
        at /Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-1.09/pulsar-claude/app/e2e/routes.spec.ts:27:7

    Error Context: test-results/routes-route-settings-settings-passes-browser-gates-desktop-retry1/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/routes-route-settings-settings-passes-browser-gates-desktop-retry1/trace.zip
    Usage:

        yarn playwright show-trace test-results/routes-route-settings-settings-passes-browser-gates-desktop-retry1/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  2 failed
    [mobile] › e2e/routes.spec.ts:8:3 › route settings (/settings) passes browser gates ────────────
    [desktop] › e2e/routes.spec.ts:8:3 › route settings (/settings) passes browser gates ───────────
  92 passed (34.4s)
error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

### G9 a11y
settings/mobile: [serious] color-contrast — Elements must meet minimum color contrast ratio thresholds (1 nós)
settings/desktop: [serious] color-contrast — Elements must meet minimum color contrast ratio thresholds (1 nós)

## Final da resposta do implementador
```json
{
  "summary": "Ajustei a conversão e o cartão de conta.",
  "filesChanged": [
    "app/src/auth/",
    "app/src/pages/SettingsPage.tsx",
    "app/e2e/account-link-visual.spec.ts",
    ".harness/inbox/risks.jsonl"
  ],
  "testsRun": "Lint, typecheck, format:check e 123 testes unitários passaram.",
  "confidence": "low",
  "notes": "E2e e capturas não puderam ser executados: o sandbox bloqueou as portas dos emuladores. Os unitários exigiram desativar o armazenamento experimental do Node 26."
}
```

Responda SOMENTE com o bloco ```json:
{"causaRaiz": "…", "categoria": "test|type|lint|logic|env|flaky|design", "padrao": true|false, "dica": "instrução curta e acionável para a próxima tentativa"}

`padrao: true` somente se for um erro recorrente que valha virar lição para outras features.
