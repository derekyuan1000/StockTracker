import type { RouteEntry } from "../router";
import { sendDailySummaries } from "@/server/push/daily-summary";
import { checkAlerts } from "@/server/push/check-alerts";

export const internalRoutes: RouteEntry[] = [
  {
    method: "POST",
    pattern: "/api/v1/internal/cron/daily-summary",
    requireAuth: true,
    handler: async () => sendDailySummaries(),
  },
  {
    method: "POST",
    pattern: "/api/v1/internal/cron/check-alerts",
    requireAuth: true,
    handler: async () => checkAlerts(),
  },
];
