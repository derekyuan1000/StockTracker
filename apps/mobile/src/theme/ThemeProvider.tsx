import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import * as SystemUI from "expo-system-ui";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { dark, light, type ThemeTokens } from "./tokens";

export type Theme = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

const STORAGE_KEY = "st-theme"; // same key as web, for symmetry (not shared storage)

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  t: ThemeTokens;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
  t: light,
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme(); // reactive to OS changes — RN's `matchMedia` equivalent
  const [theme, setThemeState] = useState<Theme>("system");
  const [hydrated, setHydrated] = useState(false);

  // Seed from AsyncStorage on mount (mirrors web's localStorage-first read).
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === "light" || stored === "dark" || stored === "system") {
          setThemeState(stored);
        }
      })
      .finally(() => setHydrated(true));
  }, []);

  const resolvedTheme: ResolvedTheme =
    theme === "system" ? (systemScheme === "dark" ? "dark" : "light") : theme;
  const t = resolvedTheme === "dark" ? dark : light;

  useEffect(() => {
    if (!hydrated) return;
    SystemUI.setBackgroundColorAsync(t.canvas).catch(() => {});
  }, [hydrated, t.canvas]);

  function setTheme(next: Theme) {
    setThemeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, t }),
    [theme, resolvedTheme, t],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
