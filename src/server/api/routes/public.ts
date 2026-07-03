import type { RouteEntry } from "../router";
import * as pub from "@/server/services/public";
import { z } from "zod";

export const publicRoutes: RouteEntry[] = [
  {
    method: "GET",
    pattern: "/api/v1/public/feed",
    requireAuth: false,
    handler: async ({ query }) => {
      const limit = z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(20)
        .parse(query.get("limit") ? Number(query.get("limit")) : 20);
      return pub.getPublicFeed(limit);
    },
  },
  {
    method: "GET",
    pattern: "/api/v1/public/leaderboard",
    requireAuth: false,
    handler: async () => pub.getPublicLeaderboard(),
  },
  {
    method: "GET",
    pattern: "/api/v1/public/profiles/:userId",
    requireAuth: false,
    handler: async ({ params }) => pub.getPublicProfile(params.userId),
  },
  {
    method: "GET",
    pattern: "/api/v1/public/ticker",
    requireAuth: false,
    handler: async () => pub.getPublicTicker(),
  },
];
