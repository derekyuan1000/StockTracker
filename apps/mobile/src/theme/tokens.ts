// 1:1 transcription of the web design tokens in `src/styles.css` (:root / .dark).
// No interpretation — every value here should match the web app exactly.

export type ThemeTokens = {
  canvas: string;
  canvasDark: string;
  surfaceCard: string;
  surfaceElevated: string;
  surfaceDarkSoft: string;
  hairline: string;

  primary: string;
  primaryActive: string;
  primaryDisabled: string;
  onPrimary: string;

  onDark: string;
  onDarkMuted: string;

  accentMint: string;

  textStrong: string;
  textBody: string;
  textMuted: string;
  textMutedStrong: string;

  numColor: string;

  up: string;
  down: string;

  brandOrange: string;
  brandMagenta: string;
  brandPeriwinkle: string;
};

export const light: ThemeTokens = {
  canvas: "#f2f2f7",
  canvasDark: "#1C1B18",
  surfaceCard: "#ffffff",
  surfaceElevated: "#e8e8ed",
  surfaceDarkSoft: "#2A2823",
  hairline: "#d8d8de",

  primary: "#1a1a2e",
  primaryActive: "#0f0f1e",
  primaryDisabled: "#c8c8d0",
  onPrimary: "#ffffff",

  onDark: "#F2EFE7",
  onDarkMuted: "#A39E93",

  accentMint: "#c8f6f9",

  textStrong: "#000000",
  textBody: "#1c1c1e",
  textMuted: "#8a8a8e",
  textMutedStrong: "#48484a",

  numColor: "#1a1a2e",

  up: "#0a8f5f",
  down: "#d6455b",

  brandOrange: "#fc4c02",
  brandMagenta: "#ef2cc1",
  brandPeriwinkle: "#5856d6",
};

export const dark: ThemeTokens = {
  canvas: "#1C1B18",
  canvasDark: "#1C1B18",
  surfaceCard: "#2A2823",
  surfaceElevated: "#33312B",
  surfaceDarkSoft: "#2A2823",
  hairline: "rgba(242, 239, 231, 0.12)",

  primary: "#F2EFE7",
  primaryActive: "#E4DFD6",
  primaryDisabled: "#3A3830",
  onPrimary: "#1C1B18",

  onDark: "#F2EFE7",
  onDarkMuted: "#A39E93",

  accentMint: "#c8f6f9",

  textStrong: "#F2EFE7",
  textBody: "#D8D3CB",
  textMuted: "#A39E93",
  textMutedStrong: "#C4BFB5",

  numColor: "#ffffff",

  up: "#5FA97C",
  down: "#C96A5E",

  brandOrange: "#fc4c02",
  brandMagenta: "#ef2cc1",
  brandPeriwinkle: "#bdbbff",
};

/** Gradient stops for the brand gradient (DESIGN.md), used with expo-linear-gradient. */
export const brandGradient = {
  colors: ["#fc4c02", "#ef2cc1", "#bdbbff"] as const,
  locations: [0, 0.48, 1] as const,
  // ~100deg in CSS approximated as a start/end vector.
  start: { x: 0, y: 1 },
  end: { x: 1, y: 0 },
};

export const radius = {
  none: 0,
  xs: 3.25,
  sm: 4,
  md: 8,
  full: 9999,
};
