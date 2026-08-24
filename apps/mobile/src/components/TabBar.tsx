import { useRef } from "react";
import { View, Text, Pressable, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Home, Briefcase, TrendingUp, BarChart3, Star, MoreHorizontal,
  Settings,
} from "lucide-react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { monoCaps } from "@/theme/text";
import { useIsTablet, SIDEBAR_WIDTH } from "@/hooks/useIsTablet";
import { haptic } from "@/haptics";

type IconFn = (color: string, size: number) => React.ReactElement;

function AnimatedSidebarItem({
  onPress,
  children,
}: {
  onPress: () => void;
  children: React.ReactNode;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() =>
        Animated.timing(scale, { toValue: 0.94, duration: 80, useNativeDriver: true }).start()
      }
      onPressOut={() =>
        Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }).start()
      }
      style={{ flexDirection: "row", alignItems: "center", height: 52 }}
    >
      <Animated.View style={{ flexDirection: "row", alignItems: "center", flex: 1, transform: [{ scale }] }}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

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
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 8,
          zIndex: 100,
          justifyContent: "space-between",
        }}
      >
        {/* Nav items */}
        <View>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {visibleRoutes.map((route: any) => {
            const isFocused = state.index === state.routes.indexOf(route);
            const label = (descriptors[route.key].options.title ?? route.name) as string;
            const color = isFocused ? t.brandPeriwinkle : t.textMuted;

            function onPress() {
              haptic.selection();
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
            }

            return (
              <AnimatedSidebarItem key={route.key} onPress={onPress}>
                {/* Active indicator bar */}
                <View
                  style={{
                    width: 3,
                    height: 28,
                    borderTopRightRadius: 2,
                    borderBottomRightRadius: 2,
                    backgroundColor: isFocused ? t.brandPeriwinkle : "transparent",
                  }}
                />
                {/* Icon + label — flex: 1 so width never changes with label length */}
                <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
                  {ICONS[route.name]?.(color, 20)}
                  <Text
                    numberOfLines={1}
                    style={{ ...monoCaps(9), letterSpacing: 0.5, color, textAlign: "center" }}
                  >
                    {label}
                  </Text>
                </View>
              </AnimatedSidebarItem>
            );
          })}
        </View>

        {/* Bottom: Watchlist + Settings */}
        <View>
          <AnimatedSidebarItem onPress={() => { haptic.selection(); router.push("/(tabs)/watchlist" as never); }}>
            <View style={{ width: 3 }} />
            <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
              <Star color={t.textMuted} size={20} />
              <Text style={{ ...monoCaps(9), letterSpacing: 0.5, color: t.textMuted }}>
                Watch
              </Text>
            </View>
          </AnimatedSidebarItem>
          <AnimatedSidebarItem onPress={() => { haptic.selection(); router.push("/(tabs)/settings" as never); }}>
            <View style={{ width: 3 }} />
            <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
              <Settings color={t.textMuted} size={20} />
              <Text style={{ ...monoCaps(9), letterSpacing: 0.5, color: t.textMuted }}>
                Settings
              </Text>
            </View>
          </AnimatedSidebarItem>
        </View>
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
