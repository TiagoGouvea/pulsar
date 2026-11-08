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
  "id": "F-2.06",
  "title": "Repositório e regras de registros",
  "description": "src/data/entries.ts: saveEntry só para o localDate de hoje; registros são imutáveis (nunca usa update/set sobre documento existente): único por dia substitui o de hoje com um batch atômico 'cria novo documento (ID gerado) + exclui o registro de hoje do indicador' (DECISOES.md#Registros imutáveis); múltiplo gera ID único por evento; recordedAt serverTimestamp (UTC); note opcional; no primeiro registro grava lockedAt no indicador na mesma transação/batch; deleteEntry de qualquer dia. Estados pendente/erro sem sucesso antecipado.\n\nfirestore.rules para users/{uid}/entries: create com valor compatível com o tipo do indicador (get), indicador do mesmo UID e travado (getAfter lockedAt), note string <= 500, campos exatos; update sempre negado (registros imutáveis: nenhum valor de nenhum dia pode ser reescrito por escrita direta); delete pelo dono em qualquer data. A substituição do único de hoje é create + delete em batch (F-2.06). Sem validação de data no servidor.",
  "acceptance": [
    "Não existe API para criar registro em data passada",
    "Único por dia: segundo save no mesmo dia deixa exatamente um registro de hoje (o novo), via create + delete no mesmo batch; nenhuma chamada de update",
    "Remover a resposta de hoje de indicador único exclui o registro (ausência)",
    "Múltiplo: cada save cria documento independente",
    "Exclusão funciona para qualquer dia; não há edição de valores de dias passados",
    "Promise só resolve após persistência confirmada",
    "update em qualquer registro (passado ou de hoje, inclusive só mudando value ou note) é rejeitado",
    "Batch create (novo ID) + delete do registro de hoje é aceito para o dono",
    "Valor incompatível com o tipo é rejeitado; opção inexistente é rejeitada",
    "Registro para indicador inexistente ou de outro UID é rejeitado",
    "Nenhuma regra compara localDate com a data do servidor",
    "Exclusão permitida ao dono para qualquer data"
  ],
  "specRefs": [
    "spec.md#5.2",
    "spec.md#5.4",
    "arquitetura.md#3.3",
    "spec.md#9",
    "arquitetura.md#9.2",
    "DECISOES.md#Registros imutáveis"
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
index 6aa3168..d782a35 100644
--- a/app/firestore.rules
+++ b/app/firestore.rules
@@ -149,6 +149,52 @@ service cloud.firestore {
           || (data.saveAccountInviteDismissedDayCount is int && data.saveAccountInviteDismissedDayCount >= 0));
     }
 
+    function hasOrdinalOption(options, optionId) {
+      return options is list && (
+        (options.size() > 0 && options[0].id == optionId)
+        || (options.size() > 1 && options[1].id == optionId)
+        || (options.size() > 2 && options[2].id == optionId)
+        || (options.size() > 3 && options[3].id == optionId)
+        || (options.size() > 4 && options[4].id == optionId)
+        || (options.size() > 5 && options[5].id == optionId)
+        || (options.size() > 6 && options[6].id == optionId)
+      );
+    }
+
+    function validEntryValue(data, indicator) {
+      let value = data.value;
+      return value is map && data.valueType == indicator.valueType
+        && ((data.valueType == 'boolean'
+            && value.keys().hasOnly(['boolean']) && value.keys().hasAll(['boolean'])
+            && value.boolean is bool)
+          || (data.valueType == 'numeric'
+            && value.keys().hasOnly(['number']) && value.keys().hasAll(['number'])
+            && value.number is number
+            && (indicator.numeric.min == null || value.number >= indicator.numeric.min)
+            && (indicator.numeric.max == null || value.number <= indicator.numeric.max))
+          || (data.valueType == 'scale'
+            && value.keys().hasOnly(['number']) && value.keys().hasAll(['number'])
+            && value.number is number
+            && value.number >= indicator.scale.min && value.number <= indicator.scale.max)
+          || (data.valueType == 'ordinal'
+            && value.keys().hasOnly(['optionId']) && value.keys().hasAll(['optionId'])
+            && value.optionId is string && hasOrdinalOption(indicator.options, value.optionId)));
+    }
+
+    function validEntry(uid, data) {
+      let keys = data.keys();
+      return keys.hasOnly(['indicatorId', 'localDate', 'recordedAt', 'valueType', 'value', 'note'])
+        && keys.hasAll(['indicatorId', 'localDate', 'recordedAt', 'valueType', 'value'])
+        && data.indicatorId is string && data.indicatorId.size() > 0
+        && !data.indicatorId.matches('.*[/].*')
+        && data.localDate is string && data.localDate.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
+        && data.recordedAt is timestamp
+        && (!('note' in keys) || (data.note is string && data.note.size() <= 500))
+        && exists(/databases/$(database)/documents/users/$(uid)/indicators/$(data.indicatorId))
+        && getAfter(/databases/$(database)/documents/users/$(uid)/indicators/$(data.indicatorId)).data.lockedAt is timestamp
+        && validEntryValue(data, get(/databases/$(database)/documents/users/$(uid)/indicators/$(data.indicatorId)).data);
+    }
+
     match /users/{uid} {
       // Fail closed: a document carrying a non-client field (misplaced admin data) is not readable by the owner.
       allow read: if isOwner(uid) && (resource == null || hasOnlyUserFields(resource.data.keys()));
@@ -169,10 +215,16 @@ service cloud.firestore {
         allow delete: if false;
       }
 
+      match /entries/{entryId} {
+        allow read, delete: if isOwner(uid);
+        allow create: if isOwner(uid) && validEntry(uid, request.resource.data);
+        allow update: if false;
+      }
+
       // {collection} forces at least one segment: in rules v2 a bare {document=**} would also match users/{uid}.
       // Collections with their own schema must be excluded here because matching allow expressions are ORed.
       match /{collection}/{document=**} {
-        allow read, write: if isOwner(uid) && collection != 'indicators';
+        allow read, write: if isOwner(uid) && collection != 'indicators' && collection != 'entries';
       }
     }
 
