import { and, asc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { holdings, lots, portfolioMeta, quoteCache } from "@/server/db/schema";
import {
  fetchEarnings,
  fetchFundamentals,
  fetchHistory,
  fetchNews,
  fetchQuote,
} from "@/server/market/yahoo";
import { getFxRate, getFxRates } from "@/server/market/fx";
import type { HistoryRange } from "@/server/market/types";
import type { Holding } from "@stocktracker/shared";

// ─── adjustCash helper ────────────────────────────────────────────────────────

export async function adjustCash(userId: string, delta: number) {
  if (!isFinite(delta) || delta === 0) return;
  const [meta] = await db
    .select()
    .from(portfolioMeta)
    .where(eq(portfolioMeta.userId, userId))
    .limit(1);
  if (meta) {
    await db
      .update(portfolioMeta)
      .set({ cashGBP: meta.cashGBP + delta })
      .where(eq(portfolioMeta.userId, userId));
  } else {
    await db.insert(portfolioMeta).values({ userId, cashGBP: delta, realisedGL: 0 });
  }
}

// ─── getPortfolio ─────────────────────────────────────────────────────────────

export async function getPortfolio(userId: string) {
  const [holdingRows, lotRows, [meta]] = await Promise.all([
    db.select().from(holdings).where(eq(holdings.userId, userId)),
    db.select().from(lots).where(eq(lots.userId, userId)),
    db.select().from(portfolioMeta).where(eq(portfolioMeta.userId, userId)).limit(1),
  ]);

  // Aggregate lots per ticker
  const lotsByTicker = new Map<string, typeof lotRows>();
  for (const lot of lotRows) {
    const arr = lotsByTicker.get(lot.ticker) ?? [];
    arr.push(lot);
    lotsByTicker.set(lot.ticker, arr);
  }

  const enriched = await Promise.all(
    holdingRows.map(async (h) => {
      const tickerLots = lotsByTicker.get(h.ticker) ?? [];
      const totalUnits = tickerLots.reduce((s, l) => s + l.units, 0);
      const avgBuyP =
        totalUnits > 0 ? tickerLots.reduce((s, l) => s + l.buyPrice * l.units, 0) / totalUnits : 0;
      const earliest = tickerLots.map((l) => l.dateBought).sort()[0];
      const holdPeriodDays = earliest
        ? Math.floor((Date.now() - new Date(earliest).getTime()) / 86_400_000)
        : 0;

      const [quote, fund, ytdBars] = await Promise.all([
        fetchQuote(h.ticker).catch(() => null),
        fetchFundamentals(h.ticker).catch(() => null),
        fetchHistory(h.ticker, "YTD").catch(() => [] as { ts: number; close: number }[]),
      ]);
      const ytdValids = ytdBars.filter((b) => b.close > 0);
      const ytdFirst = ytdValids[0]?.close ?? 0;
      const ytdLast = ytdValids.at(-1)?.close ?? 0;
      const ytdPct = ytdFirst > 0 ? (ytdLast / ytdFirst - 1) * 100 : 0;

      // Prefer the live Yahoo name (full, up-to-date) over the stored name,
      // which may be a bare ticker or a truncated broker-CSV name. Fall back
      // to the DB name only when the quote lookup is unavailable.
      const liveName = quote?.name && quote.name !== h.ticker ? quote.name : h.name;

      return {
        ticker: h.ticker,
        name: liveName,
        bucket: h.bucket,
        sector:
          (h.sector !== "EQUITY" ? h.sector : "") ||
          (fund?.sector !== "EQUITY" ? (fund?.sector ?? "") : "") ||
          "",
        units: totalUnits,
        avgBuyP,
        // The live quote is authoritative for the instrument's native currency;
        // fall back to the stored value when the quote is unavailable. `fxToGBP`
        // is stamped in a second pass below once all currencies are known.
        currency: quote?.currency ?? h.currency,
        lastPrice: quote?.lastPrice ?? 0,
        prevClose: quote?.prevClose ?? 0,
        dayLow: quote?.dayLow ?? 0,
        dayHigh: quote?.dayHigh ?? 0,
        yearLow: quote?.yearLow ?? 0,
        yearHigh: quote?.yearHigh ?? 0,
        volume: quote?.volume ?? 0,
        avgVol3m: quote?.avgVol3m ?? 0,
        marketTime: quote?.marketTime ?? "",
        targetP: fund?.targetP ?? 0,
        allocTarget: h.allocTarget,
        holdPeriodDays,
        spark: quote?.spark ?? [],
        pe: fund?.pe,
        forwardPe: fund?.forwardPe,
        eps: fund?.eps,
        forwardEps: fund?.forwardEps,
        pegRatio: fund?.pegRatio,
        priceToBook: fund?.priceToBook,
        mktCap: fund?.mktCap,
        evEbitda: fund?.evEbitda,
        divYield: fund?.divYield,
        divRateAnnual: fund?.divRateAnnual,
        exDivDate: fund?.exDivDate,
        divPayDate: fund?.divPayDate,
        payoutRatio: fund?.payoutRatio,
        fiveYearAvgDivYield: fund?.fiveYearAvgDivYield,
        beta: fund?.beta,
        revenueGrowth: fund?.revenueGrowth,
        earningsGrowth: fund?.earningsGrowth,
        grossMargin: fund?.grossMargin,
        operatingMargin: fund?.operatingMargin,
        profitMargin: fund?.profitMargin,
        fcfYield: fund?.fcfYield,
        netDebtEbitda: fund?.netDebtEbitda,
        debtToEquity: fund?.debtToEquity,
        currentRatio: fund?.currentRatio,
        roe: fund?.roe,
        roic: fund?.roic,
        analyst: fund?.analyst,
        thesis: h.thesis || undefined,
        bearCase: h.bearCase || undefined,
        realisedGL: null,
        ytdPct,
        fxToGBP: 1, // stamped from live FX in the pass below
      } satisfies Holding;
    }),
  );

  // Stamp each holding's native→GBP factor from live FX. Rates are resolved once
  // for the distinct currency set (cached in-memory), then applied so `compute()`
  // never has to fetch. GBp/GBP fold in as /100 and 1:1 respectively.
  const fxRates = await getFxRates(enriched.map((h) => h.currency));
  for (const h of enriched) h.fxToGBP = fxRates[h.currency] ?? 1;

  return {
    holdings: enriched,
    cashGBP: meta?.cashGBP ?? 0,
    realisedGL: meta?.realisedGL ?? 0,
  };
}

// ─── getPortfolioHistory ─────────────────────────────────────────────────────

export async function getPortfolioHistory(userId: string, range: string) {
  const [holdingRows, lotRows] = await Promise.all([
    db.select().from(holdings).where(eq(holdings.userId, userId)),
    db.select().from(lots).where(eq(lots.userId, userId)),
  ]);

  const unitsByTicker = new Map<string, number>();
  const earliestBought = new Map<string, number>();
  for (const l of lotRows) {
    unitsByTicker.set(l.ticker, (unitsByTicker.get(l.ticker) ?? 0) + l.units);
    const date = new Date(l.dateBought).getTime();
    const prev = earliestBought.get(l.ticker) ?? Infinity;
    earliestBought.set(l.ticker, Math.min(prev, date));
  }

  const histories = await Promise.all(
    holdingRows.map(async (h) => {
      const units = unitsByTicker.get(h.ticker) ?? 0;
      const divisor = h.currency === "GBp" ? 100 : 1;
      const startMs = earliestBought.get(h.ticker) ?? 0;
      const bars = await fetchHistory(h.ticker, range as HistoryRange).catch(
        () => [] as { ts: number; close: number }[],
      );
      const filtered = bars
        .filter((b) => b.ts >= startMs)
        .map((b) => ({ ts: b.ts, value: (b.close / divisor) * units }));

      // 1D fallback: if no intraday bars, use the current quote so this holding
      // still contributes its full weight to the portfolio total.
      if (filtered.length === 0 && range === "1D") {
        try {
          const q = await fetchQuote(h.ticker);
          const price = q.lastPrice || q.prevClose;
          if (price > 0 && units > 0) {
            const todayMidnight = new Date();
            todayMidnight.setHours(0, 0, 0, 0);
            return [{ ts: todayMidnight.getTime(), value: (price / divisor) * units }];
          }
        } catch {}
      }

      return filtered;
    }),
  );

  if (histories.length === 0) return [] as { ts: number; value: number }[];

  // Collect all unique timestamps across all holdings, sorted
  const allTs = [...new Set(histories.flatMap((h) => h.map((p) => p.ts)))].sort((a, b) => a - b);

  // Forward-fill each holding so every timestamp has a value once the holding starts
  const tsMap = new Map<number, number>();
  for (const hist of histories) {
    if (hist.length === 0) continue;
    const byTs = new Map(hist.map((p) => [p.ts, p.value]));
    const startTs = hist[0].ts;
    let last = 0;
    for (const ts of allTs) {
      if (ts < startTs) continue; // holding didn't exist yet
      if (byTs.has(ts)) last = byTs.get(ts)!;
      if (last > 0) tsMap.set(ts, (tsMap.get(ts) ?? 0) + last);
    }
  }

  return Array.from(tsMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([ts, value]) => ({ ts, value }));
}

// ─── getPortfolioReturns ─────────────────────────────────────────────────────

export type ReturnPeriod = "1W" | "1M" | "6M" | "1Y" | "3Y";

export const RETURN_PERIODS = ["1W", "1M", "6M", "1Y", "3Y"] as const;

const PERIOD_DAYS: Record<ReturnPeriod, number> = {
  "1W": 7,
  "1M": 30,
  "6M": 182,
  "1Y": 365,
  "3Y": 1095,
};

// How far either side of a period's cut-off we still accept a price bar as the
// anchor. Daily bars only need to bridge weekends and holidays; the 3Y anchor
// comes out of the weekly 5Y series, so it needs a wider window.
const PERIOD_TOLERANCE_DAYS: Record<ReturnPeriod, number> = {
  "1W": 5,
  "1M": 7,
  "6M": 7,
  "1Y": 7,
  "3Y": 14,
};

export interface PeriodReturn {
  period: ReturnPeriod;
  pct: number;
  gbp: number;
  /** Holdings whose price history reaches back past this period's cut-off. */
  covered: number;
  /** Holdings currently held with a non-zero unit count. */
  total: number;
}

/** Nearest bar to `target` by timestamp, over a series sorted ascending. */
function nearestBar<T extends { ts: number }>(bars: T[], target: number): T {
  let lo = 0,
    hi = bars.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (bars[mid].ts < target) lo = mid + 1;
    else hi = mid;
  }
  const right = bars[lo];
  const left = bars[Math.max(0, lo - 1)];
  return Math.abs(left.ts - target) <= Math.abs(right.ts - target) ? left : right;
}

