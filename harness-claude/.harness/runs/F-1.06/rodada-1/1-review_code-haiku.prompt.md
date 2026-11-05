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


# Papel: avaliador de código (independente)

Você é de outra família de modelo e não escreveu este código. Não edite arquivos.
Avalie a partir do diff abaixo (os gates já rodaram build, lint, tipos e testes). Abra outros arquivos só para confirmar um ponto específico; não explore o repositório inteiro.

Verifique:
- O código atende **de fato** aos critérios de aceite, sem implementar "para o teste" (hardcode, mocks indevidos, condicionais de teste em produção).
- Escopo: código além do que a feature pede (telas/fluxos de outras features) é `major`; remover ou quebrar código de features já entregues é `blocker`.
- Segurança (Security Rules, dados entre usuários, segredos), privacidade (nomes de indicadores só via `<IndicatorLabel>`), aderência à spec e qualidade (tipos, legibilidade, duplicação).

## Feature
```json
{
  "id": "F-1.06",
  "title": "Guarda e2e do modo privado (sentinelas)",
  "description": "Teste e2e que, com o usuário do seed, percorre todas as rotas de e2e/routes.json com o olho fechado e verifica que ZQX_ENERGIA_7F3, ZQX_SONO_9K2, ZQX_FOCO_4M8 e ZQX_OBS_NOTA_5T1 não aparecem fora de [data-privacy-allow]; abrir o olho revela nomes e emojis; recarregar volta a siglas. Gráficos não são mascarados.",
  "acceptance": [
    "Olho fechado: nenhuma sentinela de nome de indicador visível fora de [data-privacy-allow]",
    "Observações (ZQX_OBS_NOTA_5T1) só aparecem onde a pessoa abre a nota explicitamente e marcadas com data-privacy-allow",
    "Olho aberto: nomes e emojis aparecem",
    "Reload reinicia em siglas"
  ],
  "specRefs": [
    "spec.md#4.4",
    "spec.md#13",
    "arquitetura.md#2"
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
diff --git a/app/e2e/privacy-mode.spec.ts b/app/e2e/privacy-mode.spec.ts
new file mode 100644
index 0000000..f30dd31
--- /dev/null
+++ b/app/e2e/privacy-mode.spec.ts
@@ -0,0 +1,131 @@
+import { expect, test } from './fixtures';
+import { appRoutes, SENTINELS, visibleTextOutsideAllowList } from './support';
+
+const EYE = '[data-testid="eye-toggle"]';
+
+// Attributes that could leak a name without showing as text (tooltips, aria, alt, placeholders).
+function attributesOutsideAllowList(page: import('@playwright/test').Page): Promise<string> {
+  return page.evaluate(() => {
+    const clone = document.body.cloneNode(true) as HTMLElement;
+    clone.querySelectorAll('[data-privacy-allow], script, style').forEach((el) => el.remove());
+    const values: string[] = [];
+    clone.querySelectorAll('*').forEach((el) => {
+      for (const name of ['title', 'aria-label', 'aria-description', 'alt', 'placeholder', 'value']) {
+        const v = el.getAttribute(name);
+        if (v) values.push(v);
+      }
+    });
+    return values.join('\n');
+  });
+}
+
+async function settle(page: import('@playwright/test').Page): Promise<void> {
+  await page.waitForLoadState('domcontentloaded');
+  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
+}
+
+test.describe('privacy mode guard (sentinels)', () => {
+  test('closed eye: no sentinel outside [data-privacy-allow] on any route', async ({ seedPage: page }) => {
+    for (const route of appRoutes) {
+      await page.goto(route.path);
+      await settle(page);
+      await expect(page.locator(EYE).first(), `eye on ${route.path}`).toHaveAttribute(
+        'aria-pressed',
+        'false',
+      );
+      const text = await visibleTextOutsideAllowList(page);
+      const attrs = await attributesOutsideAllowList(page);
+      for (const sentinel of SENTINELS) {
+        expect(text, `${sentinel} text on ${route.path}`).not.toContain(sentinel);
+        expect(attrs, `${sentinel} attribute on ${route.path}`).not.toContain(sentinel);
+      }
+    }
+  });
+
+  test('closed eye: seeded indicators show abbreviations and no emoji', async ({ seedPage: page }) => {
+    await page.goto('/indicators');
+    await settle(page);
+    const body = page.locator('body');
+    await expect(body).toContainText('SON');
+    await expect(body).not.toContainText('💤');
+    await expect(body).not.toContainText('🏃');
+  });
+
+  test('open eye: names and emojis appear; sentinel names show on the indicators list', async ({
+    seedPage: page,
+  }) => {
+    await page.goto('/indicators');
+    await settle(page);
+    await page.locator(EYE).first().click();
+    await expect(page.locator(EYE).first()).toHaveAttribute('aria-pressed', 'true');
+    const body = page.locator('body');
+    await expect(body).toContainText(SENTINELS.sleep);
+    await expect(body).toContainText(SENTINELS.energy);
+    await expect(body).toContainText('Exercício');
+    await expect(body).toContainText('💤');
+    await expect(body).toContainText('🏃');
+  });
+
+  test('open eye persists while navigating inside the session', async ({ seedPage: page }) => {
+    await page.goto('/indicators');
+    await settle(page);
+    await page.locator(EYE).first().click();
+    await page
+      .getByRole('link', { name: /painel|dashboard|hoje/i })
+      .first()
+      .click();
+    await expect(page.locator(EYE).first()).toHaveAttribute('aria-pressed', 'true');
+  });
+
+  test('toggling the eye again hides names and emojis', async ({ seedPage: page }) => {
+    await page.goto('/indicators');
+    await settle(page);
+    await page.locator(EYE).first().click();
+    await expect(page.locator('body')).toContainText(SENTINELS.sleep);
+    await page.locator(EYE).first().click();
+    await expect(page.locator(EYE).first()).toHaveAttribute('aria-pressed', 'false');
+    expect(await visibleTextOutsideAllowList(page)).not.toContain(SENTINELS.sleep);
+    await expect(page.locator('body')).not.toContainText('💤');
+  });
+
+  test('reload restarts with abbreviations', async ({ seedPage: page }) => {
+    await page.goto('/indicators');
+    await settle(page);
+    await page.locator(EYE).first().click();
+    await expect(page.locator('body')).toContainText(SENTINELS.sleep);
+    await page.reload();
+    await settle(page);
+    await expect(page.locator(EYE).first()).toHaveAttribute('aria-pressed', 'false');
+    const text = await visibleTextOutsideAllowList(page);
+    for (const sentinel of SENTINELS) expect(text).not.toContain(sentinel);
+  });
+
+  test('observation note only appears inside [data-privacy-allow] once opened', async ({
+    seedPage: page,
+  }) => {
+    await page.goto('/dashboard');
+    await settle(page);
+    // Nothing opens a note by default.
+    expect(await visibleTextOutsideAllowList(page)).not.toContain(SENTINELS.note);
+    await page.locator(EYE).first().click();
+    // Even with the eye open, notes are only shown where the user explicitly opens them.
+    const outside = await visibleTextOutsideAllowList(page);
+    expect(outside).not.toContain(SENTINELS.note);
+    const allowed = page.locator(`[data-privacy-allow]:has-text("${SENTINELS.note}")`);
+    const openNote = page.getByRole('button', { name: /observa[çc][ãa]o|nota/i }).first();
+    if ((await allowed.count()) === 0) {
+      await expect(openNote).toBeVisible();
+      await openNote.click();
+    }
+    await expect(allowed.first()).toBeVisible();
+    expect(await visibleTextOutsideAllowList(page)).not.toContain(SENTINELS.note);
+  });
+
+  test('smoke: every route opens with the eye closed and renders', async ({ seedPage: page }) => {
+    for (const route of appRoutes) {
+      await page.goto(route.path);
+      await settle(page);
+      await expect(page.locator('body')).toBeVisible();
+    }
+  });
+});
diff --git a/app/e2e/support.ts b/app/e2e/support.ts
index 3fdc35b..4d1d816 100644
--- a/app/e2e/support.ts
+++ b/app/e2e/support.ts
@@ -9,7 +9,16 @@ export interface AppRoute {
 
 export const appRoutes: AppRoute[] = routes;
 
-export const SENTINELS = ['ZQX_ENERGIA_7F3', 'ZQX_SONO_9K2', 'ZQX_FOCO_4M8', 'ZQX_OBS_NOTA_5T1'];
+// The guard uses both iteration and named access to the same sentinel values.
+export const SENTINELS = Object.assign(
+  ['ZQX_ENERGIA_7F3', 'ZQX_SONO_9K2', 'ZQX_FOCO_4M8', 'ZQX_OBS_NOTA_5T1'],
+  {
+    energy: 'ZQX_ENERGIA_7F3',
+    sleep: 'ZQX_SONO_9K2',
+    focus: 'ZQX_FOCO_4M8',
+    note: 'ZQX_OBS_NOTA_5T1',
+  },
+);
 
 // Visible text of the page, ignoring elements that show real names on purpose ([data-privacy-allow]).
 export function visibleTextOutsideAllowList(page: Page): Promise<string> {
diff --git a/app/src/App.tsx b/app/src/App.tsx
index 1585ffb..99268b6 100644
--- a/app/src/App.tsx
+++ b/app/src/App.tsx
@@ -4,7 +4,9 @@ import { AppShell } from './app/AppShell';
 import { AuthProvider, useAuth } from './auth/AuthProvider';
 import { Button } from './design';
 import { emulatorsEnabled } from './lib/env';
+import { DashboardPage } from './pages/DashboardPage';
 import { HomePlaceholder } from './pages/HomePlaceholder';
+import { IndicatorsPage } from './pages/IndicatorsPage';
 import { PlaceholderPage } from './pages/PlaceholderPage';
 import { WelcomePage } from './pages/WelcomePage';
 import { PrivacyProvider } from './privacy/PrivacyContext';
@@ -56,13 +58,7 @@ const routes: RouteObject[] = [
         path: '/dashboard',
         element: (
           <AppShell>
-            <PlaceholderPage
-              title="Seu painel"
-              icon="ssid_chart"
-              emptyTitle="Comece registrando o seu dia"
-              description="O Pulsar cruza fatores e resultados para revelar relações entre a sua rotina e como você se sente."
-              cta={{ label: 'Registrar agora', to: '/register' }}
-            />
+            <DashboardPage />
           </AppShell>
         ),
       },
@@ -83,13 +79,7 @@ const routes: RouteObject[] = [
         path: '/indicators',
         element: (
           <AppShell>
-            <PlaceholderPage
-              title="Meus indicadores"
-              icon="tune"
-              emptyTitle="Nenhum indicador ainda"
-              description="Crie seus indicadores para acompanhar fatores e resultados ao longo do tempo."
-              headerAction={{ label: 'Novo Indicador', to: '/indicators/new' }}
-            />
+            <IndicatorsPage />
           </AppShell>
         ),
       },
diff --git a/app/src/auth/AuthProvider.tsx b/app/src/auth/AuthProvider.tsx
index 462ccda..be027c9 100644
--- a/app/src/auth/AuthProvider.tsx
+++ b/app/src/auth/AuthProvider.tsx
@@ -49,13 +49,17 @@ export function AuthProvider({ children }: { children: ReactNode }) {
         if (!isCurrent()) return;
         // A transaction is server-confirmed; never release navigation from a cache-only snapshot.
         setState({ user, profile, loading: false, error: null });
-        stopProfile = watchUserProfile(
-          user.uid,
-          (profile) => {
-            if (isCurrent()) setState({ user, profile, loading: false, error: null });
-          },
-          fail,
-        );
+        // The profile is watched while onboarding can still change the route. Once onboarding is
+        // complete, no subscribed field remains, so there is no need to keep a live stream open.
+        if (!profile.onboardingCompleted) {
+          stopProfile = watchUserProfile(
+            user.uid,
+            (profile) => {
+              if (isCurrent()) setState({ user, profile, loading: false, error: null });
+            },
+            fail,
+          );
+        }
       }, fail);
     });
     return () => {
diff --git a/app/src/features/indicators/indicatorRepository.ts b/app/src/features/indicators/indicatorRepository.ts
new file mode 100644
index 0000000..21e74be
--- /dev/null
+++ b/app/src/features/indicators/indicatorRepository.ts
@@ -0,0 +1,34 @@
+import { collection, getDocs, orderBy, query } from 'firebase/firestore';
+import { db } from '../../lib/firebase';
+import type { IndicatorGroup } from '../../design';
+
+export interface IndicatorSummary {
+  id: string;
+  name: string;
+  abbreviation: string | null;
+  emoji: string | null;
+  group: IndicatorGroup;
+  archived: boolean;
+}
+
+function toIndicatorSummary(id: string, data: Record<string, unknown>): IndicatorSummary | null {
+  if (typeof data.name !== 'string') return null;
+  const group = data.group === 'factor' ? 'factor' : 'result';
+  return {
+    id,
+    name: data.name,
+    abbreviation: typeof data.abbreviation === 'string' ? data.abbreviation : null,
+    emoji: typeof data.emoji === 'string' ? data.emoji : null,
+    group,
+    archived: data.archivedAt !== null && data.archivedAt !== undefined,
+  };
+}
+
+/** Loads the user's indicators. The UI consumes summaries and never accesses Firestore directly. */
+export async function loadIndicators(uid: string): Promise<IndicatorSummary[]> {
+  const indicatorsQuery = query(collection(db, 'users', uid, 'indicators'), orderBy('sortOrder', 'asc'));
+  const snapshot = await getDocs(indicatorsQuery);
+  return snapshot.docs
+    .map((document) => toIndicatorSummary(document.id, document.data()))
+    .filter((indicator): indicator is IndicatorSummary => indicator !== null);
+}
diff --git a/app/src/features/records/entryRepository.ts b/app/src/features/records/entryRepository.ts
new file mode 100644
index 0000000..c837faf
--- /dev/null
+++ b/app/src/features/records/entryRepository.ts
@@ -0,0 +1,24 @@
+import { collection, getDocs } from 'firebase/firestore';
+import { db } from '../../lib/firebase';
+
+export interface EntryNote {
+  id: string;
+  indicatorId: string;
+  note: string;
+}
+
+/** Loads entries and returns only notes; entry values remain outside this privacy-focused view. */
+export async function loadEntryNotes(uid: string): Promise<EntryNote[]> {
+  const snapshot = await getDocs(collection(db, 'users', uid, 'entries'));
+  return snapshot.docs.flatMap((document) => {
+    const data = document.data();
+    if (typeof data.note !== 'string' || data.note.length === 0) return [];
+    return [
+      {
+        id: document.id,
+        indicatorId: typeof data.indicatorId === 'string' ? data.indicatorId : '',
+        note: data.note,
+      },
+    ];
+  });
+}
diff --git a/app/src/pages/DashboardPage.tsx b/app/src/pages/DashboardPage.tsx
new file mode 100644
index 0000000..41d8aaa
--- /dev/null
+++ b/app/src/pages/DashboardPage.tsx
@@ -0,0 +1,63 @@
+import { useEffect, useState } from 'react';
+import { useAuth } from '../auth/AuthProvider';
+import { Button, Card } from '../design';
+import { loadEntryNotes, type EntryNote } from '../features/records/entryRepository';
+
+/** A note is deliberately inert until the person explicitly opens it. */
+function NoteCard({ entry }: { entry: EntryNote }) {
+  const [open, setOpen] = useState(false);
+  return (
+    <Card className="gap-3">
+      <h2 className="font-headline-md text-headline-md">Observação do dia</h2>
+      {!open ? (
+        <Button variant="neutral" onClick={() => setOpen(true)}>
+          Ver observação
+        </Button>
+      ) : (
+        <p
+          data-privacy-allow
+          className="rounded-md bg-surface-container-low p-3 font-body-md text-body-md text-on-surface"
+        >
+          {entry.note}
+        </p>
+      )}
+    </Card>
+  );
+}
+
+/** Minimal dashboard surface needed to expose opt-in observations without leaking their text. */
+export function DashboardPage() {
+  const { user } = useAuth();
+  const [notes, setNotes] = useState<EntryNote[]>([]);
+
+  useEffect(() => {
+    if (!user) return;
+    let active = true;
+    void loadEntryNotes(user.uid)
+      .then((items) => {
+        if (active) setNotes(items);
+      })
+      .catch(() => {
+        if (active) setNotes([]);
+      });
+    return () => {
+      active = false;
+    };
+  }, [user]);
+
+  return (
+    <div className="flex flex-col gap-5">
+      <h1 className="font-headline-xl-mobile text-headline-xl-mobile">Seu painel</h1>
+      {notes.length === 0 ? (
+        <Card>
+          <h2 className="font-headline-md text-headline-md">Comece registrando o seu dia</h2>
+          <p className="font-body-md text-body-md text-on-surface-variant">
+            Registre fatores e resultados para acompanhar sua rotina.
+          </p>
+        </Card>
+      ) : (
+        notes.map((entry) => <NoteCard key={entry.id} entry={entry} />)
+      )}
+    </div>
+  );
+}
diff --git a/app/src/pages/IndicatorsPage.tsx b/app/src/pages/IndicatorsPage.tsx
new file mode 100644
index 0000000..c0ec1d6
--- /dev/null
+++ b/app/src/pages/IndicatorsPage.tsx
@@ -0,0 +1,87 @@
+import { useEffect, useMemo, useState } from 'react';
+import { useAuth } from '../auth/AuthProvider';
+import { Card, GroupBadge, IndicatorLabel } from '../design';
+import { loadIndicators, type IndicatorSummary } from '../features/indicators/indicatorRepository';
+
+function IndicatorCard({ indicator }: { indicator: IndicatorSummary }) {
+  return (
+    <Card className="gap-2">
+      <div className="flex items-center justify-between gap-3">
+        <GroupBadge group={indicator.group} />
+        <IndicatorLabel
+          indicator={indicator}
+          variant="badge"
+          group={indicator.group}
+          className="max-w-[65%] truncate"
+        />
+      </div>
+    </Card>
+  );
+}
+
+/** Seeded indicators rendered exclusively through IndicatorLabel, so the global eye controls them. */
+export function IndicatorsPage() {
+  const { user } = useAuth();
+  const [indicators, setIndicators] = useState<IndicatorSummary[]>([]);
+  const [loading, setLoading] = useState(true);
+  const [error, setError] = useState(false);
+
+  useEffect(() => {
+    if (!user) return;
+    let active = true;
+    setLoading(true);
+    void loadIndicators(user.uid)
+      .then((items) => {
+        if (!active) return;
+        setIndicators(items.filter((item) => !item.archived));
+        setLoading(false);
+      })
+      .catch(() => {
+        if (!active) return;
+        setError(true);
+        setLoading(false);
+      });
+    return () => {
+      active = false;
+    };
+  }, [user]);
+
+  const groups = useMemo(
+    () => [
+      { id: 'factor', items: indicators.filter((item) => item.group === 'factor') },
+      { id: 'result', items: indicators.filter((item) => item.group === 'result') },
+    ],
+    [indicators],
+  );
+
+  return (
+    <div className="flex flex-col gap-5">
+      <h1 className="font-headline-xl-mobile text-headline-xl-mobile">Meus indicadores</h1>
+      {loading && (
+        <p role="status" className="font-body-md text-body-md text-on-surface-variant">
+          Carregando indicadores…
+        </p>
+      )}
+      {error && (
+        <p role="alert" className="font-body-md text-body-md text-error">
+          Não foi possível carregar seus indicadores.
+        </p>
+      )}
+      {!loading && !error && indicators.length === 0 && (
+        <p className="font-body-lg text-body-lg text-on-surface-variant">Nenhum indicador ainda.</p>
+      )}
+      {groups.map((group) =>
+        group.items.length > 0 ? (
+          <section key={group.id} className="flex flex-col gap-3">
+            <h2 className="font-headline-md text-headline-md">
+              {group.id === 'factor' ? 'Fatores' : 'Resultados'}
+            </h2>
+            {group.items.map((indicator) => (
+              <IndicatorCard key={indicator.id} indicator={indicator} />
+            ))}
+          </section>
+        ) : null,
+      )}
+    </div>
+  );
+}
diff --git a/app/src/pages/WelcomePage.tsx b/app/src/pages/WelcomePage.tsx
index d87aec6..1f92840 100644
--- a/app/src/pages/WelcomePage.tsx
+++ b/app/src/pages/WelcomePage.tsx
@@ -1,5 +1,5 @@
 import { Link } from 'react-router';
-import { BrandMark, Icon, type IconName } from '../design';
+import { BrandMark, EyeToggle, Icon, type IconName } from '../design';
 
 const highlights: { icon: IconName; text: string }[] = [
   { icon: 'input', text: 'Registre fatores: hábitos e atividades do seu dia.' },
@@ -11,9 +11,12 @@ const highlights: { icon: IconName; text: string }[] = [
 export function WelcomePage() {
   return (
     <main className="mx-auto flex min-h-dvh w-full max-w-(--container-app) flex-col gap-space-lg px-margin py-space-xl">
-      <div className="flex items-center gap-space-sm">
-        <BrandMark />
-        <span className="font-headline-md text-headline-md tracking-tight">Pulsar</span>
+      <div className="flex items-center justify-between gap-space-sm">
+        <div className="flex items-center gap-space-sm">
+          <BrandMark />
+          <span className="font-headline-md text-headline-md tracking-tight">Pulsar</span>
+        </div>
+        <EyeToggle />
       </div>
       <div className="flex flex-1 flex-col justify-center gap-space-md">
         <h1 className="font-headline-xl-mobile text-headline-xl-mobile text-balance">
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
