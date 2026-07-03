import type { RouteEntry } from "../router";
import * as portfolio from "@/server/services/portfolio";
import { HistoryRangeSchema, BenchmarkRangeSchema } from "@stocktracker/api-contracts";
import { z } from "zod";

export const portfolioRoutes: RouteEntry[] = [
  {
    method: "GET",
    pattern: "/api/v1/me",
    requireAuth: true,
    handler: async ({ request }) => {
      const session = await import("@/server/auth").then((m) =>
        m.auth.api.getSession({ headers: request.headers }),
      );
      return {
        user: {
          id: session!.user.id,
          email: session!.user.email,
          name: session!.user.name,
          image: session!.user.image,
        },
      };
    },
  },
  {
    method: "GET",
    pattern: "/api/v1/portfolio",
    requireAuth: true,
    handler: async ({ userId }) => portfolio.getPortfolio(userId!),
  },
  {
    method: "GET",
    pattern: "/api/v1/portfolio/history",
    requireAuth: true,
    handler: async ({ userId, query }) => {
      const range = HistoryRangeSchema.parse(query.get("range") ?? "1M");
      return portfolio.getPortfolioHistory(userId!, range);
    },
  },
  {
    method: "GET",
    pattern: "/api/v1/portfolio/benchmark",
    requireAuth: true,
    handler: async ({ userId, query }) => {
      const ticker = z.string().min(1).parse(query.get("ticker"));
      const range = BenchmarkRangeSchema.parse(query.get("range") ?? "1Y");
      return portfolio.getBenchmarkHistory(userId!, ticker, range);
    },
  },
  {
    method: "GET",
    pattern: "/api/v1/widget/summary",
    requireAuth: true,
    handler: async ({ userId }) => portfolio.getWidgetSummary(userId!),
  },
];
