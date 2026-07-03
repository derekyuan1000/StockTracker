import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { holdings, lots, trades } from "@/server/db/schema";
import { fetchQuote } from "@/server/market/yahoo";
import type { z } from "zod";
import type { AddTradeSchema } from "@stocktracker/api-contracts";

// ─── getTransactions ─────────────────────────────────────────────────────────

export async function getTransactions(userId: string) {
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
}

// ─── getTrades ────────────────────────────────────────────────────────────────

export async function getTrades(userId: string) {
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
}

// ─── addTrade ─────────────────────────────────────────────────────────────────

export async function addTrade(userId: string, data: z.infer<typeof AddTradeSchema>) {
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
}

// ─── deleteTrade ─────────────────────────────────────────────────────────────

export async function deleteTrade(userId: string, id: number) {
  await db.delete(trades).where(and(eq(trades.id, id), eq(trades.userId, userId)));
}
