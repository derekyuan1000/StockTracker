import { Tabs } from "expo-router";
import { Home, Wallet, Users, Settings as SettingsIcon } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { monoCaps } from "@/theme/text";

export default function TabsLayout() {
  const { t } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.brandPeriwinkle,
        tabBarInactiveTintColor: t.textMuted,
        tabBarStyle: {
          backgroundColor: t.canvas,
          borderTopColor: t.hairline,
          height: 64,
        },
        tabBarLabelStyle: { ...monoCaps(10), letterSpacing: 0.5 },
        tabBarIconStyle: { marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: "Summary", tabBarIcon: ({ color, size }) => <Home color={color} size={size ?? 20} /> }}
      />
      <Tabs.Screen
        name="cash"
        options={{ title: "Cash", tabBarIcon: ({ color, size }) => <Wallet color={color} size={size ?? 20} /> }}
      />
      <Tabs.Screen
        name="community"
        options={{ title: "Community", tabBarIcon: ({ color, size }) => <Users color={color} size={size ?? 20} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <SettingsIcon color={color} size={size ?? 20} />,
        }}
      />
    </Tabs>
  );
}
