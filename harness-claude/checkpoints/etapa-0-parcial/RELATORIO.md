# Relatório — etapa 0 (Setup) — PARCIAL: teto de orçamento atingido: stage

**Preview:** não publicado

## Features entregues (7/8)

- **F-0.01** Scaffold: Vite, TypeScript, Tailwind, lint e Vitest — 3 tentativa(s), US$ 0.79 — critérios: AC-20
  - [x] yarn build, lint, format:check, typecheck e test:unit rodam a partir de app/
  - [x] <html lang="pt-BR"> e nenhuma outra língua de interface
  - [x] Import de firebase ou react em src/stats/ falha no lint
- **F-0.02** Tokens e componentes base do design system — 2 tentativa(s), US$ 1.52 — critérios: AC-17
  - [x] Cores, tipografia, raios e espaçamentos vêm de tokens (sem hex soltos nos componentes)
  - [x] GroupBadge distingue Fator e Resultado por texto, não só por cor
  - [x] Controles interativos têm alvo de toque >= 44px e rótulo acessível
- **F-0.04** Firebase com emuladores e regras-base por UID — 1 tentativa(s), US$ 1.06 — critérios: AC-04
  - [x] yarn test:rules sobe o emulador do Firestore e roda tests/rules
  - [x] firestore.rules nega acesso entre UIDs e a internal/
  - [x] Build de produção não aponta para emuladores
- **F-0.05** Playwright, gates de navegador e e2e:serve — 3 tentativa(s), US$ 1.06 — critérios: AC-17
  - [x] yarn e2e:serve sobe emuladores auth+firestore, roda o seed e serve vite preview em http://localhost:4173
  - [x] Cada rota de e2e/routes.json passa axe e não tem overflow horizontal em 375 e 1280
  - [x] yarn test:visual gera capturas por rota
- **F-0.06** Modo privado: PrivacyContext, EyeToggle e IndicatorLabel — 2 tentativa(s), US$ 1.06 — critérios: AC-16
  - [x] Olho inicia fechado (siglas), alterna nome <-> sigla e oculta emoji com olho fechado
  - [x] Sigla ausente vira 3 primeiras letras do nome + '...'
  - [x] Estado do olho não é persistido: recarregar volta a siglas
- **F-0.07** Página /_design (somente dev/emulador) — 2 tentativa(s), US$ 1.09 — critérios: AC-17, AC-16
  - [x] /_design passa axe sem violações serious/critical e sem overflow horizontal em 375 e 1280
  - [x] /_design não existe no build de produção
  - [x] Alternar o olho em /_design troca nomes por siglas nos exemplos
- **F-0.03** Seed sintético do usuário de desenvolvimento — 1 tentativa(s), US$ 0.63 — critérios: AC-21
  - [x] Seed gera exatamente 30 dias sintéticos terminando hoje (firstDate = hoje - 29; nenhum registro fora dessa janela)
  - [x] Seed é determinístico para a mesma data
  - [x] Cobre Não explícito vs ausência, 0 vs ausência, múltiplos por dia, valor extremo, indicador arquivado e sem sigla
  - [x] Exercício -> energia com diferença >= 1,5 ponto plantada; sono -> foco monotônico com >= 16 dias pareados; café x dor sem relação
  - [x] Recusa rodar fora do emulador sem opt-in explícito

## Bloqueadas (0)


## Pendentes (1)

- F-0.fix-1 Suíte completa da etapa falhou nos gates G12 [in_progress]

## Custo e tempo

- Custo da etapa: US$ 13.71 (teto US$ 14)
- Custo acumulado: US$ 14.32 (teto US$ 66)
- Tempo decorrido: 2.9 h · chamadas registradas: 44

## Workers (implementação)

| Worker | Tentativas | Sucesso |
|---|---|---|
| sonnet | 1 | 0% |
| kimi | 2 | 50% |
| opus | 4 | 75% |
| deepseek | 4 | 25% |
| codex-top | 3 | 67% |



## Aprendizados

-
