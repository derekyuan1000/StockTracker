import type React from "react";

export { CHART_COLORS, PALETTE, SECTOR_COLORS, getSectorColor } from "@stocktracker/shared";

export const CHART_TOOLTIP_STYLE: React.CSSProperties = {
  background: "var(--surface-card)",
  border: "1px solid var(--hairline)",
  borderRadius: 4,
  fontSize: 13,
  fontFamily: "JetBrains Mono",
  boxShadow: "none",
};

export const CHART_TOOLTIP_LABEL: React.CSSProperties = {
  color: "var(--text-strong)",
  fontSize: 11,
};

export const CHART_TOOLTIP_ITEM: React.CSSProperties = {
  color: "var(--text-body)",
};
