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
- [L-031] Rode `yarn test:e2e` localmente para confirmar se o erro reproduz. Se sim, reescreva `visibleTextOutsideAllowList` e `hasHorizontalOverflow` em `app/e2e/support.ts` usando `page.evaluate('string')` em vez de `page.evaluate(() => {...})` — a string não passa pelo esbuild e elimina o risco de vazamento de helpers. Verifique também se o `e2e:serve` está 100% funcional (emuladores, seed, preview). Se o erro não reproduzir localmente, é provável que o ambiente de gates esteja com cache de build stale ou versão do Playwright diferente.
- [L-001] Cobertura (G4): não passe --coverage no script do package.json se a config do vitest já ativa coverage, para não duplicar a configuração. Touch targets (G10): todo controle interativo (radios, switch, input) deve ter pelo menos 44px, por exemplo min-w-[44px] e h-11.
- [L-030] Reexecute o gate sem alterar time.ts. '__name is not defined' em page.evaluate é artefato do transform Babel do Playwright, não bug da feature. Se persistir, pin a versão do @playwright/test no yarn.lock ou remova o gatilho do helper (ex.: inline o callback de page.evaluate / defina um shim global __name) e reporte; não caia na armadilha de depurar o código da feature.
- [L-006] Decisão do humano: O que conta como 'alguns usos' para o convite de instalar a PWA? → N aberturas do app — 2 aberturas, repetir nos dias seguintes ao usar
- [L-007] Decisão do humano: O que é 'evidência nova material' para uma hipótese com dislike reaparecer? → >= 7 dias pareados a mais que a versão descartada ou inversão do sinal do efeito — >= 7 dias pareados a mais que a versão descartada ou inversão do sinal do efeito (padrão)
- [L-008] Decisão do humano: Com quais dias a comparação a partir do 2º dia é feita? → Média dos dias anteriores — Média dos dias anteriores; talvez 7 ou 10 dias
- [L-009] Decisão do humano: Como definir as duas janelas consecutivas de 7 dias das tendências? → hoje..hoje-6 vs. hoje-7..hoje-13 em dias corridos do localDate — hoje..hoje-6 vs. hoje-7..hoje-13 em dias corridos do localDate (padrão)
- [L-010] Decisão do humano: Tendências podem ser geradas para Fatores? → Não; só Resultados numéricos/escala (spec 6.2 'Tendência de um resultado') — Não; só Resultados numéricos/escala (spec 6.2 'Tendência de um resultado') (padrão)
- [L-011] Decisão do humano: Como ordenar os cartões elegíveis? → Razão efeito/limiar desc, depois dias pareados desc, depois hypothesisKey asc — Razão efeito/limiar desc, depois dias pareados desc, depois hypothesisKey asc (padrão)
- [L-012] Decisão do humano: Quais níveis de evidência rotular? → Só 'Descrição' e 'Possível associação'; sem 'sinal consistente' — Só 'Descrição' e 'Possível associação'; sem 'sinal consistente' (padrão)


# Papel: implementador (tentativa 4)

Implemente a feature abaixo até que os testes passem e o código respeite o design system.

- **Não altere os testes protegidos** (a tentativa é descartada automaticamente se alterar):
app/src/lib/__tests__/time.test.ts
- Rode `yarn lint`, `yarn typecheck`, `yarn test:unit` e os e2e relevantes antes de terminar.
- Respeite o `screen.png` e o `code.html` da tela correspondente em `design/` e os tokens de `design/pulsar_bio_analytics/DESIGN.md`; reutilize os componentes de `app/src/design/`.
- Se a feature criar uma tela nova, adicione a rota em `app/e2e/routes.json`.
- Nunca implemente "para o teste" (hardcode, mocks no código de produção): um avaliador de outra família revisa o diff.

## Diagnóstico da tentativa anterior
Causa raiz (flaky): O erro `ReferenceError: __name is not defined` ocorre durante `page.evaluate` porque o esbuild (usado pelo Playwright para transpilar os arquivos TypeScript de teste) injeta referências ao helper `__name` em funções serializadas enviadas ao navegador, onde `__name` não está definido. O efeito é visível com `--keep-names`: `var __name = (target, value) => __defProp(target, 'name', {value, configurable: true});` e chamadas `__name(visibleTextOutsideAllowList, ...)` no nível do módulo. Embora essas chamadas fiquem fora do corpo da função, se o pipeline de serialização do Playwright incluir trechos do escopo do módulo no código enviado ao navegador, o `__name` vaza e quebra. As alterações de F-1.02 em `time.ts` não causam o erro: são mínimas (comentário + simplificação do `shiftLocalDate`), o build de produção não contém `__name`, e os testes unitários passam. O erro está na infraestrutura de transpilação dos testes E2E, não no código da feature.
Dica: Rode `yarn test:e2e` localmente para confirmar se o erro reproduz. Se sim, reescreva `visibleTextOutsideAllowList` e `hasHorizontalOverflow` em `app/e2e/support.ts` usando `page.evaluate('string')` em vez de `page.evaluate(() => {...})` — a string não passa pelo esbuild e elimina o risco de vazamento de helpers. Verifique também se o `e2e:serve` está 100% funcional (emuladores, seed, preview). Se o erro não reproduzir localmente, é provável que o ambiente de gates esteja com cache de build stale ou versão do Playwright diferente.

Gates que falharam:
### G8 privacy-leak
page.evaluate: ReferenceError: __name is not defined
    at eval (eval at evaluate (:370:30), <anonymous>:1:17)
    at UtilityScript.evaluate (<anonymous>:372:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)

