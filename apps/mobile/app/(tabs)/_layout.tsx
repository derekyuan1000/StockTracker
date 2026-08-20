import { Tabs } from "expo-router";
import { Home, Briefcase, BarChart3, Users, MoreHorizontal } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { monoCaps } from "@/theme/text";

export default function TabsLayout() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.brandPeriwinkle,
        tabBarInactiveTintColor: t.textMuted,
        tabBarStyle: {
          backgroundColor: t.canvas,
          borderTopColor: t.hairline,
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: { ...monoCaps(10), letterSpacing: 0.5 },
        tabBarIconStyle: { marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Summary",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size ?? 20} />,
        }}
      />
      <Tabs.Screen
        name="holdings"
        options={{
          title: "Holdings",
          tabBarIcon: ({ color, size }) => <Briefcase color={color} size={size ?? 20} />,
        }}
      />
      <Tabs.Screen
        name="analysis"
        options={{
          title: "Analysis",
          tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size ?? 20} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarIcon: ({ color, size }) => <Users color={color} size={size ?? 20} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => <MoreHorizontal color={color} size={size ?? 20} />,
        }}
      />
      <Tabs.Screen name="cash" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
