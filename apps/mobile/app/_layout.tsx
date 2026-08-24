import { useEffect, useState } from "react";
import { Stack } from "expo-router";
// Register Android home-screen widget task handler at module load time
import "@/widget/widgetTaskHandler";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";
import { SidebarProvider } from "@/context/SidebarContext";
import { fontsToLoad } from "@/theme/text";
import { AuthProvider } from "@/auth/AuthProvider";
import { createQueryClient, setupQueryFocusManager } from "@/api/queryClient";
import { initHaptics } from "@/haptics";
import { BiometricGate } from "@/security/BiometricGate";

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = createQueryClient();

function RootNavigator() {
  const { resolvedTheme, t } = useTheme();

  return (
    <>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.canvas },
        }}
      />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontsToLoad);
  const [ready, setReady] = useState(false);

  useEffect(() => setupQueryFocusManager(), []);
  useEffect(() => {
    initHaptics();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      setReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <BiometricGate>
                <SidebarProvider>
                  <RootNavigator />
                </SidebarProvider>
              </BiometricGate>
            </AuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
