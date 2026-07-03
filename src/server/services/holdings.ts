import { and, asc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { holdings, lots, trades } from "@/server/db/schema";
import { fetchFundamentals, fetchHistory, fetchQuote } from "@/server/market/yahoo";
import { adjustCash } from "./portfolio";

// ─── addHolding ───────────────────────────────────────────────────────────────

export async function addHolding(
  userId: string,
  data: {
    ticker: string;
    units: number;
    dateBought: string;
    price?: number;
    bucket: "Fund" | "Stock";
    allocTarget: number;
    deductCash: boolean;
  },
) {
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
}

// ─── deleteHolding ───────────────────────────────────────────────────────────

export async function deleteHolding(userId: string, ticker: string) {
  // lots cascade-delete via FK onDelete:'cascade'
  await db.delete(holdings).where(and(eq(holdings.userId, userId), eq(holdings.ticker, ticker)));
}

// ─── sellUnits ────────────────────────────────────────────────────────────────

export async function sellUnits(
  userId: string,
  data: { ticker: string; units: number; price: number },
) {
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
}

// ─── addLot ───────────────────────────────────────────────────────────────────

export async function addLot(
  userId: string,
  data: { ticker: string; units: number; price: number; date: string },
) {
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
}

// ─── updateLot ───────────────────────────────────────────────────────────────

export async function updateLot(
  userId: string,
  data: { id: number; units: number; price: number; date: string },
) {
  await db
    .update(lots)
    .set({ units: data.units, buyPrice: data.price, dateBought: data.date })
    .where(and(eq(lots.id, data.id), eq(lots.userId, userId)));
}

// ─── deleteLot ───────────────────────────────────────────────────────────────

export async function deleteLot(userId: string, id: number) {
  const [lot] = await db
    .select()
    .from(lots)
    .where(and(eq(lots.id, id), eq(lots.userId, userId)))
    .limit(1);
  if (!lot) return;
  await db.delete(lots).where(and(eq(lots.id, id), eq(lots.userId, userId)));
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
}
