import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useState } from "react";
import { useTrades, useCashFlows } from "@/api/queries";
import { useAddTrade, useDeleteTrade, useAddCashFlow, useDeleteCashFlow } from "@/api/mutations";
import { tokens } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";

type Tab = "transactions" | "cash";

function TypeChip({ type }: { type: string }) {
  const isBuy = type === "buy" || type === "deposit";
  return (
    <View
      style={[
        chipStyles.chip,
        { backgroundColor: isBuy ? tokens.colors.positive : tokens.colors.negative },
      ]}
    >
      <Text style={chipStyles.text}>{type.toUpperCase()}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
  },
  text: { color: "#fff", fontSize: tokens.fontSize.xs, fontWeight: "600" },
});

function AddTradeModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const addTrade = useAddTrade();
  const [type, setType] = useState<"buy" | "sell" | "deposit" | "fee">("buy");
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [units, setUnits] = useState("");
  const [price, setPrice] = useState("");
  const [amountGBP, setAmountGBP] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const reset = () => {
    setTicker(""); setName(""); setUnits(""); setPrice(""); setAmountGBP(""); setDate(new Date().toISOString().split("T")[0]);
  };

  const handleAdd = async () => {
    if (!amountGBP) { Alert.alert("Missing fields", "Amount is required."); return; }
    try {
      await addTrade.mutateAsync({
        type,
        ticker: ticker.toUpperCase(),
        name,
        units: units ? parseFloat(units) : 0,
        price: price ? parseFloat(price) : 0,
        amountGBP: parseFloat(amountGBP),
        date,
      });
      reset(); onClose();
    } catch (e: any) { Alert.alert("Error", e?.message ?? "Failed to add trade"); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView style={[styles.modal, { backgroundColor: colors.bg }]} contentContainerStyle={styles.modalContent}>
        <Text style={[styles.modalTitle, { color: colors.ink }]}>Add Trade</Text>

        <Text style={[styles.label, { color: colors.inkMuted }]}>Type</Text>
        <View style={styles.segmentRow}>
          {(["buy", "sell", "deposit", "fee"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.segment, { borderColor: colors.border }, type === t && { backgroundColor: colors.ink }]}
              onPress={() => setType(t)}
            >
              <Text style={{ color: type === t ? colors.bg : colors.inkMuted, fontSize: tokens.fontSize.xs }}>
                {t.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.inkMuted }]}>Ticker</Text>
        <TextInput style={[styles.input, { borderColor: colors.border, color: colors.ink, backgroundColor: colors.surface }]}
          value={ticker} onChangeText={(v) => setTicker(v.toUpperCase())} placeholder="e.g. AAPL" placeholderTextColor={colors.inkFaint} autoCapitalize="characters" />

        <Text style={[styles.label, { color: colors.inkMuted }]}>Name</Text>
        <TextInput style={[styles.input, { borderColor: colors.border, color: colors.ink, backgroundColor: colors.surface }]}
          value={name} onChangeText={setName} placeholder="e.g. Apple Inc." placeholderTextColor={colors.inkFaint} />

        <Text style={[styles.label, { color: colors.inkMuted }]}>Units</Text>
        <TextInput style={[styles.input, { borderColor: colors.border, color: colors.ink, backgroundColor: colors.surface }]}
          value={units} onChangeText={setUnits} keyboardType="decimal-pad" placeholder="e.g. 10" placeholderTextColor={colors.inkFaint} />

        <Text style={[styles.label, { color: colors.inkMuted }]}>Price per unit</Text>
        <TextInput style={[styles.input, { borderColor: colors.border, color: colors.ink, backgroundColor: colors.surface }]}
          value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="e.g. 150.00" placeholderTextColor={colors.inkFaint} />

        <Text style={[styles.label, { color: colors.inkMuted }]}>Amount (GBP) *</Text>
        <TextInput style={[styles.input, { borderColor: colors.border, color: colors.ink, backgroundColor: colors.surface }]}
          value={amountGBP} onChangeText={setAmountGBP} keyboardType="decimal-pad" placeholder="e.g. 1500.00" placeholderTextColor={colors.inkFaint} />

        <Text style={[styles.label, { color: colors.inkMuted }]}>Date</Text>
        <TextInput style={[styles.input, { borderColor: colors.border, color: colors.ink, backgroundColor: colors.surface }]}
          value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.inkFaint} />

        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.ink }]} onPress={handleAdd} disabled={addTrade.isPending}>
          <Text style={[styles.submitBtnText, { color: colors.bg }]}>{addTrade.isPending ? "Adding…" : "Add Trade"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={[styles.cancelText, { color: colors.inkMuted }]}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}

function AddCashFlowModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const addFlow = useAddCashFlow();
  const [flowType, setFlowType] = useState<"deposit" | "withdrawal">("deposit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const handleAdd = async () => {
    if (!amount) { Alert.alert("Missing fields", "Amount is required."); return; }
    try {
      await addFlow.mutateAsync({ type: flowType, amountGBP: parseFloat(amount), note, date });
      setAmount(""); setNote(""); setDate(new Date().toISOString().split("T")[0]);
      onClose();
    } catch (e: any) { Alert.alert("Error", e?.message ?? "Failed to add cash flow"); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView style={[styles.modal, { backgroundColor: colors.bg }]} contentContainerStyle={styles.modalContent}>
        <Text style={[styles.modalTitle, { color: colors.ink }]}>Add Cash Flow</Text>

        <View style={styles.segmentRow}>
          {(["deposit", "withdrawal"] as const).map((t) => (
            <TouchableOpacity key={t}
              style={[styles.segment, { borderColor: colors.border }, flowType === t && { backgroundColor: colors.ink }]}
              onPress={() => setFlowType(t)}>
              <Text style={{ color: flowType === t ? colors.bg : colors.inkMuted, fontSize: tokens.fontSize.xs }}>
                {t.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.inkMuted }]}>Amount (GBP) *</Text>
        <TextInput style={[styles.input, { borderColor: colors.border, color: colors.ink, backgroundColor: colors.surface }]}
          value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="e.g. 1000.00" placeholderTextColor={colors.inkFaint} />

        <Text style={[styles.label, { color: colors.inkMuted }]}>Note</Text>
        <TextInput style={[styles.input, { borderColor: colors.border, color: colors.ink, backgroundColor: colors.surface }]}
          value={note} onChangeText={setNote} placeholder="Optional note" placeholderTextColor={colors.inkFaint} />

        <Text style={[styles.label, { color: colors.inkMuted }]}>Date</Text>
        <TextInput style={[styles.input, { borderColor: colors.border, color: colors.ink, backgroundColor: colors.surface }]}
          value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.inkFaint} />

        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.ink }]} onPress={handleAdd} disabled={addFlow.isPending}>
          <Text style={[styles.submitBtnText, { color: colors.bg }]}>{addFlow.isPending ? "Adding…" : "Add"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={[styles.cancelText, { color: colors.inkMuted }]}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}

