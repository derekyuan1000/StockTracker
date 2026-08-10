import { View, type ViewProps } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";

export function Card({ style, ...props }: ViewProps) {
  const { t } = useTheme();
  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: t.surfaceCard,
          borderWidth: 1,
          borderColor: t.hairline,
          borderRadius: radius.sm,
          padding: 16,
        },
        style,
      ]}
    />
  );
}

export function Row({ style, ...props }: ViewProps) {
  return (
    <View
      {...props}
      style={[{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, style]}
    />
  );
}

export function Hairline(props: ViewProps) {
  const { t } = useTheme();
  return <View {...props} style={[{ height: 1, backgroundColor: t.hairline }, props.style]} />;
}
