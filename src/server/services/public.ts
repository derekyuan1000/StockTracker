import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  holdings,
  lots,
  portfolioMeta,
  quoteCache,
  trades,
  userSettings,
} from "@/server/db/schema";
import { user } from "@/server/db/auth-schema";
import { fetchHistory, fetchTickerTape } from "@/server/market/yahoo";
import type {
  LeaderboardEntry,
  PublicProfile,
  PublicTrade,
  TickerItem,
} from "@stocktracker/api-contracts";

// ─── getPublicFeed ────────────────────────────────────────────────────────────

export async function getPublicFeed(limit: number): Promise<PublicTrade[]> {
  const rows = await db
    .select({
      displayName: user.name,
      type: trades.type,
      ticker: trades.ticker,
      name: trades.name,
      units: trades.units,
      price: trades.price,
      amountGBP: trades.amountGBP,
      date: trades.date,
    })
    .from(trades)
    .innerJoin(userSettings, eq(userSettings.userId, trades.userId))
    .innerJoin(user, eq(user.id, trades.userId))
    .where(and(eq(userSettings.portfolioPublic, true), inArray(trades.type, ["buy", "sell"])))
    .orderBy(desc(trades.createdAt))
    .limit(limit);
  return rows as PublicTrade[];
}

// ─── getPublicLeaderboard ─────────────────────────────────────────────────────

export async function getPublicLeaderboard(): Promise<LeaderboardEntry[]> {
  const publicUsers = await db
    .select({ userId: userSettings.userId, displayName: user.name })
    .from(userSettings)
    .innerJoin(user, eq(user.id, userSettings.userId))
    .where(eq(userSettings.portfolioPublic, true));

  if (!publicUsers.length) return [];

  const entries = await Promise.all(
    publicUsers.map(async ({ userId, displayName }) => {
      const [buyRows, [meta], holdingRows, lotRows] = await Promise.all([
        db
          .select({ amountGBP: trades.amountGBP })
          .from(trades)
          .where(and(eq(trades.userId, userId), eq(trades.type, "buy"))),
        db.select().from(portfolioMeta).where(eq(portfolioMeta.userId, userId)).limit(1),
        db
          .select({ ticker: holdings.ticker, currency: holdings.currency })
          .from(holdings)
          .where(eq(holdings.userId, userId)),
        db
          .select({ ticker: lots.ticker, units: lots.units, buyPrice: lots.buyPrice })
          .from(lots)
          .where(eq(lots.userId, userId)),
      ]);

      const totalInvestedGBP = buyRows.reduce((sum, t) => sum + t.amountGBP, 0);
      const realisedGL = meta?.realisedGL ?? 0;

      const lotsByTicker = new Map<string, { units: number; buyPrice: number }[]>();
      for (const lot of lotRows) {
        const arr = lotsByTicker.get(lot.ticker) ?? [];
        arr.push({ units: lot.units, buyPrice: lot.buyPrice });
        lotsByTicker.set(lot.ticker, arr);
      }

      let unrealisedGL = 0;
      let valueNow = 0,
        value1M = 0,
        value1Y = 0;

      await Promise.all(
        holdingRows.map(async (h) => {
          const tickerLots = lotsByTicker.get(h.ticker) ?? [];
          const totalUnits = tickerLots.reduce((s, l) => s + l.units, 0);
          if (totalUnits <= 0) return;
          const avgBuyP = tickerLots.reduce((s, l) => s + l.buyPrice * l.units, 0) / totalUnits;

          const [cachedQuote, hist1M, hist1Y] = await Promise.all([
            db
              .select({ payload: quoteCache.payload })
              .from(quoteCache)
              .where(and(eq(quoteCache.ticker, h.ticker), eq(quoteCache.kind, "quote")))
              .limit(1)
              .then(([r]) => r),
            fetchHistory(h.ticker, "1M"),
            fetchHistory(h.ticker, "1Y"),
          ]);

          let lastPrice = avgBuyP;
          if (cachedQuote?.payload) {
            const q = cachedQuote.payload as Record<string, unknown>;
            if (typeof q.lastPrice === "number" && q.lastPrice > 0) lastPrice = q.lastPrice;
          }

          const divisor = h.currency === "GBp" ? 100 : 1;
          unrealisedGL += (lastPrice * totalUnits) / divisor - (avgBuyP * totalUnits) / divisor;
          valueNow += (lastPrice * totalUnits) / divisor;
          value1M += ((hist1M[0]?.close ?? lastPrice) * totalUnits) / divisor;
          value1Y += ((hist1Y[0]?.close ?? lastPrice) * totalUnits) / divisor;
        }),
      );

      const totalGainGBP = realisedGL + unrealisedGL;
      const gainPct = totalInvestedGBP > 0 ? (totalGainGBP / totalInvestedGBP) * 100 : 0;
      const monthGainPct = value1M > 0 ? ((valueNow - value1M) / value1M) * 100 : null;
      const yearGainPct = value1Y > 0 ? ((valueNow - value1Y) / value1Y) * 100 : null;

      return {
        displayName: displayName ?? "Anonymous",
        userId,
        costGBP: totalInvestedGBP,
        gainGBP: totalGainGBP,
        gainPct,
        monthGainPct,
        yearGainPct,
      };
    }),
  );

  return entries
    .filter((e) => e.costGBP > 0 || e.gainGBP !== 0)
    .sort((a, b) => b.gainPct - a.gainPct);
}

// ─── getPublicProfile ─────────────────────────────────────────────────────────

export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  const [settings] = await db
    .select({ portfolioPublic: userSettings.portfolioPublic })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  if (!settings?.portfolioPublic) return null;

  const [userData] = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!userData) return null;

  const [tradeRows, buyRows, [meta]] = await Promise.all([
    db
      .select({
        displayName: user.name,
        type: trades.type,
        ticker: trades.ticker,
        name: trades.name,
        units: trades.units,
        price: trades.price,
        amountGBP: trades.amountGBP,
        date: trades.date,
      })
      .from(trades)
      .innerJoin(user, eq(user.id, trades.userId))
      .where(and(eq(trades.userId, userId), inArray(trades.type, ["buy", "sell"])))
      .orderBy(desc(trades.createdAt))
      .limit(100),
    db
      .select({ amountGBP: trades.amountGBP })
      .from(trades)
      .where(and(eq(trades.userId, userId), eq(trades.type, "buy"))),
    db.select().from(portfolioMeta).where(eq(portfolioMeta.userId, userId)).limit(1),
  ]);

  return {
    userId,
    displayName: userData.name ?? "Anonymous",
    trades: tradeRows as PublicTrade[],
    stats: {
      totalInvestedGBP: buyRows.reduce((sum, t) => sum + t.amountGBP, 0),
      realisedGL: meta?.realisedGL ?? 0,
      tradeCount: tradeRows.length,
    },
  };
}

// ─── getPublicTicker ──────────────────────────────────────────────────────────

export async function getPublicTicker(): Promise<TickerItem[]> {
  return fetchTickerTape();
}
