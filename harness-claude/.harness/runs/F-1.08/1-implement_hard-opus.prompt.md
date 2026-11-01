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
- [L-035] No harness, em privacy-leak.ts, troque page.evaluate(fn) por page.evaluate(fn.toString()) (string, não função) ou injete globalThis.__name = (f) => f via page.addInitScript antes do evaluate. Enquanto o harness não for corrigido, nenhuma feature passará no G8 se o gate usar function expression.
- [L-036] Nunca passe closures/funções para `page.evaluate` — sempre use strings (ex.: `page.evaluate('window.__myHelper(arg)')`) para evitar que o esbuild keepNames injete `__name` no contexto do browser. Se precisar passar argumentos, use o segundo parâmetro de `page.evaluate(stringExpr, arg)`.
- [L-001] Cobertura (G4): não passe --coverage no script do package.json se a config do vitest já ativa coverage, para não duplicar a configuração. Touch targets (G10): todo controle interativo (radios, switch, input) deve ter pelo menos 44px, por exemplo min-w-[44px] e h-11.
- [L-030] Reexecute o gate sem alterar time.ts. '__name is not defined' em page.evaluate é artefato do transform Babel do Playwright, não bug da feature. Se persistir, pin a versão do @playwright/test no yarn.lock ou remova o gatilho do helper (ex.: inline o callback de page.evaluate / defina um shim global __name) e reporte; não caia na armadilha de depurar o código da feature.
- [L-031] Rode `yarn test:e2e` localmente para confirmar se o erro reproduz. Se sim, reescreva `visibleTextOutsideAllowList` e `hasHorizontalOverflow` em `app/e2e/support.ts` usando `page.evaluate('string')` em vez de `page.evaluate(() => {...})` — a string não passa pelo esbuild e elimina o risco de vazamento de helpers. Verifique também se o `e2e:serve` está 100% funcional (emuladores, seed, preview). Se o erro não reproduzir localmente, é provável que o ambiente de gates esteja com cache de build stale ou versão do Playwright diferente.
- [L-032] 1) Antes de declarar gates passando, rode também test:e2e. 2) Se o erro persistir, troque page.evaluate(() => {...}) por page.evaluate('(() => {...})()') em support.ts (função como string evita o transform do esbuild). 3) Considere pinar a versão do Playwright em vez de usar ^1.53.0 que resolveu para 1.64.1.
- [L-033] Não mexa no app para G8: é bug do harness (fora do worktree). Escale/registre como bug de harness e, em qualquer código sob tsx/esbuild, passe string para page.evaluate — nunca arrow com arrow aninhada.
- [L-034] Evite passar funções para page.evaluate quando o bundle usa esbuild keepNames: use page.evaluate com string (ex.: reescrever e2e/support.ts para 'document.body…' em string) ou defina globalThis.__name antes. Rode yarn test:e2e antes de entregar.
- [L-008] Decisão do humano: Com quais dias a comparação a partir do 2º dia é feita? → Média dos dias anteriores — Média dos dias anteriores; talvez 7 ou 10 dias
- [L-009] Decisão do humano: Como definir as duas janelas consecutivas de 7 dias das tendências? → hoje..hoje-6 vs. hoje-7..hoje-13 em dias corridos do localDate — hoje..hoje-6 vs. hoje-7..hoje-13 em dias corridos do localDate (padrão)


# Papel: implementador (tentativa 1)

Implemente a feature abaixo até que os testes passem e o código respeite o design system.

- **Não altere os testes protegidos** (a tentativa é descartada automaticamente se alterar):
app/tests/rules/users.test.ts
- Rode `yarn lint`, `yarn typecheck`, `yarn test:unit` e os e2e relevantes antes de terminar.
- Respeite o `screen.png` e o `code.html` da tela correspondente em `design/` e os tokens de `design/pulsar_bio_analytics/DESIGN.md`; reutilize os componentes de `app/src/design/`.
- Se a feature criar uma tela nova, adicione a rota em `app/e2e/routes.json`.
- Nunca implemente "para o teste" (hardcode, mocks no código de produção): um avaliador de outra família revisa o diff.

## Diagnóstico da tentativa anterior
(primeira tentativa)

