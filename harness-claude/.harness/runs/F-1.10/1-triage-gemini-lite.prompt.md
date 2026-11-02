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
- [L-025] Decisão do humano: Registros podem ser atualizados? → ID determinístico por dia com update permitido só hoje — ID determinístico por dia com update permitido só hoje
- [L-026] Decisão do humano: Quem grava o cache de textos da IA? → Só a Function generateInsightTexts após validação; cliente só lê e valida de novo — Só a Function generateInsightTexts após validação; cliente só lê e valida de novo (padrão)
- [L-027] Decisão do humano: Usar App Check na V1? → Fora da V1 inicial; reavaliar na etapa 7 — Fora da V1 inicial; reavaliar na etapa 7 (padrão)
- [L-028] Decisão do humano: Onde guardar o estado de dispensa do convite de salvar conta? → users/{uid}.saveAccountInviteDismissedAt (timestamp|null) e saveAccountInviteDismissedDayCount (int >= 0|null), validados em F-1.08 — users/{uid}.saveAccountInviteDismissedAt (timestamp|null) e saveAccountInviteDismissedDayCount (int >= 0|null), validados em F-1.08 (padrão)
- [L-029] Decisão do humano: Como resumir indicadores ordinais? → Contagem por opção na ordem configurada (inclui zeros), denominador = dias com resposta, moda com desempate pela ordem; só descritivo — Contagem por opção na ordem configurada (inclui zeros), denominador = dias com resposta, moda com desempate pela ordem; só descritivo (padrão)
- [L-006] Decisão do humano: O que conta como 'alguns usos' para o convite de instalar a PWA? → N aberturas do app — 2 aberturas, repetir nos dias seguintes ao usar
- [L-007] Decisão do humano: O que é 'evidência nova material' para uma hipótese com dislike reaparecer? → >= 7 dias pareados a mais que a versão descartada ou inversão do sinal do efeito — >= 7 dias pareados a mais que a versão descartada ou inversão do sinal do efeito (padrão)
- [L-008] Decisão do humano: Com quais dias a comparação a partir do 2º dia é feita? → Média dos dias anteriores — Média dos dias anteriores; talvez 7 ou 10 dias
- [L-009] Decisão do humano: Como definir as duas janelas consecutivas de 7 dias das tendências? → hoje..hoje-6 vs. hoje-7..hoje-13 em dias corridos do localDate — hoje..hoje-6 vs. hoje-7..hoje-13 em dias corridos do localDate (padrão)
- [L-010] Decisão do humano: Tendências podem ser geradas para Fatores? → Não; só Resultados numéricos/escala (spec 6.2 'Tendência de um resultado') — Não; só Resultados numéricos/escala (spec 6.2 'Tendência de um resultado') (padrão)


# Papel: triagem de falha

Resuma a causa raiz da falha dos gates da feature F-1.10 Workspace de Cloud Functions com emulador. Não edite arquivos.

## Gates que falharam
### G6 e2e
yarn run v1.23.0-20220130.1630
$ sh scripts/port-lock.sh playwright test --grep-invert @visual
[WebServer] [WebServer] error pulsar-functions@: The engine "node" is incompatible with this module. Expected version "22". Got "24.22.0"
[WebServer] [WebServer] error Commands cannot run with an incompatible environment.
[WebServer] [WebServer] error Command failed with exit code 1.
Error: Process from config.webServer was not able to start. Exit code: 1

error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

### G8 privacy-leak
servidor não respondeu em http://localhost:4792 (yarn e2e:serve)

### G9 a11y
servidor não respondeu em http://localhost:4792 (yarn e2e:serve)

### G10 mobile-layout
servidor não respondeu em http://localhost:4792 (yarn e2e:serve)

## Final da resposta do implementador
A implementação do workspace de functions está escrita, mas não rodei nenhum teste: o Bash foi negado nesta sessão, então não consegui instalar dependências, compilar, rodar lint, typecheck ou os testes de aceite.

**O que mudou (em `app/`):**
- `functions/package.json`: `main` em `lib/index.js`, `engines.node` "22", região-alvo no código, dependência `firebase-functions` ^6.3.0 e script `build` com `tsc`.
- `functions/tsconfig.json`: saída em `lib/`, módulo CommonJS, exclui `__tests__`.
- `functions/src/index.ts`: exporta a constante `REGION = 'southamerica-east1'` e o `healthcheck` como `onRequest` que responde 200.
- `vitest.functions.config.ts`: ambiente node, inclui `functions/src/**/*.test.ts`. Não entrou no `vite.config.ts`, porque o include dele é `src/**` e não pega o teste de functions.
- `firebase.json`: bloco `functions` com `source: "functions"` e porta do emulador 5001.
- `package.json`: novo script `test:functions` (compila functions e roda vitest contra o emulador de functions, com `port-lock`). O `e2e:serve` passou a compilar functions e a subir o emulador de functions.

O `functions/lib` já estava ignorado pelo ESLint e pelo Prettier, então nada mudou nessa parte.

**Pontos não verificados:**
- A versão `^6.3.0` do `firebase-functions` é uma suposição minha, não confirmada.
- Não há `functions/yarn.lock` nem `node_modules`; sem a instalação, o emulador não sobe.
- O `port-lock.sh` não foi lido, só usado como nos outros scripts.

Registrei um risco (instalação de dependências do functions) e uma pergunta (estratégia do `test:functions`) em `.harness/inbox/`.

```json
{
  "summary": "Workspace de functions (app/functions) com healthcheck em southamerica-east1, emulador de functions no firebase.json, script test:functions e functions no e2e:serve. Implementado por leitura; nenhum comando executado.",
  "filesChanged": [
    "app/functions/package.json",
    "app/functions/tsconfig.json",
    "app/functions/src/index.ts",
    "app/vitest.functions.config.ts",
    "app/firebase.json",
    "app/package.json",
    ".harness/inbox/risks.jsonl",
    ".harness/inbox/questions.jsonl"
  ],
  "testsRun": [],
  "confidence": "low",
  "notes": "Bash negado pelo modo de permissão: não rodei yarn lint/typecheck/test:unit nem test:functions. Falta instalar functions/ (yarn.lock e node_modules) antes de qualquer teste. Versão do firebase-functions não verificada. Teste protegido app/functions/src/__tests__/setup.test.ts não foi alterado."
}
```

Responda SOMENTE com o bloco ```json:
{"causaRaiz": "…", "categoria": "test|type|lint|logic|env|flaky|design", "padrao": true|false, "dica": "instrução curta e acionável para a próxima tentativa"}

`padrao: true` somente se for um erro recorrente que valha virar lição para outras features.
