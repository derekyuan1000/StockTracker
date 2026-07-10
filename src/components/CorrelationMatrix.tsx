type Props = {
  tickers: string[];
  matrix: number[][];
};

function cellColor(v: number): string {
  if (v >= 0.8) return "bg-[#f87171]/80";
  if (v >= 0.5) return "bg-[#fbbf24]/60";
  if (v >= 0.2) return "bg-[var(--surface-elevated)]";
  if (v >= -0.2) return "bg-[var(--canvas)]";
  return "bg-[#60a5fa]/40";
}

export function CorrelationMatrix({ tickers, matrix }: Props) {
  if (tickers.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr>
            <th className="w-16 p-1" />
            {tickers.map((t) => (
              <th
                key={t}
                className="max-w-[40px] truncate p-1 text-center font-mono text-text-muted uppercase tracking-wider"
                title={t}
              >
                {t.replace(".L", "")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={tickers[i]}>
              <td className="p-1 font-mono text-text-muted uppercase tracking-wider whitespace-nowrap">
                {tickers[i].replace(".L", "")}
              </td>
              {row.map((val, j) => (
                <td
                  key={j}
                  className={`size-9 p-1 text-center rounded-sm ${cellColor(val)}`}
                  title={`${tickers[i]} / ${tickers[j]}: ${val.toFixed(2)}`}
                >
                  <span
                    className={
                      i === j
                        ? "text-text-muted"
                        : val > 0.5 || val < -0.2
                          ? "font-semibold text-text-strong"
                          : "text-text-body"
                    }
                  >
                    {val.toFixed(2)}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center gap-4 text-[11px] text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm bg-[#f87171]/80" /> High (≥0.8)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm bg-[#fbbf24]/60" /> Moderate
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm bg-[#60a5fa]/40" /> Negative
        </span>
      </div>
    </div>
  );
}
