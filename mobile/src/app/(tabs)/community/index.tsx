import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { usePublicFeed, useLeaderboard } from "@/api/queries";
import { tokens } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import type { PublicTrade, LeaderboardEntry } from "@stocktracker/api-contracts";

type Tab = "feed" | "leaderboard";

function TradeCard({ trade }: { trade: PublicTrade }) {
  const { colors } = useTheme();
  const isBuy = trade.type === "buy";
  return (
    <View style={[tradeStyles.card, { borderBottomColor: colors.border }]}>
      <View style={tradeStyles.top}>
        <Text style={[tradeStyles.name, { color: colors.ink }]}>{trade.displayName}</Text>
        <View style={[tradeStyles.chip, { backgroundColor: isBuy ? tokens.colors.positive : tokens.colors.negative }]}>
          <Text style={tradeStyles.chipText}>{trade.type.toUpperCase()}</Text>
        </View>
      </View>
      <View style={tradeStyles.middle}>
        <Text style={[tradeStyles.ticker, { color: colors.ink }]}>{trade.ticker}</Text>
        <Text style={[tradeStyles.stockName, { color: colors.inkMuted }]}>{trade.name}</Text>
      </View>
      <View style={tradeStyles.bottom}>
        <Text style={[tradeStyles.amount, { color: colors.ink }]}>
          £{trade.amountGBP.toFixed(0)}
        </Text>
        <Text style={[tradeStyles.units, { color: colors.inkMuted }]}>
          {trade.units > 0 ? `${trade.units} units @ £${trade.price.toFixed(2)}` : ""}
        </Text>
        <Text style={[tradeStyles.date, { color: colors.inkFaint }]}>{trade.date}</Text>
      </View>
    </View>
  );
}

const tradeStyles = StyleSheet.create({
  card: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  name: { fontSize: tokens.fontSize.sm, fontWeight: "500" },
  chip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: tokens.radius.sm },
  chipText: { color: "#fff", fontSize: tokens.fontSize.xs, fontWeight: "600" },
  middle: { marginBottom: 6 },
  ticker: { fontSize: tokens.fontSize.lg, fontWeight: "500" },
  stockName: { fontSize: tokens.fontSize.xs, marginTop: 1 },
  bottom: { flexDirection: "row", alignItems: "center", gap: tokens.spacing.sm },
  amount: { fontSize: tokens.fontSize.md, fontWeight: "500" },
  units: { fontSize: tokens.fontSize.xs, flex: 1 },
  date: { fontSize: tokens.fontSize.xs },
});

function LeaderboardRow({
  entry,
  rank,
  onPress,
}: {
  entry: LeaderboardEntry;
  rank: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const isPositive = entry.gainPct >= 0;
  return (
    <TouchableOpacity
      style={[lbStyles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      accessibilityLabel={`View ${entry.displayName} profile`}
    >
      <Text style={[lbStyles.rank, { color: colors.inkFaint }]}>#{rank}</Text>
      <View style={lbStyles.info}>
        <Text style={[lbStyles.name, { color: colors.ink }]}>{entry.displayName}</Text>
        <Text style={[lbStyles.invested, { color: colors.inkMuted }]}>
          £{entry.costGBP.toFixed(0)} invested
        </Text>
      </View>
      <View style={lbStyles.gains}>
        <Text style={[lbStyles.gainPct, { color: isPositive ? tokens.colors.positive : tokens.colors.negative }]}>
          {isPositive ? "+" : ""}{entry.gainPct.toFixed(1)}%
        </Text>
        <Text style={[lbStyles.gainGBP, { color: isPositive ? tokens.colors.positive : tokens.colors.negative }]}>
          {isPositive ? "+" : ""}£{Math.abs(entry.gainGBP).toFixed(0)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const lbStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rank: { width: 32, fontSize: tokens.fontSize.sm },
  info: { flex: 1 },
  name: { fontSize: tokens.fontSize.md, fontWeight: "500" },
  invested: { fontSize: tokens.fontSize.xs, marginTop: 2 },
  gains: { alignItems: "flex-end" },
  gainPct: { fontSize: tokens.fontSize.md, fontWeight: "500" },
  gainGBP: { fontSize: tokens.fontSize.xs, marginTop: 2 },
});

export default function CommunityScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("feed");

  const { data: feed, isLoading: feedLoading, refetch: refetchFeed } = usePublicFeed();
  const { data: leaderboard, isLoading: lbLoading, refetch: refetchLb } = useLeaderboard();

  const isLoading = activeTab === "feed" ? feedLoading : lbLoading;
  const refetch = activeTab === "feed" ? refetchFeed : refetchLb;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Segmented control */}
      <View style={[styles.segmentControl, { borderBottomColor: colors.border }]}>
        {(["feed", "leaderboard"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: colors.ink, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.ink : colors.inkMuted }]}>
              {tab === "feed" ? "Feed" : "Leaderboard"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.ink} />}
      >
        {activeTab === "feed" ? (
          <>
            {feed?.map((trade, i) => <TradeCard key={i} trade={trade} />)}
            {!feedLoading && (!feed || feed.length === 0) && (
              <Text style={[styles.emptyText, { color: colors.inkFaint }]}>
                No public trades yet
              </Text>
            )}
          </>
        ) : (
          <>
            {leaderboard?.map((entry, i) => (
              <LeaderboardRow
                key={entry.userId}
                entry={entry}
                rank={i + 1}
                onPress={() => router.push(`/(tabs)/community/${entry.userId}`)}
              />
            ))}
            {!lbLoading && (!leaderboard || leaderboard.length === 0) && (
              <Text style={[styles.emptyText, { color: colors.inkFaint }]}>
                No leaderboard data yet
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  segmentControl: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: tokens.spacing.md,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: tokens.spacing.sm,
    marginRight: tokens.spacing.sm,
  },
  tabText: { fontSize: tokens.fontSize.md },
  emptyText: {
    padding: tokens.spacing.lg,
    textAlign: "center",
    fontSize: tokens.fontSize.sm,
  },
});
