import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { setToken } from "@/api/client";
import { tokens } from "@/theme/tokens";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();

  useEffect(() => {
    const handle = async () => {
      if (params.token) {
        await setToken(params.token);
        router.replace("/(tabs)");
      } else {
        // No token in URL params — redirect to login
        router.replace("/login");
      }
    };
    handle();
  }, [params.token]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: tokens.colors.bg,
      }}
    >
      <ActivityIndicator color={tokens.colors.ink} />
    </View>
  );
}