export default function ActivityScreen() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>("transactions");
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [showAddCash, setShowAddCash] = useState(false);

  const { data: trades, isLoading: tradesLoading, refetch: refetchTrades } = useTrades();
  const { data: cashData, isLoading: cashLoading, refetch: refetchCash } = useCashFlows();
  const deleteTrade = useDeleteTrade();
  const deleteCashFlow = useDeleteCashFlow();

  const handleDeleteTrade = (id: number) => {
    Alert.alert("Delete trade", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteTrade.mutate(id) },
    ]);
  };

  const handleDeleteFlow = (id: number) => {
    Alert.alert("Delete cash flow", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteCashFlow.mutate(id) },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Segmented control */}
      <View style={[styles.segmentControl, { borderBottomColor: colors.border }]}>
        {(["transactions", "cash"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: colors.ink, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.ink : colors.inkMuted }]}>
              {tab === "transactions" ? "Transactions" : "Cash"}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={[styles.addBtn, { borderColor: colors.border }]}
          onPress={() => activeTab === "transactions" ? setShowAddTrade(true) : setShowAddCash(true)}
        >
          <Text style={[styles.addBtnText, { color: colors.ink }]}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {activeTab === "transactions" ? (
        <ScrollView
          refreshControl={<RefreshControl refreshing={tradesLoading} onRefresh={refetchTrades} tintColor={colors.ink} />}
        >
          {trades?.map((trade) => (
            <View key={trade.id} style={[styles.tradeRow, { borderBottomColor: colors.border }]}>
              <View style={styles.tradeLeft}>
                <View style={styles.tradeTopRow}>
                  <TypeChip type={trade.type} />
                  {trade.ticker ? (
                    <Text style={[styles.tradeTicker, { color: colors.ink }]}>{trade.ticker}</Text>
                  ) : null}
                </View>
                {trade.name ? (
                  <Text style={[styles.tradeName, { color: colors.inkMuted }]}>{trade.name}</Text>
                ) : null}
                <Text style={[styles.tradeDate, { color: colors.inkFaint }]}>{trade.date}</Text>
                {trade.units > 0 && (
                  <Text style={[styles.tradeDetail, { color: colors.inkMuted }]}>
                    {trade.units} units @ £{trade.price.toFixed(2)}
                  </Text>
                )}
              </View>
              <View style={styles.tradeRight}>
                <Text style={[styles.tradeAmount, { color: colors.ink }]}>
                  £{trade.amountGBP.toFixed(0)}
                </Text>
                <TouchableOpacity onPress={() => handleDeleteTrade(trade.id)}>
                  <Text style={[styles.deleteText, { color: tokens.colors.negative }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {!tradesLoading && (!trades || trades.length === 0) && (
            <Text style={[styles.emptyText, { color: colors.inkFaint }]}>No transactions yet</Text>
          )}
        </ScrollView>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={cashLoading} onRefresh={refetchCash} tintColor={colors.ink} />}
        >
          {/* Cash balance card */}
          <View style={[styles.balanceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.balanceLabel, { color: colors.inkMuted }]}>Cash Balance</Text>
            <Text style={[styles.balanceValue, { color: colors.ink }]}>
              £{cashData?.cashGBP?.toFixed(0) ?? "0"}
            </Text>
          </View>

          {cashData?.flows?.map((flow) => (
            <View key={flow.id} style={[styles.tradeRow, { borderBottomColor: colors.border }]}>
              <View style={styles.tradeLeft}>
                <TypeChip type={flow.type} />
                {flow.note ? <Text style={[styles.tradeName, { color: colors.inkMuted }]}>{flow.note}</Text> : null}
                <Text style={[styles.tradeDate, { color: colors.inkFaint }]}>{flow.date}</Text>
              </View>
              <View style={styles.tradeRight}>
                <Text style={[
                  styles.tradeAmount,
                  { color: flow.type === "deposit" ? tokens.colors.positive : tokens.colors.negative },
                ]}>
                  {flow.type === "deposit" ? "+" : "-"}£{flow.amountGBP.toFixed(0)}
                </Text>
                <TouchableOpacity onPress={() => handleDeleteFlow(flow.id)}>
                  <Text style={[styles.deleteText, { color: tokens.colors.negative }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {!cashLoading && (!cashData?.flows || cashData.flows.length === 0) && (
            <Text style={[styles.emptyText, { color: colors.inkFaint }]}>No cash flows yet</Text>
          )}
        </ScrollView>
      )}

      <AddTradeModal visible={showAddTrade} onClose={() => setShowAddTrade(false)} />
      <AddCashFlowModal visible={showAddCash} onClose={() => setShowAddCash(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  segmentControl: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingHorizontal: tokens.spacing.md,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: tokens.spacing.sm,
    marginRight: tokens.spacing.sm,
  },
  tabText: { fontSize: tokens.fontSize.md },
  addBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    marginVertical: 8,
  },
  addBtnText: { fontSize: tokens.fontSize.sm, fontWeight: "500" },
  tradeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  tradeLeft: { flex: 1, gap: 3 },
  tradeTopRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  tradeTicker: { fontSize: tokens.fontSize.md, fontWeight: "500" },
  tradeName: { fontSize: tokens.fontSize.xs },
  tradeDate: { fontSize: tokens.fontSize.xs },
  tradeDetail: { fontSize: tokens.fontSize.xs },
  tradeRight: { alignItems: "flex-end", gap: 4 },
  tradeAmount: { fontSize: tokens.fontSize.md, fontWeight: "500" },
  deleteText: { fontSize: tokens.fontSize.xs },
  emptyText: {
    padding: tokens.spacing.lg,
    textAlign: "center",
    fontSize: tokens.fontSize.sm,
  },
  balanceCard: {
    margin: tokens.spacing.md,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  balanceLabel: { fontSize: tokens.fontSize.sm },
  balanceValue: {
    fontSize: tokens.fontSize.xxl,
    fontWeight: "500",
    marginTop: 4,
    letterSpacing: -0.5,
  },
  modal: { flex: 1 },
  modalContent: { padding: tokens.spacing.lg },
  modalTitle: {
    fontSize: tokens.fontSize.xl,
    fontWeight: "500",
    marginBottom: tokens.spacing.lg,
  },
  label: { fontSize: tokens.fontSize.sm, marginBottom: tokens.spacing.xs, marginTop: tokens.spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 10,
    fontSize: tokens.fontSize.md,
  },
  segmentRow: { flexDirection: "row", gap: tokens.spacing.sm, marginTop: tokens.spacing.xs },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: tokens.radius.sm,
  },
  submitBtn: {
    paddingVertical: 16,
    borderRadius: tokens.radius.sm,
    alignItems: "center",
    marginTop: tokens.spacing.lg,
  },
  submitBtnText: { fontSize: tokens.fontSize.md, fontWeight: "500" },
  cancelBtn: { paddingVertical: 14, alignItems: "center" },
  cancelText: { fontSize: tokens.fontSize.md },
});
