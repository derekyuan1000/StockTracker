# Product Specification: StockTracker "Meridian" UI/UX Redesign

> Generated from brief: "Completely redesign the UI/UX of a React stock tracker app to match the design language defined in DESIGN.md."

## Vision

Transform StockTracker from a Binance-style dark trading terminal into **Meridian** — an editorial, confident portfolio experience built on the Together AI design language. The product should feel like a modern fintech publication: alternating near-black and white bands, a single luminous mint accent, a signature three-color brand gradient ribbon, and a rigorous type system that pairs a tight-tracked sans display face with an uppercase mono for all labels. The result is calm, precise, and unmistakably branded — not another generic shadcn dashboard.

This is a **redesign, not a rewrite**. All data flows, TanStack Router routes, server functions (`src/fns/*`), and query logic remain untouched. We change tokens, shells, primitives, and per-route presentation only.

---

## Design Direction

### Color palette (exact)

| Token | Light (canvas) | Dark (canvas-dark) | Usage |
|-------|----------------|--------------------|-------|
| `--canvas` | `#ffffff` | `#010120` | Page / band background |
| `--canvas-dark` | `#010120` | `#010120` | Hero + research dark bands (fixed) |
| `--surface-card` | `#ffffff` | `#0a0a2e` | Card fill |
| `--surface-elevated` | `#f6f6f8` | `#12123a` | Hover / muted fill |
| `--hairline` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.12)` | 1px borders |
| `--text-strong` | `#010120` | `#ffffff` | Headlines |
| `--text-body` | `#1a1a2e` | `#e8e8f0` | Body copy |
| `--text-muted` | `#6a6a7a` | `#9a9ab0` | Secondary |
| `--primary` | `#010120` | `#ffffff` | Black pill button (inverts on dark) |
| `--on-primary` | `#ffffff` | `#010120` | Button label |
| `--accent-mint` | `#c8f6f9` | `#c8f6f9` | Highlights, active dots, chart focus |
| `--brand-orange` | `#ff7a45` | — | Gradient stop 1 |
| `--brand-magenta` | `#e5484d` | — | Gradient stop 2 (magenta-red) |
| `--brand-periwinkle` | `#8b8bff` | — | Gradient stop 3 |
| `--up` | `#0a8f5f` | `#3ddc97` | Gains |
| `--down` | `#d6455b` | `#ff6b81` | Losses |

**Brand gradient**: `linear-gradient(100deg, #ff7a45 0%, #e5484d 48%, #8b8bff 100%)`. Used only as (a) the hero SVG ribbon, (b) the footer wordmark hairline tint, (c) thin 2px accent underlines on active data tabs. Never as a button fill or card background — restraint is the point.

### Typography

- **Display / body**: **Inter** (substitute for "The Future"). Weights 400 / 500 only. Apply `letter-spacing: -0.02em` on all display sizes (≥24px), `-0.01em` on body. Headlines use weight 500, never 700 — the tightness carries the weight.
- **Mono / labels**: **JetBrains Mono** (substitute for "PP Neue Montreal Mono"). Used for every eyebrow, button label, table header, stat label, ticker cell, and numeric value. Always `text-transform: uppercase` and `letter-spacing: +0.08em` for labels (eyebrows/buttons/headers); numeric values use `tabular-nums` without uppercase.
- **Scale**: eyebrow 12px mono-caps · body 15px · lead 18px · h3 20px · h2 32px · h1 clamp(40px, 6vw, 72px). Line-height 1.05 for h1/h2, 1.5 for body.

### Layout philosophy

Editorial **banded, single-column, max-w-1200** rather than a dense grid dashboard. Each page is a vertical sequence of full-bleed bands that alternate `canvas` (light) and `canvas-dark`. Content is constrained to `max-w-[1200px]` (down from current 1440). Section padding is 80px vertical. Cards get 24-32px interior padding. Generous whitespace; data tables are the only dense element and they earn it.

### Visual identity (anti-AI-slop directives)

- **DO**: hairline 1px borders, rounded-sm (4px) corners, flat surfaces, the mint accent used sparingly, the brand ribbon as a singular hero moment, mono-caps labels everywhere, a massive footer wordmark in gradient hairline tint.
- **DO NOT**: drop shadows on light surfaces, gradient-filled buttons, gradient card backgrounds, glassmorphism/blur, rounded-xl/2xl blobs, purple-to-blue "SaaS gradient" hero text, stock illustrations, emoji, generic 3-across icon-card feature grids, `shadow-lg` anywhere.

