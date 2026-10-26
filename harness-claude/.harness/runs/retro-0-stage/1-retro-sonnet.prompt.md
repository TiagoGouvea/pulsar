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


# Papel: retrospectiva (stage, etapa 0)

Analise o desempenho recente do harness e mantenha as lições. Não edite arquivos.

Regras para lições:
- Toda lição nova precisa de `evidence` com ids de eventos (`evt-N`) listados abaixo. Sem evidência = rejeitada.
- Prefira editar/consolidar a criar. Máximo ~60 lições ativas por arquivo.
- Aposente lições com baixa eficácia (helpedRate) ou obsoletas; promova as consolidadas (viram parte do AGENTS.md).
- `file: "harness"` só para lições que valem para qualquer projeto.

## Eventos recentes (id feature papel worker tentativa resultado)
evt-1 smoke-opus smoke opus t1 success $0.06
evt-2 smoke-sonnet smoke sonnet t1 success $0.03
evt-3 smoke-haiku smoke haiku t1 success $0.00
evt-4 smoke-codex-top smoke codex-top t1 success $0.35
evt-5 smoke-codex-mini smoke codex-mini t1 success $0.01
evt-6 smoke-glm smoke glm t1 success $0.00
evt-7 smoke-kimi smoke kimi t1 success $0.00
evt-8 smoke-deepseek smoke deepseek t1 success $0.00
evt-9 smoke-kimi smoke kimi t1 success $0.00
evt-10 smoke-codex-mid smoke codex-mid t1 success $0.20
evt-11 smoke-glm smoke glm t1 failure $0.00
evt-12 smoke-glm smoke glm t1 success $0.00
evt-13 init initializer opus t1 failure $4.71
evt-14 init initializer opus t1 failure $0.00
evt-15 init initializer opus t2 failure $0.00
evt-16 init initializer opus t1 success $0.72
evt-17 init review_code codex-mid t1 success $0.12
evt-18 init initializer opus t2 success $1.36
evt-19 init review_code gemini-pro t2 failure $0.00
evt-20 init review_code codex-mid t2 success $0.55
evt-21 init initializer opus t3 success $1.12
evt-22 init review_code codex-mid t3 success $0.10
evt-23 F-0.01 test_writer sonnet t0 success $0.08
evt-24 F-0.01 triage deepseek t1 success $0.01
evt-25 F-0.01 implement sonnet t1 failure gates:G4,G10 $0.07
evt-26 F-0.01 implement kimi t2 invalid_json $0.01
evt-27 F-0.01 review_code codex-mid t3 success $0.26
evt-28 F-0.01 implement_hard opus t3 success $0.36
evt-29 F-0.02 test_writer sonnet t0 success $0.14
evt-30 F-0.04 review_code codex-mid t1 success $0.65
evt-31 F-0.04 implement_hard opus t1 success $0.41
evt-32 F-0.02 triage deepseek t1 success $0.00
evt-33 F-0.02 implement deepseek t1 failure gates:G2 $0.03
evt-34 F-0.03 review_code codex-mid t1 success $0.61
evt-35 F-0.03 implement deepseek t1 success $0.03
evt-36 F-0.02 review_code codex-mid t2 success $1.09
evt-37 F-0.02 review_ui sonnet t2 success $0.07
evt-38 F-0.02 implement kimi t2 success $0.18
evt-39 F-0.05 review_code codex-mid t1 success $0.37
evt-40 F-0.05 implement deepseek t1 review_rejected $0.04
evt-41 F-0.06 review_code codex-mid t1 success $0.41
evt-42 F-0.06 implement_hard opus t1 review_rejected $0.36
evt-43 F-0.05 review_code gemini-pro t2 failure $0.00
evt-44 F-0.05 review_code haiku t2 success $0.01
evt-45 F-0.05 implement deepseek t2 review_rejected $0.06
evt-46 F-0.05 review_code sonnet t3 success $0.03
evt-47 F-0.05 implement_hard codex-top t3 success $0.81
evt-48 F-0.06 review_code sonnet t2 success $0.03
evt-49 F-0.06 review_ui sonnet t2 success $0.07
evt-50 F-0.06 implement_hard codex-top t2 success $0.47
evt-51 F-0.07 test_writer sonnet t0 success $0.11
evt-52 F-0.07 triage deepseek t1 success $0.00
evt-53 F-0.07 implement_hard codex-top t1 failure gates:G2,G4 $0.71
evt-54 F-0.07 review_code deepseek t2 success $0.01
evt-55 F-0.07 review_ui gemini-flash-or t2 success $0.03
evt-56 F-0.07 implement_hard opus t2 success $0.23
evt-57 F-0.fix-1 review_code codex-mid t1 success $0.03
evt-58 F-0.fix-1 implement_hard sonnet t1 review_rejected $0.13
evt-59 F-0.fix-1 review_code codex-mid t2 success $0.13
evt-60 F-0.fix-1 implement_hard opus t2 success $1.43
evt-61 stage-0 review_ui gemini-flash-or t1 success $0.03

