import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  Switch,
  Alert,
} from "react-native";
import { useState } from "react";
import { useResearch } from "@/api/queries";
import { useUpsertResearchPick, useSetChecklist } from "@/api/mutations";
import { tokens } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";

type Pick = {
  id: number;
  week: number;
  company: string;
  ticker: string;
  sector: string;
  moat: string;
  roic: number;
  pe: number;
  fcfPositive: boolean;
  lowDebt: boolean;
  thesis: string;
  status: string;
  addedDate: string;
  checklist: boolean[];
};

const CHECKLIST_LABELS = [
  "Durable competitive advantage",
  "High ROIC (> 15%)",
  "FCF positive",
  "Low debt / conservative balance sheet",
  "Growing revenues",
  "Management aligned",
];

const STATUS_OPTIONS = ["watchlist", "buying", "hold", "sold", "pass"] as const;

function PickCard({ pick }: { pick: Pick }) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const setChecklist = useSetChecklist();

  const toggleCheck = async (index: number) => {
    const updated = [...(pick.checklist ?? Array(CHECKLIST_LABELS.length).fill(false))];
    updated[index] = !updated[index];
    await setChecklist.mutateAsync({ id: pick.id, checklist: updated });
  };

  const checklist = pick.checklist ?? Array(CHECKLIST_LABELS.length).fill(false);
  const passed = checklist.filter(Boolean).length;

  return (
    <View style={[cardStyles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <TouchableOpacity
        style={cardStyles.header}
        onPress={() => setExpanded((e) => !e)}
        accessibilityLabel={`${pick.company} research pick`}
      >
        <View style={cardStyles.headerLeft}>
          <View style={cardStyles.titleRow}>
            <Text style={[cardStyles.ticker, { color: colors.ink }]}>{pick.ticker}</Text>
            <View style={[cardStyles.statusChip, { borderColor: colors.border }]}>
              <Text style={[cardStyles.statusText, { color: colors.inkMuted }]}>{pick.status}</Text>
            </View>
          </View>
          <Text style={[cardStyles.company, { color: colors.inkMuted }]}>{pick.company}</Text>
          <Text style={[cardStyles.meta, { color: colors.inkFaint }]}>
            Week {pick.week} · {pick.sector} · {passed}/{CHECKLIST_LABELS.length} checks
          </Text>
        </View>
        <Text style={[cardStyles.chevron, { color: colors.inkFaint }]}>
          {expanded ? "∧" : "∨"}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={[cardStyles.body, { borderTopColor: colors.border }]}>
          {/* Key metrics */}
          <View style={cardStyles.metricsRow}>
            <View style={cardStyles.metric}>
              <Text style={[cardStyles.metricLabel, { color: colors.inkMuted }]}>ROIC</Text>
              <Text style={[cardStyles.metricValue, { color: colors.ink }]}>{pick.roic}%</Text>
            </View>
            <View style={cardStyles.metric}>
              <Text style={[cardStyles.metricLabel, { color: colors.inkMuted }]}>P/E</Text>
              <Text style={[cardStyles.metricValue, { color: colors.ink }]}>{pick.pe}x</Text>
            </View>
            <View style={cardStyles.metric}>
              <Text style={[cardStyles.metricLabel, { color: colors.inkMuted }]}>FCF+</Text>
              <Text style={[cardStyles.metricValue, { color: pick.fcfPositive ? tokens.colors.positive : tokens.colors.negative }]}>
                {pick.fcfPositive ? "Yes" : "No"}
              </Text>
            </View>
            <View style={cardStyles.metric}>
              <Text style={[cardStyles.metricLabel, { color: colors.inkMuted }]}>Low debt</Text>
              <Text style={[cardStyles.metricValue, { color: pick.lowDebt ? tokens.colors.positive : tokens.colors.negative }]}>
                {pick.lowDebt ? "Yes" : "No"}
              </Text>
            </View>
          </View>

          {/* Moat */}
          {pick.moat ? (
            <View style={cardStyles.thesis}>
              <Text style={[cardStyles.thesisLabel, { color: colors.inkMuted }]}>Moat</Text>
              <Text style={[cardStyles.thesisText, { color: colors.ink }]}>{pick.moat}</Text>
            </View>
          ) : null}

          {/* Thesis */}
          {pick.thesis ? (
            <View style={cardStyles.thesis}>
              <Text style={[cardStyles.thesisLabel, { color: colors.inkMuted }]}>Thesis</Text>
              <Text style={[cardStyles.thesisText, { color: colors.ink }]}>{pick.thesis}</Text>
            </View>
          ) : null}

          {/* Checklist */}
          <View style={cardStyles.checklistSection}>
            <Text style={[cardStyles.thesisLabel, { color: colors.inkMuted }]}>Checklist</Text>
            {CHECKLIST_LABELS.map((label, i) => (
              <TouchableOpacity
                key={i}
                style={cardStyles.checkItem}
                onPress={() => toggleCheck(i)}
                accessibilityLabel={label}
                accessibilityState={{ checked: checklist[i] }}
              >
                <View style={[
                  cardStyles.checkbox,
                  { borderColor: colors.border },
                  checklist[i] && { backgroundColor: colors.ink, borderColor: colors.ink },
                ]}>
                  {checklist[i] && (
                    <Text style={{ color: colors.bg, fontSize: 10, fontWeight: "700" }}>✓</Text>
                  )}
                </View>
                <Text style={[cardStyles.checkLabel, { color: colors.ink }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    marginHorizontal: tokens.spacing.md,
    marginBottom: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: tokens.spacing.md,
  },
  headerLeft: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: tokens.spacing.sm },
  ticker: { fontSize: tokens.fontSize.lg, fontWeight: "500" },
  statusChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
  },
  statusText: { fontSize: tokens.fontSize.xs },
  company: { fontSize: tokens.fontSize.sm, marginTop: 2 },
  meta: { fontSize: tokens.fontSize.xs, marginTop: 2 },
  chevron: { fontSize: tokens.fontSize.md, marginLeft: tokens.spacing.sm },
  body: { borderTopWidth: 1, padding: tokens.spacing.md },
  metricsRow: { flexDirection: "row", gap: tokens.spacing.sm, marginBottom: tokens.spacing.sm },
  metric: { flex: 1 },
  metricLabel: { fontSize: tokens.fontSize.xs },
  metricValue: { fontSize: tokens.fontSize.sm, fontWeight: "500", marginTop: 2 },
  thesis: { marginBottom: tokens.spacing.sm },
  thesisLabel: {
    fontSize: tokens.fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  thesisText: { fontSize: tokens.fontSize.sm, lineHeight: 20 },
  checklistSection: { marginTop: tokens.spacing.xs },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: tokens.spacing.sm,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  checkLabel: { fontSize: tokens.fontSize.sm, flex: 1 },
});

function AddPickModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const upsert = useUpsertResearchPick();
  const [company, setCompany] = useState("");
  const [ticker, setTicker] = useState("");
  const [sector, setSector] = useState("");
  const [moat, setMoat] = useState("");
  const [roic, setRoic] = useState("");
  const [pe, setPe] = useState("");
  const [fcfPositive, setFcfPositive] = useState(false);
  const [lowDebt, setLowDebt] = useState(false);
  const [thesis, setThesis] = useState("");
  const [status, setStatus] = useState<string>("watchlist");
  const [addedDate, setAddedDate] = useState(new Date().toISOString().split("T")[0]);
  const [week, setWeek] = useState(String(Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 604800000)));

  const reset = () => {
    setCompany(""); setTicker(""); setSector(""); setMoat(""); setRoic(""); setPe("");
    setFcfPositive(false); setLowDebt(false); setThesis(""); setStatus("watchlist");
    setAddedDate(new Date().toISOString().split("T")[0]);
  };

  const handleAdd = async () => {
    if (!company || !ticker) { Alert.alert("Missing fields", "Company and ticker are required."); return; }
    try {
      await upsert.mutateAsync({
        company,
        ticker: ticker.toUpperCase(),
        sector,
        moat,
        roic: roic ? parseFloat(roic) : 0,
        pe: pe ? parseFloat(pe) : 0,
        fcfPositive,
        lowDebt,
        thesis,
        status,
        addedDate,
        week: parseInt(week) || 1,
      });
      reset(); onClose();
    } catch (e: any) { Alert.alert("Error", e?.message ?? "Failed to save pick"); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView style={[styles.modal, { backgroundColor: colors.bg }]} contentContainerStyle={styles.modalContent}>
        <Text style={[styles.modalTitle, { color: colors.ink }]}>Add Research Pick</Text>

        <Text style={[styles.label, { color: colors.inkMuted }]}>Company *</Text>
        <TextInput style={[styles.input, { borderColor: colors.border, color: colors.ink, backgroundColor: colors.surface }]}
          value={company} onChangeText={setCompany} placeholder="e.g. Apple Inc." placeholderTextColor={colors.inkFaint} />

        <Text style={[styles.label, { color: colors.inkMuted }]}>Ticker *</Text>
        <TextInput style={[styles.input, { borderColor: colors.border, color: colors.ink, backgroundColor: colors.surface }]}
          value={ticker} onChangeText={(v) => setTicker(v.toUpperCase())} placeholder="e.g. AAPL" placeholderTextColor={colors.inkFaint} autoCapitalize="characters" />

        <Text style={[styles.label, { color: colors.inkMuted }]}>Sector</Text>
        <TextInput style={[styles.input, { borderColor: colors.border, color: colors.ink, backgroundColor: colors.surface }]}
          value={sector} onChangeText={setSector} placeholder="e.g. Technology" placeholderTextColor={colors.inkFaint} />

        <Text style={[styles.label, { color: colors.inkMuted }]}>Moat</Text>
        <TextInput style={[styles.input, { borderColor: colors.border, color: colors.ink, backgroundColor: colors.surface }]}
          value={moat} onChangeText={setMoat} placeholder="Competitive advantage…" placeholderTextColor={colors.inkFaint} />

        <Text style={[styles.label, { color: colors.inkMuted }]}>ROIC (%)</Text>
        <TextInput style={[styles.input, { borderColor: colors.border, color: colors.ink, backgroundColor: colors.surface }]}
          value={roic} onChangeText={setRoic} keyboardType="decimal-pad" placeholder="e.g. 22.5" placeholderTextColor={colors.inkFaint} />

        <Text style={[styles.label, { color: colors.inkMuted }]}>P/E</Text>
        <TextInput style={[styles.input, { borderColor: colors.border, color: colors.ink, backgroundColor: colors.surface }]}
          value={pe} onChangeText={setPe} keyboardType="decimal-pad" placeholder="e.g. 18.5" placeholderTextColor={colors.inkFaint} />

        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: colors.inkMuted, marginBottom: 0 }]}>FCF Positive</Text>
          <Switch value={fcfPositive} onValueChange={setFcfPositive} trackColor={{ false: colors.border, true: colors.ink }} />
        </View>
        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: colors.inkMuted, marginBottom: 0 }]}>Low Debt</Text>
          <Switch value={lowDebt} onValueChange={setLowDebt} trackColor={{ false: colors.border, true: colors.ink }} />
        </View>

        <Text style={[styles.label, { color: colors.inkMuted }]}>Status</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: tokens.spacing.xs }}>
            {STATUS_OPTIONS.map((s) => (
              <TouchableOpacity key={s}
                style={[styles.statusOption, { borderColor: colors.border }, status === s && { backgroundColor: colors.ink }]}
                onPress={() => setStatus(s)}>
                <Text style={{ color: status === s ? colors.bg : colors.inkMuted, fontSize: tokens.fontSize.xs }}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text style={[styles.label, { color: colors.inkMuted }]}>Thesis</Text>
        <TextInput style={[styles.textarea, { borderColor: colors.border, color: colors.ink, backgroundColor: colors.surface }]}
          value={thesis} onChangeText={setThesis} multiline numberOfLines={4} placeholder="Investment thesis…" placeholderTextColor={colors.inkFaint} />

        <Text style={[styles.label, { color: colors.inkMuted }]}>Added date</Text>
        <TextInput style={[styles.input, { borderColor: colors.border, color: colors.ink, backgroundColor: colors.surface }]}
          value={addedDate} onChangeText={setAddedDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.inkFaint} />

        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.ink }]} onPress={handleAdd} disabled={upsert.isPending}>
          <Text style={[styles.submitBtnText, { color: colors.bg }]}>{upsert.isPending ? "Saving…" : "Add Pick"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={[styles.cancelText, { color: colors.inkMuted }]}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}

