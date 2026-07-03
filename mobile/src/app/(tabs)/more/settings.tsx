import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Platform,
} from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { useSettings } from "@/api/queries";
import { useUpdateSettings, useRegisterDevice } from "@/api/mutations";
import { useSettingsStore } from "@/stores/settingsStore";
import { signOut } from "@/api/auth";
import { tokens } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

type ThemeOption = "dark" | "light" | "system";

export default function SettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { theme, setTheme } = useSettingsStore();
  const { data: serverSettings } = useSettings();
  const updateSettings = useUpdateSettings();
  const registerDevice = useRegisterDevice();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Check if push notifications are already granted
  useEffect(() => {
    Notifications.getPermissionsAsync().then((status) => {
      setNotificationsEnabled(status.granted);
    });
  }, []);

  const handleThemeChange = (newTheme: ThemeOption) => {
    setTheme(newTheme);
    updateSettings.mutate({ theme: newTheme });
  };

  const handleVisibilityToggle = (isPublic: boolean) => {
    updateSettings.mutate({ portfolioPublic: isPublic });
  };

  const handleNotificationsToggle = async (enabled: boolean) => {
    if (enabled) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission denied",
          "Enable notifications in your device settings to receive portfolio alerts.",
        );
        return;
      }
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        await registerDevice.mutateAsync({
          expoPushToken: tokenData.data,
          platform: Platform.OS === "ios" ? "ios" : "android",
        });
        setNotificationsEnabled(true);
        Alert.alert("Notifications enabled", "You will receive portfolio updates.");
      } catch (e: any) {
        Alert.alert("Error", e?.message ?? "Failed to register for notifications");
      }
    } else {
      setNotificationsEnabled(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/login");
        },
      },
    ]);
  };

  const THEME_OPTIONS: { value: ThemeOption; label: string }[] = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "System" },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]}>

      {/* Appearance */}
      <View style={[styles.section, { borderTopColor: colors.border }]}>
        <Text style={[styles.sectionHeader, { color: colors.inkMuted }]}>Appearance</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.rowLabel, { color: colors.ink }]}>Theme</Text>
          <View style={styles.themeOptions}>
            {THEME_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.themeOption,
                  { borderColor: colors.border },
                  theme === opt.value && { backgroundColor: colors.ink, borderColor: colors.ink },
                ]}
                onPress={() => handleThemeChange(opt.value)}
                accessibilityLabel={`${opt.label} theme`}
                accessibilityState={{ selected: theme === opt.value }}
              >
                <Text
                  style={[
                    styles.themeOptionText,
                    { color: theme === opt.value ? colors.bg : colors.inkMuted },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Privacy */}
      <View style={[styles.section, { borderTopColor: colors.border }]}>
        <Text style={[styles.sectionHeader, { color: colors.inkMuted }]}>Privacy</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={[styles.rowLabel, { color: colors.ink }]}>Public portfolio</Text>
              <Text style={[styles.rowSublabel, { color: colors.inkMuted }]}>
                Allow others to see your trades and positions
              </Text>
            </View>
            <Switch
              value={serverSettings?.portfolioPublic ?? false}
              onValueChange={handleVisibilityToggle}
              trackColor={{ false: colors.border, true: colors.ink }}
              disabled={updateSettings.isPending}
            />
          </View>
        </View>
      </View>

      {/* Notifications */}
      <View style={[styles.section, { borderTopColor: colors.border }]}>
        <Text style={[styles.sectionHeader, { color: colors.inkMuted }]}>Notifications</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={[styles.rowLabel, { color: colors.ink }]}>Push notifications</Text>
              <Text style={[styles.rowSublabel, { color: colors.inkMuted }]}>
                Receive price alerts and portfolio updates
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              trackColor={{ false: colors.border, true: colors.ink }}
            />
          </View>
        </View>
      </View>

      {/* Account */}
      <View style={[styles.section, { borderTopColor: colors.border }]}>
        <Text style={[styles.sectionHeader, { color: colors.inkMuted }]}>Account</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.row} onPress={handleSignOut} accessibilityLabel="Sign out">
            <Text style={[styles.rowLabel, { color: tokens.colors.negative }]}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Legal */}
      <View style={[styles.section, { borderTopColor: colors.border }]}>
        <Text style={[styles.sectionHeader, { color: colors.inkMuted }]}>Legal</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.inkMuted }]}>Privacy policy</Text>
            <Text style={[styles.rowValue, { color: colors.inkFaint }]}>Coming soon</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.disclaimer, { color: colors.inkFaint }]}>
          Not financial advice. Past performance does not guarantee future results.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { borderTopWidth: 1, marginTop: tokens.spacing.md },
  sectionHeader: {
    fontSize: tokens.fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
  },
  card: {
    marginHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 14,
  },
  rowLabel: { fontSize: tokens.fontSize.md },
  rowSublabel: { fontSize: tokens.fontSize.xs, marginTop: 2 },
  rowValue: { fontSize: tokens.fontSize.sm },
  themeOptions: {
    flexDirection: "row",
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    paddingBottom: tokens.spacing.md,
  },
  themeOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
  },
  themeOptionText: { fontSize: tokens.fontSize.sm },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 14,
  },
  switchInfo: { flex: 1, marginRight: tokens.spacing.md },
  footer: { padding: tokens.spacing.lg, alignItems: "center" },
  disclaimer: { fontSize: tokens.fontSize.xs, textAlign: "center", lineHeight: 18 },
});
