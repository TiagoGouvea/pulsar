Você é um worker de um harness autônomo. Contexto limpo: tudo que importa está nos arquivos citados.
Regras:
- Trabalhe SOMENTE no diretório atual (worktree). Não acesse .env nem fora do projeto.
- Não edite arquivos listados como protegidos. Não use .skip/.only. Não enfraqueça asserts.
- Siga app/AGENTS.md, DECISOES.md e o design system (design/pulsar_bio_analytics/DESIGN.md → app/src/design/).
- Design em `design/`: uma pasta por tela com `screen.png` (mockup) e `code.html` (HTML/Tailwind de referência: copie estrutura, classes e textos, mas reescreva em React com os componentes do design system); `pulsar_mapeamento_de_telas_x_especifica_o_funcional_v1.1.md` liga cada tela às seções da spec. Em conflito, a spec (docs/) vence: o app é somente mobile, ignore breakpoints/layouts de desktop do design.
- Código, nomes e comentários em inglês; textos de interface somente em pt-BR. Gerenciador de pacotes: yarn.
- Não faça git commit/push/checkout: o orquestrador cuida do git.
- Nunca altere `node_modules` nem dependências de terceiros (nem por script/patch/postinstall) para fazer algo passar; não mude `scripts` do package.json, lockfiles ou configs de infraestrutura sem que a feature peça. Se a infraestrutura impede a tarefa, registre em .harness/inbox/questions.jsonl e pare.
- Se faltar informação: escolha o default mais conservador e registre uma linha JSON em
  .harness/inbox/questions.jsonl: {"featureId","pergunta","escolhido","alternativas","impacto"}.
- Se identificar um risco futuro: registre em .harness/inbox/risks.jsonl:
  {"featureId","risco","probabilidade","impacto","sugestao"}.
- Rode os testes relevantes antes de terminar. Termine com o bloco ```json final pedido no seu papel
  (padrão: {"summary","filesChanged","testsRun","confidence":"low|med|high","notes"}).
LIÇÕES RELEVANTES:
- [L-005] Se gemini-pro falhar como revisor, use o fallback (haiku ou sonnet). Ele resolveu a revisão sem custo extra relevante em evt-43/evt-44 e evt-19/evt-20.


# Papel: avaliador de código (independente)

Você é de outra família de modelo e não escreveu este código. Não edite arquivos.
Avalie a partir do diff abaixo (os gates já rodaram build, lint, tipos e testes). Abra outros arquivos só para confirmar um ponto específico; não explore o repositório inteiro.

Verifique:
- O código atende **de fato** aos critérios de aceite, sem implementar "para o teste" (hardcode, mocks indevidos, condicionais de teste em produção).
- Testes escritos pelo próprio implementador (feature sem teste protegido): cobrem cada critério de aceite e falhariam sem a implementação; teste trivial ou que não verifica o critério é `major`.
- Escopo: código além do que a feature pede (telas/fluxos de outras features) é `major`; remover ou quebrar código de features já entregues é `blocker`.
- Segurança (Security Rules, dados entre usuários, segredos), privacidade (nomes de indicadores só via `<IndicatorLabel>`), aderência à spec e qualidade (tipos, legibilidade, duplicação).

## Feature
```json
{
  "id": "F-2.01",
  "title": "Repositório e regras de indicadores",
  "description": "src/data/indicators.ts + hook useIndicators (onSnapshot): criar (aplicando sugestão de agregação), editar campos editáveis, arquivar/restaurar (archivedAt), reordenar dentro do grupo (sortOrder), sem apagar registros. Campos travados não são enviados depois de lockedAt.\n\nfirestore.rules para users/{uid}/indicators: validação de schema/tipos/tamanhos; após lockedAt != null, group, valueType, numeric (unidade), scale, options, frequency e dailyAggregation são imutáveis; nome/sigla/emoji/sortOrder/archivedAt/desiredDirection/idealRange editáveis; direção só para Resultado; idealRange.min <= max; lockedAt não pode voltar a null.",
  "acceptance": [
    "Criar grava todos os campos do modelo com createdAt/updatedAt de servidor",
    "Arquivar não apaga registros e tira o indicador do preenchimento",
    "Reordenar preserva a ordem por grupo após reload",
    "Edição de indicador travado só envia nome/sigla/emoji/ordem/status/direção/faixa",
    "Indicador com lockedAt rejeita mudança de grupo/tipo/unidade/escala/opções/frequência/agregação",
    "Indicador com lockedAt aceita mudar nome, sigla, emoji, ordem, arquivamento e direção/faixa",
    "Agregação incompatível com o tipo é rejeitada",
    "Fator com desiredDirection é rejeitado; faixa com min > max é rejeitada"
  ],
  "specRefs": [
    "spec.md#4.1",
    "spec.md#4.5",
    "arquitetura.md#3.2",
    "spec.md#4.3",
    "arquitetura.md#9.2"
  ]
}
```

## Gates
G1 install-build: ok
G2 lint-format: ok
G3 typecheck: ok
G4 unit: ok
G5 security-rules: ok
G6 e2e: pulado
G7 protected-tests: ok
G8 privacy-leak: pulado
G9 a11y: pulado
G10 mobile-layout: pulado
G11 visual-regression: pulado
G12 lighthouse: pulado
G13 secrets: ok

## Diff
```diff
diff --git a/app/firestore.rules b/app/firestore.rules
index 0f2f245..6aa3168 100644
--- a/app/firestore.rules
+++ b/app/firestore.rules
@@ -8,6 +8,123 @@ service cloud.firestore {
       return request.auth != null && request.auth.uid == uid;
     }
 
