import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Sparkles } from "lucide-react";
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/fns/_middleware";
import { getInsights } from "@/server/ai/insights";
import { getPortfolioAnalysis } from "@/server/services/analysis";
import { AnalysisRangeSchema } from "@stocktracker/api-contracts";
import { z } from "zod";

const getAiInsights = createServerFn()
  .middleware([authMiddleware])
  .validator((raw: unknown) =>
    z
      .object({
        range: AnalysisRangeSchema.default("1Y"),
        forceRefresh: z.boolean().default(false),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const analysis = await getPortfolioAnalysis(context.userId, data.range, null);
    return getInsights(context.userId, analysis, data.forceRefresh);
  });

export function AiInsights({ range }: { range: string }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["ai-insights", range],
    queryFn: () =>
      getAiInsights({
        data: { range: range as "1M" | "6M" | "YTD" | "1Y" | "5Y" | "All", forceRefresh: false },
      }),
    staleTime: 5 * 60 * 1000,
  });

  const refresh = useMutation({
    mutationFn: () =>
      getAiInsights({
        data: { range: range as "1M" | "6M" | "YTD" | "1Y" | "5Y" | "All", forceRefresh: true },
      }),
    onSuccess: (d) => qc.setQueryData(["ai-insights", range], d),
  });

  return (
    <div className="rounded-lg border border-hairline bg-[var(--surface-card)] p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-text-strong">
          <Sparkles className="size-4 text-[var(--brand-periwinkle)]" />
          AI Insights
        </div>
        <button
          onClick={() => refresh.mutate()}
          disabled={refresh.isPending}
          className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted transition-colors hover:text-text-body disabled:opacity-50"
        >
          <RefreshCw className={`size-3 ${refresh.isPending ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="mt-3 text-sm leading-relaxed text-text-body">
        {isLoading || refresh.isPending ? (
          <div className="space-y-2">
            {[80, 90, 70, 85].map((w, i) => (
              <div
                key={i}
                className="shimmer h-3.5 rounded bg-[var(--surface-elevated)]"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        ) : data?.narrative ? (
          <p className="whitespace-pre-wrap">{data.narrative}</p>
        ) : (
          <p className="text-text-muted">No insights available.</p>
        )}
      </div>

      {data?.cached && (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-text-muted">
          Cached · Generated today
        </p>
      )}
    </div>
  );
}
