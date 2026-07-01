import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db/client";
import { portfolioMeta, trades, userSettings } from "@/server/db/schema";
import { user } from "@/server/db/auth-schema";
import { fetchTickerTape } from "@/server/market/yahoo";

export type PublicTrade = {
  displayName: string;
  type: "buy" | "sell";
  ticker: string;
  name: string;
  units: number;
  price: number;
  amountGBP: number;
  date: string;
};

export type LeaderboardEntry = {
  displayName: string;
  userId: string;
  costGBP: number;
  gainGBP: number;
  gainPct: number;
};

export type TickerItem = {
  ticker: string;
  name: string;
  last: number;
  changePct: number;
};

export type PublicProfile = {
  userId: string;
  displayName: string;
  trades: PublicTrade[];
  stats: {
    totalInvestedGBP: number;
    realisedGL: number;
    tradeCount: number;
  };
};

// Recent buy/sell trades from public users
export const getPublicFeed = createServerFn()
  .validator((raw: unknown) =>
    z.object({ limit: z.number().int().min(1).max(50).default(20) }).parse(raw),
  )
  .handler(async ({ data }): Promise<PublicTrade[]> => {
    const { limit } = data;
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
  });

// Leaderboard: all public users ranked by realised G/L % — uses trade history
// for cost basis so users with no open lots still appear.
export const getPublicLeaderboard = createServerFn().handler(
  async (): Promise<LeaderboardEntry[]> => {
    const publicUsers = await db
      .select({ userId: userSettings.userId, displayName: user.name })
      .from(userSettings)
      .innerJoin(user, eq(user.id, userSettings.userId))
      .where(eq(userSettings.portfolioPublic, true));

    if (!publicUsers.length) return [];

    const entries = await Promise.all(
      publicUsers.map(async ({ userId, displayName }) => {
        const [buyRows, [meta]] = await Promise.all([
          db
            .select({ amountGBP: trades.amountGBP })
            .from(trades)
            .where(and(eq(trades.userId, userId), eq(trades.type, "buy"))),
          db.select().from(portfolioMeta).where(eq(portfolioMeta.userId, userId)).limit(1),
        ]);

        const totalInvestedGBP = buyRows.reduce((sum, t) => sum + t.amountGBP, 0);
        const realisedGL = meta?.realisedGL ?? 0;
        const gainPct = totalInvestedGBP > 0 ? (realisedGL / totalInvestedGBP) * 100 : 0;

        return {
          displayName: displayName ?? "Anonymous",
          userId,
          costGBP: totalInvestedGBP,
          gainGBP: realisedGL,
          gainPct,
        };
      }),
    );

    return entries
      .filter((e) => e.costGBP > 0 || e.gainGBP !== 0)
      .sort((a, b) => b.gainPct - a.gainPct);
  },
);

// Public profile for a specific user (null if private or not found)
export const getPublicProfile = createServerFn()
  .validator((raw: unknown) => z.object({ userId: z.string() }).parse(raw))
  .handler(async ({ data }): Promise<PublicProfile | null> => {
    const { userId } = data;

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
  });

// Curated market ticker tape (no auth required)
export const getPublicTicker = createServerFn().handler(
  async (): Promise<TickerItem[]> => fetchTickerTape(),
);