### Inspiration

Together AI (together.ai) primary reference; secondarily Vercel's editorial dark/light banding, Linear's type discipline, Stripe's data density restraint.

---

## Features (prioritized)

### Must-Have (Sprint 1-2)

1. **Design token layer** — Rewrite `src/styles.css` `@theme` + `:root` + `.dark` with the palette above. Add `--canvas-dark`, `--accent-mint`, three `--brand-*` stops, `--radius-xs: 3.25px`, keep `--radius-sm: 4px`. Acceptance: no hard-coded Binance yellow/`#181a20` remains anywhere in `src/`; a single-source token change flips all surfaces.

2. **Font swap** — Replace Geist with Inter in the Google Fonts `<link>` in `src/routes/__root.tsx` (line ~126) and `--font-sans` in `styles.css` (line 48). Add global `letter-spacing` base rules. Acceptance: rendered `font-family` is Inter; mono labels render JetBrains Mono uppercase.

3. **Light-first theme strategy** — Remove forced `className="dark"` from `RootShell` `<html>` (line 139). Meridian is light-first with intentional dark *bands*; the existing dark theme becomes an opt-in user preference driven by `ThemeProvider`. Acceptance: default load is the white/near-black editorial look, dark toggle still works.

4. **Button primitive redesign** (`src/components/ui/button.tsx`) — `default` variant becomes a black pill: `bg-primary text-on-primary`, `rounded-sm`, **mono-caps label** (`font-mono uppercase tracking-[0.08em] text-[13px]`), no shadow, `h-11 px-6`. Add `mint` variant (mint fill, dark text) and `ghost-line` (transparent, hairline border). Acceptance: every CTA across the app uses the new pill; labels are mono-caps.

5. **Card primitive redesign** (`src/components/ui/card.tsx`) — `rounded-sm border border-hairline`, **no shadow**, `bg-card`. `CardTitle` weight 500 tracking-tight. Add optional mono-caps eyebrow slot. Acceptance: zero `shadow` classes remain in card; borders are 1px hairline.

6. **AppShell nav redesign** — Sticky top nav that renders on `canvas-dark` while over a hero band and transitions to `canvas` (light, hairline bottom border) after scroll > hero height. Tab labels become **mono-caps**; active tab uses a 2px brand-gradient underline (replacing the yellow bar). Acceptance: scroll-linked background swap works, no layout shift, active state uses gradient.

7. **PublicShell + home hero** — Rebuild `src/routes/index.tsx` hero as a full-bleed `canvas-dark` band with the **signature brand gradient SVG ribbon**, mono-caps eyebrow, tight h1, and black-pill CTA. Stats strip and community preview move to a following light band. Acceptance: hero is dark with a real gradient ribbon SVG, not a CSS text gradient.

8. **SiteFooter wordmark banner** — Add a massive `STOCKTRACKER` (or `MERIDIAN`) wordmark spanning the footer width, rendered in brand-gradient **hairline tint** (outline/low-opacity), on a `canvas-dark` band. Keep social links + legal line. Acceptance: wordmark is visually dominant and gradient-tinted, footer sits on dark band.

### Should-Have (Sprint 3-4)

9. **Table primitive + data tables** (`src/components/ui/table.tsx`, holdings/transactions/fundamentals) — Table headers become mono-caps 12px, hairline row separators only (no zebra, no fill), numeric cells `tabular-nums` right-aligned, up/down colors from new tokens. Row hover = `surface-elevated`. Acceptance: all four data-heavy routes share one restyled table look.

10. **Dashboard route redesign** (`src/routes/dashboard.tsx`) — Reframe as banded editorial: a "portfolio value" hero stat block (dark band optional), then light bands for chart, allocation pie, and holdings table. Recharts theming updated to mint focus + brand gradient area fill; grid lines to hairline. Acceptance: charts use new palette, no yellow, band rhythm reads editorially.

11. **Research + Fundamentals dark bands** — Apply `research-band-dark` (canvas-dark) treatment to research/fundamentals hero/section headers per brief. Acceptance: these routes open with a dark band section header on-dark text.

