import { View, Pressable } from "react-native";
import { router } from "expo-router";
import { ArrowLeft, Trash2 } from "lucide-react-native";
import { useAlerts, useDeleteAlert } from "@/api/queries";
import { Screen } from "@/components/Screen";
import { Card, Hairline, Row } from "@/components/Card";
import { Body, Muted, Num } from "@/components/Typography";
import { EmptyState } from "@/components/EmptyState";
import { CardSkeleton } from "@/components/Skeleton";
import { useTheme } from "@/theme/ThemeProvider";
import { haptic } from "@/haptics";

export default function AlertsScreen() {
  const { t } = useTheme();
  const { data: alerts = [], isLoading } = useAlerts();
  const remove = useDeleteAlert();

  const active = alerts.filter((a) => a.active);

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft color={t.textBody} size={22} />
        </Pressable>
        <Body medium size={18}>
          Price alerts
        </Body>
      </View>

      {isLoading ? (
        <CardSkeleton height={160} />
      ) : !active.length ? (
        <EmptyState
          icon="🔔"
          title="No alerts"
          subtitle="Open a stock and tap the bell to set a price alert."
        />
      ) : (
        <Card style={{ padding: 0, paddingHorizontal: 16 }}>
          {active.map((a, i) => (
            <View key={a.id}>
              <Row style={{ paddingVertical: 14 }}>
                <View style={{ flex: 1 }}>
                  <Body
                    medium
                    size={13}
                    style={{ fontFamily: "JetBrainsMono_500Medium", textTransform: "uppercase" }}
                  >
                    {a.ticker}
                  </Body>
                  <Muted size={11} style={{ marginTop: 2 }}>
                    Notify when {a.direction} target
                  </Muted>
                </View>
                <Num style={{ fontSize: 13, marginRight: 14 }}>
                  {a.direction === "above" ? "↑" : "↓"} {a.targetPrice.toFixed(2)}
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
              {i < active.length - 1 ? <Hairline /> : null}
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
