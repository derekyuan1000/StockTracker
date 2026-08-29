import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { requestWidgetUpdate } from "react-native-android-widget";
import { authClient } from "@/auth/client";
import { getWidgetSummary, getPortfolioReturns } from "@/api/endpoints";
import { PortfolioWidget } from "./PortfolioWidget";
import type { WidgetData } from "./PortfolioWidget";

export async function fetchWidgetState(period1Override?: string, period2Override?: string) {
  let period1 = period1Override ?? "1M";
  let period2 = period2Override ?? "All";

  if (period1Override === undefined || period2Override === undefined) {
    try {
      const [p1, p2] = await Promise.all([
        AsyncStorage.getItem("st-widget-period-1"),
        AsyncStorage.getItem("st-widget-period-2"),
      ]);
      if (period1Override === undefined && p1) period1 = JSON.parse(p1);
      if (period2Override === undefined && p2) period2 = JSON.parse(p2);
    } catch {}
  }

  let data: WidgetData | null = null;
  if (authClient.getCookie()) {
    try {
      const [summary, returns] = await Promise.all([getWidgetSummary(), getPortfolioReturns()]);
      data = { summary, returns };
    } catch {}
  }

  return { data, period1, period2 };
}

// Called from the app (foreground) to push an immediate widget refresh.
export async function refreshWidget(period1Override?: string, period2Override?: string) {
  const { data, period1, period2 } = await fetchWidgetState(period1Override, period2Override);
  await requestWidgetUpdate({
    widgetName: "Portfolio",
    renderWidget: () => React.createElement(PortfolioWidget, { data, period1, period2 }),
    if_no_widget_return_error: false,
  });
}
