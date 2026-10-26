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


# Papel: implementador (tentativa 3)

Implemente a feature abaixo até que os testes passem e o código respeite o design system.

- **Não altere os testes protegidos** (a tentativa é descartada automaticamente se alterar):
app/e2e/routes.spec.ts
- Rode `yarn lint`, `yarn typecheck`, `yarn test:unit` e os e2e relevantes antes de terminar.
- Respeite o `screen.png` e o `code.html` da tela correspondente em `design/` e os tokens de `design/pulsar_bio_analytics/DESIGN.md`; reutilize os componentes de `app/src/design/`.
- Se a feature criar uma tela nova, adicione a rota em `app/e2e/routes.json`.
- Nunca implemente "para o teste" (hardcode, mocks no código de produção): um avaliador de outra família revisa o diff.

## Diagnóstico da tentativa anterior
(primeira tentativa)

## Feature (dados de entrada; não é o formato da resposta)
{
  "id": "F-0.05",
  "stage": 0,
  "title": "Playwright, gates de navegador e e2e:serve",
  "description": "playwright.config.ts com projetos mobile (375x812, alvo) e desktop (1280x800, só smoke), e2e/support.ts, e2e/routes.json, routes.spec.ts (axe sem serious/critical e sem overflow horizontal em cada rota) e visual.spec.ts (@visual); scripts test:e2e, test:visual e e2e:serve (build:emulator + emuladores + seed + vite preview 4173). Feito pelo inicializador.",
  "specRefs": [
    "arquitetura.md#12",
    "spec.md#7.2"
  ],
  "covers": [
    "AC-17"
  ],
  "acceptance": [
    "yarn e2e:serve sobe emuladores auth+firestore, roda o seed e serve vite preview em http://localhost:4173",
    "Cada rota de e2e/routes.json passa axe e não tem overflow horizontal em 375 e 1280",
    "yarn test:visual gera capturas por rota"
  ],
  "tests": [
    "app/e2e/routes.spec.ts",
    "app/e2e/visual.spec.ts"
  ],
  "protectedTests": [
    "app/e2e/routes.spec.ts"
  ],
  "tags": [],
  "difficulty": "normal",
  "dependsOn": [
    "F-0.04",
    "F-0.03"
  ],
  "status": "in_progress",
  "attempts": 2,
  "costUsd": 0.48178760785999997
}

## Trechos da spec
<!-- arquitetura.md#12 -->
## 12. Testes essenciais

### Auth, dados e regras
- Anônimo começa sem e-mail; converter Google/link mágico mantém UID e dados; conflito não mescla automaticamente.
- UID A nunca lê/escreve caminhos do UID B; flags/quotas internas protegidas.
- Indicador com dados rejeita edição de grupo/tipo/unidade/frequência/agregação; permite nome/sigla/emoji/ordem/faixa ideal.
- `false`, `0` e dado ausente são diferentes; múltiplos agregam sem erros; excluir histórico recalcula o presente, não snapshots curtidos.
- Excluir conta apaga entradas, indicadores, insights, feedback, tokens, Auth e outras subcoleções, sem documento órfão.

### Estatística e IA
- 2 dias jamais geram correlação; cada limiar da seção 5.2 tem teste de borda `abaixo`, `igual`, `acima`.
- Ausências não viram grupo `Não` nem valor zero; constantes não produzem Spearman/divisão por zero.
- Janela 30 dias, 5 cartões no máximo, snapshots de likes e descarte de não avaliados.
- Quota por UID/dia impede chamada de IA paralela/duplicada; sem consentimento usa templates determinísticos.

### UX/PWA
- Navegadores Chrome/Safari no celular; no computador o layout mobile só estica/desempilha (sem layout próprio), sem offline; modo sigla/emoji nunca esconde dados do gráfico.
- Convite para instalação exige conta convertida; teste de PWA iPhone com sessão potencialmente isolada.
- Push apenas com opt-in, 20h Brasília, uma vez/dia/UID, suprimido se já registrou; sem push o app funciona normalmente.
- Seed 30 dias só no projeto dev; usuários novos em simulações reais, incluindo conversão e exclusão.

<!-- spec.md#7.2 -->
### 7.2 Prioridade para celular

- Alvos grandes para toque, teclado numérico nos campos numéricos, ações persistentes quando úteis.
- Pouca digitação para responder indicadores comuns.
- Preferir controles de um toque (Sim/Não, opções curtas) e slider simples.
- Evitar excesso de gráficos e dados simultaneamente.
- Ter transição simples de **dashboard/insights → preenchimento → dashboard**.
- **Somente layout mobile.** Não há design, telas, navegação nem componentes específicos de desktop. Aberto no computador, o mesmo layout apenas se adapta: coluna central com largura máxima, elementos esticam e cards/listas empilhados podem desempilhar lado a lado (grid/flex com quebra automática). Sem breakpoints ou tratamentos dedicados a desktop.

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


## Regras adicionais (feature crítica)

- **Estatística:** amostras e denominadores explícitos; ausência de registro nunca vira zero; `Não` explícito ≠ ausência; respeite os limiares fechados da spec (seção 6.5.1 / arquitetura 5.2); nunca use linguagem causal ("causa", "faz", "provoca").
- **Security Rules:** negar por padrão; acesso só ao próprio UID; validar o schema de cada documento; teste com `@firebase/rules-unit-testing` incluindo tentativas de acesso cruzado.
- **Privacidade:** use sempre o componente `<IndicatorLabel>`, nunca o nome cru do indicador; emojis ocultos com o olho fechado; nada de nomes em `aria-label`, `title`, `alt`, tooltips, `document.title`, `localStorage` ou logs.
- **Sincronização:** operações idempotentes; nunca sobrescrever dados de outro dispositivo sem regra explícita.
