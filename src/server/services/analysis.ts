import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { holdings, lots } from "@/server/db/schema";
import { fetchHistory, fetchFundamentals } from "@/server/market/yahoo";
import type { HistoryRange } from "@/server/market/types";
import type {
  PortfolioAnalysis,
  RiskMetrics,
  DiversificationMetrics,
  AttributionMetrics,
  IncomeMetrics,
} from "@stocktracker/api-contracts";

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function alignSeries(
  a: { ts: number; ret: number }[],
  b: { ts: number; ret: number }[],
): { ra: number; rb: number }[] {
  const bMap = new Map(b.map((x) => [x.ts, x.ret]));
  return a.filter((x) => bMap.has(x.ts)).map((x) => ({ ra: x.ret, rb: bMap.get(x.ts)! }));
}

function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

function pearson(xs: number[], ys: number[]): number {
  if (xs.length < 2) return 0;
  const mx = mean(xs);
  const my = mean(ys);
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const den = Math.sqrt(
    xs.reduce((s, x) => s + (x - mx) ** 2, 0) * ys.reduce((s, y) => s + (y - my) ** 2, 0),
  );
  return den === 0 ? 0 : num / den;
}

function toReturns(bars: { ts: number; close: number }[]): { ts: number; ret: number }[] {
  const sorted = [...bars].sort((a, b) => a.ts - b.ts);
  const rets: { ts: number; ret: number }[] = [];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1].close > 0) {
      rets.push({ ts: sorted[i].ts, ret: sorted[i].close / sorted[i - 1].close - 1 });
    }
  }
  return rets;
}

function maxDrawdown(prices: number[]): { pct: number; series: number[] } {
  let peak = prices[0] ?? 0;
  let maxDD = 0;
  const series: number[] = [];
  for (const p of prices) {
    if (p > peak) peak = p;
    const dd = peak > 0 ? (p / peak - 1) * 100 : 0;
    series.push(dd);
    if (dd < maxDD) maxDD = dd;
  }
  return { pct: maxDD, series };
}

const RF_DAILY = 0.04 / 252;

