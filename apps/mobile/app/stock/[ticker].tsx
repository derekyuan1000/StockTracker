import { useState, useMemo } from "react";
import { View, Pressable, Linking, useWindowDimensions } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { ArrowLeft, Bell, Bookmark } from "lucide-react-native";
import {
  usePortfolio,
  useTickerHistory,
  useTickerNews,
  useWatchlist,
  useAddWatchlist,
  useRemoveWatchlist,
} from "@/api/queries";
import { PriceAlertSheet } from "@/components/PriceAlertSheet";
import { haptic } from "@/haptics";
import { compute, fmtGBP, fmtGBPSigned, fmtPct, dir } from "@stocktracker/shared";
import { Screen } from "@/components/Screen";
import { Card, Hairline, Row } from "@/components/Card";
import { Body, Muted, Num } from "@/components/Typography";
import { PctText } from "@/components/PctText";
import { PerformanceChart } from "@/charts/PerformanceChart";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";
import type { HistoryRange, OHLCBar, NewsItem } from "@/api/endpoints";

const RANGES: HistoryRange[] = ["1M", "6M", "1Y", "5Y"];

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <Row style={{ paddingVertical: 10 }}>
      <Muted size={13}>{label}</Muted>
      <Num style={{ fontSize: 13 }}>{value}</Num>
    </Row>
  );
}

function NewsRow({ item }: { item: NewsItem }) {
  return (
    <Pressable onPress={() => Linking.openURL(item.url)} style={{ paddingVertical: 12 }}>
      <Body size={13} style={{ lineHeight: 18 }}>
        {item.title}
      </Body>
      <Muted size={11} style={{ marginTop: 4 }}>
        {item.source} · {item.date}
      </Muted>
    </Pressable>
  );
}

