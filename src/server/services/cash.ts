import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { cashFlows, portfolioMeta } from "@/server/db/schema";
import { adjustCash } from "./portfolio";
import type { z } from "zod";
import type { AddCashFlowSchema } from "@stocktracker/api-contracts";

// ─── getCashFlows ─────────────────────────────────────────────────────────────

export async function getCashFlows(userId: string) {
  const [flows, [meta]] = await Promise.all([
    db
      .select()
      .from(cashFlows)
      .where(eq(cashFlows.userId, userId))
      .orderBy(desc(cashFlows.date), desc(cashFlows.createdAt)),
    db.select().from(portfolioMeta).where(eq(portfolioMeta.userId, userId)).limit(1),
  ]);
  return { flows, cashGBP: meta?.cashGBP ?? 0 };
}

// ─── addCashFlow ──────────────────────────────────────────────────────────────

export async function addCashFlow(userId: string, data: z.infer<typeof AddCashFlowSchema>) {
  const delta = data.type === "deposit" ? data.amountGBP : -data.amountGBP;
  await db.insert(cashFlows).values({
    userId,
    type: data.type,
    amountGBP: data.amountGBP,
    note: data.note,
    date: data.date,
  });
  await adjustCash(userId, delta);
}

// ─── deleteCashFlow ───────────────────────────────────────────────────────────

export async function deleteCashFlow(userId: string, id: number) {
  const [flow] = await db
    .select()
    .from(cashFlows)
    .where(and(eq(cashFlows.id, id), eq(cashFlows.userId, userId)))
    .limit(1);
  if (!flow) return;
  const delta = flow.type === "deposit" ? -flow.amountGBP : flow.amountGBP;
  await db.delete(cashFlows).where(and(eq(cashFlows.id, id), eq(cashFlows.userId, userId)));
  await adjustCash(userId, delta);
}

// ─── updateCash ──────────────────────────────────────────────────────────────

export async function updateCash(userId: string, delta: number) {
  await adjustCash(userId, delta);
}

// ─── setCashBalance ──────────────────────────────────────────────────────────

export async function setCashBalance(userId: string, amountGBP: number) {
  const [meta] = await db
    .select()
    .from(portfolioMeta)
    .where(eq(portfolioMeta.userId, userId))
    .limit(1);
  if (meta) {
    await db
      .update(portfolioMeta)
      .set({ cashGBP: amountGBP })
      .where(eq(portfolioMeta.userId, userId));
  } else {
    await db.insert(portfolioMeta).values({ userId, cashGBP: amountGBP, realisedGL: 0 });
  }
}
