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
  "id": "F-1.02",
  "title": "Utilitários de tempo (UTC, localDate do navegador, dia de Brasília)",
  "description": "src/lib/time.ts: localDate (YYYY-MM-DD) no fuso do navegador no momento do registro, formatação pt-BR de data/hora no fuso do navegador, chave de dia de Brasília (para quota de IA e lembrete), helpers de janela de 30 dias corridos. Sem lógica de viagens.",
  "acceptance": [
    "localDate usa o fuso do navegador (testado com TZ diferentes) e muda à meia-noite local",
    "Timestamps persistidos são UTC; exibição usa Intl pt-BR no fuso do navegador",
    "brasiliaDateKey usa America/Sao_Paulo independentemente do fuso do navegador",
    "Nenhuma correção por viagem/mudança de fuso"
  ],
  "specRefs": [
    "spec.md#5.2",
    "arquitetura.md#1.1",
    "arquitetura.md#3.3"
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
diff --git a/app/src/lib/__tests__/time.test.ts b/app/src/lib/__tests__/time.test.ts
new file mode 100644
index 0000000..46ab09a
--- /dev/null
+++ b/app/src/lib/__tests__/time.test.ts
@@ -0,0 +1,183 @@
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
+import {
+  addDays,
+  brasiliaDateKey,
+  formatDate,
+  formatDateTime,
+  localDate,
+  toUtcIso,
+  windowDays,
+} from '../time';
+
+const originalTz = process.env.TZ;
+
+function setTz(tz: string) {
+  process.env.TZ = tz;
+}
+
+beforeEach(() => {
+  vi.useFakeTimers();
+});
+
+afterEach(() => {
+  vi.useRealTimers();
+  if (originalTz === undefined) delete process.env.TZ;
+  else process.env.TZ = originalTz;
+});
+
+describe('localDate', () => {
+  // 2026-10-25T02:30Z is 23:30 on the 24th in São Paulo and 11:30 on the 25th in Tokyo
+  const instant = new Date('2026-10-25T02:30:00Z');
+
+  it.each([
+    ['America/Sao_Paulo', '2026-10-24'],
+    ['Asia/Tokyo', '2026-10-25'],
+    ['UTC', '2026-10-25'],
+    ['America/Los_Angeles', '2026-10-24'],
+    ['Pacific/Auckland', '2026-10-25'],
+  ])('uses the browser timezone (%s)', (tz, expected) => {
+    setTz(tz);
+    expect(localDate(instant)).toBe(expected);
+  });
+
+  it('defaults to the current time', () => {
+    setTz('Asia/Tokyo');
+    vi.setSystemTime(instant);
+    expect(localDate()).toBe('2026-10-25');
+  });
+
+  it('formats as zero-padded YYYY-MM-DD', () => {
+    setTz('UTC');
+    expect(localDate(new Date('2026-01-05T12:00:00Z'))).toBe('2026-01-05');
+  });
+
+  it('rolls over at local midnight (São Paulo)', () => {
+    setTz('America/Sao_Paulo');
+    vi.setSystemTime(new Date('2026-10-25T02:59:59Z'));
+    expect(localDate()).toBe('2026-10-24');
+    vi.setSystemTime(new Date('2026-10-25T03:00:00Z'));
+    expect(localDate()).toBe('2026-10-25');
+  });
+
+  it('rolls over at local midnight (Auckland, UTC+13)', () => {
+    setTz('Pacific/Auckland');
+    vi.setSystemTime(new Date('2026-10-24T10:59:59Z'));
+    expect(localDate()).toBe('2026-10-24');
+    vi.setSystemTime(new Date('2026-10-24T11:00:00Z'));
+    expect(localDate()).toBe('2026-10-25');
+  });
+});
+
+describe('UTC persistence and pt-BR display', () => {
+  const instant = new Date('2026-10-25T02:30:00Z');
+
+  it('toUtcIso is independent of the browser timezone', () => {
+    setTz('Asia/Tokyo');
+    const a = toUtcIso(instant);
+    setTz('America/Sao_Paulo');
+    const b = toUtcIso(instant);
+    expect(a).toBe('2026-10-25T02:30:00.000Z');
+    expect(b).toBe(a);
+  });
+
+  it('formatDate shows pt-BR dd/mm/yyyy in the browser timezone', () => {
+    setTz('America/Sao_Paulo');
+    expect(formatDate(instant)).toBe('24/10/2026');
+    setTz('Asia/Tokyo');
+    expect(formatDate(instant)).toBe('25/10/2026');
+  });
+
+  it('formatDateTime shows pt-BR date and 24h time in the browser timezone', () => {
+    setTz('America/Sao_Paulo');
+    expect(formatDateTime(instant)).toMatch(/^24\/10\/2026,? (às )?23:30$/);
+    setTz('Asia/Tokyo');
+    expect(formatDateTime(instant)).toMatch(/^25\/10\/2026,? (às )?11:30$/);
+  });
+
+  it('accepts ISO strings', () => {
+    setTz('UTC');
+    expect(formatDate('2026-10-25T02:30:00Z')).toBe('25/10/2026');
+  });
+});
+
+describe('brasiliaDateKey', () => {
+  const instant = new Date('2026-10-25T02:30:00Z'); // 23:30 on 10-24 in Brasília
+
+  it.each(['America/Sao_Paulo', 'Asia/Tokyo', 'UTC', 'Pacific/Auckland', 'America/Los_Angeles'])(
+    'is America/Sao_Paulo regardless of the browser timezone (%s)',
+    (tz) => {
+      setTz(tz);
+      expect(brasiliaDateKey(instant)).toBe('2026-10-24');
+    },
+  );
+
+  it('rolls over at Brasília midnight (03:00Z)', () => {
+    setTz('Asia/Tokyo');
+    vi.setSystemTime(new Date('2026-10-25T02:59:59Z'));
+    expect(brasiliaDateKey()).toBe('2026-10-24');
+    vi.setSystemTime(new Date('2026-10-25T03:00:00Z'));
+    expect(brasiliaDateKey()).toBe('2026-10-25');
+  });
+
+  it('can differ from localDate', () => {
+    setTz('Asia/Tokyo');
+    expect(localDate(instant)).not.toBe(brasiliaDateKey(instant));
+  });
+});
+
+describe('no trip correction', () => {
+  it('changing timezone only changes the result for the current timezone, stored UTC is untouched', () => {
+    const recordedAt = new Date('2026-10-25T02:30:00Z');
+    setTz('America/Sao_Paulo');
+    const before = localDate(recordedAt);
+    setTz('Asia/Tokyo');
+    const after = localDate(recordedAt);
+    expect(before).toBe('2026-10-24');
+    expect(after).toBe('2026-10-25');
+    expect(toUtcIso(recordedAt)).toBe('2026-10-25T02:30:00.000Z');
+  });
+});
+
+describe('30-day window helpers', () => {
+  it('addDays moves calendar days across month, year and leap boundaries', () => {
+    expect(addDays('2026-10-25', -1)).toBe('2026-10-24');
+    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
+    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
+    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
+    expect(addDays('2026-10-25', 0)).toBe('2026-10-25');
+  });
+
+  it('addDays is not affected by DST in the browser timezone', () => {
+    setTz('America/New_York');
+    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
+    expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
+    expect(addDays('2026-11-02', -1)).toBe('2026-11-01');
+  });
+
+  it('windowDays returns 30 consecutive days ending today, oldest first', () => {
+    const days = windowDays('2026-10-25');
+    expect(days).toHaveLength(30);
+    expect(days[29]).toBe('2026-10-25');
+    expect(days[0]).toBe('2026-09-26');
+    expect(new Set(days).size).toBe(30);
+  });
+
+  it('windowDays accepts a custom size', () => {
+    expect(windowDays('2026-10-25', 7)).toEqual([
+      '2026-10-19',
+      '2026-10-20',
+      '2026-10-21',
+      '2026-10-22',
+      '2026-10-23',
+      '2026-10-24',
+      '2026-10-25',
+    ]);
+  });
+
+  it('windowDays crosses a year boundary', () => {
+    const days = windowDays('2027-01-10');
+    expect(days[0]).toBe('2026-12-12');
+    expect(days).toContain('2026-12-31');
+    expect(days).toContain('2027-01-01');
+  });
+});
diff --git a/app/src/lib/time.ts b/app/src/lib/time.ts
new file mode 100644
index 0000000..71af012
--- /dev/null
+++ b/app/src/lib/time.ts
@@ -0,0 +1,90 @@
+/**
+ * Time utilities for the app.
+ *
+ * Principles (see spec 5.2 and architecture 1.1/3.3):
+ * - Timestamps are persisted in UTC (`toUtcIso`).
+ * - Display uses the browser timezone with pt-BR formatting (`formatDate`, `formatDateTime`).
+ * - `localDate` is the day key computed by the browser at record time; it rolls over at
+ *   local midnight and changes if the device timezone changes (no trip correction).
+ * - `brasiliaDateKey` is always computed in America/Sao_Paulo, regardless of the browser
+ *   timezone (used for AI quota and reminders).
+ * - No special handling for trips or timezone changes anywhere.
+ */
+
+/** Formats an instant into a YYYY-MM-DD day key in the given IANA timezone. */
+function toDateKey(date: Date, timeZone?: string): string {
+  const parts = new Intl.DateTimeFormat('en-CA', {
+    timeZone,
+    year: 'numeric',
+    month: '2-digit',
+    day: '2-digit',
+  }).formatToParts(date);
+  const get = (type: Intl.DateTimeFormatPartTypes): string =>
+    parts.find((part) => part.type === type)?.value ?? '';
+  return `${get('year')}-${get('month')}-${get('day')}`;
+}
+
+/**
+ * Local day key (YYYY-MM-DD) in the browser timezone at the moment of recording.
+ * Defaults to the current time. Rolls over at local midnight.
+ */
+export function localDate(date?: Date): string {
+  return toDateKey(date ?? new Date());
+}
+
+/** UTC ISO timestamp for persistence (independent of the browser timezone). */
+export function toUtcIso(date: Date): string {
+  return date.toISOString();
+}
+
+/** Formats a date (or ISO string) as dd/mm/yyyy in the browser timezone. */
+export function formatDate(input: Date | string): string {
+  const date = typeof input === 'string' ? new Date(input) : input;
+  return new Intl.DateTimeFormat('pt-BR', {
+    day: '2-digit',
+    month: '2-digit',
+    year: 'numeric',
+  }).format(date);
+}
+
+/** Formats a date (or ISO string) as "dd/mm/yyyy hh:mm" (24h) in the browser timezone. */
+export function formatDateTime(input: Date | string): string {
+  const date = typeof input === 'string' ? new Date(input) : input;
+  const parts = new Intl.DateTimeFormat('pt-BR', {
+    hour: '2-digit',
+    minute: '2-digit',
+    hourCycle: 'h23',
+  }).formatToParts(date);
+  const get = (type: Intl.DateTimeFormatPartTypes): string =>
+    parts.find((part) => part.type === type)?.value ?? '';
+  const hours = get('hour');
+  const minutes = get('minute');
+  return `${formatDate(date)} ${hours}:${minutes}`;
+}
+
+/**
+ * Day key (YYYY-MM-DD) in America/Sao_Paulo, independent of the browser timezone.
+ * Used for the AI quota and reminders.
+ */
+export function brasiliaDateKey(date?: Date): string {
+  return toDateKey(date ?? new Date(), 'America/Sao_Paulo');
+}
+
+/** Adds calendar days to a YYYY-MM-DD key (UTC arithmetic, immune to browser DST). */
+export function addDays(dateKey: string, days: number): string {
+  const date = new Date(`${dateKey}T00:00:00Z`);
+  date.setUTCDate(date.getUTCDate() + days);
+  return toDateKey(date, 'UTC');
+}
+
+/**
+ * Consecutive calendar days ending on `endDateKey` (inclusive), oldest first.
+ * Defaults to the 30-day rolling window used by insights.
+ */
+export function windowDays(endDateKey: string, size = 30): string[] {
+  const days: string[] = [];
+  for (let i = size - 1; i >= 0; i--) {
+    days.push(addDays(endDateKey, -i));
+  }
+  return days;
+}
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
