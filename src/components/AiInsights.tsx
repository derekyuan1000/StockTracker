import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { getPortfolio } from "@/fns/holdings";
import { compute } from "@/data/portfolio";
import { INSIGHT_TEXTS, renderInsight } from "@/lib/insights-texts";

export function AiInsights() {
  const [offset, setOffset] = useState(0);

  const { data: portfolio } = useQuery({
    queryKey: ["portfolio"],
    queryFn: () => getPortfolio(),
  });

  const computed = useMemo(
    () => compute(portfolio?.holdings ?? [], portfolio?.cashGBP ?? 0),
    [portfolio],
  );

  const text = useMemo(() => {
    if (!INSIGHT_TEXTS.length) return null;
    const daysSinceEpoch = Math.floor(Date.now() / 86_400_000);
    const idx = (daysSinceEpoch + offset) % INSIGHT_TEXTS.length;
    const template = INSIGHT_TEXTS[idx];

    const sorted = [...computed.rows].sort((a, b) => b.marketValueGBP - a.marketValueGBP);
    const top3 = sorted.slice(0, 3).map((r) => r.ticker);
    const top1 = top3[0] ?? "your top holding";

    const sectorCounts: Record<string, number> = {};
    for (const r of computed.rows) {
      sectorCounts[r.sector] = (sectorCounts[r.sector] ?? 0) + r.marketValueGBP;
    }
    const topSector =
      Object.entries(sectorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "equities";

    const gainPct = computed.unrealisedPct;
    const cashPct =
      computed.totalValue > 0 ? ((portfolio?.cashGBP ?? 0) / computed.totalValue) * 100 : 0;

    return renderInsight(template, {
      stocks: top3.join(", ") || top1,
      top_holding: top1,
      sector: topSector,
      holding_count: String(computed.rows.length),
      gain: `${gainPct >= 0 ? "+" : ""}${gainPct.toFixed(1)}%`,
      cash_pct: `${cashPct.toFixed(1)}%`,
    });
  }, [computed, portfolio, offset]);

  return (
    <div className="rounded-lg border border-hairline bg-[var(--surface-card)] p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-text-strong">
          <Sparkles className="size-4 text-[var(--brand-periwinkle)]" />
          Insights
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
          Daily tip
        </span>
      </div>

      <div className="mt-3 text-sm leading-relaxed text-text-body">
        {text ? (
          <p>{text}</p>
        ) : (
          <p className="text-text-muted">Add holdings to see personalised tips.</p>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={() => setOffset((v) => v + 1)}
          className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted transition-colors hover:text-text-body"
        >
          Next tip
          <ChevronRight className="size-3" />
        </button>
      </div>
    </div>
  );
}
