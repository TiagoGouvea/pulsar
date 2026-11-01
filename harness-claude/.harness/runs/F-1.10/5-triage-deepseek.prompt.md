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
- [L-013] Decisão do humano: O que o snapshot de like copia? → Tokens do texto, métricas, amostra, período e nome/sigla/emoji dos indicadores no momento; removível, nunca editável — Tokens do texto, métricas, amostra, período e nome/sigla/emoji dos indicadores no momento; removível, nunca editável (padrão)
- [L-014] Decisão do humano: Limites de tamanho de campos? → Sigla até 4 (exibida como digitada), nome 60, unidade 20, observação 500, opções ordinais 2-7 — Sigla até 4 (exibida como digitada), nome 60, unidade 20, observação 500, opções ordinais 2-7 (padrão)
- [L-015] Decisão do humano: Como representar 'sem resposta' em Sim/Não? → Tocar de novo na opção selecionada limpa a resposta e exclui o registro de hoje — Tocar de novo na opção selecionada limpa a resposta e exclui o registro de hoje (padrão)
- [L-016] Decisão do humano: Qual controle usar para escala? → Pílulas tocáveis até 11 valores; slider nativo acima disso — Pílulas tocáveis até 11 valores; slider nativo acima disso (padrão)
- [L-017] Decisão do humano: Como reordenar indicadores? → Botões subir/descer acessíveis — Botões subir/descer acessíveis (padrão)
- [L-018] Decisão do humano: Onde fica o histórico de registros? → A partir do indicador em Meus indicadores, exclusão com confirmação — A partir do indicador em Meus indicadores, exclusão com confirmação (padrão)
- [L-019] Decisão do humano: Quais rotas usar? → /onboarding, /dashboard, /register, /indicators, /saved-insights, /insights/:hypothesisKey, /settings, /install — /onboarding, /dashboard, /register, /indicators, /saved-insights, /insights/:hypothesisKey, /settings, /install (padrão)
- [L-020] Decisão do humano: Como o layout se comporta no computador? → Coluna central até 960 px; listas de cartões em grid auto-fit (mín. 300 px) — Coluna central até 960 px; listas de cartões em grid auto-fit (mín. 300 px) (padrão)
- [L-021] Decisão do humano: Como resolver conflito de credencial na conversão? → Opções 'Cancelar' ou 'Entrar na conta existente' com aviso; nada é apagado nem mesclado — Opções 'Cancelar' ou 'Entrar na conta existente' com aviso; nada é apagado nem mesclado (padrão)
- [L-022] Decisão do humano: De onde servir ícones e fontes? → Material Symbols, Geist e Space Grotesk via pacotes npm, sem CDN — Material Symbols, Geist e Space Grotesk via pacotes npm, sem CDN (padrão)


# Papel: triagem de falha

Resuma a causa raiz da falha dos gates da feature F-1.10 Workspace de Cloud Functions com emulador. Não edite arquivos.

## Gates que falharam
### G8 privacy-leak
page.evaluate: ReferenceError: __name is not defined
    at eval (eval at evaluate (:370:30), <anonymous>:1:17)
    at UtilityScript.evaluate (<anonymous>:372:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)

## Final da resposta do implementador
A implementação da tentativa 4 já estava completa e todos os checks passam. Não mudei nada no app. O gate G8 continua falhando por um bug no harness, que fica fora desta worktree, então não consigo corrigi-lo daqui.

- **Checks:** `yarn lint`, `yarn typecheck`, `yarn format:check` e `yarn test:unit` passam (38 testes).
- **Functions:** `yarn test:functions` compila as functions e sobe os emuladores de auth, firestore e functions. O `healthcheck` inicializa em `southamerica-east1` e os 9 testes de `setup.test.ts` passam.
- **E2E:** `yarn test:e2e` passa (8 testes). É a evidência de que a feature não vaza as sentinelas do seed enquanto o G8 não roda.
- **G8:** o erro `__name is not defined` vem de `harness/src/gates/privacy-leak.ts`. Registrei o risco em `.harness/inbox/risks.jsonl` com a correção sugerida, que é remover o helper nomeado de dentro do callback.

```json
{"summary":"F-1.10 already done in attempt 4: app/functions (TypeScript, Node 22, firebase-functions v2, setGlobalOptions region southamerica-east1, onRequest healthcheck), functions emulator in firebase.json (port 5001), test:functions (build + emulators:exec auth,firestore,functions + vitest), e2e:serve with the functions emulator, functions/lib ignored by eslint, prettier and git. No app changes in this attempt; G8 still fails from the harness bug, logged as a risk.","filesChanged":[".harness/inbox/risks.jsonl"],"testsRun":["yarn lint (ok)","yarn typecheck (ok)","yarn format:check (ok)","yarn test:unit (38 passed)","yarn test:functions (9 passed against emulators; healthcheck initialized in southamerica-east1)","yarn test:e2e (8 passed)"],"confidence":"high","notes":"G8 privacy-leak fails with 'ReferenceError: __name is not defined'. Root cause is in harness/src/gates/privacy-leak.ts, outside this worktree: tsx/esbuild keepNames injects __name into the callback that Playwright serializes. This is an infra blocker that no change in app/ can fix. Fix it in the harness and in ../harness-claude by inlining !!el.closest(...) or evaluating a string built at runtime. yarn test:e2e passing is the evidence that no sentinels leak. engines.node stays '22' because the protected test requires it; the scripts use --ignore-engines for compatibility (L-038)."}
```

Responda SOMENTE com o bloco ```json:
{"causaRaiz": "…", "categoria": "test|type|lint|logic|env|flaky|design", "padrao": true|false, "dica": "instrução curta e acionável para a próxima tentativa"}

`padrao: true` somente se for um erro recorrente que valha virar lição para outras features.
