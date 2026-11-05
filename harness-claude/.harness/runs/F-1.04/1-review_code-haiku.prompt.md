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
  "id": "F-1.04",
  "title": "AppShell: cabeçalho com olho, navegação inferior e layout esticável",
  "description": "Cabeçalho (marca Pulsar, EyeToggle, atalho de perfil -> /settings) e barra inferior Dashboard / Registrar / Indicadores / Conclusões conforme design/*/code.html. Coluna central com max-width var(--container-app); no desktop só estica e listas podem desempilhar (grid auto-fit). Rotas placeholder: /dashboard, /register, /indicators, /saved-insights, /settings. Atualizar e2e/routes.json.",
  "acceptance": [
    "Olho global presente em todas as telas autenticadas (data-testid=eye-toggle)",
    "Navegação inferior com rótulos e ícones; item ativo com aria-current=page",
    "Sem overflow horizontal em 375x812 e 1280x800; sem breakpoints específicos de desktop",
    "Alvos de toque >= 44px"
  ],
  "specRefs": [
    "spec.md#6.1",
    "spec.md#7.2",
    "spec.md#7.3",
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
diff --git a/app/e2e/app-shell.spec.ts b/app/e2e/app-shell.spec.ts
new file mode 100644
index 0000000..976d6c5
--- /dev/null
+++ b/app/e2e/app-shell.spec.ts
@@ -0,0 +1,101 @@
+import { expect, test, type Page } from '@playwright/test';
+import { hasHorizontalOverflow } from './support';
+
+const TABS = [
+  { label: 'Dashboard', path: '/dashboard' },
+  { label: 'Registrar', path: '/register' },
+  { label: 'Indicadores', path: '/indicators' },
+  { label: 'Conclusões', path: '/saved-insights' },
+];
+const SHELL_PATHS = [...TABS.map((t) => t.path), '/settings'];
+
+async function open(page: Page, path: string) {
+  await page.goto(path);
+  await expect(page.getByTestId('eye-toggle')).toBeVisible();
+}
+
+const nav = (page: Page) => page.getByRole('navigation');
+
+test.describe('AppShell', () => {
+  for (const path of SHELL_PATHS) {
+    test(`eye toggle, header and bottom nav are present on ${path}`, async ({ page }) => {
+      await open(page, path);
+      await expect(page.getByTestId('eye-toggle')).toHaveCount(1);
+      await expect(page.getByRole('banner')).toContainText('Pulsar');
+      for (const tab of TABS) await expect(nav(page).getByRole('link', { name: tab.label })).toBeVisible();
+    });
+  }
+
+  test('profile shortcut in the header goes to /settings', async ({ page }) => {
+    await open(page, '/dashboard');
+    await page.getByRole('banner').locator('a[href="/settings"]').click();
+    await expect(page).toHaveURL(/\/settings$/);
+    await expect(page.getByTestId('eye-toggle')).toBeVisible();
+  });
+
+  test('bottom nav items have an icon and the active one has aria-current=page', async ({ page }) => {
+    for (const active of TABS) {
+      await open(page, active.path);
+      for (const tab of TABS) {
+        const link = nav(page).getByRole('link', { name: tab.label });
+        await expect(link.locator('svg')).toHaveCount(1);
+        if (tab.path === active.path) await expect(link).toHaveAttribute('aria-current', 'page');
+        else await expect(link).not.toHaveAttribute('aria-current', 'page');
+      }
+    }
+  });
+
+  test('tapping a nav item navigates and moves the active state', async ({ page }) => {
+    await open(page, '/dashboard');
+    for (const tab of TABS.slice(1)) {
+      await nav(page).getByRole('link', { name: tab.label }).click();
+      await expect(page).toHaveURL(new RegExp(`${tab.path}$`));
+      await expect(nav(page).getByRole('link', { name: tab.label })).toHaveAttribute('aria-current', 'page');
+    }
+  });
+
+  test('eye state is global: toggling persists while navigating between tabs', async ({ page }) => {
+    await open(page, '/dashboard');
+    const eye = page.getByTestId('eye-toggle');
+    const before = await eye.getAttribute('aria-pressed');
+    await eye.click();
+    const after = await eye.getAttribute('aria-pressed');
+    expect(after).not.toBe(before);
+    await nav(page).getByRole('link', { name: 'Indicadores' }).click();
+    await expect(page.getByTestId('eye-toggle')).toHaveAttribute('aria-pressed', after ?? '');
+  });
+
+  test('touch targets are at least 44px', async ({ page }) => {
+    await open(page, '/dashboard');
+    const targets = [
+      page.getByTestId('eye-toggle'),
+      page.getByRole('banner').locator('a[href="/settings"]'),
+      ...TABS.map((t) => nav(page).getByRole('link', { name: t.label })),
+    ];
+    for (const target of targets) {
+      const box = await target.boundingBox();
+      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
+      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
+    }
+  });
+
+  test('no horizontal overflow and the column respects the max width', async ({ page }) => {
+    for (const path of SHELL_PATHS) {
+      await open(page, path);
+      expect(await hasHorizontalOverflow(page)).toBe(false);
+      const width = await page.getByRole('main').evaluate((el) => el.getBoundingClientRect().width);
+      const viewport = page.viewportSize()?.width ?? 0;
+      expect(width).toBeLessThanOrEqual(Math.min(viewport, 960) + 1);
+      expect(width).toBeGreaterThan(0);
+    }
+  });
+
+  test('bottom nav stays inside the viewport', async ({ page }) => {
+    await open(page, '/dashboard');
+    const box = await nav(page).boundingBox();
+    const viewport = page.viewportSize();
+    expect(box).not.toBeNull();
+    expect((box?.x ?? -1) + (box?.width ?? 0)).toBeLessThanOrEqual((viewport?.width ?? 0) + 1);
+    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual((viewport?.height ?? 0) + 1);
+  });
+});
diff --git a/app/e2e/routes.json b/app/e2e/routes.json
index e65a010..213e043 100644
--- a/app/e2e/routes.json
+++ b/app/e2e/routes.json
@@ -2,5 +2,9 @@
   { "path": "/", "name": "home", "tags": ["ui"] },
   { "path": "/onboarding", "name": "onboarding", "tags": ["ui"] },
   { "path": "/dashboard", "name": "dashboard", "tags": ["ui"] },
+  { "path": "/register", "name": "register", "tags": ["ui"] },
+  { "path": "/indicators", "name": "indicators", "tags": ["ui"] },
+  { "path": "/saved-insights", "name": "saved-insights", "tags": ["ui"] },
+  { "path": "/settings", "name": "settings", "tags": ["ui"] },
   { "path": "/_design", "name": "design", "tags": ["ui"] }
 ]
