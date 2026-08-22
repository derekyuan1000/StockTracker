import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import { Lock } from "lucide-react-native";
import { useAuth } from "@/auth/AuthProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { Body, Heading } from "@/components/Typography";
import { Button } from "@/components/Button";

export const BIOMETRIC_KEY = "st-biometric-enabled";

export async function isBiometricEnabled(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(BIOMETRIC_KEY)) === "true";
  } catch {
    return false;
  }
}

export async function setBiometricEnabled(value: boolean) {
  await SecureStore.setItemAsync(BIOMETRIC_KEY, value ? "true" : "false");
}

/**
 * Locks the app behind device biometrics when the user has enabled it and a
 * session exists. Re-locks whenever the app returns to the foreground from the
 * background, so a backgrounded app can't be resumed without re-authenticating.
 */
export function BiometricGate({ children }: { children: ReactNode }) {
  const { t } = useTheme();
  const { session } = useAuth();
  const [locked, setLocked] = useState(true); // assume locked until we check
  const [checking, setChecking] = useState(false);
  const appState = useRef(AppState.currentState);

  const authenticate = useCallback(async () => {
    if (checking) return;
    setChecking(true);
    try {
      const enabled = await isBiometricEnabled();
      if (!enabled || !session) {
        setLocked(false);
        return;
      }
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock StockTracker",
        fallbackLabel: "Use passcode",
      });
      if (res.success) setLocked(false);
      else setLocked(true);
    } catch {
      // If the biometric prompt errors, fail closed (stay locked) but let the
      // user retry with the button.
      setLocked(true);
    } finally {
      setChecking(false);
    }
  }, [checking, session]);

  // Initial check on mount / when auth state resolves.
  useEffect(() => {
    isBiometricEnabled().then((enabled) => {
      if (!enabled || !session) {
        setLocked(false);
      } else {
        authenticate();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Re-lock on return to foreground.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const prev = appState.current;
      appState.current = next;
      if (prev.match(/inactive|background/) && next === "active") {
        isBiometricEnabled().then((enabled) => {
          if (enabled && session) {
            setLocked(true);
            authenticate();
          }
        });
      }
    });
    return () => sub.remove();
  }, [authenticate, session]);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {locked && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: t.canvas,
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
            gap: 16,
          }}
        >
          <Lock color={t.textBody} size={40} />
          <Heading level={2}>Locked</Heading>
          <Body size={13} style={{ textAlign: "center", color: t.textMuted }}>
            Unlock with biometrics to view your portfolio.
          </Body>
          <Button title="Unlock" onPress={authenticate} loading={checking} />
        </View>
      )}
    </View>
  );
}
