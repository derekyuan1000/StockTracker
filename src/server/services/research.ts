import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { researchPicks } from "@/server/db/schema";
import type { z } from "zod";
import type { PickSchema } from "@stocktracker/api-contracts";

// ─── listResearchPicks ────────────────────────────────────────────────────────

export async function listResearchPicks(userId: string) {
  return db
    .select()
    .from(researchPicks)
    .where(eq(researchPicks.userId, userId))
    .orderBy(desc(researchPicks.week), desc(researchPicks.id));
}

// ─── upsertResearchPick ───────────────────────────────────────────────────────

export async function upsertResearchPick(userId: string, data: z.infer<typeof PickSchema>) {
  const { id, ...values } = data;
  if (id) {
    await db
      .update(researchPicks)
      .set(values)
      .where(and(eq(researchPicks.id, id), eq(researchPicks.userId, userId)));
  } else {
    await db.insert(researchPicks).values({ ...values, userId, checklist: [] });
  }
}

// ─── setChecklist ─────────────────────────────────────────────────────────────

export async function setChecklist(userId: string, id: number, checklist: boolean[]) {
  await db
    .update(researchPicks)
    .set({ checklist })
    .where(and(eq(researchPicks.id, id), eq(researchPicks.userId, userId)));
}
