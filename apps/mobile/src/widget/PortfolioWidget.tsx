import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import type { WidgetSummary, PeriodReturn } from "./widgetTaskHandler";

// Widget colour tokens must satisfy HexColor = `#${string}`
type H = `#${string}`;
const C: Record<string, H> = {
  canvas: "#1C1B18",
  surface: "#2A2823",
  textStrong: "#F2EFE7",
  textMuted: "#A39E93",
  up: "#5FA97C",
  down: "#C96A5E",
  flat: "#C4BFB5",
  periwinkle: "#bdbbff",
  hairline: "#2A2823",
};

type PeriodKey = "1D" | "1W" | "YTD" | "1Y";
const PERIODS: PeriodKey[] = ["1D", "1W", "YTD", "1Y"];

function getPct(returns: PeriodReturn[], period: PeriodKey): string {
  const found = returns.find((r) => r.period === period);
  if (!found) return "–";
  const sign = found.pct >= 0 ? "+" : "";
  return `${sign}${found.pct.toFixed(1)}%`;
}

function getPctColor(returns: PeriodReturn[], period: PeriodKey): H {
  const found = returns.find((r) => r.period === period);
  if (!found) return C.textMuted as H;
  if (found.pct > 0) return C.up as H;
  if (found.pct < 0) return C.down as H;
  return C.flat as H;
}

function fmtGBP(value: number): string {
  return `£${value.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtSigned(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${fmtGBP(Math.abs(value))}`;
}

export type WidgetData = {
  summary: WidgetSummary;
  returns: PeriodReturn[];
};

export function PortfolioWidget({ data }: { data: WidgetData | null }) {
  const dayColor =
    data && data.summary.dayChangeGBP > 0
      ? C.up
      : data && data.summary.dayChangeGBP < 0
        ? C.down
        : C.flat;

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
      {/* Header label */}
      <TextWidget
        text="STOCKTRACKER"
        style={{
          fontSize: 9,
          color: C.textMuted,
          fontWeight: "500",
          letterSpacing: 1,
        }}
      />

      {/* Balance block */}
      <FlexWidget style={{ flexDirection: "column" }}>
        <TextWidget
          text={data ? fmtGBP(data.summary.totalGBP) : "—"}
          style={{
            fontSize: 22,
            color: C.textStrong as H,
            fontWeight: "bold",
          }}
          maxLines={1}
        />
        <TextWidget
          text={
            data
              ? `${fmtSigned(data.summary.dayChangeGBP)} (${data.summary.dayChangePct >= 0 ? "+" : ""}${data.summary.dayChangePct.toFixed(2)}%) today`
              : "Sign in to the app"
          }
          style={{
            fontSize: 11,
            color: data ? dayColor : C.textMuted,
            marginTop: 2,
          }}
          maxLines={1}
        />
      </FlexWidget>

      {/* Period returns grid */}
      <FlexWidget
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          backgroundColor: C.surface,
          borderRadius: 10,
          padding: 8,
        }}
      >
        {PERIODS.map((period) => (
          <FlexWidget
            key={period}
            style={{ flexDirection: "column", alignItems: "center" }}
          >
            <TextWidget
              text={period}
              style={{ fontSize: 9, color: C.textMuted, letterSpacing: 0.5 }}
            />
            <TextWidget
              text={data ? getPct(data.returns, period) : "–"}
              style={{
                fontSize: 12,
                color: data ? getPctColor(data.returns, period) : C.textMuted,
                fontWeight: "500",
                marginTop: 2,
              }}
            />
          </FlexWidget>
        ))}
      </FlexWidget>
    </FlexWidget>
  );
}
