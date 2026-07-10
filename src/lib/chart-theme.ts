import type React from "react";

export const CHART_COLORS = {
  periwinkle: "#bdbbff",
  orange: "#fc4c02",
  magenta: "#ef2cc1",
  mint: "#c8f6f9",
  violet: "#a78bfa",
  sky: "#60a5fa",
  rose: "#f472b6",
  emerald: "#34d399",
  amber: "#fbbf24",
  cyan: "#22d3ee",
  red: "#f87171",
  indigo: "#818cf8",
} as const;

export const PALETTE = Object.values(CHART_COLORS);

export const SECTOR_COLORS: Record<string, string> = {
  Technology: CHART_COLORS.rose,
  Tech: CHART_COLORS.rose,
  Healthcare: CHART_COLORS.emerald,
  Financial: CHART_COLORS.cyan,
  "Financial Services": CHART_COLORS.cyan,
  Banking: CHART_COLORS.cyan,
  Industrial: CHART_COLORS.sky,
  Consumer: CHART_COLORS.red,
  Defence: CHART_COLORS.indigo,
  Infrastructure: CHART_COLORS.emerald,
  Pharma: CHART_COLORS.periwinkle,
  Fund: CHART_COLORS.periwinkle,
  ETF: CHART_COLORS.violet,
  MUTUALFUND: CHART_COLORS.violet,
  Bond: CHART_COLORS.orange,
  BOND: CHART_COLORS.orange,
  Gilt: CHART_COLORS.orange,
  Future: CHART_COLORS.amber,
  FUTURE: CHART_COLORS.amber,
  Other: "#9ca3af",
};

export function getSectorColor(sector: string, index = 0): string {
  return SECTOR_COLORS[sector] ?? PALETTE[index % PALETTE.length];
}

export const CHART_TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "var(--surface-card)",
  border: "1px solid var(--hairline)",
  borderRadius: 4,
  fontSize: 12,
  color: "var(--text-body)",
};