diff --git a/app/src/data/__tests__/entries.test.ts b/app/src/data/__tests__/entries.test.ts
new file mode 100644
index 0000000..764ee13
--- /dev/null
+++ b/app/src/data/__tests__/entries.test.ts
@@ -0,0 +1,282 @@
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
+import type { EntryValue } from '../../domain/entry';
+
+type Operation = {
+  kind: 'create' | 'set' | 'update' | 'delete';
+  path: string;
+  data?: Record<string, unknown>;
+};
+type Ref = { path: string; id: string };
+type Filter = { field: string; value: unknown };
+type Query = { path: string; filters: Filter[] };
+
+const store = vi.hoisted(() => ({
+  documents: new Map<string, Record<string, unknown>>(),
+  commits: [] as Operation[][],
+  nextId: 0,
+  timestamp: { serverTimestamp: true },
+  gate: null as null | Promise<void>,
+  failure: null as null | Error,
+}));
+
+vi.mock('../../lib/firebase', () => ({ db: {} }));
+vi.mock('firebase/firestore', async (importOriginal) => {
+  const original = await importOriginal<typeof import('firebase/firestore')>();
+  const ref = (path: string): Ref => ({ path, id: path.split('/').at(-1) ?? '' });
+  const snapshot = (reference: Ref) => ({
+    id: reference.id,
+    ref: reference,
+    exists: () => store.documents.has(reference.path),
+    data: () => store.documents.get(reference.path),
+    metadata: { fromCache: false, hasPendingWrites: false },
+  });
+  const querySnapshot = (reference: Query) => {
+    const prefix = `${reference.path}/`;
+    const docs = [...store.documents.entries()]
+      .filter(
+        ([path, data]) =>
+          path.startsWith(prefix) &&
+          !path.slice(prefix.length).includes('/') &&
+          reference.filters.every(({ field, value }) => data[field] === value),
+      )
+      .map(([path]) => snapshot(ref(path)));
+    return {
+      docs,
+      size: docs.length,
+      empty: docs.length === 0,
+      forEach: (fn: (doc: unknown) => void) => docs.forEach(fn),
+    };
+  };
+  const commit = async (operations: Operation[]) => {
+    if (store.gate) await store.gate;
+    if (store.failure) throw store.failure;
+    for (const operation of operations) {
+      if (operation.kind === 'delete') store.documents.delete(operation.path);
+      else {
+        const previous = store.documents.get(operation.path);
+        if (operation.kind === 'create' && previous) throw new Error('Document already exists');
+        store.documents.set(operation.path, {
+          ...(operation.kind === 'update' ? previous : {}),
+          ...operation.data,
+        });
+      }
+    }
+    store.commits.push(operations);
+  };
+  const writer = (operations: Operation[]) => {
+    const result = {
+      set: (reference: Ref, data: Record<string, unknown>, options?: { merge?: boolean }) => {
+        operations.push({ kind: options?.merge ? 'update' : 'set', path: reference.path, data });
+        return result;
+      },
+      create: (reference: Ref, data: Record<string, unknown>) => {
+        operations.push({ kind: 'create', path: reference.path, data });
+        return result;
+      },
+      update: (reference: Ref, data: Record<string, unknown>) => {
+        operations.push({ kind: 'update', path: reference.path, data });
+        return result;
+      },
+      delete: (reference: Ref) => {
+        operations.push({ kind: 'delete', path: reference.path });
+        return result;
+      },
+    };
+    return result;
+  };
+  return {
+    ...original,
+    collection: (_db: unknown, ...parts: string[]) => ({ path: parts.join('/'), filters: [] }),
+    doc: (first: unknown, ...parts: string[]) => {
+      if (typeof first === 'object' && first !== null && 'path' in first) {
+        return ref(`${String(first.path)}/${parts.length ? parts.join('/') : `generated-${++store.nextId}`}`);
+      }
+      return ref(parts.join('/'));
+    },
+    where: (field: string, _operator: string, value: unknown) => ({ field, value }),
+    query: (reference: Query, ...filters: Filter[]) => ({ ...reference, filters }),
+    getDoc: async (reference: Ref) => snapshot(reference),
+    getDocs: async (reference: Query) => querySnapshot(reference),
+    serverTimestamp: () => store.timestamp,
+    setDoc: async (reference: Ref, data: Record<string, unknown>, options?: { merge?: boolean }) =>
+      commit([{ kind: options?.merge ? 'update' : 'set', path: reference.path, data }]),
+    updateDoc: async (reference: Ref, data: Record<string, unknown>) =>
+      commit([{ kind: 'update', path: reference.path, data }]),
+    deleteDoc: async (reference: Ref) => commit([{ kind: 'delete', path: reference.path }]),
+    addDoc: async (reference: Query, data: Record<string, unknown>) => {
+      const target = ref(`${reference.path}/generated-${++store.nextId}`);
+      await commit([{ kind: 'create', path: target.path, data }]);
+      return target;
+    },
+    writeBatch: () => {
+      const operations: Operation[] = [];
+      return { ...writer(operations), commit: () => commit(operations) };
+    },
+    runTransaction: async (_db: unknown, callback: (transaction: unknown) => Promise<unknown>) => {
+      const operations: Operation[] = [];
+      const result = await callback({
+        ...writer(operations),
+        get: async (reference: Ref) => snapshot(reference),
+      });
+      await commit(operations);
+      return result;
+    },
+  };
+});
+
+type Repository = {
+  saveEntry: (
+    uid: string,
+    input: { indicatorId: string; value: EntryValue; note?: string },
+  ) => Promise<unknown>;
+  deleteEntry: (uid: string, entryId: string) => Promise<void>;
+};
+const repositoryPath = '../entries';
+const repository = async () => (await import(/* @vite-ignore */ repositoryPath)) as Repository;
+const indicatorPath = 'users/alice/indicators/coffee';
+const entryPath = (id: string) => `users/alice/entries/${id}`;
+const indicator = (frequency: 'single_per_day' | 'multiple_per_day') => ({
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
+  frequency,
+  dailyAggregation: frequency === 'single_per_day' ? null : 'sum',
+  sortOrder: 1000,
+  archivedAt: null,
+  lockedAt: null,
+  createdAt: store.timestamp,
+  updatedAt: store.timestamp,
+});
+const entry = (date: string, number: number) => ({
+  indicatorId: 'coffee',
+  localDate: date,
+  valueType: 'numeric',
+  value: { number },
+  recordedAt: store.timestamp,
+});
+const entries = () =>
+  [...store.documents.entries()].filter(([path]) => path.startsWith('users/alice/entries/'));
+const input = (number: number) => ({ indicatorId: 'coffee', value: { number } });
+
+beforeEach(() => {
+  vi.useFakeTimers({ toFake: ['Date'] });
+  vi.setSystemTime(new Date(2026, 9, 24, 12));
+  store.documents.clear();
+  store.commits.length = 0;
+  store.nextId = 0;
+  store.gate = null;
+  store.failure = null;
+});
+afterEach(() => vi.useRealTimers());
+
+describe('entry repository', () => {
+  it('uses the local current day even when a caller attempts to supply a past date', async () => {
+    store.documents.set(indicatorPath, indicator('multiple_per_day'));
+    const { saveEntry } = await repository();
+    await saveEntry('alice', { ...input(0), localDate: '2020-01-01' } as never).catch(() => undefined);
+    expect(entries().every(([, data]) => data.localDate === '2026-10-24')).toBe(true);
+    for (const [path] of entries()) store.documents.delete(path);
+    await saveEntry('alice', input(0));
+    expect(entries()).toHaveLength(1);
+    expect(entries()[0]?.[1]).toMatchObject({ ...entry('2026-10-24', 0) });
+  });
+
+  it('locks the indicator atomically with its first entry and uses server timestamps', async () => {
+    store.documents.set(indicatorPath, indicator('single_per_day'));
+    const { saveEntry } = await repository();
+    await saveEntry('alice', { ...input(2), note: 'Depois do almoço' });
+    expect(entries()).toHaveLength(1);
+    expect(entries()[0]?.[1]).toMatchObject({ ...entry('2026-10-24', 2), note: 'Depois do almoço' });
+    expect(store.documents.get(indicatorPath)?.lockedAt).toEqual(store.timestamp);
+    expect(store.commits).toHaveLength(1);
+    expect(store.commits[0]?.map((operation) => operation.path)).toEqual(
+      expect.arrayContaining([indicatorPath, entries()[0]?.[0]]),
+    );
+  });
+
+  it('replaces only today by creating a new document and deleting the old one in one commit', async () => {
+    store.documents.set(indicatorPath, indicator('single_per_day'));
+    store.documents.set(entryPath('past'), entry('2026-10-23', 4));
+    const { saveEntry } = await repository();
+    await saveEntry('alice', input(1));
+    const oldToday = entries().find(([, data]) => data.localDate === '2026-10-24')?.[0];
+    expect(oldToday).toBeDefined();
+    store.commits.length = 0;
+    await saveEntry('alice', input(3));
+    const today = entries().filter(([, data]) => data.localDate === '2026-10-24');
+    expect(today).toHaveLength(1);
+    expect(today[0]?.[0]).not.toBe(oldToday);
+    expect(today[0]?.[1]).toMatchObject(entry('2026-10-24', 3));
+    expect(store.documents.get(entryPath('past'))).toEqual(entry('2026-10-23', 4));
+    expect(store.commits).toHaveLength(1);
+    const operations = store.commits[0] ?? [];
+    expect(operations).toEqual(
+      expect.arrayContaining([
+        expect.objectContaining({ kind: 'delete', path: oldToday }),
+        expect.objectContaining({ path: today[0]?.[0], kind: expect.stringMatching(/^(create|set)$/) }),
+      ]),
+    );
+    expect(
+      operations.filter(
+        (operation) => operation.path.startsWith('users/alice/entries/') && operation.kind === 'update',
+      ),
+    ).toEqual([]);
+  });
+
+  it('creates independent events for multiple entries on the same day', async () => {
+    store.documents.set(indicatorPath, indicator('multiple_per_day'));
+    const { saveEntry } = await repository();
+    await saveEntry('alice', input(0));
+    await saveEntry('alice', input(2));
+    expect(entries()).toHaveLength(2);
+    expect(entries().map(([, data]) => data.value)).toEqual(
+      expect.arrayContaining([{ number: 0 }, { number: 2 }]),
+    );
+    expect(new Set(entries().map(([path]) => path)).size).toBe(2);
+  });
+
+  it('deletes a single response today and can delete an earlier entry', async () => {
+    store.documents.set(indicatorPath, indicator('single_per_day'));
+    store.documents.set(entryPath('past'), entry('2026-10-23', 4));
+    const { saveEntry, deleteEntry } = await repository();
+    await saveEntry('alice', input(1));
+    const todayPath = entries().find(([, data]) => data.localDate === '2026-10-24')?.[0];
+    expect(todayPath).toBeDefined();
+    await deleteEntry('alice', todayPath?.split('/').at(-1) ?? '');
+    expect(entries().filter(([, data]) => data.localDate === '2026-10-24')).toHaveLength(0);
+    await deleteEntry('alice', 'past');
+    expect(entries()).toHaveLength(0);
+  });
+
+  it('does not report success before persistence and propagates write failures', async () => {
+    store.documents.set(indicatorPath, indicator('single_per_day'));
+    const { saveEntry } = await repository();
+    let release = () => {};
+    store.gate = new Promise<void>((resolve) => {
+      release = resolve;
+    });
+    let settled = false;
+    const pending = saveEntry('alice', input(1)).then(() => {
+      settled = true;
+    });
+    await vi.waitFor(() => expect(store.nextId).toBeGreaterThan(0));
+    expect(settled).toBe(false);
+    expect(entries()).toHaveLength(0);
+    release();
+    await pending;
+    expect(settled).toBe(true);
+    expect(entries()).toHaveLength(1);
+    store.gate = null;
+    store.failure = new Error('Connection failed');
+    await expect(saveEntry('alice', input(2))).rejects.toThrow('Connection failed');
+    expect(entries()).toHaveLength(1);
+    expect(entries()[0]?.[1]).toMatchObject(entry('2026-10-24', 1));
+  });
+});
diff --git a/app/src/data/entries.ts b/app/src/data/entries.ts
new file mode 100644
index 0000000..5cadedb
--- /dev/null
+++ b/app/src/data/entries.ts
@@ -0,0 +1,62 @@
+import {
+  collection,
+  deleteDoc,
+  doc,
+  getDoc,
+  getDocs,
+  query,
+  serverTimestamp,
+  where,
+  writeBatch,
+} from 'firebase/firestore';
+import { validateEntryValue, type EntryValue } from '../domain/entry';
+import type { IndicatorInput } from '../domain/indicator';
+import { db } from '../lib/firebase';
+import { localDate } from '../lib/time';
+
+export interface SaveEntryInput {
+  indicatorId: string;
+  value: EntryValue;
+  note?: string;
+}
+
+export async function saveEntry(uid: string, input: SaveEntryInput): Promise<string> {
+  const day = localDate();
+  const indicatorRef = doc(db, 'users', uid, 'indicators', input.indicatorId);
+  const indicatorSnapshot = await getDoc(indicatorRef);
+  if (!indicatorSnapshot.exists()) throw new Error('Indicator not found.');
+
+  const indicator = indicatorSnapshot.data() as IndicatorInput & { lockedAt: unknown };
+  if (!validateEntryValue(indicator, input.value).valid) throw new Error('Invalid entry value.');
+  if (input.note !== undefined && (typeof input.note !== 'string' || input.note.length > 500)) {
+    throw new Error('Invalid entry note.');
+  }
+
+  const entries = collection(db, 'users', uid, 'entries');
+  const previous =
+    indicator.frequency === 'single_per_day'
+      ? await getDocs(
+          query(entries, where('indicatorId', '==', input.indicatorId), where('localDate', '==', day)),
+        )
+      : null;
+  if (localDate() !== day) throw new Error('The local day changed before the entry could be saved.');
+
+  const entryRef = doc(entries);
+  const batch = writeBatch(db);
+  if (indicator.lockedAt == null) batch.update(indicatorRef, { lockedAt: serverTimestamp() });
+  batch.set(entryRef, {
+    indicatorId: input.indicatorId,
+    localDate: day,
+    recordedAt: serverTimestamp(),
+    valueType: indicator.valueType,
+    value: input.value,
+    ...(input.note === undefined ? {} : { note: input.note }),
+  });
+  previous?.docs.forEach((entry) => batch.delete(entry.ref));
+  await batch.commit();
+  return entryRef.id;
+}
+
+export async function deleteEntry(uid: string, entryId: string): Promise<void> {
+  await deleteDoc(doc(db, 'users', uid, 'entries', entryId));
+}
diff --git a/app/tests/rules/entries.test.ts b/app/tests/rules/entries.test.ts
new file mode 100644
index 0000000..b2fe1c8
--- /dev/null
+++ b/app/tests/rules/entries.test.ts
@@ -0,0 +1,230 @@
+import { readFileSync } from 'node:fs';
+import {
+  assertFails,
+  assertSucceeds,
+  initializeTestEnvironment,
+  type RulesTestEnvironment,
+} from '@firebase/rules-unit-testing';
+import {
+  deleteDoc,
+  doc,
+  getDoc,
+  serverTimestamp,
+  setDoc,
+  Timestamp,
+  updateDoc,
+  writeBatch,
+} from 'firebase/firestore';
+import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
+
+let env: RulesTestEnvironment;
+const instant = Timestamp.fromDate(new Date('2026-10-24T12:00:00.000Z'));
+const indicator = {
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
+  frequency: 'single_per_day',
+  dailyAggregation: null,
+  sortOrder: 1000,
+  archivedAt: null,
+  lockedAt: instant,
+  createdAt: instant,
+  updatedAt: instant,
+};
+const booleanIndicator = { ...indicator, valueType: 'boolean', numeric: null };
+const scaleIndicator = {
+  ...indicator,
+  valueType: 'scale',
+  numeric: null,
+  scale: { min: 0, max: 10, step: 1 },
+};
+const ordinalIndicator = {
+  ...indicator,
+  valueType: 'ordinal',
+  numeric: null,
+  options: [
+    { id: 'low', label: 'Baixo' },
+    { id: 'high', label: 'Alto' },
+  ],
+};
+const entry = {
+  indicatorId: 'indicator',
+  localDate: '2026-10-24',
+  recordedAt: instant,
+  valueType: 'numeric',
+  value: { number: 1 },
+};
+
+beforeAll(async () => {
+  env = await initializeTestEnvironment({
+    projectId: 'demo-pulsar-entry-rules',
+    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
+  });
+});
+beforeEach(() => env.clearFirestore());
+afterAll(() => env.cleanup());
+
+const seedIndicator = (data: Record<string, unknown> = indicator, uid = 'alice', id = 'indicator') =>
+  env.withSecurityRulesDisabled((context) =>
+    setDoc(doc(context.firestore(), `users/${uid}/indicators/${id}`), data),
+  );
+const seedEntry = (data: Record<string, unknown> = entry, uid = 'alice', id = 'entry') =>
+  env.withSecurityRulesDisabled((context) =>
+    setDoc(doc(context.firestore(), `users/${uid}/entries/${id}`), data),
+  );
+
+describe('entry security rules', () => {
+  it.each([
+    ['numeric zero', indicator, { valueType: 'numeric', value: { number: 0 } }],
+    ['boolean false', booleanIndicator, { valueType: 'boolean', value: { boolean: false } }],
+    ['scale', scaleIndicator, { valueType: 'scale', value: { number: 7 } }],
+    ['ordinal first option', ordinalIndicator, { valueType: 'ordinal', value: { optionId: 'low' } }],
+    ['ordinal second option', ordinalIndicator, { valueType: 'ordinal', value: { optionId: 'high' } }],
+  ])('accepts %s for the owner and permits an optional note', async (_label, configured, value) => {
+    await seedIndicator(configured);
+    const db = env.authenticatedContext('alice').firestore();
+    await assertSucceeds(setDoc(doc(db, 'users/alice/entries/without-note'), { ...entry, ...value }));
+    await assertSucceeds(
+      setDoc(doc(db, 'users/alice/entries/with-note'), { ...entry, ...value, note: 'x'.repeat(500) }),
+    );
+  });
+
+  it.each([
+    ['wrong value type', indicator, { valueType: 'boolean', value: { boolean: true } }],
+    ['boolean represented as a number', booleanIndicator, { valueType: 'boolean', value: { number: 1 } }],
+    [
+      'boolean value has the wrong primitive',
+      booleanIndicator,
+      { valueType: 'boolean', value: { boolean: 'true' } },
+    ],
+    ['numeric represented as text', indicator, { valueType: 'numeric', value: { number: '1' } }],
+    ['scale represented as an option', scaleIndicator, { valueType: 'scale', value: { optionId: 'high' } }],
+    ['unknown ordinal option', ordinalIndicator, { valueType: 'ordinal', value: { optionId: 'missing' } }],
+    ['empty value', indicator, { value: {} }],
+    ['multiple value fields', indicator, { value: { number: 1, boolean: true } }],
+  ])('rejects %s', async (_label, configured, patch) => {
+    await seedIndicator(configured);
+    const db = env.authenticatedContext('alice').firestore();
+    await assertFails(setDoc(doc(db, 'users/alice/entries/entry'), { ...entry, ...patch }));
+  });
+
+  it.each([
+    ['extra field', { extra: true }],
+    ['note longer than 500 characters', { note: 'x'.repeat(501) }],
+    ['non-string note', { note: 123 }],
+    ['invalid timestamp', { recordedAt: '2026-10-24T12:00:00Z' }],
+  ])('rejects %s', async (_label, patch) => {
+    await seedIndicator();
+    const db = env.authenticatedContext('alice').firestore();
+    await assertFails(setDoc(doc(db, 'users/alice/entries/entry'), { ...entry, ...patch }));
+  });
+
+  it.each(['indicatorId', 'localDate', 'recordedAt', 'valueType', 'value'])(
+    'rejects a missing %s',
+    async (field) => {
+      await seedIndicator();
+      const data: Record<string, unknown> = { ...entry };
+      delete data[field];
+      const db = env.authenticatedContext('alice').firestore();
+      await assertFails(setDoc(doc(db, 'users/alice/entries/entry'), data));
+    },
+  );
+
+  it('rejects a missing indicator and an indicator owned only by another user', async () => {
+    await seedIndicator(indicator, 'bob');
+    const db = env.authenticatedContext('alice').firestore();
+    await assertFails(setDoc(doc(db, 'users/alice/entries/missing'), entry));
+    await assertFails(
+      setDoc(doc(db, 'users/alice/entries/other'), { ...entry, indicatorId: 'bob/indicator' }),
+    );
+  });
+
+  it('requires the indicator to be locked and accepts locking it in the same batch as the first entry', async () => {
+    await seedIndicator({ ...indicator, lockedAt: null });
+    const db = env.authenticatedContext('alice').firestore();
+    const indicatorRef = doc(db, 'users/alice/indicators/indicator');
+    const entryRef = doc(db, 'users/alice/entries/first');
+    await assertFails(setDoc(entryRef, entry));
+    const batch = writeBatch(db);
+    batch.update(indicatorRef, { lockedAt: serverTimestamp() });
+    batch.set(entryRef, { ...entry, recordedAt: serverTimestamp() });
+    await assertSucceeds(batch.commit());
+    expect((await getDoc(indicatorRef)).data()?.lockedAt).toBeInstanceOf(Timestamp);
+    expect((await getDoc(entryRef)).data()?.recordedAt).toBeInstanceOf(Timestamp);
+  });
+
+  it('does not leave the lock or entry behind when the first entry in the batch is invalid', async () => {
+    await seedIndicator({ ...indicator, lockedAt: null });
+    const db = env.authenticatedContext('alice').firestore();
+    const indicatorRef = doc(db, 'users/alice/indicators/indicator');
+    const entryRef = doc(db, 'users/alice/entries/first');
+    const batch = writeBatch(db);
+    batch.update(indicatorRef, { lockedAt: serverTimestamp() });
+    batch.set(entryRef, { ...entry, value: { boolean: true } });
+    await assertFails(batch.commit());
+    expect((await getDoc(indicatorRef)).data()?.lockedAt).toBeNull();
+    expect((await getDoc(entryRef)).exists()).toBe(false);
+  });
+
+  it.each(['2026-10-23', '2026-10-24'])(
+    'rejects update and overwrite for %s, even for one field',
+    async (date) => {
+      await seedIndicator();
+      await seedEntry({ ...entry, localDate: date, note: 'Original' });
+      const db = env.authenticatedContext('alice').firestore();
+      const ref = doc(db, 'users/alice/entries/entry');
+      await assertFails(updateDoc(ref, { value: { number: 2 } }));
+      await assertFails(updateDoc(ref, { note: 'Alterada' }));
+      await assertFails(setDoc(ref, { ...entry, localDate: date, value: { number: 2 } }));
+      expect((await getDoc(ref)).data()).toMatchObject({ value: { number: 1 }, note: 'Original' });
+    },
+  );
+
+  it('accepts atomic replacement with a new ID and deletion of the previous entry', async () => {
+    await seedIndicator();
+    await seedEntry();
+    const db = env.authenticatedContext('alice').firestore();
+    const previous = doc(db, 'users/alice/entries/entry');
+    const replacement = doc(db, 'users/alice/entries/new-id');
+    const batch = writeBatch(db);
+    batch.set(replacement, { ...entry, recordedAt: serverTimestamp(), value: { number: 2 } });
+    batch.delete(previous);
+    await assertSucceeds(batch.commit());
+    expect((await getDoc(previous)).exists()).toBe(false);
+    expect((await getDoc(replacement)).data()).toMatchObject({ value: { number: 2 } });
+  });
+
+  it.each(['1900-01-01', '2099-12-31'])(
+    'allows creation and deletion on %s without server-date comparison',
+    async (date) => {
+      await seedIndicator();
+      const db = env.authenticatedContext('alice').firestore();
+      const ref = doc(db, 'users/alice/entries/entry');
+      await assertSucceeds(setDoc(ref, { ...entry, localDate: date }));
+      await assertSucceeds(deleteDoc(ref));
+      expect((await getDoc(ref)).exists()).toBe(false);
+    },
+  );
+
+  it('isolates reads, writes, updates and deletes from another user and unauthenticated clients', async () => {
+    await seedIndicator();
+    await seedEntry();
+    for (const db of [
+      env.authenticatedContext('bob').firestore(),
+      env.unauthenticatedContext().firestore(),
+    ]) {
+      const ref = doc(db, 'users/alice/entries/entry');
+      await assertFails(getDoc(ref));
+      await assertFails(setDoc(doc(db, 'users/alice/entries/other'), entry));
+      await assertFails(updateDoc(ref, { value: { number: 2 } }));
+      await assertFails(deleteDoc(ref));
+    }
+  });
+});
diff --git a/app/tests/rules/entry-validation-extra.test.ts b/app/tests/rules/entry-validation-extra.test.ts
new file mode 100644
index 0000000..4885d98
--- /dev/null
+++ b/app/tests/rules/entry-validation-extra.test.ts
@@ -0,0 +1,87 @@
+import { readFileSync } from 'node:fs';
+import {
+  assertFails,
+  assertSucceeds,
+  initializeTestEnvironment,
+  type RulesTestEnvironment,
+} from '@firebase/rules-unit-testing';
+import { doc, setDoc, Timestamp } from 'firebase/firestore';
+import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
+
+let env: RulesTestEnvironment;
+const timestamp = Timestamp.fromDate(new Date('2026-10-24T12:00:00Z'));
+const indicator = {
+  group: 'factor',
+  name: 'Example',
+  abbreviation: null,
+  emoji: null,
+  valueType: 'numeric',
+  numeric: { unit: '', min: 1, max: 5, step: 1 },
+  scale: null,
+  options: null,
+  desiredDirection: null,
+  idealRange: null,
+  frequency: 'single_per_day',
+  dailyAggregation: null,
+  sortOrder: 1,
+  archivedAt: null,
+  lockedAt: timestamp,
+  createdAt: timestamp,
+  updatedAt: timestamp,
+};
+const entry = {
+  indicatorId: 'example',
+  localDate: '2026-10-24',
+  recordedAt: timestamp,
+  valueType: 'numeric',
+  value: { number: 1 },
+};
+
+beforeAll(async () => {
+  env = await initializeTestEnvironment({
+    projectId: 'demo-pulsar-entry-validation-extra',
+    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
+  });
+});
+beforeEach(() => env.clearFirestore());
+afterAll(() => env.cleanup());
+
+async function seedIndicator(data: Record<string, unknown>) {
+  await env.withSecurityRulesDisabled((context) =>
+    setDoc(doc(context.firestore(), 'users/alice/indicators/example'), data),
+  );
+}
+
+describe('additional entry validation', () => {
+  it('enforces numeric bounds and the date-key shape', async () => {
+    await seedIndicator(indicator);
+    const db = env.authenticatedContext('alice').firestore();
+    await assertSucceeds(setDoc(doc(db, 'users/alice/entries/min'), entry));
+    await assertSucceeds(setDoc(doc(db, 'users/alice/entries/max'), { ...entry, value: { number: 5 } }));
+    await assertFails(setDoc(doc(db, 'users/alice/entries/below'), { ...entry, value: { number: 0 } }));
+    await assertFails(setDoc(doc(db, 'users/alice/entries/above'), { ...entry, value: { number: 6 } }));
+    await assertFails(setDoc(doc(db, 'users/alice/entries/date'), { ...entry, localDate: 'today' }));
+  });
+
+  it('accepts all seven ordinal options and rejects an option outside the list', async () => {
+    const options = Array.from({ length: 7 }, (_, index) => ({ id: `option-${index}`, label: `${index}` }));
+    await seedIndicator({ ...indicator, valueType: 'ordinal', numeric: null, options });
+    const db = env.authenticatedContext('alice').firestore();
+    for (const option of options) {
+      await assertSucceeds(
+        setDoc(doc(db, `users/alice/entries/${option.id}`), {
+          ...entry,
+          valueType: 'ordinal',
+          value: { optionId: option.id },
+        }),
+      );
+    }
+    await assertFails(
+      setDoc(doc(db, 'users/alice/entries/unknown'), {
+        ...entry,
+        valueType: 'ordinal',
+        value: { optionId: 'unknown' },
+      }),
+    );
+  });
+});
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
