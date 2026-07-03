import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { bearer } from "better-auth/plugins/bearer";
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
  trustedOrigins: ["stocktracker://", ...(process.env.DEV_ORIGIN ? [process.env.DEV_ORIGIN] : [])],
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
  // bearer() allows Authorization: Bearer <session-token> for mobile clients
  // Must be listed before tanstackStartCookies() which must remain last.
  plugins: [bearer(), tanstackStartCookies()],
});
