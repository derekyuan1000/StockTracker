import { TextInput, View, type TextInputProps } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";
import { Muted } from "./Typography";

export function TextField({
  label,
  style,
  ...props
}: TextInputProps & { label?: string }) {
  const { t } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label ? <Muted size={11}>{label}</Muted> : null}
      <TextInput
        placeholderTextColor={t.textMuted}
        {...props}
        style={[
          {
            borderWidth: 1,
            borderColor: t.hairline,
            backgroundColor: t.surfaceElevated,
            borderRadius: radius.sm,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: t.textBody,
            fontSize: 15,
          },
          style,
        ]}
      />
    </View>
  );
}
