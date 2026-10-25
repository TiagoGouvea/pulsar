---
name: Pulsar Bio-Analytics
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#4a4455'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#7b7487'
  outline-variant: '#ccc3d8'
  surface-tint: '#732ee4'
  primary: '#630ed4'
  on-primary: '#ffffff'
  primary-container: '#7c3aed'
  on-primary-container: '#ede0ff'
  inverse-primary: '#d2bbff'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#005b3d'
  on-tertiary: '#ffffff'
  tertiary-container: '#007650'
  on-tertiary-container: '#76ffc2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#eaddff'
  primary-fixed-dim: '#d2bbff'
  on-primary-fixed: '#25005a'
  on-primary-fixed-variant: '#5a00c6'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.03em
  headline-xl-mobile:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-code:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.08em
  label-lg:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  stat-display:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.03em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

The design system embodies a personal-science paradigm: analytical, empirical, and precise, yet deeply human and tactile. Designed specifically for personal experimentation, tracking, and statistical correlation discovery, the visual language avoids both clinical sterility and superficial wellness tropes. It communicates rigor, intellectual curiosity, and clarity.

The core visual style merges **Experimental High-Tech Geometry** with **Tactile Precision**:
- **Geometry & Technical Rigor:** Monospace-leaning legibility, crisp structural divisions, and data-dense information architectures allow users to audit cause-and-effect correlations at a glance.
- **Tactile Bio-Controls:** Generous, pill-shaped tap targets, segmented interactive chips, and thumb-friendly controls optimized for quick mobile data entry while on the go.
- **Analytical Energy:** Deep, focused violet surfaces act as the primary locus of results and insights, balanced by targeted indigo markers for causal inputs and factors.

## Colors

The palette establishes an immediate cognitive distinction between causal variables (**Factors**) and outcome metrics (**Results**), supported by an ultra-refined neutral canvas and high-clarity validation tones.

### Semantic Domain Mapping
- **Primary / Results (`#7C3AED`):** Expressive deep violet represents outputs, measurements, biometric outcomes, mood shifts, and statistical insights. Violet elements signal "what was observed."
- **Secondary / Factors (`#2563EB`):** Dynamic petrol/indigo represents logged habits, supplements, activities, sleep protocols, and environmental inputs. Indigo elements signal "what was executed."
- **Tertiary / Positive Correlation (`#10B981`):** Gentle emerald indicates statistically positive shifts, confirmed logs, and beneficial delta trends.
- **Warning / Low Confidence (`#F59E0B`):** Warm amber indicates small sample sizes, inconclusive data sets, or volatile correlations.
- **Neutrals (Slate Core):**
  - App Canvas: `#F8FAFC`
  - Elevated Cards & Surfaces: `#FFFFFF`
  - Subtle Borders & Dividers: `#E2E8F0`
  - Secondary Structural Borders: `#CBD5E1`
  - Subdued / Metric Labels: `#64748B`
  - High-Contrast Data Text & Headings: `#0F172A`

### Color Behavior Rules
- Never mix factor indigo and outcome violet within the same control; hue strictly denotes data origin.
- Use low-opacity tinted fills (e.g., violet at 8% opacity, indigo at 8% opacity) for badge backdrops and chart area fills to maintain an airy, daylight-adapted UI.

## Typography

Typography bridges expressive technical geometry with clinical data legibility:
- **Headlines & Metric Figures (`Space Grotesk`):** Provides sharp, mechanical cadence for titles, statistical coefficients (e.g., `r = +0.82`), and primary numerical readouts.
- **Body & Controls (`Geist`):** Delivers neutral, developer-grade clarity across micro-copy, logs, and dense analytical charts.

### Typography Rules
- **Three-Letter Metric Acronyms:** All biological abbreviations (e.g., `HRV`, `REM`, `CAF`, `GLU`) must render using `label-code` in uppercase with tracked spacing (`0.08em`).
- **Tabular Figures:** All numerical readouts, timelines, and delta indicators require proportional tabular lining to prevent layout shift during live filtering.

## Layout & Spacing

The layout operates on a mobile-first fluid grid, anchored by strict single-thumb ergonomics for the bottom 45% of the mobile viewport.

