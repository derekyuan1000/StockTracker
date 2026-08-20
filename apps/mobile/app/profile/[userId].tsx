import { View, Pressable } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { usePublicProfile } from "@/api/queries";
import { Screen } from "@/components/Screen";
import { Card, Hairline, Row } from "@/components/Card";
import { Heading, Body, Muted, Num } from "@/components/Typography";
import { BuySellChip } from "@/components/Chip";
import { EmptyState } from "@/components/EmptyState";
import { CardSkeleton } from "@/components/Skeleton";
import { useTheme } from "@/theme/ThemeProvider";
import type { PublicTrade } from "@stocktracker/api-contracts";

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  const { t } = useTheme();
  return (
    <Card style={{ flex: 1, alignItems: "center", padding: 12 }}>
      <Num medium style={{ fontSize: 18, color: color ?? t.textStrong }}>
        {value}
      </Num>
      <Muted size={11} style={{ marginTop: 4, textAlign: "center" }}>
        {label}
      </Muted>
    </Card>
  );
}

function TradeItem({ trade }: { trade: PublicTrade }) {
  return (
    <View style={{ paddingVertical: 12 }}>
      <Row>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, flex: 1 }}>
          <BuySellChip type={trade.type} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Body
                medium
                size={12}
                style={{ fontFamily: "JetBrainsMono_500Medium", textTransform: "uppercase" }}
              >
                {trade.ticker}
              </Body>
              <Muted size={11} numberOfLines={1} style={{ flexShrink: 1 }}>
                · {trade.name}
              </Muted>
            </View>
            <Muted size={11} style={{ marginTop: 2 }}>
              {trade.units.toFixed(3)} units @ {trade.price.toFixed(2)}p · {trade.date}
            </Muted>
          </View>
        </View>
        <Num style={{ fontSize: 13 }}>£{(trade.amountGBP / 100).toFixed(2)}</Num>
      </Row>
    </View>
  );
}

export default function PublicProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { t } = useTheme();
  const { data: profile, isLoading, isError } = usePublicProfile(userId ?? "");

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <Pressable onPress={() => router.back()}>
          <ArrowLeft color={t.textBody} size={22} />
        </Pressable>
        <Heading level={2}>
          {isLoading ? "Profile" : (profile?.displayName ?? "Profile")}
        </Heading>
      </View>

      {isLoading ? (
        <>
          <CardSkeleton height={80} />
          <View style={{ height: 16 }} />
          <CardSkeleton height={300} />
        </>
      ) : isError || !profile ? (
        <EmptyState icon="👤" title="Profile not found" subtitle="This profile may be private." />
      ) : (
        <>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            <StatCard
              label="Invested"
              value={`£${profile.stats.totalInvestedGBP.toFixed(0)}`}
            />
            <StatCard
              label="G/L"
              value={`${profile.stats.realisedGL >= 0 ? "+" : ""}£${profile.stats.realisedGL.toFixed(0)}`}
              color={profile.stats.realisedGL >= 0 ? t.up : t.down}
            />
            <StatCard label="Trades" value={String(profile.stats.tradeCount)} />
          </View>

          {!profile.trades.length ? (
            <EmptyState
              icon="📭"
              title="No public trades"
              subtitle="This user has no public trades."
            />
          ) : (
            <Card style={{ padding: 0, paddingHorizontal: 16 }}>
              {profile.trades.map((trade, i) => (
                <View key={i}>
                  <TradeItem trade={trade} />
                  {i < profile.trades.length - 1 ? <Hairline /> : null}
                </View>
              ))}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}
