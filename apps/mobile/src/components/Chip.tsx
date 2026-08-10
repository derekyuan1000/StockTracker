import { View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { monoCaps } from "@/theme/text";
import { Text } from "react-native";
import { radius } from "@/theme/tokens";

export function BuySellChip({ type }: { type: "buy" | "sell" }) {
  const { t } = useTheme();
  const color = type === "buy" ? t.up : t.down;
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: color + "26", // ~15% alpha, hex-alpha shorthand
        borderRadius: radius.sm,
        paddingHorizontal: 6,
        paddingVertical: 3,
      }}
    >
      <Text style={[monoCaps(10), { color }]}>{type}</Text>
    </View>
  );
}
