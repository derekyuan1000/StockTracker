import { and, eq } from "drizzle-orm";
import type { RouteEntry } from "../router";
import { db } from "@/server/db/client";
import { watchlist } from "@/server/db/schema";
import * as market from "@/server/services/market";
import { getFxRates } from "@/server/market/fx";
import { AddWatchlistSchema } from "@stocktracker/api-contracts";
import type { WatchlistRow } from "@stocktracker/api-contracts";

export const watchlistRoutes: RouteEntry[] = [
  {
    method: "GET",
    pattern: "/api/v1/watchlist",
    requireAuth: true,
    handler: async ({ userId }): Promise<WatchlistRow[]> => {
      const rows = await db
        .select()
        .from(watchlist)
        .where(eq(watchlist.userId, userId!))
        .orderBy(watchlist.createdAt);
      if (rows.length === 0) return [];

      const quotes = await market.getQuotes(rows.map((r) => r.ticker));
      const byTicker = new Map(quotes.map((q) => [q.ticker.toUpperCase(), q]));

      // Resolve native→GBP factors once for the distinct currency set so each
      // row can carry a GBP-normalised price the client re-denominates to any base.
      const fxRates = await getFxRates(quotes.map((q) => q.currency));

      return rows.map((r) => {
        const q = byTicker.get(r.ticker.toUpperCase());
        const currency = q?.currency ?? "GBp";
        const lastPrice = q?.lastPrice ?? 0;
        const f = fxRates[currency] ?? (currency === "GBp" ? 1 / 100 : 1);
        return {
          ticker: r.ticker,
          name: q?.name || r.name || r.ticker,
          lastPrice,
          prevClose: q?.prevClose ?? 0,
          currency,
          lastPriceGBP: lastPrice * f,
        };
      });
    },
  },
  {
    method: "POST",
    pattern: "/api/v1/watchlist",
    requireAuth: true,
    handler: async ({ request, userId }) => {
      const { ticker } = AddWatchlistSchema.parse(await request.json());
      // Resolve a display name once, best-effort, so the list has a label even
      // before the first quote lands.
      const [q] = await market.getQuotes([ticker]);
      await db
        .insert(watchlist)
        .values({ userId: userId!, ticker, name: q?.name ?? "" })
        .onConflictDoNothing({ target: [watchlist.userId, watchlist.ticker] });
      return { ok: true };
    },
  },
  {
    method: "DELETE",
    pattern: "/api/v1/watchlist/:ticker",
    requireAuth: true,
    handler: async ({ params, userId }) => {
      const ticker = decodeURIComponent(params.ticker).toUpperCase();
      await db
        .delete(watchlist)
        .where(and(eq(watchlist.userId, userId!), eq(watchlist.ticker, ticker)));
      return { ok: true };
    },
  },
];
