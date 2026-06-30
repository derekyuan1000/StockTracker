import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db/client";
import { researchPicks } from "@/server/db/schema";
import { authMiddleware } from "@/fns/_middleware";

export const listResearchPicks = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    db
      .select()
      .from(researchPicks)
      .where(eq(researchPicks.userId, context.userId))
      .orderBy(desc(researchPicks.week), desc(researchPicks.id)),
  );

const PickSchema = z.object({
  id: z.number().optional(),
  week: z.number().int().positive(),
  company: z.string().min(1),
  ticker: z
    .string()
    .min(1)
    .transform((s) => s.toUpperCase()),
  sector: z.string().default(""),
  moat: z.string().default(""),
  roic: z.number().default(0),
  pe: z.number().default(0),
  fcfPositive: z.boolean().default(false),
  lowDebt: z.boolean().default(false),
  thesis: z.string().default(""),
  status: z.string().default("watchlist"),
  addedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const upsertResearchPick = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) => PickSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { id, ...values } = data;
    if (id) {
      await db
        .update(researchPicks)
        .set(values)
        .where(and(eq(researchPicks.id, id), eq(researchPicks.userId, userId)));
    } else {
      await db.insert(researchPicks).values({ ...values, userId, checklist: [] });
    }
  });

export const setChecklist = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) =>
    z.object({ id: z.number(), checklist: z.array(z.boolean()) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await db
      .update(researchPicks)
      .set({ checklist: data.checklist })
      .where(and(eq(researchPicks.id, data.id), eq(researchPicks.userId, context.userId)));
  });
