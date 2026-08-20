import { useState } from "react";
import { View } from "react-native";
import { useAnalysis, useInsights } from "@/api/queries";
import { Screen } from "@/components/Screen";
import { Card, Hairline, Row } from "@/components/Card";
import { Heading, Body, Muted, Num, Eyebrow } from "@/components/Typography";
import { EmptyState } from "@/components/EmptyState";
import { CardSkeleton } from "@/components/Skeleton";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";
import type { AnalysisRange } from "@/api/endpoints";

const RANGES: AnalysisRange[] = ["1M", "6M", "YTD", "1Y", "5Y", "All"];

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

  const analysis = useAnalysis(range);
  const insights = useInsights(range);

  return (
    <Screen>
      <Eyebrow>Portfolio</Eyebrow>
      <Heading level={1} style={{ marginTop: 4, marginBottom: 16 }}>
        Analysis
      </Heading>

      <View style={{ flexDirection: "row", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {RANGES.map((r) => (
          <Body
            key={r}
            medium
            size={12}
            onPress={() => setRange(r)}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: radius.sm,
              backgroundColor: range === r ? t.primary : t.surfaceElevated,
              color: range === r ? t.onPrimary : t.textMuted,
              overflow: "hidden",
            }}
          >
            {r}
          </Body>
        ))}
      </View>

      {analysis.isLoading ? (
        <>
          <CardSkeleton height={180} />
          <View style={{ height: 16 }} />
          <CardSkeleton height={160} />
          <View style={{ height: 16 }} />
          <CardSkeleton height={140} />
        </>
      ) : analysis.isError || !analysis.data ? (
        <EmptyState
          icon="📊"
          title="No analysis data"
          subtitle="Add holdings to see risk metrics."
        />
      ) : (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Body medium size={15} style={{ marginBottom: 8 }}>
              Risk
            </Body>
            <Hairline />
            <MetricRow
              label="Volatility (ann.)"
              value={`${analysis.data.risk.annualizedVolPct.toFixed(1)}%`}
            />
            <Hairline />
            <MetricRow label="Sharpe ratio" value={analysis.data.risk.sharpePct.toFixed(2)} />
            <Hairline />
            <MetricRow
              label="Max drawdown"
              value={`${analysis.data.risk.maxDrawdownPct.toFixed(1)}%`}
            />
            {analysis.data.risk.betaVsBenchmark != null && (
              <>
                <Hairline />
                <MetricRow
                  label="Beta vs benchmark"
                  value={analysis.data.risk.betaVsBenchmark.toFixed(2)}
                />
              </>
            )}
          </Card>

          <Card style={{ marginBottom: 16 }}>
            <Body medium size={15} style={{ marginBottom: 8 }}>
              Concentration
            </Body>
            <Hairline />
            <MetricRow
              label="HHI (lower = diverse)"
              value={analysis.data.diversification.hhi.toFixed(4)}
            />
            {analysis.data.diversification.topHoldingsConcentration.slice(0, 5).map((h) => (
              <View key={h.ticker}>
                <Hairline />
                <Row style={{ paddingVertical: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                    <Body
                      medium
                      size={12}
                      style={{ fontFamily: "JetBrainsMono_500Medium", textTransform: "uppercase" }}
                    >
                      {h.ticker}
                    </Body>
                    <Muted size={11} numberOfLines={1} style={{ flexShrink: 1 }}>
                      {h.name}
                    </Muted>
                  </View>
                  <Num style={{ fontSize: 13 }}>{h.allocPct.toFixed(1)}%</Num>
                </Row>
              </View>
            ))}
          </Card>

          {analysis.data.income.projectedAnnualGBP > 0 && (
            <Card style={{ marginBottom: 16 }}>
              <Body medium size={15} style={{ marginBottom: 8 }}>
                Income
              </Body>
              <Hairline />
              <MetricRow
                label="Projected annual"
                value={`£${analysis.data.income.projectedAnnualGBP.toFixed(0)}`}
              />
              <Hairline />
              <MetricRow
                label="Portfolio yield"
                value={`${analysis.data.income.portfolioYieldPct.toFixed(2)}%`}
              />
            </Card>
          )}

          <Card style={{ marginBottom: 16 }}>
            <Body medium size={15} style={{ marginBottom: 8 }}>
              AI Insights
            </Body>
            <Hairline style={{ marginBottom: 12 }} />
            {insights.isLoading ? (
              <Muted size={13}>Loading insights…</Muted>
            ) : insights.data ? (
              <Muted size={13} style={{ lineHeight: 20 }}>
                {insights.data.narrative}
              </Muted>
            ) : (
              <Muted size={13}>Insights unavailable.</Muted>
            )}
          </Card>
        </>
      )}
    </Screen>
  );
}
