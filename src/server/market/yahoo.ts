import { and, eq, gt } from "drizzle-orm";
import { db } from "../db/client";
import { quoteCache } from "../db/schema";
import type {
  CacheKind,
  EarningsData,
  Fundamentals,
  HistoryRange,
  NewsItem,
  OHLCBar,
  Quote,
  SearchResult,
} from "./types";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// ─── Yahoo session (cookie + crumb) ──────────────────────────────────────────
// Yahoo's /v7/finance/quote endpoint (name + fundamentals) now requires a crumb
// token paired with the session cookie it was minted against. /v8/chart does not.
// We obtain a cookie, exchange it for a crumb, and memoize the pair until it 401s.

let sessionPromise: Promise<{ cookie: string; crumb: string }> | null = null;

async function fetchCookie(): Promise<string> {
  for (const url of ["https://fc.yahoo.com/", "https://finance.yahoo.com/"]) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      const setCookies = res.headers.getSetCookie?.() ?? [];
      const cookie = setCookies.map((c) => c.split(";")[0]).join("; ");
      if (cookie) return cookie;
    } catch {
      // try next host
    }
  }
  return "";
}

function getSession(): Promise<{ cookie: string; crumb: string }> {
  if (sessionPromise) return sessionPromise;
  sessionPromise = (async () => {
    const cookie = await fetchCookie();
    const res = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
      headers: { "User-Agent": UA, ...(cookie ? { Cookie: cookie } : {}) },
    });
    const crumb = (await res.text()).trim();
    if (!crumb || crumb.includes("<")) throw new Error("Failed to obtain Yahoo crumb");
    return { cookie, crumb };
  })().catch((err) => {
    sessionPromise = null; // allow a fresh attempt on the next call
    throw err;
  });
  return sessionPromise;
}

// ─── Cache helper ────────────────────────────────────────────────────────────

async function cached<T>(
  cacheKey: string, // ticker or ticker:range for history
  kind: CacheKind,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const since = new Date(Date.now() - ttlSeconds * 1000);
  const [hit] = await db
    .select()
    .from(quoteCache)
    .where(
      and(
        eq(quoteCache.ticker, cacheKey),
        eq(quoteCache.kind, kind),
        gt(quoteCache.fetchedAt, since),
      ),
    )
    .limit(1);

  if (hit) return hit.payload as T;

  try {
    const data = await fetcher();
    await db
      .insert(quoteCache)
      .values({
        ticker: cacheKey,
        kind,
        payload: data as Record<string, unknown>,
        fetchedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [quoteCache.ticker, quoteCache.kind],
        set: { payload: data as Record<string, unknown>, fetchedAt: new Date() },
      });
    return data;
  } catch (err) {
    // Serve stale cache if Yahoo is rate-limited or down
    const [stale] = await db
      .select()
      .from(quoteCache)
      .where(and(eq(quoteCache.ticker, cacheKey), eq(quoteCache.kind, kind)))
      .limit(1);
    if (stale) return stale.payload as T;
    throw err;
  }
}

// ─── Raw fetchers ─────────────────────────────────────────────────────────────

// /v7/finance/quote — name + fundamentals in one call. Requires cookie + crumb.
async function rawV7Quote(ticker: string, retried = false): Promise<Record<string, unknown>> {
  const { cookie, crumb } = await getSession();
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(
    ticker,
  )}&crumb=${encodeURIComponent(crumb)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, ...(cookie ? { Cookie: cookie } : {}) },
  });
  // A stale/invalid crumb returns 401/403 — refresh the session once and retry.
  if ((res.status === 401 || res.status === 403) && !retried) {
    sessionPromise = null;
    return rawV7Quote(ticker, true);
  }
  if (!res.ok) throw new Error(`v7/quote ${res.status} for ${ticker}`);
  const json = (await res.json()) as any;
  const result = json?.quoteResponse?.result?.[0];
  if (!result) throw new Error(`No v7/quote result for ${ticker}`);
  return result;
}

// /v8/finance/chart — OHLC + spark, no crumb needed
async function rawChart(
  ticker: string,
  range: string,
  interval: string,
): Promise<Record<string, unknown>> {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=${interval}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`v8/chart ${res.status} for ${ticker}`);
  const json = (await res.json()) as any;
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`No chart result for ${ticker}`);
  return result;
}

// ─── Range → Yahoo params ─────────────────────────────────────────────────────

