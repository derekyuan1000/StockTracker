import { fetchQuote } from "./yahoo";

// In-memory FX cache. FX moves far slower than equity quotes, so a 15-minute TTL
// keeps upstream calls minimal while staying fresh enough for portfolio valuation.
const FX_TTL_MS = 15 * 60_000;
const cache = new Map<string, { rate: number; at: number }>();

/**
 * Resolve a single native-currency → GBP conversion factor.
 *
 * - "GBP" is 1:1; "GBp" (pence) is a fixed /100.
 * - Other ISO codes use Yahoo's `<CCY>GBP=X` pair, whose price is GBP per 1 unit
 *   of the base currency — exactly the native→GBP factor we need.
 * - On failure we prefer a stale cached rate, then fall back to 1 (no-op) so a
 *   missing rate never zeroes out a holding's value.
 */
export async function getFxRate(code: string): Promise<number> {
  if (code === "GBP") return 1;
  if (code === "GBp") return 1 / 100;

  const hit = cache.get(code);
  if (hit && Date.now() - hit.at < FX_TTL_MS) return hit.rate;

  try {
    const q = await fetchQuote(`${code}GBP=X`);
    if (q.lastPrice > 0) {
      cache.set(code, { rate: q.lastPrice, at: Date.now() });
      return q.lastPrice;
    }
  } catch {
    // fall through to stale/neutral handling below
  }
  if (hit) return hit.rate; // stale is better than a mispricing 1:1
  return 1;
}

/**
 * Resolve native-currency → GBP factors for a set of ISO codes in one pass.
 * De-duplicates and fetches concurrently.
 */
export async function getFxRates(codes: string[]): Promise<Record<string, number>> {
  const unique = Array.from(new Set(codes));
  const entries = await Promise.all(
    unique.map(async (code) => [code, await getFxRate(code)] as const),
  );
  return Object.fromEntries(entries);
}
