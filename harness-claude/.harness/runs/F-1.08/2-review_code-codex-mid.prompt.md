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


# Papel: avaliador de código (independente)

Você é de outra família de modelo e não escreveu este código. Não edite arquivos.
Avalie a partir do diff abaixo (os gates já rodaram build, lint, tipos e testes). Abra outros arquivos só para confirmar um ponto específico; não explore o repositório inteiro.

Verifique:
- O código atende **de fato** aos critérios de aceite, sem implementar "para o teste" (hardcode, mocks indevidos, condicionais de teste em produção).
- Segurança (Security Rules, dados entre usuários, segredos), privacidade (nomes de indicadores só via `<IndicatorLabel>`), aderência à spec e qualidade (tipos, legibilidade, duplicação).

## Feature
```json
{
  "id": "F-1.08",
  "title": "Regras: documento do usuário e campos protegidos",
  "description": "firestore.rules: users/{uid} só aceita campos conhecidos com tipos válidos (onboardingCompleted: bool, aiConsent: bool, reminderEnabled: bool, lastInsightRefreshAt: timestamp, createdAt: timestamp, saveAccountInviteDismissedAt: timestamp|null, saveAccountInviteDismissedDayCount: int >= 0|null — estes dois últimos são o estado de dispensa do banner de F-2.11: momento da dispensa e número de dias distintos com registro naquele momento); campos administrativos e internal/ só via Admin SDK; isolamento entre UIDs incluindo anônimos.",
  "acceptance": [
    "UID A não lê nem escreve nada sob users/B (anônimo e permanente)",
    "Campos desconhecidos ou de tipo errado em users/{uid} são rejeitados",
    "Dono pode gravar saveAccountInviteDismissedAt (timestamp ou null) e saveAccountInviteDismissedDayCount (inteiro >= 0 ou null); string, negativo ou decimal são rejeitados",
    "internal/** inacessível a clientes"
  ],
  "specRefs": [
    "spec.md#9",
    "arquitetura.md#9.1",
    "arquitetura.md#9.2",
    "DECISOES.md#Login"
  ]
}
```

## Gates
G1 install-build: ok
G2 lint-format: ok
G3 typecheck: ok
G4 unit: ok
G5 security-rules: ok
G6 e2e: ok
G7 protected-tests: ok
G8 privacy-leak: ok
G9 a11y: ok
G10 mobile-layout: ok
G11 visual-regression: pulado
G12 lighthouse: pulado
G13 secrets: ok

