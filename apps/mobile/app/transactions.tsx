import { useState } from "react";
import { View, Pressable } from "react-native";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useTransactions, useTrades, useCashFlows } from "@/api/queries";
import { Screen } from "@/components/Screen";
import { Card, Hairline, Row } from "@/components/Card";
import { Heading, Body, Muted, Num } from "@/components/Typography";
import { BuySellChip } from "@/components/Chip";
import { EmptyState } from "@/components/EmptyState";
import { CardSkeleton } from "@/components/Skeleton";
import { useTheme } from "@/theme/ThemeProvider";
import type { LotRow, TradeRow, CashFlow } from "@/api/endpoints";

type Tab = "lots" | "trades" | "cash";

function LotItem({ lot }: { lot: LotRow }) {
  const { t } = useTheme();
  const gainColor = lot.gainGBP >= 0 ? t.up : t.down;
  return (
    <View style={{ paddingVertical: 12 }}>
      <Row>
        <View style={{ flex: 1, marginRight: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Body
              medium
              size={12}
              style={{ fontFamily: "JetBrainsMono_500Medium", textTransform: "uppercase" }}
            >
              {lot.ticker}
            </Body>
            <Muted size={11} numberOfLines={1} style={{ flexShrink: 1 }}>
              {lot.name}
            </Muted>
          </View>
          <Muted size={11} style={{ marginTop: 2 }}>
            {lot.dateBought} · {lot.units.toFixed(3)} units @ {lot.buyPrice.toFixed(2)}p
          </Muted>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Num style={{ fontSize: 13 }}>£{lot.valueGBP.toFixed(2)}</Num>
          <Num style={{ fontSize: 12, color: gainColor, marginTop: 2 }}>
            {lot.gainGBP >= 0 ? "+" : ""}£{lot.gainGBP.toFixed(2)} ({lot.gainPct.toFixed(1)}%)
          </Num>
        </View>
      </Row>
    </View>
  );
}

function TradeItem({ trade }: { trade: TradeRow }) {
  const isBuySell = trade.type === "buy" || trade.type === "sell";
  return (
    <View style={{ paddingVertical: 12 }}>
      <Row>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, flex: 1 }}>
          {isBuySell && <BuySellChip type={trade.type as "buy" | "sell"} />}
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {trade.ticker ? (
                <Body
                  medium
                  size={12}
                  style={{ fontFamily: "JetBrainsMono_500Medium", textTransform: "uppercase" }}
                >
                  {trade.ticker}
                </Body>
              ) : null}
              <Muted size={12} numberOfLines={1} style={{ flexShrink: 1, textTransform: "capitalize" }}>
                {trade.name || trade.type}
              </Muted>
            </View>
            <Muted size={11} style={{ marginTop: 2 }}>
              {trade.date}
              {trade.units
                ? ` · ${trade.units.toFixed(3)} units @ ${trade.price.toFixed(2)}p`
                : ""}
            </Muted>
          </View>
        </View>
        <Num style={{ fontSize: 13 }}>£{(trade.amountGBP / 100).toFixed(2)}</Num>
      </Row>
    </View>
  );
}

function CashItem({ flow }: { flow: CashFlow }) {
  const { t } = useTheme();
  const color = flow.type === "deposit" ? t.up : t.down;
  const sign = flow.type === "deposit" ? "+" : "-";
  return (
    <View style={{ paddingVertical: 12 }}>
      <Row>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Body medium size={13} style={{ textTransform: "capitalize" }}>
            {flow.type}
          </Body>
          <Muted size={11} style={{ marginTop: 2 }}>
            {flow.date}
            {flow.note ? ` · ${flow.note}` : ""}
          </Muted>
        </View>
        <Num style={{ fontSize: 13, color }}>
          {sign}£{flow.amountGBP.toFixed(2)}
        </Num>
      </Row>
    </View>
  );
}

export default function TransactionsScreen() {
  const { t } = useTheme();
  const [tab, setTab] = useState<Tab>("lots");
  const lots = useTransactions();
  const trades = useTrades();
  const cashFlows = useCashFlows();

  const isLoading =
    (tab === "lots" && lots.isLoading) ||
    (tab === "trades" && trades.isLoading) ||
    (tab === "cash" && cashFlows.isLoading);

  const TABS: { key: Tab; label: string }[] = [
    { key: "lots", label: "Lots" },
    { key: "trades", label: "Trades" },
    { key: "cash", label: "Cash" },
  ];

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Pressable onPress={() => router.back()}>
          <ArrowLeft color={t.textBody} size={22} />
        </Pressable>
        <Heading level={1}>Transactions</Heading>
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        {TABS.map((tb) => (
          <Body
            key={tb.key}
            medium
            size={13}
            onPress={() => setTab(tb.key)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 4,
              color: tab === tb.key ? t.textStrong : t.textMuted,
              borderBottomWidth: 2,
              borderBottomColor: tab === tb.key ? t.brandPeriwinkle : "transparent",
            }}
          >
            {tb.label}
          </Body>
        ))}
      </View>

      {isLoading ? (
        <CardSkeleton height={300} />
      ) : tab === "lots" ? (
        !lots.data?.length ? (
          <EmptyState icon="📋" title="No lots yet" subtitle="Add a holding to see lots here." />
        ) : (
          <Card style={{ padding: 0, paddingHorizontal: 16 }}>
            {lots.data.map((lot, i) => (
              <View key={lot.id}>
                <LotItem lot={lot} />
                {i < lots.data.length - 1 ? <Hairline /> : null}
              </View>
            ))}
          </Card>
        )
      ) : tab === "trades" ? (
        !trades.data?.length ? (
          <EmptyState icon="📝" title="No trades yet" />
        ) : (
          <Card style={{ padding: 0, paddingHorizontal: 16 }}>
            {trades.data.map((trade, i) => (
              <View key={trade.id}>
                <TradeItem trade={trade} />
                {i < trades.data.length - 1 ? <Hairline /> : null}
              </View>
            ))}
          </Card>
        )
      ) : !cashFlows.data?.flows?.length ? (
        <EmptyState icon="💵" title="No cash flows yet" />
      ) : (
        <Card style={{ padding: 0, paddingHorizontal: 16 }}>
          {cashFlows.data.flows.map((flow, i) => (
            <View key={flow.id}>
              <CashItem flow={flow} />
              {i < cashFlows.data.flows.length - 1 ? <Hairline /> : null}
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