/**
 * Market return of the portfolio as it is composed *today*, measured over each
 * trailing window: current units priced at the window's start versus their
 * latest close. Cash is excluded — it does not move with the market.
 *
 * A holding whose price history does not reach a window's cut-off (a recent
 * listing, say) is left out of that window only, which is what `covered`
 * reports so the UI can flag a partial figure.
 */
export async function getPortfolioReturns(userId: string): Promise<PeriodReturn[]> {
  const [holdingRows, lotRows] = await Promise.all([
    db.select().from(holdings).where(eq(holdings.userId, userId)),
    db.select().from(lots).where(eq(lots.userId, userId)),
  ]);

  const unitsByTicker = new Map<string, number>();
  for (const l of lotRows) {
    unitsByTicker.set(l.ticker, (unitsByTicker.get(l.ticker) ?? 0) + l.units);
  }

  const held = holdingRows.filter((h) => (unitsByTicker.get(h.ticker) ?? 0) > 0);

  const series = await Promise.all(
    held.map(async (h) => {
      const units = unitsByTicker.get(h.ticker)!;
      const divisor = h.currency === "GBp" ? 100 : 1;

      // Daily bars for the last year, weekly bars for the four years before it.
      // Both go through fetchHistory's cache, so all five windows cost at most
      // two upstream lookups per holding.
      const [recent, long] = await Promise.all([
        fetchHistory(h.ticker, "1Y").catch(() => [] as { ts: number; close: number }[]),
        fetchHistory(h.ticker, "5Y").catch(() => [] as { ts: number; close: number }[]),
      ]);

      const byTs = new Map<number, number>();
      for (const b of long) if (b.close > 0) byTs.set(b.ts, b.close);
      for (const b of recent) if (b.close > 0) byTs.set(b.ts, b.close);

      return Array.from(byTs.entries())
        .sort(([a], [b]) => a - b)
        .map(([ts, close]) => ({ ts, value: (close / divisor) * units }));
    }),
  );

  const now = Date.now();

  return RETURN_PERIODS.map((period) => {
    const cutoff = now - PERIOD_DAYS[period] * 86_400_000;
    const tolerance = PERIOD_TOLERANCE_DAYS[period] * 86_400_000;

    let then = 0;
    let latest = 0;
    let covered = 0;

    for (const bars of series) {
      if (bars.length < 2) continue;
      const anchor = nearestBar(bars, cutoff);
      if (Math.abs(anchor.ts - cutoff) > tolerance) continue;
      then += anchor.value;
      latest += bars.at(-1)!.value;
      covered++;
    }

    if (covered === 0 || then <= 0) {
      return { period, pct: 0, gbp: 0, covered: 0, total: series.length };
    }
    return {
      period,
      pct: (latest / then - 1) * 100,
      gbp: latest - then,
      covered,
      total: series.length,
    };
  });
}

