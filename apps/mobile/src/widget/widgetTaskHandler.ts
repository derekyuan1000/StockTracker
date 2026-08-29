import React from "react";
import { registerWidgetTaskHandler, type WidgetTaskHandlerProps } from "react-native-android-widget";
import { PortfolioWidget } from "./PortfolioWidget";
import { fetchWidgetState } from "./refreshWidget";

// Re-export types used by PortfolioWidget
export type { WidgetSummary } from "@stocktracker/api-contracts";
export type { PeriodReturn } from "@/api/endpoints";

async function portfolioWidgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction } = props;

  if (
    widgetAction === "WIDGET_ADDED" ||
    widgetAction === "WIDGET_UPDATE" ||
    widgetAction === "WIDGET_RESIZED"
  ) {
    const { data, period1, period2 } = await fetchWidgetState();
    props.renderWidget(React.createElement(PortfolioWidget, { data, period1, period2 }));
  }
}

registerWidgetTaskHandler(portfolioWidgetTaskHandler);
