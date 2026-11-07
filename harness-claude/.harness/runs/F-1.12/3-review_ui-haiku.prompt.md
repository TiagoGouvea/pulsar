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


# Papel: avaliador visual (independente)

Avalie as telas de F-1.12 — Tela de conta: sair e excluir conta comparando os screenshots (mobile é o alvo; desktop só confirma que o layout mobile estica/desempilha sem quebrar; com e sem modo privado) com os mockups de referência e os tokens. Não edite arquivos. Abra cada imagem anexada.

## O que esta feature entrega
```json
{
  "description": "Em Configurações > Conta: sair (com aviso extra para anônimo: perderá acesso) e excluir conta com confirmação digitando EXCLUIR e reautenticação quando não anônima; chama deleteAccount e volta ao início com nova sessão anônima.",
  "acceptance": [
    "Botão excluir só habilita após digitar EXCLUIR",
    "Conta não anônima pede reautenticação antes",
    "Após excluir, o app volta ao início sem dados do usuário anterior",
    "Sair de conta anônima exige confirmação explícita"
  ]
}
```

## Escopo
- Julgue só o que esta feature entrega (critérios acima). Os mockups mostram o app completo: elementos, cards, seções e telas que pertencem às features abaixo (ainda não feitas, desta etapa ou das próximas) **não** reprovam nem viram issue:
- F-1.06 (etapa 2) Guarda e2e do modo privado (sentinelas)
- F-2.01 (etapa 2) Repositório de indicadores
- F-2.02 (etapa 2) Regras: schema e trava de indicadores
- F-2.03 (etapa 2) Editor de indicador (parte 1): grupo, identificação e tipo
- F-2.04 (etapa 2) Editor de indicador (parte 2): frequência, agregação, direção e trava
- F-2.05 (etapa 2) Tela Meus indicadores
- F-2.06 (etapa 2) Repositório de registros
- F-2.07 (etapa 2) Regras: registros
- F-2.08 (etapa 2) Preenchimento rápido
- F-2.09 (etapa 2) Histórico de registros e exclusão retroativa
- F-2.10 (etapa 2) Dashboard vazio com sugestões
- F-2.11 (etapa 2) Convite discreto para salvar a conta
- F-3.01 (etapa 3) Estatística: agregação diária e séries da janela
- F-3.02 (etapa 3) Estatística: retrato do dia, comparação entre dias e distribuições ordinais
- F-3.03 (etapa 3) Estatística: tendências de Resultados
- F-3.04 (etapa 3) Estatística: associações com fator booleano
- F-3.05 (etapa 3) Estatística: Spearman fator numérico x resultado numérico
- F-3.06 (etapa 3) Seleção de insights (até 5 cartões) e versões de evidência
- F-3.07 (etapa 3) Textos determinísticos dos insights (templates pt-BR)
- F-3.08 (etapa 3) Motor de recálculo no cliente
- F-3.09 (etapa 3) Dashboard com insights
- F-3.10 (etapa 3) Cartão de insight e mini gráficos
- F-3.11 (etapa 3) Detalhes do insight (Entender análise)
- F-3.12 (etapa 3) Regra de evidência nova material após dislike
- F-4.01 (etapa 4) Dados de curadoria: like, dislike e snapshots
- F-4.02 (etapa 4) Regras: snapshots e feedback
- F-4.03 (etapa 4) Dislikes no recálculo: ocultar e permitir retorno com evidência nova
- F-4.04 (etapa 4) Like e dislike nos cartões
- F-4.05 (etapa 4) Conclusões salvas (timeline)
- F-5.01 (etapa 5) PWA instalável sem offline
- F-5.02 (etapa 5) Convite interno para instalar
- F-5.03 (etapa 5) Opt-in do lembrete e token FCM
- F-5.04 (etapa 5) Function agendada do lembrete das 20h
- F-5.05 (etapa 5) Roteiro de testes manuais Chrome/Android e Safari/iPhone
- F-6.01 (etapa 6) Consentimento da IA
- F-6.02 (etapa 6) Function generateInsightTexts com quota diária
- F-6.03 (etapa 6) Integração da IA no dashboard com cache e fallback
- F-6.04 (etapa 6) Validação de saída da IA
- F-6.05 (etapa 6) Regras: cache de textos da IA
- F-7.01 (etapa 7) Guardas de escopo
- F-7.02 (etapa 7) Auditoria de layout mobile e esticado no desktop
- F-7.03 (etapa 7) Roteiro de validação humana do design
- F-7.04 (etapa 7) Jornadas ponta a ponta com seed e usuários novos
- F-7.05 (etapa 7) Endurecimento de regras e hosting
- F-7.06 (etapa 7) Orçamento de bundle e fonte de ícones
- Telas de outras features entregues aparecem só para checar regressão: reprove apenas se esta feature as quebrou visualmente.
- As capturas são de rotas paradas: estados transitórios (carregando, enviando, sucesso, erro, diálogos e sheets abertos) não aparecem e **não** reprovam; no máximo um `minor` se o código visivelmente não os trata.
- Não peça novos testes, capturas ou mudanças em arquivos de teste: isso não é ajustável pelo implementador.

