import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Modal,
  TextInput,
  Switch,
  ScrollView,
  Alert,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useState } from "react";
import { usePortfolio } from "@/api/queries";
import { useAddHolding } from "@/api/mutations";
import { tokens } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { compute, type HoldingComputed } from "@/data/portfolio";

function SparkLine({
  data,
  width = 60,
  height = 24,
  positive,
}: {
  data: number[];
  width?: number;
  height?: number;
  positive: boolean;
}) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
  const color = positive ? tokens.colors.positive : tokens.colors.negative;

  // Simple SVG-like inline rendering using View is not feasible without react-native-svg.
  // We'll render a numeric indicator instead as a fallback.
  const first = data[0];
  const last = data[data.length - 1];
  const changePct = first > 0 ? ((last - first) / first) * 100 : 0;
  return (
    <Text style={{ fontSize: tokens.fontSize.xs, color, fontWeight: "500" }}>
      {changePct >= 0 ? "+" : ""}{changePct.toFixed(1)}%
    </Text>
  );
}

function AddHoldingModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const addHolding = useAddHolding();
  const [ticker, setTicker] = useState("");
  const [units, setUnits] = useState("");
  const [price, setPrice] = useState("");
  const [dateBought, setDateBought] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [bucket, setBucket] = useState<"Stock" | "Fund">("Stock");
  const [deductCash, setDeductCash] = useState(false);

  const reset = () => {
    setTicker("");
    setUnits("");
    setPrice("");
    setDateBought(new Date().toISOString().split("T")[0]);
    setBucket("Stock");
    setDeductCash(false);
  };

  const handleAdd = async () => {
    if (!ticker.trim() || !units) {
      Alert.alert("Missing fields", "Ticker and units are required.");
      return;
    }
    try {
      await addHolding.mutateAsync({
        ticker: ticker.trim().toUpperCase(),
        units: parseFloat(units),
        price: price ? parseFloat(price) : undefined,
        dateBought,
        bucket,
        allocTarget: 0,
        deductCash,
      });
      reset();
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to add holding");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView
        style={[styles.modalContainer, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.modalContent}
      >
        <Text style={[styles.modalTitle, { color: colors.ink }]}>
          Add Holding
        </Text>

        <Text style={[styles.inputLabel, { color: colors.inkMuted }]}>
          Ticker *
        </Text>
        <TextInput
          style={[
            styles.input,
            { borderColor: colors.border, color: colors.ink, backgroundColor: colors.surface },
          ]}
          placeholder="e.g. AAPL"
          placeholderTextColor={colors.inkFaint}
          value={ticker}
          onChangeText={(t) => setTicker(t.toUpperCase())}
          autoCapitalize="characters"
        />

        <Text style={[styles.inputLabel, { color: colors.inkMuted }]}>
          Units *
        </Text>
        <TextInput
          style={[
            styles.input,
            { borderColor: colors.border, color: colors.ink, backgroundColor: colors.surface },
          ]}
          placeholder="e.g. 10"
          placeholderTextColor={colors.inkFaint}
          value={units}
          onChangeText={setUnits}
          keyboardType="decimal-pad"
        />

        <Text style={[styles.inputLabel, { color: colors.inkMuted }]}>
          Price per unit (optional)
        </Text>
        <TextInput
          style={[
            styles.input,
            { borderColor: colors.border, color: colors.ink, backgroundColor: colors.surface },
          ]}
          placeholder="e.g. 150.00"
          placeholderTextColor={colors.inkFaint}
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
        />

        <Text style={[styles.inputLabel, { color: colors.inkMuted }]}>
          Date bought
        </Text>
        <TextInput
          style={[
            styles.input,
            { borderColor: colors.border, color: colors.ink, backgroundColor: colors.surface },
          ]}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.inkFaint}
          value={dateBought}
          onChangeText={setDateBought}
        />

        <Text style={[styles.inputLabel, { color: colors.inkMuted }]}>
          Type
        </Text>
        <View style={styles.segmentRow}>
          {(["Stock", "Fund"] as const).map((b) => (
            <TouchableOpacity
              key={b}
              style={[
                styles.segment,
                { borderColor: colors.border },
                bucket === b && { backgroundColor: colors.ink },
              ]}
              onPress={() => setBucket(b)}
            >
              <Text
                style={{ color: bucket === b ? colors.bg : colors.inkMuted }}
              >
                {b}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.switchRow}>
          <Text style={[styles.inputLabel, { color: colors.inkMuted, marginBottom: 0 }]}>
            Deduct from cash balance
          </Text>
          <Switch
            value={deductCash}
            onValueChange={setDeductCash}
            trackColor={{ false: colors.border, true: colors.ink }}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.ink }]}
          onPress={handleAdd}
          disabled={addHolding.isPending}
        >
          <Text style={[styles.submitBtnText, { color: colors.bg }]}>
            {addHolding.isPending ? "Adding…" : "Add Holding"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={[styles.cancelBtnText, { color: colors.inkMuted }]}>
            Cancel
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}

function HoldingRow({ item }: { item: HoldingComputed }) {
  const router = useRouter();
  const { colors } = useTheme();
  const isPositive = item.unrealisedPct >= 0;

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={() => router.push(`/(tabs)/holdings/${item.ticker}`)}
      accessibilityLabel={`View ${item.ticker} holding details`}
    >
      <View style={styles.rowLeft}>
        <Text style={[styles.rowTicker, { color: colors.ink }]}>
          {item.ticker}
        </Text>
        <Text style={[styles.rowName, { color: colors.inkMuted }]}>
          {item.name}
        </Text>
        <Text style={[styles.rowUnits, { color: colors.inkFaint }]}>
          {item.units.toFixed(4)} units
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.rowPrice, { color: colors.ink }]}>
          £{item.marketValueGBP.toFixed(0)}
        </Text>
        <Text
          style={[
            styles.rowChange,
            {
              color: isPositive
                ? tokens.colors.positive
                : tokens.colors.negative,
            },
          ]}
        >
          {isPositive ? "+" : ""}
          {item.unrealisedPct.toFixed(1)}%
        </Text>
        <SparkLine
          data={item.spark}
          positive={isPositive}
        />
      </View>
    </TouchableOpacity>
  );
}

