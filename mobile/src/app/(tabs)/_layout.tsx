import { Tabs } from "expo-router";
import { useTheme } from "@/theme/useTheme";

export default function TabLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.ink,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Portfolio", tabBarLabel: "Portfolio" }}
      />
      <Tabs.Screen
        name="holdings"
        options={{ title: "Holdings", tabBarLabel: "Holdings" }}
      />
      <Tabs.Screen
        name="activity"
        options={{ title: "Activity", tabBarLabel: "Activity" }}
      />
      <Tabs.Screen
        name="community"
        options={{ title: "Community", tabBarLabel: "Community" }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: "More", tabBarLabel: "More" }}
      />
    </Tabs>
  );
}