// ─── getBenchmarkHistory ─────────────────────────────────────────────────────

export async function getBenchmarkHistory(userId: string, ticker: string, range: string) {
  const [lotRows, holdingRows] = await Promise.all([
    db.select().from(lots).where(eq(lots.userId, userId)).orderBy(asc(lots.dateBought)),
    db.select().from(holdings).where(eq(holdings.userId, userId)),
  ]);

  if (lotRows.length === 0) return [] as { ts: number; value: number }[];

  const currencyMap = new Map(holdingRows.map((h) => [h.ticker, h.currency as "GBp" | "GBP"]));

  const sortedLots = lotRows
    .map((l) => {
      const div = currencyMap.get(l.ticker) === "GBP" ? 1 : 100;
      return { dateMs: new Date(l.dateBought).getTime(), costGBP: (l.buyPrice * l.units) / div };
    })
    .sort((a, b) => a.dateMs - b.dateMs);

  // Fetch full history (for purchase-date price lookup) and range history (for display)
  const [allBars, rangeBars] = await Promise.all([
    fetchHistory(ticker, "All" as HistoryRange).catch(() => [] as { ts: number; close: number }[]),
    fetchHistory(ticker, range as HistoryRange).catch(() => [] as { ts: number; close: number }[]),
  ]);

  if (allBars.length === 0 || rangeBars.length === 0) return [] as { ts: number; value: number }[];

  const sortedAll = [...allBars].sort((a, b) => a.ts - b.ts);

  function nearestClose(ts: number): number {
    let lo = 0,
      hi = sortedAll.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sortedAll[mid].ts < ts) lo = mid + 1;
      else hi = mid;
    }
    const l = sortedAll[Math.max(0, lo - 1)];
    const r = sortedAll[lo];
    return (Math.abs(l.ts - ts) <= Math.abs(r.ts - ts) ? l : r).close;
  }

  // Convert each lot into benchmark units bought at the purchase-date price
  const benchLots = sortedLots.map((l) => {
    const price = nearestClose(l.dateMs);
    return { dateMs: l.dateMs, units: price > 0 ? l.costGBP / price : 0 };
  });

  // For each display bar, accumulate units from all lots bought on or before that date
  return rangeBars
    .sort((a, b) => a.ts - b.ts)
    .map((bar) => {
      const totalUnits = benchLots
        .filter((l) => l.dateMs <= bar.ts)
        .reduce((s, l) => s + l.units, 0);
      return { ts: bar.ts, value: +(totalUnits * bar.close).toFixed(2) };
    });
}

