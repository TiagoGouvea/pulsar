# Relatório — etapa 1 (Base)

**Preview:** deploy do preview falhou: /bin/sh: firebase: command not found

## Features entregues (13/13)

- **F-1.01** Modelo de domínio de indicadores e registros (puro) — 2 tentativa(s), US$ 3.00 — critérios: AC-05, AC-06, AC-08
  - Feito por **haiku** · tentativas: kimi ✖ review_rejected → haiku ✔ · testes: sonnet · revisão: code glm-flash 10
  - Arquivos: `app/.prettierignore`, `app/scripts/seed-data.ts`, `app/src/domain/__tests__/entry.test.ts`, `app/src/domain/__tests__/indicator.test.ts`, `app/src/domain/entry.ts`, `app/src/domain/indicator.ts`, `app/src/domain/validation.ts`
  - [x] suggestAggregation: Fator numérico=sum, Resultado numérico=last, escala=mean, booleano=any, ordinal=last; nunca usa o nome
  - [x] allowedAggregations: numérico/escala {sum,mean,last}; booleano {any,last}; ordinal {last}; frequência única => null
  - [x] Resultado aceita neutral (padrão), higher, lower, target_range; Fator não tem direção
  - [x] target_range exige idealRange com min <= max; rejeita min > max
  - [x] Valor {boolean}|{number}|{optionId} é validado contra o tipo do indicador e opções existentes
- **F-1.02** Utilitários de tempo (UTC, localDate do navegador, dia de Brasília) — 1 tentativa(s), US$ 2.40 — critérios: AC-11
  - Feito por **glm-flash** · tentativas: glm-flash ✔ · testes: sonnet · revisão: code codex-mid 9
  - Arquivos: `app/src/lib/__tests__/time.test.ts`, `app/src/lib/time.ts`
  - [x] localDate usa o fuso do navegador (testado com TZ diferentes) e muda à meia-noite local
  - [x] Timestamps persistidos são UTC; exibição usa Intl pt-BR no fuso do navegador
  - [x] brasiliaDateKey usa America/Sao_Paulo independentemente do fuso do navegador
  - [x] Nenhuma correção por viagem/mudança de fuso
- **F-1.03** Acesso anônimo automático e documento do usuário — 2 tentativa(s), US$ 7.00 — critérios: AC-01
  - Feito por **kimi-pro** · tentativas: opus ✖ G6,G8,G9,G10 → sonnet ✖ review_rejected → kimi-pro ✔ · testes: sonnet · revisão: code haiku 8
  - Arquivos: `app/e2e/anonymous-start.spec.ts`, `app/e2e/routes.json`, `app/src/App.tsx`, `app/src/auth/AuthProvider.tsx`, `app/src/auth/__tests__/AuthProvider.test.tsx`, `app/src/auth/userRepository.ts`, `app/src/pages/HomePlaceholder.tsx`
  - [x] Primeira visita entra sem cadastro, sem e-mail e sem tela de login
  - [x] Recarregar a página mantém o mesmo UID
  - [x] users/{uid} é criado uma única vez com os defaults
  - [x] Erro de rede mostra mensagem em pt-BR, sem indicar sucesso
- **F-1.04** AppShell: cabeçalho com olho, navegação inferior e layout esticável — 4 tentativa(s), US$ 0.69 — critérios: AC-16, AC-17
  - Feito por **sonnet** · tentativas: minimax ✖ review_rejected → minimax ✖ review_rejected → kimi-pro ✖ review_rejected → sonnet ✔ · testes: sonnet · revisão: code gemini-argon 9, ui gemini 9.5
  - Arquivos: `app/e2e/app-shell.spec.ts`, `app/e2e/routes.json`, `app/scripts/icons.ts`, `app/src/App.tsx`, `app/src/app/AppShell.tsx`, `app/src/app/__tests__/AppShell.test.tsx`, `app/src/design/BrandMark.tsx`, `app/src/design/EmptyState.tsx` +5
  - [x] Olho global presente em todas as telas autenticadas (data-testid=eye-toggle)
  - [x] Navegação inferior com rótulos e ícones; item ativo com aria-current=page
  - [x] Sem overflow horizontal em 375x812 e 1280x800; sem breakpoints específicos de desktop
  - [x] Alvos de toque >= 44px
- **F-1.05** Fixtures de e2e: usuário do seed e usuários novos — 1 tentativa(s), US$ 0.23 — critérios: AC-21
  - Feito por **minimax** · tentativas: minimax ✔ · testes: sonnet · revisão: code haiku 7
  - Arquivos: `app/AGENTS.md`, `app/e2e/fixtures.spec.ts`, `app/e2e/fixtures.ts`, `app/src/lib/__tests__/testHelper.test.ts`, `app/src/lib/testHelper.ts`, `app/src/main.tsx`, `app/src/vite-env.d.ts`, `app/vite.config.ts`
  - [x] Fixture seedPage abre o app autenticado como o usuário do seed
  - [x] Fixture freshUserPage cria um UID novo por teste
  - [x] Build de produção não contém o helper (verificado por busca no dist/)
