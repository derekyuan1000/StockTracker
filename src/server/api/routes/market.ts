import type { RouteEntry } from "../router";
import * as market from "@/server/services/market";
import { HistoryRangeSchema } from "@stocktracker/api-contracts";
import { z } from "zod";

export const marketRoutes: RouteEntry[] = [
  {
    method: "GET",
    pattern: "/api/v1/market/search",
    requireAuth: true,
    handler: async ({ query }) => {
      const q = z.string().min(1).parse(query.get("q"));
      return market.searchTicker(q);
    },
  },
  {
    method: "GET",
    pattern: "/api/v1/market/:ticker/history",
    requireAuth: true,
    handler: async ({ params, query }) => {
      const range = HistoryRangeSchema.parse(query.get("range") ?? "1M");
      return market.getPriceHistory(params.ticker, range);
    },
  },
  {
    method: "GET",
    pattern: "/api/v1/market/:ticker/price",
    requireAuth: true,
    handler: async ({ params, query }) => {
      const date = z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .parse(query.get("date"));
      return market.getPriceForDate(params.ticker, date);
    },
  },
  {
    method: "GET",
    pattern: "/api/v1/market/:ticker/news",
    requireAuth: true,
    handler: async ({ params }) => market.getNews(params.ticker),
  },
  {
    method: "GET",
    pattern: "/api/v1/market/:ticker/earnings",
    requireAuth: true,
    handler: async ({ params }) => market.getEarnings(params.ticker),
  },
  {
    method: "DELETE",
    pattern: "/api/v1/market/:ticker/cache",
    requireAuth: true,
    handler: async ({ params }) => {
      await market.clearFundamentalsCache(params.ticker);
      return { ok: true };
    },
  },
];
