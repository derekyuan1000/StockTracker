import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Home, Briefcase, TrendingUp, BarChart3, Star, MoreHorizontal } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { monoCaps } from "@/theme/text";
import { useIsTablet, SIDEBAR_WIDTH } from "@/hooks/useIsTablet";

type IconFn = (color: string, size: number) => React.ReactElement;

const ICONS: Record<string, IconFn> = {
  dashboard: (c, s) => <Home color={c} size={s} />,
  holdings: (c, s) => <Briefcase color={c} size={s} />,
  performance: (c, s) => <TrendingUp color={c} size={s} />,
  analysis: (c, s) => <BarChart3 color={c} size={s} />,
  watchlist: (c, s) => <Star color={c} size={s} />,
  more: (c, s) => <MoreHorizontal color={c} size={s} />,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function TabBar({ state, descriptors, navigation }: any) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();

  const visibleRoutes = state.routes.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (route: any) => descriptors[route.key].options.href !== null,
  );

  if (isTablet) {
    return (
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: SIDEBAR_WIDTH,
          backgroundColor: t.canvas,
          borderRightWidth: 1,
          borderRightColor: t.hairline,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 16,
          zIndex: 100,
        }}
      >
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {visibleRoutes.map((route: any) => {
          const isFocused = state.index === state.routes.indexOf(route);
          const label = (descriptors[route.key].options.title ?? route.name) as string;
          const color = isFocused ? t.brandPeriwinkle : t.textMuted;

          function onPress() {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14 }}
            >
              <View
                style={{
                  width: 3,
                  height: 28,
                  borderRadius: 2,
                  backgroundColor: isFocused ? t.brandPeriwinkle : "transparent",
                  marginRight: 14,
                }}
              />
              <View style={{ alignItems: "center", gap: 6 }}>
                {ICONS[route.name]?.(color, 20)}
                <Text style={{ ...monoCaps(9), letterSpacing: 0.5, color }}>
                  {label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    );
  }

  // Phone: bottom tab bar
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: t.canvas,
        borderTopWidth: 1,
        borderTopColor: t.hairline,
        height: 64 + insets.bottom,
        paddingBottom: insets.bottom,
      }}
    >
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {visibleRoutes.map((route: any) => {
        const isFocused = state.index === state.routes.indexOf(route);
        const label = (descriptors[route.key].options.title ?? route.name) as string;
        const color = isFocused ? t.brandPeriwinkle : t.textMuted;

        function onPress() {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        }

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 2, paddingTop: 6 }}
          >
            {ICONS[route.name]?.(color, 20)}
            <Text style={{ ...monoCaps(10), letterSpacing: 0.5, color }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
