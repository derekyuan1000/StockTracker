import { useEffect, useState } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { authClient, useSession } from "@/auth/client";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";
import { Heading, Body, Muted } from "@/components/Typography";
import { Hairline } from "@/components/Card";
import { GoogleIcon } from "@/components/GoogleIcon";

export default function LoginScreen() {
  const { data: session } = useSession();
  const router = useRouter();
  const { t } = useTheme();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) router.replace("/");
  }, [session, router]);

  async function signInWithGoogle() {
    setLoading(true);
    try {
      // Leading "/" is rewritten to the app's own deep link by the expo client.
      // Land back on the boot router so it can decide welcome vs. dashboard.
      await authClient.signIn.social({ provider: "google", callbackURL: "/" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: t.canvas,
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: 400,
          backgroundColor: t.surfaceCard,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: t.hairline,
          padding: 28,
        }}
      >
        <Heading level={2}>Sign in to StockTracker</Heading>
        <Muted style={{ marginTop: 6, marginBottom: 24 }}>
          Track your portfolio. Share your edge.
        </Muted>

        <Hairline style={{ marginBottom: 24 }} />

        <Pressable
          onPress={signInWithGoogle}
          disabled={loading}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            borderWidth: 1,
            borderColor: t.hairline,
            backgroundColor: t.surfaceElevated,
            borderRadius: radius.sm,
            paddingVertical: 14,
            opacity: pressed || loading ? 0.7 : 1,
          })}
        >
          {loading ? (
            <ActivityIndicator color={t.textBody} />
          ) : (
            <>
              <GoogleIcon />
              <Body medium size={14}>
                Continue with Google
              </Body>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}
