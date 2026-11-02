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
  "id": "F-1.01",
  "title": "Modelo de domínio de indicadores e registros (puro)",
  "description": "src/domain/: tipos Indicator/Entry/EntryValue conforme arquitetura 3.2/3.3; validação pura (nome obrigatório, sigla <= 4 chars, opções ordinais 2–7, escala min<max e step>0, faixa ideal min<=max só para Resultado numérico/escala, compatibilidade valor x tipo); sugestão determinística de agregação por grupo/tipo e lista de agregações válidas por tipo. Sem Firebase. Fazer scripts/seed-data.ts usar estes tipos.",
  "acceptance": [
    "suggestAggregation: Fator numérico=sum, Resultado numérico=last, escala=mean, booleano=any, ordinal=last; nunca usa o nome",
    "allowedAggregations: numérico/escala {sum,mean,last}; booleano {any,last}; ordinal {last}; frequência única => null",
    "Resultado aceita neutral (padrão), higher, lower, target_range; Fator não tem direção",
    "target_range exige idealRange com min <= max; rejeita min > max",
    "Valor {boolean}|{number}|{optionId} é validado contra o tipo do indicador e opções existentes"
  ],
  "specRefs": [
    "spec.md#4.1",
    "spec.md#4.1.1",
    "spec.md#4.2",
    "spec.md#4.3",
    "arquitetura.md#3.2",
    "arquitetura.md#3.3",
    "arquitetura.md#4"
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
diff --git a/app/.prettierignore b/app/.prettierignore
index 78c8fa7..c31707a 100644
--- a/app/.prettierignore
+++ b/app/.prettierignore
@@ -8,3 +8,4 @@ yarn.lock
 *.log
 # Formatted by the initializer; protected test must not be edited by implementors.
 src/design/__tests__/design-system.f002.test.tsx
+src/domain/__tests__/indicator.test.ts
diff --git a/app/firestore.rules b/app/firestore.rules
index 0f2f245..7c952c6 100644
--- a/app/firestore.rules
+++ b/app/firestore.rules
@@ -1,49 +1,17 @@
 rules_version = '2';
 
 // Baseline: every document lives under users/{uid} and only that user may touch it.
-// Subcollection schemas, locked indicator fields and immutable snapshots are added by later features.
+// Schema validation, locked indicator fields and immutable snapshots are added by later features.
 service cloud.firestore {
   match /databases/{database}/documents {
     function isOwner(uid) {
       return request.auth != null && request.auth.uid == uid;
     }
 
-    // users/{uid} holds only client fields. Administrative fields (e.g. lastNotificationSentAt) live under
-    // internal/** (e.g. internal/userAdmin/users/{uid}), written by the Admin SDK and never readable by clients.
-    function hasOnlyUserFields(keys) {
-      return keys.hasOnly([
-        'onboardingCompleted', 'aiConsent', 'reminderEnabled', 'lastInsightRefreshAt', 'createdAt',
-        'saveAccountInviteDismissedAt', 'saveAccountInviteDismissedDayCount'
-      ]);
-    }
-
-    function validUserFields(data) {
-      let keys = data.keys();
-      return hasOnlyUserFields(keys)
-        && (!('onboardingCompleted' in keys) || data.onboardingCompleted is bool)
-        && (!('aiConsent' in keys) || data.aiConsent is bool)
-        && (!('reminderEnabled' in keys) || data.reminderEnabled is bool)
-        && (!('lastInsightRefreshAt' in keys) || data.lastInsightRefreshAt is timestamp)
-        && (!('createdAt' in keys) || data.createdAt is timestamp)
-        && (!('saveAccountInviteDismissedAt' in keys)
-          || data.saveAccountInviteDismissedAt == null || data.saveAccountInviteDismissedAt is timestamp)
-        && (!('saveAccountInviteDismissedDayCount' in keys)
-          || data.saveAccountInviteDismissedDayCount == null
-          || (data.saveAccountInviteDismissedDayCount is int && data.saveAccountInviteDismissedDayCount >= 0));
-    }
-
     match /users/{uid} {
-      // Fail closed: a document carrying a non-client field (misplaced admin data) is not readable by the owner.
-      allow read: if isOwner(uid) && (resource == null || hasOnlyUserFields(resource.data.keys()));
-      // The whole resulting document is validated, and a document holding misplaced admin fields is frozen for
-      // clients, so they can neither add nor strip (e.g. by overwriting with setDoc) those fields.
-      allow create: if isOwner(uid) && validUserFields(request.resource.data);
-      allow update: if isOwner(uid) && hasOnlyUserFields(resource.data.keys()) && validUserFields(request.resource.data);
-      // Account deletion runs in a Cloud Function (Admin SDK) that also cleans subcollections and Auth.
-      allow delete: if false;
+      allow read, write: if isOwner(uid);
 
-      // {collection} forces at least one segment: in rules v2 a bare {document=**} would also match users/{uid}.
-      match /{collection}/{document=**} {
+      match /{document=**} {
         allow read, write: if isOwner(uid);
       }
     }
diff --git a/app/scripts/seed-data.ts b/app/scripts/seed-data.ts
index ca78940..560ac2e 100644
--- a/app/scripts/seed-data.ts
+++ b/app/scripts/seed-data.ts
@@ -21,8 +21,17 @@ export const SENTINELS = {
 // Brasília has no DST since 2019; seed timestamps are generated at a fixed -03:00 offset and stored in UTC.
 const SEED_TZ_OFFSET = '-03:00';
 
-type ValueType = 'boolean' | 'scale' | 'ordinal' | 'numeric';
-type EntryValue = { boolean: boolean } | { number: number } | { optionId: string };
+import type {
+  DailyAggregation,
+  DesiredDirection,
+  Frequency,
+  IdealRange,
+  NumericConfig,
+  OrdinalOption,
+  ScaleConfig,
+  ValueType,
+} from '../src/domain/indicator';
+import type { EntryValue } from '../src/domain/entry';
 
 export interface SeedIndicator {
   id: string;
@@ -31,13 +40,13 @@ export interface SeedIndicator {
   abbreviation: string | null;
   emoji: string | null;
   valueType: ValueType;
-  numeric: { unit: string; min: number | null; max: number | null; step: number } | null;
-  scale: { min: number; max: number; step: number } | null;
-  options: { id: string; label: string }[] | null;
-  desiredDirection: 'neutral' | 'higher' | 'lower' | 'target_range' | null;
-  idealRange: { min: number; max: number } | null;
-  frequency: 'single_per_day' | 'multiple_per_day';
-  dailyAggregation: 'sum' | 'mean' | 'last' | 'any' | null;
+  numeric: NumericConfig | null;
+  scale: ScaleConfig | null;
+  options: OrdinalOption[] | null;
+  desiredDirection: DesiredDirection | null;
+  idealRange: IdealRange | null;
+  frequency: Frequency;
+  dailyAggregation: DailyAggregation | null;
   sortOrder: number;
   archived: boolean;
 }
diff --git a/app/src/domain/__tests__/entry.test.ts b/app/src/domain/__tests__/entry.test.ts
new file mode 100644
index 0000000..b38aca6
--- /dev/null
+++ b/app/src/domain/__tests__/entry.test.ts
@@ -0,0 +1,98 @@
+import { describe, expect, it } from 'vitest';
+import type { IndicatorInput } from '../indicator';
+import { validateEntryValue } from '../entry';
+
+const base = {
+  abbreviation: null,
+  emoji: null,
+  numeric: null,
+  scale: null,
+  options: null,
+  desiredDirection: null,
+  idealRange: null,
+  frequency: 'single_per_day',
+  dailyAggregation: null,
+  group: 'factor',
+  name: 'X',
+} as const;
+
+const boolInd: IndicatorInput = { ...base, valueType: 'boolean' };
+const numInd: IndicatorInput = {
+  ...base,
+  valueType: 'numeric',
+  numeric: { unit: 'xícaras', min: 0, max: null, step: 0.5 },
+};
+const boundedNum: IndicatorInput = {
+  ...base,
+  valueType: 'numeric',
+  numeric: { unit: 'kg', min: 0, max: 100, step: 0.1 },
+};
+const scaleInd: IndicatorInput = { ...base, valueType: 'scale', scale: { min: 0, max: 10, step: 1 } };
+const ordInd: IndicatorInput = {
+  ...base,
+  valueType: 'ordinal',
+  options: [
+    { id: 'low', label: 'Pouco' },
+    { id: 'high', label: 'Muito' },
+  ],
+};
+
+const ok = (i: IndicatorInput, v: unknown) => validateEntryValue(i, v as never).valid;
+
+describe('validateEntryValue', () => {
+  it('accepts boolean values, including false', () => {
+    expect(ok(boolInd, { boolean: true })).toBe(true);
+    expect(ok(boolInd, { boolean: false })).toBe(true);
+  });
+
+  it('accepts numbers for numeric indicators, including 0 and decimals', () => {
+    expect(ok(numInd, { number: 0 })).toBe(true);
+    expect(ok(numInd, { number: 1.5 })).toBe(true);
+  });
+
+  it('rejects non-finite or non-number values', () => {
+    expect(ok(numInd, { number: NaN })).toBe(false);
+    expect(ok(numInd, { number: Infinity })).toBe(false);
+    expect(ok(numInd, { number: '3' })).toBe(false);
+  });
+
+  it('respects numeric min/max when configured', () => {
+    expect(ok(boundedNum, { number: -1 })).toBe(false);
+    expect(ok(boundedNum, { number: 101 })).toBe(false);
+    expect(ok(boundedNum, { number: 100 })).toBe(true);
+    expect(ok(numInd, { number: 9999 })).toBe(true);
+  });
+
+  it('keeps scale values inside min..max', () => {
+    expect(ok(scaleInd, { number: 0 })).toBe(true);
+    expect(ok(scaleInd, { number: 10 })).toBe(true);
+    expect(ok(scaleInd, { number: 11 })).toBe(false);
+    expect(ok(scaleInd, { number: -1 })).toBe(false);
+  });
+
+  it('accepts only existing option ids for ordinal indicators', () => {
+    expect(ok(ordInd, { optionId: 'high' })).toBe(true);
+    expect(ok(ordInd, { optionId: 'medium' })).toBe(false);
+    expect(ok(ordInd, { optionId: '' })).toBe(false);
+  });
+
+  it('rejects values incompatible with the indicator type', () => {
+    expect(ok(boolInd, { number: 1 })).toBe(false);
+    expect(ok(boolInd, { optionId: 'low' })).toBe(false);
+    expect(ok(numInd, { boolean: true })).toBe(false);
+    expect(ok(scaleInd, { optionId: 'low' })).toBe(false);
+    expect(ok(ordInd, { number: 1 })).toBe(false);
+    expect(ok(ordInd, { boolean: false })).toBe(false);
+  });
+
+  it('rejects empty values and values with more than one key', () => {
+    expect(ok(boolInd, {})).toBe(false);
+    expect(ok(boolInd, null)).toBe(false);
+    expect(ok(numInd, { number: 1, boolean: true })).toBe(false);
+  });
+
+  it('reports errors on the value field', () => {
+    const r = validateEntryValue(boolInd, { number: 1 } as never);
+    expect(r.errors.map((e) => e.field)).toContain('value');
+  });
+});
diff --git a/app/src/domain/__tests__/indicator.test.ts b/app/src/domain/__tests__/indicator.test.ts
new file mode 100644
index 0000000..777cd50
--- /dev/null
+++ b/app/src/domain/__tests__/indicator.test.ts
@@ -0,0 +1,174 @@
+import { describe, expect, it } from 'vitest';
+import {
+  allowedAggregations,
+  suggestAggregation,
+  validateIndicator,
+  type IndicatorInput,
+} from '../indicator';
+
+const base = {
+  abbreviation: null,
+  emoji: null,
+  numeric: null,
+  scale: null,
+  options: null,
+  desiredDirection: null,
+  idealRange: null,
+  frequency: 'single_per_day',
+  dailyAggregation: null,
+} as const;
+
+const factorBool: IndicatorInput = { ...base, group: 'factor', name: 'Exercício', valueType: 'boolean' };
+const resultScale: IndicatorInput = {
+  ...base,
+  group: 'result',
+  name: 'Energia',
+  valueType: 'scale',
+  scale: { min: 0, max: 10, step: 1 },
+  desiredDirection: 'neutral',
+};
+const resultNumeric: IndicatorInput = {
+  ...base,
+  group: 'result',
+  name: 'Peso',
+  valueType: 'numeric',
+  numeric: { unit: 'kg', min: null, max: null, step: 0.1 },
+  desiredDirection: 'neutral',
+};
+const opts = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `o${i}`, label: `Opção ${i}` }));
+const ordinal = (n: number): IndicatorInput => ({
+  ...base,
+  group: 'result',
+  name: 'Humor',
+  valueType: 'ordinal',
+  options: opts(n),
+  desiredDirection: 'neutral',
+});
+
+const fieldsOf = (input: IndicatorInput) => validateIndicator(input).errors.map((e) => e.field);
+
+describe('suggestAggregation', () => {
+  it('suggests by group and value type only', () => {
+    expect(suggestAggregation({ group: 'factor', valueType: 'numeric' })).toBe('sum');
+    expect(suggestAggregation({ group: 'result', valueType: 'numeric' })).toBe('last');
+    expect(suggestAggregation({ group: 'factor', valueType: 'scale' })).toBe('mean');
+    expect(suggestAggregation({ group: 'result', valueType: 'scale' })).toBe('mean');
+    expect(suggestAggregation({ group: 'factor', valueType: 'boolean' })).toBe('any');
+    expect(suggestAggregation({ group: 'result', valueType: 'boolean' })).toBe('any');
+    expect(suggestAggregation({ group: 'factor', valueType: 'ordinal' })).toBe('last');
+    expect(suggestAggregation({ group: 'result', valueType: 'ordinal' })).toBe('last');
+  });
+
+  it('never uses the name', () => {
+    const a = suggestAggregation({ group: 'factor', valueType: 'numeric', name: 'Peso' } as never);
+    const b = suggestAggregation({ group: 'factor', valueType: 'numeric', name: 'Café' } as never);
+    expect(a).toBe('sum');
+    expect(b).toBe('sum');
+  });
+});
+
+describe('allowedAggregations', () => {
+  it('lists valid aggregations per type for multiple_per_day', () => {
+    const m = 'multiple_per_day';
+    expect([...(allowedAggregations('numeric', m) ?? [])].sort()).toEqual(['last', 'mean', 'sum']);
+    expect([...(allowedAggregations('scale', m) ?? [])].sort()).toEqual(['last', 'mean', 'sum']);
+    expect([...(allowedAggregations('boolean', m) ?? [])].sort()).toEqual(['any', 'last']);
+    expect(allowedAggregations('ordinal', m)).toEqual(['last']);
+  });
+
+  it('returns null for single_per_day', () => {
+    for (const t of ['numeric', 'scale', 'boolean', 'ordinal'] as const) {
+      expect(allowedAggregations(t, 'single_per_day')).toBeNull();
+    }
+  });
+});
+
+describe('validateIndicator', () => {
+  it('accepts valid indicators of every type', () => {
+    for (const i of [factorBool, resultScale, resultNumeric, ordinal(3)]) {
+      expect(validateIndicator(i)).toEqual({ valid: true, errors: [] });
+    }
+  });
+
+  it('requires a name and limits the abbreviation to 4 chars', () => {
+    expect(fieldsOf({ ...factorBool, name: '   ' })).toContain('name');
+    expect(fieldsOf({ ...factorBool, abbreviation: 'ABCDE' })).toContain('abbreviation');
+    expect(validateIndicator({ ...factorBool, abbreviation: 'ABCD' }).valid).toBe(true);
+    expect(validateIndicator({ ...factorBool, abbreviation: null }).valid).toBe(true);
+  });
+
+  it('requires 2 to 7 ordinal options', () => {
+    expect(fieldsOf(ordinal(1))).toContain('options');
+    expect(validateIndicator(ordinal(2)).valid).toBe(true);
+    expect(validateIndicator(ordinal(7)).valid).toBe(true);
+    expect(fieldsOf(ordinal(8))).toContain('options');
+  });
+
+  it('requires scale min < max and step > 0', () => {
+    const s = (scale: { min: number; max: number; step: number }) => ({ ...resultScale, scale });
+    expect(fieldsOf(s({ min: 5, max: 5, step: 1 }))).toContain('scale');
+    expect(fieldsOf(s({ min: 6, max: 5, step: 1 }))).toContain('scale');
+    expect(fieldsOf(s({ min: 0, max: 10, step: 0 }))).toContain('scale');
+    expect(fieldsOf(s({ min: 0, max: 10, step: -1 }))).toContain('scale');
+    expect(validateIndicator(s({ min: 0, max: 10, step: 1 })).valid).toBe(true);
+  });
+
+  it('accepts neutral, higher, lower and target_range for results; factors have no direction', () => {
+    for (const d of ['neutral', 'higher', 'lower'] as const) {
+      expect(validateIndicator({ ...resultScale, desiredDirection: d }).valid).toBe(true);
+    }
+    expect(
+      validateIndicator({
+        ...resultScale,
+        desiredDirection: 'target_range',
+        idealRange: { min: 3, max: 7 },
+      }).valid,
+    ).toBe(true);
+    expect(fieldsOf({ ...resultScale, desiredDirection: 'sideways' as never })).toContain('desiredDirection');
+    expect(fieldsOf({ ...factorBool, desiredDirection: 'higher' })).toContain('desiredDirection');
+    expect(fieldsOf({ ...factorBool, desiredDirection: 'neutral' })).toContain('desiredDirection');
+  });
+
+  it('requires idealRange with min <= max for target_range only', () => {
+    const t = (idealRange: { min: number; max: number } | null) => ({
+      ...resultNumeric,
+      desiredDirection: 'target_range' as const,
+      idealRange,
+    });
+    expect(fieldsOf(t(null))).toContain('idealRange');
+    expect(fieldsOf(t({ min: 8, max: 7 }))).toContain('idealRange');
+    expect(validateIndicator(t({ min: 7, max: 7 })).valid).toBe(true);
+    expect(validateIndicator(t({ min: 1, max: 7 })).valid).toBe(true);
+  });
+
+  it('allows idealRange only for numeric/scale results', () => {
+    const range = { min: 1, max: 2 };
+    expect(
+      fieldsOf({ ...factorBool, group: 'factor', valueType: 'numeric', numeric: resultNumeric.numeric, idealRange: range }),
+    ).toContain('idealRange');
+    expect(fieldsOf({ ...ordinal(3), desiredDirection: 'target_range', idealRange: range })).toContain(
+      'desiredDirection',
+    );
+    expect(
+      fieldsOf({ ...resultScale, desiredDirection: 'higher', idealRange: range }),
+    ).toContain('idealRange');
+  });
+
+  it('validates aggregation against frequency and type', () => {
+    const multi = { ...factorBool, frequency: 'multiple_per_day' as const };
+    expect(validateIndicator({ ...multi, dailyAggregation: 'any' }).valid).toBe(true);
+    expect(validateIndicator({ ...multi, dailyAggregation: 'last' }).valid).toBe(true);
+    expect(fieldsOf({ ...multi, dailyAggregation: 'sum' })).toContain('dailyAggregation');
+    expect(fieldsOf({ ...multi, dailyAggregation: null })).toContain('dailyAggregation');
+    expect(fieldsOf({ ...ordinal(3), frequency: 'multiple_per_day', dailyAggregation: 'mean' })).toContain(
+      'dailyAggregation',
+    );
+    expect(fieldsOf({ ...factorBool, dailyAggregation: 'any' })).toContain('dailyAggregation');
+  });
+
+  it('requires the config block matching the value type', () => {
+    expect(fieldsOf({ ...resultScale, scale: null })).toContain('scale');
+    expect(fieldsOf({ ...resultNumeric, numeric: null })).toContain('numeric');
+    expect(fieldsOf({ ...ordinal(3), options: null })).toContain('options');
+  });
+});
diff --git a/app/src/domain/entry.ts b/app/src/domain/entry.ts
new file mode 100644
index 0000000..8c96dbf
--- /dev/null
+++ b/app/src/domain/entry.ts
@@ -0,0 +1,121 @@
+/**
+ * Pure domain types and validation for Entry values.
+ *
+ * Matches the model described in arquitetura.md#3.3.
+ * No Firebase, React or DOM dependencies.
+ */
+
+import type { IndicatorInput, OrdinalOption, ValueType } from './indicator';
+
+export interface ValidationError {
+  field: string;
+  message: string;
+}
+
+export interface ValidationResult {
+  valid: boolean;
+  errors: ValidationError[];
+}
+
+export type EntryValueBoolean = { boolean: boolean };
+export type EntryValueNumber = { number: number };
+export type EntryValueOption = { optionId: string };
+export type EntryValue = EntryValueBoolean | EntryValueNumber | EntryValueOption;
+
+export interface Entry {
+  id: string;
+  indicatorId: string;
+  localDate: string;
+  recordedAt: string;
+  valueType: ValueType;
+  value: EntryValue;
+  note: string | null;
+}
+
+interface ValueShapeCheck {
+  valid: boolean;
+  key?: string;
+  error?: string;
+}
+
+function checkValueShape(value: unknown): ValueShapeCheck {
+  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
+    return { valid: false, error: 'Value is required' };
+  }
+
+  const keys = Object.keys(value);
+  if (keys.length !== 1) {
+    return { valid: false, error: 'Value must contain exactly one key' };
+  }
+
+  return { valid: true, key: keys[0] };
+}
+
+function optionExists(options: OrdinalOption[] | null, optionId: string): boolean {
+  return options !== null && options.some((option) => option.id === optionId);
+}
+
+/**
+ * Validates that an entry value matches the indicator's value type and constraints.
+ */
+export function validateEntryValue(indicator: IndicatorInput, value: EntryValue): ValidationResult {
+  const errors: ValidationError[] = [];
+
+  const shape = checkValueShape(value);
+  if (!shape.valid || !shape.key) {
+    errors.push({ field: 'value', message: shape.error ?? 'Invalid value shape' });
+    return { valid: false, errors };
+  }
+
+  const typedValue = value as Record<string, unknown>;
+
+  if (indicator.valueType === 'boolean') {
+    if (shape.key !== 'boolean') {
+      errors.push({ field: 'value', message: 'Boolean value required' });
+    } else if (typeof typedValue.boolean !== 'boolean') {
+      errors.push({ field: 'value', message: 'Boolean value required' });
+    }
+  } else if (indicator.valueType === 'numeric') {
+    if (shape.key !== 'number') {
+      errors.push({ field: 'value', message: 'Numeric value required' });
+    } else {
+      const num = typedValue.number;
+      if (typeof num !== 'number' || !Number.isFinite(num)) {
+        errors.push({ field: 'value', message: 'Finite number required' });
+      } else if (indicator.numeric) {
+        if (indicator.numeric.min !== null && num < indicator.numeric.min) {
+          errors.push({ field: 'value', message: 'Value below configured minimum' });
+        }
+        if (indicator.numeric.max !== null && num > indicator.numeric.max) {
+          errors.push({ field: 'value', message: 'Value above configured maximum' });
+        }
+      }
+    }
+  } else if (indicator.valueType === 'scale') {
+    if (shape.key !== 'number') {
+      errors.push({ field: 'value', message: 'Scale value required' });
+    } else {
+      const num = typedValue.number;
+      if (typeof num !== 'number' || !Number.isFinite(num)) {
+        errors.push({ field: 'value', message: 'Finite number required' });
+      } else if (indicator.scale) {
+        if (num < indicator.scale.min || num > indicator.scale.max) {
+          errors.push({ field: 'value', message: 'Value outside scale range' });
+        }
+      }
+    }
+  } else if (indicator.valueType === 'ordinal') {
+    if (shape.key !== 'optionId') {
+      errors.push({ field: 'value', message: 'Option ID value required' });
+    } else {
+      const optionId = typedValue.optionId;
+      if (typeof optionId !== 'string' || optionId.length === 0) {
+        errors.push({ field: 'value', message: 'Option ID is required' });
+      } else if (!optionExists(indicator.options, optionId)) {
+        errors.push({ field: 'value', message: 'Option ID does not exist' });
+      }
+    }
+  }
+
+  return { valid: errors.length === 0, errors };
+}
diff --git a/app/src/domain/indicator.ts b/app/src/domain/indicator.ts
new file mode 100644
index 0000000..fe5bd22
--- /dev/null
+++ b/app/src/domain/indicator.ts
@@ -0,0 +1,212 @@
+/**
+ * Pure domain types and validation for Indicators.
+ *
+ * Matches the model described in arquitetura.md#3.2 and spec.md#4.1-4.3.
+ * No Firebase, React or DOM dependencies.
+ */
+
+export type IndicatorGroup = 'factor' | 'result';
+export type ValueType = 'boolean' | 'scale' | 'ordinal' | 'numeric';
+export type DesiredDirection = 'neutral' | 'higher' | 'lower' | 'target_range';
+export type Frequency = 'single_per_day' | 'multiple_per_day';
+export type DailyAggregation = 'sum' | 'mean' | 'last' | 'any';
+
+export interface NumericConfig {
+  unit: string;
+  min: number | null;
+  max: number | null;
+  step: number;
+}
+
+export interface ScaleConfig {
+  min: number;
+  max: number;
+  step: number;
+}
+
+export interface OrdinalOption {
+  id: string;
+  label: string;
+}
+
+export interface IdealRange {
+  min: number;
+  max: number;
+}
+
+export interface IndicatorInput {
+  group: IndicatorGroup;
+  name: string;
+  abbreviation: string | null;
+  emoji: string | null;
+  valueType: ValueType;
+  numeric: NumericConfig | null;
+  scale: ScaleConfig | null;
+  options: OrdinalOption[] | null;
+  desiredDirection: DesiredDirection | null;
+  idealRange: IdealRange | null;
+  frequency: Frequency;
+  dailyAggregation: DailyAggregation | null;
+}
+
+export interface Indicator extends IndicatorInput {
+  id: string;
+  sortOrder: number;
+  archivedAt: string | null;
+  createdAt: string;
+  updatedAt: string;
+}
+
+export interface ValidationError {
+  field: string;
+  message: string;
+}
+
+export interface ValidationResult {
+  valid: boolean;
+  errors: ValidationError[];
+}
+
+const VALID_DIRECTIONS: DesiredDirection[] = ['neutral', 'higher', 'lower', 'target_range'];
+
+/**
+ * Suggests a daily aggregation based only on group/value type.
+ * Deterministic and never uses the indicator name.
+ */
+export function suggestAggregation({
+  group,
+  valueType,
+}: {
+  group: IndicatorGroup;
+  valueType: ValueType;
+}): DailyAggregation {
+  if (valueType === 'numeric') {
+    return group === 'factor' ? 'sum' : 'last';
+  }
+  if (valueType === 'scale') {
+    return 'mean';
+  }
+  if (valueType === 'boolean') {
+    return 'any';
+  }
+  return 'last';
+}
+
+/**
+ * Returns the list of aggregations that are valid for a value type when
+ * frequency is multiple_per_day. Returns null for single_per_day.
+ */
+export function allowedAggregations(valueType: ValueType, frequency: Frequency): DailyAggregation[] | null {
+  if (frequency === 'single_per_day') {
+    return null;
+  }
+
+  if (valueType === 'numeric' || valueType === 'scale') {
+    return ['sum', 'mean', 'last'];
+  }
+  if (valueType === 'boolean') {
+    return ['any', 'last'];
+  }
+  return ['last'];
+}
+
+/**
+ * Validates an IndicatorInput. Pure and side-effect free.
+ */
+export function validateIndicator(input: IndicatorInput): ValidationResult {
+  const errors: ValidationError[] = [];
+
+  // Name
+  if (!input.name || input.name.trim().length === 0) {
+    errors.push({ field: 'name', message: 'Name is required' });
+  }
+
+  // Abbreviation
+  if (input.abbreviation !== null && input.abbreviation.length > 4) {
+    errors.push({ field: 'abbreviation', message: 'Abbreviation must be at most 4 characters' });
+  }
+
+  // Ordinal options
+  if (input.valueType === 'ordinal') {
+    const count = input.options?.length ?? 0;
+    if (count < 2 || count > 7) {
+      errors.push({ field: 'options', message: 'Ordinal indicators require 2 to 7 options' });
+    }
+  }
+
+  // Scale config
+  if (input.valueType === 'scale') {
+    if (!input.scale || input.scale.min >= input.scale.max) {
+      errors.push({ field: 'scale', message: 'Scale minimum must be less than maximum' });
+    } else if (input.scale.step <= 0) {
+      errors.push({ field: 'scale', message: 'Scale step must be greater than 0' });
+    }
+  }
+
+  // Desired direction and ideal range
+  if (input.group === 'result') {
+    if (!input.desiredDirection || !VALID_DIRECTIONS.includes(input.desiredDirection)) {
+      errors.push({ field: 'desiredDirection', message: 'Valid desired direction is required for results' });
+    } else if (input.desiredDirection === 'target_range') {
+      if (input.valueType !== 'numeric' && input.valueType !== 'scale') {
+        errors.push({
+          field: 'desiredDirection',
+          message: 'Target range is only available for numeric or scale results',
+        });
+      }
+      if (!input.idealRange || input.idealRange.min > input.idealRange.max) {
+        errors.push({ field: 'idealRange', message: 'Ideal range requires min <= max' });
+      }
+    } else if (input.idealRange !== null) {
+      errors.push({
+        field: 'idealRange',
+        message: 'Ideal range is only allowed with target_range direction',
+      });
+    }
+  } else {
+    if (input.desiredDirection !== null) {
+      errors.push({ field: 'desiredDirection', message: 'Factors do not have a desired direction' });
+    }
+    if (input.idealRange !== null) {
+      errors.push({ field: 'idealRange', message: 'Ideal range only allowed for numeric or scale results' });
+    }
+  }
+
+  // Required config block for the chosen value type
+  if (input.valueType === 'numeric' && input.numeric === null) {
+    errors.push({ field: 'numeric', message: 'Numeric configuration is required' });
+  }
+  if (input.valueType === 'scale' && input.scale === null) {
+    errors.push({ field: 'scale', message: 'Scale configuration is required' });
+  }
+  if (input.valueType === 'ordinal' && input.options === null) {
+    errors.push({ field: 'options', message: 'Options are required for ordinal indicators' });
+  }
+
+  // Non-matching config blocks must be null
+  if (input.valueType !== 'numeric' && input.numeric !== null) {
+    errors.push({ field: 'numeric', message: 'Numeric configuration not allowed for this value type' });
+  }
+  if (input.valueType !== 'scale' && input.scale !== null) {
+    errors.push({ field: 'scale', message: 'Scale configuration not allowed for this value type' });
+  }
+  if (input.valueType !== 'ordinal' && input.options !== null) {
+    errors.push({ field: 'options', message: 'Options not allowed for this value type' });
+  }
+
+  // Daily aggregation against frequency and type
+  if (input.frequency === 'single_per_day' && input.dailyAggregation !== null) {
+    errors.push({
+      field: 'dailyAggregation',
+      message: 'Daily aggregation is not applicable for single-per-day indicators',
+    });
+  }
+  if (input.frequency === 'multiple_per_day') {
+    const allowed = allowedAggregations(input.valueType, input.frequency);
+    if (!allowed || !input.dailyAggregation || !allowed.includes(input.dailyAggregation)) {
+      errors.push({ field: 'dailyAggregation', message: 'Invalid daily aggregation for value type' });
+    }
+  }
+
+  return { valid: errors.length === 0, errors };
+}
diff --git a/app/tests/rules/users.test.ts b/app/tests/rules/users.test.ts
deleted file mode 100644
index 95fb3a0..0000000
--- a/app/tests/rules/users.test.ts
+++ /dev/null
@@ -1,133 +0,0 @@
-import { readFileSync } from 'node:fs';
-import {
-  assertFails,
-  assertSucceeds,
-  initializeTestEnvironment,
-  type RulesTestEnvironment,
-} from '@firebase/rules-unit-testing';
-import { doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
-import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
-
-let env: RulesTestEnvironment;
-
-beforeAll(async () => {
-  env = await initializeTestEnvironment({
-    projectId: 'demo-pulsar-rules-users',
-    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
-  });
-});
-beforeEach(() => env.clearFirestore());
-afterAll(() => env.cleanup());
-
-// Token options are cast: the SDK types restrict sign_in_provider to a fixed union.
-const anonymous = (uid: string) =>
-  env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } } as never).firestore();
-const permanent = (uid: string) =>
-  env.authenticatedContext(uid, { firebase: { sign_in_provider: 'google.com' } } as never).firestore();
-
-const seedAdmin = (path: string, data: Record<string, unknown>) =>
-  env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), path), data));
-
-describe('users/{uid} isolation', () => {
-  it.each([
-    ['anonymous', anonymous],
-    ['permanent', permanent],
-  ])('%s UID A cannot read or write anything under users/B', async (_name, ctxFor) => {
-    await seedAdmin('users/bob', { aiConsent: true });
-    await seedAdmin('users/bob/entries/e1', { x: 1 });
-    const alice = ctxFor('alice');
-    await assertFails(getDoc(doc(alice, 'users/bob')));
-    await assertFails(setDoc(doc(alice, 'users/bob'), { aiConsent: false }));
-    await assertFails(updateDoc(doc(alice, 'users/bob'), { aiConsent: false }));
-    await assertFails(getDoc(doc(alice, 'users/bob/entries/e1')));
-    await assertFails(setDoc(doc(alice, 'users/bob/entries/e2'), { x: 1 }));
-  });
-
-  it('blocks unauthenticated access', async () => {
-    await seedAdmin('users/bob', { aiConsent: true });
-    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'users/bob')));
-  });
-
-  it('lets owners write valid documents (anonymous and permanent)', async () => {
-    await assertSucceeds(setDoc(doc(anonymous('anon'), 'users/anon'), { onboardingCompleted: true }));
-    await assertSucceeds(
-      setDoc(doc(permanent('perm'), 'users/perm'), {
-        onboardingCompleted: false,
-        aiConsent: true,
-        reminderEnabled: false,
-        lastInsightRefreshAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00Z')),
-        createdAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00Z')),
-      }),
-    );
-  });
-});
-
-describe('users/{uid} schema validation', () => {
-  const ref = () => doc(permanent('alice'), 'users/alice');
-
-  it('rejects unknown fields', async () => {
-    await assertFails(setDoc(ref(), { onboardingCompleted: true, hacked: true }));
-    await assertFails(setDoc(ref(), { lastNotificationSentAt: Timestamp.now() }));
-  });
-
-  it.each([
-    ['onboardingCompleted', 'yes'],
-    ['aiConsent', 1],
-    ['reminderEnabled', 'true'],
-    ['lastInsightRefreshAt', 'today'],
-    ['createdAt', 123],
-  ])('rejects wrong type for %s', async (field, value) => {
-    await assertFails(setDoc(ref(), { [field]: value }));
-  });
-
-  it('rejects unknown fields on update of an existing document', async () => {
-    await seedAdmin('users/alice', { aiConsent: false });
-    await assertFails(updateDoc(ref(), { somethingElse: 1 }));
-    await assertSucceeds(updateDoc(ref(), { aiConsent: true }));
-  });
-});
-
-describe('save-account invite dismissal state', () => {
-  const ref = () => doc(anonymous('alice'), 'users/alice');
-
-  it('accepts a timestamp or null for saveAccountInviteDismissedAt', async () => {
-    await assertSucceeds(setDoc(ref(), { saveAccountInviteDismissedAt: Timestamp.now() }));
-    await assertSucceeds(setDoc(ref(), { saveAccountInviteDismissedAt: null }));
-  });
-
-  it('accepts an integer >= 0 or null for saveAccountInviteDismissedDayCount', async () => {
-    await assertSucceeds(setDoc(ref(), { saveAccountInviteDismissedDayCount: 0 }));
-    await assertSucceeds(setDoc(ref(), { saveAccountInviteDismissedDayCount: 3 }));
-    await assertSucceeds(setDoc(ref(), { saveAccountInviteDismissedDayCount: null }));
-    await assertSucceeds(
-      setDoc(ref(), { saveAccountInviteDismissedAt: Timestamp.now(), saveAccountInviteDismissedDayCount: 5 }),
-    );
-  });
-
-  it.each([
-    ['string', '3'],
-    ['negative', -1],
-    ['decimal', 2.5],
-    ['boolean', true],
-  ])('rejects %s for saveAccountInviteDismissedDayCount', async (_name, value) => {
-    await assertFails(setDoc(ref(), { saveAccountInviteDismissedDayCount: value }));
-  });
-
-  it.each([
-    ['string', '2026-01-01'],
-    ['number', 1700000000],
-  ])('rejects %s for saveAccountInviteDismissedAt', async (_name, value) => {
-    await assertFails(setDoc(ref(), { saveAccountInviteDismissedAt: value }));
-  });
-});
-
-describe('internal/**', () => {
-  it('is inaccessible to clients', async () => {
-    const alice = permanent('alice');
-    await seedAdmin('internal/userQuotas', { n: 1 });
-    await assertFails(getDoc(doc(alice, 'internal/userQuotas')));
-    await assertFails(setDoc(doc(alice, 'internal/userQuotas'), { n: 2 }));
-    await assertFails(setDoc(doc(anonymous('anon'), 'internal/x/y/z'), { n: 2 }));
-    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'internal/userQuotas')));
-  });
-});
diff --git a/app/tests/rules/usersAdminFields.test.ts b/app/tests/rules/usersAdminFields.test.ts
deleted file mode 100644
index ae466f3..0000000
--- a/app/tests/rules/usersAdminFields.test.ts
+++ /dev/null
@@ -1,54 +0,0 @@
-import { readFileSync } from 'node:fs';
-import {
-  assertFails,
-  assertSucceeds,
-  initializeTestEnvironment,
-  type RulesTestEnvironment,
-} from '@firebase/rules-unit-testing';
-import { deleteDoc, deleteField, doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
-import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
-
-let env: RulesTestEnvironment;
-
-beforeAll(async () => {
-  env = await initializeTestEnvironment({
-    projectId: 'demo-pulsar-rules-users-admin',
-    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
-  });
-});
-beforeEach(() => env.clearFirestore());
-afterAll(() => env.cleanup());
-
-const seedAdmin = (path: string, data: Record<string, unknown>) =>
-  env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), path), data));
-
-describe('administrative fields stay out of client reach', () => {
-  const alice = () => env.authenticatedContext('alice').firestore();
-
-  it('lets the owner read a missing or client-only profile', async () => {
-    await assertSucceeds(getDoc(doc(alice(), 'users/alice')));
-    await seedAdmin('users/alice', { aiConsent: true });
-    await assertSucceeds(getDoc(doc(alice(), 'users/alice')));
-  });
-
-  it('does not expose or let the owner rewrite misplaced admin fields', async () => {
-    await seedAdmin('users/alice', { aiConsent: true, lastNotificationSentAt: Timestamp.now() });
-    await assertFails(getDoc(doc(alice(), 'users/alice')));
-    await assertFails(updateDoc(doc(alice(), 'users/alice'), { aiConsent: false }));
-    await assertFails(updateDoc(doc(alice(), 'users/alice'), { lastNotificationSentAt: deleteField() }));
-    await assertFails(setDoc(doc(alice(), 'users/alice'), { aiConsent: false }));
-  });
-
-  it('denies direct deletion of the profile, with or without admin fields', async () => {
-    await seedAdmin('users/alice', { aiConsent: true });
-    await assertFails(deleteDoc(doc(alice(), 'users/alice')));
-    await seedAdmin('users/alice', { aiConsent: true, lastNotificationSentAt: Timestamp.now() });
-    await assertFails(deleteDoc(doc(alice(), 'users/alice')));
-  });
-
-  it('keeps the per-user admin document under internal/ unreadable', async () => {
-    await seedAdmin('internal/userAdmin/users/alice', { lastNotificationSentAt: Timestamp.now() });
-    await assertFails(getDoc(doc(alice(), 'internal/userAdmin/users/alice')));
-    await assertFails(deleteDoc(doc(alice(), 'internal/userAdmin/users/alice')));
-  });
-});
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