- **F-1.07** Tutorial de três telas — 2 tentativa(s), US$ 0.47 — critérios: AC-01
  - Feito por **minimax** · tentativas: glm-flash ✖ review_rejected → minimax ✔ · testes: sonnet · revisão: code haiku 7, ui haiku 7.5
  - Arquivos: `app/e2e/onboarding.spec.ts`, `app/scripts/icons.ts`, `app/src/App.tsx`, `app/src/auth/__tests__/userRepository.test.ts`, `app/src/auth/userRepository.ts`, `app/src/design/Button.tsx`, `app/src/design/EyeToggle.tsx`, `app/src/design/icons.ts` +2
  - [x] Três telas com Próximo/Voltar/Pular
  - [x] Concluir ou pular grava onboardingCompleted=true e não reaparece
  - [x] Tela 3 explica que correlação não é causalidade, o modo de siglas e a conta anônima
- **F-1.08** Regras: documento do usuário e campos protegidos — 2 tentativa(s), US$ 2.42 — critérios: AC-04
  - Feito por **opus** · tentativas: opus ✖ review_rejected → opus ✔ · testes: sonnet · revisão: code codex-mid 10
  - Arquivos: `app/firestore.rules`, `app/tests/rules/users.test.ts`, `app/tests/rules/usersAdminFields.test.ts`
  - [x] UID A não lê nem escreve nada sob users/B (anônimo e permanente)
  - [x] Campos desconhecidos ou de tipo errado em users/{uid} são rejeitados
  - [x] Dono pode gravar saveAccountInviteDismissedAt (timestamp ou null) e saveAccountInviteDismissedDayCount (inteiro >= 0 ou null); string, negativo ou decimal são rejeitados
  - [x] internal/** inacessível a clientes
- **F-1.09** Conversão da conta: Google e link mágico preservando UID — 1 tentativa(s), US$ 6.47 — critérios: AC-02, AC-03
  - Feito por **glm-or** · tentativas: kimi-pro ✖ G6 → kimi-pro ✖ review_rejected → sonnet ✖ G6 → sonnet ✖ G6 → kimi-pro ✖ review_rejected → - ✖ review_rejected → codex-mid ✖ G6 → glm-or ✖ review_rejected → codex-mid ✖ G6,G9 → codex-mid ✖ review_rejected → codex-mid ✖ G7 → - ✖ review_rejected → glm-or ✔ · testes: sonnet · revisão: code haiku 7, ui haiku 8
  - Arquivos: `app/e2e/account-link-visual.spec.ts`, `app/e2e/account-link.spec.ts`, `app/e2e/fixtures.ts`, `app/src/App.tsx`, `app/src/auth/AuthProvider.tsx`, `app/src/auth/__tests__/AuthProvider.test.tsx`, `app/src/auth/__tests__/linkAccount.test.ts`, `app/src/auth/linkAccount.ts` +3
  - [x] Após vincular Google ou link mágico o UID é o mesmo e os registros continuam acessíveis
  - [x] credential-already-in-use / email-already-in-use abre resolução explícita; nada é mesclado ou apagado
  - [x] Nenhum campo de senha ou telefone em toda a UI
  - [x] Conta anônima mostra aviso de que perder o navegador pode significar perder os dados
- **F-1.10** Workspace de Cloud Functions com emulador — 3 tentativa(s), US$ 1.61
  - Feito por **opus** · tentativas: haiku ✖ G6,G8,G9,G10 → deepseek-flash ✖ review_rejected → opus ✔ · testes: codex-mid · revisão: code codex-mid 8
  - Arquivos: `.gitignore`, `app/CLAUDE.md`, `app/firebase.json`, `app/functions/package.json`, `app/functions/src/__tests__/setup.test.ts`, `app/functions/src/index.ts`, `app/functions/tsconfig.json`, `app/functions/vitest.config.ts` +2
  - [x] yarn --cwd app test:functions roda testes de functions contra emuladores
  - [x] Região padrão southamerica-east1
  - [x] Build das functions em functions/lib ignorado pelo lint/format
- **F-1.11** Function deleteAccount: exclusão integral — 1 tentativa(s), US$ 2.97 — critérios: AC-04
  - Feito por **opus** · tentativas: opus ✔ · testes: sonnet · revisão: code gemini 10
  - Arquivos: `app/functions/src/__tests__/deleteAccount.test.ts`, `app/functions/src/index.ts`, `app/functions/vitest.config.ts`, `app/package.json`
  - [x] Após a chamada não resta documento sob users/{uid} nem em internal/ para o UID
  - [x] Usuário removido do Auth somente depois da limpeza
  - [x] Conta Google/e-mail sem login recente recebe erro requires-recent-login
  - [x] Um UID não consegue excluir outro
- **F-1.12** Tela de conta: sair e excluir conta — 3 tentativa(s), US$ 1.30 — critérios: AC-04
  - Feito por **glm-or** · tentativas: haiku ✖ G6 → - ✖ G6 → haiku ✖ review_rejected → glm-or ✔ · testes: codex-mid · revisão: code haiku 8, ui haiku 8.1
  - Arquivos: `app/e2e/account-delete-reauth.spec.ts`, `app/e2e/account-delete.spec.ts`, `app/src/auth/accountSession.ts`, `app/src/auth/linkAccount.ts`, `app/src/lib/firebase.ts`, `app/src/pages/SettingsPage.tsx`
  - [x] Botão excluir só habilita após digitar EXCLUIR
  - [x] Conta não anônima pede reautenticação antes
  - [x] Após excluir, o app volta ao início sem dados do usuário anterior
  - [x] Sair de conta anônima exige confirmação explícita
- **F-1.fix-1** Suíte completa da etapa falhou nos gates G12 — 1 tentativa(s), US$ 1.04
  - Feito por **glm-or** · tentativas: glm-or ✖ timeout (aceita manualmente) · testes: - · revisão: -
  - Arquivos: `app/src/auth/accountSession.ts`, `app/src/lib/firebase.ts`, `app/src/lib/functions.ts`
  - [x] Todos os gates obrigatórios da etapa passam na suíte completa
  - [x] Nenhum teste protegido é alterado
- **F-1.fix-2** Suíte completa da etapa falhou nos gates G2, G6 — 1 tentativa(s), US$ 0.24
  - Feito por **codex-mid** · tentativas: codex-mid ✔ · testes: - · revisão: code haiku 8
  - Arquivos: `app/src/auth/__tests__/linkAccount.test.ts`, `app/src/auth/linkAccount.ts`, `app/src/lib/functions.ts`
  - [x] Todos os gates obrigatórios da etapa passam na suíte completa
  - [x] Nenhum teste protegido é alterado

## Bloqueadas (0)



## Custo e tempo

- Custo da etapa: US$ 31.44 (teto US$ 32)
- Custo acumulado: US$ 47.89 (teto US$ 68)
- Tempo decorrido: 137.5 h · chamadas registradas: 192

## Workers (implementação)

| Worker | Tentativas | Sucesso |
|---|---|---|
| glm-flash | 3 | 33% |
| minimax | 9 | 22% |
| opus | 19 | 16% |
| kimi | 2 | 0% |
| sonnet | 12 | 8% |
| kimi-pro | 10 | 10% |
| haiku | 8 | 13% |
| deepseek-flash | 3 | 0% |
| qwen-coder | 2 | 0% |
| codex-mid | 5 | 20% |
| glm-or | 4 | 50% |

## Suíte completa

Todos os gates obrigatórios passaram em 1-base.

## Avaliação visual completa

Nota 9.6 — aprovado


## Aprendizados

### Etapa 1: aprendizados
- **G6 (e2e) foi o gargalo.** F-1.09 levou 14 tentativas (kimi-pro, sonnet, codex-mid, glm-or) até passar com glm-or (evt-264). F-1.06 e F-1.12 também travaram no G6. Criamos uma lição para reproduzir localmente o spec exato que falhou e esperar o estado de auth pela UI em vez de usar networkidle ou aumentar timeouts.
- **Rejeições na revisão continuam caras.** A F-1.11 teve 5 rejeições seguidas (evt-174..182). Ela só passou quando a implementação tratou ponto a ponto o parecer anterior (evt-188). Juntamos L-035 e L-038 em L-004, como regra geral de ler o verdict anterior.
- **G7 (arquivos protegidos) voltou a aparecer** com codex-mid (evt-261), mesmo com L-033 já promovida. Reforçamos L-037 com a conferência por `git diff --stat` antes de entregar.
- **Roteamento:** modelos baratos (minimax, glm-flash, deepseek-flash, haiku) foram rejeitados ou falharam no G6 em features de UI com auth. Nesses casos, implement_hard compensou desde a primeira tentativa. glm-or resolveu F-1.09 e F-1.12, mas estourou o tempo na fix-1 (evt-274).
- **Revisor haiku** saiu barato (~$0,01) e os pareceres dele levaram a aprovações (evt-205/206, evt-262/264).
- As dicas pontuais do triage (L-039..L-043) tiveram helpedRate baixo e já estavam aposentadas. Retiramos também L-044, que era específica demais e ficou obsoleta.