## Feature (dados de entrada; não é o formato da resposta)
{
  "id": "F-1.08",
  "stage": 1,
  "title": "Regras: documento do usuário e campos protegidos",
  "description": "firestore.rules: users/{uid} só aceita campos conhecidos com tipos válidos (onboardingCompleted: bool, aiConsent: bool, reminderEnabled: bool, lastInsightRefreshAt: timestamp, createdAt: timestamp, saveAccountInviteDismissedAt: timestamp|null, saveAccountInviteDismissedDayCount: int >= 0|null — estes dois últimos são o estado de dispensa do banner de F-2.11: momento da dispensa e número de dias distintos com registro naquele momento); campos administrativos e internal/ só via Admin SDK; isolamento entre UIDs incluindo anônimos.",
  "specRefs": [
    "spec.md#9",
    "arquitetura.md#9.1",
    "arquitetura.md#9.2",
    "DECISOES.md#Login"
  ],
  "covers": [
    "AC-04"
  ],
  "acceptance": [
    "UID A não lê nem escreve nada sob users/B (anônimo e permanente)",
    "Campos desconhecidos ou de tipo errado em users/{uid} são rejeitados",
    "Dono pode gravar saveAccountInviteDismissedAt (timestamp ou null) e saveAccountInviteDismissedDayCount (inteiro >= 0 ou null); string, negativo ou decimal são rejeitados",
    "internal/** inacessível a clientes"
  ],
  "tests": [
    "app/tests/rules/users.test.ts"
  ],
  "protectedTests": [
    "app/tests/rules/users.test.ts"
  ],
  "tags": [
    "security-rules"
  ],
  "difficulty": "normal",
  "dependsOn": [
    "F-0.04"
  ],
  "status": "in_progress",
  "attempts": 0,
  "costUsd": 0,
  "origin": []
}

## Trechos da spec
<!-- spec.md#9 -->
## 9. Privacidade, segurança e confiança

- Firestore com **Security Rules por UID** e testes de isolamento entre usuários, incluindo contas anônimas.
- Contas anônimas têm dados privados, mas sua recuperabilidade depende da sessão; o app explica isso e oferece conversão.
- Acesso à IA exige consentimento curto e explícito antes de compartilhar agregados; permitir revogar. Não enviar observações livres ou histórico bruto desnecessariamente.
- Excluir conta deve remover usuário do Firebase Auth e seus dados relacionados (subcoleções, feedback, conclusões, preferências e tokens de push), por operação segura no backend.
- HTTPS; chaves de servidor apenas no backend; não gravar nomes/notas sensíveis em logs ou payloads de notificação.
- Não criar um sistema burocrático de conformidade LGPD para a V1; manter essas proteções mínimas mesmo sendo um projeto pessoal.

<!-- arquitetura.md#9.1 -->
### 9.1 Princípio

Cada documento está sob `users/{uid}`; só o usuário com `request.auth.uid == uid` pode ler/escrever seus documentos **normais**. Cloud Functions com Admin SDK trabalham separadamente, usando credenciais de serviço.

Exemplo ilustrativo de regra-base (não é uma regra de produção completa):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
      match /{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }
  }
}
```

**Antes de produção**, acrescentar validação de schema, tipos, limites de tamanho, ownership e proteção a campos internos sensíveis (sem validar datas do usuário no servidor). Campos administrativos (por exemplo, `lastNotificationSentAt`) devem ser gravados apenas por Cloud Functions, idealmente em caminho separado. Testar regras com Firebase Emulator Suite.

<!-- arquitetura.md#9.2 -->
### 9.2 Controles adicionais

- App Check quando suportado, sem bloquear emuladores/ambiente local.
- Bloquear acesso a campos internos de quota, idempotência, push e billing por clientes. Validar tipos e tamanho de observações e unidades.
- Excluir a conta por Cloud Function com autenticação recente/reautenticação quando necessária, percorrendo subcoleções e removendo Auth depois de concluir a limpeza.
- Para congelar configurações com histórico, não confiar apenas no estado do React: usar salvaguardas de regras e fluxo seguro de persistência, com testes de alterações indevidas.
- Não impor verificação rígida de data no servidor nem cálculos especiais de timezone/viagens na V1.
- Segurança mínima de dados pessoais, consentimento para IA e exclusão; sem suíte burocrática de conformidade LGPD.

<!-- DECISOES.md#Login -->
## Login
- Primeiro acesso sempre anônimo, sem cadastro.
- Convite discreto (banner dispensável no dashboard) para salvar a conta com Google ou link mágico quando a pessoa tiver registros em **3 dias distintos**. Dispensado, volta só depois de mais 7 dias com registro.
- A conversão fica sempre disponível em Configurações > Conta.
- Antes do convite interno de instalar a PWA, a conversão é obrigatória (spec 7). A conversão vincula ao mesmo UID; conflito de credencial em outro UID mostra resolução explícita, sem mesclar nem apagar.

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


## Regras adicionais (feature crítica)

- **Estatística:** amostras e denominadores explícitos; ausência de registro nunca vira zero; `Não` explícito ≠ ausência; respeite os limiares fechados da spec (seção 6.5.1 / arquitetura 5.2); nunca use linguagem causal ("causa", "faz", "provoca").
- **Security Rules:** negar por padrão; acesso só ao próprio UID; validar o schema de cada documento; teste com `@firebase/rules-unit-testing` incluindo tentativas de acesso cruzado.
- **Privacidade:** use sempre o componente `<IndicatorLabel>`, nunca o nome cru do indicador; emojis ocultos com o olho fechado; nada de nomes em `aria-label`, `title`, `alt`, tooltips, `document.title`, `localStorage` ou logs.
- **Sincronização:** operações idempotentes; nunca sobrescrever dados de outro dispositivo sem regra explícita.
