export const tokens = {
  colors: {
    bg: "#F2EFE7",
    surface: "#EDEAE2",
    ink: "#1C1B18",
    inkMuted: "#6B6860",
    inkFaint: "#A8A59E",
    border: "#D4D0C8",
    positive: "#1A7F3C",
    negative: "#B91C1C",
    accent: "#2563EB",
    bgDark: "#1C1B18",
    surfaceDark: "#2A2924",
    inkDark: "#F2EFE7",
    inkMutedDark: "#A8A59E",
    borderDark: "#3A3830",
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 4,
    md: 8,
    lg: 12,
  },
  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 24,
    xxl: 32,
    hero: 40,
  },
  fontWeight: {
    regular: "400" as const,
    medium: "500" as const,
  },
} as const;

export type ColorScheme = "light" | "dark";
