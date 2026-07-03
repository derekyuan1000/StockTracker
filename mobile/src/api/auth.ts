import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { API_URL, setToken, clearToken, getToken } from "./client";

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle(): Promise<boolean> {
  try {
    const callbackUrl = Linking.createURL("/auth-callback");
    const authUrl = `${API_URL}/api/auth/sign-in/social?provider=google&callbackURL=${encodeURIComponent(callbackUrl)}`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, callbackUrl);

    if (result.type !== "success") return false;

    // After OAuth redirect, extract session token from the callback URL query params
    const url = result.url;
    const parsed = Linking.parse(url);
    const tokenFromUrl =
      parsed.queryParams?.token as string | undefined;

    if (tokenFromUrl) {
      await setToken(tokenFromUrl);
      return true;
    }

    // Fallback: fetch session from server
    const sessionRes = await fetch(`${API_URL}/api/auth/get-session`, {
      credentials: "include",
    });
    const sessionData = (await sessionRes.json()) as {
      session?: { token?: string };
    };
    const token = sessionData?.session?.token;

    if (token) {
      await setToken(token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function signOut(): Promise<void> {
  const token = await getToken();
  if (token) {
    await fetch(`${API_URL}/api/auth/sign-out`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  await clearToken();
}

export async function getSession(): Promise<{
  user: { id: string; name: string; email: string; image?: string };
} | null> {
  const token = await getToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_URL}/api/v1/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      ok: boolean;
      data?: { user: { id: string; name: string; email: string; image?: string } };
    };
    if (!json.ok) return null;
    return { user: json.data!.user };
  } catch {
    return null;
  }
}
