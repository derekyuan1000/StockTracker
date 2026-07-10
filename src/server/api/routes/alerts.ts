import { and, eq } from "drizzle-orm";
import type { RouteEntry } from "../router";
import { db } from "@/server/db/client";
import { alerts } from "@/server/db/schema";
import { CreateAlertSchema, DeleteAlertSchema } from "@stocktracker/api-contracts";

export const alertsRoutes: RouteEntry[] = [
  {
    method: "GET",
    pattern: "/api/v1/alerts",
    requireAuth: true,
    handler: async ({ userId }) =>
      db.select().from(alerts).where(eq(alerts.userId, userId!)).orderBy(alerts.createdAt),
  },
  {
    method: "POST",
    pattern: "/api/v1/alerts",
    requireAuth: true,
    handler: async ({ userId, request }) => {
      const body = await request.json();
      const data = CreateAlertSchema.parse(body);
      const [row] = await db
        .insert(alerts)
        .values({ userId: userId!, ...data })
        .returning();
      return row;
    },
  },
  {
    method: "DELETE",
    pattern: "/api/v1/alerts/:id",
    requireAuth: true,
    handler: async ({ userId, params }) => {
      const { id } = DeleteAlertSchema.parse({ id: Number(params.id) });
      await db.delete(alerts).where(and(eq(alerts.id, id), eq(alerts.userId, userId!)));
      return { ok: true };
    },
  },
];