## Feature (dados de entrada; não é o formato da resposta)
{
  "id": "F-1.02",
  "stage": 1,
  "title": "Utilitários de tempo (UTC, localDate do navegador, dia de Brasília)",
  "description": "src/lib/time.ts: localDate (YYYY-MM-DD) no fuso do navegador no momento do registro, formatação pt-BR de data/hora no fuso do navegador, chave de dia de Brasília (para quota de IA e lembrete), helpers de janela de 30 dias corridos. Sem lógica de viagens.",
  "specRefs": [
    "spec.md#5.2",
    "arquitetura.md#1.1",
    "arquitetura.md#3.3"
  ],
  "covers": [
    "AC-11"
  ],
  "acceptance": [
    "localDate usa o fuso do navegador (testado com TZ diferentes) e muda à meia-noite local",
    "Timestamps persistidos são UTC; exibição usa Intl pt-BR no fuso do navegador",
    "brasiliaDateKey usa America/Sao_Paulo independentemente do fuso do navegador",
    "Nenhuma correção por viagem/mudança de fuso"
  ],
  "tests": [
    "app/src/lib/__tests__/time.test.ts"
  ],
  "protectedTests": [
    "app/src/lib/__tests__/time.test.ts"
  ],
  "tags": [],
  "difficulty": "easy",
  "dependsOn": [
    "F-0.01"
  ],
  "status": "in_progress",
  "attempts": 3,
  "costUsd": 0.7260581898560001,
  "origin": []
}

## Trechos da spec
<!-- spec.md#5.2 -->
### 5.2 Um registro ou vários registros no dia

- **Único por dia:** manter um valor por indicador e dia; novo preenchimento **no próprio dia** substitui o valor atual.
- **Múltiplos por dia:** cada resposta gera novo evento com timestamp UTC; a agregação definida no indicador calcula o valor consolidado para aquele dia.
- **Sem lançamento retroativo** e sem editar valores de dias anteriores. O usuário pode **excluir qualquer registro, inclusive passado**.
- Excluir uma entrada invalida os resumos afetados e recalcula o dashboard **com os dados atualmente existentes**, sem reconstruir retrospectivamente os snapshots de insights curtidos.
- Todos os timestamps persistidos são UTC. O frontend apresenta datas/horários no fuso do navegador e define a chave `localDate` no momento de registrar; sem tratamento especial de viagens e **sem validação adicional da data no servidor**.
- Registro vazio não equivale a zero ou resposta `Não`. Falsas presenças/ausências jamais entram nas análises.

<!-- arquitetura.md#1.1 -->
### 1.1 Princípios técnicos

- **Padrões fechados:** seguir a especificação funcional, inclusive limiares e agregações; não inventar critérios alternativos.
- **Separação de contas:** Firestore sob `users/{uid}` com regras efetivas inclusive para usuários anônimos.
- **Sem retroatividade de criação:** lançamentos só para o dia local atual do dispositivo. **Exclusão histórica liberada**.
- **Tempo simples:** armazenar timestamps em UTC e `localDate` calculada pelo navegador na inclusão; frontend apresenta no timezone do navegador; nenhuma validação especial de data ou viagem no servidor.
- **Discrição visual limitada:** olho alterna sigla/nome em rótulos textuais de indicador e oculta emoji; não modifica dados, valores ou apresentação gráfica.
- **IA sem números próprios:** apenas explicar métricas calculadas pelo motor determinístico, com cache e quota.
- **PWA:** instala, mas sem sincronização ou armazenamento offline.
- **Código e comentários em inglês; UI pt-BR.**

<!-- arquitetura.md#3.3 -->
### 3.3 Registro

```json
{
  "indicatorId": "ind_abc",
  "localDate": "2026-10-24",
  "recordedAt": "serverTimestamp",
  "valueType": "numeric",
  "value": { "number": 1.5 },
  "note": "Depois do almoço"
}
```

Valores possíveis de `value`: `{ "boolean": true }`, `{ "number": 7 }`, `{ "optionId": "high" }`. Sempre verificar compatibilidade com o tipo do indicador; `note` é opcional, sem tipo de indicador exclusivamente textual.

- Para `single_per_day`, ID determinístico por `indicatorId + localDate`; nova resposta do **dia vigente** substitui o documento.
- Para `multiple_per_day`, usar IDs únicos; guardar cada resposta de forma independente.
- **Excluir** um registro antigo é permitido. **Editar** valores de dias antigos ou criar registros retroativos não é permitido na interface.
- Guardar timestamps em UTC e `localDate` calculada no navegador no momento de registrar; front mostra hora local conforme o dispositivo. Sem tratamento especial de viagens/timezones e **sem validar data de registro no servidor**.
- Ao excluir/substituir, invalidar agregados daquele dia e recalcular insights da janela atual; **não reprocessar snapshots históricos salvos por like**.
- Não imputar ausência como `false` ou 0. Distinguir `false`, `0` e ausência de registro.

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


## Regras adicionais (feature crítica)

- **Estatística:** amostras e denominadores explícitos; ausência de registro nunca vira zero; `Não` explícito ≠ ausência; respeite os limiares fechados da spec (seção 6.5.1 / arquitetura 5.2); nunca use linguagem causal ("causa", "faz", "provoca").
- **Security Rules:** negar por padrão; acesso só ao próprio UID; validar o schema de cada documento; teste com `@firebase/rules-unit-testing` incluindo tentativas de acesso cruzado.
- **Privacidade:** use sempre o componente `<IndicatorLabel>`, nunca o nome cru do indicador; emojis ocultos com o olho fechado; nada de nomes em `aria-label`, `title`, `alt`, tooltips, `document.title`, `localStorage` ou logs.
- **Sincronização:** operações idempotentes; nunca sobrescrever dados de outro dispositivo sem regra explícita.
