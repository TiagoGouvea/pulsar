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
(nenhuma)


# Papel: avaliador de código (independente)

Você é de outra família de modelo e não escreveu este código. Não edite arquivos.

Verifique:
- O código atende **de fato** aos critérios de aceite, sem implementar "para o teste" (hardcode, mocks indevidos, condicionais de teste em produção).
- Segurança (Security Rules, dados entre usuários, segredos), privacidade (nomes de indicadores só via `<IndicatorLabel>`), aderência à spec e qualidade (tipos, legibilidade, duplicação).

## Feature
```json
{
  "id": "F-0.fix-1",
  "title": "Suíte completa da etapa falhou nos gates G12",
  "description": "G12: design: performance 41 < 85",
  "acceptance": [
    "Todos os gates obrigatórios da etapa passam na suíte completa",
    "Nenhum teste protegido é alterado"
  ],
  "specRefs": []
}
```

## Gates
G1 install-build: ok
G2 lint-format: ok
G3 typecheck: ok
G4 unit: ok
G5 security-rules: pulado
G6 e2e: ok
G7 protected-tests: ok
G8 privacy-leak: pulado
G9 a11y: ok
G10 mobile-layout: ok
G11 visual-regression: pulado
G12 lighthouse: pulado
G13 secrets: ok

## Diff
```diff
diff --git a/app/AGENTS.md b/app/AGENTS.md
index f4654f6..e842c64 100644
--- a/app/AGENTS.md
+++ b/app/AGENTS.md
@@ -22,7 +22,9 @@ Leia antes de qualquer mudança: `../docs/Pulsar_Especificacao_Completa.md` (spe
 src/
   design/      tokens.css (CSS variables + @theme do Tailwind) e componentes base:
                Button, Chip, Slider, NumberInput, Toggle, Card, Sheet, EyeToggle (data-testid="eye-toggle"),
-               GroupBadge (Fator/Resultado), Icon (Material Symbols), IndicatorLabel. Exporte em design/index.ts.
+               GroupBadge (Fator/Resultado), Icon (Material Symbols em SVG; ícone novo: adicione o nome
+               em scripts/icons.ts e rode `yarn icons`, nunca importe a fonte de 3,6 MB), IndicatorLabel.
+               Exporte em design/index.ts.
   privacy/     PrivacyContext (estado global do olho) e label.ts (regra nome ↔ sigla).
   stats/       estatística pura (agregação, comparações, tendências, associações, seleção de cartões, templates).
   lib/         firebase.ts (init + emuladores), env.ts, utilitários genéricos.
diff --git a/app/CLAUDE.md b/app/CLAUDE.md
index f4654f6..e842c64 100644
--- a/app/CLAUDE.md
+++ b/app/CLAUDE.md
@@ -22,7 +22,9 @@ Leia antes de qualquer mudança: `../docs/Pulsar_Especificacao_Completa.md` (spe
 src/
   design/      tokens.css (CSS variables + @theme do Tailwind) e componentes base:
                Button, Chip, Slider, NumberInput, Toggle, Card, Sheet, EyeToggle (data-testid="eye-toggle"),
-               GroupBadge (Fator/Resultado), Icon (Material Symbols), IndicatorLabel. Exporte em design/index.ts.
+               GroupBadge (Fator/Resultado), Icon (Material Symbols em SVG; ícone novo: adicione o nome
+               em scripts/icons.ts e rode `yarn icons`, nunca importe a fonte de 3,6 MB), IndicatorLabel.
+               Exporte em design/index.ts.
   privacy/     PrivacyContext (estado global do olho) e label.ts (regra nome ↔ sigla).
   stats/       estatística pura (agregação, comparações, tendências, associações, seleção de cartões, templates).
   lib/         firebase.ts (init + emuladores), env.ts, utilitários genéricos.
diff --git a/app/package.json b/app/package.json
index 37d34be..4d7cb12 100644
--- a/app/package.json
+++ b/app/package.json
@@ -20,6 +20,7 @@
     "test:e2e": "playwright test --grep-invert @visual",
     "test:visual": "playwright test --grep @visual",
     "seed": "tsx scripts/seed.ts",
+    "icons": "tsx scripts/icons.ts && prettier --write src/design/icons.ts",
     "emulators": "firebase emulators:start --project demo-pulsar --only auth,firestore",
     "e2e:serve": "yarn build:emulator && firebase emulators:exec --project demo-pulsar --only auth,firestore \"yarn seed && yarn preview\""
   },
@@ -27,7 +28,6 @@
     "@fontsource-variable/geist": "^5.2.6",
     "@fontsource-variable/space-grotesk": "^5.2.8",
     "firebase": "^11.9.1",
-    "material-symbols": "^0.31.6",
     "react": "^19.1.0",
     "react-dom": "^19.1.0",
     "react-router": "^7.6.2"
@@ -42,6 +42,7 @@
     "@testing-library/jest-dom": "^6.6.3",
     "@testing-library/react": "^16.3.0",
     "@testing-library/user-event": "^14.6.1",
+    "@types/fontkit": "^2.0.9",
     "@types/node": "^22.15.30",
     "@types/react": "^19.1.6",
     "@types/react-dom": "^19.1.6",
@@ -53,8 +54,10 @@
     "eslint-plugin-react-refresh": "^0.4.20",
     "firebase-admin": "^13.4.0",
     "firebase-tools": "^15.34.1",
+    "fontkit": "^2.0.4",
     "globals": "^16.2.0",
     "jsdom": "^26.1.0",
+    "material-symbols": "0.31.6",
     "prettier": "^3.5.3",
     "prettier-plugin-tailwindcss": "^0.6.12",
     "tailwindcss": "^4.1.10",
diff --git a/app/scripts/icons.ts b/app/scripts/icons.ts
new file mode 100644
index 0000000..0d52372
--- /dev/null
+++ b/app/scripts/icons.ts
@@ -0,0 +1,32 @@
+// Regenerates src/design/icons.ts with the SVG paths of the Material Symbols Outlined glyphs the app uses, so the
+// bundle ships a few hundred bytes per icon instead of the 3.6 MB font (Lighthouse performance). Same glyphs the
+// font rendered (default instance). To add an icon: append its name below and run `yarn icons`.
+import { writeFileSync } from 'node:fs';
+import { openSync, type Font } from 'fontkit';
+
+const names = [
+  'add',
+  'add_circle',
+  'analytics',
+  'arrow_back',
+  'check_circle',
+  'close',
+  'input',
+  'insights',
+  'remove',
+  'visibility',
+  'visibility_off',
+];
+
+const font = openSync('node_modules/material-symbols/material-symbols-outlined.woff2') as Font;
+const entries = names.map((name) => {
+  const { glyphs } = font.layout(name);
+  if (glyphs.length !== 1 || !glyphs[0]?.path.commands.length) throw new Error(`Unknown icon: ${name}`);
+  // Font units are y-up with a 960 em; flipping y matches the SVG viewBox "0 -960 960 960".
+  return `  ${name}: '${glyphs[0].path.scale(1, -1).toSVG()}',`;
+});
+
+writeFileSync(
+  'src/design/icons.ts',
+  `// Generated by \`yarn icons\` (scripts/icons.ts). Do not edit by hand.\nexport const iconPaths = {\n${entries.join('\n')}\n} as const;\n`,
+);
diff --git a/app/src/design/Button.tsx b/app/src/design/Button.tsx
index 0981350..a8e04a5 100644
--- a/app/src/design/Button.tsx
+++ b/app/src/design/Button.tsx
@@ -1,5 +1,5 @@
 import type { ButtonHTMLAttributes } from 'react';
