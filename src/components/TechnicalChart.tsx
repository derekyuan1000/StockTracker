import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import {
  ChevronDown,
  Maximize2,
  Minimize2,
  Minus,
  MousePointer2,
  Settings2,
  Trash2,
  ZoomIn,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getPriceHistory } from "@/fns/holdings";
import { buildIndicatorRows } from "@/lib/indicators";
import { fmtNum } from "@/lib/format";
import type { HistoryRange } from "@/server/market/types";

// ─── Candle interval (per-bar timeframe) ──────────────────────────────────────
type CandleInterval = "5m" | "15m" | "1h" | "D" | "W" | "M";
const CANDLE_INTERVALS: CandleInterval[] = ["5m", "15m", "1h", "D", "W", "M"];
const INTERVAL_TO_RANGE: Record<CandleInterval, HistoryRange> = {
  "5m": "1D",
  "15m": "5D",
  "1h": "1H",
  D: "1Y",
  W: "5Y",
  M: "MAX_MO",
};

function formatTick(ts: number, iv: CandleInterval): string {
  const d = new Date(ts);
  if (iv === "5m" || iv === "15m")
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (iv === "1h") return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit" });
  if (iv === "D") return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

function formatLabel(ts: number, iv: CandleInterval): string {
  const d = new Date(ts);
  if (iv === "5m" || iv === "15m") return d.toLocaleString("en-GB");
  if (iv === "1h")
    return d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Drawing tools ─────────────────────────────────────────────────────────────
type DrawTool = "cursor" | "zoom" | "hline" | "vline";

// ─── Indicators ───────────────────────────────────────────────────────────────
const SMA_PERIODS = [20, 50, 200];
const EMA_PERIODS = [20, 50];
const SMA_COLORS: Record<number, string> = { 20: "#fc4c02", 50: "#ef2cc1", 200: "#bdbbff" };
const EMA_COLORS: Record<number, string> = { 20: "#fb923c", 50: "#c084fc" };

interface Indicators {
  volume: boolean;
  ma: boolean;
  bollinger: boolean;
  rsi: boolean;
  macd: boolean;
}

// ─── Chart settings ────────────────────────────────────────────────────────────
interface ChartSettings {
  showGrid: boolean;
  logScale: boolean;
  showAvgBuy: boolean;
}

// ─── Shapes & helpers ─────────────────────────────────────────────────────────

interface CandlePayload {
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  macdHist?: number | null;
}

interface BarShapeProps {
  x: number;
  y: number;
  width: number;
  height: number;
  payload?: CandlePayload;
}

interface ChartMouseEvent {
  activeLabel?: number | string;
  activePayload?: Array<{ payload: CandlePayload }>;
}

const TICK_STYLE = { fill: "var(--text-muted)", fontSize: 11, fontFamily: "JetBrains Mono" };
const TOOLTIP_STYLE: React.CSSProperties = {
  background: "var(--surface-card)",
  border: "1px solid var(--hairline)",
  borderRadius: 4,
  fontSize: 12,
  fontFamily: "JetBrains Mono",
  boxShadow: "none",
  padding: "8px 12px",
};

const SYNC_ID = "technical-chart";

function CandleShape(raw: unknown): React.ReactElement {
  const { x, y, width, height, payload } = raw as BarShapeProps;
  if (!payload || !height) return <g />;
  const { open, close, high, low } = payload;
  const isUp = close >= open;
  const color = isUp ? "var(--up)" : "var(--down)";
  const wickSpan = high - low;
  const yOpen = wickSpan > 0 ? y + ((high - open) / wickSpan) * height : y;
  const yClose = wickSpan > 0 ? y + ((high - close) / wickSpan) * height : y;
  const bodyTop = Math.min(yOpen, yClose);
  const bodyH = Math.max(Math.abs(yOpen - yClose), 1);
  const cx = x + width / 2;
  return (
    <g>
      <line x1={cx} y1={y} x2={cx} y2={y + height} stroke={color} strokeWidth={1} />
      <rect x={x + 1} y={bodyTop} width={Math.max(width - 2, 2)} height={bodyH} fill={color} />
    </g>
  );
}

function VolumeBar(raw: unknown): React.ReactElement {
  const { x, y, width, height, payload } = raw as BarShapeProps;
  if (!payload) return <g />;
  const isUp = payload.close >= payload.open;
  return (
    <rect
      x={x}
      y={y}
      width={Math.max(width - 1, 1)}
      height={height}
      fill={isUp ? "var(--up)" : "var(--down)"}
      fillOpacity={0.45}
    />
  );
}

function MacdBar(raw: unknown): React.ReactElement {
  const { x, y, width, height, payload } = raw as BarShapeProps;
  if (!payload) return <g />;
  const isPos = (payload.macdHist ?? 0) >= 0;
  return (
    <rect
      x={x}
      y={y}
      width={Math.max(width - 1, 1)}
      height={height}
      fill={isPos ? "var(--up)" : "var(--down)"}
      fillOpacity={0.6}
    />
  );
}

// ─── Click-outside dropdown hook ──────────────────────────────────────────────
function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

// ─── Checkbox item ─────────────────────────────────────────────────────────────
function CheckItem({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors hover:bg-canvas/60"
    >
      <span
        className={`flex size-3.5 shrink-0 items-center justify-center rounded-sm border ${
          checked ? "border-[var(--primary)] bg-[var(--primary)]" : "border-hairline bg-transparent"
        }`}
      >
        {checked && (
          <svg viewBox="0 0 10 10" className="size-2.5" fill="none">
            <polyline
              points="1.5,5 4,7.5 8.5,2.5"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className="eyebrow text-[10px] text-text-body">{label}</span>
    </button>
  );
}

// ─── Toggle switch ─────────────────────────────────────────────────────────────
function ToggleRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center justify-between px-3 py-1.5 transition-colors hover:bg-canvas/60"
    >
      <span className="eyebrow text-[10px] text-text-body">{label}</span>
      <span
        className={`flex h-4 w-7 items-center rounded-full transition-colors ${
          checked ? "bg-[var(--primary)]" : "bg-[var(--hairline)]"
        }`}
      >
        <span
          className={`ml-0.5 size-3 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-3" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export interface TechnicalChartProps {
  ticker: string;
  currency?: string;
  avgBuyP?: number;
  defaultInterval?: CandleInterval;
}

const DRAW_TOOLS: { key: DrawTool; title: string; icon: React.ReactNode }[] = [
  { key: "cursor", title: "Cursor", icon: <MousePointer2 className="size-4" /> },
  { key: "zoom", title: "Zoom Select — drag to zoom", icon: <ZoomIn className="size-4" /> },
  { key: "hline", title: "Horizontal Ray — click to add", icon: <Minus className="size-4" /> },
  {
    key: "vline",
    title: "Vertical Line — click to add",
    icon: <Minus className="size-4 rotate-90" />,
  },
];

export function TechnicalChart({
  ticker,
  currency,
  avgBuyP,
  defaultInterval = "D",
}: TechnicalChartProps) {
  const [interval, setInterval] = useState<CandleInterval>(defaultInterval);
  const [indicators, setIndicators] = useState<Indicators>({
    volume: true,
    ma: false,
    bollinger: false,
    rsi: false,
    macd: false,
  });
  const [settings, setSettings] = useState<ChartSettings>({
    showGrid: true,
    logScale: false,
    showAvgBuy: true,
  });
  const [tool, setTool] = useState<DrawTool>("cursor");
  const [hlines, setHlines] = useState<number[]>([]);
  const [vlines, setVlines] = useState<number[]>([]);
  const [refLeft, setRefLeft] = useState<number | null>(null);
  const [refRight, setRefRight] = useState<number | null>(null);
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [yPanOffset, setYPanOffset] = useState(0);
  const isSelecting = useRef(false);
  const lastHoverRef = useRef<{ price: number; ts: number } | null>(null);

  const indicatorDropdown = useDropdown();
  const settingsDropdown = useDropdown();

  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  const { data: rawBars = [], isLoading } = useQuery({
    queryKey: ["price-history", ticker, INTERVAL_TO_RANGE[interval]],
    queryFn: () => getPriceHistory({ data: { ticker, range: INTERVAL_TO_RANGE[interval] } }),
    enabled: !!ticker,
  });

  const indicatorOpts = useMemo(
    () => ({
      sma: indicators.ma ? SMA_PERIODS : [],
      ema: indicators.ma ? EMA_PERIODS : [],
      bollinger: indicators.bollinger ? {} : undefined,
      rsi: indicators.rsi ? {} : undefined,
      macd: indicators.macd ? {} : undefined,
    }),
    [indicators],
  );

  const allRows = useMemo(
    () => buildIndicatorRows(rawBars, indicatorOpts),
    [rawBars, indicatorOpts],
  );

  const rows = useMemo(
    () =>
      zoomDomain
        ? allRows.filter((r) => r.ts >= zoomDomain[0] && r.ts <= zoomDomain[1])
        : allRows.slice(-120),
    [allRows, zoomDomain],
  );

  const dp = currency === "GBP" ? 2 : 0;
  const rawPriceMin = rows.length ? Math.min(...rows.map((r) => r.low)) * 0.999 : 0;
  const rawPriceMax = rows.length ? Math.max(...rows.map((r) => r.high)) * 1.001 : 1;
  const priceMin = rawPriceMin + yPanOffset;
  const priceMax = rawPriceMax + yPanOffset;
  const showSelection = refLeft != null && refRight != null && refLeft !== refRight;

  const handleMouseDown = useCallback(
    (e: ChartMouseEvent) => {
      if (tool !== "zoom") return;
      if (e?.activeLabel != null) {
        isSelecting.current = true;
        setRefLeft(Number(e.activeLabel));
        setRefRight(null);
      }
    },
    [tool],
  );

  const handleMouseMove = useCallback((e: ChartMouseEvent) => {
    if (e?.activePayload?.[0]?.payload && e.activeLabel != null) {
      lastHoverRef.current = {
        price: e.activePayload[0].payload.close,
        ts: Number(e.activeLabel),
      };
    }
    if (isSelecting.current && e?.activeLabel != null) setRefRight(Number(e.activeLabel));
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isSelecting.current && refLeft != null && refRight != null && refLeft !== refRight) {
      const l = Math.min(refLeft, refRight),
        r = Math.max(refLeft, refRight);
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

  const handleChartClick = useCallback(() => {
    const hover = lastHoverRef.current;
    if (!hover) return;
    if (tool === "hline") setHlines((prev) => [...prev, hover.price]);
    else if (tool === "vline") setVlines((prev) => [...prev, hover.ts]);
  }, [tool]);

  function toggleIndicator(key: keyof Indicators) {
    setIndicators((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleSetting(key: keyof ChartSettings) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const xAxisProps = {
    dataKey: "ts" as const,
    type: "number" as const,
    domain: ["dataMin", "dataMax"] as [string, string],
    scale: "time" as const,
    tick: TICK_STYLE,
    axisLine: { stroke: "var(--hairline)" },
    tickLine: false as const,
    minTickGap: 48,
  };

  const yScale = settings.logScale ? ("log" as const) : ("linear" as const);
  const hasSubPanes = indicators.volume || indicators.rsi || indicators.macd;
  const bottomPane = indicators.macd
    ? "macd"
    : indicators.rsi
      ? "rsi"
      : indicators.volume
        ? "volume"
        : "price";
  const activeIndicatorCount = Object.values(indicators).filter(Boolean).length;

  const priceTooltip = useCallback(
    ({
      active,
      payload,
      label,
    }: {
      active?: boolean;
      payload?: Array<{ payload: CandlePayload }>;
      label?: number;
    }) => {
      if (!active || !payload?.length) return null;
      const row = payload[0]?.payload;
      if (!row || row.open == null) return null;
      const isUp = row.close >= row.open;
      return (
        <div style={TOOLTIP_STYLE}>
          <p className="mb-1.5 text-[10px] text-text-muted">
            {formatLabel(Number(label), interval)}
          </p>
          <table className="text-[11px]">
            <tbody>
              {(
                [
                  ["O", row.open],
                  ["H", row.high],
                  ["L", row.low],
                  ["C", row.close],
                ] as [string, number][]
              ).map(([k, v]) => (
                <tr key={k}>
                  <td className="pr-4 text-text-muted">{k}</td>
                  <td
                    className={`num ${k === "C" ? (isUp ? "text-[var(--up)]" : "text-[var(--down)]") : "text-text-body"}`}
                  >
                    {fmtNum(v, dp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    },
    [interval, dp],
  );

  const toolCursor =
    tool === "zoom"
      ? "cursor-crosshair"
      : tool === "hline" || tool === "vline"
        ? "cursor-cell"
        : "";

  // Fullscreen layout
  const outerCls = isFullscreen ? "fixed inset-0 z-50 flex flex-col bg-[var(--canvas)]" : undefined;
  const cardCls = `overflow-hidden rounded-sm border border-hairline bg-[var(--surface-card)]${isFullscreen ? " flex flex-1 flex-col" : ""}`;
  const bodyRowCls = `flex${isFullscreen ? " flex-1 min-h-0" : ""}`;
  const chartsColCls = `flex flex-col flex-1${isFullscreen ? " min-w-0 overflow-hidden" : ""}`;
  const pricePaneStyle = isFullscreen ? undefined : { height: hasSubPanes ? 800 : 1000 };
  const pricePaneCls = `${toolCursor}${isFullscreen ? " flex-1 min-h-0" : ""}`;
  const volH = isFullscreen ? 160 : 200;
  const oscH = isFullscreen ? 260 : 320;

  const gridProps = settings.showGrid
    ? { stroke: "var(--hairline)" as const, strokeOpacity: 0.5 }
    : null;

  return (
    <div className={outerCls}>
      <div className={cardCls}>
        {/* ── Toolbar ──────────────────────────────────────────────────────── */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-hairline bg-[var(--surface-elevated)] px-3 py-2">
          {/* Candle interval selector */}
          <div className="flex items-center gap-0.5">
            {CANDLE_INTERVALS.map((iv) => (
              <button
                key={iv}
                onClick={() => {
                  setInterval(iv);
                  setZoomDomain(null);
                  setYPanOffset(0);
                }}
                className={`num rounded px-2 py-1 text-[11px] font-medium tracking-wide transition-colors ${
                  interval === iv
                    ? "bg-canvas text-[var(--primary)]"
                    : "text-text-muted hover:bg-canvas/60 hover:text-text-body"
                }`}
              >
                {iv}
              </button>
            ))}
            {(zoomDomain || yPanOffset !== 0) && (
              <>
                <span className="mx-1 text-hairline">|</span>
                <button
                  onClick={() => {
                    setZoomDomain(null);
                    setYPanOffset(0);
                  }}
                  className="num rounded px-2 py-1 text-[11px] text-[var(--primary)] hover:bg-canvas/60"
                >
                  ↺ Reset
                </button>
              </>
            )}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1.5">
            {/* Indicators dropdown */}
            <div className="relative" ref={indicatorDropdown.ref}>
              <button
                onClick={() => indicatorDropdown.setOpen((o) => !o)}
                className={`num flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  activeIndicatorCount > 0
                    ? "bg-[var(--primary)]/10 text-[var(--primary)] ring-1 ring-[var(--primary)]/30"
                    : "text-text-muted hover:bg-canvas/60 hover:text-text-body"
                }`}
              >
                Indicators{activeIndicatorCount > 0 ? ` (${activeIndicatorCount})` : ""}
                <ChevronDown className="size-3" />
              </button>
              {indicatorDropdown.open && (
                <div className="absolute top-full right-0 z-30 mt-1 w-48 rounded-sm border border-hairline bg-[var(--surface-elevated)] py-1 shadow-md">
                  <CheckItem
                    label="Volume"
                    checked={indicators.volume}
                    onToggle={() => toggleIndicator("volume")}
                  />
                  <CheckItem
                    label="Moving Avg (SMA / EMA)"
                    checked={indicators.ma}
                    onToggle={() => toggleIndicator("ma")}
                  />
                  <CheckItem
                    label="Bollinger Bands"
                    checked={indicators.bollinger}
                    onToggle={() => toggleIndicator("bollinger")}
                  />
                  <CheckItem
                    label="RSI"
                    checked={indicators.rsi}
                    onToggle={() => toggleIndicator("rsi")}
                  />
                  <CheckItem
                    label="MACD"
                    checked={indicators.macd}
                    onToggle={() => toggleIndicator("macd")}
                  />
                </div>
              )}
            </div>

            {/* Settings dropdown */}
            <div className="relative" ref={settingsDropdown.ref}>
              <button
                onClick={() => settingsDropdown.setOpen((o) => !o)}
                title="Chart settings"
                className="rounded p-1 text-text-muted transition-colors hover:bg-canvas/60 hover:text-text-body"
              >
                <Settings2 className="size-3.5" />
              </button>
              {settingsDropdown.open && (
                <div className="absolute top-full right-0 z-30 mt-1 w-52 rounded-sm border border-hairline bg-[var(--surface-elevated)] py-1 shadow-md">
                  <p className="eyebrow px-3 pb-0.5 pt-1.5 text-[9px] uppercase tracking-wider text-text-muted">
                    Chart Settings
                  </p>
                  <ToggleRow
                    label="Grid lines"
                    checked={settings.showGrid}
                    onToggle={() => toggleSetting("showGrid")}
                  />
                  <ToggleRow
                    label="Logarithmic scale"
                    checked={settings.logScale}
                    onToggle={() => toggleSetting("logScale")}
                  />
                  <ToggleRow
                    label="Show avg buy price"
                    checked={settings.showAvgBuy}
                    onToggle={() => toggleSetting("showAvgBuy")}
                  />
                </div>
              )}
            </div>

            <span className="text-[var(--hairline)]">|</span>

            <button
              onClick={() => setIsFullscreen((f) => !f)}
              title={isFullscreen ? "Exit full screen (Esc)" : "Full screen"}
              className="rounded p-1 text-text-muted transition-colors hover:bg-canvas/60 hover:text-text-body"
            >
              {isFullscreen ? (
                <Minimize2 className="size-3.5" />
              ) : (
                <Maximize2 className="size-3.5" />
              )}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div
            className={`flex items-center justify-center text-sm text-text-muted${isFullscreen ? " flex-1" : ""}`}
            style={isFullscreen ? undefined : { height: 500 }}
          >
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div
            className={`flex items-center justify-center text-sm text-text-muted${isFullscreen ? " flex-1" : ""}`}
            style={isFullscreen ? undefined : { height: 500 }}
          >
            No data available for this range.
          </div>
        ) : (
          <div className={bodyRowCls}>
            {/* ── Drawing tools sidebar ─────────────────────────────────────── */}
            <div className="flex shrink-0 flex-col items-center gap-0.5 border-r border-hairline bg-[var(--surface-elevated)] px-1 py-2">
              {DRAW_TOOLS.map(({ key, title, icon }) => (
                <button
                  key={key}
                  title={title}
                  onClick={() => setTool(key)}
                  className={`rounded p-1.5 transition-colors ${
                    tool === key
                      ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                      : "text-text-muted hover:bg-canvas/60 hover:text-text-body"
                  }`}
                >
                  {icon}
                </button>
              ))}
              <div className="my-1 w-6 border-t border-hairline" />
              <button
                title="Clear all drawings"
                onClick={() => {
                  setHlines([]);
                  setVlines([]);
                }}
                className="rounded p-1.5 text-text-muted transition-colors hover:bg-canvas/60 hover:text-text-body"
              >
                <Trash2 className="size-4" />
              </button>
            </div>

            {/* ── Chart column ──────────────────────────────────────────────── */}
            <div className={chartsColCls}>
              {/* ── Price pane ──────────────────────────────────────────────── */}
              <div
                className={pricePaneCls}
                style={pricePaneStyle}
                onWheel={(e) => {
                  e.preventDefault();
                  const range = rawPriceMax - rawPriceMin;
                  setYPanOffset((prev) => prev - (e.deltaY / 300) * range);
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={rows}
                    margin={{ top: 12, right: 8, left: 0, bottom: 0 }}
                    syncId={SYNC_ID}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    onClick={handleChartClick}
                  >
                    {gridProps && <CartesianGrid {...gridProps} />}
                    <XAxis
                      {...xAxisProps}
                      tickFormatter={(t) => formatTick(t, interval)}
                      hide={bottomPane !== "price"}
                    />
                    <YAxis
                      domain={[priceMin, priceMax]}
                      scale={yScale}
                      tick={TICK_STYLE}
                      axisLine={false}
                      tickLine={false}
                      width={64}
                      tickFormatter={(v) => fmtNum(v, dp)}
                      orientation="right"
                    />
                    <Tooltip content={priceTooltip} />

                    {indicators.bollinger && (
                      <>
                        <Line
                          type="monotone"
                          dataKey="bollUpper"
                          stroke="#bdbbff"
                          strokeWidth={1}
                          strokeDasharray="4 3"
                          strokeOpacity={0.7}
                          dot={false}
                          isAnimationActive={false}
                          connectNulls={false}
                          name="BB Upper"
                        />
                        <Line
                          type="monotone"
                          dataKey="bollMid"
                          stroke="#bdbbff"
                          strokeWidth={1}
                          strokeOpacity={0.5}
                          dot={false}
                          isAnimationActive={false}
                          connectNulls={false}
                          name="BB Mid"
                        />
                        <Line
                          type="monotone"
                          dataKey="bollLower"
                          stroke="#bdbbff"
                          strokeWidth={1}
                          strokeDasharray="4 3"
                          strokeOpacity={0.7}
                          dot={false}
                          isAnimationActive={false}
                          connectNulls={false}
                          name="BB Lower"
                        />
                      </>
                    )}

                    {indicators.ma &&
                      SMA_PERIODS.map((p) => (
                        <Line
                          key={`sma${p}`}
                          type="monotone"
                          dataKey={`sma.${p}`}
                          stroke={SMA_COLORS[p]}
                          strokeWidth={1.5}
                          dot={false}
                          isAnimationActive={false}
                          connectNulls={false}
                          name={`SMA ${p}`}
                        />
                      ))}
                    {indicators.ma &&
                      EMA_PERIODS.map((p) => (
                        <Line
                          key={`ema${p}`}
                          type="monotone"
                          dataKey={`ema.${p}`}
                          stroke={EMA_COLORS[p]}
                          strokeWidth={1.5}
                          strokeDasharray="5 3"
                          dot={false}
                          isAnimationActive={false}
                          connectNulls={false}
                          name={`EMA ${p}`}
                        />
                      ))}

                    <Bar dataKey="wickRange" shape={CandleShape} isAnimationActive={false} />

                    {/* User drawings */}
                    {hlines.map((price, i) => (
                      <ReferenceLine
                        key={`hl${i}`}
                        y={price}
                        stroke="var(--primary)"
                        strokeDasharray="4 4"
                        strokeOpacity={0.75}
                        strokeWidth={1.5}
                        label={{
                          value: fmtNum(price, dp),
                          fill: "var(--primary)",
                          fontSize: 10,
                          position: "insideTopRight",
                        }}
                      />
                    ))}
                    {vlines.map((ts, i) => (
                      <ReferenceLine
                        key={`vl${i}`}
                        x={ts}
                        stroke="var(--primary)"
                        strokeDasharray="4 4"
                        strokeOpacity={0.75}
                        strokeWidth={1.5}
                      />
                    ))}

                    {settings.showAvgBuy && avgBuyP != null && avgBuyP > 0 && (
                      <ReferenceLine
                        y={avgBuyP}
                        stroke="#fc4c02"
                        strokeDasharray="4 4"
                        label={{
                          value: `Avg ${fmtNum(avgBuyP, dp)}`,
                          fill: "#fc4c02",
                          fontSize: 10,
                          position: "insideTopRight",
                        }}
                      />
                    )}

                    {showSelection && (
                      <ReferenceArea
                        x1={Math.min(refLeft!, refRight!)}
                        x2={Math.max(refLeft!, refRight!)}
                        fill="var(--text-muted)"
                        fillOpacity={0.1}
                        stroke="var(--text-muted)"
                        strokeOpacity={0.3}
                        strokeWidth={1}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* ── Volume pane ─────────────────────────────────────────────── */}
              {indicators.volume && (
                <div
                  className="shrink-0 cursor-crosshair border-t border-hairline"
                  style={{ height: volH }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={rows}
                      margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                      syncId={SYNC_ID}
                    >
                      {gridProps && (
                        <CartesianGrid {...gridProps} vertical={false} horizontal={true} />
                      )}
                      <XAxis
                        {...xAxisProps}
                        tickFormatter={(t) => formatTick(t, interval)}
                        hide={bottomPane !== "volume"}
                      />
                      <YAxis
                        tick={TICK_STYLE}
                        axisLine={false}
                        tickLine={false}
                        width={64}
                        orientation="right"
                        tickFormatter={(v) =>
                          v >= 1_000_000
                            ? `${(v / 1_000_000).toFixed(0)}M`
                            : v >= 1_000
                              ? `${(v / 1_000).toFixed(0)}K`
                              : String(v)
                        }
                      />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        labelStyle={{ color: "var(--text-muted)", fontSize: 11 }}
                        itemStyle={{ color: "var(--text-body)" }}
                        labelFormatter={(t) => formatLabel(t as number, interval)}
                        formatter={(v: number) => [
                          v >= 1_000_000
                            ? `${(v / 1_000_000).toFixed(2)}M`
                            : v >= 1_000
                              ? `${(v / 1_000).toFixed(0)}K`
                              : String(v),
                          "Volume",
                        ]}
                      />
                      <Bar dataKey="volume" shape={VolumeBar} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* ── RSI pane ────────────────────────────────────────────────── */}
              {indicators.rsi && (
                <div
                  className="shrink-0 cursor-crosshair border-t border-hairline"
                  style={{ height: oscH }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={rows}
                      margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                      syncId={SYNC_ID}
                    >
                      {gridProps && (
                        <CartesianGrid {...gridProps} vertical={false} horizontal={true} />
                      )}
                      <XAxis
                        {...xAxisProps}
                        tickFormatter={(t) => formatTick(t, interval)}
                        hide={bottomPane !== "rsi"}
                      />
                      <YAxis
                        domain={[0, 100]}
                        ticks={[30, 50, 70]}
                        tick={TICK_STYLE}
                        axisLine={false}
                        tickLine={false}
                        width={64}
                        orientation="right"
                      />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        labelStyle={{ color: "var(--text-muted)", fontSize: 11 }}
                        itemStyle={{ color: "var(--text-body)" }}
                        labelFormatter={(t) => formatLabel(t as number, interval)}
                        formatter={(v: number) => [v.toFixed(2), "RSI"]}
                      />
                      <ReferenceLine
                        y={70}
                        stroke="var(--down)"
                        strokeDasharray="3 3"
                        strokeOpacity={0.5}
                        label={{
                          value: "70",
                          fill: "var(--text-muted)",
                          fontSize: 9,
                          position: "insideRight",
                        }}
                      />
                      <ReferenceLine
                        y={30}
                        stroke="var(--up)"
                        strokeDasharray="3 3"
                        strokeOpacity={0.5}
                        label={{
                          value: "30",
                          fill: "var(--text-muted)",
                          fontSize: 9,
                          position: "insideRight",
                        }}
                      />
                      <ReferenceLine y={50} stroke="var(--hairline)" strokeOpacity={0.4} />
                      <Line
                        type="monotone"
                        dataKey="rsi"
                        stroke="#bdbbff"
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false}
                        connectNulls={false}
                        name="RSI"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* ── MACD pane ───────────────────────────────────────────────── */}
              {indicators.macd && (
                <div
                  className="shrink-0 cursor-crosshair border-t border-hairline"
                  style={{ height: oscH }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={rows}
                      margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                      syncId={SYNC_ID}
                    >
                      {gridProps && (
                        <CartesianGrid {...gridProps} vertical={false} horizontal={true} />
                      )}
                      <XAxis
                        {...xAxisProps}
                        tickFormatter={(t) => formatTick(t, interval)}
                        hide={bottomPane !== "macd"}
                      />
                      <YAxis
                        tick={TICK_STYLE}
                        axisLine={false}
                        tickLine={false}
                        width={64}
                        orientation="right"
                        tickFormatter={(v) => fmtNum(v, dp + 2)}
                      />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        labelStyle={{ color: "var(--text-muted)", fontSize: 11 }}
                        itemStyle={{ color: "var(--text-body)" }}
                        labelFormatter={(t) => formatLabel(t as number, interval)}
                        formatter={(v: number, name: string) => [fmtNum(v, dp + 2), name]}
                      />
                      <ReferenceLine y={0} stroke="var(--hairline)" strokeOpacity={0.7} />
                      <Bar
                        dataKey="macdHist"
                        shape={MacdBar}
                        isAnimationActive={false}
                        name="Hist"
                      />
                      <Line
                        type="monotone"
                        dataKey="macdLine"
                        stroke="#fc4c02"
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false}
                        connectNulls={false}
                        name="MACD"
                      />
                      <Line
                        type="monotone"
                        dataKey="macdSignal"
                        stroke="#bdbbff"
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false}
                        connectNulls={false}
                        name="Signal"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* ── MA/BB legend ────────────────────────────────────────────── */}
              {(indicators.ma || indicators.bollinger) && (
                <div className="flex shrink-0 flex-wrap gap-x-4 gap-y-1 border-t border-hairline px-3 py-2">
                  {indicators.bollinger && (
                    <span className="eyebrow flex items-center gap-1.5 text-[10px]">
                      <span className="inline-block h-px w-4" style={{ background: "#bdbbff" }} />
                      BB (20,2)
                    </span>
                  )}
                  {indicators.ma &&
                    SMA_PERIODS.map((p) => (
                      <span key={p} className="eyebrow flex items-center gap-1.5 text-[10px]">
                        <span
                          className="inline-block h-px w-4"
                          style={{ background: SMA_COLORS[p] }}
                        />
                        SMA {p}
                      </span>
                    ))}
                  {indicators.ma &&
                    EMA_PERIODS.map((p) => (
                      <span key={p} className="eyebrow flex items-center gap-1.5 text-[10px]">
                        <span
                          className="inline-block h-px w-4"
                          style={{ background: EMA_COLORS[p], opacity: 0.8 }}
                        />
                        EMA {p}
                      </span>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