export default function HoldingsScreen() {
  const { colors } = useTheme();
  const [showAdd, setShowAdd] = useState(false);
  const { data: portfolio, isLoading, refetch } = usePortfolio();

  const computed = portfolio
    ? compute(portfolio.holdings, portfolio.cashGBP)
    : null;
  const rows = computed?.rows ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FlashList
        data={rows}
        keyExtractor={(item) => item.ticker}
        estimatedItemSize={72}
        renderItem={({ item }) => <HoldingRow item={item} />}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={colors.ink}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyTitle, { color: colors.ink }]}>
                No holdings yet
              </Text>
              <Text style={[styles.emptyBody, { color: colors.inkMuted }]}>
                Tap the + button to add your first position
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.ink }]}
        onPress={() => setShowAdd(true)}
        accessibilityLabel="Add holding"
      >
        <Text style={[styles.fabText, { color: colors.bg }]}>+</Text>
      </TouchableOpacity>

      <AddHoldingModal visible={showAdd} onClose={() => setShowAdd(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rowLeft: { flex: 1 },
  rowRight: { alignItems: "flex-end", gap: 2 },
  rowTicker: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.medium,
  },
  rowName: { fontSize: tokens.fontSize.xs, marginTop: 2 },
  rowUnits: { fontSize: tokens.fontSize.xs, marginTop: 2 },
  rowPrice: { fontSize: tokens.fontSize.md },
  rowChange: { fontSize: tokens.fontSize.sm },
  emptyContainer: {
    padding: tokens.spacing.xl,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.medium,
    marginBottom: tokens.spacing.sm,
  },
  emptyBody: { fontSize: tokens.fontSize.md, textAlign: "center" },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  fabText: { fontSize: 28, lineHeight: 32, fontWeight: "300" },
  modalContainer: { flex: 1 },
  modalContent: { padding: tokens.spacing.lg },
  modalTitle: {
    fontSize: tokens.fontSize.xl,
    fontWeight: tokens.fontWeight.medium,
    marginBottom: tokens.spacing.lg,
  },
  inputLabel: {
    fontSize: tokens.fontSize.sm,
    marginBottom: tokens.spacing.xs,
    marginTop: tokens.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 10,
    fontSize: tokens.fontSize.md,
  },
  segmentRow: { flexDirection: "row", gap: tokens.spacing.sm },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: tokens.radius.sm,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: tokens.spacing.md,
  },
  submitBtn: {
    paddingVertical: 16,
    borderRadius: tokens.radius.sm,
    alignItems: "center",
    marginTop: tokens.spacing.lg,
  },
  submitBtnText: { fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.medium },
  cancelBtn: { paddingVertical: 16, alignItems: "center" },
  cancelBtnText: { fontSize: tokens.fontSize.md },
});