-import { Icon } from './Icon';
+import { Icon, type IconName } from './Icon';
 
 export type ButtonVariant = 'primary' | 'factor' | 'neutral' | 'ghost' | 'danger';
 
@@ -14,7 +14,7 @@ const variants: Record<ButtonVariant, string> = {
 interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
   variant?: ButtonVariant;
   size?: 'md' | 'lg';
-  icon?: string;
+  icon?: IconName;
   fullWidth?: boolean;
 }
 
diff --git a/app/src/design/Chip.tsx b/app/src/design/Chip.tsx
index e81be2e..c2e3495 100644
--- a/app/src/design/Chip.tsx
+++ b/app/src/design/Chip.tsx
@@ -1,5 +1,5 @@
 import type { ButtonHTMLAttributes } from 'react';
-import { Icon } from './Icon';
+import { Icon, type IconName } from './Icon';
 
 export type Tone = 'factor' | 'result' | 'neutral';
 
@@ -12,7 +12,7 @@ const selectedTone: Record<Tone, string> = {
 interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
   selected?: boolean;
   tone?: Tone;
-  icon?: string;
+  icon?: IconName;
 }
 
 // Pill toggle used for Sim/Não, ordinal options and quick picks. Selection is exposed via aria-pressed.
diff --git a/app/src/design/Icon.tsx b/app/src/design/Icon.tsx
index c98297f..a3f67cf 100644
--- a/app/src/design/Icon.tsx
+++ b/app/src/design/Icon.tsx
@@ -1,8 +1,17 @@
-// Material Symbols Outlined (self-hosted). Decorative by default: pair it with visible text or an aria-label.
-export function Icon({ name, className = '' }: { name: string; className?: string }) {
+import { iconPaths } from './icons';
+
+export type IconName = keyof typeof iconPaths;
+
+// Material Symbols Outlined glyph as inline SVG (paths from scripts/icons.ts), sized by font-size like the font.
+// Decorative by default: pair it with visible text or an aria-label.
+export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
   return (
-    <span aria-hidden="true" className={`material-symbols-outlined leading-none select-none ${className}`}>
-      {name}
-    </span>
+    <svg
+      aria-hidden="true"
+      viewBox="0 -960 960 960"
+      className={`inline-block size-[1em] shrink-0 fill-current select-none ${className}`}
+    >
+      <path d={iconPaths[name]} />
+    </svg>
   );
 }
