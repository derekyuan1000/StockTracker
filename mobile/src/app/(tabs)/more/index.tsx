import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { signOut } from "@/api/auth";
import { tokens } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { useMe } from "@/api/queries";

function MenuRow({
  label,
  sublabel,
  onPress,
  destructive,
}: {
  label: string;
  sublabel?: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      accessibilityLabel={label}
    >
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: destructive ? tokens.colors.negative : colors.ink }]}>
          {label}
        </Text>
        {sublabel && (
          <Text style={[styles.rowSublabel, { color: colors.inkMuted }]}>{sublabel}</Text>
        )}
      </View>
      {!destructive && (
        <Text style={[styles.chevron, { color: colors.inkFaint }]}>›</Text>
      )}
    </TouchableOpacity>
  );
}

export default function MoreScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data: me } = useMe();

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
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

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Account info */}
      {me?.user && (
        <View style={[styles.accountCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.accountName, { color: colors.ink }]}>{me.user.name}</Text>
          <Text style={[styles.accountEmail, { color: colors.inkMuted }]}>{me.user.email}</Text>
        </View>
      )}

      {/* Navigation */}
      <View style={[styles.section, { borderTopColor: colors.border }]}>
        <Text style={[styles.sectionHeader, { color: colors.inkMuted }]}>Tools</Text>
        <MenuRow
          label="Research"
          sublabel="Your watchlist and research picks"
          onPress={() => router.push("/(tabs)/more/research")}
        />
        <MenuRow
          label="Settings"
          sublabel="Theme, privacy, notifications"
          onPress={() => router.push("/(tabs)/more/settings")}
        />
      </View>

      <View style={[styles.section, { borderTopColor: colors.border }]}>
        <Text style={[styles.sectionHeader, { color: colors.inkMuted }]}>Account</Text>
        <MenuRow label="Sign out" onPress={handleSignOut} destructive />
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.inkFaint }]}>
          Not financial advice.
        </Text>
        <Text style={[styles.footerText, { color: colors.inkFaint }]}>
          StockTracker v1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  accountCard: {
    margin: tokens.spacing.md,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  accountName: { fontSize: tokens.fontSize.lg, fontWeight: "500" },
  accountEmail: { fontSize: tokens.fontSize.sm, marginTop: 2 },
  section: { borderTopWidth: 1, marginTop: tokens.spacing.md },
  sectionHeader: {
    fontSize: tokens.fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: tokens.fontSize.md },
  rowSublabel: { fontSize: tokens.fontSize.xs, marginTop: 2 },
  chevron: { fontSize: 20, marginLeft: tokens.spacing.sm },
  footer: {
    padding: tokens.spacing.lg,
    alignItems: "center",
    gap: 4,
  },
  footerText: { fontSize: tokens.fontSize.xs },
});
