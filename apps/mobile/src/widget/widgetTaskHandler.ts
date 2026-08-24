import React from "react";
import {
  registerWidgetTaskHandler,
  type WidgetTaskHandlerProps,
} from "react-native-android-widget";
import { authClient } from "@/auth/client";
import { getWidgetSummary, getPortfolioReturns } from "@/api/endpoints";
import { PortfolioWidget } from "./PortfolioWidget";

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
    let data = null;

    // authClient.getCookie() reads from SecureStore synchronously — safe in headless context
    if (authClient.getCookie()) {
      try {
        const [summary, returns] = await Promise.all([
          getWidgetSummary(),
          getPortfolioReturns(),
        ]);
        data = { summary, returns };
      } catch {
        // Render placeholder; will retry on next scheduled update
      }
    }

    props.renderWidget(React.createElement(PortfolioWidget, { data }));
  }
}

registerWidgetTaskHandler(portfolioWidgetTaskHandler);
