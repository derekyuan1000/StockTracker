import { useMemo, useState } from "react";
import { View } from "react-native";
import { compute, fmtGBP } from "@stocktracker/shared";
import { usePortfolio, useAnalysis, useInsights } from "@/api/queries";
import { Screen } from "@/components/Screen";
import { Card, Hairline, Row } from "@/components/Card";
import { Heading, Body, Muted, Num, Eyebrow } from "@/components/Typography";
import { CardSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";
import type { AnalysisRange } from "@/api/endpoints";

const RANGES: AnalysisRange[] = ["1M", "6M", "YTD", "1Y", "5Y", "All"];

const SECTOR_COLORS: Record<string, string> = {
  Fund: "#bdbbff",
  ETF: "#a78bfa",
  Technology: "#f472b6",
  Financials: "#60a5fa",
  Healthcare: "#34d399",
  Energy: "#fb923c",
  "Real Estate": "#a3e635",
  Utilities: "#67e8f9",
  "Communication Services": "#c084fc",
  "Consumer Discretionary": "#f87171",
  "Consumer Staples": "#fda4af",
  Materials: "#86efac",
  Other: "#94a3b8",
};

const STOCK_PALETTE = [
  "#bdbbff", "#60a5fa", "#34d399", "#fc4c02", "#a78bfa",
  "#fb923c", "#22d3ee", "#4ade80", "#f87171", "#818cf8",
];

function AllocationBar({ name, value, total, color }: {
  name: string; value: number; total: number; color: string;
}) {
  const { t } = useTheme();
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <View style={{ paddingVertical: 10 }}>
      <Row style={{ marginBottom: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
          <Body size={13} numberOfLines={1} style={{ flex: 1 }}>{name}</Body>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Num style={{ fontSize: 13 }}>{fmtGBP(value)}</Num>
          <Muted size={11}>{pct.toFixed(1)}%</Muted>
        </View>
      </Row>
      <View style={{ height: 4, backgroundColor: t.surfaceElevated, borderRadius: 2 }}>
        <View style={{ height: 4, width: `${Math.min(100, pct)}%` as `${number}%`, backgroundColor: color, borderRadius: 2 }} />
      </View>
    </View>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <Row style={{ paddingVertical: 10 }}>
      <Muted size={13}>{label}</Muted>
      <Num style={{ fontSize: 13 }}>{value}</Num>
    </Row>
  );
}

export default function AnalysisScreen() {
  const { t } = useTheme();
  const [range, setRange] = useState<AnalysisRange>("1Y");

  const { data: portfolio, isLoading: portfolioLoading } = usePortfolio();
  const analysis = useAnalysis(range);
  const insights = useInsights(range);

  const holdings = portfolio?.holdings ?? [];
  const p = useMemo(
    () => compute(holdings, portfolio?.cashGBP ?? 0),
    [holdings, portfolio?.cashGBP],
  );

  const sectorData = useMemo(() => {
    const groups = new Map<string, number>();
    p.rows.forEach((r) => {
      const key = r.bucket === "Fund" ? "Fund" : r.sector || "Other";
      groups.set(key, (groups.get(key) ?? 0) + r.marketValueGBP);
    });
    return Array.from(groups, ([name, value]) => ({
      name, value, color: SECTOR_COLORS[name] ?? "#929aa5",
    })).sort((a, b) => b.value - a.value);
  }, [p.rows]);

  const stockData = useMemo(
    () =>
      [...p.rows]
        .sort((a, b) => b.marketValueGBP - a.marketValueGBP)
        .map((r, i) => ({
          ticker: r.ticker.replace(".L", ""),
          name: r.name,
          value: r.marketValueGBP,
          color: STOCK_PALETTE[i % STOCK_PALETTE.length],
        })),
    [p.rows],
  );

  return (
    <Screen>
      <Eyebrow>Portfolio</Eyebrow>
      <Heading level={1} style={{ marginTop: 4, marginBottom: 16 }}>
        Analysis
      </Heading>

      {portfolioLoading ? (
        <>
          <CardSkeleton height={160} />
          <View style={{ height: 16 }} />
          <CardSkeleton height={200} />
        </>
      ) : !p.rows.length ? (
        <EmptyState icon="📊" title="No holdings" subtitle="Add holdings to see analysis." />
      ) : (
        <>
          <Card style={{ marginBottom: 16, padding: 0, paddingHorizontal: 16 }}>
            <Body medium size={15} style={{ paddingVertical: 12 }}>Sector breakdown</Body>
            <Hairline />
            {sectorData.map((s, i) => (
              <View key={s.name}>
                <AllocationBar name={s.name} value={s.value} total={p.marketValue} color={s.color} />
                {i < sectorData.length - 1 ? <Hairline /> : null}
              </View>
            ))}
          </Card>

          <Card style={{ marginBottom: 24, padding: 0, paddingHorizontal: 16 }}>
            <Body medium size={15} style={{ paddingVertical: 12 }}>Stock breakdown</Body>
            <Hairline />
            {stockData.map((s, i) => (
              <View key={s.ticker}>
                <AllocationBar name={s.name} value={s.value} total={p.marketValue} color={s.color} />
                {i < stockData.length - 1 ? <Hairline /> : null}
              </View>
            ))}
          </Card>
        </>
      )}

      <Eyebrow style={{ marginBottom: 8 }}>Risk metrics</Eyebrow>
      <View style={{ flexDirection: "row", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {RANGES.map((r) => (
          <Body key={r} medium size={12} onPress={() => setRange(r)} style={{
            paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.sm,
            backgroundColor: range === r ? t.primary : t.surfaceElevated,
            color: range === r ? t.onPrimary : t.textMuted, overflow: "hidden",
          }}>
            {r}
          </Body>
        ))}
      </View>

      {analysis.isLoading ? (
        <>
          <CardSkeleton height={180} />
          <View style={{ height: 16 }} />
          <CardSkeleton height={140} />
        </>
      ) : analysis.isError || !analysis.data ? (
        <EmptyState icon="📉" title="No risk data" subtitle="Add holdings to see risk metrics." />
      ) : (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Body medium size={15} style={{ marginBottom: 8 }}>Risk</Body>
            <Hairline />
            <MetricRow label="Volatility (ann.)" value={`${analysis.data.risk.annualizedVolPct.toFixed(1)}%`} />
            <Hairline />
            <MetricRow label="Sharpe ratio" value={analysis.data.risk.sharpePct.toFixed(2)} />
            <Hairline />
            <MetricRow label="Max drawdown" value={`${analysis.data.risk.maxDrawdownPct.toFixed(1)}%`} />
            {analysis.data.risk.betaVsBenchmark != null && (
              <>
                <Hairline />
                <MetricRow label="Beta vs benchmark" value={analysis.data.risk.betaVsBenchmark.toFixed(2)} />
              </>
            )}
          </Card>

          <Card style={{ marginBottom: 16 }}>
            <Body medium size={15} style={{ marginBottom: 8 }}>Concentration</Body>
            <Hairline />
            <MetricRow label="HHI (lower = diverse)" value={analysis.data.diversification.hhi.toFixed(4)} />
            {analysis.data.diversification.topHoldingsConcentration.slice(0, 5).map((h) => (
              <View key={h.ticker}>
                <Hairline />
                <Row style={{ paddingVertical: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                    <Body medium size={12} style={{ fontFamily: "JetBrainsMono_500Medium", textTransform: "uppercase" }}>
                      {h.ticker}
                    </Body>
                    <Muted size={11} numberOfLines={1} style={{ flexShrink: 1 }}>{h.name}</Muted>
                  </View>
                  <Num style={{ fontSize: 13 }}>{h.allocPct.toFixed(1)}%</Num>
                </Row>
              </View>
            ))}
          </Card>

          {analysis.data.income.projectedAnnualGBP > 0 && (
            <Card style={{ marginBottom: 16 }}>
              <Body medium size={15} style={{ marginBottom: 8 }}>Income</Body>
              <Hairline />
              <MetricRow label="Projected annual" value={`£${analysis.data.income.projectedAnnualGBP.toFixed(0)}`} />
              <Hairline />
              <MetricRow label="Portfolio yield" value={`${analysis.data.income.portfolioYieldPct.toFixed(2)}%`} />
            </Card>
          )}

          <Card style={{ marginBottom: 16 }}>
            <Body medium size={15} style={{ marginBottom: 8 }}>AI Insights</Body>
            <Hairline style={{ marginBottom: 12 }} />
            {insights.isLoading ? (
              <Muted size={13}>Loading insights…</Muted>
            ) : insights.data ? (
              <Muted size={13} style={{ lineHeight: 20 }}>{insights.data.narrative}</Muted>
            ) : (
              <Muted size={13}>Insights unavailable.</Muted>
            )}
          </Card>
        </>
      )}
    </Screen>
  );
}
