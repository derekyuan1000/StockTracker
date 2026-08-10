import { useState } from "react";
import { View, FlatList, Alert } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { ArrowDownCircle, ArrowUpCircle, Trash2 } from "lucide-react-native";
import { fmtGBP } from "@stocktracker/shared";
import { AddCashFlowSchema } from "@stocktracker/api-contracts";
import {
  useCashFlows,
  useAddCashFlow,
  useDeleteCashFlow,
  useSetCashBalance,
} from "@/api/queries";
import type { CashFlow } from "@/api/endpoints";
import { useTheme } from "@/theme/ThemeProvider";
import { Screen } from "@/components/Screen";
import { Card, Hairline, Row } from "@/components/Card";
import { Heading, Body, Muted, Num } from "@/components/Typography";
import { Button } from "@/components/Button";
import { BottomSheet } from "@/components/BottomSheet";
import { TextField } from "@/components/TextField";
import { EmptyState } from "@/components/EmptyState";
import { CardSkeleton } from "@/components/Skeleton";
import { radius } from "@/theme/tokens";

type SheetMode = "deposit" | "withdraw" | "balance" | null;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function FlowRow({ flow, onDelete }: { flow: CashFlow; onDelete: () => void }) {
  const { t } = useTheme();
  const isDeposit = flow.type === "deposit";

  return (
    <Swipeable
      renderRightActions={() => (
        <View
          style={{
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: t.down,
            width: 72,
          }}
        >
          <Trash2 color="#fff" size={18} onPress={onDelete} />
        </View>
      )}
    >
      <View style={{ backgroundColor: t.surfaceCard }}>
        <Row style={{ paddingVertical: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
            {isDeposit ? (
              <ArrowDownCircle color={t.up} size={20} />
            ) : (
              <ArrowUpCircle color={t.down} size={20} />
            )}
            <View>
              <Body medium size={14}>
                {isDeposit ? "Deposit" : "Withdrawal"}
              </Body>
              <Muted size={11}>
                {flow.date}
                {flow.note ? ` · ${flow.note}` : ""}
              </Muted>
            </View>
          </View>
          <Num medium style={{ color: isDeposit ? t.up : t.down }}>
            {isDeposit ? "+" : "−"}
            {fmtGBP(flow.amountGBP)}
          </Num>
        </Row>
      </View>
    </Swipeable>
  );
}

export default function CashScreen() {
  const { t } = useTheme();
  const { data, isLoading } = useCashFlows();
  const addFlow = useAddCashFlow();
  const deleteFlow = useDeleteCashFlow();
  const setBalance = useSetCashBalance();

  const [sheet, setSheet] = useState<SheetMode>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const flows = data?.flows ?? [];
  const cashGBP = data?.cashGBP ?? 0;

  function closeSheet() {
    setSheet(null);
    setAmount("");
    setNote("");
    setError(null);
  }

  async function handleSubmit() {
    setError(null);
    const numeric = parseFloat(amount);

    if (sheet === "balance") {
      if (isNaN(numeric)) return setError("Enter a valid amount");
      await setBalance.mutateAsync(numeric);
      closeSheet();
      return;
    }

    const parsed = AddCashFlowSchema.safeParse({
      type: sheet === "deposit" ? "deposit" : "withdrawal",
      amountGBP: numeric,
      note,
      date: todayISO(),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    await addFlow.mutateAsync(parsed.data);
    closeSheet();
  }

  function confirmDelete(flow: CashFlow) {
    Alert.alert(
      "Delete cash flow?",
      `${flow.type === "deposit" ? "Deposit" : "Withdrawal"} of ${fmtGBP(flow.amountGBP)} on ${flow.date}`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteFlow.mutate(flow.id) },
      ],
    );
  }

  const busy = addFlow.isPending || setBalance.isPending;

  return (
    <Screen scroll={!sheet}>
      <Heading level={1} style={{ marginBottom: 16 }}>
        Cash
      </Heading>

      <Card style={{ marginBottom: 16, alignItems: "center", paddingVertical: 24 }}>
        <Muted size={11} style={{ textTransform: "uppercase", letterSpacing: 0.8 }}>
          Cash balance
        </Muted>
        <Num medium style={{ fontSize: 32, marginTop: 6 }}>
          {fmtGBP(cashGBP)}
        </Num>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 16, width: "100%" }}>
          <View style={{ flex: 1 }}>
            <Button title="Deposit" onPress={() => setSheet("deposit")} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Withdraw" variant="ghost" onPress={() => setSheet("withdraw")} />
          </View>
        </View>
        <Body
          medium
          size={12}
          onPress={() => setSheet("balance")}
          style={{ marginTop: 12, color: t.textMuted }}
        >
          Set balance directly
        </Body>
      </Card>

      {isLoading ? (
        <CardSkeleton height={160} />
      ) : !flows.length ? (
        <EmptyState icon="💷" title="No cash flows yet" subtitle="Add a deposit to get started." />
      ) : (
        <Card style={{ padding: 0, paddingHorizontal: 16, overflow: "hidden" }}>
          <FlatList
            data={flows}
            keyExtractor={(f) => String(f.id)}
            scrollEnabled={false}
            ItemSeparatorComponent={Hairline}
            renderItem={({ item }) => <FlowRow flow={item} onDelete={() => confirmDelete(item)} />}
          />
        </Card>
      )}

      <BottomSheet visible={!!sheet} onClose={closeSheet}>
        <Heading level={3} style={{ marginBottom: 16 }}>
          {sheet === "deposit" ? "Add deposit" : sheet === "withdraw" ? "Add withdrawal" : "Set balance"}
        </Heading>

        <View style={{ gap: 12 }}>
          <TextField
            label={sheet === "balance" ? "New balance (£)" : "Amount (£)"}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            autoFocus
          />
          {sheet !== "balance" ? (
            <TextField label="Note (optional)" value={note} onChangeText={setNote} placeholder="e.g. Salary" />
          ) : null}
          {error ? (
            <Body size={12} style={{ color: t.down }}>
              {error}
            </Body>
          ) : null}
          <Button
            title={busy ? "Saving…" : "Save"}
            onPress={handleSubmit}
            loading={busy}
            style={{ marginTop: 4 }}
          />
        </View>
      </BottomSheet>
    </Screen>
  );
}
