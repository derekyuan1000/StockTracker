import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db/client";
import { cashFlows, holdings, lots, portfolioMeta, quoteCache, trades } from "@/server/db/schema";
import { authMiddleware } from "@/fns/_middleware";
import {
  fetchEarnings,
  fetchFundamentals,
  fetchHistory,
  fetchNews,
  fetchQuote,
  searchSymbols,
} from "@/server/market/yahoo";
import type { HistoryRange } from "@/server/market/types";
import type { Holding } from "@/data/portfolio";

// ─── getPortfolio ─────────────────────────────────────────────────────────────

export const getPortfolio = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { userId } = context;
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
          totalUnits > 0
            ? tickerLots.reduce((s, l) => s + l.buyPrice * l.units, 0) / totalUnits
            : 0;
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
          currency: h.currency,
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
        } satisfies Holding;
      }),
    );

    return {
      holdings: enriched,
      cashGBP: meta?.cashGBP ?? 0,
      realisedGL: meta?.realisedGL ?? 0,
    };
  });

// ─── adjustCash helper ────────────────────────────────────────────────────────

async function adjustCash(userId: string, delta: number) {
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

// ─── addHolding ───────────────────────────────────────────────────────────────

const AddHoldingSchema = z.object({
  ticker: z
    .string()
    .min(1)
    .max(20)
    .transform((s) => s.toUpperCase()),
  units: z.number().positive(),
  dateBought: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  price: z.number().positive().optional(), // pence; auto-detect if omitted
  bucket: z.enum(["Fund", "Stock"] as const).default("Stock"),
  allocTarget: z.number().min(0).max(100).default(0),
  deductCash: z.boolean().default(false),
});

export const addHolding = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) => AddHoldingSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { ticker, units, dateBought, price, bucket, allocTarget, deductCash } = data;

    const [existing] = await db
      .select()
      .from(holdings)
      .where(and(eq(holdings.userId, userId), eq(holdings.ticker, ticker)))
      .limit(1);

    let currency: "GBp" | "GBP" = existing?.currency ?? "GBp";
    let name = existing?.name ?? ticker;

    if (!existing) {
      name = ticker;
      let sector = "";
      try {
        const q = await fetchQuote(ticker);
        name = q.name;
        currency = q.currency;
      } catch {}
      try {
        const f = await fetchFundamentals(ticker);
        sector = f.sector ?? "";
      } catch {}
      await db.insert(holdings).values({
        userId,
        ticker,
        name,
        bucket,
        sector,
        currency,
        allocTarget,
        thesis: "",
        bearCase: "",
      });
    }

    // Auto-detect buy price from history if not provided
    let buyPrice = price;
    if (!buyPrice) {
      try {
        const history = await fetchHistory(ticker, "1Y");
        const target = new Date(dateBought).getTime();
        const bar = history.reduce((best, b) =>
          Math.abs(b.ts - target) < Math.abs(best.ts - target) ? b : best,
        );
        buyPrice = bar.close || (await fetchQuote(ticker)).lastPrice;
      } catch {
        buyPrice = 0;
      }
    }

    await db.insert(lots).values({ userId, ticker, units, buyPrice, dateBought });

    if (deductCash && buyPrice) {
      const divisor = currency === "GBP" ? 1 : 100;
      const amountGBP = (buyPrice * units) / divisor;
      await adjustCash(userId, -amountGBP);
      await db.insert(trades).values({
        userId,
        type: "buy",
        ticker,
        name,
        units,
        price: buyPrice,
        amountGBP,
        date: dateBought,
      });
    }
  });

// ─── searchTicker ─────────────────────────────────────────────────────────────

export const searchTicker = createServerFn()
  .middleware([authMiddleware])
  .validator((raw: unknown) => z.object({ query: z.string().min(1) }).parse(raw))
  .handler(async ({ data }) => searchSymbols(data.query));

// ─── addLot ───────────────────────────────────────────────────────────────────

