import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  fetchEarnings,
  fetchFundamentals,
  fetchHistory,
  fetchNews,
  fetchQuote,
  searchSymbols,
} from "@/server/market/yahoo";
import type { HistoryRange } from "@/server/market/types";
import { authMiddleware } from "@/fns/_middleware";

const RANGES = ["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y", "All"] as const;

// These wrap a public upstream API, but each createServerFn still registers a
// same-origin RPC endpoint. Require a session so they can't be abused as an
// unauthenticated proxy — matching every other data function in this app.
export const getQuote = createServerFn()
  .middleware([authMiddleware])
  .validator((raw: unknown) => z.object({ ticker: z.string() }).parse(raw))
  .handler(async ({ data }) => fetchQuote(data.ticker));

export const getPriceHistory = createServerFn()
  .middleware([authMiddleware])
  .validator((raw: unknown) => z.object({ ticker: z.string(), range: z.enum(RANGES) }).parse(raw))
  .handler(async ({ data }) => fetchHistory(data.ticker, data.range as HistoryRange));

export const getFundamentals = createServerFn()
  .middleware([authMiddleware])
  .validator((raw: unknown) => z.object({ ticker: z.string() }).parse(raw))
  .handler(async ({ data }) => fetchFundamentals(data.ticker));

export const getNews = createServerFn()
  .middleware([authMiddleware])
  .validator((raw: unknown) => z.object({ ticker: z.string() }).parse(raw))
  .handler(async ({ data }) => fetchNews(data.ticker));

export const searchTickers = createServerFn()
  .middleware([authMiddleware])
  .validator((raw: unknown) => z.object({ query: z.string().min(1) }).parse(raw))
  .handler(async ({ data }) => searchSymbols(data.query));

export const getEarnings = createServerFn()
  .middleware([authMiddleware])
  .validator((raw: unknown) => z.object({ ticker: z.string() }).parse(raw))
  .handler(async ({ data }) => fetchEarnings(data.ticker));
