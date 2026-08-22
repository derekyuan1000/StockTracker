import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { registerDevice } from "@/api/endpoints";

// Show alerts while the app is foregrounded too.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let registered = false;

/**
 * Request notification permission, obtain the Expo push token, and register it
 * with the backend so price-alert / daily-summary pushes can reach this device.
 * Best-effort and idempotent — safe to call on every session resolve. Silently
 * no-ops in Expo Go or when permission is denied.
 */
export async function registerPushToken() {
  if (registered) return;
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== "granted") return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );

    await registerDevice(token, Platform.OS === "ios" ? "ios" : "android");
    registered = true;
  } catch {
    // Non-fatal: notifications simply won't arrive. Allow a retry next call.
  }
}