12. **Holdings / Cash / Transactions redesign** — Consistent page header pattern (mono-caps eyebrow + tight h1 + supporting line), restyled cards/tables, black-pill primary actions, redesigned dialogs (add holding, sell) with rounded-sm and mono-caps buttons. Acceptance: CRUD flows visually consistent, dialogs match system.

13. **TickerTape restyle** — Sits under nav; mono-caps ticker symbols, mint separators or hairline dividers, up/down tokens. On dark bands it inverts. Acceptance: legible on both light and dark nav states.

14. **LoadingScreen + RouteProgress + Skeletons** — Splash uses new Logo + mint fill bar (replace yellow). Route progress bar becomes a 2px brand-gradient sweep. Skeleton shimmer tuned for light surfaces. Acceptance: no yellow in loading chrome; brand gradient progress.

### Nice-to-Have (Sprint 5+)

15. **Logo refresh** (`src/components/Logo.tsx`) — Wordmark in `--text-strong` (not yellow); the tall candlestick bar accent switches to mint or a small gradient stop. Optional monochrome-on-dark variant. Acceptance: logo reads on both bands.

16. **Community / Profiles / Welcome / Login polish** — Apply band rhythm, feed/leaderboard rows with mono-caps rank + tabular pct, login as a centered card on a dark band with gradient ribbon echo. Onboarding (welcome) as a multi-band editorial flow. Acceptance: no route retains legacy styling.

17. **Micro-interactions** — 150ms ease color transitions on nav scroll swap, tab underline slide, button hover (subtle mint ring on focus-visible), card border-brighten on hover. Respect `prefers-reduced-motion` (already scaffolded in styles.css). Acceptance: interactions feel intentional, reduced-motion honored.

18. **Empty / error / 404 states** — Re-skin `NotFoundComponent` and `ErrorComponent` in `__root.tsx` and per-route empty states to the editorial system (mono-caps, black pill, no yellow). Acceptance: 404 and error pages match the new language.

---

## 1. Design Token Mapping (styles.css / @theme)

Replace the current `@theme inline` block and `:root` / `.dark` in `src/styles.css`:

```
@theme inline {
  --radius-none: 0;
  --radius-xs: 3.25px;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-full: 9999px;

  --color-canvas: var(--canvas);
  --color-canvas-dark: var(--canvas-dark);
  --color-surface: var(--surface-card);
  --color-elevated: var(--surface-elevated);
  --color-hairline: var(--hairline);
  --color-accent-mint: var(--accent-mint);
  --color-brand-orange: #ff7a45;
  --color-brand-magenta: #e5484d;
  --color-brand-periwinkle: #8b8bff;
  /* map shadcn aliases (background/foreground/primary/...) onto the new tokens */

  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}
```

- `:root` = light editorial (white canvas, near-black text, black primary).
- `.dark` = user-opt-in dark (canvas-dark everywhere, white primary).
- Add a `.on-dark` utility class (or `data-band="dark"` scope) that forces on-dark text/hairline tokens for the fixed dark *bands* regardless of theme — so hero/research/footer bands render dark even in light theme.
- Add utility `@utility eyebrow { font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.08em; font-size: 12px; }` and `@utility mono-caps` for button/table-header labels.
- Add `--gradient-brand: linear-gradient(100deg,#ff7a45 0%,#e5484d 48%,#8b8bff 100%);`
- Keep existing keyframes; recolor `flash-up`/`flash-down` and `dot-live` to mint/token values; retarget `splash-bar` and route-progress to the brand gradient.
- Base layer: set `letter-spacing: -0.01em` on body, keep `.num` mono tabular.

## 2. Font Substitution Plan

- **`src/routes/__root.tsx`** (line ~126): change the Google Fonts href to
  `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600;700&display=swap`
  (drop Geist). Update `theme-color` meta from `#0b0e11` to `#ffffff` (light default).
- **`src/styles.css`** (line 48): `--font-sans` → Inter first.
- Global tracking rules in `@layer base` for headings (`-0.02em`) and body (`-0.01em`).
- No other font imports exist; Geist has no npm package usage to remove. Verify via grep for "Geist" after change.

## 3. Per-Route Redesign Plan