## Lições atuais
# Lições do projeto (geradas pelo harness). Formato YAML.
- id: L-001
  scope:
    roles:
      - implement
      - implement_hard
    tags: []
  rule: "G4 (prioritário): Remova --coverage do script package.json (vitest 3.x já
    ativa coverage via config block). G10: Aumente touch targets para ≥44px —
    troque min-w-0 por min-w-[44px] nos radios do Slider, passe o switch de h-7
    para h-11 e o input de h-9/py-2 para h-11."
  evidence:
    - evt-24
  added: 2026-10-25
  hits: 15
  helped: 8
  helpedRate: 0.5333333333333333
  status: active
- id: L-002
  scope:
    roles:
      - implement
      - implement_hard
    tags:
      - ui
  rule: Inicializadores devem rodar Prettier --write nos arquivos que criam antes
    de commitá-los. Para destravar esta feature, o orquestrador deve executar
    format:fix nos arquivos protegidos ou relaxar temporariamente a proteção
    para correção de formatação.
  evidence:
    - evt-32
  added: 2026-10-25
  hits: 5
  helped: 3
  helpedRate: 0.6
  status: active

# Lições do harness — sobrevivem entre projetos. Formato YAML.
[]


## Features da etapa
F-0.01 [passing] Scaffold: Vite, TypeScript, Tailwind, lint e Vitest: yarn build, lint, format:check, typecheck e test:unit rodam a partir de app/ | <html lang="pt-BR"> e nenhuma outra língua de interface | Import de firebase ou react em src/stats/ falha no lint
F-0.02 [passing] Tokens e componentes base do design system: Cores, tipografia, raios e espaçamentos vêm de tokens (sem hex soltos nos componentes) | GroupBadge distingue Fator e Resultado por texto, não só por cor | Controles interativos têm alvo de toque >= 44px e rótulo acessível
F-0.04 [passing] Firebase com emuladores e regras-base por UID: yarn test:rules sobe o emulador do Firestore e roda tests/rules | firestore.rules nega acesso entre UIDs e a internal/ | Build de produção não aponta para emuladores
F-0.05 [passing] Playwright, gates de navegador e e2e:serve: yarn e2e:serve sobe emuladores auth+firestore, roda o seed e serve vite preview em http://localhost:4173 | Cada rota de e2e/routes.json passa axe e não tem overflow horizontal em 375 e 1280 | yarn test:visual gera capturas por rota
F-0.06 [passing] Modo privado: PrivacyContext, EyeToggle e IndicatorLabel: Olho inicia fechado (siglas), alterna nome <-> sigla e oculta emoji com olho fechado | Sigla ausente vira 3 primeiras letras do nome + '...' | Estado do olho não é persistido: recarregar volta a siglas
F-0.07 [passing] Página /_design (somente dev/emulador): /_design passa axe sem violações serious/critical e sem overflow horizontal em 375 e 1280 | /_design não existe no build de produção | Alternar o olho em /_design troca nomes por siglas nos exemplos
F-0.03 [passing] Seed sintético do usuário de desenvolvimento: Seed gera exatamente 30 dias sintéticos terminando hoje (firstDate = hoje - 29; nenhum registro fora dessa janela) | Seed é determinístico para a mesma data | Cobre Não explícito vs ausência, 0 vs ausência, múltiplos por dia, valor extremo, indicador arquivado e sem sigla | Exercício -> energia com diferença >= 1,5 ponto plantada; sono -> foco monotônico com >= 16 dias pareados; café x dor sem relação | Recusa rodar fora do emulador sem opt-in explícito
F-0.fix-1 [passing] Suíte completa da etapa falhou nos gates G12: Todos os gates obrigatórios da etapa passam na suíte completa | Nenhum teste protegido é alterado

Responda SOMENTE com o bloco ```json:
{"create": [{"scope": {"roles": ["implement"], "tags": ["security-rules"]}, "rule": "…", "evidence": ["evt-12"], "file": "project|harness"}],
 "edit": [{"id": "L-003", "rule": "…"}], "retire": ["L-001"], "promote": ["L-004"],
 "aprendizados": "markdown curto para o RELATORIO.md",
 "comoTestar": "se kind=stage: roteiro de 10–15 min, passo a passo, no celular (no computador, só conferir que estica/desempilha sem quebrar); como carregar o seed de demonstração no preview; o que observar"}
