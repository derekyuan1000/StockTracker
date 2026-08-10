import type { TextStyle } from "react-native";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from "@expo-google-fonts/jetbrains-mono";

// RN `letterSpacing` is absolute points, not em — every `tracking-[Xem]` value
// from the web must be multiplied by its font size. This is the single most
// common porting bug, hence a helper rather than hardcoding constants.
const emToPt = (em: number, fontSize: number) => em * fontSize;

const FONT = {
  interRegular: "Inter_400Regular",
  interMedium: "Inter_500Medium",
  interSemiBold: "Inter_600SemiBold",
  monoRegular: "JetBrainsMono_400Regular",
  monoMedium: "JetBrainsMono_500Medium",
};

/** Pass directly to `useFonts()` in the root layout. */
export const fontsToLoad = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
};

/** `.num` — tabular-nums monospace, used for every price/quantity value. */
export const num: TextStyle = {
  fontFamily: FONT.monoRegular,
  fontVariant: ["tabular-nums"],
};

export const numMedium: TextStyle = {
  fontFamily: FONT.monoMedium,
  fontVariant: ["tabular-nums"],
};

/** `.eyebrow` — 11px / 500 / uppercase / 0.05em tracking mono label. */
export const eyebrow: TextStyle = {
  fontFamily: FONT.monoMedium,
  textTransform: "uppercase",
  fontSize: 11,
  lineHeight: 11,
  letterSpacing: emToPt(0.05, 11),
};

/** `.mono-caps` — uppercase mono at 0.05em tracking, size supplied by caller. */
export const monoCaps = (fontSize: number): TextStyle => ({
  fontFamily: FONT.monoMedium,
  textTransform: "uppercase",
  fontSize,
  letterSpacing: emToPt(0.05, fontSize),
});

/** Display headings — negative tracking scales down from h1 to h6, per DESIGN.md. */
export const heading = (fontSize: number, level: 1 | 2 | 3 | 4 | 5 | 6 = 3): TextStyle => {
  const trackingEm = level === 1 ? -0.03 : level === 2 ? -0.025 : level <= 4 ? -0.02 : -0.015;
  return {
    fontFamily: FONT.interMedium,
    fontSize,
    letterSpacing: emToPt(trackingEm, fontSize),
  };
};

/** Body text — Inter at -0.01em tracking (web's global html/body rule). */
export const body = (fontSize = 14): TextStyle => ({
  fontFamily: FONT.interRegular,
  fontSize,
  letterSpacing: emToPt(-0.01, fontSize),
});

export const bodyMedium = (fontSize = 14): TextStyle => ({
  fontFamily: FONT.interMedium,
  fontSize,
  letterSpacing: emToPt(-0.01, fontSize),
});
