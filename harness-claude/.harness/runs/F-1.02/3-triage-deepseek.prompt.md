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
- [L-024] Decisão do humano: Quais portas usar nos emuladores? → Firestore 8282, Auth 9299 (fonte única app/firebase.json) — Firestore 8282, Auth 9299 (fonte única app/firebase.json) (padrão)
- [L-025] Decisão do humano: Registros podem ser atualizados? → ID determinístico por dia com update permitido só hoje — ID determinístico por dia com update permitido só hoje
- [L-026] Decisão do humano: Quem grava o cache de textos da IA? → Só a Function generateInsightTexts após validação; cliente só lê e valida de novo — Só a Function generateInsightTexts após validação; cliente só lê e valida de novo (padrão)
- [L-027] Decisão do humano: Usar App Check na V1? → Fora da V1 inicial; reavaliar na etapa 7 — Fora da V1 inicial; reavaliar na etapa 7 (padrão)
- [L-028] Decisão do humano: Onde guardar o estado de dispensa do convite de salvar conta? → users/{uid}.saveAccountInviteDismissedAt (timestamp|null) e saveAccountInviteDismissedDayCount (int >= 0|null), validados em F-1.08 — users/{uid}.saveAccountInviteDismissedAt (timestamp|null) e saveAccountInviteDismissedDayCount (int >= 0|null), validados em F-1.08 (padrão)
- [L-029] Decisão do humano: Como resumir indicadores ordinais? → Contagem por opção na ordem configurada (inclui zeros), denominador = dias com resposta, moda com desempate pela ordem; só descritivo — Contagem por opção na ordem configurada (inclui zeros), denominador = dias com resposta, moda com desempate pela ordem; só descritivo (padrão)
- [L-006] Decisão do humano: O que conta como 'alguns usos' para o convite de instalar a PWA? → N aberturas do app — 2 aberturas, repetir nos dias seguintes ao usar
- [L-007] Decisão do humano: O que é 'evidência nova material' para uma hipótese com dislike reaparecer? → >= 7 dias pareados a mais que a versão descartada ou inversão do sinal do efeito — >= 7 dias pareados a mais que a versão descartada ou inversão do sinal do efeito (padrão)
- [L-008] Decisão do humano: Com quais dias a comparação a partir do 2º dia é feita? → Média dos dias anteriores — Média dos dias anteriores; talvez 7 ou 10 dias
- [L-009] Decisão do humano: Como definir as duas janelas consecutivas de 7 dias das tendências? → hoje..hoje-6 vs. hoje-7..hoje-13 em dias corridos do localDate — hoje..hoje-6 vs. hoje-7..hoje-13 em dias corridos do localDate (padrão)


# Papel: triagem de falha

Resuma a causa raiz da falha dos gates da feature F-1.02 Utilitários de tempo (UTC, localDate do navegador, dia de Brasília). Não edite arquivos.

## Gates que falharam
### G8 privacy-leak
page.evaluate: ReferenceError: __name is not defined
    at eval (eval at evaluate (:370:30), <anonymous>:1:17)
    at UtilityScript.evaluate (<anonymous>:372:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)

## Final da resposta do implementador
O F-1.02 está pronto: os 24 testes protegidos de `time.test.ts` passam, e `yarn lint`, `yarn typecheck`, `yarn format:check` e `yarn test:unit` (8 arquivos, 62 testes) também passam. Nenhum e2e se aplica, porque a feature não tem tela.

A implementação da tentativa anterior já estava em `app/src/lib/time.ts` e passava nos testes. Só fiz dois ajustes pequenos:
- **Comentário corrigido:** o comentário do `intlParts` descrevia um comportamento que a função não tem.
- **`shiftLocalDate` simplificado:** o cálculo de dias continua em UTC, então não é afetado pelo horário de verão, e agora devolve a data por `toISOString().slice(0, 10)` em vez de passar pelo Intl.

Não consegui registrar um risco em `.harness/inbox/risks.jsonl`: a permissão para rodar o comando foi negada. O risco é duplicação nos scripts do seed:
- `scripts/seed-data.ts` tem um `addDays` que faz o mesmo que o `shiftLocalDate`.
- `scripts/seed.ts` calcula o dia de `America/Sao_Paulo` direto com Intl, o mesmo que o `brasiliaDateKey`.

Sugestão: numa feature futura que mexa no seed, fazer esses scripts importarem as funções de `src/lib/time.ts`.

```json
{"summary":"src/lib/time.ts implementa localDate no fuso do navegador, toUtcIso, formatDate/formatTime/formatDateTime em pt-BR com Intl, brasiliaDateKey em America/Sao_Paulo, shiftLocalDate e daysWindow (30 dias corridos), sem correção por viagem. Corrigi um comentário desatualizado e simplifiquei shiftLocalDate.","filesChanged":["app/src/lib/time.ts"],"testsRun":["yarn vitest run src/lib/__tests__/time.test.ts (24/24)","yarn lint","yarn typecheck","yarn format:check","yarn test:unit (8 arquivos, 62 testes)"],"confidence":"high","notes":"Sem tela, então sem e2e nem rota nova. Não consegui gravar em .harness/inbox/risks.jsonl (permissão negada). Risco: scripts/seed-data.ts (addDays) e scripts/seed.ts (dia de Sao_Paulo via Intl) duplicam shiftLocalDate/brasiliaDateKey; sugestão: fazer o seed importar de src/lib/time.ts numa feature futura."}
```

Responda SOMENTE com o bloco ```json:
{"causaRaiz": "…", "categoria": "test|type|lint|logic|env|flaky|design", "padrao": true|false, "dica": "instrução curta e acionável para a próxima tentativa"}

`padrao: true` somente se for um erro recorrente que valha virar lição para outras features.
