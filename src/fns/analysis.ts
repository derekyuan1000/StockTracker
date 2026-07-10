import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/fns/_middleware";
import { getPortfolioAnalysis } from "@/server/services/analysis";
import { AnalysisRangeSchema } from "@stocktracker/api-contracts";
import { z } from "zod";

export const getAnalysis = createServerFn()
  .middleware([authMiddleware])
  .validator((raw: unknown) =>
    z
      .object({
        range: AnalysisRangeSchema.default("1Y"),
        benchmark: z.string().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) =>
    getPortfolioAnalysis(context.userId, data.range, data.benchmark ?? null),
  );
