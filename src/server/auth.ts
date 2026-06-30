import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "@/server/db/client";
import { getAuthEnv } from "@/server/env";

const { secret, baseURL, googleClientId, googleClientSecret } = getAuthEnv();

export const auth = betterAuth({
  secret,
  baseURL,
  database: drizzleAdapter(db, { provider: "sqlite" }),
  socialProviders: {
    google: {
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    },
  },
  // Must be the last plugin so it can wrap responses with Set-Cookie headers.
  plugins: [tanstackStartCookies()],
});
