import { Text, type TextProps } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { num, numMedium, eyebrow as eyebrowStyle, body, bodyMedium, heading } from "@/theme/text";

/** `.num` — tabular-nums monospace, for prices/quantities. Mirrors web's `<span className="num">`. */
export function Num({ style, medium, ...props }: TextProps & { medium?: boolean }) {
  const { t } = useTheme();
  return <Text {...props} style={[medium ? numMedium : num, { color: t.numColor }, style]} />;
}

/** `.eyebrow` — small uppercase mono label above a heading. */
export function Eyebrow({ style, ...props }: TextProps) {
  const { t } = useTheme();
  return <Text {...props} style={[eyebrowStyle, { color: t.textMuted }, style]} />;
}

export function Heading({
  level = 3,
  style,
  ...props
}: TextProps & { level?: 1 | 2 | 3 | 4 | 5 | 6 }) {
  const { t } = useTheme();
  const size = { 1: 32, 2: 26, 3: 20, 4: 17, 5: 15, 6: 13 }[level];
  return <Text {...props} style={[heading(size, level), { color: t.textStrong }, style]} />;
}

export function Body({
  size = 14,
  medium,
  style,
  ...props
}: TextProps & { size?: number; medium?: boolean }) {
  const { t } = useTheme();
  return (
    <Text
      {...props}
      style={[medium ? bodyMedium(size) : body(size), { color: t.textBody }, style]}
    />
  );
}

export function Muted({ size = 13, style, ...props }: TextProps & { size?: number }) {
  const { t } = useTheme();
  return <Text {...props} style={[body(size), { color: t.textMuted }, style]} />;
}