diff --git a/app/src/design/icons.ts b/app/src/design/icons.ts
new file mode 100644
index 0000000..0fb9d11
--- /dev/null
+++ b/app/src/design/icons.ts
@@ -0,0 +1,22 @@
+// Generated by `yarn icons` (scripts/icons.ts). Do not edit by hand.
+export const iconPaths = {
+  add: 'M440 -440L200 -440L200 -520L440 -520L440 -760L520 -760L520 -520L760 -520L760 -440L520 -440L520 -200L440 -200Z',
+  add_circle:
+    'M440 -280L520 -280L520 -440L680 -440L680 -520L520 -520L520 -680L440 -680L440 -520L280 -520L280 -440L440 -440ZM480 -80Q397 -80 324 -111.5Q251 -143 197 -197Q143 -251 111.5 -324Q80 -397 80 -480Q80 -563 111.5 -636Q143 -709 197 -763Q251 -817 324 -848.5Q397 -880 480 -880Q563 -880 636 -848.5Q709 -817 763 -763Q817 -709 848.5 -636Q880 -563 880 -480Q880 -397 848.5 -324Q817 -251 763 -197Q709 -143 636 -111.5Q563 -80 480 -80ZM480 -160Q614 -160 707 -253Q800 -346 800 -480Q800 -614 707 -707Q614 -800 480 -800Q346 -800 253 -707Q160 -614 160 -480Q160 -346 253 -253Q346 -160 480 -160ZM480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Z',
+  analytics:
+    'M280 -280L360 -280L360 -480L280 -480ZM600 -280L680 -280L680 -680L600 -680ZM440 -280L520 -280L520 -400L440 -400ZM440 -480L520 -480L520 -560L440 -560ZM200 -120Q167 -120 143.5 -143.5Q120 -167 120 -200L120 -760Q120 -793 143.5 -816.5Q167 -840 200 -840L760 -840Q793 -840 816.5 -816.5Q840 -793 840 -760L840 -200Q840 -167 816.5 -143.5Q793 -120 760 -120ZM200 -200L760 -200Q760 -200 760 -200Q760 -200 760 -200L760 -760Q760 -760 760 -760Q760 -760 760 -760L200 -760Q200 -760 200 -760Q200 -760 200 -760L200 -200Q200 -200 200 -200Q200 -200 200 -200ZM200 -760L200 -760Q200 -760 200 -760Q200 -760 200 -760L200 -200Q200 -200 200 -200Q200 -200 200 -200L200 -200Q200 -200 200 -200Q200 -200 200 -200L200 -760Q200 -760 200 -760Q200 -760 200 -760Z',
+  arrow_back: 'M313 -440L537 -216L480 -160L160 -480L480 -800L537 -744L313 -520L800 -520L800 -440Z',
+  check_circle:
+    'M424 -296L706 -578L650 -634L424 -408L310 -522L254 -466ZM480 -80Q397 -80 324 -111.5Q251 -143 197 -197Q143 -251 111.5 -324Q80 -397 80 -480Q80 -563 111.5 -636Q143 -709 197 -763Q251 -817 324 -848.5Q397 -880 480 -880Q563 -880 636 -848.5Q709 -817 763 -763Q817 -709 848.5 -636Q880 -563 880 -480Q880 -397 848.5 -324Q817 -251 763 -197Q709 -143 636 -111.5Q563 -80 480 -80ZM480 -160Q614 -160 707 -253Q800 -346 800 -480Q800 -614 707 -707Q614 -800 480 -800Q346 -800 253 -707Q160 -614 160 -480Q160 -346 253 -253Q346 -160 480 -160ZM480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Q480 -480 480 -480Z',
+  close:
+    'M256 -200L200 -256L424 -480L200 -704L256 -760L480 -536L704 -760L760 -704L536 -480L760 -256L704 -200L480 -424Z',
+  input:
+    'M160 -160Q127 -160 103.5 -183.5Q80 -207 80 -240L80 -360L160 -360L160 -240Q160 -240 160 -240Q160 -240 160 -240L800 -240Q800 -240 800 -240Q800 -240 800 -240L800 -720Q800 -720 800 -720Q800 -720 800 -720L160 -720Q160 -720 160 -720Q160 -720 160 -720L160 -600L80 -600L80 -720Q80 -753 103.5 -776.5Q127 -800 160 -800L800 -800Q833 -800 856.5 -776.5Q880 -753 880 -720L880 -240Q880 -207 856.5 -183.5Q833 -160 800 -160ZM460 -300L404 -358L487 -440L80 -440L80 -520L487 -520L404 -602L460 -660L640 -480Z',
+  insights:
+    'M120 -160Q87 -160 63.5 -183.5Q40 -207 40 -240Q40 -273 63.5 -296.5Q87 -320 120 -320Q126 -320 130.5 -320Q135 -320 140 -318L322 -500Q320 -505 320 -509.5Q320 -514 320 -520Q320 -553 343.5 -576.5Q367 -600 400 -600Q433 -600 456.5 -576.5Q480 -553 480 -520Q480 -518 478 -500L580 -398Q585 -400 589.5 -400Q594 -400 600 -400Q606 -400 610.5 -400Q615 -400 620 -398L762 -540Q760 -545 760 -549.5Q760 -554 760 -560Q760 -593 783.5 -616.5Q807 -640 840 -640Q873 -640 896.5 -616.5Q920 -593 920 -560Q920 -527 896.5 -503.5Q873 -480 840 -480Q834 -480 829.5 -480Q825 -480 820 -482L678 -340Q680 -335 680 -330.5Q680 -326 680 -320Q680 -287 656.5 -263.5Q633 -240 600 -240Q567 -240 543.5 -263.5Q520 -287 520 -320Q520 -326 520 -330.5Q520 -335 522 -340L420 -442Q415 -440 410.5 -440Q406 -440 400 -440Q398 -440 380 -442L198 -260Q200 -255 200 -250.5Q200 -246 200 -240Q200 -207 176.5 -183.5Q153 -160 120 -160ZM160 -561L135 -615L81 -640L135 -665L160 -719L185 -665L239 -640L185 -615ZM600 -600L562 -682L480 -720L562 -758L600 -840L638 -758L720 -720L638 -682Z',
+  remove: 'M200 -440L200 -520L760 -520L760 -440Z',
+  visibility:
+    'M480 -320Q555 -320 607.5 -372.5Q660 -425 660 -500Q660 -575 607.5 -627.5Q555 -680 480 -680Q405 -680 352.5 -627.5Q300 -575 300 -500Q300 -425 352.5 -372.5Q405 -320 480 -320ZM480 -392Q435 -392 403.5 -423.5Q372 -455 372 -500Q372 -545 403.5 -576.5Q435 -608 480 -608Q525 -608 556.5 -576.5Q588 -545 588 -500Q588 -455 556.5 -423.5Q525 -392 480 -392ZM480 -200Q334 -200 214 -281.5Q94 -363 40 -500Q94 -637 214 -718.5Q334 -800 480 -800Q626 -800 746 -718.5Q866 -637 920 -500Q866 -363 746 -281.5Q626 -200 480 -200ZM480 -500Q480 -500 480 -500Q480 -500 480 -500Q480 -500 480 -500Q480 -500 480 -500Q480 -500 480 -500Q480 -500 480 -500Q480 -500 480 -500Q480 -500 480 -500ZM480 -280Q593 -280 687.5 -339.5Q782 -399 832 -500Q782 -601 687.5 -660.5Q593 -720 480 -720Q367 -720 272.5 -660.5Q178 -601 128 -500Q178 -399 272.5 -339.5Q367 -280 480 -280Z',
+  visibility_off:
+    'M644 -428L586 -486Q595 -533 559 -574Q523 -615 466 -606L408 -664Q425 -672 442.5 -676Q460 -680 480 -680Q555 -680 607.5 -627.5Q660 -575 660 -500Q660 -480 656 -462.5Q652 -445 644 -428ZM772 -302L714 -358Q752 -387 781.5 -421.5Q811 -456 832 -500Q782 -601 688.5 -660.5Q595 -720 480 -720Q451 -720 423 -716Q395 -712 368 -704L306 -766Q347 -783 390 -791.5Q433 -800 480 -800Q631 -800 749 -716.5Q867 -633 920 -500Q897 -441 859.5 -390.5Q822 -340 772 -302ZM792 -56L624 -222Q589 -211 553.5 -205.5Q518 -200 480 -200Q329 -200 211 -283.5Q93 -367 40 -500Q61 -553 93 -598.5Q125 -644 166 -680L56 -792L112 -848L848 -112ZM222 -624Q193 -598 169 -567Q145 -536 128 -500Q178 -399 271.5 -339.5Q365 -280 480 -280Q500 -280 519 -282.5Q538 -285 558 -288L522 -326Q511 -323 501 -321.5Q491 -320 480 -320Q405 -320 352.5 -372.5Q300 -425 300 -500Q300 -511 301.5 -521Q303 -531 306 -542ZM541 -531L541 -531Q541 -531 541 -531Q541 -531 541 -531Q541 -531 541 -531Q541 -531 541 -531Q541 -531 541 -531Q541 -531 541 -531ZM390 -456Q390 -456 390 -456Q390 -456 390 -456L390 -456Q390 -456 390 -456Q390 -456 390 -456Q390 -456 390 -456Q390 -456 390 -456Z',
+} as const;
diff --git a/app/src/design/index.ts b/app/src/design/index.ts
index 627d9c1..2b858e1 100644
--- a/app/src/design/index.ts
+++ b/app/src/design/index.ts
@@ -3,7 +3,7 @@ export { Card } from './Card';
 export { Chip, type Tone } from './Chip';
 export { EyeToggle } from './EyeToggle';
 export { GroupBadge, type IndicatorGroup } from './GroupBadge';
