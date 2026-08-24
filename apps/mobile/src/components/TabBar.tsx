import { useRef, useState } from "react";
import { View, Text, Pressable, Animated, Modal, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Home, Briefcase, TrendingUp, BarChart3, Star, MoreHorizontal,
  Settings, ChevronLeft, ChevronRight, Users, Wallet,
} from "lucide-react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { monoCaps } from "@/theme/text";
import { useIsTablet } from "@/hooks/useIsTablet";
import { useSidebar } from "@/context/SidebarContext";
import { haptic } from "@/haptics";
import { Hairline } from "@/components/Card";
import { Body } from "@/components/Typography";

type IconFn = (color: string, size: number) => React.ReactElement;

const ICONS: Record<string, IconFn> = {
  dashboard:   (c, s) => <Home color={c} size={s} />,
  holdings:    (c, s) => <Briefcase color={c} size={s} />,
  performance: (c, s) => <TrendingUp color={c} size={s} />,
  analysis:    (c, s) => <BarChart3 color={c} size={s} />,
  watchlist:   (c, s) => <Star color={c} size={s} />,
  community:   (c, s) => <Users color={c} size={s} />,
  cash:        (c, s) => <Wallet color={c} size={s} />,
  settings:    (c, s) => <Settings color={c} size={s} />,
  more:        (c, s) => <MoreHorizontal color={c} size={s} />,
};

// Routes that live under the phone More popup (hidden from bottom bar)
const MORE_SUB_NAMES = ["analysis", "watchlist", "community", "cash", "settings"];
const PHONE_HIDDEN = new Set(MORE_SUB_NAMES);

const POPUP_ITEMS = [
  { label: "Analysis",  route: "/(tabs)/analysis",  Icon: BarChart3 },
  { label: "Watch",     route: "/(tabs)/watchlist", Icon: Star },
  { label: "Community", route: "/(tabs)/community", Icon: Users },
  { label: "Cash",      route: "/(tabs)/cash",      Icon: Wallet },
  { label: "Settings",  route: "/(tabs)/settings",  Icon: Settings },
] as const;