diff --git a/app/scripts/icons.ts b/app/scripts/icons.ts
index 0d52372..2b0cfa1 100644
--- a/app/scripts/icons.ts
+++ b/app/scripts/icons.ts
@@ -11,9 +11,14 @@ const names = [
   'arrow_back',
   'check_circle',
   'close',
+  'edit_note',
   'input',
   'insights',
+  'lightbulb',
+  'person',
   'remove',
+  'ssid_chart',
+  'tune',
   'visibility',
   'visibility_off',
 ];
diff --git a/app/src/App.tsx b/app/src/App.tsx
index 1bbabee..1103295 100644
--- a/app/src/App.tsx
+++ b/app/src/App.tsx
@@ -1,5 +1,6 @@
 import { lazy, Suspense } from 'react';
 import { createBrowserRouter, Navigate, Outlet, RouterProvider, type RouteObject } from 'react-router';
+import { AppShell } from './app/AppShell';
 import { AuthProvider, useAuth } from './auth/AuthProvider';
 import { Button } from './design';
 import { emulatorsEnabled } from './lib/env';
@@ -61,9 +62,46 @@ const routes: RouteObject[] = [
       {
         path: '/dashboard',
         element: (
-          <HomePlaceholder title="Seu painel">
+          <AppShell>
+            <h1 className="font-headline-xl-mobile text-headline-xl-mobile">Seu painel</h1>
             <p className={textClass}>Seus indicadores e registros aparecerão aqui.</p>
-          </HomePlaceholder>
+          </AppShell>
+        ),
+      },
+      {
+        path: '/register',
+        element: (
+          <AppShell>
+            <h1 className="font-headline-xl-mobile text-headline-xl-mobile">Registrar</h1>
+            <p className={textClass}>O preenchimento rápido estará disponível aqui.</p>
+          </AppShell>
+        ),
+      },
+      {
+        path: '/indicators',
+        element: (
+          <AppShell>
+            <h1 className="font-headline-xl-mobile text-headline-xl-mobile">Meus indicadores</h1>
+            <p className={textClass}>Seus indicadores aparecerão aqui.</p>
+          </AppShell>
+        ),
+      },
+      {
+        path: '/saved-insights',
+        element: (
+          <AppShell>
+            <h1 className="font-headline-xl-mobile text-headline-xl-mobile">Conclusões salvas</h1>
+            <p className={textClass}>Suas descobertas salvas aparecerão aqui.</p>
+          </AppShell>
+        ),
+      },
+      {
+        path: '/settings',
+        element: (
+          <AppShell>
+            <h1 className="font-headline-xl-mobile text-headline-xl-mobile">Configurações</h1>
+            <p className={textClass}>Gerencie sua conta e preferências aqui.</p>
+          </AppShell>
         ),
       },
     ],
