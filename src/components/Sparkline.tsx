export function Sparkline({
  data,
  positive,
  width = 88,
  height = 28,
}: {
  data: number[];
  positive: boolean;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data
    .map((v, i) => `${(i * step).toFixed(2)},${(height - ((v - min) / range) * height).toFixed(2)}`)
    .join(" ");
  const color = positive ? "var(--up)" : "var(--down)";
  return (
    <svg width={width} height={height} className="block">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RangeBar({ low, high, current }: { low: number; high: number; current: number }) {
  const pct = Math.max(0, Math.min(100, ((current - low) / (high - low || 1)) * 100));
  return (
    <div className="w-28">
      <div className="relative h-1 rounded-full bg-[var(--surface-elevated)]">
        <div className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-text-body" style={{ left: `${pct}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-text-muted num">
        <span>{low.toFixed(0)}</span>
        <span>{high.toFixed(0)}</span>
      </div>
    </div>
  );
}
