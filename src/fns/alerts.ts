import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { authMiddleware } from "@/fns/_middleware";
import { db } from "@/server/db/client";
import { alerts } from "@/server/db/schema";
import { CreateAlertSchema } from "@stocktracker/api-contracts";

export const getAlerts = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    db.select().from(alerts).where(eq(alerts.userId, context.userId)).orderBy(alerts.createdAt),
  );

export const createAlert = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) => CreateAlertSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const [row] = await db
      .insert(alerts)
      .values({ userId: context.userId, ...data })
      .returning();
    return row;
  });

export const deleteAlert = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) => z.object({ id: z.number().int() }).parse(raw))
  .handler(async ({ data, context }) => {
    await db.delete(alerts).where(and(eq(alerts.id, data.id), eq(alerts.userId, context.userId)));
  });
