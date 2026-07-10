import { fmtGBP } from "@/lib/format";
import type { HoldingComputed } from "@/data/portfolio";

export function RebalancePanel({
  rows,
  totalValue,
}: {
  rows: HoldingComputed[];
  totalValue: number;
}) {
  const withTarget = rows.filter((r) => r.allocTarget > 0);
  if (withTarget.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        Set allocation targets on holdings to see rebalancing suggestions.
      </p>
    );
  }

  const items = withTarget.map((r) => {
    const targetValue = (r.allocTarget / 100) * totalValue;
    const delta = targetValue - r.marketValueGBP;
    return {
      ticker: r.ticker,
      name: r.name,
      allocActual: r.allocActual,
      allocTarget: r.allocTarget,
      delta,
    };
  });

  const buys = items.filter((x) => x.delta > 0).sort((a, b) => b.delta - a.delta);
  const sells = items.filter((x) => x.delta < 0).sort((a, b) => a.delta - b.delta);

  return (
    <div className="space-y-6">
      {buys.length > 0 && (
        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-text-muted">Buy</p>
          <div className="divide-y divide-hairline rounded-lg border border-hairline">
            {buys.map((x) => (
              <div key={x.ticker} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div>
                  <span className="font-semibold text-text-strong">{x.ticker}</span>
                  <span className="ml-2 text-text-muted">
                    {x.allocActual.toFixed(1)}% → {x.allocTarget}%
                  </span>
                </div>
                <span className="font-semibold text-[var(--up)]">+{fmtGBP(x.delta)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {sells.length > 0 && (
        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-text-muted">
            Sell
          </p>
          <div className="divide-y divide-hairline rounded-lg border border-hairline">
            {sells.map((x) => (
              <div key={x.ticker} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div>
                  <span className="font-semibold text-text-strong">{x.ticker}</span>
                  <span className="ml-2 text-text-muted">
                    {x.allocActual.toFixed(1)}% → {x.allocTarget}%
                  </span>
                </div>
                <span className="font-semibold text-[var(--down)]">{fmtGBP(x.delta)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
