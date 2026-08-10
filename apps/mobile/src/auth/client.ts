import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

// baseURL is the app origin — better-auth appends /api/auth itself, and the
// expo plugin builds `${baseURL}/api/auth/expo-authorization-proxy`.
const API_URL = process.env.EXPO_PUBLIC_API_URL;
if (!API_URL) {
  throw new Error("EXPO_PUBLIC_API_URL is not set — see apps/mobile/.env.local(.example)");
}

type ClientOptions = NonNullable<Parameters<typeof createAuthClient>[0]>;

// better-auth's client-plugin typing infers server route shapes through a deep
// conditional-generic chain that doesn't structurally unify with expoClient()'s
// declared plugin type — a known type-level friction in the library, not a
// runtime issue (expoClient's getActions/getCookie/fetchPlugins all behave
// exactly as documented; verified against node_modules/@better-auth/expo/dist).
const plugins = [
  expoClient({
    scheme: "stocktracker",
    storagePrefix: "stocktracker",
    storage: {
      // Must be SYNC — expoClient hydrates the cached session on startup by
      // calling this directly (not awaiting it). getItemAsync silently
      // breaks that hydration path.
      getItem: SecureStore.getItem,
      setItem: SecureStore.setItemAsync,
    },
  }),
] as unknown as ClientOptions["plugins"];

type AuthClientWithCookie = ReturnType<typeof createAuthClient> & {
  /** Added by expoClient() — returns the persisted Cookie header value, or "" when signed out. */
  getCookie: () => string;
};

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins,
}) as AuthClientWithCookie;

export const { signIn, signOut, useSession } = authClient;
