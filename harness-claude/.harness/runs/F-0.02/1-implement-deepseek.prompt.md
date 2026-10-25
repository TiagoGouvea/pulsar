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
- [L-001] G4 (prioritário): Remova --coverage do script package.json (vitest 3.x já ativa coverage via config block). G10: Aumente touch targets para ≥44px — troque min-w-0 por min-w-[44px] nos radios do Slider, passe o switch de h-7 para h-11 e o input de h-9/py-2 para h-11.


# Papel: implementador (tentativa 1)

Implemente a feature abaixo até que os testes passem e o código respeite o design system.

- **Não altere os testes protegidos** (a tentativa é descartada automaticamente se alterar):
app/src/design/__tests__/design-system.f002.test.tsx
- Rode `yarn lint`, `yarn typecheck`, `yarn test:unit` e os e2e relevantes antes de terminar.
- Respeite o `screen.png` e o `code.html` da tela correspondente em `design/` e os tokens de `design/pulsar_bio_analytics/DESIGN.md`; reutilize os componentes de `app/src/design/`.
- Se a feature criar uma tela nova, adicione a rota em `app/e2e/routes.json`.
- Nunca implemente "para o teste" (hardcode, mocks no código de produção): um avaliador de outra família revisa o diff.

## Diagnóstico da tentativa anterior
(primeira tentativa)

## Feature
```json
{
  "id": "F-0.02",
  "stage": 0,
  "title": "Tokens e componentes base do design system",
  "description": "Tokens de design/pulsar_bio_analytics/DESIGN.md como CSS variables + @theme do Tailwind (src/design/tokens.css) e componentes Button, Chip, Slider, NumberInput, Toggle, Card, Sheet, GroupBadge (Fator/Resultado) e Icon em src/design/, exportados por src/design/index.ts. Sem lógica de privacidade (ver F-0.06). Feito pelo inicializador.",
  "specRefs": [
    "spec.md#7.1",
    "spec.md#7.2",
    "arquitetura.md#2"
  ],
  "covers": [
    "AC-17"
  ],
  "acceptance": [
    "Cores, tipografia, raios e espaçamentos vêm de tokens (sem hex soltos nos componentes)",
    "GroupBadge distingue Fator e Resultado por texto, não só por cor",
    "Controles interativos têm alvo de toque >= 44px e rótulo acessível"
  ],
  "tests": [
    "app/src/design/__tests__/design-system.f002.test.tsx"
  ],
  "protectedTests": [
    "app/src/design/__tests__/design-system.f002.test.tsx"
  ],
  "tags": [
    "ui"
  ],
  "difficulty": "normal",
  "dependsOn": [
    "F-0.01"
  ],
  "status": "in_progress",
  "attempts": 0,
  "costUsd": 0
}
```

## Trechos da spec
<!-- spec.md#7.1 -->
### 7.1 Identidade dos grupos

A distinção entre **Fatores** e **Resultados** deve ser percebida imediatamente, mas **não depender só de cor**.

Proposta de direção visual:

| Grupo | Referência | Papel na interface |
|---|---|---|
| **Fatores** | Tom frio (por exemplo, azul), ícone próprio e rótulo | “O que fiz / consumi / vivi” |
| **Resultados** | Outro tom (por exemplo, roxo), ícone próprio e rótulo | “Como fiquei / o que medi” |

Cor específica e símbolos definitivos **não foram escolhidos**; deverão ser validados visualmente.

**Ideia levantada na conversa:** fatores à esquerda e resultados à direita. No celular, validar protótipo que preserve a distinção e a leitura rápida sem esmagar controles em colunas muito estreitas — por exemplo, seções verticais com alinhamento/acentos visuais distintos. Isso é uma **direção de UX a validar**, não um layout irrevogável.

<!-- spec.md#7.2 -->
### 7.2 Prioridade para celular

- Alvos grandes para toque, teclado numérico nos campos numéricos, ações persistentes quando úteis.
- Pouca digitação para responder indicadores comuns.
- Preferir controles de um toque (Sim/Não, opções curtas) e slider simples.
- Evitar excesso de gráficos e dados simultaneamente.
- Ter transição simples de **dashboard/insights → preenchimento → dashboard**.
- **Somente layout mobile.** Não há design, telas, navegação nem componentes específicos de desktop. Aberto no computador, o mesmo layout apenas se adapta: coluna central com largura máxima, elementos esticam e cards/listas empilhados podem desempilhar lado a lado (grid/flex com quebra automática). Sem breakpoints ou tratamentos dedicados a desktop.

<!-- arquitetura.md#2 -->
## 2. Estrutura de navegação e componentes

Rotas aproximadas (adaptar ao design entregue):

```text
/
/start                     # anonymous sign-in, first visit
/onboarding
/dashboard
/indicators
/indicators/new
/indicators/:id/edit
/saved-insights
/account                   # Google/email link conversion, logout, account deletion
/settings                  # AI consent, reminders and privacy
/install                   # install invitation and fallback guidance
```

Componentes essenciais:

```text
AppShell
  GlobalIndicatorNameToggle
  Dashboard
    TodaySummary
    InsightList + InsightCard + InsightFeedback
    QuickEntryPanel
      FactorSection + ResultSection
      BooleanInput / ScaleInput / OrdinalInput / NumericInput
  IndicatorEditor + DailyAggregationControl
  SavedInsightsTimeline
  AccountUpgrade (Google, EmailLink)
  InstallPrompt / InstallInstructions
  Settings + PushOptIn + AiConsent
```

O estado `isNameRevealed` inicia `false` por abertura do app; persistir apenas durante a sessão de interface. Apenas nomes de indicadores em textos/legendas são alternados; ícones emoji somem com olho fechado. Gráficos não recebem filtro especial. A PWA **não** deve prometer que uma conta anônima será acessível após instalação: oferecer conversão antes do convite interno.

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

