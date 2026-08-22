import type { RouteEntry } from "../router";
import { sendDailySummaries } from "@/server/push/daily-summary";
import { checkAlerts } from "@/server/push/check-alerts";

// NOTE: Vercel Cron issues GET requests, and the router matches methods exactly
// (see router.ts). These must be GET or the scheduled jobs in vercel.json never
// reach their handlers. Auth is via CRON_SECRET (Vercel auto-injects the bearer).
export const internalRoutes: RouteEntry[] = [
  {
    method: "GET",
    pattern: "/api/v1/internal/cron/daily-summary",
    requireAuth: true,
    handler: async () => sendDailySummaries(),
  },
  {
    method: "GET",
    pattern: "/api/v1/internal/cron/check-alerts",
    requireAuth: true,
    handler: async () => checkAlerts(),
  },
];
