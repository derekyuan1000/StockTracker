import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * AsyncStorage equivalent of the web's synchronous `useLocalSetting` (localStorage).
 * Unlike the web version, this is inherently async, so it carries a `loaded` flag —
 * callers should avoid writing (`set`) before `loaded` to avoid clobbering the
 * stored value with the default during the initial read.
 */
export function useLocalSetting<T>(key: string, defaultValue: T): [T, (v: T) => void, boolean] {
  const [value, setValue] = useState<T>(defaultValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(key)
      .then((stored) => {
        if (stored !== null) {
          try {
            setValue(JSON.parse(stored) as T);
          } catch {
            // corrupted value — fall back to default
          }
        }
      })
      .finally(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  function set(v: T) {
    setValue(v);
    AsyncStorage.setItem(key, JSON.stringify(v)).catch(() => {});
  }

  return [value, set, loaded];
}
