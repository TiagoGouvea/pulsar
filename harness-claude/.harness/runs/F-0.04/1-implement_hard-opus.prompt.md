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
app/tests/rules/baseline.test.ts
- Rode `yarn lint`, `yarn typecheck`, `yarn test:unit` e os e2e relevantes antes de terminar.
- Respeite o `screen.png` e o `code.html` da tela correspondente em `design/` e os tokens de `design/pulsar_bio_analytics/DESIGN.md`; reutilize os componentes de `app/src/design/`.
- Se a feature criar uma tela nova, adicione a rota em `app/e2e/routes.json`.
- Nunca implemente "para o teste" (hardcode, mocks no código de produção): um avaliador de outra família revisa o diff.

## Diagnóstico da tentativa anterior
(primeira tentativa)

## Feature
```json
{
  "id": "F-0.04",
  "stage": 0,
  "title": "Firebase com emuladores e regras-base por UID",
  "description": "firebase.json (Auth 9299, Firestore 8282, Hosting, projeto offline demo-pulsar), src/lib/firebase.ts conectando aos emuladores em builds de emulador, firestore.rules base (dono acessa só users/{uid}/**, internal/** negado) e script test:rules com @firebase/rules-unit-testing. Feito pelo inicializador.",
  "specRefs": [
    "arquitetura.md#1",
    "arquitetura.md#9.1",
    "spec.md#9"
  ],
  "covers": [
    "AC-04"
  ],
  "acceptance": [
    "yarn test:rules sobe o emulador do Firestore e roda tests/rules",
    "firestore.rules nega acesso entre UIDs e a internal/",
    "Build de produção não aponta para emuladores"
  ],
  "tests": [
    "app/tests/rules/baseline.test.ts"
  ],
  "protectedTests": [
    "app/tests/rules/baseline.test.ts"
  ],
  "tags": [
    "security-rules"
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

<!-- spec.md#9 -->
## 9. Privacidade, segurança e confiança

- Firestore com **Security Rules por UID** e testes de isolamento entre usuários, incluindo contas anônimas.
- Contas anônimas têm dados privados, mas sua recuperabilidade depende da sessão; o app explica isso e oferece conversão.
- Acesso à IA exige consentimento curto e explícito antes de compartilhar agregados; permitir revogar. Não enviar observações livres ou histórico bruto desnecessariamente.
- Excluir conta deve remover usuário do Firebase Auth e seus dados relacionados (subcoleções, feedback, conclusões, preferências e tokens de push), por operação segura no backend.
- HTTPS; chaves de servidor apenas no backend; não gravar nomes/notas sensíveis em logs ou payloads de notificação.
- Não criar um sistema burocrático de conformidade LGPD para a V1; manter essas proteções mínimas mesmo sendo um projeto pessoal.

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


## Regras adicionais (feature crítica)

- **Estatística:** amostras e denominadores explícitos; ausência de registro nunca vira zero; `Não` explícito ≠ ausência; respeite os limiares fechados da spec (seção 6.5.1 / arquitetura 5.2); nunca use linguagem causal ("causa", "faz", "provoca").
- **Security Rules:** negar por padrão; acesso só ao próprio UID; validar o schema de cada documento; teste com `@firebase/rules-unit-testing` incluindo tentativas de acesso cruzado.
- **Privacidade:** use sempre o componente `<IndicatorLabel>`, nunca o nome cru do indicador; emojis ocultos com o olho fechado; nada de nomes em `aria-label`, `title`, `alt`, tooltips, `document.title`, `localStorage` ou logs.
- **Sincronização:** operações idempotentes; nunca sobrescrever dados de outro dispositivo sem regra explícita.