| Route | File | Redesign |
|-------|------|----------|
| Home | `routes/index.tsx` | Dark hero band + gradient ribbon SVG, mono-caps eyebrow, tight h1, black pill CTA; light stats band; community preview in light band with mono-caps tabs + gradient underline. |
| Login | `routes/login.tsx` | Centered auth card (rounded-sm hairline) on a canvas-dark band; gradient ribbon echo; mono-caps provider buttons. |
| Welcome / Onboarding | `routes/welcome.tsx` | Multi-step editorial band flow; progress as gradient; mono-caps step labels. |
| Dashboard (Summary) | `routes/dashboard.tsx` | Portfolio-value stat hero, banded sections for performance chart / allocation / holdings; Recharts retheme (mint focus, gradient area, hairline grid); range selector as mono-caps segmented control. |
| Holdings | `routes/holdings.tsx` | Page-header pattern; restyled holdings table; add-holding dialog redesign; black-pill "Add". |
| Cash | `routes/cash.tsx` | Header pattern; balance cards (hairline, no shadow); mono-caps labels; transaction-style list. |
| Transactions | `routes/transactions.tsx` | Full-width restyled table, mono-caps headers, buy/sell chips using up/down tokens, filters as mono-caps controls. |
| Research | `routes/research.tsx` | `research-band-dark` section header (on-dark); search + results restyled; mint accents on selected. |
| Fundamentals | `routes/fundamentals.tsx` | Dark band header; metric tables mono-caps; comparison layout on hairline grid. |
| Community | `routes/community.tsx` | Banded feed + leaderboard; mono-caps rank, tabular pct; profile links. |
| Profiles | `routes/profiles.$userId.tsx` | Public profile header band + holdings/trades tables restyled. |
| Settings | `routes/settings.tsx` | Form sections on hairline cards; switches/inputs restyled; black-pill save; publish-portfolio toggle. |
| 404 / Error | `routes/__root.tsx` | Editorial restyle, mono-caps, black pill, drop yellow. |

## 4. Component-by-Component Changes

- **`ui/button.tsx`**: new `cva` base `rounded-sm font-mono uppercase tracking-[0.08em]`; `default` = black pill (`bg-primary text-on-primary`, no shadow, `h-11 px-6 text-[13px]`); add `mint` and `ghost-line` variants; `link` variant keeps sentence case for inline text links only.
- **`ui/card.tsx`**: `rounded-sm border border-hairline bg-card` (remove `rounded-xl shadow`); `CardTitle` weight 500; add eyebrow support; `CardHeader/Content` padding 24-32px.
- **`ui/table.tsx`**: header cells mono-caps 12px muted; body cells 15px; remove zebra; hairline `border-b` rows; hover `bg-elevated`; numeric right-align helper.
- **`ui/input.tsx`, `select.tsx`, `dialog.tsx`, `tabs.tsx`, `badge.tsx`, `switch.tsx`**: retune radii to `rounded-sm`/`rounded-xs`, hairline borders, remove shadows, mint focus ring, mono-caps where they act as labels/tabs.
- **`AppShell.tsx`**: scroll-listener for nav band swap; mono-caps `TABS`; gradient active underline; `MarketStatus` dot → mint `dot-live`; `MY PORTFOLIO` label as eyebrow; user menu + theme toggle restyled; `max-w` → 1200.
- **`PublicShell.tsx`**: same nav treatment; Home/Community links mono-caps; sign-in as black pill / mint.
- **`SiteFooter.tsx`**: canvas-dark band; giant gradient-hairline wordmark; social icons on-dark; legal line muted.
- **`Logo.tsx`**: wordmark → `text-strong`; accent bar → mint or gradient; on-dark variant prop.
- **`TickerTape.tsx`**: mono-caps symbols, token up/down, hairline dividers, invert on dark bands.
- **`LoadingScreen.tsx` / `RouteProgress.tsx` / `Skeletons.tsx` / `Sparkline.tsx` / `StockChart.tsx`**: recolor to mint + brand gradient; charts adopt new palette; sparkline up/down tokens.

## 5. Sprint Breakdown