### Grid & Breakpoints
- **Mobile (`< 640px`):** Single column fluid canvas, 16px outer margins, 16px gutters. Primary logging actions and pill filters dock within the bottom thumb zone (48px to 96px above bottom screen margin).
- **Tablet (`640px - 1024px`):** 6-column grid with 20px gutters. Factor lists and correlation feeds stack alongside interactive trend graphs.
- **Desktop (`> 1024px`):** 12-column fixed-max layout (max-width 1200px) with 24px gutters. Dual-pane inspection: Factors logged on the left, correlated Results visualized on the right.

### Rhythm & Density
Use `space-sm` (8px) for tightly coupled metadata pairs (e.g., acronym tag + metric value). Use `space-lg` (20px) to separate distinct correlation cards.

## Elevation & Depth

Visual hierarchy relies on crisp borders and soft tonal layering rather than heavy ambient drop shadows, maintaining an authentic high-tech lab feel.

### Surface Hierarchy
1. **Level 0 (Base Canvas):** Background tone (`#F8FAFC`). Flat, non-interactive.
2. **Level 1 (Data Cards & Trend Panels):** `#FFFFFF` surface bordered by a clean 1px stroke of `#E2E8F0`. Layered over the canvas with an ultra-diffused shadow: `0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.02)`.
3. **Level 2 (Interactive Floating Controls & Modals):** `#FFFFFF` surface with a focused boundary shadow: `0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)`.
4. **Accent Glow (Focused Correlation Points):** Interactive data nodes emit a subtle localized aura using their semantic color at 20% opacity with a 8px blur radius.

## Shapes

The design system adopts **Pill-shaped (Level 3)** roundedness to balance mechanical precision with welcoming, tactile ergonomics.

### Curvature Tokens
- **Pill Controls (`rounded-full` / 9999px):** Chips, segment selectors, primary input toggles, and CTA buttons utilize full circular curvature.
- **Primary Cards (`rounded-lg` / 2rem):** Outer containers, correlation insight summaries, and modular dashboards.
- **Nested Micro-Elements (`rounded-md` / 1rem):** Sparkline containers, input fields, and inner grouped cards.

## Components

### Buttons
- **Primary (Log Result):** Pill-shaped, background `#7C3AED`, text `#FFFFFF`, font `Geist` semi-bold. Height: 48px on mobile for thumb accessibility. Active state reduces scale to `0.98` with a subtle deep-violet inset tint.
- **Secondary (Log Factor):** Pill-shaped, background `#2563EB`, text `#FFFFFF`.
- **Ghost/Tertiary:** Transparent fill, 1px border of `#E2E8F0`, text `#0F172A`.

### Chips & Pill Toggles
- **Binary (Yes/No) & Scales:** Rounded-full pill containers (`#F1F5F9`) housing micro-pills. Selected state transitions to solid fill (`#0F172A` for standard, `#2563EB` for factor tags) with crisp contrast text.
- **Metric Acronym Badges:** Encapsulated mini-pills (`padding: 2px 8px`) displaying 3-letter codes (`SLP`, `CAF`, `HRV`). Factor tags feature 10% indigo tint with `#1D4ED8` text; result tags feature 10% violet tint with `#6D28D9` text.

### Correlation & Insight Cards
- Built on `#FFFFFF` with `rounded-lg` (2rem) geometry and 1px `#E2E8F0` border.
- **Header:** Contains the three-letter factor badge linked by an arrow (`→`) to the result badge, followed by the computed Pearson coefficient (`r = +0.74`).
- **Body:** Sparkline trend graph rendered with an indigo factor baseline and a violet outcome wave.
- **Footer:** Natural-language synthesis (e.g., *"Caffeine after 16:00 is linked with a 24% reduction in Deep Sleep"*), set in `body-sm`.

### Checkboxes & Radio Controls
- Circular check selectors with custom 2px borders (`#CBD5E1`). When checked, fills with semantic color containing a sharp white checkmark.

### Input Fields
- Height 48px, fully rounded (pill) with 16px internal padding. 1px border in `#CBD5E1`, focusing to a 2px violet ring (`#7C3AED`) with zero offset.

### Sparklines & Trend Visualizers
- Vector paths strictly using stroke widths of 2px. Filled linear gradients fade to 0% opacity 24px below peak values.