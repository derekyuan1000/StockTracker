import { useMemo, useState, useCallback } from "react";
import { View, Pressable, ScrollView, RefreshControl, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { X } from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { compute } from "@stocktracker/shared";
import { fmtGBP, fmtGBPSigned, fmtPct, dir } from "@stocktracker/shared";
import { usePortfolio, usePortfolioHistory } from "@/api/queries";
import { qk } from "@/api/queries";
import { useLocalSetting } from "@/hooks/useLocalSetting";
import { haptic } from "@/haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { Screen } from "@/components/Screen";
import { Card, Hairline, Row } from "@/components/Card";
import { Heading, Body, Muted, Num, Eyebrow } from "@/components/Typography";
import { EmptyState } from "@/components/EmptyState";
import { CardSkeleton } from "@/components/Skeleton";
import { StockDetailPanel } from "@/components/StockDetailPanel";
import { PerformanceChart } from "@/charts/PerformanceChart";
import { useIsTablet, SIDEBAR_WIDTH } from "@/hooks/useIsTablet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius } from "@/theme/tokens";
import type { HistoryRange } from "@/api/endpoints";
import type { HoldingComputed } from "@stocktracker/shared";

// Reduced from the web's 8 ranges — a 4x2 grid doesn't fit a 360dp screen legibly.
const RANGES: HistoryRange[] = ["1D", "1M", "6M", "1Y", "All"];

function HoldingCard({
  h,
  onPress,
  selected,
}: {
  h: HoldingComputed;
  onPress: () => void;
  selected?: boolean;
}) {
  const { t } = useTheme();
  const color = { up: t.up, down: t.down, flat: t.textMutedStrong }[dir(h.unrealisedGL)];

  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 12,
        backgroundColor: selected ? t.surfaceElevated : "transparent",
        marginHorizontal: selected ? -16 : 0,
        paddingHorizontal: selected ? 16 : 0,
      }}
    >
      <Row>
        <View style={{ flex: 1, marginRight: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
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
          <Muted size={11} style={{ marginTop: 2 }}>
            {h.allocActual.toFixed(1)}% of portfolio
          </Muted>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Num medium>{fmtGBP(h.marketValueGBP)}</Num>
          <Num style={{ color, fontSize: 12, marginTop: 2 }}>
            {fmtGBPSigned(h.unrealisedGL)} ({fmtPct(h.unrealisedPct)})
          </Num>
        </View>
      </Row>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const { t } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const qc = useQueryClient();
  const { data: portfolio, isLoading } = usePortfolio();
  const [range, setRange, rangeLoaded] = useLocalSetting<HistoryRange>("st-default-range", "1Y");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  const onRefresh = useCallback(async () => {
    haptic.impact();
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: qk.portfolio }),
      qc.invalidateQueries({ queryKey: qk.portfolioHistory(rangeLoaded ? range : "1Y") }),
    ]);
    setRefreshing(false);
  }, [qc, range, rangeLoaded]);

  const holdings = portfolio?.holdings ?? [];
  const cashGBP = portfolio?.cashGBP ?? 0;

  const p = useMemo(() => compute(holdings, cashGBP), [holdings, cashGBP]);
  const sortedRows = useMemo(
    () => [...p.rows].sort((a, b) => b.marketValueGBP - a.marketValueGBP),
    [p.rows],
  );

  const { data: history = [], isFetching: historyFetching } = usePortfolioHistory(
    rangeLoaded ? range : "1Y",
  );

  const changeColor = { up: t.up, down: t.down, flat: t.textMutedStrong }[dir(p.dayChangeGBP)];
  const allTimeColor = { up: t.up, down: t.down, flat: t.textMutedStrong }[dir(p.unrealisedGL)];

  if (isLoading) {
    if (isTablet) {
      return (
        <View style={{ flex: 1, flexDirection: "row", marginLeft: SIDEBAR_WIDTH, backgroundColor: t.canvas }}>
          <View style={{ flex: 0.38, padding: 16, paddingTop: insets.top + 12 }}>
            <CardSkeleton height={200} />
          </View>
          <View style={{ flex: 0.62, padding: 16, paddingTop: insets.top + 12 }}>
            <CardSkeleton height={300} />
          </View>
        </View>
      );
    }
    return (
      <Screen>
        <CardSkeleton height={200} />
        <View style={{ height: 16 }} />
        <CardSkeleton height={300} />
      </Screen>
    );
  }

  // ─── Tablet split-pane layout ───────────────────────────────────────────────
  if (isTablet) {
    const leftPanelWidth = width * 0.38 - SIDEBAR_WIDTH * 0.38;
    const rightPanelWidth = width * 0.62 - SIDEBAR_WIDTH * 0.62;
    const chartWidth = rightPanelWidth - 64;

    return (
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          marginLeft: SIDEBAR_WIDTH,
          backgroundColor: t.canvas,
        }}
      >
        {/* Left panel: summary + holdings list */}
        <ScrollView
          style={{ flex: 0.38, borderRightWidth: 1, borderRightColor: t.hairline }}
          contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={t.brandPeriwinkle}
              colors={[t.brandPeriwinkle]}
            />
          }
        >
          <Eyebrow>Portfolio</Eyebrow>
          <Heading level={1} style={{ marginTop: 4, marginBottom: 16 }}>
            Summary
          </Heading>

          <Card style={{ marginBottom: 16 }}>
            <Muted size={11} style={{ textTransform: "uppercase", letterSpacing: 0.8 }}>
              Total value
            </Muted>
            <Num medium style={{ fontSize: 28, marginTop: 6 }}>
              {fmtGBP(p.totalValue)}
            </Num>
            <Num style={{ color: changeColor, fontSize: 13, marginTop: 4 }}>
              {fmtGBPSigned(p.dayChangeGBP)} ({fmtPct(p.dayChangePct)}) today
            </Num>
            <Num style={{ color: allTimeColor, fontSize: 12, marginTop: 2 }}>
              {fmtGBPSigned(p.unrealisedGL)} ({fmtPct(p.unrealisedPct)}) all time
            </Num>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              {RANGES.map((r) => (
                <Body
                  key={r}
                  medium
                  size={12}
                  onPress={() => {
                    setRange(r);
                    setSelectedTicker(null);
                  }}
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
          </Card>

          <Body medium size={15} style={{ marginBottom: 8 }}>
            Holdings
          </Body>

          {!sortedRows.length ? (
            <EmptyState
              icon="📈"
              title="No holdings yet"
              subtitle="Add a holding on the web app to see it here."
            />
          ) : (
            <Card style={{ padding: 0, paddingHorizontal: 16 }}>
              {sortedRows.map((h, i) => (
                <View key={h.ticker}>
                  <HoldingCard
                    h={h}
                    selected={selectedTicker === h.ticker}
                    onPress={() => {
                      haptic.selection();
                      setSelectedTicker(h.ticker === selectedTicker ? null : h.ticker);
                    }}
                  />
                  {i < sortedRows.length - 1 ? <Hairline /> : null}
                </View>
              ))}
            </Card>
          )}
        </ScrollView>

        {/* Right panel: chart or stock detail */}
        <ScrollView
          style={{ flex: 0.62 }}
          contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 32 }}
        >
          {selectedTicker ? (
            <>
              <Row style={{ marginBottom: 12 }}>
                <Body
                  medium
                  size={14}
                  style={{ fontFamily: "JetBrainsMono_500Medium", textTransform: "uppercase" }}
                >
                  {selectedTicker}
                </Body>
                <Pressable onPress={() => setSelectedTicker(null)} hitSlop={8}>
                  <X color={t.textMuted} size={18} />
                </Pressable>
              </Row>
              <StockDetailPanel ticker={selectedTicker} panelWidth={rightPanelWidth} />
            </>
          ) : (
            <Card style={{ opacity: historyFetching ? 0.5 : 1 }}>
              <Muted size={11} style={{ textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>
                Portfolio Performance · {range}
              </Muted>
              <PerformanceChart data={history} range={range} width={chartWidth} />
            </Card>
          )}
        </ScrollView>
      </View>
    );
  }

  // ─── Phone layout (unchanged) ────────────────────────────────────────────────
  const chartWidth = width - 32;

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Eyebrow>Portfolio</Eyebrow>
      <Heading level={1} style={{ marginTop: 4, marginBottom: 16 }}>
        Summary
      </Heading>

      <Card style={{ marginBottom: 16 }}>
        <Muted size={11} style={{ textTransform: "uppercase", letterSpacing: 0.8 }}>
          Total value
        </Muted>
        <Num medium style={{ fontSize: 32, marginTop: 6 }}>
          {fmtGBP(p.totalValue)}
        </Num>
        <Num style={{ color: changeColor, fontSize: 14, marginTop: 4 }}>
          {fmtGBPSigned(p.dayChangeGBP)} ({fmtPct(p.dayChangePct)}) today
        </Num>
        <Num style={{ color: allTimeColor, fontSize: 13, marginTop: 2 }}>
          {fmtGBPSigned(p.unrealisedGL)} ({fmtPct(p.unrealisedPct)}) all time
        </Num>

        <View style={{ flexDirection: "row", gap: 6, marginTop: 16 }}>
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

        <View style={{ marginTop: 12, opacity: historyFetching ? 0.5 : 1 }}>
          <PerformanceChart data={history} range={range} width={chartWidth - 32} />
        </View>
      </Card>

      <Body medium size={15} style={{ marginBottom: 8 }}>
        Holdings
      </Body>

      {!sortedRows.length ? (
        <EmptyState icon="📈" title="No holdings yet" subtitle="Add a holding on the web app to see it here." />
      ) : (
        <Card style={{ padding: 0, paddingHorizontal: 16 }}>
          {sortedRows.map((h, i) => (
            <View key={h.ticker}>
              <HoldingCard
                h={h}
                onPress={() => router.push(`/stock/${h.ticker}` as never)}
              />
              {i < sortedRows.length - 1 ? <Hairline /> : null}
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
