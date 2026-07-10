import type { RouteEntry } from "../router";
import { getPortfolioAnalysis } from "@/server/services/analysis";
import { AnalysisRangeSchema } from "@stocktracker/api-contracts";
import { z } from "zod";

export const analysisRoutes: RouteEntry[] = [
  {
    method: "GET",
    pattern: "/api/v1/portfolio/analysis",
    requireAuth: true,
    handler: async ({ userId, query }) => {
      const range = AnalysisRangeSchema.parse(query.get("range") ?? "1Y");
      const benchmark =
        z
          .string()
          .optional()
          .parse(query.get("benchmark") ?? undefined) ?? null;
      return getPortfolioAnalysis(userId!, range, benchmark);
    },
  },
];
