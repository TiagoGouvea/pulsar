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
- [L-018] Decisão do humano: Onde fica o histórico de registros? → A partir do indicador em Meus indicadores, exclusão com confirmação — A partir do indicador em Meus indicadores, exclusão com confirmação (padrão)
- [L-019] Decisão do humano: Quais rotas usar? → /onboarding, /dashboard, /register, /indicators, /saved-insights, /insights/:hypothesisKey, /settings, /install — /onboarding, /dashboard, /register, /indicators, /saved-insights, /insights/:hypothesisKey, /settings, /install (padrão)
- [L-020] Decisão do humano: Como o layout se comporta no computador? → Coluna central até 960 px; listas de cartões em grid auto-fit (mín. 300 px) — Coluna central até 960 px; listas de cartões em grid auto-fit (mín. 300 px) (padrão)
- [L-021] Decisão do humano: Como resolver conflito de credencial na conversão? → Opções 'Cancelar' ou 'Entrar na conta existente' com aviso; nada é apagado nem mesclado — Opções 'Cancelar' ou 'Entrar na conta existente' com aviso; nada é apagado nem mesclado (padrão)
- [L-022] Decisão do humano: De onde servir ícones e fontes? → Material Symbols, Geist e Space Grotesk via pacotes npm, sem CDN — Material Symbols, Geist e Space Grotesk via pacotes npm, sem CDN (padrão)
- [L-023] Decisão do humano: Como identificar e autenticar o usuário do seed? → seed-user-0001 (seed@pulsar.test, sem senha), 30 dias terminando hoje, login e2e por custom token; --demo só com HARNESS_ALLOW_DEMO_SEED=1 e --project sem 'prod' — seed-user-0001 (seed@pulsar.test, sem senha), 30 dias terminando hoje, login e2e por custom token; --demo só com HARNESS_ALLOW_DEMO_SEED=1 e --project sem 'prod' (padrão)
- [L-024] Decisão do humano: Quais portas usar nos emuladores? → Firestore 8282, Auth 9299 (fonte única app/firebase.json) — Firestore 8282, Auth 9299 (fonte única app/firebase.json) (padrão)
- [L-015] Decisão do humano: Como representar 'sem resposta' em Sim/Não? → Tocar de novo na opção selecionada limpa a resposta e exclui o registro de hoje — Tocar de novo na opção selecionada limpa a resposta e exclui o registro de hoje (padrão)
- [L-016] Decisão do humano: Qual controle usar para escala? → Pílulas tocáveis até 11 valores; slider nativo acima disso — Pílulas tocáveis até 11 valores; slider nativo acima disso (padrão)


# Papel: avaliador de código (independente)

Você é de outra família de modelo e não escreveu este código. Não edite arquivos.
Avalie a partir do diff abaixo (os gates já rodaram build, lint, tipos e testes). Abra outros arquivos só para confirmar um ponto específico; não explore o repositório inteiro.

Verifique:
- O código atende **de fato** aos critérios de aceite, sem implementar "para o teste" (hardcode, mocks indevidos, condicionais de teste em produção).
- Segurança (Security Rules, dados entre usuários, segredos), privacidade (nomes de indicadores só via `<IndicatorLabel>`), aderência à spec e qualidade (tipos, legibilidade, duplicação).