## Diff
```diff
diff --git a/app/firestore.rules b/app/firestore.rules
index 7c952c6..0f2f245 100644
--- a/app/firestore.rules
+++ b/app/firestore.rules
@@ -1,17 +1,49 @@
 rules_version = '2';
 
 // Baseline: every document lives under users/{uid} and only that user may touch it.
-// Schema validation, locked indicator fields and immutable snapshots are added by later features.
+// Subcollection schemas, locked indicator fields and immutable snapshots are added by later features.
 service cloud.firestore {
   match /databases/{database}/documents {
     function isOwner(uid) {
       return request.auth != null && request.auth.uid == uid;
     }
 
+    // users/{uid} holds only client fields. Administrative fields (e.g. lastNotificationSentAt) live under
+    // internal/** (e.g. internal/userAdmin/users/{uid}), written by the Admin SDK and never readable by clients.
+    function hasOnlyUserFields(keys) {
+      return keys.hasOnly([
+        'onboardingCompleted', 'aiConsent', 'reminderEnabled', 'lastInsightRefreshAt', 'createdAt',
+        'saveAccountInviteDismissedAt', 'saveAccountInviteDismissedDayCount'
+      ]);
+    }
+
+    function validUserFields(data) {
+      let keys = data.keys();
+      return hasOnlyUserFields(keys)
+        && (!('onboardingCompleted' in keys) || data.onboardingCompleted is bool)
+        && (!('aiConsent' in keys) || data.aiConsent is bool)
+        && (!('reminderEnabled' in keys) || data.reminderEnabled is bool)
+        && (!('lastInsightRefreshAt' in keys) || data.lastInsightRefreshAt is timestamp)
+        && (!('createdAt' in keys) || data.createdAt is timestamp)
+        && (!('saveAccountInviteDismissedAt' in keys)
+          || data.saveAccountInviteDismissedAt == null || data.saveAccountInviteDismissedAt is timestamp)
+        && (!('saveAccountInviteDismissedDayCount' in keys)
+          || data.saveAccountInviteDismissedDayCount == null
+          || (data.saveAccountInviteDismissedDayCount is int && data.saveAccountInviteDismissedDayCount >= 0));
+    }
+
     match /users/{uid} {
-      allow read, write: if isOwner(uid);
+      // Fail closed: a document carrying a non-client field (misplaced admin data) is not readable by the owner.
+      allow read: if isOwner(uid) && (resource == null || hasOnlyUserFields(resource.data.keys()));
+      // The whole resulting document is validated, and a document holding misplaced admin fields is frozen for
+      // clients, so they can neither add nor strip (e.g. by overwriting with setDoc) those fields.
+      allow create: if isOwner(uid) && validUserFields(request.resource.data);
+      allow update: if isOwner(uid) && hasOnlyUserFields(resource.data.keys()) && validUserFields(request.resource.data);
+      // Account deletion runs in a Cloud Function (Admin SDK) that also cleans subcollections and Auth.
+      allow delete: if false;
 
-      match /{document=**} {
+      // {collection} forces at least one segment: in rules v2 a bare {document=**} would also match users/{uid}.
+      match /{collection}/{document=**} {
         allow read, write: if isOwner(uid);
       }
     }
diff --git a/app/tests/rules/users.test.ts b/app/tests/rules/users.test.ts
new file mode 100644
index 0000000..95fb3a0
--- /dev/null
+++ b/app/tests/rules/users.test.ts
@@ -0,0 +1,133 @@
+import { readFileSync } from 'node:fs';
+import {
+  assertFails,
+  assertSucceeds,
+  initializeTestEnvironment,
+  type RulesTestEnvironment,
+} from '@firebase/rules-unit-testing';
+import { doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
+import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
+
+let env: RulesTestEnvironment;
+
+beforeAll(async () => {
+  env = await initializeTestEnvironment({
+    projectId: 'demo-pulsar-rules-users',
+    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
+  });
+});
+beforeEach(() => env.clearFirestore());
+afterAll(() => env.cleanup());
+
+// Token options are cast: the SDK types restrict sign_in_provider to a fixed union.
+const anonymous = (uid: string) =>
+  env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } } as never).firestore();
+const permanent = (uid: string) =>
+  env.authenticatedContext(uid, { firebase: { sign_in_provider: 'google.com' } } as never).firestore();
+
+const seedAdmin = (path: string, data: Record<string, unknown>) =>
+  env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), path), data));
+
+describe('users/{uid} isolation', () => {
+  it.each([
+    ['anonymous', anonymous],
+    ['permanent', permanent],
+  ])('%s UID A cannot read or write anything under users/B', async (_name, ctxFor) => {
+    await seedAdmin('users/bob', { aiConsent: true });
+    await seedAdmin('users/bob/entries/e1', { x: 1 });
+    const alice = ctxFor('alice');
+    await assertFails(getDoc(doc(alice, 'users/bob')));
+    await assertFails(setDoc(doc(alice, 'users/bob'), { aiConsent: false }));
+    await assertFails(updateDoc(doc(alice, 'users/bob'), { aiConsent: false }));
+    await assertFails(getDoc(doc(alice, 'users/bob/entries/e1')));
+    await assertFails(setDoc(doc(alice, 'users/bob/entries/e2'), { x: 1 }));
+  });
+
+  it('blocks unauthenticated access', async () => {
+    await seedAdmin('users/bob', { aiConsent: true });
+    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'users/bob')));
+  });
+
+  it('lets owners write valid documents (anonymous and permanent)', async () => {
+    await assertSucceeds(setDoc(doc(anonymous('anon'), 'users/anon'), { onboardingCompleted: true }));
+    await assertSucceeds(
+      setDoc(doc(permanent('perm'), 'users/perm'), {
+        onboardingCompleted: false,
+        aiConsent: true,
+        reminderEnabled: false,
+        lastInsightRefreshAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00Z')),
+        createdAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00Z')),
+      }),
+    );
+  });
+});
+
+describe('users/{uid} schema validation', () => {
+  const ref = () => doc(permanent('alice'), 'users/alice');
+
+  it('rejects unknown fields', async () => {
+    await assertFails(setDoc(ref(), { onboardingCompleted: true, hacked: true }));
+    await assertFails(setDoc(ref(), { lastNotificationSentAt: Timestamp.now() }));
+  });
+
+  it.each([
+    ['onboardingCompleted', 'yes'],
+    ['aiConsent', 1],
+    ['reminderEnabled', 'true'],
+    ['lastInsightRefreshAt', 'today'],
+    ['createdAt', 123],
+  ])('rejects wrong type for %s', async (field, value) => {
+    await assertFails(setDoc(ref(), { [field]: value }));
+  });
+
+  it('rejects unknown fields on update of an existing document', async () => {
+    await seedAdmin('users/alice', { aiConsent: false });
+    await assertFails(updateDoc(ref(), { somethingElse: 1 }));
+    await assertSucceeds(updateDoc(ref(), { aiConsent: true }));
+  });
+});
+
+describe('save-account invite dismissal state', () => {
+  const ref = () => doc(anonymous('alice'), 'users/alice');
+
+  it('accepts a timestamp or null for saveAccountInviteDismissedAt', async () => {
+    await assertSucceeds(setDoc(ref(), { saveAccountInviteDismissedAt: Timestamp.now() }));
+    await assertSucceeds(setDoc(ref(), { saveAccountInviteDismissedAt: null }));
+  });
+
+  it('accepts an integer >= 0 or null for saveAccountInviteDismissedDayCount', async () => {
+    await assertSucceeds(setDoc(ref(), { saveAccountInviteDismissedDayCount: 0 }));
+    await assertSucceeds(setDoc(ref(), { saveAccountInviteDismissedDayCount: 3 }));
+    await assertSucceeds(setDoc(ref(), { saveAccountInviteDismissedDayCount: null }));
+    await assertSucceeds(
+      setDoc(ref(), { saveAccountInviteDismissedAt: Timestamp.now(), saveAccountInviteDismissedDayCount: 5 }),
+    );
+  });
+
+  it.each([
+    ['string', '3'],
+    ['negative', -1],
+    ['decimal', 2.5],
+    ['boolean', true],
+  ])('rejects %s for saveAccountInviteDismissedDayCount', async (_name, value) => {
+    await assertFails(setDoc(ref(), { saveAccountInviteDismissedDayCount: value }));
+  });
+
+  it.each([
+    ['string', '2026-01-01'],
+    ['number', 1700000000],
+  ])('rejects %s for saveAccountInviteDismissedAt', async (_name, value) => {
+    await assertFails(setDoc(ref(), { saveAccountInviteDismissedAt: value }));
+  });
+});
+
+describe('internal/**', () => {
+  it('is inaccessible to clients', async () => {
+    const alice = permanent('alice');
+    await seedAdmin('internal/userQuotas', { n: 1 });
+    await assertFails(getDoc(doc(alice, 'internal/userQuotas')));
+    await assertFails(setDoc(doc(alice, 'internal/userQuotas'), { n: 2 }));
+    await assertFails(setDoc(doc(anonymous('anon'), 'internal/x/y/z'), { n: 2 }));
+    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'internal/userQuotas')));
+  });
+});
diff --git a/app/tests/rules/usersAdminFields.test.ts b/app/tests/rules/usersAdminFields.test.ts
new file mode 100644
index 0000000..ae466f3
--- /dev/null
+++ b/app/tests/rules/usersAdminFields.test.ts
@@ -0,0 +1,54 @@
+import { readFileSync } from 'node:fs';
+import {
+  assertFails,
+  assertSucceeds,
+  initializeTestEnvironment,
+  type RulesTestEnvironment,
+} from '@firebase/rules-unit-testing';
+import { deleteDoc, deleteField, doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
+import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
+
+let env: RulesTestEnvironment;
+
+beforeAll(async () => {
+  env = await initializeTestEnvironment({
+    projectId: 'demo-pulsar-rules-users-admin',
+    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
+  });
+});
+beforeEach(() => env.clearFirestore());
+afterAll(() => env.cleanup());
+
+const seedAdmin = (path: string, data: Record<string, unknown>) =>
+  env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), path), data));
+
+describe('administrative fields stay out of client reach', () => {
+  const alice = () => env.authenticatedContext('alice').firestore();
+
+  it('lets the owner read a missing or client-only profile', async () => {
+    await assertSucceeds(getDoc(doc(alice(), 'users/alice')));
+    await seedAdmin('users/alice', { aiConsent: true });
+    await assertSucceeds(getDoc(doc(alice(), 'users/alice')));
+  });
+
+  it('does not expose or let the owner rewrite misplaced admin fields', async () => {
+    await seedAdmin('users/alice', { aiConsent: true, lastNotificationSentAt: Timestamp.now() });
+    await assertFails(getDoc(doc(alice(), 'users/alice')));
+    await assertFails(updateDoc(doc(alice(), 'users/alice'), { aiConsent: false }));
+    await assertFails(updateDoc(doc(alice(), 'users/alice'), { lastNotificationSentAt: deleteField() }));
+    await assertFails(setDoc(doc(alice(), 'users/alice'), { aiConsent: false }));
+  });
+
+  it('denies direct deletion of the profile, with or without admin fields', async () => {
+    await seedAdmin('users/alice', { aiConsent: true });
+    await assertFails(deleteDoc(doc(alice(), 'users/alice')));
+    await seedAdmin('users/alice', { aiConsent: true, lastNotificationSentAt: Timestamp.now() });
+    await assertFails(deleteDoc(doc(alice(), 'users/alice')));
+  });
+
+  it('keeps the per-user admin document under internal/ unreadable', async () => {
+    await seedAdmin('internal/userAdmin/users/alice', { lastNotificationSentAt: Timestamp.now() });
+    await assertFails(getDoc(doc(alice(), 'internal/userAdmin/users/alice')));
+    await assertFails(deleteDoc(doc(alice(), 'internal/userAdmin/users/alice')));
+  });
+});
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
