# Multi-Currency / FX Display + Web Watchlist — Design

**Date:** 2026-08-25
**Status:** Approved design; pending implementation plan
**Scope:** Two features. (1) Multi-currency with a user-selectable base currency, which
also fixes a latent mispricing bug. (2) A web Watchlist page with inline-expand rows.

---

## Background & Motivation

### The latent bug (why multi-currency is a correctness fix, not cosmetics)

The store assumes UK-listed instruments end to end:

- `src/server/market/yahoo.ts:205` collapses **every** non-pence currency to `"GBP"`:
  `currency: ((meta.currency as string) === "GBp" ? "GBp" : "GBP")`. A `$150` US stock is
  returned as `{ currency: "GBP", lastPrice: 150 }`.
- `packages/shared/src/portfolio.ts` `compute()` then divides by `d = currency==="GBp" ? 100 : 1`
  and treats that `150` as **£150** — no FX conversion.

Net effect: **foreign-currency holdings are silently mispriced** (converted 1:1). Any base-currency
display feature must fix this first, or totals stay wrong.

### The feature

Retail users hold non-GBP instruments and want to (a) see each holding in its **native** currency
and (b) view portfolio totals in a **base currency they choose** (GBP / USD / EUR / …). Selected
target behaviour (from brainstorming):

```
Base: [USD ▾]
AAPL  $150.00 (native)
VOD   £70.50 ≈ $89.40
Total (USD): $15,840.10
```

### Key constraint — the community leaderboard

`src/routes/community.tsx` aggregates entirely in GBP (`gainGBP`, `amountGBP`). It is a shared,
cross-user surface. Per-user base currency must therefore be **display-only**: all stored and
aggregated math stays in a single canonical currency (GBP), and base currency is applied at render.
This keeps users comparable and keeps server aggregation simple.

---

## Architecture — Approach A (two-layer)

**Correctness layer (canonical GBP):** capture each instrument's true native currency, fetch live
FX (native→GBP), and convert inside the market/compute path so all stored/aggregated values are
correct GBP. Fixes the bug independent of the display feature.

**Presentation layer (display-only base):** a `displayCurrency` user setting plus one `GBP→base`
rate, applied by a `fmtMoney()` helper at render sites. Native price is shown from the holding's own
currency. Leaderboard is explicitly **not** re-based.

Rejected alternatives:
- **B — base currency all the way down:** breaks the leaderboard (users in different bases become
  incomparable) and pushes FX into every server aggregation. Larger, riskier.
- **C — display-only labels, defer the correctness fix:** totals stay wrong; under-delivers on a
  base total that must actually sum.

---

## Section 1 — Data model & native currency

- **`Quote.currency`** (`src/server/market/types.ts`): change from `"GBp" | "GBP"` to a free ISO
  string. In `yahoo.ts`, stop collapsing — pass `meta.currency` through verbatim (`"USD"`, `"EUR"`,
  `"GBp"`, …).
- **`holdings.currency`** (`src/server/db/schema.ts:23`): widen the column from
  `enum ["GBp","GBP"]` to free-text ISO, still `.default("GBp")`. Holds the instrument's **native**
  currency. Drizzle migration; existing rows are all `GBp`/`GBP` so it is a no-op data-wise.
- **Cost-basis convention:** `lots.buyPrice` remains in the instrument's native unit under one rule —
  `GBp` in pence, every other currency in **major units** (dollars, euros). This mirrors the existing
  pence rule and keeps `avgBuyP` meaningful per instrument.
- **`Holding` type** (`packages/shared/src/portfolio.ts`): `currency: string`; add server-populated
  `fxToGBP: number` (native→GBP factor) so `compute()` never fetches rates. `HoldingComputed` gains
  `nativePrice` + `nativeCurrency` passthrough for display.

## Section 2 — FX rate service

- **New `src/server/market/fx.ts`:** `getFxRates(codes: string[]): Promise<Record<string, number>>`
  returning each code→GBP. Sourced from Yahoo FX pairs (`USDGBP=X`, `EURGBP=X`, …) through the
  **existing cached quote path**, inheriting caching + rate-limiting. `GBp`→GBP is the fixed `/100`;
  `GBP`→GBP is `1`.
- **Cache:** ~15 min TTL (FX moves slower than equities; limits Yahoo calls).
- **Wiring:** the portfolio service (`src/server/services/portfolio.ts`) resolves the distinct set of
  native currencies across a user's holdings, fetches those rates once, and stamps `fxToGBP` onto
  each `Holding` before `compute()`.

## Section 3 — `compute()` changes

- Generalize the per-row `d = currency==="GBp" ? 100 : 1` division to multiply by `fxToGBP`. `GBp`
  folds in as `gbpRate / 100`.
