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
- [L-039] Não altere o app para consertar: o bug está em harness/src/gates/privacy-leak.ts (também em ../harness-claude). Correção é no harness — remover o helper nomeado de dentro do callback (inline `!!el.closest(...)`) ou avaliar uma string/`(${fn})(...)` construída em tempo de execução; enquanto isso, reporte o gate G8 como bloqueio de infra e siga com `yarn --cwd app test:e2e` como evidência de que a feature não vaza sentinelas.
- [L-038] Troque 'engines.node: "22"' por '">=22"' no package.json de functions e adicione 'dist/' ao .prettierignore. Se o harness usar yarn, passe --ignore-engines no script de build das functions como segurança adicional.
- [L-013] Decisão do humano: O que o snapshot de like copia? → Tokens do texto, métricas, amostra, período e nome/sigla/emoji dos indicadores no momento; removível, nunca editável — Tokens do texto, métricas, amostra, período e nome/sigla/emoji dos indicadores no momento; removível, nunca editável (padrão)
- [L-014] Decisão do humano: Limites de tamanho de campos? → Sigla até 4 (exibida como digitada), nome 60, unidade 20, observação 500, opções ordinais 2-7 — Sigla até 4 (exibida como digitada), nome 60, unidade 20, observação 500, opções ordinais 2-7 (padrão)
- [L-015] Decisão do humano: Como representar 'sem resposta' em Sim/Não? → Tocar de novo na opção selecionada limpa a resposta e exclui o registro de hoje — Tocar de novo na opção selecionada limpa a resposta e exclui o registro de hoje (padrão)
- [L-016] Decisão do humano: Qual controle usar para escala? → Pílulas tocáveis até 11 valores; slider nativo acima disso — Pílulas tocáveis até 11 valores; slider nativo acima disso (padrão)
- [L-017] Decisão do humano: Como reordenar indicadores? → Botões subir/descer acessíveis — Botões subir/descer acessíveis (padrão)
- [L-018] Decisão do humano: Onde fica o histórico de registros? → A partir do indicador em Meus indicadores, exclusão com confirmação — A partir do indicador em Meus indicadores, exclusão com confirmação (padrão)
- [L-019] Decisão do humano: Quais rotas usar? → /onboarding, /dashboard, /register, /indicators, /saved-insights, /insights/:hypothesisKey, /settings, /install — /onboarding, /dashboard, /register, /indicators, /saved-insights, /insights/:hypothesisKey, /settings, /install (padrão)
- [L-020] Decisão do humano: Como o layout se comporta no computador? → Coluna central até 960 px; listas de cartões em grid auto-fit (mín. 300 px) — Coluna central até 960 px; listas de cartões em grid auto-fit (mín. 300 px) (padrão)


# Papel: implementador (tentativa 5)

Implemente a feature abaixo até que os testes passem e o código respeite o design system.

- **Não altere os testes protegidos** (a tentativa é descartada automaticamente se alterar):
app/functions/src/__tests__/setup.test.ts
- Rode `yarn lint`, `yarn typecheck`, `yarn test:unit` e os e2e relevantes antes de terminar.
- Respeite o `screen.png` e o `code.html` da tela correspondente em `design/` e os tokens de `design/pulsar_bio_analytics/DESIGN.md`; reutilize os componentes de `app/src/design/`.
- Se a feature criar uma tela nova, adicione a rota em `app/e2e/routes.json`.
- Nunca implemente "para o teste" (hardcode, mocks no código de produção): um avaliador de outra família revisa o diff.

## Diagnóstico da tentativa anterior
Causa raiz (env): Falha é do gate, não do app: `privacy-leak.ts` do harness define `const COLLECT = () => { const skip = (el: Element) => ... }` e o harness roda via tsx/esbuild com keepNames, o que injeta `__name(...)` dentro do corpo da arrow. Playwright serializa o callback com `fn.toString()` e o avalia no browser, onde `__name` não existe → `ReferenceError: __name is not defined`. Os demais gates de browser (G9/G10) usam callbacks sem bindings internos nomeados, por isso passam; e o e2e do app (yarn test:e2e, 8 passed) passa porque ali o transpiler é o loader do Playwright (babel), que não adiciona `__name`. Nenhuma mudança em app/src ou app/functions pode corrigir isso.
Dica: Não altere o app para consertar: o bug está em harness/src/gates/privacy-leak.ts (também em ../harness-claude). Correção é no harness — remover o helper nomeado de dentro do callback (inline `!!el.closest(...)`) ou avaliar uma string/`(${fn})(...)` construída em tempo de execução; enquanto isso, reporte o gate G8 como bloqueio de infra e siga com `yarn --cwd app test:e2e` como evidência de que a feature não vaza sentinelas.