### Sprint 1: Foundation (tokens + type + primitives)
- Goals: establish the design system at the token/primitive layer so every downstream page inherits it.
- Features: #1 tokens, #2 fonts, #3 light-first strategy, #4 button, #5 card.
- Definition of done: default load renders white/near-black editorial base; Inter + JetBrains Mono active; buttons are black mono-caps pills; cards are hairline rounded-sm no-shadow; no Binance yellow/`#181a20` in `src/`.

### Sprint 2: Shell & signature moments
- Goals: the nav, hero, and footer that carry the brand identity.
- Features: #6 AppShell nav (scroll band swap + gradient underline), #7 PublicShell + home hero gradient ribbon, #8 footer wordmark banner.
- Definition of done: scroll-linked nav swap works with no layout shift; hero has a real gradient-ribbon SVG; footer shows a massive gradient-hairline wordmark on a dark band.

### Sprint 3: Data surfaces
- Goals: apply the system to the data-dense core.
- Features: #9 table primitive + tables, #10 dashboard redesign + Recharts retheme, #13 TickerTape.
- Definition of done: all four data routes share the restyled table; charts use mint/gradient/hairline; ticker legible on both band states.

### Sprint 4: Route coverage
- Goals: no route left in legacy styling.
- Features: #11 research/fundamentals dark bands, #12 holdings/cash/transactions + dialogs, #14 loading/progress/skeletons.
- Definition of done: every route uses the header pattern + band rhythm; dialogs/inputs match; loading chrome is gradient/mint.

### Sprint 5: Polish & edges
- Goals: craft pass.
- Features: #15 Logo, #16 community/profiles/welcome/login, #17 micro-interactions, #18 empty/error/404.
- Definition of done: transitions honor reduced-motion; all states (empty/loading/error/404) match; visual QA across light + opt-in dark themes passes.

---

## 6. Evaluation Rubric

The Evaluator scores each sprint 0-100; weighted total must reach the gate to pass. Weights sum to 1.0.

### Design Fidelity (weight: 0.30)
- Palette matches spec exactly (canvas `#ffffff` / canvas-dark `#010120`, mint `#c8f6f9`, brand gradient orange→magenta→periwinkle). No legacy Binance yellow or `#181a20` survives.
- Alternating light/dark band rhythm is present and correct; dark bands (hero, research, footer) render dark regardless of theme.
- Radii are rounded-sm (4px) family; borders are 1px hairline; **zero drop shadows on light surfaces**.
- Signature elements present: hero gradient ribbon SVG + footer gradient-hairline wordmark.

### Typography Discipline (weight: 0.20)
- Inter for display/body at weight 400/500 with negative tracking; no weight-700 headlines.
- JetBrains Mono uppercase +tracking for **all** eyebrows, button labels, table headers, stat labels; numeric values tabular.
- Type scale followed (h1 clamp 40-72px, mono-caps eyebrow 12px).

### Craft & Interaction (weight: 0.30)
- Nav scroll-linked band swap works without layout shift; active tab gradient underline animates.
- Button/card hover, focus-visible mint ring, tab underline slide feel intentional (150ms ease); `prefers-reduced-motion` respected.
- Empty / loading / error / 404 states are all styled to system; charts retheme cleanly.
- Responsive: nav, hero, tables, and bands hold from 375px to 1440px; `max-w-1200` content.

### Functional Integrity (weight: 0.20)
- **No regressions**: all routes render, TanStack Router navigation, auth gate, onboarding redirect, and all `src/fns/*` data flows work unchanged.
- CRUD flows intact: add/sell holding, cash entry, settings save, publish portfolio.
- Both default (light editorial) and opt-in dark themes render correctly; theme toggle persists.
- No console errors; build passes; no orphaned references to removed tokens/fonts.

### Sprint gate
- Pass threshold: weighted score ≥ 80, **and** Functional Integrity ≥ 85 (a beautiful but broken sprint fails). Design Fidelity < 60 is an automatic fail regardless of total (the point of the work is the redesign).

### Anti-slop automatic deductions
- Any `shadow-lg`/`shadow-xl` on a light surface: −10.
- CSS text-gradient hero headline (instead of the SVG ribbon): −10.
- Gradient-filled buttons or gradient card backgrounds: −10.
- Remaining Binance yellow (`#fcd535`/`#c99000`/`#181a20`): −15.
- Generic 3-across icon-card feature grid: −5.