+    function validNullableTimestamp(value) {
+      return value == null || value is timestamp;
+    }
+
+    function validNullableNumber(value) {
+      return value == null || value is number;
+    }
+
+    function validNumericConfig(config) {
+      return config is map
+        && config.keys().hasOnly(['unit', 'min', 'max', 'step'])
+        && config.keys().hasAll(['unit', 'min', 'max', 'step'])
+        && config.unit is string && config.unit.size() <= 20
+        && validNullableNumber(config.min) && validNullableNumber(config.max)
+        && (config.min == null || config.max == null || config.min <= config.max)
+        && config.step is number && config.step > 0;
+    }
+
+    function validScaleConfig(config) {
+      return config is map
+        && config.keys().hasOnly(['min', 'max', 'step'])
+        && config.keys().hasAll(['min', 'max', 'step'])
+        && config.min is number && config.max is number && config.min < config.max
+        && config.step is number && config.step > 0;
+    }
+
+    function validOrdinalOption(option) {
+      return option is map
+        && option.keys().hasOnly(['id', 'label'])
+        && option.keys().hasAll(['id', 'label'])
+        && option.id is string && option.id.size() > 0 && option.id.size() <= 40
+        && option.label is string && option.label.size() > 0 && option.label.size() <= 60;
+    }
+
+    function validOrdinalOptions(options) {
+      return options is list && options.size() >= 2 && options.size() <= 7
+        && validOrdinalOption(options[0]) && validOrdinalOption(options[1])
+        && (options.size() < 3 || validOrdinalOption(options[2]))
+        && (options.size() < 4 || validOrdinalOption(options[3]))
+        && (options.size() < 5 || validOrdinalOption(options[4]))
+        && (options.size() < 6 || validOrdinalOption(options[5]))
+        && (options.size() < 7 || validOrdinalOption(options[6]));
+    }
+
+    function validDirectionAndRange(data) {
+      return (data.group == 'factor'
+          && data.desiredDirection == null && data.idealRange == null)
+        || (data.group == 'result'
+          && data.desiredDirection in ['neutral', 'higher', 'lower', 'target_range']
+          && (data.desiredDirection == 'target_range'
+            ? (data.valueType in ['numeric', 'scale']
+              && data.idealRange is map
+              && data.idealRange.keys().hasOnly(['min', 'max'])
+              && data.idealRange.keys().hasAll(['min', 'max'])
+              && data.idealRange.min is number && data.idealRange.max is number
+              && data.idealRange.min <= data.idealRange.max)
+            : data.idealRange == null));
+    }
+
+    function validAggregation(data) {
+      return data.frequency == 'single_per_day'
+        ? data.dailyAggregation == null
+        : (data.dailyAggregation != null
+          && ((data.valueType in ['numeric', 'scale']
+              && data.dailyAggregation in ['sum', 'mean', 'last'])
+            || (data.valueType == 'boolean' && data.dailyAggregation in ['any', 'last'])
+            || (data.valueType == 'ordinal' && data.dailyAggregation == 'last')));
+    }
+
+    function validIndicator(data) {
+      let keys = data.keys();
+      return keys.hasOnly([
+          'group', 'name', 'abbreviation', 'emoji', 'valueType', 'numeric', 'scale', 'options',
+          'desiredDirection', 'idealRange', 'frequency', 'dailyAggregation', 'sortOrder',
+          'archivedAt', 'lockedAt', 'createdAt', 'updatedAt'
+        ])
+        && keys.hasAll([
+          'group', 'name', 'abbreviation', 'emoji', 'valueType', 'numeric', 'scale', 'options',
+          'desiredDirection', 'idealRange', 'frequency', 'dailyAggregation', 'sortOrder',
+          'archivedAt', 'lockedAt', 'createdAt', 'updatedAt'
+        ])
+        && data.group in ['factor', 'result']
+        && data.name is string && data.name.size() > 0 && data.name.size() <= 60
+        && (data.abbreviation == null
+          || (data.abbreviation is string && data.abbreviation.size() <= 4))
+        && (data.emoji == null || (data.emoji is string && data.emoji.size() <= 32))
+        && data.valueType in ['boolean', 'scale', 'ordinal', 'numeric']
+        && (data.valueType == 'numeric' ? validNumericConfig(data.numeric) : data.numeric == null)
+        && (data.valueType == 'scale' ? validScaleConfig(data.scale) : data.scale == null)
+        && (data.valueType == 'ordinal' ? validOrdinalOptions(data.options) : data.options == null)
+        && validDirectionAndRange(data)
+        && data.frequency in ['single_per_day', 'multiple_per_day']
+        && validAggregation(data)
+        && data.sortOrder is number && data.sortOrder >= 0
+        && validNullableTimestamp(data.archivedAt)
+        && validNullableTimestamp(data.lockedAt)
+        && data.createdAt is timestamp && data.updatedAt is timestamp;
+    }
+
+    function isLocked(data) {
+      return 'lockedAt' in data.keys() && data.lockedAt != null;
+    }
+
+    function validIndicatorUpdate() {
+      return request.resource.data.createdAt == resource.data.createdAt
+        && (!isLocked(resource.data)
+          || request.resource.data.lockedAt == resource.data.lockedAt)
+        && (!(isLocked(resource.data) || isLocked(request.resource.data))
+          || (request.resource.data.group == resource.data.group
+            && request.resource.data.valueType == resource.data.valueType
+            && request.resource.data.numeric == resource.data.numeric
+            && request.resource.data.scale == resource.data.scale
+            && request.resource.data.options == resource.data.options
+            && request.resource.data.frequency == resource.data.frequency
+            && request.resource.data.dailyAggregation == resource.data.dailyAggregation));
+    }
+
     // users/{uid} holds only client fields. Administrative fields (e.g. lastNotificationSentAt) live under
     // internal/** (e.g. internal/userAdmin/users/{uid}), written by the Admin SDK and never readable by clients.
     function hasOnlyUserFields(keys) {
@@ -42,9 +159,20 @@ service cloud.firestore {
       // Account deletion runs in a Cloud Function (Admin SDK) that also cleans subcollections and Auth.
       allow delete: if false;
 
+      match /indicators/{indicatorId} {
+        allow read: if isOwner(uid);
+        allow create: if isOwner(uid) && validIndicator(request.resource.data);
+        allow update: if isOwner(uid)
+          && validIndicator(request.resource.data)
+          && validIndicatorUpdate();
+        // Indicators are archived, never deleted by clients; their entries remain untouched.
+        allow delete: if false;
+      }
+
       // {collection} forces at least one segment: in rules v2 a bare {document=**} would also match users/{uid}.
+      // Collections with their own schema must be excluded here because matching allow expressions are ORed.
       match /{collection}/{document=**} {
-        allow read, write: if isOwner(uid);
+        allow read, write: if isOwner(uid) && collection != 'indicators';
       }
     }
 
diff --git a/app/scripts/seed.ts b/app/scripts/seed.ts
index 630afb5..d39ddaa 100644
--- a/app/scripts/seed.ts
+++ b/app/scripts/seed.ts
@@ -53,6 +53,7 @@ async function main() {
   await db.recursiveDelete(userRef);
 
   const createdAt = Timestamp.fromDate(new Date(`${data.firstDate}T09:00:00-03:00`));
+  const recordedIndicatorIds = new Set(data.entries.map((entry) => entry.indicatorId));
   const writes: [FirebaseFirestore.DocumentReference, FirebaseFirestore.DocumentData][] = [
     [
       userRef,
@@ -74,6 +75,7 @@ async function main() {
         {
           ...indicator,
           archivedAt: archived ? Timestamp.now() : null,
+          lockedAt: recordedIndicatorIds.has(id) ? createdAt : null,
           createdAt,
           updatedAt: FieldValue.serverTimestamp(),
         },
diff --git a/app/src/data/__tests__/indicators.test.ts b/app/src/data/__tests__/indicators.test.ts
new file mode 100644
index 0000000..4e65da9
--- /dev/null
+++ b/app/src/data/__tests__/indicators.test.ts
@@ -0,0 +1,365 @@
+import { act, renderHook, waitFor } from '@testing-library/react';
+import { beforeEach, describe, expect, it, vi } from 'vitest';
+import type { IndicatorInput } from '../../domain/indicator';
+
+// The repository uses a Firestore test double here; the companion rules tests exercise the real emulator.
+const store = vi.hoisted(() => ({
+  documents: new Map<string, Record<string, unknown>>(),
+  writes: [] as { path: string; data: Record<string, unknown> }[],
+  listeners: new Set<() => void>(),
+  nextId: 0,
+  serverTime: { serverTimestamp: true },
+  conflict: null as null | (() => void),
+}));
+
+vi.mock('../../lib/firebase', () => ({ db: {} }));
+vi.mock('firebase/firestore', async (importOriginal) => {
+  const original = await importOriginal<typeof import('firebase/firestore')>();
+  type Ref = { path: string; id: string };
+  const ref = (...parts: unknown[]): Ref => {
+    const path = parts
+      .map((part) =>
+        typeof part === 'object' && part !== null && 'path' in part ? String(part.path) : String(part),
+      )
+      .join('/');
+    return { path, id: path.split('/').at(-1) ?? '' };
+  };
+  const documentSnapshot = (reference: Ref) => ({
+    id: reference.id,
+    ref: reference,
+    exists: () => store.documents.has(reference.path),
+    data: () => store.documents.get(reference.path),
+    metadata: { fromCache: false, hasPendingWrites: false },
+  });
+  const querySnapshot = (reference: Ref) => {
+    const prefix = `${reference.path}/`;
+    const docs = [...store.documents.keys()]
+      .filter((path) => path.startsWith(prefix) && !path.slice(prefix.length).includes('/'))
+      .map((path) => documentSnapshot(ref(path)));
+    return {
+      docs,
+      empty: docs.length === 0,
+      size: docs.length,
+      forEach: (fn: (snapshot: unknown) => void) => docs.forEach(fn),
+      metadata: { fromCache: false, hasPendingWrites: false },
+    };
+  };
+  const notify = () => store.listeners.forEach((listener) => listener());
+  const write = (reference: Ref, data: Record<string, unknown>, merge = true) => {
+    store.writes.push({ path: reference.path, data });
+    store.documents.set(reference.path, { ...(merge ? store.documents.get(reference.path) : {}), ...data });
+    notify();
+  };
+  return {
+    ...original,
+    collection: (_db: unknown, ...parts: unknown[]) => ref(...parts),
+    doc: (first: unknown, ...parts: unknown[]) => {
+      if (parts.length === 0) return ref(first, `generated-${++store.nextId}`);
+      return ref(
+        ...(typeof first === 'object' && first !== null && 'path' in first ? [first, ...parts] : parts),
+      );
+    },
+    query: (reference: Ref) => reference,
+    where: () => ({}),
+    orderBy: () => ({}),
+    serverTimestamp: () => store.serverTime,
+    addDoc: async (reference: Ref, data: Record<string, unknown>) => {
+      const target = ref(reference, `generated-${++store.nextId}`);
+      write(target, data, false);
+      return target;
+    },
+    setDoc: async (reference: Ref, data: Record<string, unknown>, options?: { merge?: boolean }) =>
+      write(reference, data, options?.merge === true),
+    updateDoc: async (reference: Ref, data: Record<string, unknown>) => write(reference, data),
+    getDoc: async (reference: Ref) => documentSnapshot(reference),
+    getDocs: async (reference: Ref) => querySnapshot(reference),
+    runTransaction: async (_db: unknown, callback: (transaction: unknown) => Promise<void>) => {
+      for (;;) {
+        const operations: (() => void)[] = [];
+        const transaction = {
+          get: async (reference: Ref) => documentSnapshot(reference),
+          update: (reference: Ref, data: Record<string, unknown>) => {
+            operations.push(() => write(reference, data));
+          },
+        };
+        await callback(transaction);
+        if (store.conflict) {
+          const conflict = store.conflict;
+          store.conflict = null;
+          conflict();
+          continue;
+        }
+        operations.forEach((operation) => operation());
+        return;
+      }
+    },
+    onSnapshot: (reference: Ref, callback: (snapshot: unknown) => void) => {
+      const emit = () => callback(querySnapshot(reference));
+      store.listeners.add(emit);
+      queueMicrotask(emit);
+      return () => store.listeners.delete(emit);
+    },
+    writeBatch: () => {
+      const operations: (() => void)[] = [];
+      const batch = {
+        update: (reference: Ref, data: Record<string, unknown>) => {
+          operations.push(() => write(reference, data));
+          return batch;
+        },
+        set: (reference: Ref, data: Record<string, unknown>, options?: { merge?: boolean }) => {
+          operations.push(() => write(reference, data, options?.merge === true));
+          return batch;
+        },
+        commit: async () => {
+          operations.forEach((operation) => operation());
+        },
+      };
+      return batch;
+    },
+  };
+});
+
+type StoredIndicator = IndicatorInput & {
+  id: string;
+  sortOrder: number;
+  archivedAt: unknown;
+  lockedAt: unknown;
+};
+type Repository = {
+  createIndicator: (
+    uid: string,
+    input: Omit<IndicatorInput, 'dailyAggregation'> & {
+      dailyAggregation?: IndicatorInput['dailyAggregation'];
+      sortOrder: number;
+    },
+  ) => Promise<string>;
+  updateIndicator: (
+    uid: string,
+    id: string,
+    patch: Partial<IndicatorInput> & { sortOrder?: number; archivedAt?: unknown },
+  ) => Promise<void>;
+  archiveIndicator: (uid: string, id: string) => Promise<void>;
+  restoreIndicator: (uid: string, id: string) => Promise<void>;
+  reorderIndicators: (uid: string, group: IndicatorInput['group'], ids: string[]) => Promise<void>;
+  useIndicators: (uid: string) => { indicators: StoredIndicator[]; activeIndicators: StoredIndicator[] };
+};
+
+// Keep the missing module as a runtime failure until the feature is implemented.
+const repositoryPath = '../indicators';
+const repository = async () => (await import(/* @vite-ignore */ repositoryPath)) as Repository;
+const path = (id: string) => `users/alice/indicators/${id}`;
+const base = {
+  group: 'factor',
+  name: 'Café',
+  abbreviation: 'CAF',
+  emoji: '☕',
+  valueType: 'numeric',
+  numeric: { unit: 'xícaras', min: 0, max: null, step: 0.5 },
+  scale: null,
+  options: null,
+  desiredDirection: null,
+  idealRange: null,
+  frequency: 'multiple_per_day',
+  sortOrder: 1000,
+} as const;
+const saved = (overrides: Record<string, unknown> = {}) => ({
+  ...base,
+  dailyAggregation: 'sum',
+  archivedAt: null,
+  lockedAt: null,
+  createdAt: store.serverTime,
+  updatedAt: store.serverTime,
+  ...overrides,
+});
+
+beforeEach(() => {
+  store.documents.clear();
+  store.writes.length = 0;
+  store.listeners.clear();
+  store.nextId = 0;
+  store.conflict = null;
+});
+
+describe('indicator repository', () => {
+  it.each([
+    ['factor numeric', base, 'sum'],
+    ['result numeric', { ...base, group: 'result' as const, desiredDirection: 'neutral' as const }, 'last'],
+    [
+      'scale',
+      { ...base, valueType: 'scale' as const, numeric: null, scale: { min: 0, max: 10, step: 1 } },
+      'mean',
+    ],
+    ['boolean', { ...base, valueType: 'boolean' as const, numeric: null }, 'any'],
+    [
+      'ordinal',
+      {
+        ...base,
+        valueType: 'ordinal' as const,
+        numeric: null,
+        options: [
+          { id: 'a', label: 'A' },
+          { id: 'b', label: 'B' },
+        ],
+      },
+      'last',
+    ],
+  ])(
+    'creates %s with its suggested aggregation and server timestamps',
+    async (_label, input, aggregation) => {
+      const { createIndicator } = await repository();
+      const id = await createIndicator('alice', input);
+      expect(typeof id).toBe('string');
+      expect(id.length).toBeGreaterThan(0);
+      expect(store.documents.get(path(id))).toEqual({
+        ...input,
+        dailyAggregation: aggregation,
+        archivedAt: null,
+        lockedAt: null,
+        createdAt: store.serverTime,
+        updatedAt: store.serverTime,
+      });
+    },
+  );
+
+  it('preserves an explicitly chosen compatible aggregation', async () => {
+    const { createIndicator } = await repository();
+    const id = await createIndicator('alice', { ...base, dailyAggregation: 'mean' });
+    expect(store.documents.get(path(id))?.dailyAggregation).toBe('mean');
+  });
+
+  it('archives and restores without removing entries and updates the active live list', async () => {
+    store.documents.set(path('coffee'), saved());
+    const entryPath = 'users/alice/entries/entry-1';
+    const entry = { indicatorId: 'coffee', localDate: '2026-01-02', value: { number: 2 } };
+    store.documents.set(entryPath, entry);
+    const { useIndicators, archiveIndicator, restoreIndicator } = await repository();
+    const { result, unmount } = renderHook(() => useIndicators('alice'));
+    await waitFor(() => expect(result.current.activeIndicators.map((item) => item.id)).toContain('coffee'));
+    await act(async () => archiveIndicator('alice', 'coffee'));
+    await waitFor(() =>
+      expect(result.current.activeIndicators.map((item) => item.id)).not.toContain('coffee'),
+    );
+    expect(result.current.indicators.map((item) => item.id)).toContain('coffee');
+    expect(store.documents.get(entryPath)).toEqual(entry);
+    await act(async () => restoreIndicator('alice', 'coffee'));
+    await waitFor(() => expect(result.current.activeIndicators.map((item) => item.id)).toContain('coffee'));
+    expect(store.documents.get(entryPath)).toEqual(entry);
+    unmount();
+  });
+
+  it('does not rewrite timestamps when archive or restore is repeated', async () => {
+    store.documents.set(path('coffee'), saved());
+    const { archiveIndicator, restoreIndicator } = await repository();
+    await archiveIndicator('alice', 'coffee');
+    await archiveIndicator('alice', 'coffee');
+    expect(store.writes).toHaveLength(1);
+    await restoreIndicator('alice', 'coffee');
+    await restoreIndicator('alice', 'coffee');
+    expect(store.writes).toHaveLength(2);
+    expect(store.documents.get(path('coffee'))?.archivedAt).toBeNull();
+  });
+
+  it('persists reordered factors separately from results across a fresh subscription', async () => {
+    store.documents.set(path('factor-a'), saved({ sortOrder: 1000 }));
+    store.documents.set(path('factor-b'), saved({ name: 'Sono', sortOrder: 2000 }));
+    store.documents.set(
+      path('result-a'),
+      saved({ group: 'result', desiredDirection: 'neutral', sortOrder: 1000 }),
+    );
+    store.documents.set(
+      path('result-b'),
+      saved({ group: 'result', desiredDirection: 'neutral', sortOrder: 2000 }),
+    );
+    const { reorderIndicators, useIndicators } = await repository();
+    await reorderIndicators('alice', 'factor', ['factor-b', 'factor-a']);
+    const { result, unmount } = renderHook(() => useIndicators('alice'));
+    await waitFor(() => expect(result.current.indicators).toHaveLength(4));
+    expect(
+      result.current.indicators.filter((item) => item.group === 'factor').map((item) => item.id),
+    ).toEqual(['factor-b', 'factor-a']);
+    expect(
+      result.current.indicators.filter((item) => item.group === 'result').map((item) => item.id),
+    ).toEqual(['result-a', 'result-b']);
+    unmount();
+  });
+
+  it('does not send locked configuration fields when editing a locked indicator', async () => {
+    store.documents.set(path('coffee'), saved({ lockedAt: store.serverTime }));
+    const { updateIndicator } = await repository();
+    await updateIndicator('alice', 'coffee', {
+      name: 'Café novo',
+      abbreviation: 'NOV',
+      emoji: '☕',
+      sortOrder: 3000,
+      group: 'result',
+      valueType: 'boolean',
+      numeric: null,
+      scale: null,
+      options: null,
+      frequency: 'single_per_day',
+      dailyAggregation: null,
+    });
+    const writes = store.writes.filter((write) => write.path === path('coffee'));
+    expect(writes.length).toBeGreaterThan(0);
+    const fieldsSent = Object.assign({}, ...writes.map((write) => write.data)) as Record<string, unknown>;
+    for (const field of [
+      'group',
+      'valueType',
+      'numeric',
+      'scale',
+      'options',
+      'frequency',
+      'dailyAggregation',
+      'lockedAt',
+    ]) {
+      expect(fieldsSent).not.toHaveProperty(field);
+    }
+    expect(store.documents.get(path('coffee'))).toMatchObject({
+      name: 'Café novo',
+      abbreviation: 'NOV',
+      sortOrder: 3000,
+      group: 'factor',
+      valueType: 'numeric',
+      numeric: base.numeric,
+      dailyAggregation: 'sum',
+    });
+  });
+
+  it('retries an edit against a concurrently locked indicator', async () => {
+    store.documents.set(path('coffee'), saved());
+    store.conflict = () => store.documents.set(path('coffee'), saved({ lockedAt: store.serverTime }));
+    const { updateIndicator } = await repository();
+    await updateIndicator('alice', 'coffee', { name: 'Café novo', dailyAggregation: 'mean' });
+    expect(store.documents.get(path('coffee'))).toMatchObject({
+      name: 'Café novo',
+      dailyAggregation: 'sum',
+      lockedAt: store.serverTime,
+    });
+    expect(store.writes).toHaveLength(1);
+    expect(store.writes[0]?.data).not.toHaveProperty('dailyAggregation');
+  });
+
+  it('does not reorder an indicator moved to another group during the transaction', async () => {
+    store.documents.set(path('coffee'), saved());
+    store.conflict = () =>
+      store.documents.set(path('coffee'), saved({ group: 'result', desiredDirection: 'neutral' }));
+    const { reorderIndicators } = await repository();
+    await expect(reorderIndicators('alice', 'factor', ['coffee'])).rejects.toThrow(
+      'Indicators can only be reordered within their own group.',
+    );
+    expect(store.writes).toHaveLength(0);
+  });
+
+  it('clears the previous account immediately when the subscribed user changes', async () => {
+    store.documents.set(path('coffee'), saved());
+    const { useIndicators } = await repository();
+    const { result, rerender, unmount } = renderHook(({ uid }) => useIndicators(uid), {
+      initialProps: { uid: 'alice' },
+    });
+    await waitFor(() => expect(result.current.indicators).toHaveLength(1));
+    rerender({ uid: 'bob' });
+    expect(result.current.indicators).toEqual([]);
+    expect(result.current.activeIndicators).toEqual([]);
+    unmount();
+  });
+});
diff --git a/app/src/data/indicators.ts b/app/src/data/indicators.ts
new file mode 100644
index 0000000..f222fbd
--- /dev/null
+++ b/app/src/data/indicators.ts
@@ -0,0 +1,270 @@
+import { useEffect, useMemo, useState } from 'react';
+import {
+  addDoc,
+  collection,
+  doc,
+  onSnapshot,
+  orderBy,
+  query,
+  runTransaction,
+  serverTimestamp,
+  type Timestamp,
+} from 'firebase/firestore';
+import { db } from '../lib/firebase';
+import {
+  suggestAggregation,
+  validateIndicator,
+  type DailyAggregation,
+  type IndicatorGroup,
+  type IndicatorInput,
+} from '../domain/indicator';
+
+export interface StoredIndicator extends IndicatorInput {
+  id: string;
+  sortOrder: number;
+  archivedAt: Timestamp | null;
+  lockedAt: Timestamp | null;
+  createdAt: Timestamp | null;
+  updatedAt: Timestamp | null;
+}
+
+export type CreateIndicatorInput = Omit<IndicatorInput, 'dailyAggregation'> & {
+  dailyAggregation?: DailyAggregation | null;
+  sortOrder: number;
+};
+
+export type UpdateIndicatorInput = Partial<IndicatorInput> & {
+  sortOrder?: number;
+  archivedAt?: Timestamp | null;
+};
+
+export interface IndicatorsState {
+  indicators: StoredIndicator[];
+  activeIndicators: StoredIndicator[];
+  loading: boolean;
+  error: Error | null;
+}
+
+const inputFields = [
+  'group',
+  'name',
+  'abbreviation',
+  'emoji',
+  'valueType',
+  'numeric',
+  'scale',
+  'options',
+  'desiredDirection',
+  'idealRange',
+  'frequency',
+  'dailyAggregation',
+] as const satisfies readonly (keyof IndicatorInput)[];
+
+const lockedFields = [
+  'group',
+  'valueType',
+  'numeric',
+  'scale',
+  'options',
+  'frequency',
+  'dailyAggregation',
+] as const satisfies readonly (keyof IndicatorInput)[];
+
+const updateFields = [...inputFields, 'sortOrder', 'archivedAt'] as const;
+
+function indicatorsCollection(uid: string) {
+  return collection(db, 'users', uid, 'indicators');
+}
+
+function indicatorRef(uid: string, id: string) {
+  return doc(db, 'users', uid, 'indicators', id);
+}
+
+function assertValidIndicator(input: IndicatorInput): void {
+  const validation = validateIndicator(input);
+  if (!validation.valid) {
+    const fields = [...new Set(validation.errors.map((error) => error.field))].join(', ');
+    throw new Error(`Invalid indicator configuration: ${fields}`);
+  }
+}
+
+function assertValidSortOrder(sortOrder: number): void {
+  if (!Number.isFinite(sortOrder) || sortOrder < 0) {
+    throw new Error('Indicator sort order must be a non-negative finite number.');
+  }
+}
+
+function indicatorInputFrom(data: IndicatorInput): IndicatorInput {
+  return {
+    group: data.group,
+    name: data.name,
+    abbreviation: data.abbreviation,
+    emoji: data.emoji,
+    valueType: data.valueType,
+    numeric: data.numeric,
+    scale: data.scale,
+    options: data.options,
+    desiredDirection: data.desiredDirection,
+    idealRange: data.idealRange,
+    frequency: data.frequency,
+    dailyAggregation: data.dailyAggregation,
+  };
+}
+
+export async function createIndicator(uid: string, input: CreateIndicatorInput): Promise<string> {
+  assertValidSortOrder(input.sortOrder);
+  const dailyAggregation =
+    input.dailyAggregation === undefined
+      ? input.frequency === 'single_per_day'
+        ? null
+        : suggestAggregation({ group: input.group, valueType: input.valueType })
+      : input.dailyAggregation;
+  const indicator = indicatorInputFrom({ ...input, dailyAggregation });
+  assertValidIndicator(indicator);
+
+  const reference = await addDoc(indicatorsCollection(uid), {
+    ...indicator,
+    sortOrder: input.sortOrder,
+    archivedAt: null,
+    lockedAt: null,
+    createdAt: serverTimestamp(),
+    updatedAt: serverTimestamp(),
+  });
+  return reference.id;
+}
+
+export async function updateIndicator(uid: string, id: string, patch: UpdateIndicatorInput): Promise<void> {
+  const reference = indicatorRef(uid, id);
+  await runTransaction(db, async (transaction) => {
+    const snapshot = await transaction.get(reference);
+    if (!snapshot.exists()) throw new Error('Indicator not found.');
+
+    const current = snapshot.data() as IndicatorInput & { lockedAt?: Timestamp | null };
+    const locked = current.lockedAt != null;
+    const changes: Record<string, unknown> = {};
+    for (const field of updateFields) {
+      if (!(field in patch)) continue;
+      if (locked && lockedFields.includes(field as (typeof lockedFields)[number])) continue;
+      const value = patch[field];
+      if (value !== undefined) changes[field] = value;
+    }
+
+    if (typeof changes.sortOrder === 'number') assertValidSortOrder(changes.sortOrder);
+    const modelChanges = Object.fromEntries(
+      inputFields.filter((field) => field in changes).map((field) => [field, changes[field]]),
+    ) as Partial<IndicatorInput>;
+    assertValidIndicator({ ...indicatorInputFrom(current), ...modelChanges });
+
+    if (Object.keys(changes).length > 0) {
+      transaction.update(reference, { ...changes, updatedAt: serverTimestamp() });
+    }
+  });
+}
+
+export async function archiveIndicator(uid: string, id: string): Promise<void> {
+  await setArchived(uid, id, true);
+}
+
+export async function restoreIndicator(uid: string, id: string): Promise<void> {
+  await setArchived(uid, id, false);
+}
+
+async function setArchived(uid: string, id: string, archived: boolean): Promise<void> {
+  const reference = indicatorRef(uid, id);
+  await runTransaction(db, async (transaction) => {
+    const snapshot = await transaction.get(reference);
+    if (!snapshot.exists()) throw new Error('Indicator not found.');
+    if ((snapshot.data().archivedAt != null) === archived) return;
+    transaction.update(reference, {
+      archivedAt: archived ? serverTimestamp() : null,
+      updatedAt: serverTimestamp(),
+    });
+  });
+}
+
+export async function reorderIndicators(uid: string, group: IndicatorGroup, ids: string[]): Promise<void> {
+  if (new Set(ids).size !== ids.length) throw new Error('Indicator IDs must be unique.');
+
+  await runTransaction(db, async (transaction) => {
+    const references = ids.map((id) => indicatorRef(uid, id));
+    const snapshots = await Promise.all(references.map((reference) => transaction.get(reference)));
+    snapshots.forEach((snapshot) => {
+      if (!snapshot.exists()) throw new Error('Indicator not found.');
+      if (snapshot.data().group !== group) {
+        throw new Error('Indicators can only be reordered within their own group.');
+      }
+    });
+    references.forEach((reference, index) => {
+      transaction.update(reference, {
+        sortOrder: (index + 1) * 1000,
+        updatedAt: serverTimestamp(),
+      });
+    });
+  });
+}
+
+export function useIndicators(uid: string): IndicatorsState {
+  const [state, setState] = useState<{
+    uid: string;
+    indicators: StoredIndicator[];
+    loading: boolean;
+    error: Error | null;
+  }>({ uid, indicators: [], loading: Boolean(uid), error: null });
+
+  useEffect(() => {
+    let active = true;
+    if (!uid) {
+      setState({ uid, indicators: [], loading: false, error: null });
+      return;
+    }
+
+    setState({ uid, indicators: [], loading: true, error: null });
+    const liveQuery = query(indicatorsCollection(uid), orderBy('sortOrder', 'asc'));
+    const unsubscribe = onSnapshot(
+      liveQuery,
+      (snapshot) => {
+        if (!active) return;
+        const next = snapshot.docs
+          .map((document) => {
+            const data = document.data();
+            return {
+              ...data,
+              id: document.id,
+              archivedAt: data.archivedAt ?? null,
+              lockedAt: data.lockedAt ?? null,
+            } as StoredIndicator;
+          })
+          .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
+        setState({ uid, indicators: next, loading: false, error: null });
+      },
+      (cause) => {
+        if (!active) return;
+        setState({
+          uid,
+          indicators: [],
+          loading: false,
+          error: cause instanceof Error ? cause : new Error('Unable to load indicators.'),
+        });
+      },
+    );
+    return () => {
+      active = false;
+      unsubscribe();
+    };
+  }, [uid]);
+
+  const indicators = useMemo(
+    () => (state.uid === uid ? state.indicators : []),
+    [state.uid, state.indicators, uid],
+  );
+  const activeIndicators = useMemo(
+    () => indicators.filter((indicator) => indicator.archivedAt == null),
+    [indicators],
+  );
+  return {
+    indicators,
+    activeIndicators,
+    loading: state.uid === uid ? state.loading : Boolean(uid),
+    error: state.uid === uid ? state.error : null,
+  };
+}
diff --git a/app/tests/rules/indicator-lock-transition.test.ts b/app/tests/rules/indicator-lock-transition.test.ts
new file mode 100644
index 0000000..d9a9d46
--- /dev/null
+++ b/app/tests/rules/indicator-lock-transition.test.ts
@@ -0,0 +1,69 @@
+import { readFileSync } from 'node:fs';
+import {
+  assertFails,
+  assertSucceeds,
+  initializeTestEnvironment,
+  type RulesTestEnvironment,
+} from '@firebase/rules-unit-testing';
+import { deleteDoc, doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
+import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
+
+let env: RulesTestEnvironment;
+const time = Timestamp.fromDate(new Date('2026-01-02T12:00:00.000Z'));
+const indicator = {
+  group: 'factor',
+  name: 'Café',
+  abbreviation: 'CAF',
+  emoji: null,
+  valueType: 'numeric',
+  numeric: { unit: 'xícaras', min: 0, max: null, step: 1 },
+  scale: null,
+  options: null,
+  desiredDirection: null,
+  idealRange: null,
+  frequency: 'multiple_per_day',
+  dailyAggregation: 'sum',
+  sortOrder: 1000,
+  archivedAt: null,
+  lockedAt: null,
+  createdAt: time,
+  updatedAt: time,
+};
+
+beforeAll(async () => {
+  env = await initializeTestEnvironment({
+    projectId: 'demo-pulsar-indicator-lock-transition',
+    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
+  });
+});
+beforeEach(() => env.clearFirestore());
+afterAll(() => env.cleanup());
+
+describe('indicator lock transition', () => {
+  it('locks the existing configuration atomically and prevents later changes', async () => {
+    const ref = doc(env.authenticatedContext('alice').firestore(), 'users/alice/indicators/coffee');
+    await assertSucceeds(setDoc(ref, indicator));
+    await assertFails(updateDoc(ref, { lockedAt: time, dailyAggregation: 'mean' }));
+    await assertFails(updateDoc(ref, { lockedAt: time, numeric: { ...indicator.numeric, unit: 'ml' } }));
+    await assertSucceeds(updateDoc(ref, { lockedAt: time, name: 'Café novo' }));
+    await assertFails(updateDoc(ref, { lockedAt: null }));
+    await assertFails(updateDoc(ref, { dailyAggregation: 'mean' }));
+  });
+
+  it('archives without deleting entries and denies client deletion and cross-user changes', async () => {
+    const ref = doc(env.authenticatedContext('alice').firestore(), 'users/alice/indicators/coffee');
+    const entry = doc(env.authenticatedContext('alice').firestore(), 'users/alice/entries/first');
+    await assertSucceeds(setDoc(ref, indicator));
+    await env.withSecurityRulesDisabled((context) =>
+      setDoc(doc(context.firestore(), 'users/alice/entries/first'), { indicatorId: 'coffee' }),
+    );
+    await assertFails(
+      updateDoc(doc(env.authenticatedContext('bob').firestore(), 'users/alice/indicators/coffee'), {
+        archivedAt: time,
+      }),
+    );
+    await assertSucceeds(updateDoc(ref, { archivedAt: time }));
+    await assertFails(deleteDoc(ref));
+    await assertSucceeds(getDoc(entry));
+  });
+});
diff --git a/app/tests/rules/indicators.test.ts b/app/tests/rules/indicators.test.ts
new file mode 100644
index 0000000..5169285
--- /dev/null
+++ b/app/tests/rules/indicators.test.ts
@@ -0,0 +1,256 @@
+import { readFileSync } from 'node:fs';
+import {
+  assertFails,
+  assertSucceeds,
+  initializeTestEnvironment,
+  type RulesTestEnvironment,
+} from '@firebase/rules-unit-testing';
+import { doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
+import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
+
+let env: RulesTestEnvironment;
+const instant = Timestamp.fromDate(new Date('2026-01-02T12:00:00.000Z'));
+const lockedInstant = Timestamp.fromDate(new Date('2026-01-03T12:00:00.000Z'));
+
+const numericFactor = {
+  group: 'factor',
+  name: 'Café',
+  abbreviation: 'CAF',
+  emoji: '☕',
+  valueType: 'numeric',
+  numeric: { unit: 'xícaras', min: 0, max: null, step: 0.5 },
+  scale: null,
+  options: null,
+  desiredDirection: null,
+  idealRange: null,
+  frequency: 'multiple_per_day',
+  dailyAggregation: 'sum',
+  sortOrder: 1000,
+  archivedAt: null,
+  lockedAt: null,
+  createdAt: instant,
+  updatedAt: instant,
+};
+const numericResult = { ...numericFactor, group: 'result', desiredDirection: 'neutral' };
+const scaleResult = {
+  ...numericResult,
+  valueType: 'scale',
+  numeric: null,
+  scale: { min: 0, max: 10, step: 1 },
+  dailyAggregation: 'mean',
+};
+const ordinalFactor = {
+  ...numericFactor,
+  valueType: 'ordinal',
+  numeric: null,
+  options: [
+    { id: 'low', label: 'Baixo' },
+    { id: 'high', label: 'Alto' },
+  ],
+  dailyAggregation: 'last',
+};
+const booleanFactor = { ...numericFactor, valueType: 'boolean', numeric: null, dailyAggregation: 'any' };
+
+beforeAll(async () => {
+  env = await initializeTestEnvironment({
+    projectId: 'demo-pulsar-indicator-rules',
+    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
+  });
+});
+beforeEach(() => env.clearFirestore());
+afterAll(() => env.cleanup());
+
+const ownerRef = (id = 'indicator') =>
+  doc(env.authenticatedContext('alice').firestore(), `users/alice/indicators/${id}`);
+const seed = (data: Record<string, unknown>, id = 'indicator') =>
+  env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), `users/alice/indicators/${id}`), data));
+
+describe('indicator access and schema', () => {
+  it('allows valid indicators of each type and denies access to other users', async () => {
+    for (const [index, data] of [
+      numericFactor,
+      numericResult,
+      scaleResult,
+      ordinalFactor,
+      booleanFactor,
+    ].entries()) {
+      await assertSucceeds(setDoc(ownerRef(`i${index}`), data));
+    }
+    const other = doc(env.authenticatedContext('bob').firestore(), 'users/alice/indicators/i0');
+    const unauthenticated = doc(env.unauthenticatedContext().firestore(), 'users/alice/indicators/i0');
+    await assertFails(getDoc(other));
+    await assertFails(updateDoc(other, { name: 'Outro nome' }));
+    await assertFails(getDoc(unauthenticated));
+    await assertFails(setDoc(unauthenticated, numericFactor));
+  });
+
+  it.each([
+    ['unknown field', { injected: true }],
+    ['empty name', { name: '' }],
+    ['name longer than 60', { name: 'a'.repeat(61) }],
+    ['abbreviation longer than 4', { abbreviation: 'ABCDE' }],
+    ['unit longer than 20', { numeric: { ...numericFactor.numeric, unit: 'x'.repeat(21) } }],
+    ['wrong group', { group: 'other' }],
+    ['wrong value type', { valueType: 'text' }],
+    ['wrong frequency', { frequency: 'weekly' }],
+    ['wrong order type', { sortOrder: '1000' }],
+    ['wrong archive type', { archivedAt: '2026-01-01' }],
+    ['wrong lock type', { lockedAt: true }],
+    ['wrong creation time type', { createdAt: '2026-01-01' }],
+    ['wrong update time type', { updatedAt: 1 }],
+  ])('rejects %s', async (_label, patch) => {
+    await assertFails(setDoc(ownerRef(), { ...numericFactor, ...patch }));
+  });
+
+  it('rejects missing required fields', async () => {
+    const withoutName: Record<string, unknown> = { ...numericFactor };
+    delete withoutName.name;
+    await assertFails(setDoc(ownerRef(), withoutName));
+  });
+});
+
+describe('aggregation, direction and range', () => {
+  it.each([
+    ['numeric sum', numericFactor, 'sum'],
+    ['numeric mean', numericFactor, 'mean'],
+    ['numeric last', numericFactor, 'last'],
+    ['scale sum', scaleResult, 'sum'],
+    ['scale mean', scaleResult, 'mean'],
+    ['scale last', scaleResult, 'last'],
+    ['boolean any', booleanFactor, 'any'],
+    ['boolean last', booleanFactor, 'last'],
+    ['ordinal last', ordinalFactor, 'last'],
+  ])('allows %s', async (_label, base, aggregation) => {
+    await assertSucceeds(setDoc(ownerRef(), { ...base, dailyAggregation: aggregation }));
+  });
+
+  it.each([
+    ['numeric any', numericFactor, 'any'],
+    ['scale any', scaleResult, 'any'],
+    ['boolean sum', booleanFactor, 'sum'],
+    ['boolean mean', booleanFactor, 'mean'],
+    ['ordinal any', ordinalFactor, 'any'],
+    ['ordinal mean', ordinalFactor, 'mean'],
+    ['ordinal sum', ordinalFactor, 'sum'],
+    ['missing multiple-day aggregation', numericFactor, null],
+  ])('rejects %s', async (_label, base, aggregation) => {
+    await assertFails(setDoc(ownerRef(), { ...base, dailyAggregation: aggregation }));
+  });
+
+  it('allows only null aggregation for single-per-day indicators', async () => {
+    await assertSucceeds(
+      setDoc(ownerRef(), { ...numericFactor, frequency: 'single_per_day', dailyAggregation: null }),
+    );
+    await assertFails(
+      setDoc(ownerRef(), { ...numericFactor, frequency: 'single_per_day', dailyAggregation: 'last' }),
+    );
+  });
+
+  it('rejects direction for factors and a reversed ideal range', async () => {
+    await assertFails(setDoc(ownerRef(), { ...numericFactor, desiredDirection: 'higher' }));
+    await assertFails(setDoc(ownerRef(), { ...numericFactor, desiredDirection: 'neutral' }));
+    await assertFails(
+      setDoc(ownerRef(), {
+        ...numericResult,
+        desiredDirection: 'target_range',
+        idealRange: { min: 8, max: 7 },
+      }),
+    );
+    await assertSucceeds(
+      setDoc(ownerRef(), {
+        ...numericResult,
+        desiredDirection: 'target_range',
+        idealRange: { min: 7, max: 7 },
+      }),
+    );
+  });
+
+  it('requires a range only for target_range on numeric or scale results', async () => {
+    await assertFails(
+      setDoc(ownerRef(), { ...numericResult, desiredDirection: 'target_range', idealRange: null }),
+    );
+    await assertFails(setDoc(ownerRef(), { ...numericResult, idealRange: { min: 1, max: 2 } }));
+    await assertFails(
+      setDoc(ownerRef(), {
+        ...booleanFactor,
+        group: 'result',
+        desiredDirection: 'target_range',
+        idealRange: { min: 0, max: 1 },
+      }),
+    );
+    await assertSucceeds(
+      setDoc(ownerRef(), {
+        ...scaleResult,
+        desiredDirection: 'target_range',
+        idealRange: { min: 2, max: 8 },
+      }),
+    );
+  });
+});
+
+describe('locked indicators', () => {
+  const changes = [
+    ['group', numericFactor, { group: 'result', desiredDirection: 'neutral' }],
+    ['value type', numericFactor, { valueType: 'boolean', numeric: null, dailyAggregation: 'any' }],
+    ['unit', numericFactor, { numeric: { ...numericFactor.numeric, unit: 'ml' } }],
+    ['scale', scaleResult, { scale: { min: 0, max: 5, step: 1 } }],
+    [
+      'options',
+      ordinalFactor,
+      {
+        options: [
+          { id: 'low', label: 'Baixo' },
+          { id: 'mid', label: 'Médio' },
+        ],
+      },
+    ],
+    ['frequency', numericFactor, { frequency: 'single_per_day', dailyAggregation: null }],
+    ['aggregation', numericFactor, { dailyAggregation: 'mean' }],
+  ] as const;
+
+  it.each(changes)(
+    'allows changing %s before locking and rejects it after locking',
+    async (_label, base, patch) => {
+      await seed(base, 'unlocked');
+      await seed({ ...base, lockedAt: lockedInstant }, 'locked');
+      await assertSucceeds(updateDoc(ownerRef('unlocked'), patch));
+      await assertFails(updateDoc(ownerRef('locked'), patch));
+    },
+  );
+
+  it('accepts editing name, abbreviation, emoji, order, archive status, direction and range', async () => {
+    await seed({ ...numericResult, lockedAt: lockedInstant });
+    await assertSucceeds(
+      updateDoc(ownerRef(), {
+        name: 'Peso atual',
+        abbreviation: 'PES',
+        emoji: '⚖️',
+        sortOrder: 2500,
+        archivedAt: instant,
+        desiredDirection: 'target_range',
+        idealRange: { min: 60, max: 80 },
+        updatedAt: instant,
+      }),
+    );
+    const data = (await assertSucceeds(getDoc(ownerRef()))).data();
+    expect(data).toMatchObject({
+      name: 'Peso atual',
+      abbreviation: 'PES',
+      emoji: '⚖️',
+      sortOrder: 2500,
+      archivedAt: instant,
+      desiredDirection: 'target_range',
+      idealRange: { min: 60, max: 80 },
+      lockedAt: lockedInstant,
+    });
+    await assertSucceeds(
+      updateDoc(ownerRef(), { archivedAt: null, desiredDirection: 'lower', idealRange: null }),
+    );
+  });
+
+  it('does not allow removing the lock or replacing a locked document with an unlocked one', async () => {
+    await seed({ ...numericFactor, lockedAt: lockedInstant });
+    await assertFails(updateDoc(ownerRef(), { lockedAt: null }));
+    await assertFails(setDoc(ownerRef(), numericFactor));
+  });
+});
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