export default function ResearchScreen() {
  const { colors } = useTheme();
  const [showAdd, setShowAdd] = useState(false);
  const { data: picks, isLoading, refetch } = useResearch();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.ink} />}
        contentContainerStyle={{ paddingVertical: tokens.spacing.md, paddingBottom: 100 }}
      >
        {picks?.map((pick) => <PickCard key={pick.id} pick={pick} />)}
        {!isLoading && (!picks || picks.length === 0) && (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: colors.ink }]}>No research picks yet</Text>
            <Text style={[styles.emptyBody, { color: colors.inkMuted }]}>
              Tap + to add your first watchlist entry
            </Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.ink }]}
        onPress={() => setShowAdd(true)}
        accessibilityLabel="Add research pick"
      >
        <Text style={[styles.fabText, { color: colors.bg }]}>+</Text>
      </TouchableOpacity>

      <AddPickModal visible={showAdd} onClose={() => setShowAdd(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { padding: tokens.spacing.xl, alignItems: "center" },
  emptyTitle: { fontSize: tokens.fontSize.lg, fontWeight: "500", marginBottom: tokens.spacing.sm },
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
  modal: { flex: 1 },
  modalContent: { padding: tokens.spacing.lg },
  modalTitle: { fontSize: tokens.fontSize.xl, fontWeight: "500", marginBottom: tokens.spacing.lg },
  label: { fontSize: tokens.fontSize.sm, marginBottom: tokens.spacing.xs, marginTop: tokens.spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 10,
    fontSize: tokens.fontSize.md,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: tokens.radius.sm,
    padding: tokens.spacing.sm,
    fontSize: tokens.fontSize.sm,
    minHeight: 80,
    textAlignVertical: "top",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: tokens.spacing.sm,
  },
  statusOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
  },
  submitBtn: { paddingVertical: 16, borderRadius: tokens.radius.sm, alignItems: "center", marginTop: tokens.spacing.lg },
  submitBtnText: { fontSize: tokens.fontSize.md, fontWeight: "500" },
  cancelBtn: { paddingVertical: 14, alignItems: "center" },
  cancelText: { fontSize: tokens.fontSize.md },
});
