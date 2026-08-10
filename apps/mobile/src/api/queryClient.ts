import { QueryClient, focusManager } from "@tanstack/react-query";
import { AppState, type AppStateStatus } from "react-native";
import { ApiError } from "./client";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status === 401) return false;
          return failureCount < 2;
        },
      },
    },
  });
}

/** React Query doesn't know about RN's AppState by default — wire it up so
 * `refetchOnWindowFocus`-equivalent behaviour works when the app foregrounds. */
export function setupQueryFocusManager() {
  function onAppStateChange(status: AppStateStatus) {
    focusManager.setFocused(status === "active");
  }
  const sub = AppState.addEventListener("change", onAppStateChange);
  return () => sub.remove();
}