## Screenshots
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/home-mobile-privado.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/home-mobile-nomes.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/onboarding-mobile-privado.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/onboarding-mobile-nomes.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/dashboard-mobile-privado.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/dashboard-mobile-nomes.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/register-mobile-privado.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/register-mobile-nomes.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/indicators-mobile-privado.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/indicators-mobile-nomes.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/indicators-new-mobile-privado.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/indicators-new-mobile-nomes.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/saved-insights-mobile-privado.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/saved-insights-mobile-nomes.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/settings-mobile-privado.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/settings-mobile-nomes.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/design-mobile-privado.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/design-mobile-nomes.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/home-desktop-privado.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/home-desktop-nomes.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/onboarding-desktop-privado.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/onboarding-desktop-nomes.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/dashboard-desktop-privado.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/dashboard-desktop-nomes.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/register-desktop-privado.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/register-desktop-nomes.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/indicators-desktop-privado.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/indicators-desktop-nomes.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/indicators-new-desktop-privado.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/indicators-new-desktop-nomes.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/saved-insights-desktop-privado.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/saved-insights-desktop-nomes.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/settings-desktop-privado.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/settings-desktop-nomes.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/design-desktop-privado.png
/Users/tiagogouvea/www/treinamento/Pulsar/harness-claude/.harness/runs/F-1.12/screens-3/design-desktop-nomes.png

## Mockups
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

## Tokens
```json
---
name: Pulsar Bio-Analytics
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#4a4455'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#7b7487'
  outline-variant: '#ccc3d8'
  surface-tint: '#732ee4'
  primary: '#630ed4'
  on-primary: '#ffffff'
  primary-container: '#7c3aed'
  on-primary-container: '#ede0ff'
  inverse-primary: '#d2bbff'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#005b3d'
  on-tertiary: '#ffffff'
  tertiary-container: '#007650'
  on-tertiary-container: '#76ffc2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#eaddff'
  primary-fixed-dim: '#d2bbff'
  on-primary-fixed: '#25005a'
  on-primary-fixed-variant: '#5a00c6'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.03em
  headline-xl-mobile:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-code:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.08em
  label-lg:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  stat-display:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.03em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

The design system embodies a personal-science paradigm: analytical, empirical, and precise, yet deeply human and tactile. Designed specifically for personal experimentation, tracking, and statistical correlation discovery, the visual language avoids both clinical sterility and superficial wellness tropes. It communicates rigor, intellectual curiosity, and clarity.

The core visual style merges **Experimental High-Tech Geometry** with **Tactile Precision**:
- **Geometry & Technical Rigor:** Monospace-leaning legibility, crisp structural divisions, and data-dense information architectures allow users to audit cause-and-effect correlations at a glance.
- **Tactile Bio-Controls:** Generous, pill-shaped tap targets, segmented interactive chips, and thumb-friendly controls optimized for quick mobile data entry while on the go.
- **Analytical Energy:** Deep, focused violet surfaces act as the primary locus of results and insights, balanced by targeted indigo markers for causal inputs and factors.

## Colors

The palette establishes an immediate cognitive distinction between causal variables (**Factors**) and outcome metrics (**Results**), supported by an ultra-refined neutral canvas and high-clarity validation tones.

### Semantic Domain Mapping
- **Primary / Results (`#7C3AED`):** Expressive deep violet represents outputs, measurements, biometric outcomes, mood shifts, and statistical insights. Violet elements signal "what was observed."
- **Secondary / Factors (`#2563EB`):** Dynamic petrol/indigo represents logged habits, supplements, activities, sleep protocols, and environmental inputs. Indigo elements signal "what was executed."
- **Tertiary / Positive Correlation (`#10B981`):** Gentle emerald indicates statistically positive shifts, confirmed logs, and beneficial delta trends.
- **Warning / Low Confidence (`#F59E0B`):** Warm amber indicates small sample sizes, inconclusive data sets, or volatile correlations.
- **Neutrals (Slate Core):**
  - App Canvas: `#F8FAFC`
  - Elevated Cards & Surfaces: `#FFFFFF`
  - Subtle Borders & Dividers: `#E2E8F0`
  - Secondary Structural Borders: `#CBD5E1`
  - Subdued / Metric Labels: `#64748B`
  - High-Contrast Data Text & Headings: `#0F172A`

