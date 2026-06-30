// Spike A: env access for both Node dev and Cloudflare Workers.
//
// Dev (`vite dev`): Nitro's cloudflare preset loads .dev.vars into process.env
// via its miniflare/wrangler emulation layer — process.env works here.
//
// Workers (prod): Cloudflare passes secrets via the `env` arg to fetch(), NOT
// process.env. If this helper throws on Workers, switch to reading from h3's
// event context: getEvent().context.cloudflare.env (needs verification in Spike A).

export function getTursoEnv(): { url: string; authToken: string } {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    throw new Error("TURSO_DATABASE_URL / TURSO_AUTH_TOKEN not set — check .dev.vars");
  }
  return { url, authToken };
}

export function getAuthEnv(): {
  secret: string;
  baseURL: string;
  googleClientId: string;
  googleClientSecret: string;
} {
  const secret = process.env.BETTER_AUTH_SECRET;
  const baseURL = process.env.BETTER_AUTH_URL;
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret || !baseURL || !googleClientId || !googleClientSecret) {
    throw new Error(
      "BETTER_AUTH_SECRET / BETTER_AUTH_URL / GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — check .dev.vars",
    );
  }
  return { secret, baseURL, googleClientId, googleClientSecret };
}
