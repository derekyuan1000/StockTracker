import type { RouteEntry } from "../router";
import { getInsights } from "@/server/ai/insights";
import { getPortfolioAnalysis } from "@/server/services/analysis";
import { AnalysisRangeSchema } from "@stocktracker/api-contracts";
import { z } from "zod";

export const insightsRoutes: RouteEntry[] = [
  {
    method: "GET",
    pattern: "/api/v1/portfolio/insights",
    requireAuth: true,
    handler: async ({ userId, query }) => {
      const range = AnalysisRangeSchema.parse(query.get("range") ?? "1Y");
      const forceRefresh = query.get("refresh") === "1";
      const benchmark =
        z
          .string()
          .optional()
          .parse(query.get("benchmark") ?? undefined) ?? null;
      const analysis = await getPortfolioAnalysis(userId!, range, benchmark);
      return getInsights(userId!, analysis, forceRefresh);
    },
  },
];
