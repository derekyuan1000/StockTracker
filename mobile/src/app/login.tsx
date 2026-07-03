import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { signInWithGoogle } from "@/api/auth";
import { tokens } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const ok = await signInWithGoogle();
      if (ok) router.replace("/(tabs)");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.ink }]}>StockTracker</Text>
          <Text style={[styles.subtitle, { color: colors.inkMuted }]}>
            Your portfolio, distilled.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.ink }]}
          onPress={handleSignIn}
          disabled={loading}
          accessibilityLabel="Continue with Google"
        >
          {loading ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={[styles.btnText, { color: colors.bg }]}>
              Continue with Google
            </Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.disclaimer, { color: colors.inkFaint }]}>
          Not financial advice.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: tokens.spacing.xl,
  },
  header: { alignItems: "center", marginBottom: 48 },
  title: {
    fontSize: tokens.fontSize.hero,
    fontWeight: tokens.fontWeight.medium,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: tokens.fontSize.md,
    marginTop: tokens.spacing.sm,
  },
  btn: {
    paddingVertical: 16,
    borderRadius: tokens.radius.sm,
    alignItems: "center",
  },
  btnText: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.medium,
  },
  disclaimer: {
    textAlign: "center",
    fontSize: tokens.fontSize.xs,
    marginTop: tokens.spacing.xl,
  },
});
