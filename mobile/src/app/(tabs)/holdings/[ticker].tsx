import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  usePortfolio,
  usePriceHistory,
  useTickerNews,
  useEarnings,
} from "@/api/queries";
import {
  useAddLot,
  useUpdateLot,
  useDeleteLot,
  useSellUnits,
  useSaveNotes,
  useDeleteHolding,
} from "@/api/mutations";
import { tokens } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { compute } from "@/data/portfolio";

const RANGES = ["1D", "1M", "6M", "YTD", "1Y"] as const;

function FundamentalItem({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={fStyles.item}>
      <Text style={[fStyles.label, { color: colors.inkMuted }]}>{label}</Text>
      <Text style={[fStyles.value, { color: colors.ink }]}>{value}</Text>
    </View>
  );
}

const fStyles = StyleSheet.create({
  item: { flex: 1, minWidth: "45%", padding: tokens.spacing.sm },
  label: { fontSize: tokens.fontSize.xs },
  value: { fontSize: tokens.fontSize.sm, fontWeight: "500", marginTop: 2 },
});

function LotRow({
  lot,
  ticker,
  onDelete,
  onEdit,
}: {
  lot: { id: number; units: number; price: number; date: string };
  ticker: string;
  onDelete: (id: number) => void;
  onEdit: (lot: { id: number; units: number; price: number; date: string }) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[lotStyles.row, { borderBottomColor: colors.border }]}>
      <View style={lotStyles.left}>
        <Text style={[lotStyles.date, { color: colors.inkMuted }]}>
          {lot.date}
        </Text>
        <Text style={[lotStyles.units, { color: colors.ink }]}>
          {lot.units} @ £{lot.price.toFixed(2)}
        </Text>
      </View>
      <View style={lotStyles.actions}>
        <TouchableOpacity
          onPress={() => onEdit(lot)}
          style={[lotStyles.actionBtn, { borderColor: colors.border }]}
        >
          <Text style={[lotStyles.actionText, { color: colors.inkMuted }]}>
            Edit
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            Alert.alert("Delete lot", "Are you sure?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => onDelete(lot.id),
              },
            ])
          }
          style={[lotStyles.actionBtn, { borderColor: colors.border }]}
        >
          <Text style={{ color: tokens.colors.negative, fontSize: tokens.fontSize.xs }}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const lotStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  left: {},
  date: { fontSize: tokens.fontSize.xs },
  units: { fontSize: tokens.fontSize.sm, marginTop: 2 },
  actions: { flexDirection: "row", gap: tokens.spacing.xs },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
  },
  actionText: { fontSize: tokens.fontSize.xs },
});