export const addLot = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) =>
    z
      .object({
        ticker: z.string(),
        units: z.number().positive(),
        price: z.number().positive(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    await db.insert(lots).values({
      userId,
      ticker: data.ticker,
      units: data.units,
      buyPrice: data.price,
      dateBought: data.date,
    });

    // Deduct cost from available cash
    const [holding] = await db
      .select()
      .from(holdings)
      .where(and(eq(holdings.userId, userId), eq(holdings.ticker, data.ticker)))
      .limit(1);
    const currency = holding?.currency ?? "GBp";
    const costGBP = (data.price * data.units) / (currency === "GBp" ? 100 : 1);
    await adjustCash(userId, -costGBP);
  });

// ─── sellUnits ────────────────────────────────────────────────────────────────

export const sellUnits = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) =>
    z
      .object({
        ticker: z.string(),
        units: z.number().positive(),
        price: z.number().positive(), // sell price in pence (GBp) or GBP
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const [holding] = await db
      .select()
      .from(holdings)
      .where(and(eq(holdings.userId, userId), eq(holdings.ticker, data.ticker)))
      .limit(1);
    const currency = holding?.currency ?? "GBp";

    const tickerLots = await db
      .select()
      .from(lots)
      .where(and(eq(lots.userId, userId), eq(lots.ticker, data.ticker)))
      .orderBy(asc(lots.dateBought));

    const totalUnits = tickerLots.reduce((s, l) => s + l.units, 0);

    if (data.units >= totalUnits) {
      // Selling entire position — cascade-deletes lots via FK
      await db
        .delete(holdings)
        .where(and(eq(holdings.userId, userId), eq(holdings.ticker, data.ticker)));
    } else {
      // Partial sell: FIFO reduction
      let remaining = data.units;
      for (const lot of tickerLots) {
        if (remaining <= 0) break;
        if (lot.units <= remaining) {
          await db.delete(lots).where(eq(lots.id, lot.id));
          remaining -= lot.units;
        } else {
          await db
            .update(lots)
            .set({ units: lot.units - remaining })
            .where(eq(lots.id, lot.id));
          remaining = 0;
        }
      }
    }

    // Credit proceeds to available cash
    const proceedsGBP = (data.price * data.units) / (currency === "GBp" ? 100 : 1);
    await adjustCash(userId, proceedsGBP);

    return { closed: data.units >= totalUnits };
  });

// ─── deleteHolding ───────────────────────────────────────────────────────────

export const deleteHolding = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) => z.object({ ticker: z.string() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    // lots cascade-delete via FK onDelete:'cascade'
    await db
      .delete(holdings)
      .where(and(eq(holdings.userId, userId), eq(holdings.ticker, data.ticker)));
  });

// ─── getTransactions ─────────────────────────────────────────────────────────

export const getTransactions = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { userId } = context;
    const [lotRows, holdingRows] = await Promise.all([
      db
        .select()
        .from(lots)
        .where(eq(lots.userId, userId))
        .orderBy(desc(lots.dateBought), desc(lots.id)),
      db.select().from(holdings).where(eq(holdings.userId, userId)),
    ]);

    const holdingByTicker = new Map(holdingRows.map((h) => [h.ticker, h]));
    const tickers = [...new Set(lotRows.map((l) => l.ticker))];
    const quoteArr = await Promise.all(tickers.map((t) => fetchQuote(t).catch(() => null)));
    const quoteByTicker = new Map(tickers.map((t, i) => [t, quoteArr[i]]));

    return lotRows.map((lot) => {
      const holding = holdingByTicker.get(lot.ticker);
      const quote = quoteByTicker.get(lot.ticker);
      const divisor = holding?.currency === "GBP" ? 1 : 100;
      const costGBP = (lot.buyPrice * lot.units) / divisor;
      const lastPrice = quote?.lastPrice ?? 0;
      const valueGBP = (lastPrice * lot.units) / divisor;
      const gainGBP = valueGBP - costGBP;
      return {
        id: lot.id,
        ticker: lot.ticker,
        name: holding?.name ?? lot.ticker,
        units: lot.units,
        buyPrice: lot.buyPrice,
        dateBought: lot.dateBought,
        costGBP,
        lastPrice,
        valueGBP,
        gainGBP,
        gainPct: costGBP > 0 ? (gainGBP / costGBP) * 100 : 0,
      };
    });
  });

// ─── updateLot ───────────────────────────────────────────────────────────────