export async function getPortfolioAnalysis(
  userId: string,
  range: string,
  benchmark: string | null,
): Promise<PortfolioAnalysis> {
  const [holdingRows, lotRows] = await Promise.all([
    db.select().from(holdings).where(eq(holdings.userId, userId)),
    db.select().from(lots).where(eq(lots.userId, userId)),
  ]);

  if (holdingRows.length === 0) return emptyAnalysis(range, benchmark);

  const unitsByTicker = new Map<string, number>();
  const costByTicker = new Map<string, number>();
  for (const l of lotRows) {
    unitsByTicker.set(l.ticker, (unitsByTicker.get(l.ticker) ?? 0) + l.units);
    const h = holdingRows.find((r) => r.ticker === l.ticker);
    const div = h?.currency === "GBp" ? 100 : 1;
    costByTicker.set(l.ticker, (costByTicker.get(l.ticker) ?? 0) + (l.buyPrice * l.units) / div);
  }

  const tickers = holdingRows.map((h) => h.ticker);
  const histResults = new Map<string, { ts: number; close: number }[]>();
  for (const batch of chunk(tickers, 5)) {
    const results = await Promise.allSettled(
      batch.map((t) => fetchHistory(t, range as HistoryRange)),
    );
    results.forEach((r, i) => {
      histResults.set(batch[i], r.status === "fulfilled" ? r.value : []);
    });
  }

  const fundResults = new Map<string, Awaited<ReturnType<typeof fetchFundamentals>>>();
  for (const batch of chunk(tickers, 5)) {
    const results = await Promise.allSettled(batch.map((t) => fetchFundamentals(t)));
    results.forEach((r, i) => {
      if (r.status === "fulfilled") fundResults.set(batch[i], r.value);
    });
  }

  let benchReturns: { ts: number; ret: number }[] = [];
  if (benchmark) {
    try {
      const bars = await fetchHistory(benchmark, range as HistoryRange);
      benchReturns = toReturns(bars);
    } catch {}
  }

  // Current market value per holding (last close from history)
  const mvByTicker = new Map<string, number>();
  for (const h of holdingRows) {
    const bars = histResults.get(h.ticker) ?? [];
    const lastClose = bars.at(-1)?.close ?? 0;
    const div = h.currency === "GBp" ? 100 : 1;
    mvByTicker.set(h.ticker, (lastClose * (unitsByTicker.get(h.ticker) ?? 0)) / div);
  }
  const totalMV = [...mvByTicker.values()].reduce((s, v) => s + v, 0);

  // ─── Risk ────────────────────────────────────────────────────────────────────
  const allTs = [
    ...new Set([...histResults.values()].flatMap((bars) => bars.map((b) => b.ts))),
  ].sort((a, b) => a - b);

  const portfolioPrices: number[] = [];
  const portfolioTs: number[] = [];
  for (const ts of allTs) {
    let total = 0;
    let covered = false;
    for (const h of holdingRows) {
      const bar = (histResults.get(h.ticker) ?? []).find((b) => b.ts === ts);
      if (!bar) continue;
      const div = h.currency === "GBp" ? 100 : 1;
      total += (bar.close * (unitsByTicker.get(h.ticker) ?? 0)) / div;
      covered = true;
    }
    if (covered && total > 0) {
      portfolioPrices.push(total);
      portfolioTs.push(ts);
    }
  }

  const portfolioReturns = toReturns(
    portfolioTs.map((ts, i) => ({ ts, close: portfolioPrices[i] })),
  );
  const rets = portfolioReturns.map((r) => r.ret);
  const sd = stddev(rets);
  const annualizedVol = sd * Math.sqrt(252) * 100;
  const sharpe = sd > 0 ? ((mean(rets) - RF_DAILY) / sd) * Math.sqrt(252) : 0;
  const { pct: maxDD, series: ddSeries } = maxDrawdown(portfolioPrices);

  let betaVsBenchmark: number | null = null;
  if (benchmark && benchReturns.length > 0) {
    const pairs = alignSeries(portfolioReturns, benchReturns);
    if (pairs.length >= 10) {
      const ras = pairs.map((p) => p.ra);
      const rbs = pairs.map((p) => p.rb);
      const covXY = mean(ras.map((r, i) => r * rbs[i])) - mean(ras) * mean(rbs);
      const varY = stddev(rbs) ** 2;
      betaVsBenchmark = varY > 0 ? covXY / varY : null;
    }
  }

  const risk: RiskMetrics = {
    annualizedVolPct: annualizedVol,
    sharpePct: sharpe,
    maxDrawdownPct: maxDD,
    betaVsBenchmark,
    drawdownSeries: portfolioTs.map((ts, i) => ({ ts, pct: ddSeries[i] ?? 0 })),
  };

  // ─── Diversification ─────────────────────────────────────────────────────────
  const allocMap = new Map<string, number>();
  for (const [ticker, mv] of mvByTicker) {
    allocMap.set(ticker, totalMV > 0 ? (mv / totalMV) * 100 : 0);
  }

  const hhi = [...allocMap.values()].reduce((s, a) => s + (a / 100) ** 2, 0) * 10000;

  const sorted = holdingRows
    .map((h) => ({ ticker: h.ticker, name: h.name, allocPct: allocMap.get(h.ticker) ?? 0 }))
    .sort((a, b) => b.allocPct - a.allocPct);

  const sectorMap = new Map<string, number>();
  for (const h of holdingRows) {
    const label = h.sector || "Other";
    sectorMap.set(label, (sectorMap.get(label) ?? 0) + (mvByTicker.get(h.ticker) ?? 0));
  }

  const currencyMap = new Map<string, number>();
  for (const h of holdingRows) {
    currencyMap.set(
      h.currency,
      (currencyMap.get(h.currency) ?? 0) + (mvByTicker.get(h.ticker) ?? 0),
    );
  }

  const bucketMap = new Map<string, number>();
  for (const h of holdingRows) {
    bucketMap.set(h.bucket, (bucketMap.get(h.bucket) ?? 0) + (mvByTicker.get(h.ticker) ?? 0));
  }

  // Correlation matrix (top 15 by MV)
  const top15 = sorted.slice(0, 15);
  let correlation: DiversificationMetrics["correlation"] = null;
  if (top15.length >= 2) {
    const retSeries = top15.map((h) => toReturns(histResults.get(h.ticker) ?? []));
    if (retSeries.filter((s) => s.length >= 10).length >= 2) {
      const matrix: number[][] = top15.map((_, i) =>
        top15.map((_, j) => {
          if (i === j) return 1;
          const sjMap = new Map(retSeries[j].map((r) => [r.ts, r.ret]));
          const aligned = retSeries[i].filter((r) => sjMap.has(r.ts));
          if (aligned.length < 5) return 0;
          return pearson(
            aligned.map((a) => a.ret),
            aligned.map((a) => sjMap.get(a.ts)!),
          );
        }),
      );
      correlation = { tickers: top15.map((h) => h.ticker), matrix };
    }
  }

  const diversification: DiversificationMetrics = {
    hhi,
    topHoldingsConcentration: sorted.slice(0, 5),
    bySector: [...sectorMap.entries()]
      .map(([label, mv]) => ({ label, pct: totalMV > 0 ? (mv / totalMV) * 100 : 0 }))
      .sort((a, b) => b.pct - a.pct),
    byCurrency: [...currencyMap.entries()].map(([label, mv]) => ({
      label,
      pct: totalMV > 0 ? (mv / totalMV) * 100 : 0,
    })),
    byBucket: [...bucketMap.entries()].map(([label, mv]) => ({
      label,
      pct: totalMV > 0 ? (mv / totalMV) * 100 : 0,
    })),
    correlation,
  };

  // ─── Attribution ─────────────────────────────────────────────────────────────
  const byHolding = holdingRows
    .map((h) => {
      const bars = (histResults.get(h.ticker) ?? []).sort((a, b) => a.ts - b.ts);
      const firstClose = bars[0]?.close ?? 0;
      const lastClose = bars.at(-1)?.close ?? 0;
      const periodReturnPct = firstClose > 0 ? ((lastClose - firstClose) / firstClose) * 100 : 0;
      const contribution = ((allocMap.get(h.ticker) ?? 0) / 100) * (periodReturnPct / 100) * 100;
      return { ticker: h.ticker, name: h.name, contribution, periodReturnPct };
    })
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  const sectorAttr = new Map<string, number>();
  for (const item of byHolding) {
    const label = holdingRows.find((r) => r.ticker === item.ticker)?.sector || "Other";
    sectorAttr.set(label, (sectorAttr.get(label) ?? 0) + item.contribution);
  }

  const attribution: AttributionMetrics = {
    byHolding,
    bySector: [...sectorAttr.entries()]
      .map(([label, contribution]) => ({ label, contribution }))
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)),
  };

  // ─── Income ──────────────────────────────────────────────────────────────────
  const incomeByHolding = holdingRows
    .map((h) => {
      const fund = fundResults.get(h.ticker);
      const units = unitsByTicker.get(h.ticker) ?? 0;
      const div = h.currency === "GBp" ? 100 : 1;
      const annualIncomeGBP = fund?.divRateAnnual ? (fund.divRateAnnual * units) / div : 0;
      const costGBP = costByTicker.get(h.ticker) ?? 0;
      return {
        ticker: h.ticker,
        name: h.name,
        annualIncomeGBP,
        yieldOnCostPct: costGBP > 0 ? (annualIncomeGBP / costGBP) * 100 : 0,
        exDivDate: fund?.exDivDate,
      };
    })
    .filter((x) => x.annualIncomeGBP > 0)
    .sort((a, b) => b.annualIncomeGBP - a.annualIncomeGBP);

  const projectedAnnualGBP = incomeByHolding.reduce((s, x) => s + x.annualIncomeGBP, 0);

  const income: IncomeMetrics = {
    projectedAnnualGBP,
    portfolioYieldPct: totalMV > 0 ? (projectedAnnualGBP / totalMV) * 100 : 0,
    byHolding: incomeByHolding,
  };

  return { range, benchmark, risk, diversification, attribution, income };
}

function emptyAnalysis(range: string, benchmark: string | null): PortfolioAnalysis {
  return {
    range,
    benchmark,
    risk: {
      annualizedVolPct: 0,
      sharpePct: 0,
      maxDrawdownPct: 0,
      betaVsBenchmark: null,
      drawdownSeries: [],
    },
    diversification: {
      hhi: 0,
      topHoldingsConcentration: [],
      bySector: [],
      byCurrency: [],
      byBucket: [],
      correlation: null,
    },
    attribution: { byHolding: [], bySector: [] },
    income: { projectedAnnualGBP: 0, portfolioYieldPct: 0, byHolding: [] },
  };
}
