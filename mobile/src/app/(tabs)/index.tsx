import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { usePortfolio, usePortfolioHistory } from "@/api/queries";
import { useState } from "react";
import { tokens } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { compute } from "@/data/portfolio";

const RANGES = ["1D", "1M", "6M", "YTD", "1Y", "All"] as const;

function fmt(n: number) {
  return n.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function DashboardScreen() {
  const { colors } = useTheme();
  const [range, setRange] = useState<string>("1M");
  const { data: portfolio, isLoading, refetch } = usePortfolio();
  const { data: history } = usePortfolioHistory(range);

  const computed = portfolio ? compute(portfolio.holdings, portfolio.cashGBP) : null;
  const totalValue = computed?.totalValue ?? 0;
  const dayChangeGBP = computed?.dayChangeGBP ?? 0;
  const dayChangePct = computed?.dayChangePct ?? 0;
  const isPositive = dayChangeGBP >= 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refetch}
          tintColor={colors.ink}
        />
      }
    >
      {/* Hero header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.totalLabel, { color: colors.inkMuted }]}>
          Portfolio Value
        </Text>
        <Text style={[styles.totalValue, { color: colors.ink }]}>
          £{fmt(totalValue)}
        </Text>
        <Text
          style={[
            styles.dayChange,
            {
              color: isPositive
                ? tokens.colors.positive
                : tokens.colors.negative,
            },
          ]}
        >
          {isPositive ? "+" : ""}£{fmt(Math.abs(dayChangeGBP))} (
          {isPositive ? "+" : ""}
          {dayChangePct.toFixed(2)}%) today
        </Text>
      </View>

      {/* Range pills */}
      <View style={styles.rangePills}>
        {RANGES.map((r) => (
          <TouchableOpacity
            key={r}
            style={[
              styles.pill,
              { borderColor: colors.border },
              range === r && { backgroundColor: colors.ink },
            ]}
            onPress={() => setRange(r)}
            accessibilityLabel={`${r} range`}
            accessibilityState={{ selected: range === r }}
          >
            <Text
              style={[
                styles.pillText,
                { color: range === r ? colors.bg : colors.inkMuted },
              ]}
            >
              {r}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart area */}
      <View style={[styles.chartContainer, { borderBottomColor: colors.border }]}>
        {history && history.length > 0 ? (
          <View style={styles.chartPlaceholder}>
            <Text style={[styles.chartLabel, { color: colors.inkMuted }]}>
              {history.length} data points — chart requires native build
            </Text>
            {history.length >= 2 && (
              <Text style={[styles.chartSub, { color: colors.inkFaint }]}>
                {new Date(history[0].ts).toLocaleDateString()} →{" "}
                {new Date(history[history.length - 1].ts).toLocaleDateString()}
              </Text>
            )}
          </View>
        ) : (
          <Text style={[styles.chartLabel, { color: colors.inkFaint }]}>
            No history data
          </Text>
        )}
      </View>

      {/* Allocation / holdings list */}
      <View style={[styles.section, { borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.inkMuted }]}>
          Holdings
        </Text>

        {computed?.rows.map((h) => (
          <View
            key={h.ticker}
            style={[styles.holdingRow, { borderBottomColor: colors.border }]}
          >
            <View style={styles.holdingLeft}>
              <Text style={[styles.holdingTicker, { color: colors.ink }]}>
                {h.ticker}
              </Text>
              <Text style={[styles.holdingName, { color: colors.inkMuted }]}>
                {h.name}
              </Text>
            </View>
            <View style={styles.holdingRight}>
              <Text style={[styles.holdingValue, { color: colors.ink }]}>
                £{fmt(h.marketValueGBP)}
              </Text>
              <Text
                style={[
                  styles.holdingPct,
                  {
                    color:
                      h.unrealisedPct >= 0
                        ? tokens.colors.positive
                        : tokens.colors.negative,
                  },
                ]}
              >
                {h.unrealisedPct >= 0 ? "+" : ""}
                {h.unrealisedPct.toFixed(1)}%
              </Text>
            </View>
          </View>
        ))}

        {!computed?.rows.length && !isLoading && (
          <Text style={[styles.emptyText, { color: colors.inkFaint }]}>
            No holdings yet
          </Text>
        )}

        {portfolio?.cashGBP !== undefined && portfolio.cashGBP > 0 && (
          <View
            style={[styles.holdingRow, { borderBottomColor: colors.border }]}
          >
            <View style={styles.holdingLeft}>
              <Text style={[styles.holdingTicker, { color: colors.ink }]}>
                CASH
              </Text>
              <Text style={[styles.holdingName, { color: colors.inkMuted }]}>
                Available cash
              </Text>
            </View>
            <Text style={[styles.holdingValue, { color: colors.ink }]}>
              £{fmt(portfolio.cashGBP)}
            </Text>
          </View>
        )}
      </View>

      {/* Portfolio summary stats */}
      {computed && (
        <View style={[styles.statsRow, { borderBottomColor: colors.border }]}>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: colors.inkMuted }]}>
              Cost
            </Text>
            <Text style={[styles.statValue, { color: colors.ink }]}>
              £{fmt(computed.cost)}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: colors.inkMuted }]}>
              Unrealised G/L
            </Text>
            <Text
              style={[
                styles.statValue,
                {
                  color:
                    computed.unrealisedGL >= 0
                      ? tokens.colors.positive
                      : tokens.colors.negative,
                },
              ]}
            >
              {computed.unrealisedGL >= 0 ? "+" : ""}£
              {fmt(Math.abs(computed.unrealisedGL))}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: colors.inkMuted }]}>
              Return
            </Text>
            <Text
              style={[
                styles.statValue,
                {
                  color:
                    computed.unrealisedPct >= 0
                      ? tokens.colors.positive
                      : tokens.colors.negative,
                },
              ]}
            >
              {computed.unrealisedPct >= 0 ? "+" : ""}
              {computed.unrealisedPct.toFixed(2)}%
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: tokens.spacing.md,
    borderBottomWidth: 1,
    paddingVertical: tokens.spacing.lg,
  },
  totalLabel: { fontSize: tokens.fontSize.sm, marginBottom: 4 },
  totalValue: {
    fontSize: tokens.fontSize.hero,
    fontWeight: tokens.fontWeight.medium,
    letterSpacing: -1,
  },
  dayChange: { fontSize: tokens.fontSize.sm, marginTop: 4 },
  rangePills: {
    flexDirection: "row",
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
    flexWrap: "wrap",
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
  },
  pillText: { fontSize: tokens.fontSize.xs },
  chartContainer: {
    height: 180,
    borderBottomWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  chartPlaceholder: { alignItems: "center" },
  chartLabel: { fontSize: tokens.fontSize.sm, textAlign: "center" },
  chartSub: { fontSize: tokens.fontSize.xs, marginTop: 4 },
  section: { padding: tokens.spacing.md },
  sectionTitle: {
    fontSize: tokens.fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: tokens.spacing.sm,
  },
  holdingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  holdingLeft: { flex: 1 },
  holdingRight: { alignItems: "flex-end" },
  holdingTicker: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.medium,
  },
  holdingName: { fontSize: tokens.fontSize.xs, marginTop: 2 },
  holdingValue: { fontSize: tokens.fontSize.md },
  holdingPct: { fontSize: tokens.fontSize.sm, marginTop: 2 },
  emptyText: { fontSize: tokens.fontSize.sm, paddingVertical: tokens.spacing.md },
  statsRow: {
    flexDirection: "row",
    padding: tokens.spacing.md,
    borderBottomWidth: 1,
  },
  stat: { flex: 1 },
  statLabel: { fontSize: tokens.fontSize.xs, marginBottom: 2 },
  statValue: { fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.medium },
});