export const updateLot = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) =>
    z
      .object({
        id: z.number(),
        units: z.number().positive(),
        price: z.number().positive(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    await db
      .update(lots)
      .set({ units: data.units, buyPrice: data.price, dateBought: data.date })
      .where(and(eq(lots.id, data.id), eq(lots.userId, userId)));
  });

// ─── deleteLot ───────────────────────────────────────────────────────────────

export const deleteLot = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) => z.object({ id: z.number() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const [lot] = await db
      .select()
      .from(lots)
      .where(and(eq(lots.id, data.id), eq(lots.userId, userId)))
      .limit(1);
    if (!lot) return;
    await db.delete(lots).where(and(eq(lots.id, data.id), eq(lots.userId, userId)));
    const [remaining] = await db
      .select()
      .from(lots)
      .where(and(eq(lots.userId, userId), eq(lots.ticker, lot.ticker)))
      .limit(1);
    if (!remaining) {
      await db
        .delete(holdings)
        .where(and(eq(holdings.userId, userId), eq(holdings.ticker, lot.ticker)));
    }
  });

// ─── updateCash ──────────────────────────────────────────────────────────────

export const updateCash = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) => z.object({ delta: z.number() }).parse(raw))
  .handler(async ({ data, context }) => {
    await adjustCash(context.userId, data.delta);
  });

// ─── saveNotes ────────────────────────────────────────────────────────────────

export const saveNotes = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) =>
    z.object({ ticker: z.string(), thesis: z.string(), bearCase: z.string() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    await db
      .update(holdings)
      .set({ thesis: data.thesis, bearCase: data.bearCase })
      .where(and(eq(holdings.userId, userId), eq(holdings.ticker, data.ticker)));
  });

// ─── getBenchmarkHistory ─────────────────────────────────────────────────────

export const getBenchmarkHistory = createServerFn()
  .middleware([authMiddleware])
  .validator((raw: unknown) =>
    z.object({ ticker: z.string().min(1).max(20), range: z.string() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
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
      fetchHistory(data.ticker, "All" as HistoryRange).catch(
        () => [] as { ts: number; close: number }[],
      ),
      fetchHistory(data.ticker, data.range as HistoryRange).catch(
        () => [] as { ts: number; close: number }[],
      ),
    ]);

    if (allBars.length === 0 || rangeBars.length === 0)
      return [] as { ts: number; value: number }[];

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
  });

// ─── getPortfolioHistory ─────────────────────────────────────────────────────

const RANGES = ["1D", "5D", "1M", "6M", "YTD", "1Y", "All"] as const;

export const getPortfolioHistory = createServerFn()
  .middleware([authMiddleware])
  .validator((raw: unknown) => z.object({ range: z.enum(RANGES) }).parse(raw))
  .handler(async ({ data, context }) => {
    const { userId } = context;
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
        const bars = await fetchHistory(h.ticker, data.range as HistoryRange).catch(
          () => [] as { ts: number; close: number }[],
        );
        const filtered = bars
          .filter((b) => b.ts >= startMs)
          .map((b) => ({ ts: b.ts, value: (b.close / divisor) * units }));

        // 1D fallback: if no intraday bars, use the current quote so this holding
        // still contributes its full weight to the portfolio total.
        if (filtered.length === 0 && data.range === "1D") {
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
  });

// ─── Cash flow CRUD ───────────────────────────────────────────────────────────

export const getCashFlows = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { userId } = context;
    const [flows, [meta]] = await Promise.all([
      db
        .select()
        .from(cashFlows)
        .where(eq(cashFlows.userId, userId))
        .orderBy(desc(cashFlows.date), desc(cashFlows.createdAt)),
      db.select().from(portfolioMeta).where(eq(portfolioMeta.userId, userId)).limit(1),
    ]);
    return { flows, cashGBP: meta?.cashGBP ?? 0 };
  });

export const addCashFlow = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) =>
    z
      .object({
        type: z.enum(["deposit", "withdrawal"]),
        amountGBP: z.number().positive(),
        note: z.string().max(200).default(""),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const delta = data.type === "deposit" ? data.amountGBP : -data.amountGBP;
    await db.insert(cashFlows).values({
      userId,
      type: data.type,
      amountGBP: data.amountGBP,
      note: data.note,
      date: data.date,
    });
    await adjustCash(userId, delta);
  });

export const deleteCashFlow = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) => z.object({ id: z.number().int() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const [flow] = await db
      .select()
      .from(cashFlows)
      .where(and(eq(cashFlows.id, data.id), eq(cashFlows.userId, userId)))
      .limit(1);
    if (!flow) return;
    const delta = flow.type === "deposit" ? -flow.amountGBP : flow.amountGBP;
    await db.delete(cashFlows).where(and(eq(cashFlows.id, data.id), eq(cashFlows.userId, userId)));
    await adjustCash(userId, delta);
  });

