import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { quoteCache } from "@/server/db/schema";
import {
  fetchEarnings,
  fetchHistory,
  fetchNews,
  fetchQuote,
  searchSymbols,
} from "@/server/market/yahoo";
import type { HistoryRange } from "@/server/market/types";

// ─── searchTicker ─────────────────────────────────────────────────────────────

export async function searchTicker(query: string) {
  return searchSymbols(query);
}

// ─── getPriceHistory ─────────────────────────────────────────────────────────

export async function getPriceHistory(ticker: string, range: string) {
  return fetchHistory(ticker, range as HistoryRange);
}

// ─── getPriceForDate ─────────────────────────────────────────────────────────

export async function getPriceForDate(ticker: string, date: string) {
  try {
    const history = await fetchHistory(ticker, "All" as HistoryRange);
    if (history.length > 0) {
      const target = new Date(date).getTime();
      const bar = history.reduce((best, b) =>
        Math.abs(b.ts - target) < Math.abs(best.ts - target) ? b : best,
      );
      if (bar.close > 0) return { price: bar.close };
    }
    const q = await fetchQuote(ticker);
    return { price: q.lastPrice ?? 0 };
  } catch {
    return { price: 0 };
  }
}

// ─── getQuotes ───────────────────────────────────────────────────────────────
// Bulk quote lookup for the watchlist. Reuses the 60s-cached fetchQuote; a failed
// ticker is omitted rather than failing the whole batch.

export async function getQuotes(tickers: string[]) {
  const results = await Promise.all(
    tickers.map(async (ticker) => {
      try {
        const q = await fetchQuote(ticker);
        return {
          ticker: q.ticker,
          name: q.name,
          lastPrice: q.lastPrice,
          prevClose: q.prevClose,
          currency: q.currency,
        };
      } catch {
        return null;
      }
    }),
  );
  return results.filter((r): r is NonNullable<typeof r> => r !== null);
}

// ─── getNews ─────────────────────────────────────────────────────────────────

export async function getNews(ticker: string) {
  return fetchNews(ticker);
}

// ─── getEarnings ─────────────────────────────────────────────────────────────

export async function getEarnings(ticker: string) {
  return fetchEarnings(ticker);
}

// ─── clearFundamentalsCache ──────────────────────────────────────────────────

export async function clearFundamentalsCache(ticker: string) {
  await db.delete(quoteCache).where(eq(quoteCache.ticker, ticker));
}
