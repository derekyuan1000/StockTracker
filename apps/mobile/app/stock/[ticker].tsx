import { View, Pressable } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { StockDetailPanel } from "@/components/StockDetailPanel";
import { Body, Muted } from "@/components/Typography";
import { useTheme } from "@/theme/ThemeProvider";
import { usePortfolio } from "@/api/queries";
import { compute } from "@stocktracker/shared";
import { useMemo } from "react";

export default function StockDetailScreen() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const { t } = useTheme();

  const portfolio = usePortfolio();
  const holding = useMemo(() => {
    if (!portfolio.data || !ticker) return null;
    const p = compute(portfolio.data.holdings, portfolio.data.cashGBP);
    return p.rows.find((h) => h.ticker.toUpperCase() === ticker.toUpperCase()) ?? null;
  }, [portfolio.data, ticker]);

  if (!ticker) return null;

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Pressable onPress={() => router.back()}>
          <ArrowLeft color={t.textBody} size={22} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Body
            medium
            size={14}
            style={{ fontFamily: "JetBrainsMono_500Medium", textTransform: "uppercase" }}
          >
            {ticker}
          </Body>
          {holding && (
            <Muted size={11} numberOfLines={1}>
              {holding.name}
            </Muted>
          )}
        </View>
      </View>

      <StockDetailPanel ticker={ticker} />
    </Screen>
  );
}
