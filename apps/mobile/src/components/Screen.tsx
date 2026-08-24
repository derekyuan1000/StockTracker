import { ScrollView, View, RefreshControl, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { useIsTablet, SIDEBAR_WIDTH } from "@/hooks/useIsTablet";
import type { ReactNode } from "react";

/** Scrollable screen container with safe-area padding and canvas background. */
export function Screen({
  children,
  scroll = true,
  contentStyle,
  refreshing,
  onRefresh,
}: {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useTheme();
  const isTablet = useIsTablet();

  const sidebarOffset = isTablet ? SIDEBAR_WIDTH : 0;
  const padding = { paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 32 };

  if (!scroll) {
    return (
      <View
        style={[{ flex: 1, backgroundColor: t.canvas, marginLeft: sidebarOffset }, padding, contentStyle]}
      >
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.canvas, marginLeft: sidebarOffset }}
      contentContainerStyle={[padding, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh != null ? (
          <RefreshControl
            refreshing={refreshing ?? false}
            onRefresh={onRefresh}
            tintColor={t.brandPeriwinkle}
            colors={[t.brandPeriwinkle]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}
