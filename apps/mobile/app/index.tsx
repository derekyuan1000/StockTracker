import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/auth/AuthProvider";
import { useSettings } from "@/api/queries";
import { useTheme } from "@/theme/ThemeProvider";

export default function BootRouter() {
  const router = useRouter();
  const { session, isPending: sessionPending } = useAuth();
  const { t } = useTheme();
  const {
    data: settings,
    isLoading: settingsLoading,
    isError: settingsError,
  } = useSettings(!!session);

  useEffect(() => {
    if (sessionPending) return;

    if (!session) {
      router.replace("/login");
      return;
    }

    // Wait for the settings fetch to settle (success or failure) before
    // deciding — an error here shouldn't strand the user on a blank screen.
    if (settingsLoading) return;

    if (!settingsError && settings?.onboarded === false) {
      router.replace("/welcome");
    } else {
      router.replace("/(tabs)/dashboard");
    }
  }, [sessionPending, session, settingsLoading, settingsError, settings, router]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: t.canvas }}>
      <ActivityIndicator color={t.textMuted} />
    </View>
  );
}
