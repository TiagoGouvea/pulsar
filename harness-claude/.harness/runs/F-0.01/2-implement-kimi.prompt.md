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


# Papel: implementador (tentativa 2)

Implemente a feature abaixo até que os testes passem e o código respeite o design system.

- **Não altere os testes protegidos** (a tentativa é descartada automaticamente se alterar):
app/src/__tests__/scaffold.test.ts
- Rode `yarn lint`, `yarn typecheck`, `yarn test:unit` e os e2e relevantes antes de terminar.
- Respeite o `screen.png` e o `code.html` da tela correspondente em `design/` e os tokens de `design/pulsar_bio_analytics/DESIGN.md`; reutilize os componentes de `app/src/design/`.
- Se a feature criar uma tela nova, adicione a rota em `app/e2e/routes.json`.
- Nunca implemente "para o teste" (hardcode, mocks no código de produção): um avaliador de outra família revisa o diff.

## Diagnóstico da tentativa anterior
Causa raiz (test): G4: Duplicate --coverage flag — package.json script 'vitest run --coverage' + vite.config.ts test.coverage block each imply --coverage in vitest 3.x, causing 'received [true, true]'. G10: Touch targets < 44px — Slider radio buttons shrink below 44px width (min-w-0 com h-11), Toggle switch at 28px height, NumberInput at 36px height.
Dica: G4 (prioritário): Remova --coverage do script package.json (vitest 3.x já ativa coverage via config block). G10: Aumente touch targets para ≥44px — troque min-w-0 por min-w-[44px] nos radios do Slider, passe o switch de h-7 para h-11 e o input de h-9/py-2 para h-11.

Gates que falharam:
### G4 unit
yarn run v1.23.0-20220130.1630
$ vitest run --coverage --coverage
file:///Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-0.01/pulsar-claude/app/node_modules/vitest/dist/chunks/cac.BfaZ95xE.js:1269
			throw new Error(`Expected a single value for option "${command}", received [${received}]`);
			      ^

Error: Expected a single value for option "--coverage ", received [true, true]
    at transform (file:///Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-0.01/pulsar-claude/app/node_modules/vitest/dist/chunks/cac.BfaZ95xE.js:1269:10)
    at setDotProp (file:///Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-0.01/pulsar-claude/app/node_modules/vitest/dist/chunks/cac.BfaZ95xE.js:207:22)
    at CAC.mri (file:///Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-0.01/pulsar-claude/app/node_modules/vitest/dist/chunks/cac.BfaZ95xE.js:591:9)
    at CAC.parse (file:///Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-0.01/pulsar-claude/app/node_modules/vitest/dist/chunks/cac.BfaZ95xE.js:508:27)
    at file:///Users/tiagogouvea/www/treinamento/Pulsar/pulsar-claude/.worktrees/F-0.01/pulsar-claude/app/node_modules/vitest/dist/cli.js:27:13
    at ModuleJob.run (node:internal/modules/esm/module_job:561:25)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async node:internal/modules/esm/loader:647:26
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:101:5)

Node.js v24.22.1
error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.

### G10 mobile-layout
ype="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w375: alvo de toque 26x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w375: alvo de toque 26x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w375: alvo de toque 26x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w375: alvo de toque 26x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w375: alvo de toque 26x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w375: alvo de toque 26x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w375: alvo de toque 26x44 < 44px: <button type="button" role="radio" aria-checked="true" class="flex h-11 min-w-0 
design/w375: alvo de toque 26x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w375: alvo de toque 26x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w375: alvo de toque 26x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w375: alvo de toque 48x28 < 44px: <button type="button" role="switch" aria-checked="false" aria-label="Lembrete di
design/w414: alvo de toque 226x36 < 44px: <input inputmode="decimal" placeholder="—" class="w-full bg-transparent text-cen
design/w414: alvo de toque 30x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w414: alvo de toque 30x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w414: alvo de toque 30x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w414: alvo de toque 30x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w414: alvo de toque 30x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w414: alvo de toque 30x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w414: alvo de toque 30x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w414: alvo de toque 30x44 < 44px: <button type="button" role="radio" aria-checked="true" class="flex h-11 min-w-0 
design/w414: alvo de toque 30x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w414: alvo de toque 30x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w414: alvo de toque 30x44 < 44px: <button type="button" role="radio" aria-checked="false" class="flex h-11 min-w-0
design/w414: alvo de toque 48x28 < 44px: <button type="button" role="switch" aria-checked="false" aria-label="Lembrete di

## Feature
```json
{
  "id": "F-0.01",
  "stage": 0,
  "title": "Scaffold: Vite, TypeScript, Tailwind, lint e Vitest",
  "description": "package.json com yarn, Vite + React 19 + React Router, TypeScript strict (noUncheckedIndexedAccess), Tailwind v4, ESLint (bloqueia firebase/react em src/stats/) + Prettier, Vitest com cobertura v8 e index.html com lang pt-BR. Arquivos: package.json, vite.config.ts, tsconfig.json, eslint.config.js, index.html. Feito pelo inicializador.",
  "specRefs": [
    "arquitetura.md#1",
    "spec.md#7.2"
  ],
  "covers": [
    "AC-20"
  ],
  "acceptance": [
    "yarn build, lint, format:check, typecheck e test:unit rodam a partir de app/",
    "<html lang=\"pt-BR\"> e nenhuma outra língua de interface",
    "Import de firebase ou react em src/stats/ falha no lint"
  ],
  "tests": [
    "app/src/__tests__/scaffold.test.ts"
  ],
  "protectedTests": [
    "app/src/__tests__/scaffold.test.ts"
  ],
  "tags": [],
  "difficulty": "easy",
  "dependsOn": [],
  "status": "in_progress",
  "attempts": 1,
  "costUsd": 0.16248040928
}
```

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

