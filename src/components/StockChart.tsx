import { useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  ComposedChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getPriceHistory } from "@/fns/holdings";
import type { OHLCBar } from "@/server/market/types";
import { fmtNum } from "@/lib/format";

type ChartRange = "1D" | "5D" | "1M" | "6M" | "YTD" | "1Y" | "5Y" | "All";

const CHART_RANGES: ChartRange[] = ["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y", "All"];
const RANGE_LABEL: Record<ChartRange, string> = {
  "1D": "1D",
  "5D": "5D",
  "1M": "1M",
  "6M": "6M",
  YTD: "YTD",
  "1Y": "1Y",
  "5Y": "5Y",
  All: "Max",
};

export interface StockChartProps {
  ticker: string;
  avgBuyP?: number;
  targetP?: number;
  currency?: "GBp" | "GBP";
  analyst?: { targetLow: number; targetHigh: number };
  defaultRange?: ChartRange;
  height?: number;
}

function formatTick(ts: number, range: ChartRange): string {
  const d = new Date(ts);
  if (range === "1D") {
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  if (range === "5D") {
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit" });
  }
  if (range === "1M" || range === "6M") {
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  }
  return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

function formatLabel(ts: number, range: ChartRange): string {
  const d = new Date(ts);
  if (range === "1D" || range === "5D") {
    return d.toLocaleString("en-GB");
  }
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function StockChart({
  ticker,
  avgBuyP,
  targetP,
  currency,
  analyst,
  defaultRange = "6M",
  height = 340,
}: StockChartProps) {
  const [range, setRange] = useState<ChartRange>(defaultRange);
  const [refLeft, setRefLeft] = useState<number | null>(null);
  const [refRight, setRefRight] = useState<number | null>(null);
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);
  const isSelecting = useRef(false);

  const { data: rawHistory = [], isLoading } = useQuery({
    queryKey: ["price-history", ticker, range],
    queryFn: () => getPriceHistory({ data: { ticker, range } }),
    enabled: !!ticker,
  });

  const history: OHLCBar[] = zoomDomain
    ? rawHistory.filter((b) => b.ts >= zoomDomain[0] && b.ts <= zoomDomain[1])
    : rawHistory;

  const dp = currency === "GBP" ? 2 : 0;

  const numYMin = history.length ? Math.min(...history.map((b) => b.low)) * 0.999 : 0;
  const numYMax = history.length ? Math.max(...history.map((b) => b.high)) * 1.001 : 1;

  const handleMouseMove = useCallback((e: any) => {
    if (isSelecting.current && e?.activeLabel != null) {
      setRefRight(e.activeLabel as number);
    }
  }, []);

  const handleMouseDown = useCallback((e: any) => {
    if (e?.activeLabel != null) {
      isSelecting.current = true;
      setRefLeft(e.activeLabel as number);
      setRefRight(null);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isSelecting.current && refLeft != null && refRight != null && refLeft !== refRight) {
      const l = Math.min(refLeft, refRight);
      const r = Math.max(refLeft, refRight);
      if (r > l) setZoomDomain([l, r]);
    }
    isSelecting.current = false;
    setRefLeft(null);
    setRefRight(null);
  }, [refLeft, refRight]);

  const handleMouseLeave = useCallback(() => {
    if (isSelecting.current) {
      isSelecting.current = false;
      setRefLeft(null);
      setRefRight(null);
    }
  }, []);

  const showSelection = refLeft != null && refRight != null && refLeft !== refRight;

  return (
    <div className="select-none">
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-2 mb-3">
        <div className="flex flex-wrap gap-1 rounded-md border border-hairline bg-[var(--surface-elevated)] p-1">
          {CHART_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => {
                setRange(r);
                setZoomDomain(null);
              }}
              className={`rounded num px-2.5 py-1 text-xs transition-colors ${
                range === r
                  ? "bg-canvas text-[var(--primary)]"
                  : "text-text-muted hover:text-text-body"
              }`}
            >
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>

        {zoomDomain && (
          <button
            onClick={() => setZoomDomain(null)}
            className="rounded px-2 py-1 text-[10px] border border-hairline text-[var(--primary)] hover:bg-canvas transition-colors"
          >
            ↺ Reset
          </button>
        )}
      </div>

      {/* ── Chart ──────────────────────────────────────────────────────────── */}
      <div style={{ height }} className="cursor-crosshair">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-sm text-text-muted">
            Loading…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={history}
              margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
              onMouseMove={handleMouseMove}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              <defs>
                <linearGradient id={`sg_${ticker}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b8bff" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#8b8bff" stopOpacity={0} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="ts"
                type="number"
                domain={["dataMin", "dataMax"]}
                scale="time"
                tickFormatter={(t) => formatTick(t, range)}
                tick={{ fill: "#707a8a", fontSize: 11, fontFamily: "JetBrains Mono" }}
                axisLine={{ stroke: "#2b3139" }}
                tickLine={false}
                minTickGap={48}
              />
              <YAxis
                domain={[numYMin, numYMax]}
                tick={{ fill: "#707a8a", fontSize: 11, fontFamily: "JetBrains Mono" }}
                axisLine={false}
                tickLine={false}
                width={56}
              />

              <Tooltip
                cursor={{ stroke: "#38bdf8", strokeWidth: 1, strokeDasharray: "3 3" }}
                contentStyle={{
                  background: "#0f1923",
                  border: "1px solid #38bdf8",
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: "JetBrains Mono",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                }}
                labelStyle={{ color: "#38bdf8", fontSize: 11 }}
                itemStyle={{ color: "#e2e8f0" }}
                labelFormatter={(t) => formatLabel(t as number, range)}
                formatter={(v: number) => [fmtNum(v, dp), "Price"]}
              />

              <Area
                type="monotone"
                dataKey="close"
                stroke="#8b8bff"
                fill={`url(#sg_${ticker})`}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />

              {/* ── Overlays ───────────────────────────────────────────────── */}
              {analyst && analyst.targetLow > 0 && analyst.targetHigh > 0 && (
                <ReferenceArea
                  y1={analyst.targetLow}
                  y2={analyst.targetHigh}
                  fill="#3b82f6"
                  fillOpacity={0.08}
                  stroke="#3b82f6"
                  strokeOpacity={0.25}
                  strokeDasharray="3 3"
                />
              )}
              {avgBuyP != null && avgBuyP > 0 && (
                <ReferenceLine
                  y={avgBuyP}
                  stroke="#ff7a45"
                  strokeDasharray="4 4"
                  label={{
                    value: `Buy ${avgBuyP.toFixed(dp)}`,
                    fill: "#8b8bff",
                    fontSize: 10,
                    position: "insideTopRight",
                  }}
                />
              )}
              {targetP != null && targetP > 0 && (
                <ReferenceLine
                  y={targetP}
                  stroke="#3b82f6"
                  strokeDasharray="4 4"
                  label={{
                    value: `Target ${targetP.toFixed(dp)}`,
                    fill: "#3b82f6",
                    fontSize: 10,
                    position: "insideBottomRight",
                  }}
                />
              )}

              {/* ── Zoom selection ──────────────────────────────────────────── */}
              {showSelection && (
                <ReferenceArea
                  x1={Math.min(refLeft!, refRight!)}
                  x2={Math.max(refLeft!, refRight!)}
                  fill="#929aa5"
                  fillOpacity={0.12}
                  stroke="#929aa5"
                  strokeOpacity={0.4}
                  strokeWidth={1}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
