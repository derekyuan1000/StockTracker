import { dir, fmtPct } from "@stocktracker/shared";
import { useTheme } from "@/theme/ThemeProvider";
import { Num } from "./Typography";
import type { TextProps } from "react-native";

/** Colours a percentage green/red/muted using the same `dir()` token the web's `dirClass` uses. */
export function PctText({
  value,
  digits = 1,
  style,
  ...props
}: TextProps & { value: number | null; digits?: number }) {
  const { t } = useTheme();
  if (value == null) {
    return (
      <Num {...props} style={[{ color: t.textMuted }, style]}>
        —
      </Num>
    );
  }
  const color = { up: t.up, down: t.down, flat: t.textMutedStrong }[dir(value)];
  return (
    <Num {...props} style={[{ color }, style]}>
      {fmtPct(value, digits)}
    </Num>
  );
}