- Apply at every conversion site: `mv`, `cost`, `dayChangeGBP`, and the `prevTotal` reducer. All
  aggregates stay **GBP** — leaderboard, cash, totals unchanged in meaning.
- Pass through `nativePrice` + `nativeCurrency` on `HoldingComputed`.
- Cash stays GBP; its base-currency conversion happens only at display.

## Section 4 — Display currency setting + `fmtMoney`

- **Setting:** add `displayCurrency: string` (default `"GBP"`) to the `userSettings` table,
  the `UserSettings` type + `DEFAULT_SETTINGS` (`src/server/services/settings.ts`), and
  `UpdateSettingsSchema` (`packages/api-contracts`). Picker added to web `settings.tsx` and mobile
  `settings.tsx`.
- **One rate:** portfolio/settings responses include a single `gbpToDisplay` rate (reuse `fx.ts`,
  inverted). Internal values are already GBP, so display is a single multiply.
- **Helper:** `fmtMoney(valueGBP, { currency, rate })` in `packages/shared/src/format.ts`, alongside
  `fmtGBP`. Portfolio-value display sites switch to `fmtMoney`; `fmtGBP` stays for GBP-fixed surfaces
  (leaderboard).
- **Native price** rendered from `nativePrice`/`nativeCurrency` via `Intl.NumberFormat`.
- **Leaderboard stays GBP** — explicitly not re-based.

## Section 5 — Web Watchlist page (inline expand)

- **Route:** new `src/routes/watchlist.tsx` + `AppShell` `NAV_ITEMS` entry (`Star` icon), wired to
  the existing `GET/POST/DELETE /api/v1/watchlist`.
- **Table rows:** ticker, name, native last price, day %, base-converted value. Add-ticker input at
  top; per-row remove.
- **Inline expand on row click** (web's dialog/expand idiom): 52-week range, volume, sparkline
  (reuse `src/components/Sparkline.tsx`), plus two actions — **+ Add holding** (existing add flow)
  and **△ Set alert** (existing `src/components/PriceAlertDialog.tsx`). No new detail route.
- Uses `fmtMoney`, so the watchlist respects the chosen base currency.

## Section 6 — Testing

- **Unit (shared):** `compute()` with mixed-currency holdings + known FX → correct GBP aggregates;
  the `GBp`/`GBP` path stays byte-identical to today (regression guard). `fmtMoney` rounding/symbols.
- **Server:** `fx.ts` rate resolution + caching against a mocked Yahoo; portfolio service stamps
  `fxToGBP` for the correct currency set.
- **Migration:** existing `GBp`/`GBP` rows load unchanged.
- **Manual:** add a USD holding → confirm GBP total is correct (bug fix); flip base to USD → totals
  and watchlist re-denominate, leaderboard stays GBP.

---

## Out of scope

- Mobile stock-detail parity, mobile CSV import, mobile onboarding tour, tablet split-view
  extensions, mobile analysis depth (benchmark/correlation/rebalance). Deferred from brainstorming.
- FX on historical performance series (charts). Present values only for v1; historical FX is a
  follow-up.
- Per-user base currency on the community leaderboard (intentionally GBP-fixed).

## Migration & rollout notes

- One Drizzle migration widens `holdings.currency` to free text and adds
  `user_settings.display_currency TEXT DEFAULT 'GBP'`.
- Backward compatible: absent/legacy values default to `GBp`/`GBP` and `GBP` display, reproducing
  today's behaviour for existing users until they add a foreign holding or change base.

## Files touched (map)

- `src/server/market/types.ts` — `Quote.currency` → ISO string
- `src/server/market/yahoo.ts` — stop collapsing currency
- `src/server/market/fx.ts` — **new** FX rate service
- `src/server/db/schema.ts` — widen `holdings.currency`; add `user_settings.display_currency`
- `src/server/services/portfolio.ts` — stamp `fxToGBP`; expose `gbpToDisplay`
- `src/server/services/settings.ts` — `displayCurrency` in type + defaults
- `packages/shared/src/portfolio.ts` — `Holding`/`HoldingComputed` fields; FX in `compute()`
- `packages/shared/src/format.ts` — `fmtMoney`
- `packages/api-contracts` — `UpdateSettingsSchema`, watchlist/portfolio response types
- `src/routes/watchlist.tsx` — **new** web watchlist page
- `src/components/AppShell.tsx` — nav entry
- `src/routes/settings.tsx`, `apps/mobile/app/(tabs)/settings.tsx` — base-currency picker
- Portfolio/holdings/analysis/watchlist display sites — `fmtGBP` → `fmtMoney`
