import { useState } from "react";
import { View } from "react-native";
import { usePublicFeed, usePublicLeaderboard } from "@/api/queries";
import { Screen } from "@/components/Screen";
import { Card, Hairline } from "@/components/Card";
import { Heading, Body, Muted, Eyebrow } from "@/components/Typography";
import { BuySellChip } from "@/components/Chip";
import { PctText } from "@/components/PctText";
import { EmptyState } from "@/components/EmptyState";
import { CardSkeleton } from "@/components/Skeleton";
import { useTheme } from "@/theme/ThemeProvider";
import type { PublicTrade, LeaderboardEntry } from "@stocktracker/api-contracts";

type Tab = "feed" | "leaderboard";

function FeedRow({ trade }: { trade: PublicTrade }) {
  const { t } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 12, paddingVertical: 14 }}>
      <BuySellChip type={trade.type} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Body medium size={12} style={{ fontFamily: "JetBrainsMono_500Medium", textTransform: "uppercase" }}>
            {trade.ticker}
          </Body>
          {trade.name ? (
            <Muted size={13} numberOfLines={1} style={{ flexShrink: 1 }}>
              · {trade.name}
            </Muted>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 3 }}>
          <Muted size={11}>{trade.units.toFixed(3)} units</Muted>
          <Muted size={11}>@ {trade.price.toFixed(2)}p</Muted>
          <Muted size={11}>£{(trade.amountGBP / 100).toFixed(2)}</Muted>
        </View>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Body medium size={13}>
          {trade.displayName}
        </Body>
        <Muted size={11}>{trade.date}</Muted>
      </View>
    </View>
  );
}

function LeaderboardRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const { t } = useTheme();
  return (
    <View style={{ paddingVertical: 12, gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Muted size={13} style={{ fontFamily: "JetBrainsMono_400Regular", width: 20 }}>
          {rank}
        </Muted>
        <Body medium size={14} style={{ flex: 1 }}>
          {entry.displayName}
        </Body>
        <Body medium size={13} style={{ fontFamily: "JetBrainsMono_400Regular", color: t.textMuted }}>
          {entry.gainGBP >= 0 ? "+" : ""}£{Math.abs(entry.gainGBP).toFixed(0)}
        </Body>
      </View>
      <View style={{ flexDirection: "row", gap: 16, paddingLeft: 30 }}>
        <PctText value={entry.gainPct} />
        <Muted size={11}>1m</Muted>
        <PctText value={entry.monthGainPct} />
        <Muted size={11}>1y</Muted>
        <PctText value={entry.yearGainPct} />
      </View>
    </View>
  );
}

export default function CommunityScreen() {
  const [tab, setTab] = useState<Tab>("feed");
  const { t } = useTheme();
  const feed = usePublicFeed(20);
  const leaderboard = usePublicLeaderboard();

  return (
    <Screen>
      <Eyebrow>Community</Eyebrow>
      <Heading level={1} style={{ marginTop: 4, marginBottom: 16 }}>
        Community
      </Heading>

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        {(["feed", "leaderboard"] as const).map((k) => (
          <Body
            key={k}
            medium
            size={13}
            onPress={() => setTab(k)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 4,
              color: tab === k ? t.textStrong : t.textMuted,
              borderBottomWidth: 2,
              borderBottomColor: tab === k ? t.brandPeriwinkle : "transparent",
              textTransform: "capitalize",
            }}
          >
            {k}
          </Body>
        ))}
      </View>

      {tab === "feed" ? (
        feed.isLoading ? (
          <CardSkeleton height={200} />
        ) : !feed.data?.length ? (
          <EmptyState icon="📭" title="No trades yet" subtitle="Public trades will show up here." />
        ) : (
          <Card style={{ padding: 0, paddingHorizontal: 16 }}>
            {feed.data.map((trade, i) => (
              <View key={i}>
                <FeedRow trade={trade} />
                {i < feed.data.length - 1 ? <Hairline /> : null}
              </View>
            ))}
          </Card>
        )
      ) : leaderboard.isLoading ? (
        <CardSkeleton height={200} />
      ) : !leaderboard.data?.length ? (
        <EmptyState icon="🏆" title="No public portfolios yet" />
      ) : (
        <Card style={{ padding: 0, paddingHorizontal: 16 }}>
          {leaderboard.data.map((entry, i) => (
            <View key={entry.userId}>
              <LeaderboardRow entry={entry} rank={i + 1} />
              {i < leaderboard.data.length - 1 ? <Hairline /> : null}
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
