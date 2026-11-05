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

Resuma a causa raiz da falha dos gates da feature F-1.06 Guarda e2e do modo privado (sentinelas). Não edite arquivos.

## Gates que falharam
### G6 e2e
 await expect(page.locator('body')).toBeVisible();
          |                                          ^
      129 |     }
      130 |   });
      131 | });
        at /Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-1.06/pulsar-claude/app/e2e/privacy-mode.spec.ts:128:42

    Error Context: test-results/privacy-mode-privacy-mode--5df7e--the-eye-closed-and-renders-desktop-retry1/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/privacy-mode-privacy-mode--5df7e--the-eye-closed-and-renders-desktop-retry1/trace.zip
    Usage:

        yarn playwright show-trace test-results/privacy-mode-privacy-mode--5df7e--the-eye-closed-and-renders-desktop-retry1/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  14 failed
    [mobile] › e2e/privacy-mode.spec.ts:28:3 › privacy mode guard (sentinels) › closed eye: no sentinel outside [data-privacy-allow] on any route 
    [mobile] › e2e/privacy-mode.spec.ts:45:3 › privacy mode guard (sentinels) › closed eye: seeded indicators show abbreviations and no emoji 
    [mobile] › e2e/privacy-mode.spec.ts:54:3 › privacy mode guard (sentinels) › open eye: names and emojis appear; sentinel names show on the indicators list 
    [mobile] › e2e/privacy-mode.spec.ts:80:3 › privacy mode guard (sentinels) › toggling the eye again hides names and emojis 
    [mobile] › e2e/privacy-mode.spec.ts:91:3 › privacy mode guard (sentinels) › reload restarts with abbreviations 
    [mobile] › e2e/privacy-mode.spec.ts:103:3 › privacy mode guard (sentinels) › observation note only appears inside [data-privacy-allow] once opened 
    [mobile] › e2e/privacy-mode.spec.ts:124:3 › privacy mode guard (sentinels) › smoke: every route opens with the eye closed and renders 
    [desktop] › e2e/privacy-mode.spec.ts:28:3 › privacy mode guard (sentinels) › closed eye: no sentinel outside [data-privacy-allow] on any route 
    [desktop] › e2e/privacy-mode.spec.ts:45:3 › privacy mode guard (sentinels) › closed eye: seeded indicators show abbreviations and no emoji 
    [desktop] › e2e/privacy-mode.spec.ts:54:3 › privacy mode guard (sentinels) › open eye: names and emojis appear; sentinel names show on the indicators list 
    [desktop] › e2e/privacy-mode.spec.ts:80:3 › privacy mode guard (sentinels) › toggling the eye again hides names and emojis 
    [desktop] › e2e/privacy-mode.spec.ts:91:3 › privacy mode guard (sentinels) › reload restarts with abbreviations 
    [desktop] › e2e/privacy-mode.spec.ts:103:3 › privacy mode guard (sentinels) › observation note only appears inside [data-privacy-allow] once opened 
    [desktop] › e2e/privacy-mode.spec.ts:124:3 › privacy mode guard (sentinels) › smoke: every route opens with the eye closed and renders 
  70 passed (2.5m)
error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

## Final da resposta do implementador
Não consegui concluir a F-1.06 nesta tentativa. Bash foi negado pelo modo "don't ask", então não rodei `yarn lint`, `yarn typecheck`, `yarn test:unit` nem os e2e. Não tenho como afirmar que o código compila nem que os testes passam.

**O que fiz (reversões do diagnóstico, verificadas só por leitura):**
- `app/src/auth/AuthProvider.tsx`: revertida a alteração. O perfil volta a ser observado em tempo real após o onboarding.
- `app/src/App.tsx`: `/dashboard` e `/indicators` voltaram a ser placeholders. Removi os imports de `DashboardPage` e `IndicatorsPage`.
- `app/src/pages/WelcomePage.tsx`: removi o `EyeToggle`. `/onboarding` não está em `routes.json`, e o usuário do seed cai em `/dashboard` pelo redirecionamento de `/`.

**O que não consegui fazer:**
- **Arquivos órfãos que precisam ser apagados** (não tenho ferramenta de remoção sem Bash): `app/src/features/records/entryRepository.ts`, `app/src/features/indicators/indicatorRepository.ts`, `app/src/pages/DashboardPage.tsx`, `app/src/pages/IndicatorsPage.tsx`. Eles são novos nesta tentativa e não estão mais importados. O `entryRepository` ainda tem o `getDocs` sem filtro que o review apontou.
- **Testes protegidos não podem ser ajustados.** Os minors sobre `privacy-mode.spec.ts` (o `if` condicional e o `toContainText('SON')`) não podem ser corrigidos sem editar o teste protegido. O `SENTINELS` em `support.ts` não pode virar objeto simples: o teste protegido faz `for (const sentinel of SENTINELS)` e também usa `SENTINELS.sleep`, então mantive o formato híbrido.
- **Dependência bloqueante:** o guard exige nomes de indicadores em `/indicators` e a observação aberta em `/dashboard`. Isso depende das features de indicadores e de dashboard/registros, que não estão implementadas. Sem elas, os testes "open eye: names", "observation note" e "closed eye: seeded indicators" devem continuar falhando. Registrei isso em `.harness/inbox/questions.jsonl`.

**Ação necessária do orquestrador:** apagar os quatro arquivos órfãos listados acima e rodar lint, typecheck e os testes, já que eu não consegui.

```json
{
  "summary": "Reverti AuthProvider, App.tsx (placeholders em /dashboard e /indicators) e WelcomePage (sem EyeToggle). Não consegui apagar 4 arquivos órfãos nem rodar nenhum teste: Bash negado no modo don't ask. F-1.06 depende das features de indicadores e dashboard para passar.",
  "filesChanged": [
    "app/src/auth/AuthProvider.tsx",
    "app/src/App.tsx",
    "app/src/pages/WelcomePage.tsx",
    ".harness/inbox/questions.jsonl"
  ],
  "testsRun": [],
  "confidence": "low",
  "notes": "Apagar manualmente: app/src/features/records/entryRepository.ts, app/src/features/indicators/indicatorRepository.ts, app/src/pages/DashboardPage.tsx, app/src/pages/IndicatorsPage.tsx. Não alterei privacy-mode.spec.ts (protegido) nem support.ts (o formato híbrido é exigido pelo teste protegido). Testes de indicadores e dashboard devem falhar até as features correspondentes existirem."
}
```

Responda SOMENTE com o bloco ```json:
{"causaRaiz": "…", "categoria": "test|type|lint|logic|env|flaky|design", "padrao": true|false, "dica": "instrução curta e acionável para a próxima tentativa"}

`padrao: true` somente se for um erro recorrente que valha virar lição para outras features.