// ─── setCashBalance ──────────────────────────────────────────────────────────
// Directly sets the cash balance to a specific value (used to correct
// balances that were miscalculated by historical portfolio imports).

export const setCashBalance = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) => z.object({ amountGBP: z.number() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const [meta] = await db
      .select()
      .from(portfolioMeta)
      .where(eq(portfolioMeta.userId, userId))
      .limit(1);
    if (meta) {
      await db
        .update(portfolioMeta)
        .set({ cashGBP: data.amountGBP })
        .where(eq(portfolioMeta.userId, userId));
    } else {
      await db.insert(portfolioMeta).values({ userId, cashGBP: data.amountGBP, realisedGL: 0 });
    }
  });

// ─── trades CRUD ─────────────────────────────────────────────────────────────

export const getTrades = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { userId } = context;
    const [tradeRows, holdingRows] = await Promise.all([
      db
        .select()
        .from(trades)
        .where(eq(trades.userId, userId))
        .orderBy(desc(trades.date), desc(trades.createdAt)),
      db
        .select({ ticker: holdings.ticker, name: holdings.name })
        .from(holdings)
        .where(eq(holdings.userId, userId)),
    ]);
    const nameMap = new Map(holdingRows.map((h) => [h.ticker, h.name]));
    return tradeRows.map((t) => ({
      ...t,
      name: t.name || nameMap.get(t.ticker) || t.ticker,
    }));
  });

export const addTrade = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) =>
    z
      .object({
        type: z.enum(["buy", "sell", "deposit", "fee"]),
        ticker: z.string().default(""),
        name: z.string().default(""),
        units: z.number().default(0),
        price: z.number().default(0),
        amountGBP: z.number(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    await db.insert(trades).values({
      userId,
      type: data.type,
      ticker: data.ticker,
      name: data.name,
      units: data.units,
      price: data.price,
      amountGBP: data.amountGBP,
      date: data.date,
    });
  });

export const deleteTrade = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) => z.object({ id: z.number().int() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    await db.delete(trades).where(and(eq(trades.id, data.id), eq(trades.userId, userId)));
  });

// ─── getPriceForDate ─────────────────────────────────────────────────────────

export const getPriceForDate = createServerFn()
  .middleware([authMiddleware])
  .validator((raw: unknown) =>
    z
      .object({
        ticker: z.string().min(1).max(20),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    try {
      const history = await fetchHistory(data.ticker, "All" as HistoryRange);
      if (history.length > 0) {
        const target = new Date(data.date).getTime();
        const bar = history.reduce((best, b) =>
          Math.abs(b.ts - target) < Math.abs(best.ts - target) ? b : best,
        );
        if (bar.close > 0) return { price: bar.close };
      }
      const q = await fetchQuote(data.ticker);
      return { price: q.lastPrice ?? 0 };
    } catch {
      return { price: 0 };
    }
  });

// ─── clearFundamentalsCache ──────────────────────────────────────────────────

export const clearFundamentalsCache = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) => z.object({ ticker: z.string() }).parse(raw))
  .handler(async ({ data }) => {
    await db.delete(quoteCache).where(eq(quoteCache.ticker, data.ticker));
  });

// ─── Market data server functions ────────────────────────────────────────────

const HISTORY_RANGES = ["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y", "All"] as const;

export const getPriceHistory = createServerFn()
  .middleware([authMiddleware])
  .validator((raw: unknown) =>
    z.object({ ticker: z.string(), range: z.enum(HISTORY_RANGES) }).parse(raw),
  )
  .handler(async ({ data }) => fetchHistory(data.ticker, data.range as HistoryRange));

export const getNews = createServerFn()
  .middleware([authMiddleware])
  .validator((raw: unknown) => z.object({ ticker: z.string() }).parse(raw))
  .handler(async ({ data }) => fetchNews(data.ticker));

export const getEarnings = createServerFn()
  .middleware([authMiddleware])
  .validator((raw: unknown) => z.object({ ticker: z.string() }).parse(raw))
  .handler(async ({ data }) => fetchEarnings(data.ticker));
