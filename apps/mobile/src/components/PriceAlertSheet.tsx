import { useState } from "react";
import { View, Pressable } from "react-native";
import { Trash2 } from "lucide-react-native";
import { BottomSheet } from "@/components/BottomSheet";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { Body, Heading, Muted, Num } from "@/components/Typography";
import { Hairline, Row } from "@/components/Card";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";
import { useAlerts, useCreateAlert, useDeleteAlert } from "@/api/queries";
import { haptic } from "@/haptics";

/**
 * Create / list / delete price alerts for a single ticker. Mirrors the web
 * PriceAlertDialog. Prices are shown in the ticker's quote currency ("p" for GBp).
 */
export function PriceAlertSheet({
  visible,
  onClose,
  ticker,
  lastPrice,
  currency,
}: {
  visible: boolean;
  onClose: () => void;
  ticker: string;
  lastPrice: number;
  currency: "GBp" | "GBP";
}) {
  const { t } = useTheme();
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [target, setTarget] = useState("");

  const { data: allAlerts = [] } = useAlerts(visible);
  const create = useCreateAlert();
  const remove = useDeleteAlert();

  const tickerAlerts = allAlerts.filter(
    (a) => a.ticker.toUpperCase() === ticker.toUpperCase() && a.active,
  );
  const unit = currency === "GBp" ? "p" : "£";
  const dp = currency === "GBp" ? 0 : 2;

  const parsed = parseFloat(target);
  const canAdd = !!target && !isNaN(parsed) && parsed > 0 && !create.isPending;

  function add() {
    if (!canAdd) return;
    create.mutate(
      { ticker, direction, targetPrice: parsed },
      {
        onSuccess: () => {
          setTarget("");
          haptic.success();
        },
      },
    );
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Heading level={2} style={{ marginBottom: 4 }}>
        Price alerts — {ticker.toUpperCase()}
      </Heading>
      <Muted size={12} style={{ marginBottom: 16 }}>
        Current: {unit}
        {lastPrice.toFixed(dp)}
      </Muted>

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        {(["above", "below"] as const).map((d) => (
          <Pressable
            key={d}
            onPress={() => setDirection(d)}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: direction === d ? t.brandPeriwinkle : t.hairline,
              backgroundColor: direction === d ? t.brandPeriwinkle + "1A" : "transparent",
              borderRadius: radius.sm,
              paddingVertical: 10,
              alignItems: "center",
            }}
          >
            <Body
              medium
              size={12}
              style={{ textTransform: "uppercase", color: direction === d ? t.textStrong : t.textMuted }}
            >
              {d}
            </Body>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end", marginBottom: 16 }}>
        <View style={{ flex: 1 }}>
          <TextField
            placeholder={`Target price (${unit})`}
            keyboardType="numeric"
            value={target}
            onChangeText={setTarget}
          />
        </View>
        <Button title="Add" onPress={add} disabled={!canAdd} loading={create.isPending} />
      </View>

      {tickerAlerts.length > 0 && (
        <View>
          <Muted size={11} style={{ textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
            Active alerts
          </Muted>
          {tickerAlerts.map((a, i) => (
            <View key={a.id}>
              <Row style={{ paddingVertical: 10 }}>
                <Num style={{ fontSize: 13 }}>
                  {a.direction === "above" ? "↑" : "↓"} {unit}
                  {a.targetPrice.toFixed(dp)}
                </Num>
                <Pressable
                  onPress={() => {
                    remove.mutate(a.id);
                    haptic.selection();
                  }}
                  hitSlop={8}
                >
                  <Trash2 color={t.textMuted} size={16} />
                </Pressable>
              </Row>
              {i < tickerAlerts.length - 1 ? <Hairline /> : null}
            </View>
          ))}
        </View>
      )}
    </BottomSheet>
  );
}
