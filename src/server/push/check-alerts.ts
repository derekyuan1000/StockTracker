import { and, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { alerts, pushTokens } from "@/server/db/schema";
import { fetchQuote } from "@/server/market/yahoo";
import { sendPushNotifications, type PushMessage } from "./expo";

export async function checkAlerts(): Promise<{ triggered: number }> {
  const activeAlerts = await db.select().from(alerts).where(eq(alerts.active, true));

  if (activeAlerts.length === 0) return { triggered: 0 };

  const uniqueTickers = [...new Set(activeAlerts.map((a) => a.ticker))];
  const quoteMap = new Map<string, number>();
  await Promise.allSettled(
    uniqueTickers.map(async (ticker) => {
      try {
        const q = await fetchQuote(ticker);
        quoteMap.set(ticker, q.lastPrice);
      } catch {}
    }),
  );

  const messages: PushMessage[] = [];
  const triggered: number[] = [];

  for (const alert of activeAlerts) {
    const lastPrice = quoteMap.get(alert.ticker);
    if (lastPrice == null) continue;

    const hit =
      alert.direction === "above" ? lastPrice >= alert.targetPrice : lastPrice <= alert.targetPrice;
    if (!hit) continue;

    triggered.push(alert.id);

    const userTokens = await db
      .select()
      .from(pushTokens)
      .where(eq(pushTokens.userId, alert.userId));

    const dir = alert.direction === "above" ? "above" : "below";
    const body = `${alert.ticker} is now ${lastPrice.toFixed(2)} — ${dir} your alert of ${alert.targetPrice.toFixed(2)}`;

    for (const { token, platform } of userTokens) {
      messages.push({ to: token, title: `Price Alert: ${alert.ticker}`, body, platform });
    }
  }

  for (const id of triggered) {
    await db
      .update(alerts)
      .set({ active: false, triggeredAt: new Date() })
      .where(and(eq(alerts.id, id)));
  }

  if (messages.length > 0) await sendPushNotifications(messages);

  return { triggered: triggered.length };
}