const RANGE_PARAMS: Record<HistoryRange, { range: string; interval: string; limitDays?: number }> =
  {
    "1D": { range: "1d", interval: "5m" },
    "5D": { range: "5d", interval: "15m" },
    "15D": { range: "1mo", interval: "1d", limitDays: 15 },
    "1M": { range: "1mo", interval: "1d" },
    "6M": { range: "6mo", interval: "1d" },
    YTD: { range: "ytd", interval: "1d" },
    "1Y": { range: "1y", interval: "1d" },
    "5Y": { range: "5y", interval: "1wk" },
    All: { range: "max", interval: "1d" },
  };

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchQuote(ticker: string): Promise<Quote> {
  return cached(ticker, "quote", 60, async () => {
    // v8 chart: reliable source for current price via meta + spark data
    const chart = await rawChart(ticker, "5d", "1d");
    const meta: Record<string, unknown> = (chart as any).meta ?? {};
    const rawCloses: (number | null)[] =
      ((chart as any).indicators?.quote?.[0]?.close as (number | null)[] | null) ?? [];
    const validCloses = rawCloses.filter((v): v is number => v != null && v > 0);
    const spark = validCloses.slice(-5);

    // v7: best-effort for name + extended fields; silently ignored if it fails
    let q: Record<string, unknown> = {};
    try {
      q = await rawV7Quote(ticker);
    } catch {
      // fall through — chart meta provides the price
    }

    // Resolve a human name: prefer v7 longName, then shortName, then the
    // anonymous search endpoint (works for OEIC fund IDs that v7 omits).
    let name = ((q.longName ?? q.shortName) as string | undefined) ?? "";
    if (!name || name === ticker) {
      try {
        const results = await searchSymbols(ticker);
        const match = results.find((r) => r.ticker === ticker) ?? results[0];
        if (match?.name) name = match.name;
      } catch {
        // leave name empty; falls back to ticker below
      }
    }

    const lastPrice =
      (q.regularMarketPrice as number) ||
      (meta.regularMarketPrice as number) ||
      (validCloses.at(-1) ?? 0);

    const prevClose =
      (q.regularMarketPreviousClose as number) ||
      (meta.chartPreviousClose as number) ||
      (validCloses.at(-2) ?? 0);

    return {
      ticker: (q.symbol as string) ?? (meta.symbol as string) ?? ticker,
      name: name || ticker,
      currency: ((meta.currency as string) === "GBp" ? "GBp" : "GBP") as "GBp" | "GBP",
      lastPrice,
      prevClose,
      dayLow: (q.regularMarketDayLow as number) || (meta.regularMarketDayLow as number) || 0,
      dayHigh: (q.regularMarketDayHigh as number) || (meta.regularMarketDayHigh as number) || 0,
      yearLow: (q.fiftyTwoWeekLow as number) ?? 0,
      yearHigh: (q.fiftyTwoWeekHigh as number) ?? 0,
      volume: (q.regularMarketVolume as number) ?? 0,
      avgVol3m: (q.averageDailyVolume3Month as number) ?? 0,
      marketTime: new Date(
        (((q.regularMarketTime as number) || (meta.regularMarketTime as number)) ?? 0) * 1000,
      ).toISOString(),
      spark,
    } satisfies Quote;
  });
}

