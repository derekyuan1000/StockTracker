import { db } from "@/server/db/client";
import { pushTokens, holdings, lots, portfolioMeta, quoteCache } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { sendPushNotifications } from "./expo";

export async function sendDailySummaries(): Promise<{ sent: number }> {
  // Get all users with push tokens
  const allTokenRows = await db.select().from(pushTokens);
  if (allTokenRows.length === 0) return { sent: 0 };

  const userIds = [...new Set(allTokenRows.map((r) => r.userId))];
  const messages: { to: string; title: string; body: string }[] = [];

  for (const userId of userIds) {
    try {
      const [holdingRows, lotRows, [meta]] = await Promise.all([
        db.select().from(holdings).where(eq(holdings.userId, userId)),
        db.select().from(lots).where(eq(lots.userId, userId)),
        db.select().from(portfolioMeta).where(eq(portfolioMeta.userId, userId)).limit(1),
      ]);

      let totalGBP = meta?.cashGBP ?? 0;
      let dayChangeGBP = 0;

      const lotsByTicker = new Map<string, typeof lotRows>();
      for (const lot of lotRows) {
        const arr = lotsByTicker.get(lot.ticker) ?? [];
        arr.push(lot);
        lotsByTicker.set(lot.ticker, arr);
      }

      for (const h of holdingRows) {
        const tickerLots = lotsByTicker.get(h.ticker) ?? [];
        const totalUnits = tickerLots.reduce((s, l) => s + l.units, 0);
        if (totalUnits <= 0) continue;

        const [cachedQuote] = await db
          .select({ payload: quoteCache.payload })
          .from(quoteCache)
          .where(and(eq(quoteCache.ticker, h.ticker), eq(quoteCache.kind, "quote")))
          .limit(1);

        const divisor = h.currency === "GBp" ? 100 : 1;
        if (cachedQuote?.payload) {
          const q = cachedQuote.payload as Record<string, unknown>;
          const lastPrice = typeof q.lastPrice === "number" ? q.lastPrice : 0;
          const prevClose = typeof q.prevClose === "number" ? q.prevClose : 0;
          totalGBP += (lastPrice * totalUnits) / divisor;
          if (prevClose > 0) {
            dayChangeGBP += ((lastPrice - prevClose) * totalUnits) / divisor;
          }
        }
      }

      const sign = dayChangeGBP >= 0 ? "+" : "";
      const body = `£${totalGBP.toFixed(0)} (${sign}£${dayChangeGBP.toFixed(0)} today)`;

      const userTokens = allTokenRows.filter((r) => r.userId === userId);
      for (const { token } of userTokens) {
        messages.push({ to: token, title: "Portfolio Update", body });
      }
    } catch {
      // skip user on error
    }
  }

  await sendPushNotifications(messages);
  return { sent: messages.length };
}
