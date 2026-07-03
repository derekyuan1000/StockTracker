import { useColorScheme } from "react-native";
import { useSettingsStore } from "@/stores/settingsStore";
import { tokens } from "./tokens";

export function useTheme() {
  const systemScheme = useColorScheme();
  const { theme } = useSettingsStore();

  const effectiveScheme =
    theme === "system" ? (systemScheme ?? "light") : theme;
  const isDark = effectiveScheme === "dark";

  return {
    isDark,
    scheme: effectiveScheme as "light" | "dark",
    colors: {
      bg: isDark ? tokens.colors.bgDark : tokens.colors.bg,
      surface: isDark ? tokens.colors.surfaceDark : tokens.colors.surface,
      ink: isDark ? tokens.colors.inkDark : tokens.colors.ink,
      inkMuted: isDark ? tokens.colors.inkMutedDark : tokens.colors.inkMuted,
      border: isDark ? tokens.colors.borderDark : tokens.colors.border,
      positive: tokens.colors.positive,
      negative: tokens.colors.negative,
      accent: tokens.colors.accent,
      inkFaint: tokens.colors.inkFaint,
    },
    tokens,
  };
}