## Feature
```json
{
  "id": "F-1.10",
  "title": "Workspace de Cloud Functions com emulador",
  "description": "app/functions (TypeScript, Node 22, firebase-functions v2, região southamerica-east1), emulador de functions no firebase.json, e2e:serve incluindo o emulador de functions, script test:functions (vitest + emuladores). Sem funções de negócio ainda além de um healthcheck interno.",
  "acceptance": [
    "yarn --cwd app test:functions roda testes de functions contra emuladores",
    "Região padrão southamerica-east1",
    "Build das functions em functions/lib ignorado pelo lint/format"
  ],
  "specRefs": [
    "arquitetura.md#1",
    "DECISOES.md#Outras"
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
diff --git a/.gitignore b/.gitignore
index 03df071..2f3b2ef 100644
--- a/.gitignore
+++ b/.gitignore
@@ -5,6 +5,7 @@ node_modules/
 !.env.example
 secrets/
 dist/
+app/functions/lib/
 coverage/
 test-results/
 playwright-report/
diff --git a/app/firebase.json b/app/firebase.json
index 2314d44..9504d25 100644
--- a/app/firebase.json
+++ b/app/firebase.json
@@ -17,9 +17,16 @@
       }
     ]
   },
+  "functions": {
+    "source": "functions",
+    "runtime": "nodejs22",
+    "predeploy": ["yarn --cwd functions build"],
+    "ignore": ["node_modules", "src", "tsconfig.json", "*.log"]
+  },
   "emulators": {
     "auth": { "port": 9299 },
     "firestore": { "port": 8282 },
+    "functions": { "port": 5001 },
     "hosting": { "port": 5002 },
     "ui": { "enabled": false },
     "singleProjectMode": true
diff --git a/app/functions/package.json b/app/functions/package.json
new file mode 100644
index 0000000..4a4d227
--- /dev/null
+++ b/app/functions/package.json
@@ -0,0 +1,18 @@
+{
+  "name": "pulsar-functions",
+  "private": true,
+  "main": "lib/index.js",
+  "engines": {
+    "node": ">=22"
+  },
+  "scripts": {
+    "build": "tsc -p tsconfig.json"
+  },
+  "dependencies": {
+    "firebase-admin": "^13.4.0",
+    "firebase-functions": "^6.4.0"
+  },
+  "devDependencies": {
+    "typescript": "~5.8.3"
+  }
+}
diff --git a/app/functions/src/__tests__/setup.test.ts b/app/functions/src/__tests__/setup.test.ts
new file mode 100644
index 0000000..03b7da8
--- /dev/null
+++ b/app/functions/src/__tests__/setup.test.ts
@@ -0,0 +1,47 @@
+import { readFileSync } from 'node:fs';
+import { resolve } from 'node:path';
+import { fileURLToPath } from 'node:url';
+import { ESLint } from 'eslint';
+import { getFileInfo } from 'prettier';
+import { describe, expect, it } from 'vitest';
+
+const appDirectory = fileURLToPath(new URL('../../../', import.meta.url));
+const projectId = 'demo-pulsar';
+
+function functionsEmulatorUrl(region: string) {
+  const config = JSON.parse(readFileSync(resolve(appDirectory, 'firebase.json'), 'utf8')) as {
+    emulators?: { functions?: { port?: number } };
+  };
+  expect(config.emulators?.functions).toBeDefined();
+  const port = config.emulators?.functions?.port ?? 5001;
+  return `http://127.0.0.1:${port}/${projectId}/${region}/healthcheck`;
+}
+
+describe('Cloud Functions workspace', () => {
+  it('runs the healthcheck on the Functions emulator in southamerica-east1', async () => {
+    const response = await fetch(functionsEmulatorUrl('southamerica-east1'));
+
+    expect(response.status).toBeGreaterThanOrEqual(200);
+    expect(response.status).toBeLessThan(300);
+  }, 30000);
+
+  it('does not expose the healthcheck in the Firebase default region', async () => {
+    const response = await fetch(functionsEmulatorUrl('us-central1'));
+
+    expect(response.status).toBe(404);
+  });
+
+  it.each(['functions/lib/generated.js', 'functions/lib/nested/generated.js'])(
+    'ignores %s in ESLint and Prettier',
+    async (relativePath) => {
+      const generatedPath = resolve(appDirectory, relativePath);
+      const eslint = new ESLint({ cwd: appDirectory });
+      const prettier = await getFileInfo(generatedPath, {
+        ignorePath: resolve(appDirectory, '.prettierignore'),
+      });
+
+      expect(await eslint.isPathIgnored(generatedPath)).toBe(true);
+      expect(prettier.ignored).toBe(true);
+    },
+  );
+});
diff --git a/app/functions/src/index.ts b/app/functions/src/index.ts
new file mode 100644
index 0000000..3332fb5
--- /dev/null
+++ b/app/functions/src/index.ts
@@ -0,0 +1,9 @@
+import { setGlobalOptions } from 'firebase-functions/v2';
+import { onRequest } from 'firebase-functions/v2/https';
+
+// Every function runs in Brazil to keep data residency and latency aligned with the users (DECISOES.md).
+setGlobalOptions({ region: 'southamerica-east1' });
+
+export const healthcheck = onRequest((_request, response) => {
+  response.status(200).send('ok');
+});
diff --git a/app/functions/tsconfig.json b/app/functions/tsconfig.json
new file mode 100644
index 0000000..564f28c
--- /dev/null
+++ b/app/functions/tsconfig.json
@@ -0,0 +1,16 @@
+{
+  "compilerOptions": {
+    "target": "ES2022",
+    "module": "commonjs",
+    "outDir": "lib",
+    "rootDir": "src",
+    "strict": true,
+    "noUncheckedIndexedAccess": true,
+    "noUnusedLocals": true,
+    "noUnusedParameters": true,
+    "esModuleInterop": true,
+    "skipLibCheck": true
+  },
+  "include": ["src"],
+  "exclude": ["src/__tests__"]
+}
diff --git a/app/functions/vitest.config.ts b/app/functions/vitest.config.ts
new file mode 100644
index 0000000..2ac9162
--- /dev/null
+++ b/app/functions/vitest.config.ts
@@ -0,0 +1,10 @@
+import { defineConfig } from 'vitest/config';
+
+// Functions tests run against the Firebase emulators, so they use the Node environment
+// (no jsdom/Coverage config inherited from the app workspace).
+export default defineConfig({
+  test: {
+    environment: 'node',
+    include: ['src/**/*.test.ts'],
+  },
+});
diff --git a/app/functions/yarn.lock b/app/functions/yarn.lock
new file mode 100644
index 0000000..cbf81c7
--- /dev/null
+++ b/app/functions/yarn.lock
@@ -0,0 +1,1695 @@
+# THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.
+# yarn lockfile v1
+
+
+"@fastify/busboy@^3.0.0":
+  version "3.2.4"
+  resolved "https://registry.yarnpkg.com/@fastify/busboy/-/busboy-3.2.4.tgz#c5af797a5eeff6304144c6d3cb7cad022c0a55b0"
+  integrity sha512-lQS8xcXT54rdJb+wlG/Q7SMSdtkZEpLPHooSDUZyyZm9LJD7X1kONPhVoPaHq+dsPtWUGGLIz9gBNhs9qKbylw==
+
+"@firebase/app-check-interop-types@0.3.5":
+  version "0.3.5"
+  resolved "https://registry.yarnpkg.com/@firebase/app-check-interop-types/-/app-check-interop-types-0.3.5.tgz#b017c5181c8a890c8b8b97981279777c7cabddd2"
+  integrity sha512-qId34pVZ2CXTmtu4ofW5leiI93DvnOvIcr/5GT7MZPw5WXAi6nZoU+g9cNRgl7K90UJSbK0cXxten4meYMPyZg==
+
+"@firebase/app-types@0.9.6":
+  version "0.9.6"
+  resolved "https://registry.yarnpkg.com/@firebase/app-types/-/app-types-0.9.6.tgz#22fd1a59bd2c2888ffb569139132f14b4f1bfe50"
+  integrity sha512-yPLahy7Esfu2w/yme3msVK4xTkDXQqq6szfQn8yVOQpCKiT5GVFjqNpLbuz6NkX0WuTwUidkmPewW3r4xkvpeg==
+  dependencies:
+    "@firebase/logger" "0.5.2"
+
+"@firebase/auth-interop-types@0.2.6":
+  version "0.2.6"
+  resolved "https://registry.yarnpkg.com/@firebase/auth-interop-types/-/auth-interop-types-0.2.6.tgz#6754d1ee8f1c5976d37849ff09d9e0b681dabb08"
+  integrity sha512-FgwZqDrBqgK0BHI70QTv1v/5wmuDF9f8fsJFvKSxoRlK2PPfSQtZAk2jhXu4pe9BZzFi/e4UYusU/bEQHdf6Qg==
+
+"@firebase/component@0.7.5":
+  version "0.7.5"
+  resolved "https://registry.yarnpkg.com/@firebase/component/-/component-0.7.5.tgz#07c90c38f7c227df469278664e50b375a3c9f371"
+  integrity sha512-vuFDcL91Q+2ZuBJkyOh86T4q0B4ffNTDjc/A38tybO56odQABxRTFLTIowCWqAKeIcgo37GowWMVgFF73gD8Qw==
+  dependencies:
+    "@firebase/util" "1.15.3"
+    tslib "^2.1.0"
+
+"@firebase/database-compat@^2.0.0":
+  version "2.1.7"
+  resolved "https://registry.yarnpkg.com/@firebase/database-compat/-/database-compat-2.1.7.tgz#ef4bdae0a368cfa4b7fa48599223bbdfba4386fc"
+  integrity sha512-lBq9sJm8MnJINKJnkAKSOj2MbC66xGoSVCcGkPtstl+lkoKEBtD46qHLbuDgW/WbLPoKVm17RIN8BxHj+Z2F2w==
+  dependencies:
+    "@firebase/component" "0.7.5"
+    "@firebase/database" "1.1.5"
+    "@firebase/database-types" "1.0.22"
+    "@firebase/logger" "0.5.2"
+    "@firebase/util" "1.15.3"
+    tslib "^2.1.0"
+
+"@firebase/database-types@1.0.22", "@firebase/database-types@^1.0.6":
+  version "1.0.22"
+  resolved "https://registry.yarnpkg.com/@firebase/database-types/-/database-types-1.0.22.tgz#191314740bff07a90df09254aaab61638e15564b"
+  integrity sha512-YAZNXsjY9EQQ+pKw/3ax8n5FgolHC7Qew7EY5RceYdl0R2ZP+kCv1O0DkKlcceue8uQCOreHCNN7PWVFpY1Nug==
+  dependencies:
+    "@firebase/app-types" "0.9.6"
+    "@firebase/util" "1.15.3"
+
+"@firebase/database@1.1.5":
+  version "1.1.5"
+  resolved "https://registry.yarnpkg.com/@firebase/database/-/database-1.1.5.tgz#84984ee38dd1640ef211380b8373e910cb9ceb34"
+  integrity sha512-/JGpvszLoNXNgzilRXocigGfFF4hbcPA9wN1i1kjJx6oKkXgkHteZYl3lQs1lJX3ETDf6bv7zI15lPMVUp4sAQ==
+  dependencies:
+    "@firebase/app-check-interop-types" "0.3.5"
+    "@firebase/auth-interop-types" "0.2.6"
+    "@firebase/component" "0.7.5"
+    "@firebase/logger" "0.5.2"
+    "@firebase/util" "1.15.3"
+    faye-websocket "0.11.4"
+    tslib "^2.1.0"
+
+"@firebase/logger@0.5.2":
+  version "0.5.2"
+  resolved "https://registry.yarnpkg.com/@firebase/logger/-/logger-0.5.2.tgz#27053c3c80897cb134f39242f50e34f5d0b1cbf4"
+  integrity sha512-J2VO4NFTc0xQFrxV1B/lm5balicm9cwuX2acR9Yn41fN8KgUeQFo+VJV222IqW2FPSXKDu9uo5WdQFWf9TPbYg==
+  dependencies:
+    tslib "^2.1.0"
+
+"@firebase/util@1.15.3":
+  version "1.15.3"
+  resolved "https://registry.yarnpkg.com/@firebase/util/-/util-1.15.3.tgz#396def73437c95ca9373945e6137caf86286c58a"
+  integrity sha512-c/z/gaIlaaLZEuGbE6sLUuJ61tskg1JghvhcNQzW948ASBinbVBBRnZTC4b4yt4LaEtJQkYlyzqLHcutFwEIvA==
+  dependencies:
+    tslib "^2.1.0"
+
+"@google-cloud/firestore@^7.11.0":
+  version "7.11.6"
+  resolved "https://registry.yarnpkg.com/@google-cloud/firestore/-/firestore-7.11.6.tgz#0a2b26e215aa4f903267f82370450753b84db16a"
+  integrity sha512-EW/O8ktzwLfyWBOsNuhRoMi8lrC3clHM5LVFhGvO1HCsLozCOOXRAlHrYBoE6HL42Sc8yYMuCb2XqcnJ4OOEpw==
+  dependencies:
+    "@opentelemetry/api" "^1.3.0"
+    fast-deep-equal "^3.1.1"
+    functional-red-black-tree "^1.0.1"
+    google-gax "^4.3.3"
+    protobufjs "^7.2.6"
+
+"@google-cloud/paginator@^5.0.0":
+  version "5.0.2"
+  resolved "https://registry.yarnpkg.com/@google-cloud/paginator/-/paginator-5.0.2.tgz#86ad773266ce9f3b82955a8f75e22cd012ccc889"
+  integrity sha512-DJS3s0OVH4zFDB1PzjxAsHqJT6sKVbRwwML0ZBP9PbU7Yebtu/7SWMRzvO2J3nUi9pRNITCfu4LJeooM2w4pjg==
+  dependencies:
+    arrify "^2.0.0"
+    extend "^3.0.2"
+
+"@google-cloud/projectify@^4.0.0":
+  version "4.0.0"
+  resolved "https://registry.yarnpkg.com/@google-cloud/projectify/-/projectify-4.0.0.tgz#d600e0433daf51b88c1fa95ac7f02e38e80a07be"
+  integrity sha512-MmaX6HeSvyPbWGwFq7mXdo0uQZLGBYCwziiLIGq5JVX+/bdI3SAq6bP98trV5eTWfLuvsMcIC1YJOF2vfteLFA==
+
+"@google-cloud/promisify@<4.1.0":
+  version "4.0.0"
+  resolved "https://registry.yarnpkg.com/@google-cloud/promisify/-/promisify-4.0.0.tgz#a906e533ebdd0f754dca2509933334ce58b8c8b1"
+  integrity sha512-Orxzlfb9c67A15cq2JQEyVc7wEsmFBmHjZWZYQMUyJ1qivXyMwdyNOs9odi79hze+2zqdTtu1E19IM/FtqZ10g==
+
+"@google-cloud/storage@^7.19.0":
+  version "7.22.0"
+  resolved "https://registry.yarnpkg.com/@google-cloud/storage/-/storage-7.22.0.tgz#57ea83962c50f5c6f29ebc433bd7eb5a37199ba2"
+  integrity sha512-W98gTQOAntEeEQ7/pZxSQXxfUO5CiQcXJRsxBpUa6UU25n8YN/VtogPBi0H+MAmUrn/6bY/sBhFansoWEsr2/g==
+  dependencies:
+    "@google-cloud/paginator" "^5.0.0"
+    "@google-cloud/projectify" "^4.0.0"
+    "@google-cloud/promisify" "<4.1.0"
+    abort-controller "^3.0.0"
+    async-retry "^1.3.3"
+    duplexify "^4.1.3"
+    fast-xml-parser "^5.3.4"
+    gaxios "^6.0.2"
+    google-auth-library "^9.6.3"
+    html-entities "^2.5.2"
+    mime "^3.0.0"
+    p-limit "^3.0.1"
+    retry-request "^7.0.0"
+    teeny-request "^9.0.0"
+
+"@grpc/grpc-js@^1.10.9":
+  version "1.14.7"
+  resolved "https://registry.yarnpkg.com/@grpc/grpc-js/-/grpc-js-1.14.7.tgz#e799e26396c8c8c32465f027b3e713f366143bc6"
+  integrity sha512-W4W/fcBMGRVtG6dW2c7cw2mnpS3hvbBd+oQXjh2iYFTZDk1JJmcNqkM5KSaPubQpamlUUurrlb7G1s9NJeERmQ==
+  dependencies:
+    "@grpc/proto-loader" "^0.8.0"
+    "@js-sdsl/ordered-map" "^4.4.2"
+
+"@grpc/proto-loader@^0.7.13":
+  version "0.7.15"
+  resolved "https://registry.yarnpkg.com/@grpc/proto-loader/-/proto-loader-0.7.15.tgz#4cdfbf35a35461fc843abe8b9e2c0770b5095e60"
+  integrity sha512-tMXdRCfYVixjuFK+Hk0Q1s38gV9zDiDJfWL3h1rv4Qc39oILCu1TRTDt7+fGUI8K4G1Fj125Hx/ru3azECWTyQ==
+  dependencies:
+    lodash.camelcase "^4.3.0"
+    long "^5.0.0"
+    protobufjs "^7.2.5"
+    yargs "^17.7.2"
+
+"@grpc/proto-loader@^0.8.0":
+  version "0.8.1"
+  resolved "https://registry.yarnpkg.com/@grpc/proto-loader/-/proto-loader-0.8.1.tgz#5a6b290ccbfb1ae2f6775afb74e9898bd8c5d4e8"
+  integrity sha512-wtF6h+DY6M3YaDBPAmvuuA6jV8Sif9MjtOI5euKFWRgCDl5PeDpPsHR9u2l6St5ceY8AZgoNDww5+HvEsXFsGg==
+  dependencies:
+    lodash.camelcase "^4.3.0"
+    long "^5.0.0"
+    protobufjs "^7.5.5"
+    yargs "^17.7.2"
+
+"@js-sdsl/ordered-map@^4.4.2":
+  version "4.4.2"
+  resolved "https://registry.yarnpkg.com/@js-sdsl/ordered-map/-/ordered-map-4.4.2.tgz#9299f82874bab9e4c7f9c48d865becbfe8d6907c"
+  integrity sha512-iUKgm52T8HOE/makSxjqoWhe95ZJA1/G1sYsGev2JDKUSS14KAgg1LHb+Ba+IPow0xflbnSkOsZcO08C7w1gYw==
+
+"@nodable/entities@^3.0.1":
+  version "3.1.0"
+  resolved "https://registry.yarnpkg.com/@nodable/entities/-/entities-3.1.0.tgz#2ab366e0e607fdef8d65c5d84c58d191812bbd4b"
+  integrity sha512-LsS/DjHr+uDM647Gru/cA8+J3a3HfhttwCKLyuoyN7yXTFCxKBtSgMQBvrW9yNPa2/zDRUNuGPaH5QUFoa4arQ==
+
+"@opentelemetry/api@^1.3.0":
+  version "1.10.0"
+  resolved "https://registry.yarnpkg.com/@opentelemetry/api/-/api-1.10.0.tgz#31d2e3d36ffc6cdd5ce165251e7fa13bbad0fd8a"
+  integrity sha512-lMkyes8iHrG+mk6WH7X70MdCLI2RS0FwNBY1PyQ8UemaijE2m5mv5A0Niy3HtbYTFrgkUEQjFMXmSAk2hQDuPQ==
+
+"@protobufjs/aspromise@^1.1.1", "@protobufjs/aspromise@^1.1.2":
+  version "1.1.2"
+  resolved "https://registry.yarnpkg.com/@protobufjs/aspromise/-/aspromise-1.1.2.tgz#9b8b0cc663d669a7d8f6f5d0893a14d348f30fbf"
+  integrity sha512-j+gKExEuLmKwvz3OgROXtrJ2UG2x8Ch2YZUxahh+s1F2HZ+wAceUNLkvy6zKCPVRkU++ZWQrdxsUeQXmcg4uoQ==
+
+"@protobufjs/base64@^1.1.2":
+  version "1.1.2"
+  resolved "https://registry.yarnpkg.com/@protobufjs/base64/-/base64-1.1.2.tgz#4c85730e59b9a1f1f349047dbf24296034bb2735"
+  integrity sha512-AZkcAA5vnN/v4PDqKyMR5lx7hZttPDgClv83E//FMNhR2TMcLUhfRUBHCmSl0oi9zMgDDqRUJkSxO3wm85+XLg==
+
+"@protobufjs/codegen@^2.0.5":
+  version "2.0.5"
+  resolved "https://registry.yarnpkg.com/@protobufjs/codegen/-/codegen-2.0.5.tgz#d9315ad7cf3f30aac70bda3c068443dc6f143659"
+  integrity sha512-zgXFLzW3Ap33e6d0Wlj4MGIm6Ce8O89n/apUaGNB/jx+hw+ruWEp7EwGUshdLKVRCxZW12fp9r40E1mQrf/34g==
+
+"@protobufjs/eventemitter@^1.1.1":
+  version "1.1.1"
+  resolved "https://registry.yarnpkg.com/@protobufjs/eventemitter/-/eventemitter-1.1.1.tgz#d512cb26c0ae026091ee2c1167f1be6faf5c842a"
+  integrity sha512-vW1GmwMZNnL+gMRaovlh9yZX74kc+TTU3FObkkurpMaRtBfLP3ldjS9KQWlwZgraRE0+dheEEoAxdzcJQ8eXZg==
+
+"@protobufjs/fetch@^1.1.1":
+  version "1.1.1"
+  resolved "https://registry.yarnpkg.com/@protobufjs/fetch/-/fetch-1.1.1.tgz#4d6fc00c8fb64016a5c81b469d549046350f1065"
+  integrity sha512-GpptLrs57adMSuHi3VNj0mAF8dwh36LMaYF6XyJ6JMWlVsc+t42tm1HSEDmOs3A8fC9yyeisgLhsTVQokOZ0zw==
+  dependencies:
+    "@protobufjs/aspromise" "^1.1.1"
+
+"@protobufjs/float@^1.0.2":
+  version "1.0.2"
+  resolved "https://registry.yarnpkg.com/@protobufjs/float/-/float-1.0.2.tgz#5e9e1abdcb73fc0a7cb8b291df78c8cbd97b87d1"
+  integrity sha512-Ddb+kVXlXst9d+R9PfTIxh1EdNkgoRe5tOX6t01f1lYWOvJnSPDBlG241QLzcyPdoNTsblLUdujGSE4RzrTZGQ==
+
+"@protobufjs/path@^1.1.2":
+  version "1.1.2"
+  resolved "https://registry.yarnpkg.com/@protobufjs/path/-/path-1.1.2.tgz#6cc2b20c5c9ad6ad0dccfd21ca7673d8d7fbf68d"
+  integrity sha512-6JOcJ5Tm08dOHAbdR3GrvP+yUUfkjG5ePsHYczMFLq3ZmMkAD98cDgcT2iA1lJ9NVwFd4tH/iSSoe44YWkltEA==
+
+"@protobufjs/pool@^1.1.0":
+  version "1.1.0"
+  resolved "https://registry.yarnpkg.com/@protobufjs/pool/-/pool-1.1.0.tgz#09fd15f2d6d3abfa9b65bc366506d6ad7846ff54"
+  integrity sha512-0kELaGSIDBKvcgS4zkjz1PeddatrjYcmMWOlAuAPwAeccUrPHdUqo/J6LiymHHEiJT5NrF1UVwxY14f+fy4WQw==
+
+"@protobufjs/utf8@^1.1.1":
+  version "1.1.2"
+  resolved "https://registry.yarnpkg.com/@protobufjs/utf8/-/utf8-1.1.2.tgz#78d476333d85d5b1c792e257bca74ba080da49a4"
+  integrity sha512-b1UQwcEZ4yCnMCD8DAL1VlbvBJE9/IX4FTIp7BG1xYpf29SLazLSrqUkj4w7Y5y7cCVP6E5tcqqcI0xemPkHug==
+
+"@tootallnate/once@2":
+  version "2.0.1"
+  resolved "https://registry.yarnpkg.com/@tootallnate/once/-/once-2.0.1.tgz#35adc6222e3662fa2222ce123b961476a746b9ea"
+  integrity sha512-HqmEUIGRJ5fSXchkVgR5F7qn48bDBzv0kWj/Kfu5e6uci4UlEeng4331LnBkWffb++Ei3FOVLxo8JJWMFBDMeQ==
+
+"@types/body-parser@*":
+  version "1.19.6"
+  resolved "https://registry.yarnpkg.com/@types/body-parser/-/body-parser-1.19.6.tgz#1859bebb8fd7dac9918a45d54c1971ab8b5af474"
+  integrity sha512-HLFeCYgz89uk22N5Qg3dvGvsv46B8GLvKKo1zKG4NybA8U2DiEO3w9lqGg29t/tfLRJpJ6iQxnVw4OnB7MoM9g==
+  dependencies:
+    "@types/connect" "*"
+    "@types/node" "*"
+
+"@types/caseless@*":
+  version "0.12.5"
+  resolved "https://registry.yarnpkg.com/@types/caseless/-/caseless-0.12.5.tgz#db9468cb1b1b5a925b8f34822f1669df0c5472f5"
+  integrity sha512-hWtVTC2q7hc7xZ/RLbxapMvDMgUnDvKvMOpKal4DrMyfGBUfB1oKaZlIRr6mJL+If3bAP6sV/QneGzF6tJjZDg==
+
+"@types/connect@*":
+  version "3.4.38"
+  resolved "https://registry.yarnpkg.com/@types/connect/-/connect-3.4.38.tgz#5ba7f3bc4fbbdeaff8dded952e5ff2cc53f8d858"
+  integrity sha512-K6uROf1LD88uDQqJCktA4yzL1YYAK6NgfsI0v/mTgyPKWsX1CnJ0XPSDhViejru1GcRkLWb8RlzFYJRqGUbaug==
+  dependencies:
+    "@types/node" "*"
+
+"@types/cors@^2.8.5":
+  version "2.8.19"
+  resolved "https://registry.yarnpkg.com/@types/cors/-/cors-2.8.19.tgz#d93ea2673fd8c9f697367f5eeefc2bbfa94f0342"
+  integrity sha512-mFNylyeyqN93lfe/9CSxOGREz8cpzAhH+E93xJ4xWQf62V8sQ/24reV2nyzUWM6H6Xji+GGHpkbLe7pVoUEskg==
+  dependencies:
+    "@types/node" "*"
+
+"@types/express-serve-static-core@^4.17.33":
+  version "4.19.9"
+  resolved "https://registry.yarnpkg.com/@types/express-serve-static-core/-/express-serve-static-core-4.19.9.tgz#b746a8bb6c389af7a31141397bb539f775b0ae84"
+  integrity sha512-QP2ESEe/ImWY0HDwNAnK9PvEffUyhLTnWkk7KXzHfyeWAnlrDe1fN77bXl6ia8KT3wPlmA7t9/VPRpnf4Ex9sg==
+  dependencies:
+    "@types/node" "*"
+    "@types/qs" "*"
+    "@types/range-parser" "*"
+    "@types/send" "*"
+
+"@types/express@^4.17.21":
+  version "4.17.25"
+  resolved "https://registry.yarnpkg.com/@types/express/-/express-4.17.25.tgz#070c8c73a6fee6936d65c195dbbfb7da5026649b"
+  integrity sha512-dVd04UKsfpINUnK0yBoYHDF3xu7xVH4BuDotC/xGuycx4CgbP48X/KF/586bcObxT0HENHXEU8Nqtu6NR+eKhw==
+  dependencies:
+    "@types/body-parser" "*"
+    "@types/express-serve-static-core" "^4.17.33"
+    "@types/qs" "*"
+    "@types/serve-static" "^1"
+
+"@types/http-errors@*":
+  version "2.0.5"
+  resolved "https://registry.yarnpkg.com/@types/http-errors/-/http-errors-2.0.5.tgz#5b749ab2b16ba113423feb1a64a95dcd30398472"
+  integrity sha512-r8Tayk8HJnX0FztbZN7oVqGccWgw98T/0neJphO91KkmOzug1KkofZURD4UaD5uH8AqcFLfdPErnBod0u71/qg==
+
+"@types/jsonwebtoken@^9.0.4":
+  version "9.0.10"
+  resolved "https://registry.yarnpkg.com/@types/jsonwebtoken/-/jsonwebtoken-9.0.10.tgz#a7932a47177dcd4283b6146f3bd5c26d82647f09"
+  integrity sha512-asx5hIG9Qmf/1oStypjanR7iKTv0gXQ1Ov/jfrX6kS/EO0OFni8orbmGCn0672NHR3kXHwpAwR+B368ZGN/2rA==
+  dependencies:
+    "@types/ms" "*"
+    "@types/node" "*"
+
+"@types/long@^4.0.0":
+  version "4.0.2"
+  resolved "https://registry.yarnpkg.com/@types/long/-/long-4.0.2.tgz#b74129719fc8d11c01868010082d483b7545591a"
+  integrity sha512-MqTGEo5bj5t157U6fA/BiDynNkn0YknVdh48CMPkTSpFTVmvao5UQmm7uEF6xBEo7qIMAlY/JSleYaE6VOdpaA==
+
+"@types/mime@^1":
+  version "1.3.5"
+  resolved "https://registry.yarnpkg.com/@types/mime/-/mime-1.3.5.tgz#1ef302e01cf7d2b5a0fa526790c9123bf1d06690"
+  integrity sha512-/pyBZWSLD2n0dcHE3hq8s8ZvcETHtEuF+3E7XVt0Ig2nvsVQXdghHVcEkIWjy9A0wKfTn97a/PSDYohKIlnP/w==
+
+"@types/ms@*":
+  version "2.1.0"
+  resolved "https://registry.yarnpkg.com/@types/ms/-/ms-2.1.0.tgz#052aa67a48eccc4309d7f0191b7e41434b90bb78"
+  integrity sha512-GsCCIZDE/p3i96vtEqx+7dBUGXrc7zeSK3wwPHIaRThS+9OhWIXRqzs4d6k1SVU8g91DrNRWxWUGhp5KXQb2VA==
+
+"@types/node@*", "@types/node@>=13.7.0":
+  version "26.6.6"
+  resolved "https://registry.yarnpkg.com/@types/node/-/node-26.6.6.tgz#9ed7b5817e728ed9216ef7c5b7d373fe3b777104"
+  integrity sha512-MzQj+8Kx3XI40OmUAE6Qoh58ZMNstNNMwn2nfd3qWsfe7nDNSqJNzes4njhz6AHwrSHOffSLwXU6yb474Q4aog==
+  dependencies:
+    undici-types "~8.9.0"
+
+"@types/qs@*":
+  version "6.15.1"
+  resolved "https://registry.yarnpkg.com/@types/qs/-/qs-6.15.1.tgz#8606884272c63f0db96986bd3548650d8a9388bf"
+  integrity sha512-GZHUBZR9hckSUhrxmp1nG6NwdpM9fCunJwyThLW1X3AyHgd9IlHb6VANpQQqDr2o/qQp6McZ3y/IA2rVzKzSbw==
+
+"@types/range-parser@*":
+  version "1.2.7"
+  resolved "https://registry.yarnpkg.com/@types/range-parser/-/range-parser-1.2.7.tgz#50ae4353eaaddc04044279812f52c8c65857dbcb"
+  integrity sha512-hKormJbkJqzQGhziax5PItDUTMAM9uE2XXQmM37dyd4hVM+5aVl7oVxMVUiVQn2oCQFN/LKCZdvSM0pFRqbSmQ==
+
+"@types/request@^2.48.8":
+  version "2.48.13"
+  resolved "https://registry.yarnpkg.com/@types/request/-/request-2.48.13.tgz#abdf4256524e801ea8fdda54320f083edb5a6b80"
+  integrity sha512-FGJ6udDNUCjd19pp0Q3iTiDkwhYup7J8hpMW9c4k53NrccQFFWKRho6hvtPPEhnXWKvukfwAlB6DbDz4yhH5Gg==
+  dependencies:
+    "@types/caseless" "*"
+    "@types/node" "*"
+    "@types/tough-cookie" "*"
+    form-data "^2.5.5"
+
+"@types/send@*":
+  version "1.2.1"
+  resolved "https://registry.yarnpkg.com/@types/send/-/send-1.2.1.tgz#6a784e45543c18c774c049bff6d3dbaf045c9c74"
+  integrity sha512-arsCikDvlU99zl1g69TcAB3mzZPpxgw0UQnaHeC1Nwb015xp8bknZv5rIfri9xTOcMuaVgvabfIRA7PSZVuZIQ==
+  dependencies:
+    "@types/node" "*"
+
+"@types/send@<1":
+  version "0.17.6"
+  resolved "https://registry.yarnpkg.com/@types/send/-/send-0.17.6.tgz#aeb5385be62ff58a52cd5459daa509ae91651d25"
+  integrity sha512-Uqt8rPBE8SY0RK8JB1EzVOIZ32uqy8HwdxCnoCOsYrvnswqmFZ/k+9Ikidlk/ImhsdvBsloHbAlewb2IEBV/Og==
+  dependencies:
+    "@types/mime" "^1"
+    "@types/node" "*"
+
+"@types/serve-static@^1":
+  version "1.15.10"
+  resolved "https://registry.yarnpkg.com/@types/serve-static/-/serve-static-1.15.10.tgz#768169145a778f8f5dfcb6360aead414a3994fee"
+  integrity sha512-tRs1dB+g8Itk72rlSI2ZrW6vZg0YrLI81iQSTkMmOqnqCaNr/8Ek4VwWcN5vZgCYWbg/JJSGBlUaYGAOP73qBw==
+  dependencies:
+    "@types/http-errors" "*"
+    "@types/node" "*"
+    "@types/send" "<1"
+
+"@types/tough-cookie@*":
+  version "4.0.5"
+  resolved "https://registry.yarnpkg.com/@types/tough-cookie/-/tough-cookie-4.0.5.tgz#cb6e2a691b70cb177c6e3ae9c1d2e8b2ea8cd304"
+  integrity sha512-/Ad8+nIOV7Rl++6f1BdKxFSMgmoqEoYbHRpPcx3JEfv8VRsQe9Z4mCXeJBzxs7mbHY/XOZZuXlRNfhpVPbs6ZA==
+
+abort-controller@^3.0.0:
+  version "3.0.0"
+  resolved "https://registry.yarnpkg.com/abort-controller/-/abort-controller-3.0.0.tgz#eaf54d53b62bae4138e809ca225c8439a6efb392"
+  integrity sha512-h8lQ8tacZYnR3vNQTgibj+tODHI5/+l06Au2Pcriv/Gmet0eaj4TwWH41sO9wnHDiQsEj19q0drzdWdeAHtweg==
+  dependencies:
+    event-target-shim "^5.0.0"
+
+accepts@~1.3.8:
+  version "1.3.8"
+  resolved "https://registry.yarnpkg.com/accepts/-/accepts-1.3.8.tgz#0bf0be125b67014adcb0b0921e62db7bffe16b2e"
+  integrity sha512-PYAthTa2m2VKxuvSD3DPC/Gy+U+sOA1LAuT8mkmRuvw+NACSaeXEQ+NHcVF7rONl6qcaxV3Uuemwawk+7+SJLw==
+  dependencies:
+    mime-types "~2.1.34"
+    negotiator "0.6.3"
+
+agent-base@6:
+  version "6.0.2"
+  resolved "https://registry.yarnpkg.com/agent-base/-/agent-base-6.0.2.tgz#49fff58577cfee3f37176feab4c22e00f86d7f77"
+  integrity sha512-RZNwNclF7+MS/8bDg70amg32dyeZGZxiDuQmZxKLAlQjr3jGyLx+4Kkk58UO7D2QdgFIQCovuSuZESne6RG6XQ==
+  dependencies:
+    debug "4"
+
+agent-base@^7.1.2:
+  version "7.1.4"
+  resolved "https://registry.yarnpkg.com/agent-base/-/agent-base-7.1.4.tgz#e3cd76d4c548ee895d3c3fd8dc1f6c5b9032e7a8"
+  integrity sha512-MnA+YT8fwfJPgBx3m60MNqakm30XOkyIoH1y6huTQvC0PwZG7ki8NacLBcrPbNoo8vEZy7Jpuk7+jMO+CUovTQ==
+
+ansi-regex@^5.0.1:
+  version "5.0.1"
+  resolved "https://registry.yarnpkg.com/ansi-regex/-/ansi-regex-5.0.1.tgz#082cb2c89c9fe8659a311a53bd6a4dc5301db304"
+  integrity sha512-quJQXlTSUGL2LH9SUXo8VwsY4soanhgo6LNSm84E1LBcE8s3O0wpdiRzyR9z/ZZJMlMWv37qOOb9pdJlMUEKFQ==
+
+ansi-styles@^4.0.0:
+  version "4.3.0"
+  resolved "https://registry.yarnpkg.com/ansi-styles/-/ansi-styles-4.3.0.tgz#edd803628ae71c04c85ae7a0906edad34b648937"
+  integrity sha512-zbB9rCJAT1rbjiVDb2hqKFHNYLxgtk8NURxZ3IZwD3F6NtxbXZQCnnSi1Lkx+IDohdPlFp222wVALIheZJQSEg==
+  dependencies:
+    color-convert "^2.0.1"
+
+anynum@^1.0.1:
+  version "1.0.1"
+  resolved "https://registry.yarnpkg.com/anynum/-/anynum-1.0.1.tgz#2aac00e08dfad3726c1d462e60dbc2f831659a44"
+  integrity sha512-N6//FLET/tXYNM/F6ABca1oH6fWB+KlTt909Le28WMDBk8oaT4vY17DCrwg2MvmuqUKt3Ni4N5dGJ/EoBgcO6A==
+
+array-flatten@1.1.1:
+  version "1.1.1"
+  resolved "https://registry.yarnpkg.com/array-flatten/-/array-flatten-1.1.1.tgz#9a5f699051b1e7073328f2a008968b64ea2955d2"
+  integrity sha512-PCVAQswWemu6UdxsDFFX/+gVeYqKAod3D3UVm91jHwynguOwAvYPhx8nNlM++NqRcK6CxxpUafjmhIdKiHibqg==
+
+arrify@^2.0.0:
+  version "2.0.1"
+  resolved "https://registry.yarnpkg.com/arrify/-/arrify-2.0.1.tgz#c9655e9331e0abcd588d2a7cad7e9956f66701fa"
+  integrity sha512-3duEwti880xqi4eAMN8AyR4a0ByT90zoYdLlevfrvU43vb0YZwZVfxOgxWrLXXXpyugL0hNZc9G6BiB5B3nUug==
+
+async-retry@^1.3.3:
+  version "1.3.3"
+  resolved "https://registry.yarnpkg.com/async-retry/-/async-retry-1.3.3.tgz#0e7f36c04d8478e7a58bdbed80cedf977785f280"
+  integrity sha512-wfr/jstw9xNi/0teMHrRW7dsz3Lt5ARhYNZ2ewpadnhaIp5mbALhOAP+EAdsC7t4Z6wqsDVv9+W6gm1Dk9mEyw==
+  dependencies:
+    retry "0.13.1"
+
+asynckit@^0.4.0:
+  version "0.4.0"
+  resolved "https://registry.yarnpkg.com/asynckit/-/asynckit-0.4.0.tgz#c79ed97f7f34cb8f2ba1bc9790bcc366474b4b79"
+  integrity sha512-Oei9OH4tRh0YqU3GxhX79dM/mwVgvbZJaSNaRk+bshkj0S5cfHcgYakreBjrHwatXKbz+IoIdYLxrKim2MjW0Q==
+
+base64-js@^1.3.0:
+  version "1.5.1"
+  resolved "https://registry.yarnpkg.com/base64-js/-/base64-js-1.5.1.tgz#1b1b440160a5bf7ad40b650f095963481903930a"
+  integrity sha512-AKpaYlHn8t4SVbOHCy+b5+KKgvR4vrsD8vbvrbiQJps7fKDTkjkDry6ji0rUJjC0kzbNePLwzxq8iypo41qeWA==
+
+bignumber.js@^9.0.0:
+  version "9.3.1"
+  resolved "https://registry.yarnpkg.com/bignumber.js/-/bignumber.js-9.3.1.tgz#759c5aaddf2ffdc4f154f7b493e1c8770f88c4d7"
+  integrity sha512-Ko0uX15oIUS7wJ3Rb30Fs6SkVbLmPBAKdlm7q9+ak9bbIeFf0MwuBsQV6z7+X768/cHsfg+WlysDWJcmthjsjQ==
+
+body-parser@~1.20.5:
+  version "1.20.9"
+  resolved "https://registry.yarnpkg.com/body-parser/-/body-parser-1.20.9.tgz#b64358a113b4d200d7484752cd154b66933e2009"
+  integrity sha512-FISIQxV5u91Y9gvuFq3q/tA/qTqLJn3AhRcEvyozyhJTh5OBFFtv827AdHU7Rbyct4r+Ba1/99oFa1Y3yuFsdw==
+  dependencies:
+    bytes "~3.1.2"
+    content-type "~1.0.5"
+    debug "2.6.9"
+    depd "2.0.0"
+    destroy "~1.2.0"
+    http-errors "~2.0.1"
+    iconv-lite "~0.4.24"
+    on-finished "~2.4.1"
+    qs "~6.16.0"
+    raw-body "~2.5.3"
+    type-is "~1.6.18"
+    unpipe "~1.0.0"
+
+buffer-equal-constant-time@^1.0.1:
+  version "1.0.1"
+  resolved "https://registry.yarnpkg.com/buffer-equal-constant-time/-/buffer-equal-constant-time-1.0.1.tgz#f8e71132f7ffe6e01a5c9697a4c6f3e48d5cc819"
+  integrity sha512-zRpUiDwd/xk6ADqPMATG8vc9VPrkck7T07OIx0gnjmJAnHnTVXNQG3vfvWNuiZIkwu9KrKdA1iJKfsfTVxE6NA==
+
+bytes@~3.1.2:
+  version "3.1.2"
+  resolved "https://registry.yarnpkg.com/bytes/-/bytes-3.1.2.tgz#8b0beeb98605adf1b128fa4386403c009e0221a5"
+  integrity sha512-/Nf7TyzTx6S3yRJObOAV7956r8cr2+Oj8AC5dt8wSP3BQAoeX58NoHyCU8P8zGkNXStjTSi6fzO6F0pBdcYbEg==
+
+call-bind-apply-helpers@^1.0.1, call-bind-apply-helpers@^1.0.2:
+  version "1.0.2"
+  resolved "https://registry.yarnpkg.com/call-bind-apply-helpers/-/call-bind-apply-helpers-1.0.2.tgz#4b5428c222be985d79c3d82657479dbe0b59b2d6"
+  integrity sha512-Sp1ablJ0ivDkSzjcaJdxEunN5/XvksFJ2sMBFfq6x0ryhQV/2b/KwFe21cMpmHtPOSij8K99/wSfoEuTObmuMQ==
+  dependencies:
+    es-errors "^1.3.0"
+    function-bind "^1.1.2"
+
+call-bound@^1.0.2:
+  version "1.0.4"
+  resolved "https://registry.yarnpkg.com/call-bound/-/call-bound-1.0.4.tgz#238de935d2a2a692928c538c7ccfa91067fd062a"
+  integrity sha512-+ys997U96po4Kx/ABpBCqhA9EuxJaQWDQg7295H4hBphv3IZg0boBKuwYpt4YXp6MZ5AmZQnU/tyMTlRpaSejg==
+  dependencies:
+    call-bind-apply-helpers "^1.0.2"
+    get-intrinsic "^1.3.0"
+
+cliui@^8.0.1:
+  version "8.0.1"
+  resolved "https://registry.yarnpkg.com/cliui/-/cliui-8.0.1.tgz#0c04b075db02cbfe60dc8e6cf2f5486b1a3608aa"
+  integrity sha512-BSeNnyus75C4//NQ9gQt1/csTXyo/8Sb+afLAkzAptFuMsod9HFokGNudZpi/oQV73hnVK+sR+5PVRMd+Dr7YQ==
+  dependencies:
+    string-width "^4.2.0"
+    strip-ansi "^6.0.1"
+    wrap-ansi "^7.0.0"
+
+color-convert@^2.0.1:
+  version "2.0.1"
+  resolved "https://registry.yarnpkg.com/color-convert/-/color-convert-2.0.1.tgz#72d3a68d598c9bdb3af2ad1e84f21d896abd4de3"
+  integrity sha512-RRECPsj7iu/xb5oKYcsFHSppFNnsj/52OVTRKb4zP5onXwVF3zVmmToNcOfGC+CRDpfK/U584fMg38ZHCaElKQ==
+  dependencies:
+    color-name "~1.1.4"
+
+color-name@~1.1.4:
+  version "1.1.4"
+  resolved "https://registry.yarnpkg.com/color-name/-/color-name-1.1.4.tgz#c2a09a87acbde69543de6f63fa3995c826c536a2"
+  integrity sha512-dOy+3AuW3a2wNbZHIuMZpTcgjGuLU/uBL/ubcZF9OXbDo8ff4O8yVp5Bf0efS8uEoYo5q4Fx7dY9OgQGXgAsQA==
+
+combined-stream@^1.0.8:
+  version "1.0.8"
+  resolved "https://registry.yarnpkg.com/combined-stream/-/combined-stream-1.0.8.tgz#c3d45a8b34fd730631a110a8a2520682b31d5a7f"
+  integrity sha512-FQN4MRfuJeHf7cBbBMJFXhKSDq+2kAArBlmRBvcvFE5BB1HZKXtSFASDhdlz9zOYwxh8lDdnvmMOe/+5cdoEdg==
+  dependencies:
+    delayed-stream "~1.0.0"
+
+content-disposition@~0.5.4:
+  version "0.5.4"
+  resolved "https://registry.yarnpkg.com/content-disposition/-/content-disposition-0.5.4.tgz#8b82b4efac82512a02bb0b1dcec9d2c5e8eb5bfe"
+  integrity sha512-FveZTNuGw04cxlAiWbzi6zTAL/lhehaWbTtgluJh4/E95DqMwTmha3KZN1aAWA8cFIhHzMZUvLevkw5Rqk+tSQ==
+  dependencies:
+    safe-buffer "5.2.1"
+
+content-type@~1.0.4, content-type@~1.0.5:
+  version "1.0.5"
+  resolved "https://registry.yarnpkg.com/content-type/-/content-type-1.0.5.tgz#8b773162656d1d1086784c8f23a54ce6d73d7918"
+  integrity sha512-nTjqfcBFEipKdXCv4YDQWCfmcLZKm81ldF0pAopTvyrFGVbcR6P/VAAd5G7N+0tTr8QqiU0tFadD6FK4NtJwOA==
+
+cookie-signature@~1.0.6:
+  version "1.0.7"
+  resolved "https://registry.yarnpkg.com/cookie-signature/-/cookie-signature-1.0.7.tgz#ab5dd7ab757c54e60f37ef6550f481c426d10454"
+  integrity sha512-NXdYc3dLr47pBkpUCHtKSwIOQXLVn8dZEuywboCOJY/osA0wFSLlSawr3KN8qXJEyX66FcONTH8EIlVuK0yyFA==
+
+cookie@~0.7.1:
+  version "0.7.2"
+  resolved "https://registry.yarnpkg.com/cookie/-/cookie-0.7.2.tgz#556369c472a2ba910f2979891b526b3436237ed7"
+  integrity sha512-yki5XnKuf750l50uGTllt6kKILY4nQ1eNIQatoXEByZ5dWgnKqbnqmTrBE5B4N7lrMJKQ2ytWMiTO2o0v6Ew/w==
+
+cors@^2.8.5:
+  version "2.8.6"
+  resolved "https://registry.yarnpkg.com/cors/-/cors-2.8.6.tgz#ff5dd69bd95e547503820d29aba4f8faf8dfec96"
+  integrity sha512-tJtZBBHA6vjIAaF6EnIaq6laBBP9aq/Y3ouVJjEfoHbRBcHBAHYcMh/w8LDrk2PvIMMq8gmopa5D4V8RmbrxGw==
+  dependencies:
+    object-assign "^4"
+    vary "^1"
+
+data-uri-to-buffer@^4.0.0:
+  version "4.0.1"
+  resolved "https://registry.yarnpkg.com/data-uri-to-buffer/-/data-uri-to-buffer-4.0.1.tgz#d8feb2b2881e6a4f58c2e08acfd0e2834e26222e"
+  integrity sha512-0R9ikRb668HB7QDxT1vkpuUBtqc53YyAwMwGeUFKRojY/NWKvdZ+9UYtRfGmhqNbRkTSVpMbmyhXipFFv2cb/A==
+
+debug@2.6.9:
+  version "2.6.9"
+  resolved "https://registry.yarnpkg.com/debug/-/debug-2.6.9.tgz#5d128515df134ff327e90a4c93f4e077a536341f"
+  integrity sha512-bC7ElrdJaJnPbAP+1EotYvqZsb3ecl5wi6Bfi6BJTUcNowp6cvspg0jXznRTKDjm/E7AdgFBVeAPVMNcKGsHMA==
+  dependencies:
+    ms "2.0.0"
+
+debug@4, debug@^4.3.4:
+  version "4.4.3"
+  resolved "https://registry.yarnpkg.com/debug/-/debug-4.4.3.tgz#c6ae432d9bd9662582fce08709b038c58e9e3d6a"
+  integrity sha512-RGwwWnwQvkVfavKVt22FGLw+xYSdzARwm0ru6DhTVA3umU5hZc28V3kO4stgYryrTlLpuvgI9GiijltAjNbcqA==
+  dependencies:
+    ms "^2.1.3"
+
+delayed-stream@~1.0.0:
+  version "1.0.0"
+  resolved "https://registry.yarnpkg.com/delayed-stream/-/delayed-stream-1.0.0.tgz#df3ae199acadfb7d440aaae0b29e2272b24ec619"
+  integrity sha512-ZySD7Nf91aLB0RxL4KGrKHBXl7Eds1DAmEdcoVawXnLD7SDhpNgtuII2aAkg7a7QS41jxPSZ17p4VdGnMHk3MQ==
+
+depd@2.0.0, depd@~2.0.0:
+  version "2.0.0"
+  resolved "https://registry.yarnpkg.com/depd/-/depd-2.0.0.tgz#b696163cc757560d09cf22cc8fad1571b79e76df"
+  integrity sha512-g7nH6P6dyDioJogAAGprGpCtVImJhpPk/roCzdb3fIh61/s/nPsfR6onyMwkCAR/OlC3yBC0lESvUoQEAssIrw==
+
+destroy@1.2.0, destroy@~1.2.0:
+  version "1.2.0"
+  resolved "https://registry.yarnpkg.com/destroy/-/destroy-1.2.0.tgz#4803735509ad8be552934c67df614f94e66fa015"
+  integrity sha512-2sJGJTaXIIaR1w4iJSNoN0hnMY7Gpc/n8D4qSCJw8QqFWXf7cuAgnEHxBpweaVcPevC2l3KpjYCx3NypQQgaJg==
+
+dunder-proto@^1.0.1:
+  version "1.0.1"
+  resolved "https://registry.yarnpkg.com/dunder-proto/-/dunder-proto-1.0.1.tgz#d7ae667e1dc83482f8b70fd0f6eefc50da30f58a"
+  integrity sha512-KIN/nDJBQRcXw0MLVhZE9iQHmG68qAVIBg9CqmUYjmQIhgij9U5MFvrqkUL5FbtyyzZuOeOt0zdeRe4UY7ct+A==
+  dependencies:
+    call-bind-apply-helpers "^1.0.1"
+    es-errors "^1.3.0"
+    gopd "^1.2.0"
+
+duplexify@^4.0.0, duplexify@^4.1.3:
+  version "4.1.3"
+  resolved "https://registry.yarnpkg.com/duplexify/-/duplexify-4.1.3.tgz#a07e1c0d0a2c001158563d32592ba58bddb0236f"
+  integrity sha512-M3BmBhwJRZsSx38lZyhE53Csddgzl5R7xGJNk7CVddZD6CcmwMCH8J+7AprIrQKH7TonKxaCjcv27Qmf+sQ+oA==
+  dependencies:
+    end-of-stream "^1.4.1"
+    inherits "^2.0.3"
+    readable-stream "^3.1.1"
+    stream-shift "^1.0.2"
+
+ecdsa-sig-formatter@1.0.11, ecdsa-sig-formatter@^1.0.11:
+  version "1.0.11"
+  resolved "https://registry.yarnpkg.com/ecdsa-sig-formatter/-/ecdsa-sig-formatter-1.0.11.tgz#ae0f0fa2d85045ef14a817daa3ce9acd0489e5bf"
+  integrity sha512-nagl3RYrbNv6kQkeJIpt6NJZy8twLB/2vtz6yN9Z4vRKHN4/QZJIEbqohALSgwKdnksuY3k5Addp5lg8sVoVcQ==
+  dependencies:
+    safe-buffer "^5.0.1"
+
+ee-first@1.1.1:
+  version "1.1.1"
+  resolved "https://registry.yarnpkg.com/ee-first/-/ee-first-1.1.1.tgz#590c61156b0ae2f4f0255732a158b266bc56b21d"
+  integrity sha512-WMwm9LhRUo+WUaRN+vRuETqG89IgZphVSNkdFgeb6sS/E4OrDIN7t48CAewSHXc6C8lefD8KKfr5vY61brQlow==
+
+emoji-regex@^8.0.0:
+  version "8.0.0"
+  resolved "https://registry.yarnpkg.com/emoji-regex/-/emoji-regex-8.0.0.tgz#e818fd69ce5ccfcb404594f842963bf53164cc37"
+  integrity sha512-MSjYzcWNOA0ewAHpz0MxpYFvwg6yjy1NG3xteoqz644VCo/RPgnr1/GGt+ic3iJTzQ8Eu3TdM14SawnVUmGE6A==
+
+encodeurl@~2.0.0:
+  version "2.0.1"
+  resolved "https://registry.yarnpkg.com/encodeurl/-/encodeurl-2.0.1.tgz#f268548822bd87b5b4fdce83c56388c6d33c9de6"
+  integrity sha512-Ev/hIyePLZtpL98x562lvPtenrUfGr0lfaf44HFZ+hDEwso7ccV9QAZrEVLg0hxNAzygaAFxy2dYaAKKM0G06A==
+
+end-of-stream@^1.4.1:
+  version "1.4.5"
+  resolved "https://registry.yarnpkg.com/end-of-stream/-/end-of-stream-1.4.5.tgz#7344d711dea40e0b74abc2ed49778743ccedb08c"
+  integrity sha512-ooEGc6HP26xXq/N+GCGOT0JKCLDGrq2bQUZrQ7gyrJiZANJ/8YDTxTpQBXGMn+WbIQXNVpyWymm7KYVICQnyOg==
+  dependencies:
+    once "^1.4.0"
+
+es-define-property@^1.0.1:
+  version "1.0.1"
+  resolved "https://registry.yarnpkg.com/es-define-property/-/es-define-property-1.0.1.tgz#983eb2f9a6724e9303f61addf011c72e09e0b0fa"
+  integrity sha512-e3nRfgfUZ4rNGL232gUgX06QNyyez04KdjFrF+LTRoOXmrOgFKDg4BCdsjW8EnT69eqdYGmRpJwiPVYNrCaW3g==
+
+es-errors@^1.3.0:
+  version "1.3.0"
+  resolved "https://registry.yarnpkg.com/es-errors/-/es-errors-1.3.0.tgz#05f75a25dab98e4fb1dcd5e1472c0546d5057c8f"
+  integrity sha512-Zf5H2Kxt2xjTvbJvP2ZWLEICxA6j+hAmMzIlypy4xcBg1vKVnx89Wy0GbS+kf5cwCVFFzdCFh2XSCFNULS6csw==
+
+es-object-atoms@^1.0.0, es-object-atoms@^1.1.1:
+  version "1.1.2"
+  resolved "https://registry.yarnpkg.com/es-object-atoms/-/es-object-atoms-1.1.2.tgz#a2d0b373205724dfa525d23b0c3e1b1ca582c99b"
+  integrity sha512-HWcBoN6NileqtSydK2FqHbS/LoDd2pqrnQHLyJzBj4kOp/ky2MWMN694xOfkK8/SnUsW2DH7EfyVlydKCsm1Zw==
+  dependencies:
+    es-errors "^1.3.0"
+
+es-set-tostringtag@^2.1.0:
+  version "2.1.0"
+  resolved "https://registry.yarnpkg.com/es-set-tostringtag/-/es-set-tostringtag-2.1.0.tgz#f31dbbe0c183b00a6d26eb6325c810c0fd18bd4d"
+  integrity sha512-j6vWzfrGVfyXxge+O0x5sh6cvxAog0a/4Rdd2K36zCMV5eJ+/+tOAngRO8cODMNWbVRdVlmGZQL2YS3yR8bIUA==
+  dependencies:
+    es-errors "^1.3.0"
+    get-intrinsic "^1.2.6"
+    has-tostringtag "^1.0.2"
+    hasown "^2.0.2"
+
+escalade@^3.1.1:
+  version "3.2.0"
+  resolved "https://registry.yarnpkg.com/escalade/-/escalade-3.2.0.tgz#011a3f69856ba189dffa7dc8fcce99d2a87903e5"
+  integrity sha512-WUj2qlxaQtO4g6Pq5c29GTcWGDyd8itL8zTlipgECz3JesAiiOKotd8JU6otB3PACgG6xkJUyVhboMS+bje/jA==
+
+escape-html@~1.0.3:
+  version "1.0.3"
+  resolved "https://registry.yarnpkg.com/escape-html/-/escape-html-1.0.3.tgz#0258eae4d3d0c0974de1c169188ef0051d1d1988"
+  integrity sha512-NiSupZ4OeuGwr68lGIeym/ksIZMJodUGOSCZ/FSnTxcrekbvqrgdUxlJOMpijaKZVjAJrWrGs/6Jy8OMuyj9ow==
+
+etag@~1.8.1:
+  version "1.8.1"
+  resolved "https://registry.yarnpkg.com/etag/-/etag-1.8.1.tgz#41ae2eeb65efa62268aebfea83ac7d79299b0887"
+  integrity sha512-aIL5Fx7mawVa300al2BnEE4iNvo1qETxLrPI/o05L7z6go7fCw1J6EQmbK4FmJ2AS7kgVF/KEZWufBfdClMcPg==
+
+event-target-shim@^5.0.0:
+  version "5.0.1"
+  resolved "https://registry.yarnpkg.com/event-target-shim/-/event-target-shim-5.0.1.tgz#5d4d3ebdf9583d63a5333ce2deb7480ab2b05789"
+  integrity sha512-i/2XbnSz/uxRCU6+NdVJgKWDTM427+MqYbkQzD321DuCQJUqOuJKIA0IM2+W2xtYHdKOmZ4dR6fExsd4SXL+WQ==
+
+express@^4.21.0:
+  version "4.22.3"
+  resolved "https://registry.yarnpkg.com/express/-/express-4.22.3.tgz#e8f898d3c17582b1e311dd2c5cd6d8deff84724b"
+  integrity sha512-Bdcs4+3qlpVlx2NRn6fgX2Ue2/gGRaPeawebgclM0ERSCqDpA+owF1fdPwjJUTAJWMTuAaxjDf+hzb0/4eKvvw==
+  dependencies:
+    accepts "~1.3.8"
+    array-flatten "1.1.1"
+    body-parser "~1.20.5"
+    content-disposition "~0.5.4"
+    content-type "~1.0.4"
+    cookie "~0.7.1"
+    cookie-signature "~1.0.6"
+    debug "2.6.9"
+    depd "2.0.0"
+    encodeurl "~2.0.0"
+    escape-html "~1.0.3"
+    etag "~1.8.1"
+    finalhandler "~1.3.1"
+    fresh "~0.5.2"
+    http-errors "~2.0.0"
+    merge-descriptors "1.0.3"
+    methods "~1.1.2"
+    on-finished "~2.4.1"
+    parseurl "~1.3.3"
+    path-to-regexp "~0.1.13"
+    proxy-addr "~2.0.7"
+    qs "~6.16.0"
+    range-parser "~1.2.1"
+    safe-buffer "5.2.1"
+    send "~0.19.0"
+    serve-static "~1.16.2"
+    setprototypeof "1.2.0"
+    statuses "~2.0.1"
+    type-is "~1.6.18"
+    utils-merge "1.0.1"
+    vary "~1.1.2"
+
+extend@^3.0.2:
+  version "3.0.2"
+  resolved "https://registry.yarnpkg.com/extend/-/extend-3.0.2.tgz#f8b1136b4071fbd8eb140aff858b1019ec2915fa"
+  integrity sha512-fjquC59cD7CyW6urNXK0FBufkZcoiGG80wTuPujX590cB5Ttln20E2UB4S/WARVqhXffZl2LNgS+gQdPIIim/g==
+
+farmhash-modern@^1.1.0:
+  version "1.1.0"
+  resolved "https://registry.yarnpkg.com/farmhash-modern/-/farmhash-modern-1.1.0.tgz#c36b34ad196290d57b0b482dc89e637d0b59835f"
+  integrity sha512-6ypT4XfgqJk/F3Yuv4SX26I3doUjt0GTG4a+JgWxXQpxXzTBq8fPUeGHfcYMMDPHJHm3yPOSjaeBwBGAHWXCdA==
+
+fast-deep-equal@^3.1.1:
+  version "3.1.3"
+  resolved "https://registry.yarnpkg.com/fast-deep-equal/-/fast-deep-equal-3.1.3.tgz#3a7d56b559d6cbc3eb512325244e619a65c6c525"
+  integrity sha512-f3qQ9oQy9j2AhBe/H9VC91wLmKBCCU/gDOnKNAYG5hswO7BLKj09Hc5HYNz9cGI++xlpDCIgDaitVs03ATR84Q==
+
+fast-xml-builder@^1.2.0:
+  version "1.3.1"
+  resolved "https://registry.yarnpkg.com/fast-xml-builder/-/fast-xml-builder-1.3.1.tgz#ef05b353b45597483dfb09d450a062a2baec3a82"
+  integrity sha512-pIM/1n3ntFXKYrUZwW7QCK0gAW7XY+wzj1YMIV3tLDvPj/V+zTGJK5e3/4WJfwj0qWw2ElNXiTixda/R+3YSug==
+  dependencies:
+    path-expression-matcher "^1.6.2"
+    xml-naming "^0.3.0"
+
+fast-xml-parser@^5.3.4:
+  version "5.11.2"
+  resolved "https://registry.yarnpkg.com/fast-xml-parser/-/fast-xml-parser-5.11.2.tgz#0d4987adf4e7934af11d82a73b2841eca9928a42"
+  integrity sha512-R9iDuNrQYeQut46cn2r2wHKn4HYzVDvDm5J1wW+koZewykv0yuO2HChTYeZtrULyHIDM9cj9TUXloCsueCQUog==
+  dependencies:
+    "@nodable/entities" "^3.0.1"
+    fast-xml-builder "^1.2.0"
+    is-unsafe "^2.0.0"
+    path-expression-matcher "^1.6.2"
+    strnum "^2.4.2"
+    xml-naming "^0.3.0"
+
+faye-websocket@0.11.4:
+  version "0.11.4"
+  resolved "https://registry.yarnpkg.com/faye-websocket/-/faye-websocket-0.11.4.tgz#7f0d9275cfdd86a1c963dc8b65fcc451edcbb1da"
+  integrity sha512-CzbClwlXAuiRQAlUyfqPgvPoNKTckTPGfwZV4ZdAhVcP2lh9KUxJg2b5GkE7XbjKQ3YJnQ9z6D9ntLAlB+tP8g==
+  dependencies:
+    websocket-driver ">=0.5.1"
+
+fetch-blob@^3.1.2, fetch-blob@^3.1.4:
+  version "3.2.0"
+  resolved "https://registry.yarnpkg.com/fetch-blob/-/fetch-blob-3.2.0.tgz#f09b8d4bbd45adc6f0c20b7e787e793e309dcce9"
+  integrity sha512-7yAQpD2UMJzLi1Dqv7qFYnPbaPx7ZfFK6PiIxQ4PfkGPyNyl2Ugx+a/umUonmKqjhM4DnfbMvdX6otXq83soQQ==
+  dependencies:
+    node-domexception "^1.0.0"
+    web-streams-polyfill "^3.0.3"
+
+finalhandler@~1.3.1:
+  version "1.3.2"
+  resolved "https://registry.yarnpkg.com/finalhandler/-/finalhandler-1.3.2.tgz#1ebc2228fc7673aac4a472c310cc05b77d852b88"
+  integrity sha512-aA4RyPcd3badbdABGDuTXCMTtOneUCAYH/gxoYRTZlIJdF0YPWuGqiAsIrhNnnqdXGswYk6dGujem4w80UJFhg==
+  dependencies:
+    debug "2.6.9"
+    encodeurl "~2.0.0"
+    escape-html "~1.0.3"
+    on-finished "~2.4.1"
+    parseurl "~1.3.3"
+    statuses "~2.0.2"
+    unpipe "~1.0.0"
+
+firebase-admin@^13.4.0:
+  version "13.10.0"
+  resolved "https://registry.yarnpkg.com/firebase-admin/-/firebase-admin-13.10.0.tgz#d8d11067773ce72dbf2d4c764bea4598762c53e4"
+  integrity sha512-rbuCrJvYRwqBqvbccMS8fj/x2zsaMisdf5RQbRzQzr14Rbq9r2UlpuBHqWAwrO6c9dIRF56xF/xoepXsD5yDuQ==
+  dependencies:
+    "@fastify/busboy" "^3.0.0"
+    "@firebase/database-compat" "^2.0.0"
+    "@firebase/database-types" "^1.0.6"
+    farmhash-modern "^1.1.0"
+    fast-deep-equal "^3.1.1"
+    google-auth-library "^10.6.1"
+    jsonwebtoken "^9.0.0"
+    jwks-rsa "^3.1.0"
+  optionalDependencies:
+    "@google-cloud/firestore" "^7.11.0"
+    "@google-cloud/storage" "^7.19.0"
+
+firebase-functions@^6.4.0:
+  version "6.6.0"
+  resolved "https://registry.yarnpkg.com/firebase-functions/-/firebase-functions-6.6.0.tgz#4cc74465f586af3e0cacaf0a5d191b973b77279c"
+  integrity sha512-wwfo6JF+N7HUExVs5gUFgkgVGHDEog9O+qtouh7IuJWk8TBQ+KwXEgRiXbatSj7EbTu3/yYnHuzh3XExbfF6wQ==
+  dependencies:
+    "@types/cors" "^2.8.5"
+    "@types/express" "^4.17.21"
+    cors "^2.8.5"
+    express "^4.21.0"
+    protobufjs "^7.2.2"
+
+form-data@^2.5.5:
+  version "2.5.6"
+  resolved "https://registry.yarnpkg.com/form-data/-/form-data-2.5.6.tgz#ef39b3d99e2fc9f25420c0db7962fe36cafcd244"
+  integrity sha512-Ogz/E85h9tlfJzpI6TuFpGcHZFhLrb9Gw8wq9v40CxSCPnv7ahKr6Xgtkn0KYCDQJ8DNn5VoMO8EXr9V5PadyA==
+  dependencies:
+    asynckit "^0.4.0"
+    combined-stream "^1.0.8"
+    es-set-tostringtag "^2.1.0"
+    hasown "^2.0.4"
+    mime-types "^2.1.35"
+    safe-buffer "^5.2.1"
+
+formdata-polyfill@^4.0.10:
+  version "4.0.10"
+  resolved "https://registry.yarnpkg.com/formdata-polyfill/-/formdata-polyfill-4.0.10.tgz#24807c31c9d402e002ab3d8c720144ceb8848423"
+  integrity sha512-buewHzMvYL29jdeQTVILecSaZKnt/RJWjoZCF5OW60Z67/GmSLBkOFM7qh1PI3zFNtJbaZL5eQu1vLfazOwj4g==
+  dependencies:
+    fetch-blob "^3.1.2"
+
+forwarded@0.2.0:
+  version "0.2.0"
+  resolved "https://registry.yarnpkg.com/forwarded/-/forwarded-0.2.0.tgz#2269936428aad4c15c7ebe9779a84bf0b2a81811"
+  integrity sha512-buRG0fpBtRHSTCOASe6hD258tEubFoRLb4ZNA6NxMVHNw2gOcwHo9wyablzMzOA5z9xA9L1KNjk/Nt6MT9aYow==
+
+fresh@~0.5.2:
+  version "0.5.2"
+  resolved "https://registry.yarnpkg.com/fresh/-/fresh-0.5.2.tgz#3d8cadd90d976569fa835ab1f8e4b23a105605a7"
+  integrity sha512-zJ2mQYM18rEFOudeV4GShTGIQ7RbzA7ozbU9I/XBpm7kqgMywgmylMwXHxZJmkVoYkna9d2pVXVXPdYTP9ej8Q==
+
+function-bind@^1.1.2:
+  version "1.1.2"
+  resolved "https://registry.yarnpkg.com/function-bind/-/function-bind-1.1.2.tgz#2c02d864d97f3ea6c8830c464cbd11ab6eab7a1c"
+  integrity sha512-7XHNxH7qX9xG5mIwxkhumTox/MIRNcOgDrxWsMt2pAr23WHp6MrRlN7FBSFpCpr+oVO0F744iUgR82nJMfG2SA==
+
+functional-red-black-tree@^1.0.1:
+  version "1.0.1"
+  resolved "https://registry.yarnpkg.com/functional-red-black-tree/-/functional-red-black-tree-1.0.1.tgz#1b0ab3bd553b2a0d6399d29c0e3ea0b252078327"
+  integrity sha512-dsKNQNdj6xA3T+QlADDA7mOSlX0qiMINjn0cgr+eGHGsbSHzTabcIogz2+p/iqP1Xs6EP/sS2SbqH+brGTbq0g==
+
+gaxios@^6.0.0, gaxios@^6.0.2, gaxios@^6.1.1:
+  version "6.7.1"
+  resolved "https://registry.yarnpkg.com/gaxios/-/gaxios-6.7.1.tgz#ebd9f7093ede3ba502685e73390248bb5b7f71fb"
+  integrity sha512-LDODD4TMYx7XXdpwxAVRAIAuB0bzv0s+ywFonY46k126qzQHT9ygyoa9tncmOiQmmDrik65UYsEkv3lbfqQ3yQ==
+  dependencies:
+    extend "^3.0.2"
+    https-proxy-agent "^7.0.1"
+    is-stream "^2.0.0"
+    node-fetch "^2.6.9"
+    uuid "^9.0.1"
+
+gaxios@^7.0.0, gaxios@^7.1.4:
+  version "7.3.1"
+  resolved "https://registry.yarnpkg.com/gaxios/-/gaxios-7.3.1.tgz#b26223db05856dfa5e2393ea376abad00e479c62"
+  integrity sha512-kB3rzJV7d9juLZh8/56QTXCwQfxyhdOMdyYk1HdQKFtF8TJTDTZQJtixWIwXdE9Jji91mC41DUNpjleo4L4eAQ==
+  dependencies:
+    extend "^3.0.2"
+    https-proxy-agent "^7.0.1"
+    node-fetch "^3.3.2"
+
+gcp-metadata@8.1.2:
+  version "8.1.2"
+  resolved "https://registry.yarnpkg.com/gcp-metadata/-/gcp-metadata-8.1.2.tgz#e62e3373ddf41fc727ccc31c55c687b798bee898"
+  integrity sha512-zV/5HKTfCeKWnxG0Dmrw51hEWFGfcF2xiXqcA3+J90WDuP0SvoiSO5ORvcBsifmx/FoIjgQN3oNOGaQ5PhLFkg==
+  dependencies:
+    gaxios "^7.0.0"
+    google-logging-utils "^1.0.0"
+    json-bigint "^1.0.0"
+
+gcp-metadata@^6.1.0:
+  version "6.1.1"
+  resolved "https://registry.yarnpkg.com/gcp-metadata/-/gcp-metadata-6.1.1.tgz#f65aa69f546bc56e116061d137d3f5f90bdec494"
+  integrity sha512-a4tiq7E0/5fTjxPAaH4jpjkSv/uCaU2p5KC6HVGrvl0cDjA8iBZv4vv1gyzlmK0ZUKqwpOyQMKzZQe3lTit77A==
+  dependencies:
+    gaxios "^6.1.1"
+    google-logging-utils "^0.0.2"
+    json-bigint "^1.0.0"
+
+get-caller-file@^2.0.5:
+  version "2.0.5"
+  resolved "https://registry.yarnpkg.com/get-caller-file/-/get-caller-file-2.0.5.tgz#4f94412a82db32f36e3b0b9741f8a97feb031f7e"
+  integrity sha512-DyFP3BM/3YHTQOCUL/w0OZHR0lpKeGrxotcHWcqNEdnltqFwXVfhEBQ94eIo34AfQpo0rGki4cyIiftY06h2Fg==
+
+get-intrinsic@^1.2.5, get-intrinsic@^1.2.6, get-intrinsic@^1.3.0:
+  version "1.3.0"
+  resolved "https://registry.yarnpkg.com/get-intrinsic/-/get-intrinsic-1.3.0.tgz#743f0e3b6964a93a5491ed1bffaae054d7f98d01"
+  integrity sha512-9fSjSaos/fRIVIp+xSJlE6lfwhES7LNtKaCBIamHsjr2na1BiABJPo0mOjjz8GJDURarmCPGqaiVg5mfjb98CQ==
+  dependencies:
+    call-bind-apply-helpers "^1.0.2"
+    es-define-property "^1.0.1"
+    es-errors "^1.3.0"
+    es-object-atoms "^1.1.1"
+    function-bind "^1.1.2"
+    get-proto "^1.0.1"
+    gopd "^1.2.0"
+    has-symbols "^1.1.0"
+    hasown "^2.0.2"
+    math-intrinsics "^1.1.0"
+
+get-proto@^1.0.1:
+  version "1.0.1"
+  resolved "https://registry.yarnpkg.com/get-proto/-/get-proto-1.0.1.tgz#150b3f2743869ef3e851ec0c49d15b1d14d00ee1"
+  integrity sha512-sTSfBjoXBp89JvIKIefqw7U2CCebsc74kiY6awiGogKtoSGbgjYE/G/+l9sF3MWFPNc9IcoOC4ODfKHfxFmp0g==
+  dependencies:
+    dunder-proto "^1.0.1"
+    es-object-atoms "^1.0.0"
+
+google-auth-library@^10.6.1:
+  version "10.9.1"
+  resolved "https://registry.yarnpkg.com/google-auth-library/-/google-auth-library-10.9.1.tgz#af9852a328a6077e8ffbe776681b4ca9420a1714"
+  integrity sha512-i1ydyHrqcIxXkWh/uBmVkzCvIuq5yiK2ATndIe5XxKholrG/MTYP9xGYka4sQhrbIAgGjL2B6NOE7rFaiF3fXw==
+  dependencies:
+    base64-js "^1.3.0"
+    ecdsa-sig-formatter "^1.0.11"
+    gaxios "^7.1.4"
+    gcp-metadata "8.1.2"
+    google-logging-utils "1.1.3"
+    jws "^4.0.0"
+
+google-auth-library@^9.3.0, google-auth-library@^9.6.3:
+  version "9.15.1"
+  resolved "https://registry.yarnpkg.com/google-auth-library/-/google-auth-library-9.15.1.tgz#0c5d84ed1890b2375f1cd74f03ac7b806b392928"
+  integrity sha512-Jb6Z0+nvECVz+2lzSMt9u98UsoakXxA2HGHMCxh+so3n90XgYWkq5dur19JAJV7ONiJY22yBTyJB1TSkvPq9Ng==
+  dependencies:
+    base64-js "^1.3.0"
+    ecdsa-sig-formatter "^1.0.11"
+    gaxios "^6.1.1"
+    gcp-metadata "^6.1.0"
+    gtoken "^7.0.0"
+    jws "^4.0.0"
+
+google-gax@^4.3.3:
+  version "4.6.1"
+  resolved "https://registry.yarnpkg.com/google-gax/-/google-gax-4.6.1.tgz#57f8e3d893d4c708a71167cdcf47eb3afab95929"
+  integrity sha512-V6eky/xz2mcKfAd1Ioxyd6nmA61gao3n01C+YeuIwu3vzM9EDR6wcVzMSIbLMDXWeoi9SHYctXuKYC5uJUT3eQ==
+  dependencies:
+    "@grpc/grpc-js" "^1.10.9"
+    "@grpc/proto-loader" "^0.7.13"
+    "@types/long" "^4.0.0"
+    abort-controller "^3.0.0"
+    duplexify "^4.0.0"
+    google-auth-library "^9.3.0"
+    node-fetch "^2.7.0"
+    object-hash "^3.0.0"
+    proto3-json-serializer "^2.0.2"
+    protobufjs "^7.3.2"
+    retry-request "^7.0.0"
+    uuid "^9.0.1"
+
+google-logging-utils@1.1.3:
+  version "1.1.3"
+  resolved "https://registry.yarnpkg.com/google-logging-utils/-/google-logging-utils-1.1.3.tgz#17b71f1f95d266d2ddd356b8f00178433f041b17"
+  integrity sha512-eAmLkjDjAFCVXg7A1unxHsLf961m6y17QFqXqAXGj/gVkKFrEICfStRfwUlGNfeCEjNRa32JEWOUTlYXPyyKvA==
+
+google-logging-utils@^0.0.2:
+  version "0.0.2"
+  resolved "https://registry.yarnpkg.com/google-logging-utils/-/google-logging-utils-0.0.2.tgz#5fd837e06fa334da450433b9e3e1870c1594466a"
+  integrity sha512-NEgUnEcBiP5HrPzufUkBzJOD/Sxsco3rLNo1F1TNf7ieU8ryUzBhqba8r756CjLX7rn3fHl6iLEwPYuqpoKgQQ==
+
+google-logging-utils@^1.0.0:
+  version "1.2.0"
+  resolved "https://registry.yarnpkg.com/google-logging-utils/-/google-logging-utils-1.2.0.tgz#89dd643f986c765e61bfa2d01cada2292fe5bfd7"
+  integrity sha512-WE9av4wKDZgRjBwgVUabocx8T6/7o3Ca1Fat46FXDhXVAFibzNadedcOXrdgd1Kzmk8tsk/9ZH89Wyf/SqeZ3A==
+
+gopd@^1.2.0:
+  version "1.2.0"
+  resolved "https://registry.yarnpkg.com/gopd/-/gopd-1.2.0.tgz#89f56b8217bdbc8802bd299df6d7f1081d7e51a1"
+  integrity sha512-ZUKRh6/kUFoAiTAtTYPZJ3hw9wNxx+BIBOijnlG9PnrJsCcSjs1wyyD6vJpaYtgnzDrKYRSqf3OO6Rfa93xsRg==
+
+gtoken@^7.0.0:
+  version "7.1.0"
+  resolved "https://registry.yarnpkg.com/gtoken/-/gtoken-7.1.0.tgz#d61b4ebd10132222817f7222b1e6064bd463fc26"
+  integrity sha512-pCcEwRi+TKpMlxAQObHDQ56KawURgyAf6jtIY046fJ5tIv3zDe/LEIubckAO8fj6JnAxLdmWkUfNyulQ2iKdEw==
+  dependencies:
+    gaxios "^6.0.0"
+    jws "^4.0.0"
+
+has-symbols@^1.0.3, has-symbols@^1.1.0:
+  version "1.1.0"
+  resolved "https://registry.yarnpkg.com/has-symbols/-/has-symbols-1.1.0.tgz#fc9c6a783a084951d0b971fe1018de813707a338"
+  integrity sha512-1cDNdwJ2Jaohmb3sg4OmKaMBwuC48sYni5HUw2DvsC8LjGTLK9h+eb1X6RyuOHe4hT0ULCW68iomhjUoKUqlPQ==
+
+has-tostringtag@^1.0.2:
+  version "1.0.2"
+  resolved "https://registry.yarnpkg.com/has-tostringtag/-/has-tostringtag-1.0.2.tgz#2cdc42d40bef2e5b4eeab7c01a73c54ce7ab5abc"
+  integrity sha512-NqADB8VjPFLM2V0VvHUewwwsw0ZWBaIdgo+ieHtK3hasLz4qeCRjYcqfB6AQrBggRKppKF8L52/VqdVsO47Dlw==
+  dependencies:
+    has-symbols "^1.0.3"
+
+hasown@^2.0.2, hasown@^2.0.4:
+  version "2.0.4"
+  resolved "https://registry.yarnpkg.com/hasown/-/hasown-2.0.4.tgz#8c62d8cb90beb2aad5d0a5b67581ad9854c3f003"
+  integrity sha512-T2UbfbBEF32wiepXIsMlTW9+dDYC6wMh/t/vYA4tuOMKqWz/n3vr1NFSxQiyP+zk2mXsoMA/i/7qV6LKut1t1A==
+  dependencies:
+    function-bind "^1.1.2"
+
+html-entities@^2.5.2:
+  version "2.6.0"
+  resolved "https://registry.yarnpkg.com/html-entities/-/html-entities-2.6.0.tgz#7c64f1ea3b36818ccae3d3fb48b6974208e984f8"
+  integrity sha512-kig+rMn/QOVRvr7c86gQ8lWXq+Hkv6CbAH1hLu+RG338StTpE8Z0b44SDVaqVu7HGKf27frdmUYEs9hTUX/cLQ==
+
+http-errors@~2.0.0, http-errors@~2.0.1:
+  version "2.0.1"
+  resolved "https://registry.yarnpkg.com/http-errors/-/http-errors-2.0.1.tgz#36d2f65bc909c8790018dd36fb4d93da6caae06b"
+  integrity sha512-4FbRdAX+bSdmo4AUFuS0WNiPz8NgFt+r8ThgNWmlrjQjt1Q7ZR9+zTlce2859x4KSXrwIsaeTqDoKQmtP8pLmQ==
+  dependencies:
+    depd "~2.0.0"
+    inherits "~2.0.4"
+    setprototypeof "~1.2.0"
+    statuses "~2.0.2"
+    toidentifier "~1.0.1"
+
+http-parser-js@>=0.5.1:
+  version "0.5.10"
+  resolved "https://registry.yarnpkg.com/http-parser-js/-/http-parser-js-0.5.10.tgz#b3277bd6d7ed5588e20ea73bf724fcbe44609075"
+  integrity sha512-Pysuw9XpUq5dVc/2SMHpuTY01RFl8fttgcyunjL7eEMhGM3cI4eOmiCycJDVCo/7O7ClfQD3SaI6ftDzqOXYMA==
+
+http-proxy-agent@^5.0.0:
+  version "5.0.0"
+  resolved "https://registry.yarnpkg.com/http-proxy-agent/-/http-proxy-agent-5.0.0.tgz#5129800203520d434f142bc78ff3c170800f2b43"
+  integrity sha512-n2hY8YdoRE1i7r6M0w9DIw5GgZN0G25P8zLCRQ8rjXtTU3vsNFBI/vWK/UIeE6g5MUUz6avwAPXmL6Fy9D/90w==
+  dependencies:
+    "@tootallnate/once" "2"
+    agent-base "6"
+    debug "4"
+
+https-proxy-agent@^5.0.0:
+  version "5.0.1"
+  resolved "https://registry.yarnpkg.com/https-proxy-agent/-/https-proxy-agent-5.0.1.tgz#c59ef224a04fe8b754f3db0063a25ea30d0005d6"
+  integrity sha512-dFcAjpTQFgoLMzC2VwU+C/CbS7uRL0lWmxDITmqm7C+7F0Odmj6s9l6alZc6AELXhrnggM2CeWSXHGOdX2YtwA==
+  dependencies:
+    agent-base "6"
+    debug "4"
+
+https-proxy-agent@^7.0.1:
+  version "7.0.6"
+  resolved "https://registry.yarnpkg.com/https-proxy-agent/-/https-proxy-agent-7.0.6.tgz#da8dfeac7da130b05c2ba4b59c9b6cd66611a6b9"
+  integrity sha512-vK9P5/iUfdl95AI+JVyUuIcVtd4ofvtrOr3HNtM2yxC9bnMbEdp3x01OhQNnjb8IJYi38VlTE3mBXwcfvywuSw==
+  dependencies:
+    agent-base "^7.1.2"
+    debug "4"
+
+iconv-lite@~0.4.24:
+  version "0.4.24"
+  resolved "https://registry.yarnpkg.com/iconv-lite/-/iconv-lite-0.4.24.tgz#2022b4b25fbddc21d2f524974a474aafe733908b"
+  integrity sha512-v3MXnZAcvnywkTUEZomIActle7RXXeedOR31wwl7VlyoXO4Qi9arvSenNQWne1TcRwhCL1HwLI21bEqdpj8/rA==
+  dependencies:
+    safer-buffer ">= 2.1.2 < 3"
+
+inherits@^2.0.3, inherits@~2.0.4:
+  version "2.0.4"
+  resolved "https://registry.yarnpkg.com/inherits/-/inherits-2.0.4.tgz#0fa2c64f932917c3433a0ded55363aae37416b7c"
+  integrity sha512-k/vGaX4/Yla3WzyMCvTQOXYeIHvqOKtnqBduzTHpzpQZzAskKMhZ2K+EnBiSM9zGSoIFeMpXKxa4dYeZIQqewQ==
+
+ipaddr.js@1.9.1:
+  version "1.9.1"
+  resolved "https://registry.yarnpkg.com/ipaddr.js/-/ipaddr.js-1.9.1.tgz#bff38543eeb8984825079ff3a2a8e6cbd46781b3"
+  integrity sha512-0KI/607xoxSToH7GjN1FfSbLoU0+btTicjsQSWQlh/hZykN8KpmMf7uYwPW3R+akZ6R/w18ZlXSHBYXiYUPO3g==
+
+is-fullwidth-code-point@^3.0.0:
+  version "3.0.0"
+  resolved "https://registry.yarnpkg.com/is-fullwidth-code-point/-/is-fullwidth-code-point-3.0.0.tgz#f116f8064fe90b3f7844a38997c0b75051269f1d"
+  integrity sha512-zymm5+u+sCsSWyD9qNaejV3DFvhCKclKdizYaJUuHA83RLjb7nSuGnddCHGv0hk+KY7BMAlsWeK4Ueg6EV6XQg==
+
+is-stream@^2.0.0:
+  version "2.0.1"
+  resolved "https://registry.yarnpkg.com/is-stream/-/is-stream-2.0.1.tgz#fac1e3d53b97ad5a9d0ae9cef2389f5810a5c077"
+  integrity sha512-hFoiJiTl63nn+kstHGBtewWSKnQLpyb155KHheA1l39uvtO9nWIop1p3udqPcUd/xbF1VLMO4n7OI6p7RbngDg==
+
+is-unsafe@^2.0.0:
+  version "2.0.2"
+  resolved "https://registry.yarnpkg.com/is-unsafe/-/is-unsafe-2.0.2.tgz#bb1ead17f1aa688f6433258b561e98b1a45a1afc"
+  integrity sha512-HgbIHPBH0KHHCcjLfGsCvhtPTVxjaAZlXjwdz7/GQC40SjSe4sfQsar8J5VFo8JOSbarkpV0OLG95bbaNd9aAQ==
+
+jose@^4.15.4:
+  version "4.15.9"
+  resolved "https://registry.yarnpkg.com/jose/-/jose-4.15.9.tgz#9b68eda29e9a0614c042fa29387196c7dd800100"
+  integrity sha512-1vUQX+IdDMVPj4k8kOxgUqlcK518yluMuGZwqlr44FS1ppZB/5GWh4rZG89erpOBOJjU/OBsnCVFfapsRz6nEA==
+
+json-bigint@^1.0.0:
+  version "1.0.0"
+  resolved "https://registry.yarnpkg.com/json-bigint/-/json-bigint-1.0.0.tgz#ae547823ac0cad8398667f8cd9ef4730f5b01ff1"
+  integrity sha512-SiPv/8VpZuWbvLSMtTDU8hEfrZWg/mH/nV/b4o0CYbSxu1UIQPLdwKOCIyLQX+VIPO5vrLX3i8qtqFyhdPSUSQ==
+  dependencies:
+    bignumber.js "^9.0.0"
+
+jsonwebtoken@^9.0.0:
+  version "9.0.3"
+  resolved "https://registry.yarnpkg.com/jsonwebtoken/-/jsonwebtoken-9.0.3.tgz#6cd57ab01e9b0ac07cb847d53d3c9b6ee31f7ae2"
+  integrity sha512-MT/xP0CrubFRNLNKvxJ2BYfy53Zkm++5bX9dtuPbqAeQpTVe0MQTFhao8+Cp//EmJp244xt6Drw/GVEGCUj40g==
+  dependencies:
+    jws "^4.0.1"
+    lodash.includes "^4.3.0"
+    lodash.isboolean "^3.0.3"
+    lodash.isinteger "^4.0.4"
+    lodash.isnumber "^3.0.3"
+    lodash.isplainobject "^4.0.6"
+    lodash.isstring "^4.0.1"
+    lodash.once "^4.0.0"
+    ms "^2.1.1"
+    semver "^7.5.4"
+
+jwa@^2.0.1:
+  version "2.0.1"
+  resolved "https://registry.yarnpkg.com/jwa/-/jwa-2.0.1.tgz#bf8176d1ad0cd72e0f3f58338595a13e110bc804"
+  integrity sha512-hRF04fqJIP8Abbkq5NKGN0Bbr3JxlQ+qhZufXVr0DvujKy93ZCbXZMHDL4EOtodSbCWxOqR8MS1tXA5hwqCXDg==
+  dependencies:
+    buffer-equal-constant-time "^1.0.1"
+    ecdsa-sig-formatter "1.0.11"
+    safe-buffer "^5.0.1"
+
+jwks-rsa@^3.1.0:
+  version "3.2.2"
+  resolved "https://registry.yarnpkg.com/jwks-rsa/-/jwks-rsa-3.2.2.tgz#f6d528306befacdbc62c8c0272761faac55ffbb3"
+  integrity sha512-BqTyEDV+lS8F2trk3A+qJnxV5Q9EqKCBJOPti3W97r7qTympCZjb7h2X6f2kc+0K3rsSTY1/6YG2eaXKoj497w==
+  dependencies:
+    "@types/jsonwebtoken" "^9.0.4"
+    debug "^4.3.4"
+    jose "^4.15.4"
+    limiter "^1.1.5"
+    lru-memoizer "^2.2.0"
+
+jws@^4.0.0, jws@^4.0.1:
+  version "4.0.1"
+  resolved "https://registry.yarnpkg.com/jws/-/jws-4.0.1.tgz#07edc1be8fac20e677b283ece261498bd38f0690"
+  integrity sha512-EKI/M/yqPncGUUh44xz0PxSidXFr/+r0pA70+gIYhjv+et7yxM+s29Y+VGDkovRofQem0fs7Uvf4+YmAdyRduA==
+  dependencies:
+    jwa "^2.0.1"
+    safe-buffer "^5.0.1"
+
+limiter@^1.1.5:
+  version "1.1.5"
+  resolved "https://registry.yarnpkg.com/limiter/-/limiter-1.1.5.tgz#8f92a25b3b16c6131293a0cc834b4a838a2aa7c2"
+  integrity sha512-FWWMIEOxz3GwUI4Ts/IvgVy6LPvoMPgjMdQ185nN6psJyBJ4yOpzqm695/h5umdLJg2vW3GR5iG11MAkR2AzJA==
+
+lodash.camelcase@^4.3.0:
+  version "4.3.0"
+  resolved "https://registry.yarnpkg.com/lodash.camelcase/-/lodash.camelcase-4.3.0.tgz#b28aa6288a2b9fc651035c7711f65ab6190331a6"
+  integrity sha512-TwuEnCnxbc3rAvhf/LbG7tJUDzhqXyFnv3dtzLOPgCG/hODL7WFnsbwktkD7yUV0RrreP/l1PALq/YSg6VvjlA==
+
+lodash.clonedeep@^4.5.0:
+  version "4.5.0"
+  resolved "https://registry.yarnpkg.com/lodash.clonedeep/-/lodash.clonedeep-4.5.0.tgz#e23f3f9c4f8fbdde872529c1071857a086e5ccef"
+  integrity sha512-H5ZhCF25riFd9uB5UCkVKo61m3S/xZk1x4wA6yp/L3RFP6Z/eHH1ymQcGLo7J3GMPfm0V/7m1tryHuGVxpqEBQ==
+
+lodash.includes@^4.3.0:
+  version "4.3.0"
+  resolved "https://registry.yarnpkg.com/lodash.includes/-/lodash.includes-4.3.0.tgz#60bb98a87cb923c68ca1e51325483314849f553f"
+  integrity sha512-W3Bx6mdkRTGtlJISOvVD/lbqjTlPPUDTMnlXZFnVwi9NKJ6tiAk6LVdlhZMm17VZisqhKcgzpO5Wz91PCt5b0w==
+
+lodash.isboolean@^3.0.3:
+  version "3.0.3"
+  resolved "https://registry.yarnpkg.com/lodash.isboolean/-/lodash.isboolean-3.0.3.tgz#6c2e171db2a257cd96802fd43b01b20d5f5870f6"
+  integrity sha512-Bz5mupy2SVbPHURB98VAcw+aHh4vRV5IPNhILUCsOzRmsTmSQ17jIuqopAentWoehktxGd9e/hbIXq980/1QJg==
+
+lodash.isinteger@^4.0.4:
+  version "4.0.4"
+  resolved "https://registry.yarnpkg.com/lodash.isinteger/-/lodash.isinteger-4.0.4.tgz#619c0af3d03f8b04c31f5882840b77b11cd68343"
+  integrity sha512-DBwtEWN2caHQ9/imiNeEA5ys1JoRtRfY3d7V9wkqtbycnAmTvRRmbHKDV4a0EYc678/dia0jrte4tjYwVBaZUA==
+
+lodash.isnumber@^3.0.3:
+  version "3.0.3"
+  resolved "https://registry.yarnpkg.com/lodash.isnumber/-/lodash.isnumber-3.0.3.tgz#3ce76810c5928d03352301ac287317f11c0b1ffc"
+  integrity sha512-QYqzpfwO3/CWf3XP+Z+tkQsfaLL/EnUlXWVkIk5FUPc4sBdTehEqZONuyRt2P67PXAk+NXmTBcc97zw9t1FQrw==
+
+lodash.isplainobject@^4.0.6:
+  version "4.0.6"
+  resolved "https://registry.yarnpkg.com/lodash.isplainobject/-/lodash.isplainobject-4.0.6.tgz#7c526a52d89b45c45cc690b88163be0497f550cb"
+  integrity sha512-oSXzaWypCMHkPC3NvBEaPHf0KsA5mvPrOPgQWDsbg8n7orZ290M0BmC/jgRZ4vcJ6DTAhjrsSYgdsW/F+MFOBA==
+
+lodash.isstring@^4.0.1:
+  version "4.0.1"
+  resolved "https://registry.yarnpkg.com/lodash.isstring/-/lodash.isstring-4.0.1.tgz#d527dfb5456eca7cc9bb95d5daeaf88ba54a5451"
+  integrity sha512-0wJxfxH1wgO3GrbuP+dTTk7op+6L41QCXbGINEmD+ny/G/eCqGzxyCsh7159S+mgDDcoarnBw6PC1PS5+wUGgw==
+
+lodash.once@^4.0.0:
+  version "4.1.1"
+  resolved "https://registry.yarnpkg.com/lodash.once/-/lodash.once-4.1.1.tgz#0dd3971213c7c56df880977d504c88fb471a97ac"
+  integrity sha512-Sb487aTOCr9drQVL8pIxOzVhafOjZN9UU54hiN8PU3uAiSV7lx1yYNpbNmex2PK6dSJoNTSJUUswT651yww3Mg==
+
+long@^5.0.0, long@^5.3.2:
+  version "5.3.2"
+  resolved "https://registry.yarnpkg.com/long/-/long-5.3.2.tgz#1d84463095999262d7d7b7f8bfd4a8cc55167f83"
+  integrity sha512-mNAgZ1GmyNhD7AuqnTG3/VQ26o760+ZYBPKjPvugO8+nLbYfX6TVpJPseBvopbdY+qpZ/lKUnmEc1LeZYS3QAA==
+
+lru-cache@6.0.0:
+  version "6.0.0"
+  resolved "https://registry.yarnpkg.com/lru-cache/-/lru-cache-6.0.0.tgz#6d6fe6570ebd96aaf90fcad1dafa3b2566db3a94"
+  integrity sha512-Jo6dJ04CmSjuznwJSS3pUeWmd/H0ffTlkXXgwZi+eq1UCmqQwCh+eLsYOYCwY991i2Fah4h1BEMCx4qThGbsiA==
+  dependencies:
+    yallist "^4.0.0"
+
+lru-memoizer@^2.2.0:
+  version "2.3.0"
+  resolved "https://registry.yarnpkg.com/lru-memoizer/-/lru-memoizer-2.3.0.tgz#ef0fbc021bceb666794b145eefac6be49dc47f31"
+  integrity sha512-GXn7gyHAMhO13WSKrIiNfztwxodVsP8IoZ3XfrJV4yH
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
