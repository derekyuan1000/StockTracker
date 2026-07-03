import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { API_URL, setToken, clearToken, getToken } from "./client";

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle(): Promise<boolean> {
  try {
    const callbackUrl = Linking.createURL("/auth-callback");

    // POST with disableRedirect=true so better-auth returns the Google OAuth URL as JSON
    // instead of issuing a 302 redirect (which browsers follow, breaking expo-web-browser)
    const res = await fetch(`${API_URL}/api/auth/sign-in/social`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "google",
        callbackURL: callbackUrl,
        disableRedirect: true,
      }),
    });

    if (!res.ok) return false;

    const json = (await res.json()) as { url?: string };
    const oauthUrl = json.url;
    if (!oauthUrl) return false;

    // Open Google's OAuth page in the system browser
    const result = await WebBrowser.openAuthSessionAsync(oauthUrl, callbackUrl);
    if (result.type !== "success") return false;

    // Extract token from the deep-link redirect back to the app
    const parsed = Linking.parse(result.url);
    const token = parsed.queryParams?.token as string | undefined;
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
