import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import type { WidgetSummary, PeriodReturn } from "./widgetTaskHandler";

type H = `#${string}`;
const C: Record<string, H> = {
  canvas: "#2A2A2A",
  surface: "#2A2823",
  textStrong: "#F2EFE7",
  textMuted: "#A39E93",
  up: "#5FA97C",
  down: "#C96A5E",
  flat: "#C4BFB5",
};

function signColor(val: number): H {
  if (val > 0) return C.up;
  if (val < 0) return C.down;
  return C.flat;
}

function fmtGBP(value: number): string {
  return `£${Math.abs(value).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(pct: number): string {
  const sign = pct >= 0 ? "+" : "−";
  return `${sign}${Math.abs(pct).toFixed(2)}%`;
}

function fmtChange(gbp: number): string {
  const sign = gbp >= 0 ? "+" : "−";
  return `${sign}${fmtGBP(gbp)}`;
}

function PeriodRow({ label, pct, gbp }: { label: string; pct: number | null; gbp: number | null }) {
  const color = pct != null ? signColor(pct) : C.textMuted;
  return (
    <FlexWidget
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: C.surface,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 11,
        width: "match_parent",
      }}
    >
      <TextWidget text={label} style={{ fontSize: 11, color: C.textMuted, fontWeight: "500" }} />
      <FlexWidget style={{ flexDirection: "row", alignItems: "center" }}>
        <TextWidget
          text={gbp != null ? fmtChange(gbp) : "–"}
          style={{ fontSize: 11, color: C.textMuted, marginRight: 8 }}
        />
        <TextWidget
          text={pct != null ? fmtPct(pct) : "–"}
          style={{ fontSize: 13, color, fontWeight: "600" }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

export type WidgetData = {
  summary: WidgetSummary;
  returns: PeriodReturn[];
};

function getPeriodData(key: string, data: WidgetData): { pct: number | null; gbp: number | null } {
  if (key === "All") return { pct: data.summary.lifetimePct, gbp: data.summary.lifetimeGBP };
  if (key === "1D") return { pct: data.summary.dayChangePct, gbp: data.summary.dayChangeGBP };
  const ret = data.returns.find((r) => r.period === key);
  return { pct: ret?.pct ?? null, gbp: ret?.gbp ?? null };
}

export function PortfolioWidget({
  data,
  period1 = "1M",
  period2 = "All",
}: {
  data: WidgetData | null;
  period1?: string;
  period2?: string;
}) {
  const dayColor = data ? signColor(data.summary.dayChangeGBP) : C.flat;

  return (
    <FlexWidget
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: C.canvas,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: C.surface,
      }}
    >
      {/* Balance */}
      <FlexWidget style={{ flexDirection: "column", width: "match_parent", alignItems: "center" }}>
        <TextWidget
          text={
            data
              ? `£${data.summary.totalGBP.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "—"
          }
          style={{ fontSize: 26, color: C.textStrong, fontWeight: "bold", textAlign: "center" }}
          maxLines={1}
        />
        <TextWidget
          text={
            data
              ? `${fmtChange(data.summary.dayChangeGBP)}  ${fmtPct(data.summary.dayChangePct)}  today`
              : "Sign in to the app"
          }
          style={{
            fontSize: 12,
            color: data ? dayColor : C.textMuted,
            marginTop: 3,
            textAlign: "center",
          }}
          maxLines={1}
        />
      </FlexWidget>

      {/* Period rows */}
      <FlexWidget style={{ flexDirection: "column", gap: 7, width: "match_parent" }}>
        <PeriodRow
          label={period1}
          pct={data ? getPeriodData(period1, data).pct : null}
          gbp={data ? getPeriodData(period1, data).gbp : null}
        />
        <PeriodRow
          label={period2}
          pct={data ? getPeriodData(period2, data).pct : null}
          gbp={data ? getPeriodData(period2, data).gbp : null}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
