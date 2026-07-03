import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { usePublicProfile } from "@/api/queries";
import { tokens } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import type { PublicTrade } from "@stocktracker/api-contracts";

function StatCard({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[statStyles.card, { borderColor: colors.border }]}>
      <Text style={[statStyles.label, { color: colors.inkMuted }]}>{label}</Text>
      <Text style={[statStyles.value, { color: colors.ink }]}>{value}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    alignItems: "center",
  },
  label: { fontSize: tokens.fontSize.xs, textAlign: "center" },
  value: { fontSize: tokens.fontSize.lg, fontWeight: "500", marginTop: 4 },
});

function TradeRow({ trade }: { trade: PublicTrade }) {
  const { colors } = useTheme();
  const isBuy = trade.type === "buy";
  return (
    <View style={[rowStyles.row, { borderBottomColor: colors.border }]}>
      <View style={[rowStyles.chip, { backgroundColor: isBuy ? tokens.colors.positive : tokens.colors.negative }]}>
        <Text style={rowStyles.chipText}>{trade.type.toUpperCase()}</Text>
      </View>
      <View style={rowStyles.info}>
        <Text style={[rowStyles.ticker, { color: colors.ink }]}>{trade.ticker}</Text>
        <Text style={[rowStyles.name, { color: colors.inkMuted }]}>{trade.name}</Text>
      </View>
      <View style={rowStyles.right}>
        <Text style={[rowStyles.amount, { color: colors.ink }]}>£{trade.amountGBP.toFixed(0)}</Text>
        <Text style={[rowStyles.date, { color: colors.inkFaint }]}>{trade.date}</Text>
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: tokens.spacing.sm,
  },
  chip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: tokens.radius.sm },
  chipText: { color: "#fff", fontSize: tokens.fontSize.xs, fontWeight: "600" },
  info: { flex: 1 },
  ticker: { fontSize: tokens.fontSize.md, fontWeight: "500" },
  name: { fontSize: tokens.fontSize.xs, marginTop: 1 },
  right: { alignItems: "flex-end" },
  amount: { fontSize: tokens.fontSize.md, fontWeight: "500" },
  date: { fontSize: tokens.fontSize.xs, marginTop: 2 },
});

export default function PublicProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { colors } = useTheme();
  const { data: profile, isLoading, refetch } = usePublicProfile(userId ?? "");

  if (!isLoading && !profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={[styles.notFound, { color: colors.inkMuted }]}>Profile not found</Text>
      </View>
    );
  }

  const isGainPositive = (profile?.stats.realisedGL ?? 0) >= 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.ink} />}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.displayName, { color: colors.ink }]}>
          {profile?.displayName ?? "Loading…"}
        </Text>
      </View>

      {/* Stats */}
      {profile?.stats && (
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <View style={styles.statsRow}>
            <StatCard
              label="Invested"
              value={`£${profile.stats.totalInvestedGBP.toFixed(0)}`}
            />
            <StatCard
              label="Realised G/L"
              value={`${isGainPositive ? "+" : ""}£${Math.abs(profile.stats.realisedGL).toFixed(0)}`}
            />
            <StatCard
              label="Trades"
              value={String(profile.stats.tradeCount)}
            />
          </View>
        </View>
      )}

      {/* Trade history */}
      <View style={[styles.section, { borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.inkMuted }]}>Trade History</Text>
        {profile?.trades.map((trade, i) => <TradeRow key={i} trade={trade} />)}
        {!isLoading && profile?.trades.length === 0 && (
          <Text style={[styles.emptyText, { color: colors.inkFaint }]}>No public trades</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { padding: tokens.spacing.lg, fontSize: tokens.fontSize.md },
  header: {
    padding: tokens.spacing.md,
    paddingVertical: tokens.spacing.lg,
    borderBottomWidth: 1,
  },
  displayName: {
    fontSize: tokens.fontSize.xxl,
    fontWeight: "500",
    letterSpacing: -0.5,
  },
  section: { padding: tokens.spacing.md, borderBottomWidth: 1 },
  statsRow: { flexDirection: "row", gap: tokens.spacing.sm },
  sectionTitle: {
    fontSize: tokens.fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: tokens.spacing.sm,
  },
  emptyText: { fontSize: tokens.fontSize.sm, paddingVertical: tokens.spacing.md },
});
