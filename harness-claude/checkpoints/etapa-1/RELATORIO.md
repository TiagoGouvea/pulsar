# Relatório — etapa 1 (Base)

**Preview:** deploy do preview falhou: /bin/sh: firebase: command not found

## Features entregues (4/12)

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
- **F-1.08** Regras: documento do usuário e campos protegidos — 2 tentativa(s), US$ 2.42 — critérios: AC-04
  - Feito por **opus** · tentativas: opus ✖ review_rejected → opus ✔ · testes: sonnet · revisão: code codex-mid 10
  - Arquivos: `app/firestore.rules`, `app/tests/rules/users.test.ts`, `app/tests/rules/usersAdminFields.test.ts`
  - [x] UID A não lê nem escreve nada sob users/B (anônimo e permanente)
  - [x] Campos desconhecidos ou de tipo errado em users/{uid} são rejeitados
  - [x] Dono pode gravar saveAccountInviteDismissedAt (timestamp ou null) e saveAccountInviteDismissedDayCount (inteiro >= 0 ou null); string, negativo ou decimal são rejeitados
  - [x] internal/** inacessível a clientes
- **F-1.10** Workspace de Cloud Functions com emulador — 3 tentativa(s), US$ 1.61
  - Feito por **opus** · tentativas: haiku ✖ G6,G8,G9,G10 → deepseek-flash ✖ review_rejected → opus ✔ · testes: codex-mid · revisão: code codex-mid 8
  - Arquivos: `.gitignore`, `app/CLAUDE.md`, `app/firebase.json`, `app/functions/package.json`, `app/functions/src/__tests__/setup.test.ts`, `app/functions/src/index.ts`, `app/functions/tsconfig.json`, `app/functions/vitest.config.ts` +2
  - [x] yarn --cwd app test:functions roda testes de functions contra emuladores
  - [x] Região padrão southamerica-east1
  - [x] Build das functions em functions/lib ignorado pelo lint/format

## Bloqueadas (2)

- **F-1.03** Acesso anônimo automático e documento do usuário: teto de custo da feature atingido
- **F-1.11** Function deleteAccount: exclusão integral: limite de 5 tentativas atingido

## Pendentes (6)

- F-1.04 AppShell: cabeçalho com olho, navegação inferior e layout esticável [failing]
- F-1.05 Fixtures de e2e: usuário do seed e usuários novos [failing]
- F-1.06 Guarda e2e do modo privado (sentinelas) [failing]
- F-1.07 Tutorial de três telas [failing]
- F-1.09 Conversão da conta: Google e link mágico preservando UID [failing]
- F-1.12 Tela de conta: sair e excluir conta [failing]

## Custo e tempo

- Custo da etapa: US$ 15.12 (teto US$ 18)
- Custo acumulado: US$ 31.51 (teto US$ 68)
- Tempo decorrido: 19.7 h · chamadas registradas: 99

## Workers (implementação)

| Worker | Tentativas | Sucesso |
|---|---|---|
| glm-flash | 2 | 50% |
| minimax | 4 | 0% |
| opus | 16 | 13% |
| kimi | 2 | 0% |
| sonnet | 5 | 0% |
| kimi-pro | 4 | 0% |
| haiku | 5 | 20% |
| deepseek-flash | 2 | 0% |
| qwen-coder | 1 | 0% |

## Suíte completa

Todos os gates obrigatórios passaram em 1-base.

## Avaliação visual completa

Nota 9.1 — aprovado


## Aprendizados

- **Violações de arquivos protegidos (G7)** foram o maior ralo de tentativas na etapa 1 (F-1.08, F-1.03, F-1.10): até opus e sonnet editaram testes protegidos.
- **G8** falhou repetidamente em F-1.01, F-1.02 e F-1.10; as tentativas repetiram a abordagem sem ler o relatório do gate.
- **F-1.11** foi rejeitada em revisão 5 vezes seguidas e ficou bloqueada; F-1.03 também bloqueou por G7.
- Modelos baratos (minimax, haiku, glm-flash) quase sempre falham em implementação; o custo real está nas escaladas para opus.
- Lições L-025 a L-029 são decisões de produto já incorporadas à spec e foram aposentadas por nunca terem ajudado; L-031 duplica L-030 e L-032 não tem relação com o evento citado.
- Os smoke tests de workers passaram quase todos (kimi-pro falhou uma vez).
