import { Pressable, ActivityIndicator, type PressableProps } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";
import { Body } from "./Typography";

type Variant = "primary" | "ghost" | "danger";

export function Button({
  title,
  variant = "primary",
  loading = false,
  disabled,
  style,
  ...props
}: PressableProps & { title: string; variant?: Variant; loading?: boolean }) {
  const { t } = useTheme();
  const isDisabled = disabled || loading;

  const bg = {
    primary: isDisabled ? t.primaryDisabled : t.primary,
    ghost: "transparent",
    danger: t.down,
  }[variant];
  const fg = {
    primary: t.onPrimary,
    ghost: t.textBody,
    danger: "#ffffff",
  }[variant];
  const border = variant === "ghost" ? { borderWidth: 1, borderColor: t.hairline } : null;

  return (
    <Pressable
      disabled={isDisabled}
      {...props}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderRadius: radius.sm,
          paddingVertical: 12,
          paddingHorizontal: 20,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.8 : 1,
        },
        border,
        typeof style === "function" ? style({ pressed }) : style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Body medium size={15} style={{ color: fg }}>
          {title}
        </Body>
      )}
    </Pressable>
  );
}
