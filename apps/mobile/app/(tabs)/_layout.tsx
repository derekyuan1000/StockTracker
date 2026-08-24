import { Tabs } from "expo-router";
import { TabBar } from "@/components/TabBar";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Summary" }} />
      <Tabs.Screen name="holdings" options={{ title: "Holdings" }} />
      <Tabs.Screen name="performance" options={{ title: "Performance" }} />
      <Tabs.Screen name="analysis" options={{ title: "Analysis" }} />
      <Tabs.Screen name="watchlist" options={{ title: "Watch" }} />
      <Tabs.Screen name="more" options={{ title: "More" }} />
      <Tabs.Screen name="community" options={{ title: "Community" }} />
      <Tabs.Screen name="cash" options={{ title: "Cash" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