Gates que falharam:
### G8 privacy-leak
page.evaluate: ReferenceError: __name is not defined
    at eval (eval at evaluate (:370:30), <anonymous>:1:17)
    at UtilityScript.evaluate (<anonymous>:372:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)

## Feature (dados de entrada; não é o formato da resposta)
{
  "id": "F-1.10",
  "stage": 1,
  "title": "Workspace de Cloud Functions com emulador",
  "description": "app/functions (TypeScript, Node 22, firebase-functions v2, região southamerica-east1), emulador de functions no firebase.json, e2e:serve incluindo o emulador de functions, script test:functions (vitest + emuladores). Sem funções de negócio ainda além de um healthcheck interno.",
  "specRefs": [
    "arquitetura.md#1",
    "DECISOES.md#Outras"
  ],
  "covers": [],
  "acceptance": [
    "yarn --cwd app test:functions roda testes de functions contra emuladores",
    "Região padrão southamerica-east1",
    "Build das functions em functions/lib ignorado pelo lint/format"
  ],
  "tests": [
    "app/functions/src/__tests__/setup.test.ts"
  ],
  "protectedTests": [
    "app/functions/src/__tests__/setup.test.ts"
  ],
  "tags": [],
  "difficulty": "normal",
  "dependsOn": [
    "F-0.04"
  ],
  "status": "in_progress",
  "attempts": 4,
  "costUsd": 0.44003021500000006,
  "origin": []
}

## Trechos da spec
<!-- arquitetura.md#1 -->
## 1. Decisão de arquitetura

| Camada | V1 | Observação |
|---|---|---|
| Frontend | React + TypeScript + Vite + **yarn** | Web **somente mobile** (no computador só estica/desempilha), exclusivamente pt-BR. |
| UI | Implementação fiel ao design fornecido | Teste humano de esquerda/direita em telas estreitas. |
| Autenticação | Firebase Auth: **Anonymous**, Google, e-mail por link mágico | Converter anônimo via **link de credencial** preservando UID. Sem senha/telefone na UI. |
| Dados | Cloud Firestore | Isolamento por UID com Security Rules. |
| Publicação | Firebase Hosting | HTTPS. |
| Instalação | **PWA** instalável | Sem modo offline. |
| Push | Web Push / FCM + service worker | Um lembrete opcional por dia. |
| Jobs | Uma Cloud Function agendada diariamente | 20:00 `America/Sao_Paulo`, sem heurística de horário. |
| Cálculos | TypeScript determinístico no frontend | Recálculo após registro/exclusão e mudança de dia. |
| IA | Cloud Function callable + modelo configurável | Até uma chamada/dia/UID, até 3 textos, com consentimento. |
| Exclusão da conta | Cloud Function segura | Remove dados filhos e usuário do Auth. |

Sem API REST própria ou servidor permanentemente ativo. Cloud Functions apenas para geração com quota, exclusão integral e notificações. Utilizar Firebase Blaze e estabelecer limites financeiros.

### 1.1 Princípios técnicos

- **Padrões fechados:** seguir a especificação funcional, inclusive limiares e agregações; não inventar critérios alternativos.
- **Separação de contas:** Firestore sob `users/{uid}` com regras efetivas inclusive para usuários anônimos.
- **Sem retroatividade de criação:** lançamentos só para o dia local atual do dispositivo. **Exclusão histórica liberada**.
- **Tempo simples:** armazenar timestamps em UTC e `localDate` calculada pelo navegador na inclusão; frontend apresenta no timezone do navegador; nenhuma validação especial de data ou viagem no servidor.
- **Discrição visual limitada:** olho alterna sigla/nome em rótulos textuais de indicador e oculta emoji; não modifica dados, valores ou apresentação gráfica.
- **IA sem números próprios:** apenas explicar métricas calculadas pelo motor determinístico, com cache e quota.
- **PWA:** instala, mas sem sincronização ou armazenamento offline.
- **Código e comentários em inglês; UI pt-BR.**