-export { Icon } from './Icon';
+export { Icon, type IconName } from './Icon';
 export { IndicatorLabel } from './IndicatorLabel';
 export { NumberInput } from './NumberInput';
 export { Sheet } from './Sheet';
diff --git a/app/src/design/tokens.css b/app/src/design/tokens.css
index 93ff710..2af1eaf 100644
--- a/app/src/design/tokens.css
+++ b/app/src/design/tokens.css
@@ -7,7 +7,6 @@
 @import 'tailwindcss';
 @import '@fontsource-variable/geist/wght.css';
 @import '@fontsource-variable/space-grotesk/wght.css';
-@import 'material-symbols/outlined.css';
 
 @theme {
   /* Colors (Material-style roles used by the mockups) */
diff --git a/app/yarn.lock b/app/yarn.lock
index ee829a8..fb2846d 100644
--- a/app/yarn.lock
+++ b/app/yarn.lock
@@ -1671,6 +1671,13 @@
     color "^5.0.2"
     text-hex "1.0.x"
 
+"@swc/helpers@^0.5.12":
+  version "0.5.23"
+  resolved "https://registry.yarnpkg.com/@swc/helpers/-/helpers-0.5.23.tgz#19287d0d86d962b111376039a50c792902c9a86a"
+  integrity sha512-5lSsMOTXURePglDfvuAQUqkGek9Hg2kksOYay2m0+XR++b2NWYL/4sWyuvVBIs8oKnJaxkdi9whaL/sqN13afw==
+  dependencies:
+    tslib "^2.8.0"
+
 "@tailwindcss/node@4.3.3":
   version "4.3.3"
   resolved "https://registry.yarnpkg.com/@tailwindcss/node/-/node-4.3.3.tgz#38ff04309ff036ea3589a7bad9069c44ec9d3883"
@@ -1889,6 +1896,13 @@
   resolved "https://registry.yarnpkg.com/@types/estree/-/estree-1.0.9.tgz#cf3f0e876d7bee15a93ab925b82bf570a3904a24"
   integrity sha512-GhdPgy1el4/ImP05X05Uw4cw2/M93BCUmnEvWZNStlCzEKME4Fkk+YpoA5OiHNQmoS7Cafb8Xa3Pya8m1Qrzeg==
 
+"@types/fontkit@^2.0.9":
+  version "2.0.9"
+  resolved "https://registry.yarnpkg.com/@types/fontkit/-/fontkit-2.0.9.tgz#36ab81bca3c425115dd96c0dd65dc6183369390c"
+  integrity sha512-qNYerFky3muCmZPq+R+B3cUDRA5OONw/oh6aGGFxx2LOBz6yu8eamKusrhkHnC6rc2fm76+G9z9QoWSB2SaQaw==
+  dependencies:
+    "@types/node" "*"
+
 "@types/json-schema@^7.0.15", "@types/json-schema@^7.0.6":
   version "7.0.15"
   resolved "https://registry.yarnpkg.com/@types/json-schema/-/json-schema-7.0.15.tgz#596a1747233694d50f6ad8a7869fcb6f56cf5841"
@@ -2440,7 +2454,7 @@ bare-url@^2.2.2:
   dependencies:
     bare-path "^3.0.0"
 
-base64-js@^1.3.0, base64-js@^1.3.1:
+base64-js@^1.1.2, base64-js@^1.3.0, base64-js@^1.3.1:
   version "1.5.1"
   resolved "https://registry.yarnpkg.com/base64-js/-/base64-js-1.5.1.tgz#1b1b440160a5bf7ad40b650f095963481903930a"
   integrity sha512-AKpaYlHn8t4SVbOHCy+b5+KKgvR4vrsD8vbvrbiQJps7fKDTkjkDry6ji0rUJjC0kzbNePLwzxq8iypo41qeWA==
@@ -2559,6 +2573,13 @@ braces@~3.0.2:
   dependencies:
     fill-range "^7.1.1"
 
+brotli@^1.3.2:
+  version "1.3.3"
+  resolved "https://registry.yarnpkg.com/brotli/-/brotli-1.3.3.tgz#7365d8cc00f12cf765d2b2c898716bcf4b604d48"
+  integrity sha512-oTKjJdShmDuGW94SyyaoQvAjf30dZaHnjJ8uAF+u2/vGJkJbJPJAT1gDiOJP5v1Zb6f9KEyW/1HpuaWIXtGHPg==
+  dependencies:
+    base64-js "^1.1.2"
+
 browserslist@^4.24.0:
   version "4.29.4"
   resolved "https://registry.yarnpkg.com/browserslist/-/browserslist-4.29.4.tgz#c1efdbce30bc57a44e5a4bd849ff8e64d6a141b2"
@@ -2779,6 +2800,11 @@ clone@^1.0.2:
   resolved "https://registry.yarnpkg.com/clone/-/clone-1.0.4.tgz#da309cc263df15994c688ca902179ca3c7cd7c7e"
   integrity sha512-JQHZ2QMW6l3aH/j6xCqQThY/9OH4D/9ls34cgkUBiEeocRTU04tHfKPBsUK1PqZCUQM7GiA0IIXJSuXHI64Kbg==
 
+clone@^2.1.2:
+  version "2.1.2"
+  resolved "https://registry.yarnpkg.com/clone/-/clone-2.1.2.tgz#1b7f4b9f591f1e8f83670401600345a02887435f"
+  integrity sha512-3Pe/CF1Nn94hyhIYpjtiLhdCoEoz0DqQ+988E9gmeEdQZlojxnOb74wctFyuwWQHzqyf9X7C7MG8juUpqBJT8w==
+
 color-convert@^2.0.1:
   version "2.0.1"
   resolved "https://registry.yarnpkg.com/color-convert/-/color-convert-2.0.1.tgz#72d3a68d598c9bdb3af2ad1e84f21d896abd4de3"
@@ -3120,6 +3146,11 @@ detect-libc@^2.0.3:
   resolved "https://registry.yarnpkg.com/detect-libc/-/detect-libc-2.1.2.tgz#689c5dcdc1900ef5583a4cb9f6d7b473742074ad"
   integrity sha512-Btj2BOOO83o3WyH59e8MgXsxEQVcarkUOpEYrubB0urwnN10yQ364rsiByU11nZlqWYZm05i/of7io4mzihBtQ==
 
+dfa@^1.2.0:
+  version "1.2.0"
+  resolved "https://registry.yarnpkg.com/dfa/-/dfa-1.2.0.tgz#96ac3204e2d29c49ea5b57af8d92c2ae12790657"
+  integrity sha512-ED3jP8saaweFTjeGX8HQPjeC1YYyZs98jGNZx6IiBvxW7JG5v492kamAQB3m2wop07CvU/RQmzcKr6bgcC5D/Q==
+
 discontinuous-range@1.0.0:
   version "1.0.0"
   resolved "https://registry.yarnpkg.com/discontinuous-range/-/discontinuous-range-1.0.0.tgz#e38331f0844bba49b9a9cb71c771585aab1bc65a"
@@ -3884,6 +3915,21 @@ fn.name@1.x.x:
   resolved "https://registry.yarnpkg.com/fn.name/-/fn.name-1.1.0.tgz#26cad8017967aea8731bc42961d04a3d5988accc"
   integrity sha512-GRnmB5gPyJpAhTQdSZTSp9uaPSvl09KoYcMQtsB9rQoOmzs9dH6ffeccH+Z+cv6P68Hu5bC6JjRh4Ah/mHSNRw==
 
+fontkit@^2.0.4:
+  version "2.0.4"
+  resolved "https://registry.yarnpkg.com/fontkit/-/fontkit-2.0.4.tgz#4765d664c68b49b5d6feb6bd1051ee49d8ec5ab0"
+  integrity sha512-syetQadaUEDNdxdugga9CpEYVaQIxOwk7GlwZWWZ19//qW4zE5bknOKeMBDYAASwnpaSHKJITRLMF9m1fp3s6g==
+  dependencies:
+    "@swc/helpers" "^0.5.12"
+    brotli "^1.3.2"
+    clone "^2.1.2"
+    dfa "^1.2.0"
+    fast-deep-equal "^3.1.3"
+    restructure "^3.0.0"
+    tiny-inflate "^1.0.3"
+    unicode-properties "^1.4.0"
+    unicode-trie "^2.0.0"
+
 foreground-child@^3.1.0:
   version "3.3.1"
   resolved "https://registry.yarnpkg.com/foreground-child/-/foreground-child-3.3.1.tgz#32e8e9ed1b68a3497befb9ac2b6adf92a638576f"
@@ -5175,10 +5221,10 @@ marked@^13.0.2:
   resolved "https://registry.yarnpkg.com/marked/-/marked-13.0.3.tgz#5c5b4a5d0198060c7c9bc6ef9420a7fed30f822d"
   integrity sha512-rqRix3/TWzE9rIoFGIn8JmsVfhiuC8VIQ8IdX5TfzmeBucdY05/0UlzKaw0eVtpcN/OdVFpBk7CjKGo9iHJ/zA==
 
-material-symbols@^0.31.6:
-  version "0.31.9"
-  resolved "https://registry.yarnpkg.com/material-symbols/-/material-symbols-0.31.9.tgz#1359e9f9b9429db9f7f0c43003d933f218e4e560"
-  integrity sha512-WCuJh+pgPtOq3scouRkztK+RBRj4XGHe2Jy2F8xD5T/dyLn09nP1fCJib0sf92jD/OaTE4C8/dzgIc54FkDDqA==
+material-symbols@0.31.6:
+  version "0.31.6"
+  resolved "https://registry.yarnpkg.com/material-symbols/-/material-symbols-0.31.6.tgz#a1a36582ca42d41f06067cb6ed4ee76d7e14b9e3"
+  integrity sha512-1DOrk8HTrOvEc/0PBwUAh8Zfh2Oi6Q/VOQ23BxJb7IClp6zdLf2KnRANqsAmNattQtIQqDrHKTF1o3jx1TIR3w==
 
 math-intrinsics@^1.1.0:
   version "1.1.0"
@@ -5592,6 +5638,11 @@ package-json-from-dist@^1.0.0:
   resolved "https://registry.yarnpkg.com/package-json-from-dist/-/package-json-from-dist-1.0.1.tgz#4f1471a010827a86f94cfd9b0727e36d267de505"
   integrity sha512-UEZIS3/by4OC8vL3P2dTXRETpebLI2NiI5vIrjaD/5UtrkFX/tNbwjTSRAGC/+7CAo2pIcBaRgWmcBBHcsaCIw==
 
+pako@^0.2.5:
+  version "0.2.9"
+  resolved "https://registry.yarnpkg.com/pako/-/pako-0.2.9.tgz#f3f7522f4ef782348da8161bad9ecfd51bf83a75"
+  integrity sha512-NUcwaKxUxWrZLpDG+z/xZaCgQITkA/Dv4V/T6bw7VON6l1Xz/VnrBqrYjZQ12TamKHzITTfOEIYUj48y2KXImA==
+
 parent-module@^1.0.0:
   version "1.0.1"
   resolved "https://registry.yarnpkg.com/parent-module/-/parent-module-1.0.1.tgz#691d2709e78c79fae3a156622452d00762caaaa2"
@@ -6112,6 +6163,11 @@ restore-cursor@^3.1.0:
     onetime "^5.1.0"
     signal-exit "^3.0.2"
 
+restructure@^3.0.0:
+  version "3.0.2"
+  resolved "https://registry.yarnpkg.com/restructure/-/restructure-3.0.2.tgz#e6b2fad214f78edee21797fa8160fef50eb9b49a"
+  integrity sha512-gSfoiOEA0VPE6Tukkrr7I0RBdE0s7H1eFCDBk05l1KIQT1UIKNc5JZy6jdyW6eYH3aR3g5b3PuL77rq0hvwtAw==
+
 ret@~0.1.10:
   version "0.1.15"
   resolved "https://registry.yarnpkg.com/ret/-/ret-0.1.15.tgz#b8a4825d5bdb1fc3f6f53c2bc33f81388681c7bc"
@@ -6691,6 +6747,11 @@ thenify-all@^1.0.0:
   dependencies:
     any-promise "^1.0.0"
 
+tiny-inflate@^1.0.0, tiny-inflate@^1.0.3:
+  version "1.0.3"
+  resolved "https://registry.yarnpkg.com/tiny-inflate/-/tiny-inflate-1.0.3.tgz#122715494913a1805166aaf7c93467933eea26c4"
+  integrity sha512-pkY1fj1cKHb2seWDy0B16HeWyczlJA9/WW3u3c4z/NiWDsO3DOU5D7nhTLE9CF0yXv/QZFY7sEJmj24dK+Rrqw==
+
 tinybench@^2.9.0:
   version "2.9.0"
   resolved "https://registry.yarnpkg.com/tinybench/-/tinybench-2.9.0.tgz#103c9f8ba6d7237a47ab6dd1dcff77251863426b"
@@ -6789,7 +6850,7 @@ ts-api-utils@^2.5.0:
   resolved "https://registry.yarnpkg.com/ts-api-utils/-/ts-api-utils-2.5.0.tgz#4acd4a155e22734990a5ed1fe9e97f113bcb37c1"
   integrity sha512-OJ/ibxhPlqrMM0UiNHJ/0CKQkoKF243/AEmplt3qpRgkW8VG7IfOS41h7V8TjITqdByHzrjcS/2si+y4lIh8NA==
 
-tslib@^2.1.0, tslib@^2.4.0, tslib@^2.8.1:
+tslib@^2.1.0, tslib@^2.4.0, tslib@^2.8.0, tslib@^2.8.1:
   version "2.8.1"
   resolved "https://registry.yarnpkg.com/tslib/-/tslib-2.8.1.tgz#612efe4ed235d567e8aba5f2a5fab70280ade83f"
   integrity sha512-oJFu94HQb+KVduSUQL7wnpmqnfmLsOA/nAh6b6EH0wCEoK0/mPeXU6c3wKDV83MkOuHPRHtSXKKU99IBazS/2w==
@@ -6884,6 +6945,22 @@ unicode-emoji-modifier-base@^1.0.0:
   resolved "https://registry.yarnpkg.com/unicode-emoji-modifier-base/-/unicode-emoji-modifier-base-1.0.0.tgz#dbbd5b54ba30f287e2a8d5a249da6c0cef369459"
   integrity sha512-yLSH4py7oFH3oG/9K+XWrz1pSi3dfUrWEnInbxMfArOfc1+33BlGPQtLsOYwvdMy11AwUBetYuaRxSPqgkq+8g==
 
+unicode-properties@^1.4.0:
+  version "1.4.1"
+  resolved "https://registry.yarnpkg.com/unicode-properties/-/unicode-properties-1.4.1.tgz#96a9cffb7e619a0dc7368c28da27e05fc8f9be5f"
+  integrity sha512-CLjCCLQ6UuMxWnbIylkisbRj31qxHPAurvena/0iwSVbQ2G1VY5/HjV0IRabOEbDHlzZlRdCrD4NhB0JtU40Pg==
+  dependencies:
+    base64-js "^1.3.0"
+    unicode-trie "^2.0.0"
+
+unicode-trie@^2.0.0:
+  version "2.0.0"
+  resolved "https://registry.yarnpkg.com/unicode-trie/-/unicode-trie-2.0.0.tgz#8fd8845696e2e14a8b67d78fa9e0dd2cad62fec8"
+  integrity sha512-x7bc76x0bm4prf1VLg79uhAzKw8DVboClSN5VxJuQ+LKDOVEW9CdH+VY7SP+vX7xCYQqzzgQpFqz15zeLvAtZQ==
+  dependencies:
+    pako "^0.2.5"
+    tiny-inflate "^1.0.0"
+
 unique-string@^2.0.0:
   version "2.0.0"
   resolved "https://registry.yarnpkg.com/unique-string/-/unique-string-2.0.0.tgz#39c6451f81afb2749de2b233e3f7c5e8843bd89d"
```

Responda SOMENTE com o bloco ```json:
{"pass": true|false, "score": 0-10, "issues": [{"severidade": "blocker|major|minor", "arquivo": "…", "descricao": "…", "sugestao": "…"}]}

Reprove (`pass: false`) se houver qualquer `blocker` ou score < 7.