// ─── saveNotes ────────────────────────────────────────────────────────────────

export async function saveNotes(
  userId: string,
  data: { ticker: string; thesis: string; bearCase: string },
) {
  await db
    .update(holdings)
    .set({ thesis: data.thesis, bearCase: data.bearCase })
    .where(and(eq(holdings.userId, userId), eq(holdings.ticker, data.ticker)));
}

// ─── getWidgetSummary ─────────────────────────────────────────────────────────

export async function getWidgetSummary(userId: string) {
  const [holdingRows, lotRows, [meta]] = await Promise.all([
    db.select().from(holdings).where(eq(holdings.userId, userId)),
    db.select().from(lots).where(eq(lots.userId, userId)),
    db.select().from(portfolioMeta).where(eq(portfolioMeta.userId, userId)).limit(1),
  ]);

  let totalGBP = meta?.cashGBP ?? 0;
  let dayChangeGBP = 0;
  let totalCostGBP = 0;

  const lotsByTicker = new Map<string, typeof lotRows>();
  for (const lot of lotRows) {
    const arr = lotsByTicker.get(lot.ticker) ?? [];
    arr.push(lot);
    lotsByTicker.set(lot.ticker, arr);
  }

  for (const h of holdingRows) {
    const tickerLots = lotsByTicker.get(h.ticker) ?? [];
    const totalUnits = tickerLots.reduce((s, l) => s + l.units, 0);
    if (totalUnits <= 0) continue;

    const [cachedQuote] = await db
      .select({ payload: quoteCache.payload })
      .from(quoteCache)
      .where(and(eq(quoteCache.ticker, h.ticker), eq(quoteCache.kind, "quote")))
      .limit(1);

    if (cachedQuote?.payload) {
      const q = cachedQuote.payload as Record<string, unknown>;
      const lastPrice = typeof q.lastPrice === "number" ? q.lastPrice : 0;
      const prevClose = typeof q.prevClose === "number" ? q.prevClose : 0;
      // Convert the native price to GBP via live FX (folds in the /100 pence rule
      // for GBp). The quote payload's currency is authoritative; fall back to the
      // stored holding currency when absent.
      const nativeCurrency = typeof q.currency === "string" ? q.currency : h.currency;
      const f = await getFxRate(nativeCurrency);
      totalGBP += lastPrice * totalUnits * f;
      if (prevClose > 0) {
        dayChangeGBP += (lastPrice - prevClose) * totalUnits * f;
      }
      // Cost basis using current FX rate (reasonable widget approximation)
      for (const lot of tickerLots) {
        if (lot.units > 0) {
          totalCostGBP += lot.buyPrice * lot.units * f;
        }
      }
    }
  }

  const dayChangePct = totalGBP > 0 ? (dayChangeGBP / (totalGBP - dayChangeGBP)) * 100 : 0;
  const lifetimeGBP = totalGBP - totalCostGBP;
  const lifetimePct = totalCostGBP > 0 ? (lifetimeGBP / totalCostGBP) * 100 : 0;

  return {
    totalGBP,
    dayChangeGBP,
    dayChangePct,
    lifetimeGBP,
    lifetimePct,
    asOf: new Date().toISOString(),
  };
}
