import { ScrollView, View, Animated, RefreshControl, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { useIsTablet } from "@/hooks/useIsTablet";
import { useSidebar } from "@/context/SidebarContext";
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
  const { animatedWidth } = useSidebar();

  const padding = { paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 32 };
  const marginLeft = isTablet ? animatedWidth : 0;

  if (!scroll) {
    return (
      <Animated.View
        style={[{ flex: 1, backgroundColor: t.canvas, marginLeft }, padding, contentStyle]}
      >
        {children}
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ flex: 1, backgroundColor: t.canvas, marginLeft }}>
      <ScrollView
        style={{ flex: 1 }}
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
    </Animated.View>
  );
}