export default function HoldingDetailScreen() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const [range, setRange] = useState("1M");
  const [showAddLot, setShowAddLot] = useState(false);
  const [showSell, setShowSell] = useState(false);
  const [editLot, setEditLot] = useState<{
    id: number;
    units: number;
    price: number;
    date: string;
  } | null>(null);
  const [thesis, setThesis] = useState("");
  const [bearCase, setBearCase] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);

  // Lot form state
  const [lotUnits, setLotUnits] = useState("");
  const [lotPrice, setLotPrice] = useState("");
  const [lotDate, setLotDate] = useState(new Date().toISOString().split("T")[0]);

  // Sell form state
  const [sellUnitsVal, setSellUnitsVal] = useState("");
  const [sellPriceVal, setSellPriceVal] = useState("");

  const { data: portfolio, isLoading, refetch } = usePortfolio();
  const { data: history } = usePriceHistory(ticker ?? "", range);
  const { data: news } = useTickerNews(ticker ?? "");
  const { data: earnings } = useEarnings(ticker ?? "");

  const addLot = useAddLot();
  const updateLot = useUpdateLot();
  const deleteLot = useDeleteLot();
  const sellMutation = useSellUnits();
  const saveNotes = useSaveNotes();
  const deleteHolding = useDeleteHolding();

  const computed = portfolio ? compute(portfolio.holdings, portfolio.cashGBP) : null;
  const holding = computed?.rows.find((r) => r.ticker === ticker);

  // Populate notes from holding data
  if (holding && !notesDirty) {
    if (thesis !== (holding.thesis ?? "")) setThesis(holding.thesis ?? "");
    if (bearCase !== (holding.bearCase ?? "")) setBearCase(holding.bearCase ?? "");
  }

  const handleAddLot = async () => {
    if (!ticker || !lotUnits || !lotPrice) return;
    try {
      if (editLot) {
        await updateLot.mutateAsync({
          id: editLot.id,
          units: parseFloat(lotUnits),
          price: parseFloat(lotPrice),
          date: lotDate,
        });
      } else {
        await addLot.mutateAsync({
          ticker,
          units: parseFloat(lotUnits),
          price: parseFloat(lotPrice),
          date: lotDate,
        });
      }
      setLotUnits("");
      setLotPrice("");
      setLotDate(new Date().toISOString().split("T")[0]);
      setEditLot(null);
      setShowAddLot(false);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to save lot");
    }
  };

  const handleSell = async () => {
    if (!ticker || !sellUnitsVal || !sellPriceVal) return;
    try {
      await sellMutation.mutateAsync({
        ticker,
        units: parseFloat(sellUnitsVal),
        price: parseFloat(sellPriceVal),
      });
      setSellUnitsVal("");
      setSellPriceVal("");
      setShowSell(false);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to sell");
    }
  };

  const handleSaveNotes = async () => {
    if (!ticker) return;
    try {
      await saveNotes.mutateAsync({ ticker, thesis, bearCase });
      setNotesDirty(false);
      Alert.alert("Saved", "Notes saved successfully.");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to save notes");
    }
  };

  const handleDeleteHolding = () => {
    Alert.alert(
      "Delete holding",
      `Remove ${ticker} from your portfolio? All lots will be deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteHolding.mutateAsync(ticker ?? "");
              router.back();
            } catch (e: any) {
              Alert.alert("Error", e?.message ?? "Failed to delete");
            }
          },
        },
      ],
    );
  };

  if (!holding && !isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={[styles.notFound, { color: colors.inkMuted }]}>
          Holding not found
        </Text>
      </View>
    );
  }

  const isPositive = (holding?.unrealisedPct ?? 0) >= 0;
  const dayIsPositive = (holding?.dayChangePct ?? 0) >= 0;

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
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.ticker, { color: colors.ink }]}>{ticker}</Text>
        <Text style={[styles.name, { color: colors.inkMuted }]}>
          {holding?.name ?? ""}
        </Text>
        <Text style={[styles.price, { color: colors.ink }]}>
          {holding?.currency === "GBp"
            ? `${holding.lastPrice}p`
            : `£${holding?.lastPrice.toFixed(2)}`}
        </Text>
        <Text
          style={[
            styles.dayChange,
            { color: dayIsPositive ? tokens.colors.positive : tokens.colors.negative },
          ]}
        >
          {dayIsPositive ? "+" : ""}
          {holding?.dayChangePct.toFixed(2)}% today
        </Text>
      </View>

      {/* Position summary */}
      {holding && (
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.inkMuted }]}>
            Position
          </Text>
          <View style={styles.statsGrid}>
            <FundamentalItem
              label="Market value"
              value={`£${holding.marketValueGBP.toFixed(0)}`}
            />
            <FundamentalItem
              label="Cost"
              value={`£${holding.costGBP.toFixed(0)}`}
            />
            <FundamentalItem
              label="Unrealised G/L"
              value={`${isPositive ? "+" : ""}£${holding.unrealisedGL.toFixed(0)} (${isPositive ? "+" : ""}${holding.unrealisedPct.toFixed(1)}%)`}
            />
            <FundamentalItem
              label="Units"
              value={holding.units.toFixed(4)}
            />
            <FundamentalItem
              label="Avg buy price"
              value={`£${holding.avgBuyP.toFixed(2)}`}
            />
            <FundamentalItem
              label="Alloc"
              value={`${holding.allocActual.toFixed(1)}%`}
            />
          </View>
        </View>
      )}

      {/* Price chart range selector */}
      <View style={[styles.section, { borderBottomColor: colors.border }]}>
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
        <View style={[styles.chartPlaceholder, { borderColor: colors.border }]}>
          {history && history.length > 0 ? (
            <Text style={[styles.chartLabel, { color: colors.inkMuted }]}>
              {history.length} candles ({range}) — chart renders in native build
            </Text>
          ) : (
            <Text style={[styles.chartLabel, { color: colors.inkFaint }]}>
              No price history
            </Text>
          )}
        </View>
      </View>

      {/* Fundamentals */}
      {holding && (
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.inkMuted }]}>
            Fundamentals
          </Text>
          <View style={styles.statsGrid}>
            {holding.pe && (
              <FundamentalItem label="P/E" value={holding.pe.toFixed(1)} />
            )}
            {holding.forwardPe && (
              <FundamentalItem
                label="Fwd P/E"
                value={holding.forwardPe.toFixed(1)}
              />
            )}
            {holding.mktCap && (
              <FundamentalItem
                label="Mkt cap"
                value={`£${(holding.mktCap / 1e9).toFixed(1)}B`}
              />
            )}
            {holding.beta && (
              <FundamentalItem label="Beta" value={holding.beta.toFixed(2)} />
            )}
            {holding.revenueGrowth && (
              <FundamentalItem
                label="Rev growth"
                value={`${(holding.revenueGrowth * 100).toFixed(1)}%`}
              />
            )}
            {holding.profitMargin && (
              <FundamentalItem
                label="Profit margin"
                value={`${(holding.profitMargin * 100).toFixed(1)}%`}
              />
            )}
            {holding.divYield && (
              <FundamentalItem
                label="Div yield"
                value={`${(holding.divYield * 100).toFixed(2)}%`}
              />
            )}
            {holding.roe && (
              <FundamentalItem
                label="ROE"
                value={`${(holding.roe * 100).toFixed(1)}%`}
              />
            )}
          </View>
        </View>
      )}

      {/* Analyst ratings */}
      {holding?.analyst && (
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.inkMuted }]}>
            Analyst Ratings
          </Text>
          <View style={styles.statsGrid}>
            <FundamentalItem
              label="Buy"
              value={String(holding.analyst.buy)}
            />
            <FundamentalItem
              label="Hold"
              value={String(holding.analyst.hold)}
            />
            <FundamentalItem
              label="Sell"
              value={String(holding.analyst.sell)}
            />
            <FundamentalItem
              label="Target high"
              value={`£${holding.analyst.targetHigh.toFixed(2)}`}
            />
            <FundamentalItem
              label="Target low"
              value={`£${holding.analyst.targetLow.toFixed(2)}`}
            />
          </View>
        </View>
      )}

      {/* Earnings */}
      {earnings && (
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.inkMuted }]}>
            Earnings
          </Text>
          <View style={styles.statsGrid}>
            {earnings.date && (
              <FundamentalItem label="Date" value={earnings.date} />
            )}
            {earnings.estimate !== undefined && (
              <FundamentalItem
                label="Estimate EPS"
                value={earnings.estimate.toFixed(2)}
              />
            )}
            {earnings.actual !== undefined && (
              <FundamentalItem
                label="Actual EPS"
                value={earnings.actual.toFixed(2)}
              />
            )}
            {earnings.surprisePct !== undefined && (
              <FundamentalItem
                label="Surprise"
                value={`${earnings.surprisePct >= 0 ? "+" : ""}${earnings.surprisePct.toFixed(1)}%`}
              />
            )}
          </View>
        </View>
      )}

      {/* Notes */}
      <View style={[styles.section, { borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.inkMuted }]}>
          Notes
        </Text>
        <Text style={[styles.inputLabel, { color: colors.inkMuted }]}>
          Investment thesis
        </Text>
        <TextInput
          style={[
            styles.textarea,
            { borderColor: colors.border, color: colors.ink, backgroundColor: colors.surface },
          ]}
          multiline
          numberOfLines={4}
          placeholder="Why you own this..."
          placeholderTextColor={colors.inkFaint}
          value={thesis}
          onChangeText={(t) => { setThesis(t); setNotesDirty(true); }}
        />
        <Text style={[styles.inputLabel, { color: colors.inkMuted }]}>
          Bear case
        </Text>
        <TextInput
          style={[
            styles.textarea,
            { borderColor: colors.border, color: colors.ink, backgroundColor: colors.surface },
          ]}
          multiline
          numberOfLines={3}
          placeholder="Risks to monitor..."
          placeholderTextColor={colors.inkFaint}
          value={bearCase}
          onChangeText={(t) => { setBearCase(t); setNotesDirty(true); }}
        />
        {notesDirty && (
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.ink }]}
            onPress={handleSaveNotes}
            disabled={saveNotes.isPending}
          >
            <Text style={[styles.saveBtnText, { color: colors.bg }]}>
              {saveNotes.isPending ? "Saving…" : "Save Notes"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* News */}
      {news && news.length > 0 && (
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.inkMuted }]}>
            News
          </Text>
          {news.slice(0, 5).map((article, i) => (
            <View
              key={i}
              style={[styles.newsItem, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.newsTitle, { color: colors.ink }]}>
                {article.title}
              </Text>
              <Text style={[styles.newsMeta, { color: colors.inkFaint }]}>
                {article.source} · {new Date(article.publishedAt).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={[styles.section, { borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.inkMuted }]}>
          Actions
        </Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.ink }]}
            onPress={() => setShowAddLot(true)}
          >
            <Text style={[styles.actionBtnText, { color: colors.bg }]}>
              Add lot
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.ink },
            ]}
            onPress={() => setShowSell(true)}
          >
            <Text style={[styles.actionBtnText, { color: colors.ink }]}>
              Sell
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: "transparent", borderWidth: 1, borderColor: tokens.colors.negative },
            ]}
            onPress={handleDeleteHolding}
          >
            <Text style={[styles.actionBtnText, { color: tokens.colors.negative }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 48 }} />

      {/* Add/Edit Lot Modal */}
      <Modal
        visible={showAddLot || !!editLot}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <ScrollView
          style={[styles.modal, { backgroundColor: colors.bg }]}
          contentContainerStyle={styles.modalContent}
        >
          <Text style={[styles.modalTitle, { color: colors.ink }]}>
            {editLot ? "Edit Lot" : "Add Lot"}
          </Text>
          <Text style={[styles.inputLabel, { color: colors.inkMuted }]}>
            Units
          </Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.ink, backgroundColor: colors.surface }]}
            value={lotUnits}
            onChangeText={setLotUnits}
            keyboardType="decimal-pad"
            placeholder="e.g. 10"
            placeholderTextColor={colors.inkFaint}
          />
          <Text style={[styles.inputLabel, { color: colors.inkMuted }]}>
            Price per unit
          </Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.ink, backgroundColor: colors.surface }]}
            value={lotPrice}
            onChangeText={setLotPrice}
            keyboardType="decimal-pad"
            placeholder="e.g. 150.00"
            placeholderTextColor={colors.inkFaint}
          />
          <Text style={[styles.inputLabel, { color: colors.inkMuted }]}>
            Date
          </Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.ink, backgroundColor: colors.surface }]}
            value={lotDate}
            onChangeText={setLotDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.inkFaint}
          />
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.ink }]}
            onPress={handleAddLot}
            disabled={addLot.isPending || updateLot.isPending}
          >
            <Text style={[styles.submitBtnText, { color: colors.bg }]}>
              {addLot.isPending || updateLot.isPending ? "Saving…" : editLot ? "Update" : "Add Lot"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => { setShowAddLot(false); setEditLot(null); }}
          >
            <Text style={[styles.cancelText, { color: colors.inkMuted }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      {/* Sell Modal */}
      <Modal visible={showSell} animationType="slide" presentationStyle="pageSheet">
        <ScrollView
          style={[styles.modal, { backgroundColor: colors.bg }]}
          contentContainerStyle={styles.modalContent}
        >
          <Text style={[styles.modalTitle, { color: colors.ink }]}>
            Sell {ticker}
          </Text>
          <Text style={[styles.inputLabel, { color: colors.inkMuted }]}>
            Units to sell
          </Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.ink, backgroundColor: colors.surface }]}
            value={sellUnitsVal}
            onChangeText={setSellUnitsVal}
            keyboardType="decimal-pad"
            placeholder={`Max ${holding?.units.toFixed(4) ?? ""}`}
            placeholderTextColor={colors.inkFaint}
          />
          <Text style={[styles.inputLabel, { color: colors.inkMuted }]}>
            Sell price
          </Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.ink, backgroundColor: colors.surface }]}
            value={sellPriceVal}
            onChangeText={setSellPriceVal}
            keyboardType="decimal-pad"
            placeholder="e.g. 160.00"
            placeholderTextColor={colors.inkFaint}
          />
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: tokens.colors.negative }]}
            onPress={handleSell}
            disabled={sellMutation.isPending}
          >
            <Text style={[styles.submitBtnText, { color: "#fff" }]}>
              {sellMutation.isPending ? "Selling…" : "Confirm Sell"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setShowSell(false)}
          >
            <Text style={[styles.cancelText, { color: colors.inkMuted }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: {
    padding: tokens.spacing.lg,
    fontSize: tokens.fontSize.md,
  },
  header: {
    padding: tokens.spacing.md,
    paddingVertical: tokens.spacing.lg,
    borderBottomWidth: 1,
  },
  ticker: {
    fontSize: tokens.fontSize.xxl,
    fontWeight: tokens.fontWeight.medium,
    letterSpacing: -0.5,
  },
  name: { fontSize: tokens.fontSize.sm, marginTop: 2 },
  price: {
    fontSize: tokens.fontSize.hero,
    fontWeight: tokens.fontWeight.medium,
    marginTop: tokens.spacing.sm,
    letterSpacing: -1,
  },
  dayChange: { fontSize: tokens.fontSize.sm, marginTop: 4 },
  section: { padding: tokens.spacing.md, borderBottomWidth: 1 },
  sectionTitle: {
    fontSize: tokens.fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: tokens.spacing.sm,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -tokens.spacing.sm,
  },
  rangePills: {
    flexDirection: "row",
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.sm,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
  },
  pillText: { fontSize: tokens.fontSize.xs },
  chartPlaceholder: {
    height: 160,
    borderWidth: 1,
    borderRadius: tokens.radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  chartLabel: { fontSize: tokens.fontSize.sm },
  inputLabel: {
    fontSize: tokens.fontSize.sm,
    marginBottom: tokens.spacing.xs,
    marginTop: tokens.spacing.sm,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: tokens.radius.sm,
    padding: tokens.spacing.sm,
    fontSize: tokens.fontSize.sm,
    minHeight: 80,
    textAlignVertical: "top",
  },
  saveBtn: {
    paddingVertical: 12,
    borderRadius: tokens.radius.sm,
    alignItems: "center",
    marginTop: tokens.spacing.sm,
  },
  saveBtnText: { fontSize: tokens.fontSize.sm, fontWeight: "500" },
  newsItem: {
    paddingVertical: tokens.spacing.sm,
    borderBottomWidth: 1,
  },
  newsTitle: { fontSize: tokens.fontSize.sm, lineHeight: 20 },
  newsMeta: { fontSize: tokens.fontSize.xs, marginTop: 2 },
  actionButtons: {
    flexDirection: "row",
    gap: tokens.spacing.sm,
    flexWrap: "wrap",
  },
  actionBtn: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 10,
    borderRadius: tokens.radius.sm,
  },
  actionBtnText: { fontSize: tokens.fontSize.sm, fontWeight: "500" },
  modal: { flex: 1 },
  modalContent: { padding: tokens.spacing.lg },
  modalTitle: {
    fontSize: tokens.fontSize.xl,
    fontWeight: tokens.fontWeight.medium,
    marginBottom: tokens.spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 10,
    fontSize: tokens.fontSize.md,
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