### Color Behavior Rules
- Never mix factor indigo and outcome violet within the same control; hue strictly denotes data origin.
- Use low-opacity tinted fills (e.g., violet at 8% opacity, indigo at 8% opacity) for badge backdrops and chart area fills to maintain an airy, daylight-adapted UI.

## Typography

Typography bridges expressive technical geometry with clinical data legibility:
- **Headlines & Metric Figures (`Space Grotesk`):** Provides sharp, mechanical cadence for titles, statistical coefficients (e.g., `r = +0.82`), and primary numerical readouts.
- **Body & Controls (`Geist`):** Delivers neutral, developer-grade clarity across micro-copy, logs, and dense analytical charts.

### Typography Rules
- **Three-Letter Metric Acronyms:** All biological abbreviations (e.g., `HRV`, `REM`, `CAF`, `GLU`) must render using `label-code` in uppercase with tracked spacing (`0.08em`).
- **Tabular Figures:** All numerical readouts, timelines, and delta indicators require proportional tabular lining to prevent layout shift during live filtering.

## Layout & Spacing

The layout operates on a mobile-first fluid grid, anchored by strict single-thumb ergonomics for the bottom 45% of the mobile viewport.

### Grid & Breakpoints
- **Mobile (`< 640px`):** Single column fluid canvas, 16px outer margins, 16px gutters. Primary logging actions and pill filters dock within the bottom thumb zone (48px to 96px above bottom screen margin).
- **Tablet (`640px - 1024px`):** 6-column grid with 20px gutters. Factor lists and correlation feeds stack alongside interactive trend graphs.
- **Desktop (`> 1024px`):** 12-column fixed-max layout (max-width 1200px) with 24px gutters. Dual-pane inspection: Factors logged on the left, correlated Results visualized on the right.

### Rhythm & Density
Use `space-sm` (8px) for tightly coupled metadata pairs (e.g., acronym tag + metric value). Use `space-lg` (20px) to separate distinct correlation cards.

## Elevation & Depth

Visual hierarchy relies on crisp borders and soft tonal layering rather than heavy ambient drop shadows, maintaining an authentic high-tech lab feel.

### Surface Hierarchy
1. **Level 0 (Base Canvas):** Background tone (`#F8FAFC`). Flat, non-interactive.
2. **Level 1 (Data Cards & Trend Panels):** `#FFFFFF` surface bordered by a clean 1px stroke of `#E2E8F0`. Layered over the canvas with an ultra-diffused shadow: `0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.02)`.
3. **Level 2 (Interactive Floating Controls & Modals):** `#FFFFFF` surface with a focused boundary shadow: `0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px r
```

## Rubric
# Rubric de design — Pulsar

Notas de 0 a 10 por critério (chaves `c1`…`c10` em `porCriterio`). Critérios marcados com * são críticos: qualquer um < 6 reprova.

1. *(c1) Fidelidade ao mockup e aos tokens (cores, tipografia, espaçamento, raios).
2. *(c2) Distinção Fatores × Resultados imediata, sem depender só de cor (ícone, rótulo e posição).
3. *(c3) Legibilidade e uso no celular: alvos grandes, contraste, nada espremido em 375px.
4. (c4) Hierarquia visual: a ação principal ("Registrar agora") é óbvia e os insights são escaneáveis.
5. (c5) Consistência entre telas (componentes, estados, ícones).
6. (c6) Estados vazio, carregando, erro e salvo estão desenhados, não são improvisados.
7. (c7) Densidade adequada: sem excesso de gráficos e números simultâneos.
8. (c8) Microinterações discretas: feedback de salvamento sem gamificação exagerada.
9. (c9) Modo privado com estética coerente: as siglas não quebram o layout.
10. (c10) No desktop o layout mobile só estica/desempilha sem quebrar (nada cortado, sem overflow, largura máxima legível). Não exigir layout próprio de desktop.

Aprovação: score geral ≥ 7.5 e c1, c2, c3 ≥ 6.


Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "porCriterio": {"c1": 0-10, "c2": 0-10, …, "c10": 0-10}, "issues": [{"severidade": "blocker|major|minor", "tela": "…", "descricao": "…", "sugestao": "…"}]}

Reprove se o score for < 7.5 ou se qualquer critério crítico (c1, c2, c3) for < 6.
