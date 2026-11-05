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
  "id": "F-1.07",
  "title": "Tutorial de três telas",
  "description": "/onboarding com 3 passos (Fatores, Resultados, Associações e privacidade) seguindo design/onboarding_1_fatores, onboarding_2_resultados e onboarding_3_associa_es; Próximo, Voltar e Pular; ao concluir ou pular grava onboardingCompleted=true e vai ao dashboard.",
  "acceptance": [
    "Três telas com Próximo/Voltar/Pular",
    "Concluir ou pular grava onboardingCompleted=true e não reaparece",
    "Tela 3 explica que correlação não é causalidade, o modo de siglas e a conta anônima"
  ],
  "specRefs": [
    "spec.md#3.1",
    "spec.md#6.6"
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
diff --git a/app/e2e/onboarding.spec.ts b/app/e2e/onboarding.spec.ts
new file mode 100644
index 0000000..41abe4a
--- /dev/null
+++ b/app/e2e/onboarding.spec.ts
@@ -0,0 +1,110 @@
+import { expect, test } from './fixtures';
+import type { Page } from '@playwright/test';
+
+const STEP_1 = /Observe sua rotina sem burocracia/;
+const STEP_2 = /Acompanhe como seu corpo responde/;
+const STEP_3 = /Descubra associações reais nos seus dados/;
+
+const action = (page: Page, name: RegExp) => page.locator('button, a').filter({ hasText: name });
+const heading = (page: Page) => page.getByRole('heading', { level: 1 });
+
+async function openOnboarding(page: Page) {
+  await page.goto('/onboarding');
+  await expect(heading(page)).toHaveText(STEP_1);
+}
+
+test.describe('onboarding tutorial', () => {
+  test('new account lands on the first of three steps', async ({ freshUserPage: page }) => {
+    await page.goto('/');
+    await expect(page).toHaveURL(/\/onboarding$/);
+    await expect(heading(page)).toHaveText(STEP_1);
+    await expect(action(page, /Próximo/).first()).toBeVisible();
+    await expect(action(page, /Pular/).first()).toBeVisible();
+  });
+
+  test('Next and Back move through the three steps', async ({ freshUserPage: page }) => {
+    await openOnboarding(page);
+    // First step has nothing to go back to.
+    await expect(action(page, /^\s*Voltar\s*$/)).toHaveCount(0);
+
+    await action(page, /Próximo/)
+      .first()
+      .click();
+    await expect(heading(page)).toHaveText(STEP_2);
+    await expect(action(page, /Pular/).first()).toBeVisible();
+
+    await action(page, /Próximo/)
+      .first()
+      .click();
+    await expect(heading(page)).toHaveText(STEP_3);
+
+    await action(page, /^\s*Voltar\s*$/)
+      .first()
+      .click();
+    await expect(heading(page)).toHaveText(STEP_2);
+    await action(page, /^\s*Voltar\s*$/)
+      .first()
+      .click();
+    await expect(heading(page)).toHaveText(STEP_1);
+  });
+
+  test('step 3 explains correlation is not causation, acronym mode and anonymous account', async ({
+    freshUserPage: page,
+  }) => {
+    await openOnboarding(page);
+    await action(page, /Próximo/)
+      .first()
+      .click();
+    await action(page, /Próximo/)
+      .first()
+      .click();
+    await expect(heading(page)).toHaveText(STEP_3);
+    await expect(page.getByText(/causalidade/i).first()).toBeVisible();
+    await expect(page.getByText(/siglas/i).first()).toBeVisible();
+    await expect(page.getByText(/anônima/i).first()).toBeVisible();
+  });
+
+  test('finishing marks onboarding as completed and it does not come back', async ({
+    freshUserPage: page,
+  }) => {
+    await openOnboarding(page);
+    await action(page, /Próximo/)
+      .first()
+      .click();
+    await action(page, /Próximo/)
+      .first()
+      .click();
+    await expect(heading(page)).toHaveText(STEP_3);
+    await action(page, /Começar|Concluir/)
+      .first()
+      .click();
+    await expect(page).toHaveURL(/\/dashboard$/);
+
+    await page.goto('/');
+    await expect(page).toHaveURL(/\/dashboard$/);
+    await page.reload();
+    await expect(page).toHaveURL(/\/dashboard$/);
+  });
+
+  test('skipping from the first step marks onboarding as completed', async ({ freshUserPage: page }) => {
+    await openOnboarding(page);
+    await action(page, /Pular/).first().click();
+    await expect(page).toHaveURL(/\/dashboard$/);
+
+    await page.goto('/');
+    await expect(page).toHaveURL(/\/dashboard$/);
+  });
+
+  test('skipping from the second step marks onboarding as completed', async ({ freshUserPage: page }) => {
+    await openOnboarding(page);
+    await action(page, /Próximo/)
+      .first()
+      .click();
+    await expect(heading(page)).toHaveText(STEP_2);
+    await action(page, /Pular/).first().click();
+    await expect(page).toHaveURL(/\/dashboard$/);
+
+    await page.goto('/');
+    await expect(page).toHaveURL(/\/dashboard$/);
+  });
+});
diff --git a/app/scripts/icons.ts b/app/scripts/icons.ts
index 2b0cfa1..1438f1a 100644
--- a/app/scripts/icons.ts
+++ b/app/scripts/icons.ts
@@ -9,16 +9,29 @@ const names = [
   'add_circle',
   'analytics',
   'arrow_back',
+  'arrow_forward',
+  'bedtime',
+  'bolt',
   'check_circle',
   'close',
+  'coffee',
   'edit_note',
+  'fitness_center',
+  'healing',
   'input',
   'insights',
   'lightbulb',
+  'medication',
+  'no_accounts',
   'person',
+  'psychology',
   'remove',
+  'science',
   'ssid_chart',
+  'touch_app',
   'tune',
+  'vital_signs',
+  'verified',
   'visibility',
   'visibility_off',
 ];
diff --git a/app/src/App.tsx b/app/src/App.tsx
index 1585ffb..fda5f6d 100644
--- a/app/src/App.tsx
+++ b/app/src/App.tsx
@@ -5,8 +5,8 @@ import { AuthProvider, useAuth } from './auth/AuthProvider';
 import { Button } from './design';
 import { emulatorsEnabled } from './lib/env';
 import { HomePlaceholder } from './pages/HomePlaceholder';
+import { OnboardingPage } from './pages/OnboardingPage';
 import { PlaceholderPage } from './pages/PlaceholderPage';
-import { WelcomePage } from './pages/WelcomePage';
 import { PrivacyProvider } from './privacy/PrivacyContext';
 
 const DesignPage = lazy(() => import('./pages/DesignPage'));
@@ -51,7 +51,7 @@ const routes: RouteObject[] = [
     ),
     children: [
       { path: '/', element: <RootRedirect /> },
-      { path: '/onboarding', element: <WelcomePage /> },
+      { path: '/onboarding', element: <OnboardingPage /> },
       {
         path: '/dashboard',
         element: (
diff --git a/app/src/auth/__tests__/userRepository.test.ts b/app/src/auth/__tests__/userRepository.test.ts
new file mode 100644
index 0000000..5230dda
--- /dev/null
+++ b/app/src/auth/__tests__/userRepository.test.ts
@@ -0,0 +1,34 @@
+import { beforeEach, describe, expect, it, vi } from 'vitest';
+
+const h = vi.hoisted(() => {
+  const writes: { path: string; data: Record<string, unknown>; options: unknown }[] = [];
+  return { writes };
+});
+
+vi.mock('../../lib/firebase', () => ({ auth: { __fake: 'auth' }, db: { __fake: 'db' } }));
+
+vi.mock('firebase/firestore', () => ({
+  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
+  // The merge option matters: completing onboarding must never recreate the document.
+  setDoc: async (ref: { path: string }, data: Record<string, unknown>, options: unknown) => {
+    h.writes.push({ path: ref.path, data, options });
+  },
+  onSnapshot: () => () => {},
+  runTransaction: () => Promise.resolve({ onboardingCompleted: false }),
+  serverTimestamp: () => null,
+}));
+
+import { completeOnboarding } from '../userRepository';
+
+describe('completeOnboarding', () => {
+  beforeEach(() => {
+    h.writes.length = 0;
+  });
+
+  it('records onboardingCompleted=true on users/{uid} with a merge-set', async () => {
+    await completeOnboarding('uid-1');
+    expect(h.writes).toEqual([
+      { path: 'users/uid-1', data: { onboardingCompleted: true }, options: { merge: true } },
+    ]);
+  });
+});
diff --git a/app/src/auth/userRepository.ts b/app/src/auth/userRepository.ts
index 941b6f3..5016bc8 100644
--- a/app/src/auth/userRepository.ts
+++ b/app/src/auth/userRepository.ts
@@ -1,4 +1,11 @@
-import { doc, onSnapshot, runTransaction, serverTimestamp, type Unsubscribe } from 'firebase/firestore';
+import {
+  doc,
+  onSnapshot,
+  runTransaction,
+  serverTimestamp,
+  setDoc,
+  type Unsubscribe,
+} from 'firebase/firestore';
 import { db } from '../lib/firebase';
 
 export interface UserProfile {
@@ -24,6 +31,11 @@ export function ensureUserProfile(uid: string): Promise<UserProfile> {
   });
 }
 
+// Merge-set is idempotent and never recreates the document if it was already deleted.
+export function completeOnboarding(uid: string): Promise<void> {
+  return setDoc(doc(db, 'users', uid), { onboardingCompleted: true }, { merge: true });
+}
+
 // Live view of users/{uid}, so changes made during the session (e.g. onboarding completed) are never stale.
 export function watchUserProfile(
   uid: string,
diff --git a/app/src/design/icons.ts b/app/src/design/icons.ts
index 80cbd5f..e15cacd 100644
--- a/app/src/design/icons.ts
+++ b/app/src/design/icons.ts
@@ -6,24 +6,48 @@ export const iconPaths = {
   analytics:
     'M280 -280L360 -280L360 -480L280 -480ZM600 -280L680 -280L680 -680L600 -680ZM440 -280L520 -280L520 -400L440 -400ZM440 -480L520 -480L520 -560L440 -560ZM200 -120Q167 -120 143.5 -143.5Q120 -167 120 -200L120 -760Q120 -793 143.5 -816.5Q167 -840 200 -840L760 -840Q793 -840 816.5 -816.5Q840 -793 840 -760L840 -200Q840 -167 816.5 -143.5Q793 -120 760 -120ZM200 -200L760 -200Q760 -200 760 -200Q760 -200 760 -200L760 -760Q760 -760 760 -760Q760 -760 760 -760L200 -760Q200 -760 200 -760Q200 -760 200 -760L200 -200Q200 -200 200 -200Q200 -200 200 -200ZM200 -760L200 -760Q200 -760 200 -760Q200 -760 200 -760L200 -200Q200 -200 200 -200Q200 -200 200 -200L200 -200Q200 -200 200 -200Q200 -200 200 -200L200 -760Q200 -760 200 -760Q200 -760 200 -760Z',
   arrow_back: 'M313 -440L537 -216L480 -160L160 -480L480 -800L537 -744L313 -520L800 -520L800 -440Z',
+  arrow_forward: 'M647 -440L160 -440L160 -520L647 -520L423 -744L480 -800L800 -480L480 -160L423 -216Z',
+  bedtime:
+    'M484 -80Q400 -80 326.5 -112Q253 -144 198.5 -198.5Q144 -253 112 -326.5Q80 -400 80 -484Q80 -630 173 -741.5Q266 -853 410 -880Q392 -781 421 -686.5Q450 -592 521 -521Q592 -450 686.5 -421Q781 -392 880 -410Q854 -266 742 -173Q630 -80 484 -80ZM484 -160Q572 -160 647 -204Q722 -248 765 -325Q679 -333 602 -368.5Q525 -404 464 -465Q403 -526 367 -603Q331 -680 324 -766Q247 -723 203.5 -647.5Q160 -572 160 -484Q160 -349 254.5 -254.5Q349 -160 484 -160ZM464 -465Q464 -465 464 -465Q464 -465 464 -465Q464 -465 464 -465Q464 -465 464 -465Q464 -465 464 -465Q464 -465 464 -465Q464 -465 464 -465Q464 -465 464 -465Q464 -465 464 -465Q464 -465 464 -465Z',
+  bolt: 'M422 -232L629 -480L469 -480L498 -707L313 -440L452 -440ZM320 -80L360 -360L160 -360L520 -880L600 -880L560 -560L800 -560L400 -80ZM471 -470L471 -470L471 -470L471 -470L471 -470L471 -470Z',
   check_circle:
     'M424 -296L706 -578L650 -634L424 -408L310 -522L254 -466ZM480 -80Q397 -80 324 -111.5Q251 -143 197 -197Q143 -251 111.5 -324Q80 -397 80 -480Q80 -563 111.5 -636Q143 -709 197 -763Q251 -817 324 -848.5Q397 -880 480 -880Q563 -880 636 -848.5Q709 -817 763 -763Q817 -709 848.5 -636Q880 -563 880 -480Q880 -397 848.5 -324Q817 -251 763 -197Q709 -143 636 -111.5Q563 -80 480 -80ZM480 -160Q614 -160 707 -253Q800 -346 800 -480Q800 -614 707 -707Q614 -800 480 -800Q346 -800 253 -707Q160 -614 160 -480Q160 -346 253 -253Q346 -160 480 -160ZM480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Z',
   close:
     'M256 -200L200 -256L424 -480L200 -704L256 -760L480 -536L704 -760L760 -704L536 -480L760 -256L704 -200L480 -424Z',
+  coffee:
+    'M440 -240Q323 -240 241.5 -321.5Q160 -403 160 -520L160 -760Q160 -793 183.5 -816.5Q207 -840 240 -840L740 -840Q798 -840 839 -799Q880 -758 880 -700Q880 -642 839 -601Q798 -560 740 -560L720 -560L720 -520Q720 -403 638.5 -321.5Q557 -240 440 -240ZM240 -640L640 -640L640 -760L240 -760ZM440 -320Q523 -320 581.5 -378.5Q640 -437 640 -520L640 -560L240 -560L240 -520Q240 -437 298.5 -378.5Q357 -320 440 -320ZM720 -640L740 -640Q765 -640 782.5 -657.5Q800 -675 800 -700Q800 -725 782.5 -742.5Q765 -760 740 -760L720 -760ZM160 -120L160 -200L800 -200L800 -120ZM440 -560Q440 -560 440 -560Q440 -560 440 -560L440 -560L440 -560L440 -560Q440 -560 440 -560Q440 -560 440 -560Z',
   edit_note:
     'M160 -400L160 -480L440 -480L440 -400ZM160 -560L160 -640L600 -640L600 -560ZM160 -720L160 -800L600 -800L600 -720ZM520 -160L520 -283L741 -503Q750 -512 761 -516Q772 -520 783 -520Q795 -520 806 -515.5Q817 -511 826 -502L863 -465Q871 -456 875.5 -445Q880 -434 880 -423Q880 -412 876 -400.5Q872 -389 863 -380L643 -160ZM820 -423L820 -423L783 -460L783 -460ZM580 -220L618 -220L739 -342L721 -361L702 -379L580 -258ZM721 -361L702 -379L702 -379L739 -342L739 -342Z',
+  fitness_center:
+    'M536 -84L480 -140L622 -282L282 -622L140 -480L84 -536L140 -594L84 -650L168 -734L112 -792L168 -848L226 -792L310 -876L366 -820L424 -876L480 -820L338 -678L678 -338L820 -480L876 -424L820 -366L876 -310L792 -226L848 -168L792 -112L734 -168L650 -84L594 -140Z',
+  healing:
+    'M480 -254L330 -104Q307 -81 274 -81Q241 -81 218 -104L104 -218Q81 -241 81 -274Q81 -307 104 -330L254 -480L104 -630Q81 -653 81 -686Q81 -719 104 -742L218 -856Q241 -879 274 -879Q307 -879 330 -856L480 -706L630 -856Q653 -879 686 -879Q719 -879 742 -856L856 -742Q879 -719 879 -686Q879 -653 856 -630L706 -480L856 -330Q879 -307 879 -274Q879 -241 856 -218L742 -104Q719 -81 686 -81Q653 -81 630 -104ZM480 -520Q497 -520 508.5 -531.5Q520 -543 520 -560Q520 -577 508.5 -588.5Q497 -600 480 -600Q463 -600 451.5 -588.5Q440 -577 440 -560Q440 -543 451.5 -531.5Q463 -520 480 -520ZM310 -536L424 -650L274 -800Q274 -800 274 -800Q274 -800 274 -800L160 -686Q160 -686 160 -686Q160 -686 160 -686ZM400 -440Q417 -440 428.5 -451.5Q440 -463 440 -480Q440 -497 428.5 -508.5Q417 -520 400 -520Q383 -520 371.5 -508.5Q360 -497 360 -480Q360 -463 371.5 -451.5Q383 -440 400 -440ZM480 -360Q497 -360 508.5 -371.5Q520 -383 520 -400Q520 -417 508.5 -428.5Q497 -440 480 -440Q463 -440 451.5 -428.5Q440 -417 440 -400Q440 -383 451.5 -371.5Q463 -360 480 -360ZM560 -440Q577 -440 588.5 -451.5Q600 -463 600 -480Q600 -497 588.5 -508.5Q577 -520 560 -520Q543 -520 531.5 -508.5Q520 -497 520 -480Q520 -463 531.5 -451.5Q543 -440 560 -440ZM536 -310L686 -160Q686 -160 686 -160Q686 -160 686 -160L800 -274Q800 -274 800 -274Q800 -274 800 -274L650 -424ZM339 -621L339 -621L339 -621L339 -621L339 -621L339 -621L339 -621Q339 -621 339 -621Q339 -621 339 -621L339 -621Q339 -621 339 -621Q339 -621 339 -621L339 -621L339 -621L339 -621L339 -621ZM621 -339L621 -339L621 -339L621 -339L621 -339L621 -339Q621 -339 621 -339Q621 -339 621 -339L621 -339Q621 -339 621 -339Q621 -339 621 -339L621 -339L621 -339L621 -339L621 -339L621 -339Z',
   input:
     'M160 -160Q127 -160 103.5 -183.5Q80 -207 80 -240L80 -360L160 -360L160 -240Q160 -240 160 -240Q160 -240 160 -240L800 -240Q800 -240 800 -240Q800 -240 800 -240L800 -720Q800 -720 800 -720Q800 -720 800 -720L160 -720Q160 -720 160 -720Q160 -720 160 -720L160 -600L80 -600L80 -720Q80 -753 103.5 -776.5Q127 -800 160 -800L800 -800Q833 -800 856.5 -776.5Q880 -753 880 -720L880 -240Q880 -207 856.5 -183.5Q833 -160 800 -160ZM460 -300L404 -358L487 -440L80 -440L80 -520L487 -520L404 -602L460 -660L640 -480Z',
   insights:
     'M120 -160Q87 -160 63.5 -183.5Q40 -207 40 -240Q40 -273 63.5 -296.5Q87 -320 120 -320Q126 -320 130.5 -320Q135 -320 140 -318L322 -500Q320 -505 320 -509.5Q320 -514 320 -520Q320 -553 343.5 -576.5Q367 -600 400 -600Q433 -600 456.5 -576.5Q480 -553 480 -520Q480 -518 478 -500L580 -398Q585 -400 589.5 -400Q594 -400 600 -400Q606 -400 610.5 -400Q615 -400 620 -398L762 -540Q760 -545 760 -549.5Q760 -554 760 -560Q760 -593 783.5 -616.5Q807 -640 840 -640Q873 -640 896.5 -616.5Q920 -593 920 -560Q920 -527 896.5 -503.5Q873 -480 840 -480Q834 -480 829.5 -480Q825 -480 820 -482L678 -340Q680 -335 680 -330.5Q680 -326 680 -320Q680 -287 656.5 -263.5Q633 -240 600 -240Q567 -240 543.5 -263.5Q520 -287 520 -320Q520 -326 520 -330.5Q520 -335 522 -340L420 -442Q415 -440 410.5 -440Q406 -440 400 -440Q398 -440 380 -442L198 -260Q200 -255 200 -250.5Q200 -246 200 -240Q200 -207 176.5 -183.5Q153 -160 120 -160ZM160 -561L135 -615L81 -640L135 -665L160 -719L185 -665L239 -640L185 -615ZM600 -600L562 -682L480 -720L562 -758L600 -840L638 -758L720 -720L638 -682Z',
   lightbulb:
     'M480 -80Q447 -80 423.5 -103.5Q400 -127 400 -160L560 -160Q560 -127 536.5 -103.5Q513 -80 480 -80ZM320 -200L320 -280L640 -280L640 -200ZM330 -320Q261 -361 220.5 -430Q180 -499 180 -580Q180 -705 267.5 -792.5Q355 -880 480 -880Q605 -880 692.5 -792.5Q780 -705 780 -580Q780 -499 739.5 -430Q699 -361 630 -320ZM354 -400L606 -400Q651 -432 675.5 -479Q700 -526 700 -580Q700 -672 636 -736Q572 -800 480 -800Q388 -800 324 -736Q260 -672 260 -580Q260 -526 284.5 -479Q309 -432 354 -400ZM480 -400Q480 -400 480 -400Q480 -400 480 -400Q480 -400 480 -400Q480 -400 480 -400Q480 -400 480 -400Q480 -400 480 -400Q480 -400 480 -400Q480 -400 480 -400Z',
+  medication:
+    'M420 -260L540 -260L540 -360L640 -360L640 -480L540 -480L540 -580L420 -580L420 -480L320 -480L320 -360L420 -360ZM280 -120Q247 -120 223.5 -143.5Q200 -167 200 -200L200 -640Q200 -673 223.5 -696.5Q247 -720 280 -720L680 -720Q713 -720 736.5 -696.5Q760 -673 760 -640L760 -200Q760 -167 736.5 -143.5Q713 -120 680 -120ZM280 -200L680 -200Q680 -200 680 -200Q680 -200 680 -200L680 -640Q680 -640 680 -640Q680 -640 680 -640L280 -640Q280 -640 280 -640Q280 -640 280 -640L280 -200Q280 -200 280 -200Q280 -200 280 -200ZM240 -760L240 -840L720 -840L720 -760ZM280 -640L280 -640Q280 -640 280 -640Q280 -640 280 -640L280 -200Q280 -200 280 -200Q280 -200 280 -200L280 -200Q280 -200 280 -200Q280 -200 280 -200L280 -640Q280 -640 280 -640Q280 -640 280 -640Z',
+  no_accounts:
+    'M608 -522L422 -708Q436 -714 450.5 -717Q465 -720 480 -720Q539 -720 579.5 -679.5Q620 -639 620 -580Q620 -565 617 -550.5Q614 -536 608 -522ZM234 -276Q285 -315 348 -337.5Q411 -360 480 -360Q498 -360 514.5 -358.5Q531 -357 549 -354L461 -442Q414 -448 380.5 -481.5Q347 -515 341 -562L227 -676Q195 -635 177.5 -585.5Q160 -536 160 -480Q160 -421 179.5 -369Q199 -317 234 -276ZM732 -284Q764 -325 782 -374.5Q800 -424 800 -480Q800 -613 706.5 -706.5Q613 -800 480 -800Q424 -800 374.5 -782Q325 -764 284 -732ZM480 -80Q398 -80 325 -111.5Q252 -143 197.5 -197.5Q143 -252 111.5 -325Q80 -398 80 -480Q80 -563 111.5 -635.5Q143 -708 197.5 -762.5Q252 -817 325 -848.5Q398 -880 480 -880Q563 -880 635.5 -848.5Q708 -817 762.5 -762.5Q817 -708 848.5 -635.5Q880 -563 880 -480Q880 -398 848.5 -325Q817 -252 762.5 -197.5Q708 -143 635.5 -111.5Q563 -80 480 -80ZM480 -160Q533 -160 580 -175.5Q627 -191 666 -220Q627 -249 580 -264.5Q533 -280 480 -280Q427 -280 380 -264.5Q333 -249 294 -220Q333 -191 380 -175.5Q427 -160 480 -160ZM480 -220Q480 -220 480 -220Q480 -220 480 -220Q480 -220 480 -220Q480 -220 480 -220Q480 -220 480 -220Q480 -220 480 -220Q480 -220 480 -220Q480 -220 480 -220Z',
   person:
     'M480 -480Q414 -480 367 -527Q320 -574 320 -640Q320 -706 367 -753Q414 -800 480 -800Q546 -800 593 -753Q640 -706 640 -640Q640 -574 593 -527Q546 -480 480 -480ZM160 -160L160 -272Q160 -306 177.5 -334.5Q195 -363 224 -378Q286 -409 350 -424.5Q414 -440 480 -440Q546 -440 610 -424.5Q674 -409 736 -378Q765 -363 782.5 -334.5Q800 -306 800 -272L800 -160ZM240 -240L720 -240L720 -272Q720 -283 714.5 -292Q709 -301 700 -306Q646 -333 591 -346.5Q536 -360 480 -360Q424 -360 369 -346.5Q314 -333 260 -306Q251 -301 245.5 -292Q240 -283 240 -272ZM480 -560Q513 -560 536.5 -583.5Q560 -607 560 -640Q560 -673 536.5 -696.5Q513 -720 480 -720Q447 -720 423.5 -696.5Q400 -673 400 -640Q400 -607 423.5 -583.5Q447 -560 480 -560ZM480 -640Q480 -640 480 -640Q480 -640 480 -640Q480 -640 480 -640Q480 -640 480 -640Q480 -640 480 -640Q480 -640 480 -640Q480 -640 480 -640Q480 -640 480 -640ZM480 -240L480 -240Q480 -240 480 -240Q480 -240 480 -240Q480 -240 480 -240Q480 -240 480 -240Q480 -240 480 -240Q480 -240 480 -240Q480 -240 480 -240Q480 -240 480 -240L480 -240Z',
+  psychology:
+    'M240 -80L240 -252Q183 -304 151.5 -373.5Q120 -443 120 -520Q120 -670 225 -775Q330 -880 480 -880Q605 -880 701.5 -806.5Q798 -733 827 -615L879 -410Q884 -391 872 -375.5Q860 -360 840 -360L760 -360L760 -240Q760 -207 736.5 -183.5Q713 -160 680 -160L600 -160L600 -80L520 -80L520 -240L680 -240Q680 -240 680 -240Q680 -240 680 -240L680 -440L788 -440L750 -595Q727 -686 652 -743Q577 -800 480 -800Q364 -800 282 -719Q200 -638 200 -522Q200 -462 224.5 -408Q249 -354 294 -312L320 -288L320 -80ZM494 -440L494 -440L494 -440Q494 -440 494 -440Q494 -440 494 -440Q494 -440 494 -440Q494 -440 494 -440Q494 -440 494 -440Q494 -440 494 -440L494 -440L494 -440L494 -440Q494 -440 494 -440Q494 -440 494 -440L494 -440L494 -440ZM440 -360L520 -360L526 -410Q534 -413 540.5 -417Q547 -421 552 -426L598 -406L638 -474L598 -504Q600 -512 600 -520Q600 -528 598 -536L638 -566L598 -634L552 -614Q547 -619 540.5 -623Q534 -627 526 -630L520 -680L440 -680L434 -630Q426 -627 419.5 -623Q413 -619 408 -614L362 -634L322 -566L362 -536Q360 -528 360 -520Q360 -512 362 -504L322 -474L362 -406L408 -426Q413 -421 419.5 -417Q426 -413 434 -410ZM480 -460Q455 -460 437.5 -477.5Q420 -495 420 -520Q420 -545 437.5 -562.5Q455 -580 480 -580Q505 -580 522.5 -562.5Q540 -545 540 -520Q540 -495 522.5 -477.5Q505 -460 480 -460Z',
   remove: 'M200 -440L200 -520L760 -520L760 -440Z',
+  science:
+    'M200 -120Q149 -120 127.5 -165.5Q106 -211 138 -250L360 -520L360 -760L320 -760Q303 -760 291.5 -771.5Q280 -783 280 -800Q280 -817 291.5 -828.5Q303 -840 320 -840L640 -840Q657 -840 668.5 -828.5Q680 -817 680 -800Q680 -783 668.5 -771.5Q657 -760 640 -760L600 -760L600 -520L822 -250Q854 -211 832.5 -165.5Q811 -120 760 -120ZM200 -200L760 -200L520 -492L520 -760L440 -760L440 -492ZM480 -480L480 -480L480 -480L480 -480L480 -480L480 -480Z',
   ssid_chart:
     'M480 -120L232 -360L120 -280L120 -378L240 -464L485 -226L652 -360L840 -360L840 -280L680 -280ZM480 -480L305 -655L120 -520L120 -619L313 -760L488 -585L840 -840L840 -741Z',
+  touch_app:
+    'M419 -80Q391 -80 366.5 -92Q342 -104 325 -126L107 -403L126 -423Q146 -444 174 -448Q202 -452 226 -437L300 -392L300 -720Q300 -737 311.5 -748.5Q323 -760 340 -760Q357 -760 369 -748.5Q381 -737 381 -720L381 -248L284 -308L388 -175Q394 -168 402 -164Q410 -160 419 -160L640 -160Q673 -160 696.5 -183.5Q720 -207 720 -240L720 -400Q720 -417 708.5 -428.5Q697 -440 680 -440L461 -440L461 -520L680 -520Q730 -520 765 -485Q800 -450 800 -400L800 -240Q800 -174 753 -127Q706 -80 640 -80ZM167 -620Q154 -642 147 -667.5Q140 -693 140 -720Q140 -803 198.5 -861.5Q257 -920 340 -920Q423 -920 481.5 -861.5Q540 -803 540 -720Q540 -693 533 -667.5Q526 -642 513 -620L444 -660Q452 -674 456 -688.5Q460 -703 460 -720Q460 -770 425 -805Q390 -840 340 -840Q290 -840 255 -805Q220 -770 220 -720Q220 -703 224 -688.5Q228 -674 236 -660ZM502 -340L502 -340L502 -340L502 -340Q502 -340 502 -340Q502 -340 502 -340L502 -340Q502 -340 502 -340Q502 -340 502 -340L502 -340Q502 -340 502 -340Q502 -340 502 -340L502 -340L502 -340Z',
   tune: 'M440 -120L440 -360L520 -360L520 -280L840 -280L840 -200L520 -200L520 -120ZM120 -200L120 -280L360 -280L360 -200ZM280 -360L280 -440L120 -440L120 -520L280 -520L280 -600L360 -600L360 -360ZM440 -440L440 -520L840 -520L840 -440ZM600 -600L600 -840L680 -840L680 -760L840 -760L840 -680L680 -680L680 -600ZM120 -680L120 -760L520 -760L520 -680Z',
+  vital_signs:
+    'M360 -160Q341 -160 326 -171Q311 -182 304 -199L212 -440L40 -440L40 -520L268 -520L360 -276L544 -761Q551 -778 566 -789Q581 -800 600 -800Q619 -800 634 -789Q649 -778 656 -761L748 -520L920 -520L920 -440L692 -440L600 -684L416 -199Q409 -182 394 -171Q379 -160 360 -160Z',
+  verified:
+    'M344 -60L268 -188L124 -220L138 -368L40 -480L138 -592L124 -740L268 -772L344 -900L480 -842L616 -900L692 -772L836 -740L822 -592L920 -480L822 -368L836 -220L692 -188L616 -60L480 -118ZM378 -162L480 -206L584 -162L640 -258L750 -284L740 -396L814 -480L740 -566L750 -678L640 -702L582 -798L480 -754L376 -798L320 -702L210 -678L220 -566L146 -480L220 -396L210 -282L320 -258ZM480 -480L480 -480L480 -480L480 -480L480 -480L480 -480L480 -480L480 -480L480 -480L480 -480L480 -480L480 -480L480 -480L480 -480L480 -480L480 -480L480 -480L480 -480L480 -480L480 -480ZM438 -338L664 -564L608 -622L438 -452L352 -536L296 -480Z',
   visibility:
     'M480 -320Q555 -320 607.5 -372.5Q660 -425 660 -500Q660 -575 607.5 -627.5Q555 -680 480 -680Q405 -680 352.5 -627.5Q300 -575 300 -500Q300 -425 352.5 -372.5Q405 -320 480 -320ZM480 -392Q435 -392 403.5 -423.5Q372 -455 372 -500Q372 -545 403.5 -576.5Q435 -608 480 -608Q525 -608 556.5 -576.5Q588 -545 588 -500Q588 -455 556.5 -423.5Q525 -392 480 -392ZM480 -200Q334 -200 214 -281.5Q94 -363 40 -500Q94 -637 214 -718.5Q334 -800 480 -800Q626 -800 746 -718.5Q866 -637 920 -500Q866 -363 746 -281.5Q626 -200 480 -200ZM480 -500Q480 -500 480 -500Q480 -500 480 -500Q480 -500 480 -500Q480 -500 480 -500Q480 -500 480 -500Q480 -500 480 -500Q480 -500 480 -500Q480 -500 480 -500ZM480 -280Q593 -280 687.5 -339.5Q782 -399 832 -500Q782 -601 687.5 -660.5Q593 -720 480 -720Q367 -720 272.5 -660.5Q178 -601 128 -500Q178 -399 272.5 -339.5Q367 -280 480 -280Z',
   visibility_off:
diff --git a/app/src/pages/OnboardingPage.tsx b/app/src/pages/OnboardingPage.tsx
new file mode 100644
index 0000000..802dda1
--- /dev/null
+++ b/app/src/pages/OnboardingPage.tsx
@@ -0,0 +1,717 @@
+import { useRef, useState, type ReactNode } from 'react';
+import { useNavigate } from 'react-router';
+import { completeOnboarding } from '../auth/userRepository';
+import { useAuth } from '../auth/AuthProvider';
+import { BrandMark, Button, Card, Chip, Icon, type IconName } from '../design';
+
+/** Small mono label used by the trackers and badges across the three steps. */
+function CodeLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
+  return (
+    <span className={`font-label-code text-label-code tracking-wider uppercase ${className}`}>
+      {children}
+    </span>
+  );
+}
+
+/** Three-segment progress bar; `filled` segments are highlighted. */
+function ProgressTracker({
+  left,
+  right,
+  filled,
+}: {
+  left: React.ReactNode;
+  right: React.ReactNode;
+  filled: number;
+}) {
+  return (
+    <div className="flex flex-col gap-space-xs">
+      <div className="mb-1 flex items-center justify-between text-on-surface-variant">
+        <CodeLabel>{left}</CodeLabel>
+        <CodeLabel className="font-semibold text-primary">{right}</CodeLabel>
+      </div>
+      <div className="flex h-1.5 w-full items-center gap-1.5">
+        {[0, 1, 2].map((index) => (
+          <span
+            key={index}
+            className={`h-full flex-1 rounded-full ${index < filled ? 'bg-primary' : 'bg-surface-variant opacity-60'}`}
+          />
+        ))}
+      </div>
+    </div>
+  );
+}
+
+/** Sigla pill + icon + display name, as the design shows floating factor nodes. */
+function FactorNode({
+  sigla,
+  icon,
+  name,
+  position,
+  delay,
+}: {
+  sigla: string;
+  icon: IconName;
+  name: string;
+  position: string;
+  delay: string;
+}) {
+  return (
+    <span
+      className={`absolute flex animate-bounce items-center gap-1.5 rounded-full bg-surface-container-lowest px-2.5 py-1.5 shadow-md ${position}`}
+      style={{ animationDuration: '3s', animationDelay: delay }}
+    >
+      <span className="rounded bg-secondary/10 px-1.5 py-0.5 font-label-code text-label-code text-secondary">
+        {sigla}
+      </span>
+      <Icon name={icon} className="text-[16px] text-secondary" />
+      <span className="font-label-md text-label-md text-on-surface">{name}</span>
+    </span>
+  );
+}
+
+// Step 1 hero: floating factor nodes around the Pulsar core (design: onboarding_1_fatores).
+function FactorsHero() {
+  return (
+    <div className="relative flex w-full flex-col items-center overflow-hidden rounded-lg bg-surface-container-low p-space-lg shadow-level-1">
+      <span className="pointer-events-none absolute -top-12 -right-12 size-48 rounded-full bg-secondary-fixed/50 blur-2xl" />
+      <span className="pointer-events-none absolute -bottom-10 -left-10 size-44 rounded-full bg-primary-fixed/40 blur-2xl" />
+      <div className="relative flex h-44 w-full max-w-[280px] items-center justify-center">
+        <div className="z-10 flex size-16 items-center justify-center rounded-full bg-surface-container-lowest shadow-md">
+          <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-on-secondary shadow-sm">
+            <Icon name="science" className="text-[24px]" />
+          </span>
+        </div>
+        <svg
+          aria-hidden="true"
+          className="pointer-events-none absolute inset-0 h-full w-full"
+          viewBox="0 0 280 176"
+          fill="none"
+        >
+          <circle
+            className="text-surface-variant"
+            cx="140"
+            cy="88"
+            r="64"
+            stroke="currentColor"
+            strokeDasharray="3 3"
+            strokeWidth="1.5"
+          />
+          <line
+            className="text-secondary-fixed-dim"
+            x1="140"
+            x2="52"
+            y1="88"
+            y2="40"
+            stroke="currentColor"
+            strokeWidth="1.5"
+          />
+          <line
+            className="text-secondary-fixed-dim"
+            x1="140"
+            x2="228"
+            y1="88"
+            y2="40"
+            stroke="currentColor"
+            strokeWidth="1.5"
+          />
+          <line
+            className="text-secondary-fixed-dim"
+            x1="140"
+            x2="52"
+            y1="88"
+            y2="136"
+            stroke="currentColor"
+            strokeWidth="1.5"
+          />
+          <line
+            className="text-secondary-fixed-dim"
+            x1="140"
+            x2="228"
+            y1="88"
+            y2="136"
+            stroke="currentColor"
+            strokeWidth="1.5"
+          />
+        </svg>
+        <FactorNode sigla="CAF" icon="coffee" name="Café" position="left-2 top-3" delay="0s" />
+        <FactorNode sigla="EXE" icon="fitness_center" name="Treino" position="right-2 top-3" delay="0.4s" />
+        <FactorNode sigla="Q10" icon="medication" name="Suplemento" position="bottom-3 left-2" delay="0.2s" />
+        <FactorNode sigla="SLP" icon="bedtime" name="Leitura" position="bottom-3 right-2" delay="0.6s" />
+      </div>
+      <span className="mt-2 flex items-center gap-1.5 rounded-full bg-secondary-fixed/60 px-3 py-1">
+        <span className="size-1.5 rounded-full bg-secondary" />
+        <CodeLabel className="font-semibold text-on-secondary-fixed">Inputs Bio-Comportamentais</CodeLabel>
+      </span>
+    </div>
+  );
+}
+
+// Step 1 sandbox: illustrative examples of how quick a record feels (static demo data, not app state).
+function FactorsSandbox() {
+  const [exercise, setExercise] = useState(true);
+  const [coffee, setCoffee] = useState(2);
+  return (
+    <Card>
+      <div className="flex items-center justify-between">
+        <span className="flex items-center gap-2">
+          <Icon name="touch_app" className="text-[20px] text-secondary" />
+          <span className="font-label-lg text-label-lg text-on-surface">Exemplos práticos de registro</span>
+        </span>
+        <CodeLabel className="font-semibold text-secondary uppercase">Interativo</CodeLabel>
+      </div>
+
+      <div className="flex items-center justify-between rounded-2xl bg-surface-container-low p-space-sm">
+        <span className="flex min-w-0 items-center gap-2.5">
+          <span className="shrink-0 rounded bg-secondary/10 px-2 py-0.5 font-label-code text-label-code font-bold text-secondary">
+            EXE
+          </span>
+          <span className="flex min-w-0 flex-col">
+            <span className="truncate font-label-lg text-label-lg text-on-surface">Exercício Físico</span>
+            <span className="font-body-sm text-body-sm text-on-surface-variant">Intensidade moderada</span>
+          </span>
+        </span>
+        <span className="flex shrink-0 items-center rounded-full bg-surface-container-high p-1">
+          <Chip selected={!exercise} onClick={() => setExercise(false)}>
+            Não
+          </Chip>
+          <Chip selected={exercise} tone="factor" onClick={() => setExercise(true)}>
+            Sim
+          </Chip>
+        </span>
+      </div>
+
+      <div className="flex items-center justify-between rounded-2xl bg-surface-container-low p-space-sm">
+        <span className="flex min-w-0 items-center gap-2.5">
+          <span className="shrink-0 rounded bg-secondary/10 px-2 py-0.5 font-label-code text-label-code font-bold text-secondary">
+            CAF
+          </span>
+          <span className="flex min-w-0 flex-col">
+            <span className="truncate font-label-lg text-label-lg text-on-surface">Café Expresso</span>
+            <span className="font-body-sm text-body-sm text-on-surface-variant">Dose de cafeína</span>
+          </span>
+        </span>
+        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-container-high px-2 py-1">
+          <button
+            type="button"
+            aria-label="Diminuir dose de cafeína"
+            onClick={() => setCoffee((value) => Math.max(0, value - 1))}
+            className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface transition-transform active:scale-95"
+          >
+            <Icon name="remove" className="text-[16px]" />
+          </button>
+          <span className="min-w-[20px] text-center font-label-lg text-label-lg text-on-surface">
+            {coffee}
+          </span>
+          <span className="pr-1 font-body-sm text-body-sm text-on-surface-variant">xíc</span>
+          <button
+            type="button"
+            aria-label="Aumentar dose de cafeína"
+            onClick={() => setCoffee((value) => Math.min(10, value + 1))}
+            className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-secondary text-on-secondary transition-transform active:scale-95"
+          >
+            <Icon name="add" className="text-[16px]" />
+          </button>
+        </span>
+      </div>
+
+      <div className="flex items-center justify-between rounded-2xl bg-surface-container-low p-space-sm">
+        <span className="flex min-w-0 items-center gap-2.5">
+          <span className="shrink-0 rounded bg-secondary/10 px-2 py-0.5 font-label-code text-label-code font-bold text-secondary">
+            Q10
+          </span>
+          <span className="flex min-w-0 flex-col">
+            <span className="truncate font-label-lg text-label-lg text-on-surface">Coenzima Q10</span>
+            <span className="font-body-sm text-body-sm text-on-surface-variant">Suplementação celular</span>
+          </span>
+        </span>
+        <span className="shrink-0 rounded-full bg-surface-container-highest px-3 py-1.5 font-label-code text-label-code font-bold text-secondary">
+          200 mg
+        </span>
+      </div>
+    </Card>
+  );
+}
+
+/** Segmented 0–10 scale used by the step 2 simulator. */
+function ScaleBar({ value, color }: { value: number; color: 'primary' | 'secondary' }) {
+  const filledClass = color === 'primary' ? 'bg-primary' : 'bg-secondary';
+  const trackClass = color === 'primary' ? 'bg-primary-container' : 'bg-secondary-container';
+  return (
+    <div className="flex items-center justify-between gap-1 pt-space-xs" aria-hidden="true">
+      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) => (
+        <span
+          key={index}
+          className={`h-3 flex-1 rounded-full ${index < value ? trackClass : 'bg-surface-container-high'} ${
+            index === value - 1 ? `h-4 ${filledClass} shadow-sm` : ''
+          }`}
+        />
+      ))}
+    </div>
+  );
+}
+
+// Step 2 hero: radial bio-feedback graphic (design: onboarding_2_resultados).
+function ResultsHero() {
+  return (
+    <div className="relative my-space-xs flex size-44 items-center justify-center">
+      <span className="absolute inset-0 rounded-full bg-primary/10 blur-xl" />
+      <span className="absolute inset-2 flex items-center justify-center rounded-full bg-surface-container-low shadow-level-1">
+        <svg aria-hidden="true" className="size-36 -rotate-90" viewBox="0 0 120 120">
+          <circle
+            className="text-surface-container-high"
+            cx="60"
+            cy="60"
+            fill="none"
+            r="50"
+            stroke="currentColor"
+            strokeWidth="8"
+          />
+          <circle
+            className="text-primary-container"
+            cx="60"
+            cy="60"
+            fill="none"
+            r="50"
+            stroke="currentColor"
+            strokeDasharray="314"
+            strokeDashoffset="75"
+            strokeLinecap="round"
+            strokeWidth="8"
+          />
+          <circle
+            className="text-secondary-container"
+            cx="60"
+            cy="60"
+            fill="none"
+            r="38"
+            stroke="currentColor"
+            strokeDasharray="238"
+            strokeDashoffset="60"
+            strokeLinecap="round"
+            strokeWidth="4"
+          />
+        </svg>
+      </span>
+      <span className="relative z-10 flex size-20 flex-col items-center justify-center rounded-full bg-primary text-on-primary shadow-md">
+        <Icon name="vital_signs" className="text-[28px]" />
+        <CodeLabel className="mt-0.5 tracking-widest">RES // 02</CodeLabel>
+      </span>
+      <span className="absolute top-2 right-4 flex items-center gap-1 rounded-full bg-surface-container-highest px-space-xs py-0.5 font-label-code text-label-code text-primary shadow-level-1">
+        <span className="size-1.5 animate-ping rounded-full bg-primary" />
+        <span>+24%</span>
+      </span>
+      <span className="absolute bottom-3 left-3 rounded-full bg-secondary-fixed px-space-xs py-0.5 font-label-code text-label-code text-secondary shadow-level-1">
+        r = +0.82
+      </span>
+    </div>
+  );
+}
+
+// Step 3: factor → result convergence diagram (design: onboarding_3_associa_es).
+function ConvergenceDiagram() {
+  return (
+    <Card>
+      <div className="mb-space-md flex items-center justify-between">
+        <span className="flex items-center gap-space-xs">
+          <CodeLabel className="rounded-full bg-secondary-fixed px-2 py-0.5 text-on-secondary-fixed">
+            FAT • INSUMO
+          </CodeLabel>
+          <Icon name="arrow_forward" className="text-[16px] text-on-surface-variant" />
+          <CodeLabel className="rounded-full bg-primary-fixed px-2 py-0.5 text-on-primary-fixed">
+            RES • IMPACTO
+          </CodeLabel>
+        </span>
+        <CodeLabel className="rounded-full bg-primary-fixed/40 px-2 py-0.5 text-primary">
+          r = +0.68 (Moderada-Alta)
+        </CodeLabel>
+      </div>
+      <div className="relative flex h-28 flex-col justify-between rounded-2xl bg-surface-container-low p-2">
+        <svg
+          aria-hidden="true"
+          className="h-full w-full"
+          viewBox="0 0 320 90"
+          fill="none"
+          preserveAspectRatio="none"
+        >
+          <defs>
+            <linearGradient
+              id="onboardingFactorGrad"
+              gradientUnits="userSpaceOnUse"
+              x1="0"
+              x2="320"
+              y1="0"
+              y2="0"
+            >
+              <stop offset="0%" stopColor="#0051d5" stopOpacity="0.25" />
+              <stop offset="50%" stopColor="#0051d5" stopOpacity="0.05" />
+              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.2" />
+            </linearGradient>
+            <linearGradient
+              id="onboardingResultLine"
+              gradientUnits="userSpaceOnUse"
+              x1="0"
+              x2="320"
+              y1="0"
+              y2="0"
+            >
+              <stop offset="0%" stopColor="#0051d5" />
+              <stop offset="45%" stopColor="#316bf3" />
+              <stop offset="100%" stopColor="#630ed4" />
+            </linearGradient>
+          </defs>
+          <path
+            d="M 10,75 C 60,75 100,55 160,40 C 220,25 270,18 310,18 L 310,85 L 10,85 Z"
+            fill="url(#onboardingFactorGrad)"
+          />
+          <path
+            d="M 10,72 Q 40,65 75,70 T 145,50 T 215,32 T 310,18"
+            fill="none"
+            stroke="url(#onboardingResultLine)"
+            strokeLinecap="round"
+            strokeWidth="2.5"
+          />
+          <circle className="fill-secondary" cx="75" cy="70" r="4.5" />
+          <circle className="fill-secondary-container" cx="145" cy="50" r="4.5" />
+          <circle className="animate-pulse fill-primary" cx="215" cy="32" r="5" />
+          <circle className="fill-primary" cx="310" cy="18" r="6" />
+          <circle cx="310" cy="18" r="10" fill="none" stroke="#7c3aed" strokeOpacity="0.3" strokeWidth="2" />
+        </svg>
+        <div className="flex items-center justify-between px-1 font-label-code text-[10px] text-on-surface-variant">
+          <span>T0 • ENTRADA (EXE)</span>
+          <span className="font-semibold text-primary">T+Δ • CONVERGÊNCIA ANALÍTICA</span>
+          <span>EFEITO (NRG)</span>
+        </div>
+      </div>
+    </Card>
+  );
+}
+
+/** One "platform guarantee" row of the step 3 bento. */
+function Guarantee({
+  icon,
+  title,
+  text,
+  circle,
+}: {
+  icon: IconName;
+  title: string;
+  text: string;
+  circle: string;
+}) {
+  return (
+    <div className="flex items-center gap-space-md rounded-2xl bg-surface-container-lowest p-space-sm">
+      <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${circle}`}>
+        <Icon name={icon} className="text-[20px]" />
+      </span>
+      <span className="flex min-w-0 flex-col">
+        <h2 className="truncate font-label-lg text-label-lg text-on-surface">{title}</h2>
+        <p className="truncate font-body-sm text-body-sm text-on-surface-variant">{text}</p>
+      </span>
+    </div>
+  );
+}
+
+/**
+ * First-access tutorial: three steps (Factors, Results, Associations) following
+ * design/onboarding_1_fatores, onboarding_2_resultados and onboarding_3_associa_es.
+ * Finishing or skipping records onboardingCompleted=true and lands on the dashboard.
+ */
+export function OnboardingPage() {
+  const { user } = useAuth();
+  const navigate = useNavigate();
+  const [step, setStep] = useState(0);
+  const [finishing, setFinishing] = useState(false);
+  const [error, setError] = useState<string | null>(null);
+  // StrictMode can fire the click effect twice; only the first completion may run.
+  const inFlight = useRef(false);
+
+  async function finish() {
+    if (inFlight.current || !user) return;
+    inFlight.current = true;
+    setFinishing(true);
+    setError(null);
+    try {
+      await completeOnboarding(user.uid);
+      navigate('/dashboard', { replace: true });
+    } catch {
+      setError('Não foi possível concluir a introdução. Tente novamente.');
+      setFinishing(false);
+    }
+    inFlight.current = false;
+  }
+
+  function next() {
+    setStep((current) => Math.min(2, current + 1));
+  }
+
+  function back() {
+    setStep((current) => Math.max(0, current - 1));
+  }
+
+  return (
+    <div className="flex min-h-dvh flex-col bg-surface text-on-surface">
+      <header className="fixed inset-x-0 top-0 z-50 bg-surface/85 pt-safe shadow-[0_1px_8px_rgba(19,27,46,0.04)] backdrop-blur-xl">
+        <div className="mx-auto flex h-16 w-full max-w-(--container-app) items-center justify-between px-gutter">
+          <span className="flex items-center gap-space-sm">
+            <BrandMark />
+            <CodeLabel className="text-on-surface-variant">Pulsar</CodeLabel>
+          </span>
+          <Button variant="ghost" onClick={finish} disabled={finishing || !user} className="min-h-11">
+            Pular introdução
+          </Button>
+        </div>
+      </header>
+
+      <main className="mx-auto flex min-h-dvh w-full max-w-(--container-app) flex-col px-gutter pt-20 pb-8">
+        {step === 0 && (
+          <div className="flex flex-1 flex-col gap-space-md">
+            <ProgressTracker left="Passo 01 // 03" right="Fatores" filled={1} />
+            <FactorsHero />
+            <div className="mt-space-xs flex flex-col gap-space-xs">
+              <span className="self-start rounded-full bg-primary-fixed px-2.5 py-0.5 font-label-code text-label-code text-on-primary-fixed uppercase">
+                Passo 1 de 3 • Fatores
+              </span>
+              <h1 className="font-headline-xl-mobile text-headline-xl-mobile tracking-tight">
+                Observe sua rotina sem burocracia
+              </h1>
+              <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">
+                Fatores são hábitos, atividades e consumos do seu dia a dia. Você não precisa preencher
+                dezenas de perguntas: registre apenas o que quiser em 15 segundos.
+              </p>
+            </div>
+            <FactorsSandbox />
+            <div className="mb-space-lg flex items-start gap-space-sm rounded-2xl bg-tertiary/10 p-space-md">
+              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-tertiary text-on-tertiary">
+                <Icon name="verified" className="text-[16px]" />
+              </span>
+              <p className="font-body-sm text-body-sm leading-snug text-on-surface">
+                <strong className="font-semibold text-tertiary">Zero fricção:</strong> Nenhum campo é
+                obrigatório. Responda apenas o que fizer sentido no seu dia a dia e descubra correlações reais
+                com sua energia.
+              </p>
+            </div>
+          </div>
+        )}
+
+        {step === 1 && (
+          <div className="flex flex-1 flex-col gap-space-lg">
+            <ProgressTracker left="Passo 02 • Resultados" right="66% Concluído" filled={2} />
+            <div className="flex flex-col items-center gap-space-sm pt-space-xs text-center">
+              <ResultsHero />
+              <span className="inline-flex items-center gap-space-xs rounded-full bg-primary-fixed px-space-md py-1 text-on-primary-fixed">
+                <span className="size-2 rounded-full bg-primary" />
+                <CodeLabel>Passo 2 de 3 • Resultados</CodeLabel>
+              </span>
+              <h1 className="mt-space-xs font-headline-xl-mobile text-headline-xl-mobile tracking-tight">
+                Acompanhe como seu corpo responde
+              </h1>
+              <p className="max-w-sm font-body-md text-body-md text-on-surface-variant">
+                Resultados são os efeitos que você percebe ou afere: níveis de energia, nitidez mental, sono
+                regenerativo ou remissão de sintomas.
+              </p>
+            </div>
+            <Card>
+              <div className="flex items-center justify-between pb-space-xs">
+                <span className="flex items-center gap-space-xs">
+                  <span className="rounded-full bg-primary-fixed px-space-xs py-0.5 font-label-code text-label-code text-primary">
+                    RES
+                  </span>
+                  <span className="font-label-lg text-label-lg text-on-surface">Simulador de Percepção</span>
+                </span>
+                <CodeLabel className="text-on-surface-variant">TEMPO REAL</CodeLabel>
+              </div>
+              <div className="flex flex-col gap-space-xs rounded-2xl bg-surface-container-low p-space-md">
+                <div className="flex items-center justify-between">
+                  <span className="flex items-center gap-space-xs">
+                    <Icon name="bolt" className="text-[20px] text-primary" />
+                    <span className="font-label-md text-label-md text-on-surface">Nível de Energia</span>
+                  </span>
+                  <span className="font-headline-md text-headline-md font-bold text-primary">
+                    8<span className="font-body-sm text-body-sm text-on-surface-variant">/10</span>
+                  </span>
+                </div>
+                <ScaleBar value={8} color="primary" />
+                <div className="flex justify-between pt-0.5 font-label-code text-label-code text-on-surface-variant">
+                  <span>0 (Exaustão)</span>
+                  <span className="font-semibold text-primary">Pico de Atividade</span>
+                  <span>10 (Vigor)</span>
+                </div>
+              </div>
+              <div className="flex flex-col gap-space-xs rounded-2xl bg-surface-container-low p-space-md">
+                <div className="flex items-center justify-between">
+                  <span className="flex items-center gap-space-xs">
+                    <Icon name="psychology" className="text-[20px] text-secondary" />
+                    <span className="font-label-md text-label-md text-on-surface">Concentração / Foco</span>
+                  </span>
+                  <span className="font-headline-md text-headline-md font-bold text-secondary">
+                    7<span className="font-body-sm text-body-sm text-on-surface-variant">/10</span>
+                  </span>
+                </div>
+                <ScaleBar value={7} color="secondary" />
+                <div className="flex justify-between pt-0.5 font-label-code text-label-code text-on-surface-variant">
+                  <span>Disperso</span>
+                  <span className="font-semibold text-secondary">Flow Profundo</span>
+                  <span>Imersão</span>
+                </div>
+              </div>
+              <div className="flex items-center justify-between rounded-2xl bg-surface-container-low p-space-md">
+                <span className="flex items-center gap-space-sm">
+                  <span className="flex size-8 items-center justify-center rounded-full bg-surface-container text-on-surface">
+                    <Icon name="healing" className="text-[18px]" />
+                  </span>
+                  <span className="flex flex-col">
+                    <span className="font-label-md text-label-md text-on-surface">Dor de Cabeça</span>
+                    <span className="font-body-sm text-body-sm text-on-surface-variant">
+                      Registro binário
+                    </span>
+                  </span>
+                </span>
+                <span className="flex items-center gap-1.5 rounded-full bg-tertiary-fixed px-space-md py-1.5 text-on-tertiary-fixed shadow-level-1">
+                  <Icon name="check_circle" className="text-[16px]" />
+                  <span className="font-label-md text-label-md font-semibold">Sem sintomas</span>
+                </span>
+              </div>
+            </Card>
+            <div className="flex items-start gap-space-md rounded-lg bg-surface-container-high/60 p-space-md">
+              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary shadow-level-1">
+                <Icon name="tune" className="text-[20px]" />
+              </span>
+              <span className="flex flex-col gap-0.5">
+                <span className="font-label-lg text-label-lg font-semibold text-on-surface">
+                  Direção Desejável Personalizada
+                </span>
+                <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
+                  Você parametriza a meta de cada bio-variável: mais energia (quanto maior, melhor) ou menos
+                  estresse e dores (quanto menor, melhor). O algoritmo ajusta as correlações automaticamente.
+                </p>
+              </span>
+            </div>
+          </div>
+        )}
+
+        {step === 2 && (
+          <div className="flex flex-1 flex-col gap-space-lg">
+            <ProgressTracker left="Fase de Onboarding" right="3 de 3 Concluído" filled={3} />
+            <span className="mb-space-sm inline-flex items-center gap-space-xs self-start rounded-full bg-surface-container-high px-3 py-1 text-primary">
+              <span className="size-1.5 rounded-full bg-primary" />
+              <CodeLabel>Passo 3 de 3 • Ciência Pessoal</CodeLabel>
+            </span>
+            <div className="flex flex-col gap-space-xs">
+              <h1 className="font-headline-xl-mobile text-headline-xl-mobile tracking-tight">
+                Descubra associações reais nos seus dados
+              </h1>
+              <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">
+                O algoritmo do Pulsar cruza o que você faz com o que você sente. Sem palpites: correlações
+                matemáticas calculadas direto no seu dispositivo.
+              </p>
+            </div>
+            <ConvergenceDiagram />
+            <Card>
+              <div className="mb-space-sm flex items-center justify-between">
+                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-fixed px-2.5 py-1 font-label-code text-label-code text-on-primary-fixed">
+                  <Icon name="insights" className="text-[14px]" />
+                  <span>Possível Associação (r = +0.68)</span>
+                </span>
+                <CodeLabel className="text-on-surface-variant">N = 28 dias</CodeLabel>
+              </div>
+              <div className="mb-space-sm grid grid-cols-2 gap-space-sm">
+                <div className="flex flex-col rounded-2xl bg-surface-container-low p-space-sm">
+                  <CodeLabel className="text-on-surface-variant">COM EXERCÍCIO (EXE)</CodeLabel>
+                  <span className="mt-0.5 flex items-baseline gap-1">
+                    <span className="font-stat-display text-stat-display text-on-surface">7.4</span>
+                    <span className="font-body-sm text-body-sm text-on-surface-variant">/ 10</span>
+                  </span>
+                  <span className="mt-0.5 font-label-code text-[10px] font-semibold text-tertiary">
+                    ▲ +27% Energia Média
+                  </span>
+                </div>
+                <div className="flex flex-col rounded-2xl bg-surface-container-low p-space-sm">
+                  <CodeLabel className="text-on-surface-variant">DIAS DE REPOUSO</CodeLabel>
+                  <span className="mt-0.5 flex items-baseline gap-1">
+                    <span className="font-stat-display text-stat-display text-on-surface-variant">5.8</span>
+                    <span className="font-body-sm text-body-sm text-on-surface-variant">/ 10</span>
+                  </span>
+                  <span className="mt-0.5 font-label-code text-[10px] text-on-surface-variant">
+                    Linha Base Observada
+                  </span>
+                </div>
+              </div>
+              <p className="mb-space-xs font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
+                Nos dias com Exercício registrado, sua pontuação de energia média atingiu 7,4 vs 5,8 em
+                períodos de descanso.
+              </p>
+              <div className="flex items-start gap-1.5 pt-space-xs text-on-surface-variant">
+                <Icon name="verified" className="mt-0.5 shrink-0 text-[16px]" />
+                <p className="font-label-code text-label-code leading-tight">
+                  Rigor do Pulsar: Correlação estatística preliminar calculada por pareamento temporal. Não
+                  implica causalidade direta sem replicação contínua.
+                </p>
+              </div>
+            </Card>
+            <div className="mb-space-xl flex flex-col gap-space-xs">
+              <CodeLabel className="mb-1 text-on-surface-variant">Garantias da Plataforma</CodeLabel>
+              <Guarantee
+                icon="no_accounts"
+                title="Conta Anônima Inicial"
+                text="Comece agora mesmo no aparelho. Sem login, e-mail ou burocracia."
+                circle="bg-secondary-fixed text-on-secondary-fixed"
+              />
+              <Guarantee
+                icon="visibility_off"
+                title="Modo Siglas Imediato"
+                text="Discrição total em público: oculte textos sensíveis com um toque."
+                circle="bg-surface-container-high text-primary"
+              />
+              <Guarantee
+                icon="bolt"
+                title="15 Segundos por Dia"
+                text="Teclado de micro-pills e atalhos rápidos desenhados para uma só mão."
+                circle="bg-primary-fixed text-on-primary-fixed"
+              />
+            </div>
+          </div>
+        )}
+
+        {error && (
+          <p role="alert" className="font-body-md text-body-md text-error">
+            {error}
+          </p>
+        )}
+
+        <div className="mt-auto flex flex-col gap-space-sm pt-space-md">
+          {step === 0 ? (
+            <>
+              <Button size="lg" fullWidth icon="arrow_forward" onClick={next}>
+                Próximo: Resultados
+              </Button>
+              <Button variant="neutral" fullWidth onClick={finish} disabled={finishing || !user}>
+                Pular introdução
+              </Button>
+            </>
+          ) : (
+            <div className="flex items-center gap-space-md">
+              <Button variant="neutral" icon="arrow_back" onClick={back} disabled={finishing}>
+                Voltar
+              </Button>
+              {step === 1 ? (
+                <Button size="lg" fullWidth icon="arrow_forward" onClick={next}>
+                  Próximo: Descobertas
+                </Button>
+              ) : (
+                <Button
+                  size="lg"
+                  fullWidth
+                  icon="arrow_forward"
+                  onClick={finish}
+                  disabled={finishing || !user}
+                >
+                  Começar a Explorar
+                </Button>
+              )}
+            </div>
+          )}
+        </div>
+      </main>
+    </div>
+  );
+}
diff --git a/app/src/pages/WelcomePage.tsx b/app/src/pages/WelcomePage.tsx
deleted file mode 100644
index d87aec6..0000000
--- a/app/src/pages/WelcomePage.tsx
+++ /dev/null
@@ -1,45 +0,0 @@
-import { Link } from 'react-router';
-import { BrandMark, Icon, type IconName } from '../design';
-
-const highlights: { icon: IconName; text: string }[] = [
-  { icon: 'input', text: 'Registre fatores: hábitos e atividades do seu dia.' },
-  { icon: 'insights', text: 'Registre resultados: como você se sente.' },
-  { icon: 'analytics', text: 'Descubra possíveis relações, sem cobrança.' },
-];
-
-// Welcome screen shown on first access; the three-step tutorial replaces it in a later feature.
-export function WelcomePage() {
-  return (
-    <main className="mx-auto flex min-h-dvh w-full max-w-(--container-app) flex-col gap-space-lg px-margin py-space-xl">
-      <div className="flex items-center gap-space-sm">
-        <BrandMark />
-        <span className="font-headline-md text-headline-md tracking-tight">Pulsar</span>
-      </div>
-      <div className="flex flex-1 flex-col justify-center gap-space-md">
-        <h1 className="font-headline-xl-mobile text-headline-xl-mobile text-balance">
-          Boas-vindas ao Pulsar
-        </h1>
-        <p className="font-body-lg text-body-lg text-balance text-on-surface-variant">
-          Registre o que você faz e descubra possíveis relações com como você se sente.
-        </p>
-        <ul className="flex flex-col gap-2">
-          {highlights.map((item) => (
-            <li
-              key={item.icon}
-              className="flex items-center gap-3 rounded-lg bg-surface-container px-4 py-3 font-body-md text-body-md"
-            >
-              <Icon name={item.icon} className="text-[24px] text-primary" />
-              {item.text}
-            </li>
-          ))}
-        </ul>
-      </div>
-      <Link
-        to="/dashboard"
-        className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary-container px-5 font-label-lg text-label-lg text-on-primary shadow-md shadow-primary/20 transition-transform active:scale-[0.98]"
-      >
-        Começar
-      </Link>
-    </main>
-  );
-}
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
