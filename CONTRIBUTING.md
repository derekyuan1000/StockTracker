# Contributing

This document covers the conventions we use across the entire codebase — web and mobile. Following them keeps the code readable and diffs small.

---

## Code style

Formatting is enforced by Prettier and linting by ESLint. Run both before pushing:

```bash
bun run format   # Prettier — fixes formatting
bun run lint     # ESLint — flags code issues
```

**Prettier config** (`.prettierrc`):
- 100-character line width
- Double quotes for strings
- Semicolons required
- Trailing commas everywhere (`"all"`)

Do not override these per-file. If a line genuinely needs to be longer than 100 characters, it usually means the logic should be split up.

---

## TypeScript

- Explicit return types on exported functions and server functions.
- Avoid `any`. Use `unknown` and narrow it, or model the data properly with Zod.
- Don't assert with `as X` unless you have no other option — prefer type guards.
- Prefer `type` over `interface` for object shapes. Use `interface` only when you need declaration merging.
- `null` for intentionally absent values, `undefined` for optional. Don't mix them.

---

## React components

- Functional components only — no class components.
- One component per file. File name matches the component name in PascalCase: `UserCard.tsx`.
- Export components as named exports (`export function Foo() {}`), not default exports — except TanStack route components which use `component: Foo`.
- Keep components focused. If a component needs more than ~150 lines, it's probably doing too much.
- Prefer `useMemo` and `useCallback` only when the computation is genuinely expensive or the reference stability is needed by a child. Don't sprinkle them everywhere.

**Hook rules**

- Custom hooks go in `src/lib/` or co-located with the component if only used there.
- Name hooks `use<Thing>` and keep them to one concern.
- Native event listeners (wheel, pointer, keyboard) must be added/removed via `useEffect`, not React event props, when you need `{ passive: false }` or fine-grained control.

---

## File and folder conventions

| Thing | Convention | Example |
|---|---|---|
| Component files | PascalCase | `TechnicalChart.tsx` |
| Utility/helper files | kebab-case | `format-currency.ts` |
| Route files | TanStack flat — kebab-case | `technical.tsx`, `profiles.$userId.tsx` |
| Server function files | kebab-case in `fns/` | `fns/holdings.ts` |
| Server-only modules | suffix `.server.ts` | `market/yahoo.server.ts` |

---

## Server functions and API

- Data fetching that touches the database goes in `src/fns/` as TanStack Start server functions (`createServerFn`).
- Keep server functions thin — call into `src/server/services/` for logic that's more than a few lines.
- Database access via Drizzle only. No raw SQL strings except inside `sql` tagged template literals from `drizzle-orm`.
- Quote cache entries (`quoteCache` table) are the only place raw market API responses live. Everything above that layer works with typed, normalised data.

---

## Styling

- Tailwind utility classes for everything. No inline `style` objects unless a value is genuinely dynamic (e.g. computed chart widths).
- Use CSS variables from the design system (e.g. `var(--surface-elevated)`, `var(--brand-periwinkle)`) for colours that have semantic meaning. Don't hardcode hex values.
- Use the `cn()` helper from `src/lib/utils.ts` for conditional class names.
- Radix UI primitives for interactive components (dialogs, selects, alerts). Don't build custom focus/keyboard handling from scratch.

---

## Comments

Default to no comments. Add one only when the **why** is non-obvious — a hidden constraint, a workaround for a specific browser or library bug, or a subtle invariant. Never comment what the code already says with good names.

Good:
```ts
// { passive: false } required — React's onWheel is passive and can't preventDefault
el.addEventListener("wheel", handler, { passive: false });
```

Bad:
```ts
// add event listener for wheel events
el.addEventListener("wheel", handler);
```

---

## Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add RSI indicator to technical chart
fix: correct GBp→GBP conversion for portfolio totals
refactor: extract lot calculation into shared utility
chore: update drizzle-orm to 0.46
```

Keep the subject line under 72 characters. If the change needs more explanation, add a blank line and a body paragraph — don't cram it into the subject.

One logical change per commit. Mixing a feature and a refactor in the same commit makes history hard to read and reverts painful.

---

## Pull requests

- Open a PR against `master`.
- Title follows the same Conventional Commits format as commits.
- Describe **what** changed and **why**, not how (the diff shows how).
- If the PR touches the database schema, include the migration file and note whether it's safe to run against production without downtime.
- Screenshots or a short screen recording for any UI change.

---