import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { bearer } from "better-auth/plugins/bearer";
import { expo } from "@better-auth/expo";
import { db } from "@/server/db/client";
import { getAuthEnv } from "@/server/env";

const { secret, baseURL, googleClientId, googleClientSecret } = getAuthEnv();

const appleClientId = process.env.APPLE_CLIENT_ID;
const appleTeamId = process.env.APPLE_TEAM_ID;
const appleKeyId = process.env.APPLE_KEY_ID;
const applePrivateKey = process.env.APPLE_PRIVATE_KEY;

export const auth = betterAuth({
  secret,
  baseURL,
  trustedOrigins: ["stocktracker://", "stocktracker://auth-callback", ...(process.env.DEV_ORIGIN ? [process.env.DEV_ORIGIN] : [])],
  database: drizzleAdapter(db, { provider: "sqlite" }),
  socialProviders: {
    google: {
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    },
    ...(appleClientId && appleTeamId && appleKeyId && applePrivateKey
      ? {
          apple: {
            clientId: appleClientId,
            teamId: appleTeamId,
            keyId: appleKeyId,
            privateKey: applePrivateKey,
          },
        }
      : {}),
  },
  // Plugin order matters:
  // - expo() must come first: its after-hook reads the `set-cookie` header on
  //   /callback/* responses to build the `stocktracker://...?cookie=` deep link,
  //   so it needs to observe it before tanstackStartCookies() consumes it.
  //   (Verified safe for the web flow: expo()'s origin-override only fires when
  //   an `expo-origin` header is present and no `origin` header is — browsers
  //   always send `origin` and never send `expo-origin` — and its redirect
  //   rewrite only fires for non-http(s) protocols, which web callbacks never are.)
  // - bearer() allows Authorization: Bearer <session-token> too (handy for curl);
  //   must stay before tanstackStartCookies().
  // - tanstackStartCookies() must remain last.
  plugins: [expo(), bearer(), tanstackStartCookies()],
});
