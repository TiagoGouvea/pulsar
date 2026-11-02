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
- [L-005] Se gemini-pro falhar como revisor, use o fallback (haiku ou sonnet). Ele resolveu a revisão sem custo extra relevante em evt-43/evt-44 e evt-19/evt-20.
- [L-016] Decisão do humano: Qual controle usar para escala? → Pílulas tocáveis até 11 valores; slider nativo acima disso — Pílulas tocáveis até 11 valores; slider nativo acima disso (padrão)
- [L-018] Decisão do humano: Onde fica o histórico de registros? → A partir do indicador em Meus indicadores, exclusão com confirmação — A partir do indicador em Meus indicadores, exclusão com confirmação (padrão)
- [L-019] Decisão do humano: Quais rotas usar? → /onboarding, /dashboard, /register, /indicators, /saved-insights, /insights/:hypothesisKey, /settings, /install — /onboarding, /dashboard, /register, /indicators, /saved-insights, /insights/:hypothesisKey, /settings, /install (padrão)
- [L-020] Decisão do humano: Como o layout se comporta no computador? → Coluna central até 960 px; listas de cartões em grid auto-fit (mín. 300 px) — Coluna central até 960 px; listas de cartões em grid auto-fit (mín. 300 px) (padrão)
- [L-021] Decisão do humano: Como resolver conflito de credencial na conversão? → Opções 'Cancelar' ou 'Entrar na conta existente' com aviso; nada é apagado nem mesclado — Opções 'Cancelar' ou 'Entrar na conta existente' com aviso; nada é apagado nem mesclado (padrão)
- [L-022] Decisão do humano: De onde servir ícones e fontes? → Material Symbols, Geist e Space Grotesk via pacotes npm, sem CDN — Material Symbols, Geist e Space Grotesk via pacotes npm, sem CDN (padrão)
- [L-023] Decisão do humano: Como identificar e autenticar o usuário do seed? → seed-user-0001 (seed@pulsar.test, sem senha), 30 dias terminando hoje, login e2e por custom token; --demo só com HARNESS_ALLOW_DEMO_SEED=1 e --project sem 'prod' — seed-user-0001 (seed@pulsar.test, sem senha), 30 dias terminando hoje, login e2e por custom token; --demo só com HARNESS_ALLOW_DEMO_SEED=1 e --project sem 'prod' (padrão)
- [L-024] Decisão do humano: Quais portas usar nos emuladores? → Firestore 8282, Auth 9299 (fonte única app/firebase.json) — Firestore 8282, Auth 9299 (fonte única app/firebase.json) (padrão)
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
  "id": "F-1.11",
  "title": "Function deleteAccount: exclusão integral",
  "description": "Callable v2 deleteAccount: exige auth; contas não anônimas exigem auth_time recente (<= 5 min); apaga recursivamente users/{uid} (todas as subcoleções, tokens de push, feedback, conclusões), documentos em internal/ do UID e, por último, o usuário do Auth. Idempotente.",
  "acceptance": [
    "Após a chamada não resta documento sob users/{uid} nem em internal/ para o UID",
    "Usuário removido do Auth somente depois da limpeza",
    "Conta Google/e-mail sem login recente recebe erro requires-recent-login",
    "Um UID não consegue excluir outro"
  ],
  "specRefs": [
    "spec.md#3",
    "spec.md#9",
    "arquitetura.md#9.2",
    "DECISOES.md#Exclusão de conta"
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
diff --git a/app/functions/src/__tests__/deleteAccount.test.ts b/app/functions/src/__tests__/deleteAccount.test.ts
new file mode 100644
index 0000000..3b0b7df
--- /dev/null
+++ b/app/functions/src/__tests__/deleteAccount.test.ts
@@ -0,0 +1,187 @@
+import { afterAll, beforeAll, describe, expect, it } from 'vitest';
+
+// Runs against the Auth, Firestore and Functions emulators (project demo-pulsar, ports from firebase.json).
+process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8282';
+process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9299';
+
+const PROJECT = 'demo-pulsar';
+const FUNCTION_URL = `http://127.0.0.1:5001/${PROJECT}/southamerica-east1/deleteAccount`;
+
+type Provider = 'anonymous' | 'google.com' | 'password';
+
+const { initializeApp, deleteApp } = await import('firebase-admin/app');
+const { getAuth } = await import('firebase-admin/auth');
+const { getFirestore } = await import('firebase-admin/firestore');
+
+const app = initializeApp({ projectId: PROJECT }, 'delete-account-test');
+const auth = getAuth(app);
+const db = getFirestore(app);
+
+// The emulators accept unsigned ID tokens, which lets us control auth_time deterministically.
+function idToken(uid: string, provider: Provider, authAgeSeconds: number): string {
+  const now = Math.floor(Date.now() / 1000);
+  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
+  const payload = {
+    iss: `https://securetoken.google.com/${PROJECT}`,
+    aud: PROJECT,
+    auth_time: now - authAgeSeconds,
+    iat: now,
+    exp: now + 3600,
+    sub: uid,
+    user_id: uid,
+    firebase: { identities: {}, sign_in_provider: provider },
+  };
+  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.`;
+}
+
+async function callDeleteAccount(token: string | null, data: object = {}) {
+  const response = await fetch(FUNCTION_URL, {
+    method: 'POST',
+    headers: {
+      'Content-Type': 'application/json',
+      ...(token ? { Authorization: `Bearer ${token}` } : {}),
+    },
+    body: JSON.stringify({ data }),
+  });
+  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
+}
+
+async function seedUser(uid: string, provider: Provider) {
+  await auth.createUser({ uid, ...(provider === 'anonymous' ? {} : { email: `${uid}@pulsar.test` }) });
+  const user = db.doc(`users/${uid}`);
+  await user.set({ onboardingCompleted: true });
+  await user.collection('indicators').doc('ind-1').set({ name: 'x' });
+  await user.collection('indicators').doc('ind-1').collection('records').doc('2026-01-01').set({ value: 1 });
+  await user.collection('records').doc('r-1').set({ value: 2 });
+  await user.collection('pushTokens').doc('t-1').set({ token: 'abc' });
+  await user.collection('feedback').doc('f-1').set({ text: 'hi' });
+  await user.collection('completions').doc('c-1').set({ done: true });
+  await db.doc(`internal/${uid}`).set({ quota: 1 });
+  await db.doc(`internal/${uid}/quota/2026-01-01`).set({ used: 1 });
+}
+
+async function leftovers(uid: string): Promise<string[]> {
+  const paths: string[] = [];
+  for (const root of [`users/${uid}`, `internal/${uid}`]) {
+    if ((await db.doc(root).get()).exists) paths.push(root);
+    const stack = [db.doc(root)];
+    while (stack.length) {
+      const doc = stack.pop()!;
+      for (const col of await doc.listCollections()) {
+        for (const ref of await col.listDocuments()) {
+          paths.push(ref.path);
+          stack.push(ref);
+        }
+      }
+    }
+  }
+  return paths;
+}
+
+async function authUserExists(uid: string): Promise<boolean> {
+  try {
+    await auth.getUser(uid);
+    return true;
+  } catch {
+    return false;
+  }
+}
+
+const created: string[] = [];
+async function newUser(provider: Provider) {
+  const uid = `del-${provider.replace('.', '-')}-${Math.random().toString(36).slice(2, 10)}`;
+  created.push(uid);
+  await seedUser(uid, provider);
+  return uid;
+}
+
+describe('deleteAccount callable', () => {
+  beforeAll(() => {
+    expect(process.env.FIRESTORE_EMULATOR_HOST).toBeTruthy();
+  });
+
+  afterAll(async () => {
+    for (const uid of created) {
+      await db.recursiveDelete(db.doc(`users/${uid}`));
+      await db.recursiveDelete(db.doc(`internal/${uid}`));
+      await auth.deleteUser(uid).catch(() => undefined);
+    }
+    await deleteApp(app);
+  });
+
+  it('rejects unauthenticated calls', async () => {
+    const { status, body } = await callDeleteAccount(null);
+    expect(status).toBe(401);
+    expect(JSON.stringify(body)).toMatch(/UNAUTHENTICATED/i);
+  });
+
+  it('removes every document under users/{uid} and internal/ and then the Auth user (anonymous)', async () => {
+    const uid = await newUser('anonymous');
+    expect((await leftovers(uid)).length).toBeGreaterThan(5);
+
+    const { status } = await callDeleteAccount(idToken(uid, 'anonymous', 24 * 3600));
+
+    expect(status).toBe(200);
+    expect(await leftovers(uid)).toEqual([]);
+    expect(await authUserExists(uid)).toBe(false);
+  });
+
+  it('allows a non-anonymous account with a recent login (<= 5 min)', async () => {
+    const uid = await newUser('google.com');
+
+    const { status } = await callDeleteAccount(idToken(uid, 'google.com', 60));
+
+    expect(status).toBe(200);
+    expect(await leftovers(uid)).toEqual([]);
+    expect(await authUserExists(uid)).toBe(false);
+  });
+
+  it.each(['google.com', 'password'] as const)(
+    'refuses a %s account without recent login and keeps data and Auth user',
+    async (provider) => {
+      const uid = await newUser(provider);
+      const before = await leftovers(uid);
+
+      const { status, body } = await callDeleteAccount(idToken(uid, provider, 10 * 60));
+
+      expect(status).toBeGreaterThanOrEqual(400);
+      expect(JSON.stringify(body)).toContain('requires-recent-login');
+      expect(await leftovers(uid)).toEqual(before);
+      expect(await authUserExists(uid)).toBe(true);
+    },
+  );
+
+  it('is idempotent: a second call after the account is gone succeeds', async () => {
+    const uid = await newUser('anonymous');
+    const token = idToken(uid, 'anonymous', 0);
+
+    expect((await callDeleteAccount(token)).status).toBe(200);
+    expect((await callDeleteAccount(token)).status).toBe(200);
+    expect(await leftovers(uid)).toEqual([]);
+  });
+
+  it('completes cleanup even when the Auth user is already gone', async () => {
+    const uid = await newUser('anonymous');
+    await auth.deleteUser(uid);
+
+    expect((await callDeleteAccount(idToken(uid, 'anonymous', 0))).status).toBe(200);
+    expect(await leftovers(uid)).toEqual([]);
+  });
+
+  it('never lets one UID delete another: a spoofed uid in the payload is ignored', async () => {
+    const attacker = await newUser('anonymous');
+    const victim = await newUser('anonymous');
+    const victimBefore = await leftovers(victim);
+
+    const { status } = await callDeleteAccount(idToken(attacker, 'anonymous', 0), {
+      uid: victim,
+      userId: victim,
+    });
+
+    expect(status).toBe(200);
+    expect(await leftovers(attacker)).toEqual([]);
+    expect(await authUserExists(attacker)).toBe(false);
+    expect(await leftovers(victim)).toEqual(victimBefore);
+    expect(await authUserExists(victim)).toBe(true);
+  });
+});
diff --git a/app/functions/src/deleteAccount.ts b/app/functions/src/deleteAccount.ts
new file mode 100644
index 0000000..879c409
--- /dev/null
+++ b/app/functions/src/deleteAccount.ts
@@ -0,0 +1,32 @@
+import { getApps, initializeApp } from 'firebase-admin/app';
+import { getAuth } from 'firebase-admin/auth';
+import { getFirestore } from 'firebase-admin/firestore';
+import { HttpsError, onCall } from 'firebase-functions/v2/https';
+
+const RECENT_LOGIN_SECONDS = 5 * 60;
+
+// Deletes everything owned by the caller. The UID comes only from the verified token, never from the payload.
+export const deleteAccount = onCall(async (request) => {
+  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');
+  const { uid, token } = request.auth;
+
+  // Non-anonymous accounts must have signed in recently (DECISOES.md: reauthentication before deletion).
+  const authAge = Math.floor(Date.now() / 1000) - token.auth_time;
+  if (token.firebase.sign_in_provider !== 'anonymous' && !(authAge <= RECENT_LOGIN_SECONDS)) {
+    throw new HttpsError('failed-precondition', 'auth/requires-recent-login');
+  }
+
+  if (!getApps().length) initializeApp();
+  const db = getFirestore();
+  // recursiveDelete covers every subcollection (records, push tokens, feedback, completions) and is a no-op when absent.
+  await db.recursiveDelete(db.doc(`users/${uid}`));
+  await db.recursiveDelete(db.doc(`internal/${uid}`));
+
+  // Auth goes last, only after the data cleanup succeeded; an already deleted user keeps the call idempotent.
+  await getAuth()
+    .deleteUser(uid)
+    .catch((error: { code?: string }) => {
+      if (error.code !== 'auth/user-not-found') throw error;
+    });
+  return { deleted: true };
+});
diff --git a/app/functions/src/index.ts b/app/functions/src/index.ts
index 15c58c2..fc500d0 100644
--- a/app/functions/src/index.ts
+++ b/app/functions/src/index.ts
@@ -4,6 +4,8 @@ import { onRequest } from 'firebase-functions/v2/https';
 // Every function runs in Brazil to keep data residency and latency aligned with the users (DECISOES.md).
 setGlobalOptions({ region: 'southamerica-east1' });
 
+export { deleteAccount } from './deleteAccount';
+
 // Internal probe: 'private' removes public invoker IAM on deploy (only authorized principals can call it).
 export const healthcheck = onRequest({ invoker: 'private' }, (_request, response) => {
   response.status(200).send('ok');
diff --git a/app/package.json b/app/package.json
index a2ad6c4..119faa5 100644
--- a/app/package.json
+++ b/app/package.json
@@ -20,7 +20,7 @@
     "test:rules": "sh scripts/port-lock.sh firebase emulators:exec --project demo-pulsar --only firestore \"vitest run --config vitest.rules.config.ts\"",
     "test:e2e": "sh scripts/port-lock.sh playwright test --grep-invert @visual",
     "test:visual": "sh scripts/port-lock.sh playwright test --grep @visual",
-    "test:functions": "yarn --cwd functions build && sh scripts/port-lock.sh firebase emulators:exec --project demo-pulsar --only functions \"vitest run --root functions\"",
+    "test:functions": "yarn --cwd functions build && sh scripts/port-lock.sh firebase emulators:exec --project demo-pulsar --only auth,firestore,functions \"vitest run --root functions\"",
     "seed": "tsx scripts/seed.ts",
     "icons": "tsx scripts/icons.ts && prettier --write src/design/icons.ts",
     "emulators": "yarn --cwd functions build && firebase emulators:start --project demo-pulsar --only auth,firestore,functions",
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