export async function fetchFundamentals(ticker: string): Promise<Fundamentals> {
  return cached(ticker, "fundamentals", 3600, async () => {
    const q = await rawV7Quote(ticker);

    let analyst: Fundamentals["analyst"];
    let sector: string | undefined;

    let targetP: number | undefined;
    let targetHigh: number | undefined;
    let targetLow: number | undefined;

    let evEbitda: number | undefined;
    let revenueGrowth: number | undefined;
    let earningsGrowth: number | undefined;
    let grossMargin: number | undefined;
    let operatingMargin: number | undefined;
    let profitMargin: number | undefined;
    let fcfYield: number | undefined;
    let netDebtEbitda: number | undefined;
    let debtToEquity: number | undefined;
    let currentRatio: number | undefined;
    let roe: number | undefined;
    let roic: number | undefined;
    let pegRatio: number | undefined;
    let priceToBook: number | undefined;
    let eps: number | undefined;
    let forwardEps: number | undefined;
    let betaV10: number | undefined;

    try {
      const { cookie, crumb } = await getSession();
      const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=assetProfile,recommendationTrend,financialData,defaultKeyStatistics&crumb=${encodeURIComponent(crumb)}`;
      const res = await fetch(url, {
        headers: { "User-Agent": UA, ...(cookie ? { Cookie: cookie } : {}) },
      });
      if (res.ok) {
        const json = (await res.json()) as any;
        const result = json?.quoteSummary?.result?.[0];

        const profileSector = result?.assetProfile?.sector as string | undefined;
        if (profileSector) sector = profileSector;

        // financialData: analyst targets + margins + financial health
        const fd = result?.financialData;
        targetP =
          (fd?.targetMeanPrice?.raw as number | undefined) ??
          (q.targetMeanPrice as number | undefined);
        targetHigh =
          (fd?.targetHighPrice?.raw as number | undefined) ??
          (q.targetHighPrice as number | undefined);
        targetLow =
          (fd?.targetLowPrice?.raw as number | undefined) ??
          (q.targetLowPrice as number | undefined);

        revenueGrowth = fd?.revenueGrowth?.raw as number | undefined;
        earningsGrowth = fd?.earningsGrowth?.raw as number | undefined;
        grossMargin = fd?.grossMargins?.raw as number | undefined;
        operatingMargin = fd?.operatingMargins?.raw as number | undefined;
        profitMargin = fd?.profitMargins?.raw as number | undefined;
        roe = fd?.returnOnEquity?.raw as number | undefined;
        roic = (fd?.returnOnCapital?.raw as number | undefined) ?? roe;
        debtToEquity = fd?.debtToEquity?.raw as number | undefined;
        currentRatio = fd?.currentRatio?.raw as number | undefined;

        // FCF yield = freeCashflow / marketCap
        const freeCashflow = fd?.freeCashflow?.raw as number | undefined;
        const mktCapVal = q.marketCap as number | undefined;
        if (freeCashflow != null && mktCapVal && mktCapVal > 0) {
          fcfYield = freeCashflow / mktCapVal;
        }

        // Net debt/EBITDA = (totalDebt - totalCash) / ebitda
        const totalDebt = fd?.totalDebt?.raw as number | undefined;
        const totalCash = fd?.totalCash?.raw as number | undefined;
        const ebitda = fd?.ebitda?.raw as number | undefined;
        if (totalDebt != null && totalCash != null && ebitda && ebitda > 0) {
          netDebtEbitda = (totalDebt - totalCash) / ebitda;
        }

        // defaultKeyStatistics: valuation multiples and per-share data
        const dks = result?.defaultKeyStatistics;
        evEbitda = dks?.enterpriseToEbitda?.raw as number | undefined;
        pegRatio = dks?.pegRatio?.raw as number | undefined;
        priceToBook = dks?.priceToBook?.raw as number | undefined;
        eps = dks?.trailingEps?.raw as number | undefined;
        forwardEps = dks?.forwardEps?.raw as number | undefined;
        betaV10 = dks?.beta?.raw as number | undefined;

        const trend = result?.recommendationTrend?.trend?.[0];
        if (trend) {
          analyst = {
            buy: (trend.strongBuy ?? 0) + (trend.buy ?? 0),
            hold: trend.hold ?? 0,
            sell: (trend.sell ?? 0) + (trend.strongSell ?? 0),
            targetHigh: targetHigh ?? 0,
            targetLow: targetLow ?? 0,
          };
        }
      }
    } catch {}

    // v7 fallback for targetP if v10 financialData didn't provide it
    if (targetP === undefined) {
      targetP = q.targetMeanPrice as number | undefined;
    }

    // For non-equity asset types (ETF, BOND, FUTURE, etc.) use quoteType as the sector label
    if (!sector) {
      const qt = (q.quoteType as string | undefined) ?? "";
      if (qt && qt !== "EQUITY") sector = qt;
    }

    const tsToDate = (raw: unknown): string | undefined => {
      const n = typeof raw === "number" ? raw : (raw as any)?.raw;
      if (!n || n <= 0) return undefined;
      return new Date(n * 1000).toISOString().slice(0, 10);
    };

    return {
      pe: (q.trailingPE as number | undefined) ?? undefined,
      forwardPe: (q.forwardPE as number | undefined) ?? undefined,
      eps,
      forwardEps,
      pegRatio,
      priceToBook,
      mktCap: (q.marketCap as number | undefined) ?? undefined,
      evEbitda,
      divYield: (q.trailingAnnualDividendYield as number | undefined) ?? undefined,
      divRateAnnual: (q.trailingAnnualDividendRate as number | undefined) ?? undefined,
      exDivDate: tsToDate(q.exDividendDate),
      divPayDate: tsToDate(q.dividendDate),
      payoutRatio: (q.payoutRatio as number | undefined) ?? undefined,
      fiveYearAvgDivYield: (q.fiveYearAvgDividendYield as number | undefined) ?? undefined,
      beta: betaV10 ?? (q.beta as number | undefined) ?? undefined,
      revenueGrowth,
      earningsGrowth,
      grossMargin,
      operatingMargin,
      profitMargin,
      fcfYield,
      netDebtEbitda,
      debtToEquity,
      currentRatio,
      roe,
      roic,
      targetP,
      sector,
      analyst,
    } satisfies Fundamentals;
  });
}

export async function fetchEarnings(ticker: string): Promise<EarningsData> {
  return cached(ticker, "earnings", 3600, async () => {
    const { cookie, crumb } = await getSession();
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=calendarEvents,earnings,earningsTrend&crumb=${encodeURIComponent(crumb)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": UA, ...(cookie ? { Cookie: cookie } : {}) },
    });

    if (!res.ok) return { quarters: [] } satisfies EarningsData;

    const json = (await res.json()) as any;
    const result = json?.quoteSummary?.result?.[0];
    if (!result) return { quarters: [] } satisfies EarningsData;

    // Next earnings date
    const earningsDates: any[] = result?.calendarEvents?.earnings?.earningsDate ?? [];
    const nextTs = earningsDates[0]?.raw as number | undefined;
    const nextEarningsDate = nextTs
      ? new Date(nextTs * 1000).toISOString().slice(0, 10)
      : undefined;

    // EPS actuals + estimates from earnings.earningsChart.quarterly
    const earningsChart: any[] = result?.earnings?.earningsChart?.quarterly ?? [];
    const epsByLabel = new Map<string, { actual?: number; estimate?: number }>();
    for (const q of earningsChart) {
      epsByLabel.set(q.date as string, {
        actual: q.actual?.raw as number | undefined,
        estimate: q.estimate?.raw as number | undefined,
      });
    }

    // Revenue from earnings.financialsChart.quarterly
    const quarterly: any[] = result?.earnings?.financialsChart?.quarterly ?? [];

    const quarters: EarningsData["quarters"] = quarterly.slice(-8).map((q: any) => {
      const label = (q.date as string) ?? "";
      const revenue = (q.revenue?.raw as number | undefined) ?? undefined;
      const eps = epsByLabel.get(label)?.actual ?? undefined;
      const epsEstimate = epsByLabel.get(label)?.estimate ?? undefined;
      return { label, revenue, eps, epsEstimate };
    });

    return { nextEarningsDate, quarters } satisfies EarningsData;
  });
}

export async function fetchHistory(ticker: string, range: HistoryRange = "6M"): Promise<OHLCBar[]> {
  const { range: r, interval, limitDays } = RANGE_PARAMS[range];
  return cached(`${ticker}:${range}`, "history", 3600, async () => {
    const chart = await rawChart(ticker, r, interval);
    const timestamps: number[] = (chart as any).timestamp ?? [];
    const ohlcv = (chart as any).indicators?.quote?.[0] ?? {};
    const bars = timestamps
      .map((ts, i) => ({
        ts: ts * 1000,
        open: ohlcv.open?.[i] ?? 0,
        high: ohlcv.high?.[i] ?? 0,
        low: ohlcv.low?.[i] ?? 0,
        close: ohlcv.close?.[i] ?? 0,
        volume: ohlcv.volume?.[i] ?? 0,
      }))
      .filter((bar) => bar.close > 0) satisfies OHLCBar[];
    if (limitDays) {
      const cutoff = Date.now() - limitDays * 24 * 60 * 60 * 1000;
      return bars.filter((b) => b.ts >= cutoff);
    }
    return bars;
  });
}

export async function fetchNews(ticker: string): Promise<NewsItem[]> {
  return cached(ticker, "news", 3600, async () => {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(ticker)}&newsCount=10&quotesCount=0`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return [];
    const json = (await res.json()) as any;
    const items: any[] = json?.news ?? [];
    return items.map((n) => ({
      date: new Date((n.providerPublishTime ?? 0) * 1000).toISOString().slice(0, 10),
      source: (n.publisher as string) ?? "",
      title: (n.title as string) ?? "",
      url: (n.link as string) ?? "",
    })) satisfies NewsItem[];
  });
}

// Curated tickers for the public ticker tape header
const TICKER_TAPE_SYMBOLS = [
  "AAPL",
  "MSFT",
  "NVDA",
  "GOOGL",
  "AMZN",
  "^GSPC",
  "^FTSE",
  "^IXIC",
  "BTC-USD",
  "ETH-USD",
];

export async function fetchTickerTape(): Promise<
  Array<{ ticker: string; name: string; last: number; changePct: number }>
> {
  const results = await Promise.allSettled(TICKER_TAPE_SYMBOLS.map(fetchQuote));
  return results
    .filter((r): r is PromiseFulfilledResult<Quote> => r.status === "fulfilled")
    .map((r) => {
      const q = r.value;
      const changePct = q.prevClose > 0 ? ((q.lastPrice - q.prevClose) / q.prevClose) * 100 : 0;
      return { ticker: q.ticker, name: q.name, last: q.lastPrice, changePct };
    });
}

// No cache — live search for the Add-holding dialog
export async function searchSymbols(query: string): Promise<SearchResult[]> {
  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return [];
  const json = (await res.json()) as any;
  const quotes: any[] = json?.quotes ?? [];
  return quotes
    .filter((q) => q.symbol && q.shortname)
    .map((q) => ({ ticker: q.symbol as string, name: q.shortname as string }));
}