diff --git a/app/src/app/AppShell.tsx b/app/src/app/AppShell.tsx
new file mode 100644
index 0000000..9cae9d8
--- /dev/null
+++ b/app/src/app/AppShell.tsx
@@ -0,0 +1,87 @@
+import type { ReactNode } from 'react';
+import { Link, useLocation } from 'react-router';
+import { EyeToggle, Icon, type IconName } from '../design';
+
+interface NavigationItem {
+  label: string;
+  path: string;
+  icon: IconName;
+}
+
+const navigationItems: NavigationItem[] = [
+  { label: 'Dashboard', path: '/dashboard', icon: 'ssid_chart' },
+  { label: 'Registrar', path: '/register', icon: 'edit_note' },
+  { label: 'Indicadores', path: '/indicators', icon: 'tune' },
+  { label: 'Conclusões', path: '/saved-insights', icon: 'lightbulb' },
+];
+
+export function AppShell({ children }: { children: ReactNode }) {
+  const { pathname } = useLocation();
+
+  return (
+    <div className="min-h-dvh bg-surface text-on-surface">
+      <header className="fixed inset-x-0 top-0 z-50 bg-surface/90 pt-safe backdrop-blur-xl">
+        <div className="mx-auto flex h-16 w-full max-w-(--container-app) items-center justify-between px-margin">
+          <div className="flex min-w-0 items-center gap-2">
+            <span className="font-headline-md text-headline-md tracking-tight text-on-surface">Pulsar</span>
+            <span className="rounded-full bg-surface-container-high px-2 py-0.5 font-label-code text-label-code tracking-wider text-primary uppercase">
+              Beta V1
+            </span>
+          </div>
+          <div className="flex items-center gap-2">
+            <EyeToggle />
+            <Link
+              to="/settings"
+              aria-label="Abrir configurações"
+              className="flex min-h-11 min-w-11 items-center justify-center rounded-full transition-transform active:scale-95"
+            >
+              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-on-primary ring-2 ring-primary-fixed/50">
+                <Icon name="person" className="text-[18px]" />
+              </span>
+            </Link>
+          </div>
+        </div>
+      </header>
+
+      <main className="mx-auto flex min-h-dvh w-full max-w-(--container-app) flex-col px-margin pt-20 pb-24">
+        {children}
+      </main>
+
+      <nav
+        aria-label="Navegação principal"
+        className="fixed inset-x-0 bottom-0 z-50 bg-surface/95 pb-safe shadow-[0_-2px_12px_rgba(19,27,46,0.05)] backdrop-blur-xl"
+      >
+        <div className="mx-auto flex h-20 w-full max-w-(--container-app) items-start justify-around px-2">
+          {navigationItems.map((item) => {
+            const isActive = pathname === item.path;
+            const isRegister = item.path === '/register';
+            return (
+              <Link
+                key={item.path}
+                to={item.path}
+                aria-current={isActive ? 'page' : undefined}
+                className={`flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-1 rounded-lg text-label-md transition-colors ${
+                  isActive ? 'font-semibold text-primary' : 'text-on-surface-variant hover:text-on-surface'
+                }`}
+              >
+                <span
+                  className={`relative flex items-center justify-center ${
+                    isRegister
+                      ? '-mt-4 size-11 rounded-full bg-primary-container text-on-primary shadow-[0_4px_12px_rgba(99,14,212,0.3)]'
+                      : 'text-[24px]'
+                  }`}
+                >
+                  <Icon name={item.icon} className={isRegister ? 'text-[22px]' : ''} />
+                  {!isRegister && isActive ? (
+                    <span className="absolute -bottom-1 size-1.5 rounded-full bg-primary" />
+                  ) : null}
+                </span>
+                <span className="tracking-tight">{item.label}</span>
+              </Link>
+            );
+          })}
+        </div>
+      </nav>
+    </div>
+  );
+}
diff --git a/app/src/design/icons.ts b/app/src/design/icons.ts
index 0fb9d11..80cbd5f 100644
--- a/app/src/design/icons.ts
+++ b/app/src/design/icons.ts
@@ -10,11 +10,20 @@ export const iconPaths = {
     'M424 -296L706 -578L650 -634L424 -408L310 -522L254 -466ZM480 -80Q397 -80 324 -111.5Q251 -143 197 -197Q143 -251 111.5 -324Q80 -397 80 -480Q80 -563 111.5 -636Q143 -709 197 -763Q251 -817 324 -848.5Q397 -880 480 -880Q563 -880 636 -848.5Q709 -817 763 -763Q817 -709 848.5 -636Q880 -563 880 -480Q880 -397 848.5 -324Q817 -251 763 -197Q709 -143 636 -111.5Q563 -80 480 -80ZM480 -160Q614 -160 707 -253Q800 -346 800 -480Q800 -614 707 -707Q614 -800 480 -800Q346 -800 253 -707Q160 -614 160 -480Q160 -346 253 -253Q346 -160 480 -160ZM480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Z',
   close:
     'M256 -200L200 -256L424 -480L200 -704L256 -760L480 -536L704 -760L760 -704L536 -480L760 -256L704 -200L480 -424Z',
+  edit_note:
+    'M160 -400L160 -480L440 -480L440 -400ZM160 -560L160 -640L600 -640L600 -560ZM160 -720L160 -800L600 -800L600 -720ZM520 -160L520 -283L741 -503Q750 -512 761 -516Q772 -520 783 -520Q795 -520 806 -515.5Q817 -511 826 -502L863 -465Q871 -456 875.5 -445Q880 -434 880 -423Q880 -412 876 -400.5Q872 -389 863 -380L643 -160ZM820 -423L820 -423L783 -460L783 -460ZM580 -220L618 -220L739 -342L721 -361L702 -379L580 -258ZM721 -361L702 -379L702 -379L739 -342L739 -342Z',
   input:
     'M160 -160Q127 -160 103.5 -183.5Q80 -207 80 -240L80 -360L160 -360L160 -240Q160 -240 160 -240Q160 -240 160 -240L800 -240Q800 -240 800 -240Q800 -240 800 -240L800 -720Q800 -720 800 -720Q800 -720 800 -720L160 -720Q160 -720 160 -720Q160 -720 160 -720L160 -600L80 -600L80 -720Q80 -753 103.5 -776.5Q127 -800 160 -800L800 -800Q833 -800 856.5 -776.5Q880 -753 880 -720L880 -240Q880 -207 856.5 -183.5Q833 -160 800 -160ZM460 -300L404 -358L487 -440L80 -440L80 -520L487 -520L404 -602L460 -660L640 -480Z',
   insights:
     'M120 -160Q87 -160 63.5 -183.5Q40 -207 40 -240Q40 -273 63.5 -296.5Q87 -320 120 -320Q126 -320 130.5 -320Q135 -320 140 -318L322 -500Q320 -505 320 -509.5Q320 -514 320 -520Q320 -553 343.5 -576.5Q367 -600 400 -600Q433 -600 456.5 -576.5Q480 -553 480 -520Q480 -518 478 -500L580 -398Q585 -400 589.5 -400Q594 -400 600 -400Q606 -400 610.5 -400Q615 -400 620 -398L762 -540Q760 -545 760 -549.5Q760 -554 760 -560Q760 -593 783.5 -616.5Q807 -640 840 -640Q873 -640 896.5 -616.5Q920 -593 920 -560Q920 -527 896.5 -503.5Q873 -480 840 -480Q834 -480 829.5 -480Q825 -480 820 -482L678 -340Q680 -335 680 -330.5Q680 -326 680 -320Q680 -287 656.5 -263.5Q633 -240 600 -240Q567 -240 543.5 -263.5Q520 -287 520 -320Q520 -326 520 -330.5Q520 -335 522 -340L420 -442Q415 -440 410.5 -440Q406 -440 400 -440Q398 -440 380 -442L198 -260Q200 -255 200 -250.5Q200 -246 200 -240Q200 -207 176.5 -183.5Q153 -160 120 -160ZM160 -561L135 -615L81 -640L135 -665L160 -719L185 -665L239 -640L185 -615ZM600 -600L562 -682L480 -720L562 -758L600 -840L638 -758L720 -720L638 -682Z',
+  lightbulb:
+    'M480 -80Q447 -80 423.5 -103.5Q400 -127 400 -160L560 -160Q560 -127 536.5 -103.5Q513 -80 480 -80ZM320 -200L320 -280L640 -280L640 -200ZM330 -320Q261 -361 220.5 -430Q180 -499 180 -580Q180 -705 267.5 -792.5Q355 -880 480 -880Q605 -880 692.5 -792.5Q780 -705 780 -580Q780 -499 739.5 -430Q699 -361 630 -320ZM354 -400L606 -400Q651 -432 675.5 -479Q700 -526 700 -580Q700 -672 636 -736Q572 -800 480 -800Q388 -800 324 -736Q260 -672 260 -580Q260 -526 284.5 -479Q309 -432 354 -400ZM480 -400Q480 -400 480 -400Q480 -400 480 -400Q480 -400 480 -400Q480 -400 480 -400Q480 -400 480 -400Q480 -400 480 -400Q480 -400 480 -400Q480 -400 480 -400Z',
+  person:
+    'M480 -480Q414 -480 367 -527Q320 -574 320 -640Q320 -706 367 -753Q414 -800 480 -800Q546 -800 593 -753Q640 -706 640 -640Q640 -574 593 -527Q546 -480 480 -480ZM160 -160L160 -272Q160 -306 177.5 -334.5Q195 -363 224 -378Q286 -409 350 -424.5Q414 -440 480 -440Q546 -440 610 -424.5Q674 -409 736 -378Q765 -363 782.5 -334.5Q800 -306 800 -272L800 -160ZM240 -240L720 -240L720 -272Q720 -283 714.5 -292Q709 -301 700 -306Q646 -333 591 -346.5Q536 -360 480 -360Q424 -360 369 -346.5Q314 -333 260 -306Q251 -301 245.5 -292Q240 -283 240 -272ZM480 -560Q513 -560 536.5 -583.5Q560 -607 560 -640Q560 -673 536.5 -696.5Q513 -720 480 -720Q447 -720 423.5 -696.5Q400 -673 400 -640Q400 -607 423.5 -583.5Q447 -560 480 -560ZM480 -640Q480 -640 480 -640Q480 -640 480 -640Q480 -640 480 -640Q480 -640 480 -640Q480 -640 480 -640Q480 -640 480 -640Q480 -640 480 -640Q480 -640 480 -640ZM480 -240L480 -240Q480 -240 480 -240Q480 -240 480 -240Q480 -240 480 -240Q480 -240 480 -240Q480 -240 480 -240Q480 -240 480 -240Q480 -240 480 -240Q480 -240 480 -240L480 -240Z',
   remove: 'M200 -440L200 -520L760 -520L760 -440Z',
+  ssid_chart:
+    'M480 -120L232 -360L120 -280L120 -378L240 -464L485 -226L652 -360L840 -360L840 -280L680 -280ZM480 -480L305 -655L120 -520L120 -619L313 -760L488 -585L840 -840L840 -741Z',
+  tune: 'M440 -120L440 -360L520 -360L520 -280L840 -280L840 -200L520 -200L520 -120ZM120 -200L120 -280L360 -280L360 -200ZM280 -360L280 -440L120 -440L120 -520L280 -520L280 -600L360 -600L360 -360ZM440 -440L440 -520L840 -520L840 -440ZM600 -600L600 -840L680 -840L680 -760L840 -760L840 -680L680 -680L680 -600ZM120 -680L120 -760L520 -760L520 -680Z',
   visibility:
     'M480 -320Q555 -320 607.5 -372.5Q660 -425 660 -500Q660 -575 607.5 -627.5Q555 -680 480 -680Q405 -680 352.5 -627.5Q300 -575 300 -500Q300 -425 352.5 -372.5Q405 -320 480 -320ZM480 -392Q435 -392 403.5 -423.5Q372 -455 372 -500Q372 -545 403.5 -576.5Q435 -608 480 -608Q525 -608 556.5 -576.5Q588 -545 588 -500Q588 -455 556.5 -423.5Q525 -392 480 -392ZM480 -200Q334 -200 214 -281.5Q94 -363 40 -500Q94 -637 214 -718.5Q334 -800 480 -800Q626 -800 746 -718.5Q866 -637 920 -500Q866 -363 746 -281.5Q626 -200 480 -200ZM480 -500Q480 -500 480 -500Q480 -500 480 -500Q480 -500 480 -500Q480 -500 480 -500Q480 -500 480 -500Q480 -500 480 -500Q480 -500 480 -500Q480 -500 480 -500ZM480 -280Q593 -280 687.5 -339.5Q782 -399 832 -500Q782 -601 687.5 -660.5Q593 -720 480 -720Q367 -720 272.5 -660.5Q178 -601 128 -500Q178 -399 272.5 -339.5Q367 -280 480 -280Z',
   visibility_off:
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