const TAB_BAR_HEIGHT = 64;

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
      <Animated.View
        style={{ flexDirection: "row", alignItems: "center", flex: 1, transform: [{ scale }] }}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function TabBar({ state, descriptors, navigation }: any) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { collapsed, toggle, animatedWidth } = useSidebar();
  const [showMore, setShowMore] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allVisible = state.routes.filter((r: any) => descriptors[r.key].options.href !== null);

  const currentRouteName: string = state.routes[state.index]?.name ?? "";
  const isSubActive = MORE_SUB_NAMES.includes(currentRouteName);

  // ─── Tablet sidebar ─────────────────────────────────────────────────────────
  if (isTablet) {
    // All routes except 'more' (hidden) and 'settings' (pinned to bottom)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mainRoutes = allVisible.filter((r: any) => r.name !== "more" && r.name !== "settings");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settingsRoute = allVisible.find((r: any) => r.name === "settings");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function renderNavItem(route: any, iconSize = 20, labelSize = 9, itemHeight = 52) {
      const isFocused = state.index === state.routes.indexOf(route);
      const label = (descriptors[route.key].options.title ?? route.name) as string;
      const color = isFocused ? t.brandPeriwinkle : t.textMuted;

      return (
        <AnimatedSidebarItem
          key={route.key}
          onPress={() => {
            haptic.selection();
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          }}
        >
          <View
            style={{
              width: 3,
              height: itemHeight * 0.54,
              borderTopRightRadius: 2,
              borderBottomRightRadius: 2,
              backgroundColor: isFocused ? t.brandPeriwinkle : "transparent",
            }}
          />
          <View style={{ flex: 1, alignItems: "center", gap: collapsed ? 0 : 4 }}>
            {ICONS[route.name]?.(color, iconSize)}
            {!collapsed && (
              <Text
                numberOfLines={1}
                style={{ ...monoCaps(labelSize), letterSpacing: 0.5, color, textAlign: "center" }}
              >
                {label}
              </Text>
            )}
          </View>
        </AnimatedSidebarItem>
      );
    }

    return (
      <Animated.View
        style={{
          position: "absolute",
          left: 0, top: 0, bottom: 0,
          width: animatedWidth,
          backgroundColor: t.canvas,
          borderRightWidth: 1,
          borderRightColor: t.hairline,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 8,
          zIndex: 100,
          justifyContent: "space-between",
          overflow: "hidden",
        }}
      >
        {/* Logo — taps to Summary */}
        <View>
          <Pressable
            onPress={() => { haptic.selection(); navigation.navigate("dashboard"); }}
            style={{ alignItems: "center", paddingVertical: 10 }}
          >
            <Image
              source={require("../../assets/icon.png")}
              style={{ width: collapsed ? 32 : 40, height: collapsed ? 32 : 40, borderRadius: 10 }}
              resizeMode="contain"
            />
          </Pressable>

          {/* Main nav items */}
          {mainRoutes.map((route: any) => renderNavItem(route))}
        </View>

        {/* Bottom: Settings (pinned) + collapse toggle */}
        <View>
          {settingsRoute && renderNavItem(settingsRoute)}
          <AnimatedSidebarItem onPress={() => { haptic.selection(); toggle(); }}>
            <View style={{ width: 3 }} />
            <View style={{ flex: 1, alignItems: "center" }}>
              {collapsed
                ? <ChevronRight color={t.textMuted} size={18} />
                : <ChevronLeft color={t.textMuted} size={18} />}
            </View>
          </AnimatedSidebarItem>
        </View>
      </Animated.View>
    );
  }

  // ─── Phone bottom bar ───────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const phoneRoutes = allVisible.filter((r: any) => !PHONE_HIDDEN.has(r.name));

  return (
    <>
      {/* More popup */}
      <Modal
        transparent
        animationType="fade"
        visible={showMore}
        onRequestClose={() => setShowMore(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}
          onPress={() => setShowMore(false)}
        >
          <View
            style={{
              position: "absolute",
              bottom: TAB_BAR_HEIGHT + insets.bottom + 10,
              left: 12,
              right: 12,
            }}
          >
            <View
              style={{
                backgroundColor: t.surfaceCard,
                borderRadius: 16,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: t.hairline,
              }}
            >
              {POPUP_ITEMS.map((item, i) => (
                <View key={item.route}>
                  <Pressable
                    onPressIn={() => {
                      haptic.selection();
                      setShowMore(false);
                      router.push(item.route as never);
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 16,
                      paddingHorizontal: 20,
                      gap: 14,
                    }}
                  >
                    <item.Icon color={t.textBody} size={20} />
                    <Body medium size={15}>{item.label}</Body>
                  </Pressable>
                  {i < POPUP_ITEMS.length - 1 && <Hairline />}
                </View>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>

      <View
        style={{
          flexDirection: "row",
          backgroundColor: t.canvas,
          borderTopWidth: 1,
          borderTopColor: t.hairline,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
        }}
      >
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {phoneRoutes.map((route: any) => {
          const isMoreTab = route.name === "more";
          const isFocused = !isMoreTab && state.index === state.routes.indexOf(route);
          const isMoreActive = isMoreTab && (showMore || isSubActive);
          const color = isMoreActive || isFocused ? t.brandPeriwinkle : t.textMuted;
          const label = (descriptors[route.key].options.title ?? route.name) as string;

          function onPressIn() {
            if (isMoreTab) {
              haptic.selection();
              setShowMore(true);
              return;
            }
          }

          function onPress() {
            if (isMoreTab) return;
            setShowMore(false);
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
              onPressIn={isMoreTab ? onPressIn : undefined}
              onPress={onPress}
              style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 2, paddingTop: 6 }}
            >
              {ICONS[route.name]?.(color, 20)}
              <Text style={{ ...monoCaps(10), letterSpacing: 0.5, color }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}
