import { useMemo } from "react";
import { View } from "react-native";
import { compute } from "@stocktracker/shared";
import { fmtGBPSigned, fmtPct, dir } from "@stocktracker/shared";
import { usePortfolio, usePortfolioReturns } from "@/api/queries";
import { Screen } from "@/components/Screen";
import { Card, Hairline, Row } from "@/components/Card";
import { Heading, Body, Muted, Num, Eyebrow } from "@/components/Typography";
import { CardSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/theme/ThemeProvider";
import type { PeriodReturn } from "@/api/endpoints";

const PERIODS = ["1W", "1M", "6M", "1Y", "3Y"] as const;

function PeriodTile({ period, data }: { period: string; data?: PeriodReturn }) {
  const { t } = useTheme();
  const unavailable = !data || data.covered === 0;
  const partial = !unavailable && data!.covered < data!.total;
  const pctColor = unavailable
    ? t.textMuted
    : { up: t.up, down: t.down, flat: t.textMutedStrong }[dir(data!.pct)];
  const gbpColor = unavailable
    ? t.textMuted
    : { up: t.up, down: t.down, flat: t.textMutedStrong }[dir(data!.gbp)];

  return (
    <View
      style={{
        flex: 1,
        minWidth: 56,
        backgroundColor: t.surfaceCard,
        borderRadius: 8,
        padding: 10,
        borderWidth: 1,
        borderColor: t.hairline,
      }}
    >
      <Muted size={10} style={{ textTransform: "uppercase", letterSpacing: 0.8 }}>
        {period}
      </Muted>
      <Num medium style={{ fontSize: 16, marginTop: 6, color: pctColor }}>
        {unavailable ? "—" : fmtPct(data!.pct)}
      </Num>
      <Num style={{ fontSize: 11, marginTop: 2, color: gbpColor }}>
        {unavailable ? "—" : fmtGBPSigned(data!.gbp)}
      </Num>
      {partial ? (
        <Muted size={9} style={{ marginTop: 3 }}>
          {data!.covered}/{data!.total} holdings
        </Muted>
      ) : null}
    </View>
  );
}

function MoverRow({ name, pct }: { name: string; pct: number }) {
  const { t } = useTheme();
  const color = pct > 0 ? t.up : pct < 0 ? t.down : t.textMutedStrong;
  return (
    <Row style={{ paddingVertical: 10 }}>
      <Body size={13} style={{ flex: 1 }} numberOfLines={1}>
        {name}
      </Body>
      <Num style={{ fontSize: 13, color }}>
        {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
      </Num>
    </Row>
  );
}

export default function PerformanceScreen() {
  const { data: portfolio, isLoading: portfolioLoading } = usePortfolio();
  const { data: periodReturns = [], isLoading: returnsLoading } = usePortfolioReturns();

  const holdings = portfolio?.holdings ?? [];
  const p = useMemo(
    () => compute(holdings, portfolio?.cashGBP ?? 0),
    [holdings, portfolio?.cashGBP],
  );

  const dayMovers = useMemo(
    () =>
      [...p.rows]
        .sort((a, b) => a.dayChangePct - b.dayChangePct)
        .map((r) => ({ name: r.name, pct: +r.dayChangePct.toFixed(2) })),
    [p.rows],
  );

  const ytdMovers = useMemo(
    () =>
      [...p.rows]
        .sort((a, b) => (a.ytdPct ?? 0) - (b.ytdPct ?? 0))
        .map((r) => ({ name: r.name, pct: +(r.ytdPct ?? 0).toFixed(2) })),
    [p.rows],
  );

  const isLoading = portfolioLoading || returnsLoading;

  return (
    <Screen>
      <Eyebrow>Portfolio</Eyebrow>
      <Heading level={1} style={{ marginTop: 4, marginBottom: 16 }}>
        Performance
      </Heading>

      {isLoading ? (
        <>
          <CardSkeleton height={100} />
          <View style={{ height: 16 }} />
          <CardSkeleton height={200} />
          <View style={{ height: 16 }} />
          <CardSkeleton height={200} />
        </>
      ) : !p.rows.length ? (
        <EmptyState icon="📈" title="No holdings" subtitle="Add holdings to see performance." />
      ) : (
        <>
          <Body medium size={15} style={{ marginBottom: 10 }}>
            Returns by period
          </Body>
          <View style={{ flexDirection: "row", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
            {PERIODS.map((period) => (
              <PeriodTile
                key={period}
                period={period}
                data={periodReturns.find((r) => r.period === period)}
              />
            ))}
          </View>

          <Card style={{ marginBottom: 16, padding: 0, paddingHorizontal: 16 }}>
            <Body medium size={15} style={{ paddingVertical: 12 }}>
              Top movers (Day)
            </Body>
            <Hairline />
            {dayMovers.map((m, i) => (
              <View key={i}>
                <MoverRow name={m.name} pct={m.pct} />
                {i < dayMovers.length - 1 ? <Hairline /> : null}
              </View>
            ))}
          </Card>

          <Card style={{ marginBottom: 16, padding: 0, paddingHorizontal: 16 }}>
            <Body medium size={15} style={{ paddingVertical: 12 }}>
              Top movers (YTD)
            </Body>
            <Hairline />
            {ytdMovers.map((m, i) => (
              <View key={i}>
                <MoverRow name={m.name} pct={m.pct} />
                {i < ytdMovers.length - 1 ? <Hairline /> : null}
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}