<!-- DECISOES.md#Outras -->
## Outras
- Região: Firestore e Functions em `southamerica-east1`.
- Idioma único pt-BR; app somente mobile (desktop só estica/desempilha).

## Design
design/pulsar_bio_analytics/DESIGN.md
design/conclus_es_salvas/screen.png
design/configura_es_e_conta/screen.png
design/dashboard_dia_14_primeira_correla_o/screen.png
design/dashboard_dia_2_compara_es_iniciais/screen.png
design/dashboard_inicial_estado_vazio/screen.png
design/dashboard_insights/screen.png
design/detalhes_do_insight/screen.png
design/meus_indicadores/screen.png
design/novo_indicador_modal/screen.png
design/onboarding_1_fatores/screen.png
design/onboarding_2_resultados/screen.png
design/onboarding_3_associa_es/screen.png
design/preenchimento_r_pido/screen.png

## Progresso recente
- 2026-10-25T16:09 INIT concluído: 63 features
- 2026-10-25T16:14 F-0.01 passing — Scaffold: Vite, TypeScript, Tailwind, lint e Vitest (worker opus, 3 tentativa(s), US$ 0.79)
- 2026-10-25T16:17 F-0.04 passing — Firebase com emuladores e regras-base por UID (worker opus, 1 tentativa(s), US$ 1.06)
- 2026-10-25T16:20 F-0.03 passing — Seed sintético do usuário de desenvolvimento (worker deepseek, 1 tentativa(s), US$ 0.63)
- 2026-10-25T16:22 F-0.02 passing — Tokens e componentes base do design system (worker kimi, 2 tentativa(s), US$ 1.52)
- 2026-10-25T18:08 F-0.05 passing — Playwright, gates de navegador e e2e:serve (worker codex-top, 3 tentativa(s), US$ 1.06)
- 2026-10-25T18:09 F-0.06 passing — Modo privado: PrivacyContext, EyeToggle e IndicatorLabel (worker codex-top, 2 tentativa(s), US$ 1.06)
- 2026-10-25T18:16 F-0.07 passing — Página /_design (somente dev/emulador) (worker opus, 2 tentativa(s), US$ 1.09)
- 2026-10-26T10:52 F-0.fix-1 passing — Suíte completa da etapa falhou nos gates G12 (worker opus, 2 tentativa(s), US$ 1.71)
- 2026-10-27T21:53 etapa 0 aprovada (commits em 0-setup; merge e branches da próxima etapa ficam com o humano)
- 2026-11-01T18:13 ▶ etapa 1 (Base) │ features 0/12 │ 0 bloqueadas │ US$ 0.00/10 │ branch 1-base
- 2026-11-01T18:38 ⛔ F-1.02 BLOQUEADA: limite de 5 tentativas atingido │ features 0/12
- 2026-11-01T18:42 ⛔ F-1.01 BLOQUEADA: limite de 5 tentativas atingido │ features 0/12
- 2026-11-01T18:52 ⛔ F-1.08 BLOQUEADA: limite de 5 tentativas atingido │ features 0/12


## Regras adicionais (feature crítica)

- **Estatística:** amostras e denominadores explícitos; ausência de registro nunca vira zero; `Não` explícito ≠ ausência; respeite os limiares fechados da spec (seção 6.5.1 / arquitetura 5.2); nunca use linguagem causal ("causa", "faz", "provoca").
- **Security Rules:** negar por padrão; acesso só ao próprio UID; validar o schema de cada documento; teste com `@firebase/rules-unit-testing` incluindo tentativas de acesso cruzado.
- **Privacidade:** use sempre o componente `<IndicatorLabel>`, nunca o nome cru do indicador; emojis ocultos com o olho fechado; nada de nomes em `aria-label`, `title`, `alt`, tooltips, `document.title`, `localStorage` ou logs.
- **Sincronização:** operações idempotentes; nunca sobrescrever dados de outro dispositivo sem regra explícita.
