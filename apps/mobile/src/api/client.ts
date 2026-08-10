import { authClient } from "@/auth/client";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
if (!API_URL) {
  throw new Error("EXPO_PUBLIC_API_URL is not set — see apps/mobile/.env.local(.example)");
}

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type Envelope<T> = { ok: true; data?: T } | { ok: false; error: { code: string; message: string } };

// Registered by AuthProvider. Debounced so a burst of parallel 401s (e.g. three
// queries firing on the same screen) produces exactly one sign-out/redirect.
let unauthorizedHandler: (() => void) | null = null;
let unauthorizedFired = false;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

function notifyUnauthorized() {
  if (unauthorizedFired) return;
  unauthorizedFired = true;
  unauthorizedHandler?.();
  // Reset shortly after so a later, genuine 401 (post re-login) fires again.
  setTimeout(() => {
    unauthorizedFired = false;
  }, 2000);
}

type ApiInit = Omit<RequestInit, "body"> & { json?: unknown; body?: BodyInit };

/**
 * Thin fetch wrapper for /api/v1/*.
 *
 * Auth is a COOKIE, not a bearer token: authClient.getCookie() returns the
 * Cookie header value the @better-auth/expo client already persisted from the
 * OAuth deep link. Do not build bearer/token-refresh logic here.
 *
 * Success is always HTTP 200 with {ok:true, data}. Errors carry a real status
 * *and* {ok:false}. Branch on `body.ok`, not on `res.status`, except for the
 * non-JSON fallback below.
 */
export async function api<T = void>(path: string, init: ApiInit = {}): Promise<T> {
  const cookie = authClient.getCookie(); // "" when signed out
  const { json, headers, method, ...rest } = init;

  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...rest,
    method: method ?? (json !== undefined ? "POST" : "GET"),
    headers: {
      Accept: "application/json",
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  let body: Envelope<T>;
  try {
    body = await res.json();
  } catch {
    throw new ApiError(res.status, "BAD_RESPONSE", `Non-JSON response (${res.status})`);
  }

  if (!body.ok) {
    if (body.error.code === "UNAUTHORIZED" || res.status === 401) notifyUnauthorized();
    throw new ApiError(res.status, body.error.code, body.error.message);
  }

  // Void handlers serialize to {"ok":true} with no `data` key — tolerate it.
  return (body.data ?? undefined) as T;
}
