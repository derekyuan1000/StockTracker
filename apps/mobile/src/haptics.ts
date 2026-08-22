import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Thin haptics wrapper. Call sites stay synchronous and never need the setting
 * hook — a module-level flag gates every trigger. `initHaptics()` seeds the flag
 * from AsyncStorage at startup; the settings toggle keeps it in sync via
 * `setHapticsEnabled`.
 */

export const HAPTICS_KEY = "st-haptics-enabled";

let enabled = true;

export async function initHaptics() {
  try {
    const stored = await AsyncStorage.getItem(HAPTICS_KEY);
    if (stored !== null) enabled = JSON.parse(stored) === true;
  } catch {
    // keep default (on)
  }
}

export function setHapticsEnabled(value: boolean) {
  enabled = value;
  AsyncStorage.setItem(HAPTICS_KEY, JSON.stringify(value)).catch(() => {});
}

export const haptic = {
  selection() {
    if (enabled) Haptics.selectionAsync().catch(() => {});
  },
  success() {
    if (enabled)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  impact() {
    if (enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
};