export default function StockDetailScreen() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const { t } = useTheme();
  const { width } = useWindowDimensions();
  const [range, setRange] = useState<HistoryRange>("1Y");

  const [alertOpen, setAlertOpen] = useState(false);

  const portfolio = usePortfolio();
  const historyQuery = useTickerHistory(ticker ?? "", range);
  const newsQuery = useTickerNews(ticker ?? "");

  const { data: watchlist = [] } = useWatchlist();
  const addWatch = useAddWatchlist();
  const removeWatch = useRemoveWatchlist();
  const isWatched = watchlist.some((w) => w.ticker.toUpperCase() === (ticker ?? "").toUpperCase());

  function toggleWatch() {
    if (!ticker) return;
    haptic.selection();
    if (isWatched) removeWatch.mutate(ticker);
    else addWatch.mutate(ticker);
  }

  const holding = useMemo(() => {
    if (!portfolio.data || !ticker) return null;
    const { holdings, cashGBP } = portfolio.data;
    const p = compute(holdings, cashGBP);
    return p.rows.find((h) => h.ticker.toUpperCase() === ticker.toUpperCase()) ?? null;
  }, [portfolio.data, ticker]);

  const chartData = useMemo((): { ts: number; value: number }[] => {
    if (!historyQuery.data) return [];
    return (historyQuery.data as OHLCBar[]).map((b) => ({ ts: b.ts, value: b.close }));
  }, [historyQuery.data]);

  const chartWidth = width - 32;

  if (!ticker) return null;

  const lastBar = historyQuery.data?.at(-1) as OHLCBar | undefined;
  const prevBar = historyQuery.data?.at(-2) as OHLCBar | undefined;
  const lastPrice = holding?.lastPrice ?? lastBar?.close ?? 0;
  const prevClose = holding?.prevClose ?? prevBar?.close ?? lastPrice;
  const dayChangeAbs = lastPrice - prevClose;
  const dayChangePct = prevClose > 0 ? (dayChangeAbs / prevClose) * 100 : 0;
  const dayColor = { up: t.up, down: t.down, flat: t.textMutedStrong }[dir(dayChangeAbs)];

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Pressable onPress={() => router.back()}>
          <ArrowLeft color={t.textBody} size={22} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Body
            medium
            size={14}
            style={{ fontFamily: "JetBrainsMono_500Medium", textTransform: "uppercase" }}
          >
            {ticker}
          </Body>
          {holding && (
            <Muted size={11} numberOfLines={1}>
              {holding.name}
            </Muted>
          )}
        </View>
        <Pressable onPress={toggleWatch} hitSlop={8}>
          <Bookmark
            color={isWatched ? t.brandPeriwinkle : t.textMuted}
            fill={isWatched ? t.brandPeriwinkle : "transparent"}
            size={22}
          />
        </Pressable>
        <Pressable onPress={() => setAlertOpen(true)} hitSlop={8}>
          <Bell color={t.textMuted} size={22} />
        </Pressable>
      </View>

      <PriceAlertSheet
        visible={alertOpen}
        onClose={() => setAlertOpen(false)}
        ticker={ticker}
        lastPrice={lastPrice}
        currency={(holding?.currency as "GBp" | "GBP") ?? "GBp"}
      />

      <Card style={{ marginBottom: 16 }}>
        <Num medium style={{ fontSize: 28 }}>
          {lastPrice.toFixed(2)}p
        </Num>
        <Num style={{ color: dayColor, fontSize: 14, marginTop: 4 }}>
          {dayChangeAbs >= 0 ? "+" : ""}
          {dayChangeAbs.toFixed(2)}p ({fmtPct(dayChangePct)}) today
        </Num>

        <View style={{ flexDirection: "row", gap: 6, marginTop: 16, flexWrap: "wrap" }}>
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

        <View style={{ marginTop: 12, opacity: historyQuery.isFetching ? 0.5 : 1 }}>
          <PerformanceChart data={chartData} range={range} width={chartWidth - 32} />
        </View>
      </Card>

      {holding && (
        <Card style={{ marginBottom: 16 }}>
          <Body medium size={15} style={{ marginBottom: 8 }}>
            Your Position
          </Body>
          <Hairline />
          <StatRow label="Market value" value={fmtGBP(holding.marketValueGBP)} />
          <Hairline />
          <StatRow label="Cost" value={fmtGBP(holding.costGBP)} />
          <Hairline />
          <Row style={{ paddingVertical: 10 }}>
            <Muted size={13}>Gain / Loss</Muted>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Num
                style={{
                  fontSize: 13,
                  color: { up: t.up, down: t.down, flat: t.textMutedStrong }[
                    dir(holding.unrealisedGL)
                  ],
                }}
              >
                {fmtGBPSigned(holding.unrealisedGL)}
              </Num>
              <PctText value={holding.unrealisedPct} />
            </View>
          </Row>
          <Hairline />
          <StatRow label="Units" value={holding.units.toFixed(3)} />
          <Hairline />
          <StatRow label="Weight" value={`${holding.allocActual.toFixed(1)}%`} />
        </Card>
      )}

      {holding &&
        (holding.pe != null ||
          holding.divYield != null ||
          holding.mktCap != null ||
          holding.beta != null) && (
          <Card style={{ marginBottom: 16 }}>
            <Body medium size={15} style={{ marginBottom: 8 }}>
              Key Stats
            </Body>
            <Hairline />
            {holding.pe != null && (
              <>
                <StatRow label="P/E" value={holding.pe.toFixed(1)} />
                <Hairline />
              </>
            )}
            {holding.forwardPe != null && (
              <>
                <StatRow label="Forward P/E" value={holding.forwardPe.toFixed(1)} />
                <Hairline />
              </>
            )}
            {holding.divYield != null && holding.divYield > 0 && (
              <>
                <StatRow label="Div yield" value={`${holding.divYield.toFixed(2)}%`} />
                <Hairline />
              </>
            )}
            {holding.mktCap != null && (
              <>
                <StatRow label="Market cap" value={`£${(holding.mktCap / 1e9).toFixed(1)}B`} />
                <Hairline />
              </>
            )}
            {holding.beta != null && (
              <>
                <StatRow label="Beta" value={holding.beta.toFixed(2)} />
                <Hairline />
              </>
            )}
            <StatRow label="52w high" value={`${holding.yearHigh.toFixed(0)}p`} />
            <Hairline />
            <StatRow label="52w low" value={`${holding.yearLow.toFixed(0)}p`} />
            {holding.analyst && (
              <>
                <Hairline />
                <StatRow
                  label="Analyst target"
                  value={`${holding.analyst.targetLow.toFixed(0)}–${holding.analyst.targetHigh.toFixed(0)}p`}
                />
              </>
            )}
          </Card>
        )}

      <Card style={{ marginBottom: 16, padding: 0, paddingHorizontal: 16 }}>
        <Body medium size={15} style={{ paddingVertical: 12 }}>
          News
        </Body>
        <Hairline />
        {newsQuery.isLoading ? (
          <View style={{ paddingVertical: 16 }}>
            <Muted size={13}>Loading news…</Muted>
          </View>
        ) : !newsQuery.data?.length ? (
          <View style={{ paddingVertical: 16 }}>
            <Muted size={13}>No recent news.</Muted>
          </View>
        ) : (
          newsQuery.data.slice(0, 8).map((item, i) => (
            <View key={i}>
              <NewsRow item={item} />
              {i < Math.min(newsQuery.data!.length, 8) - 1 ? <Hairline /> : null}
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}
