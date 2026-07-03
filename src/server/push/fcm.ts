// FCM HTTP v1 sender for Android push tokens.
// Requires FIREBASE_PROJECT_ID and FIREBASE_SERVICE_ACCOUNT_JSON env vars (set on Vercel).
// Falls back silently if env vars are absent (dev/staging without Firebase setup).

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

interface FcmMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  const unsigned = `${header}.${body}`;

  // Use Node.js crypto to sign with RS256
  const { createSign } = await import("node:crypto");
  const sign = createSign("RSA-SHA256");
  sign.update(unsigned);
  const sig = sign.sign(sa.private_key, "base64url");
  const jwt = `${unsigned}.${sig}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

export async function sendFcmNotifications(messages: FcmMessage[]): Promise<void> {
  if (messages.length === 0) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!projectId || !saJson) return; // silently skip — Firebase not configured

  let sa: ServiceAccount;
  try {
    sa = JSON.parse(saJson) as ServiceAccount;
  } catch {
    return;
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken(sa);
  } catch {
    return;
  }

  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  await Promise.allSettled(
    messages.map(async ({ to, title, body, data }) => {
      try {
        await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: {
              token: to,
              notification: { title, body },
              data: data ?? {},
              android: {
                notification: { channel_id: "portfolio_updates", click_action: "OPEN_DASHBOARD" },
              },
            },
          }),
        });
      } catch {
        // individual send failure — skip
      }
    }),
  );
}
