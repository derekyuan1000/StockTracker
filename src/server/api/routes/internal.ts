import type { RouteEntry } from "../router";
import { sendDailySummaries } from "@/server/push/daily-summary";

export const internalRoutes: RouteEntry[] = [
  {
    method: "POST",
    pattern: "/api/v1/internal/cron/daily-summary",
    requireAuth: true, // uses CRON_SECRET check in router
    handler: async () => sendDailySummaries(),
  },
];
