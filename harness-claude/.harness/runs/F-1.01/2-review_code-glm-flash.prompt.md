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
- [L-015] Decisão do humano: Como representar 'sem resposta' em Sim/Não? → Tocar de novo na opção selecionada limpa a resposta e exclui o registro de hoje — Tocar de novo na opção selecionada limpa a resposta e exclui o registro de hoje (padrão)
- [L-016] Decisão do humano: Qual controle usar para escala? → Pílulas tocáveis até 11 valores; slider nativo acima disso — Pílulas tocáveis até 11 valores; slider nativo acima disso (padrão)
- [L-017] Decisão do humano: Como reordenar indicadores? → Botões subir/descer acessíveis — Botões subir/descer acessíveis (padrão)
- [L-018] Decisão do humano: Onde fica o histórico de registros? → A partir do indicador em Meus indicadores, exclusão com confirmação — A partir do indicador em Meus indicadores, exclusão com confirmação (padrão)
- [L-019] Decisão do humano: Quais rotas usar? → /onboarding, /dashboard, /register, /indicators, /saved-insights, /insights/:hypothesisKey, /settings, /install — /onboarding, /dashboard, /register, /indicators, /saved-insights, /insights/:hypothesisKey, /settings, /install (padrão)
- [L-020] Decisão do humano: Como o layout se comporta no computador? → Coluna central até 960 px; listas de cartões em grid auto-fit (mín. 300 px) — Coluna central até 960 px; listas de cartões em grid auto-fit (mín. 300 px) (padrão)
- [L-021] Decisão do humano: Como resolver conflito de credencial na conversão? → Opções 'Cancelar' ou 'Entrar na conta existente' com aviso; nada é apagado nem mesclado — Opções 'Cancelar' ou 'Entrar na conta existente' com aviso; nada é apagado nem mesclado (padrão)
- [L-022] Decisão do humano: De onde servir ícones e fontes? → Material Symbols, Geist e Space Grotesk via pacotes npm, sem CDN — Material Symbols, Geist e Space Grotesk via pacotes npm, sem CDN (padrão)
- [L-023] Decisão do humano: Como identificar e autenticar o usuário do seed? → seed-user-0001 (seed@pulsar.test, sem senha), 30 dias terminando hoje, login e2e por custom token; --demo só com HARNESS_ALLOW_DEMO_SEED=1 e --project sem 'prod' — seed-user-0001 (seed@pulsar.test, sem senha), 30 dias terminando hoje, login e2e por custom token; --demo só com HARNESS_ALLOW_DEMO_SEED=1 e --project sem 'prod' (padrão)
- [L-024] Decisão do humano: Quais portas usar nos emuladores? → Firestore 8282, Auth 9299 (fonte única app/firebase.json) — Firestore 8282, Auth 9299 (fonte única app/firebase.json) (padrão)


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
diff --git a/app/scripts/seed-data.ts b/app/scripts/seed-data.ts
index ca78940..4afe979 100644
--- a/app/scripts/seed-data.ts
+++ b/app/scripts/seed-data.ts
@@ -18,12 +18,21 @@ export const SENTINELS = {
   note: 'ZQX_OBS_NOTA_5T1',
 } as const;
 
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
+
 // Brasília has no DST since 2019; seed timestamps are generated at a fixed -03:00 offset and stored in UTC.
 const SEED_TZ_OFFSET = '-03:00';
 
-type ValueType = 'boolean' | 'scale' | 'ordinal' | 'numeric';
-type EntryValue = { boolean: boolean } | { number: number } | { optionId: string };
-
 export interface SeedIndicator {
   id: string;
   group: 'factor' | 'result';
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
index 0000000..5c88dfe
--- /dev/null
+++ b/app/src/domain/entry.ts
@@ -0,0 +1,99 @@
+/**
+ * Pure domain types and validation for Entry values.
+ *
+ * Matches the model described in arquitetura.md#3.3.
+ * No Firebase, React or DOM dependencies.
+ */
+
+import type { IndicatorInput, OrdinalOption, ValueType } from './indicator';
+import type { ValidationError, ValidationResult } from './validation';
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
+    if (shape.key !== 'boolean' || typeof typedValue.boolean !== 'boolean') {
+      errors.push({ field: 'value', message: 'Boolean value required' });
+    }
+  } else if (indicator.valueType === 'numeric' || indicator.valueType === 'scale') {
+    const isScale = indicator.valueType === 'scale';
+    const num = typedValue.number;
+    if (shape.key !== 'number') {
+      errors.push({ field: 'value', message: isScale ? 'Scale value required' : 'Numeric value required' });
+    } else if (typeof num !== 'number' || !Number.isFinite(num)) {
+      errors.push({ field: 'value', message: 'Finite number required' });
+    } else if (isScale && indicator.scale && (num < indicator.scale.min || num > indicator.scale.max)) {
+      errors.push({ field: 'value', message: 'Value outside scale range' });
+    } else if (!isScale && indicator.numeric) {
+      const { min, max } = indicator.numeric;
+      if (min !== null && num < min) {
+        errors.push({ field: 'value', message: 'Value below configured minimum' });
+      }
+      if (max !== null && num > max) {
+        errors.push({ field: 'value', message: 'Value above configured maximum' });
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
index 0000000..b0e9049
--- /dev/null
+++ b/app/src/domain/indicator.ts
@@ -0,0 +1,204 @@
+/**
+ * Pure domain types and validation for Indicators.
+ *
+ * Matches the model described in arquitetura.md#3.2 and spec.md#4.1-4.3.
+ * No Firebase, React or DOM dependencies.
+ */
+
+import type { ValidationResult, ValidationError } from './validation';
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
diff --git a/app/src/domain/validation.ts b/app/src/domain/validation.ts
new file mode 100644
index 0000000..5cefa53
--- /dev/null
+++ b/app/src/domain/validation.ts
@@ -0,0 +1,14 @@
+/**
+ * Shared validation result shapes for domain modules.
+ * No Firebase, React or DOM dependencies.
+ */
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
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
