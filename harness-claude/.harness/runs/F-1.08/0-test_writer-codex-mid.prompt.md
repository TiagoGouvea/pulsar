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
- [L-006] Decisão do humano: O que conta como 'alguns usos' para o convite de instalar a PWA? → N aberturas do app — 2 aberturas, repetir nos dias seguintes ao usar
- [L-007] Decisão do humano: O que é 'evidência nova material' para uma hipótese com dislike reaparecer? → >= 7 dias pareados a mais que a versão descartada ou inversão do sinal do efeito — >= 7 dias pareados a mais que a versão descartada ou inversão do sinal do efeito (padrão)
- [L-008] Decisão do humano: Com quais dias a comparação a partir do 2º dia é feita? → Média dos dias anteriores — Média dos dias anteriores; talvez 7 ou 10 dias
- [L-009] Decisão do humano: Como definir as duas janelas consecutivas de 7 dias das tendências? → hoje..hoje-6 vs. hoje-7..hoje-13 em dias corridos do localDate — hoje..hoje-6 vs. hoje-7..hoje-13 em dias corridos do localDate (padrão)
- [L-010] Decisão do humano: Tendências podem ser geradas para Fatores? → Não; só Resultados numéricos/escala (spec 6.2 'Tendência de um resultado') — Não; só Resultados numéricos/escala (spec 6.2 'Tendência de um resultado') (padrão)
- [L-011] Decisão do humano: Como ordenar os cartões elegíveis? → Razão efeito/limiar desc, depois dias pareados desc, depois hypothesisKey asc — Razão efeito/limiar desc, depois dias pareados desc, depois hypothesisKey asc (padrão)
- [L-012] Decisão do humano: Quais níveis de evidência rotular? → Só 'Descrição' e 'Possível associação'; sem 'sinal consistente' — Só 'Descrição' e 'Possível associação'; sem 'sinal consistente' (padrão)
- [L-013] Decisão do humano: O que o snapshot de like copia? → Tokens do texto, métricas, amostra, período e nome/sigla/emoji dos indicadores no momento; removível, nunca editável — Tokens do texto, métricas, amostra, período e nome/sigla/emoji dos indicadores no momento; removível, nunca editável (padrão)
- [L-014] Decisão do humano: Limites de tamanho de campos? → Sigla até 4 (exibida como digitada), nome 60, unidade 20, observação 500, opções ordinais 2-7 — Sigla até 4 (exibida como digitada), nome 60, unidade 20, observação 500, opções ordinais 2-7 (padrão)
- [L-015] Decisão do humano: Como representar 'sem resposta' em Sim/Não? → Tocar de novo na opção selecionada limpa a resposta e exclui o registro de hoje — Tocar de novo na opção selecionada limpa a resposta e exclui o registro de hoje (padrão)


# Papel: escritor de testes de aceite

Escreva os testes de aceite da feature abaixo **antes** da implementação.

- Os testes devem **falhar hoje** e passar com uma implementação correta. Não implemente a feature.
- Cubra cada critério de `acceptance`. Use os caminhos de `tests`/`protectedTests` da feature.
- Determinísticos: sem hora real (use relógio controlado, ex. `vi.useFakeTimers` / `page.clock`), rodando no emulador do Firebase.
- E2E com Playwright no projeto `mobile` (o app é somente mobile); no `desktop`, só um smoke de que a tela abre e não quebra; unit com Vitest. Nada de `.skip`, `.only`, `fixme`.
- Asserts verificam comportamento observável, não detalhes de implementação.
- Para privacidade, use os nomes sentinela do seed e verifique DOM visível, `aria-*`, `title` e tooltips.

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
  "status": "failing",
  "attempts": 0,
  "costUsd": 1.3204914,
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
- 2026-11-01T18:42 ⛔ F-1.01 BLOQUEADA: limite de 5 tentativas atingido │ features 0/12
- 2026-11-01T18:52 ⛔ F-1.08 BLOQUEADA: limite de 5 tentativas atingido │ features 0/12
- 2026-11-01T19:01 ⛔ F-1.10 BLOQUEADA: limite de 5 tentativas atingido │ features 0/12
- 2026-11-01T19:02 ▶ etapa 1 (Base) │ features 0/13 │ 4 bloqueadas │ US$ 5.46/10 │ branch 1-base
- 2026-11-01T19:03 ⛔ F-1.fix-1 BLOQUEADA: test_writer não produziu testes de aceite │ features 0/13
- 2026-11-01T19:04 ✖ interrompido por SIGINT em STAGE_GATES: rode harness resume para continuar
- 2026-11-02T12:18 ▶ etapa 1 (Base) │ features 0/12 │ 0 bloqueadas │ US$ 5.58/10 │ branch 1-base
- 2026-11-02T12:19 ⛔ F-1.02 BLOQUEADA: test_writer não produziu testes de aceite │ features 0/12
- 2026-11-02T12:20 ⛔ F-1.01 BLOQUEADA: test_writer não produziu testes de aceite │ features 0/12
- 2026-11-02T12:20 ✖ interrompido por SIGINT em STAGE_RUNNING: rode harness resume para continuar
- 2026-11-02T12:22 ▶ etapa 1 (Base) │ features 0/12 │ 0 bloqueadas │ US$ 6.32/10 │ branch 1-base
- 2026-11-02T12:23 ⛔ F-1.02 BLOQUEADA: test_writer não produziu testes de aceite │ features 0/12
- 2026-11-02T12:23 ✖ interrompido por SIGINT em STAGE_RUNNING: rode harness resume para continuar
- 2026-11-02T12:25 ▶ etapa 1 (Base) │ features 0/12 │ 0 bloqueadas │ US$ 6.78/10 │ branch 1-base
- 2026-11-02T12:29 ✔ F-1.02 passing — Utilitários de tempo (UTC, localDate do navegador, dia de Brasília) (worker glm-flash, 1 tentativa(s), US$ 2.40) │ features 1/12
- 2026-11-02T12:29 ✖ interrompido por SIGINT em STAGE_RUNNING: rode harness resume para continuar
- 2026-11-02T12:29 ▶ etapa 1 (Base) │ features 1/12 │ 0 bloqueadas │ US$ 7.25/10 │ branch 1-base

