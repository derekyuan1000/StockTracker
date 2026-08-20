import { View, Pressable } from "react-native";
import { router } from "expo-router";
import {
  ChevronRight,
  ReceiptText,
  Wallet,
  Users,
  Settings as SettingsIcon,
} from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Card, Hairline } from "@/components/Card";
import { Heading, Body, Muted } from "@/components/Typography";
import { useTheme } from "@/theme/ThemeProvider";

type MenuItem = {
  label: string;
  description: string;
  route: string;
  icon: React.ReactNode;
};

export default function MoreScreen() {
  const { t } = useTheme();

  const items: MenuItem[] = [
    {
      label: "Community",
      description: "Leaderboard & public trades",
      route: "/(tabs)/community",
      icon: <Users color={t.textBody} size={20} />,
    },
    {
      label: "Transactions",
      description: "Lots, trades & cash flows",
      route: "/transactions",
      icon: <ReceiptText color={t.textBody} size={20} />,
    },
    {
      label: "Cash",
      description: "Manage your cash balance",
      route: "/(tabs)/cash",
      icon: <Wallet color={t.textBody} size={20} />,
    },
    {
      label: "Settings",
      description: "Preferences & account",
      route: "/(tabs)/settings",
      icon: <SettingsIcon color={t.textBody} size={20} />,
    },
  ];

  return (
    <Screen>
      <Heading level={1} style={{ marginBottom: 20 }}>
        More
      </Heading>

      <Card style={{ padding: 0, paddingHorizontal: 16 }}>
        {items.map((item, i) => (
          <View key={item.route}>
            <Pressable
              onPress={() => router.push(item.route as never)}
              style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 14 }}
            >
              {item.icon}
              <View style={{ flex: 1 }}>
                <Body medium size={14}>{item.label}</Body>
                <Muted size={12} style={{ marginTop: 2 }}>{item.description}</Muted>
              </View>
              <ChevronRight color={t.textMuted} size={18} />
            </Pressable>
            {i < items.length - 1 ? <Hairline /> : null}
          </View>
        ))}
      </Card>
    </Screen>
  );
}
