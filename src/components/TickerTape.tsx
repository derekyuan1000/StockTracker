import { useQuery } from "@tanstack/react-query";
import { getPublicTicker } from "@/fns/public";
import type { TickerItem } from "@/fns/public";

function TickerCell({ item }: { item: TickerItem }) {
  const up = item.changePct >= 0;
  const pct = `${up ? "+" : ""}${item.changePct.toFixed(2)}%`;
  return (
    <span className="inline-flex items-center gap-2 px-6 shrink-0">
      <span className="num text-[11px] font-semibold text-text-strong">{item.ticker}</span>
      <span className="num text-[11px] text-text-body">
        {item.last.toFixed(item.last < 10 ? 4 : 2)}
      </span>
      <span
        className={`num text-[11px] font-medium ${up ? "text-[var(--up)]" : "text-[var(--down)]"}`}
      >
        {pct}
      </span>
    </span>
  );
}

const FALLBACK: TickerItem[] = [
  { ticker: "AAPL", name: "Apple", last: 0, changePct: 0 },
  { ticker: "MSFT", name: "Microsoft", last: 0, changePct: 0 },
  { ticker: "NVDA", name: "NVIDIA", last: 0, changePct: 0 },
  { ticker: "^GSPC", name: "S&P 500", last: 0, changePct: 0 },
  { ticker: "^FTSE", name: "FTSE 100", last: 0, changePct: 0 },
];

export function TickerTape() {
  const { data = FALLBACK } = useQuery({
    queryKey: ["public-ticker"],
    queryFn: () => getPublicTicker(),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const items = data.length ? data : FALLBACK;

  return (
    <div className="w-full overflow-hidden border-b border-hairline bg-canvas py-1.5">
      <div
        className="flex w-max"
        style={{ animation: "ticker-scroll 25s linear infinite", willChange: "transform" }}
      >
        {[...items, ...items, ...items].map((item, i) => (
          <TickerCell key={`${item.ticker}-${i}`} item={item} />
        ))}
      </div>
    </div>
  );
}
