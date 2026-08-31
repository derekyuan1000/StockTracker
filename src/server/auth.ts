import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { bearer } from "better-auth/plugins/bearer";
import { expo } from "@better-auth/expo";
import { Resend } from "resend";
import { db } from "@/server/db/client";
import { getAuthEnv } from "@/server/env";

const { secret, baseURL, googleClientId, googleClientSecret } = getAuthEnv();

const appleClientId = process.env.APPLE_CLIENT_ID;
const appleTeamId = process.env.APPLE_TEAM_ID;
const appleKeyId = process.env.APPLE_KEY_ID;
const applePrivateKey = process.env.APPLE_PRIVATE_KEY;

const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
const microsoftClientId = process.env.MICROSOFT_CLIENT_ID;
const microsoftClientSecret = process.env.MICROSOFT_CLIENT_SECRET;

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM ?? "StockTracker <onboarding@resend.dev>";
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const LOGO =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgd2lkdGg9IjI4IiBoZWlnaHQ9IjI4Ij48cmVjdCB4PSIyIiB5PSIxNCIgd2lkdGg9IjQiIGhlaWdodD0iNiIgcng9IjAuNzUiIGZpbGw9IiMxQzFCMTgiIGZpbGwtb3BhY2l0eT0iMC4zIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iNCIgaGVpZ2h0PSI4IiByeD0iMC43NSIgZmlsbD0iIzFDMUIxOCIgZmlsbC1vcGFjaXR5PSIwLjYiLz48cmVjdCB4PSIxOCIgeT0iNSIgd2lkdGg9IjQiIGhlaWdodD0iMTIiIHJ4PSIwLjc1IiBmaWxsPSIjMUMxQjE4Ii8+PC9zdmc+";

function emailHtml(opts: {
  heading: string;
  body: string;
  buttonText: string;
  buttonUrl: string;
  note: string;
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f1;padding:48px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">

        <!-- Logo -->
        <tr><td style="padding-bottom:28px;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align:middle;padding-right:8px;">
              <img src="${LOGO}" width="24" height="24" alt="StockTracker logo" style="display:block;">
            </td>
            <td style="vertical-align:middle;">
              <span style="font-size:15px;font-weight:600;color:#1C1B18;letter-spacing:-0.01em;">StockTracker</span>
            </td>
          </tr></table>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#ffffff;border-radius:8px;border:1px solid #e8e5e0;padding:40px;">

          <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;color:#1C1B18;letter-spacing:-0.02em;line-height:1.2;">
            ${opts.heading}
          </h1>
          <p style="margin:0 0 28px;font-size:15px;color:#6b6763;line-height:1.6;">
            ${opts.body}
          </p>

          <a href="${opts.buttonUrl}"
             style="display:inline-block;padding:11px 24px;background:#1C1B18;color:#F2EFE7;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;letter-spacing:-0.01em;">
            ${opts.buttonText}
          </a>

          <p style="margin:28px 0 0;font-size:12px;color:#a39e93;line-height:1.6;border-top:1px solid #f0ede8;padding-top:20px;">
            ${opts.note}
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#a39e93;line-height:1.6;">
            &copy; 2026 StockTracker &middot; You're receiving this because you have an account with us.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export const auth = betterAuth({
  secret,
  baseURL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      if (!resend) return;
      await resend.emails.send({
        from: emailFrom,
        to: user.email,
        subject: "Reset your StockTracker password",
        html: emailHtml({
          heading: "Reset your password",
          body: "We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.",
          buttonText: "Reset password",
          buttonUrl: url,
          note: "If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.",
        }),
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      if (!resend) return;
      await resend.emails.send({
        from: emailFrom,
        to: user.email,
        subject: "Verify your StockTracker email",
        html: emailHtml({
          heading: "Verify your email address",
          body: "One more step. Click the button below to confirm your email and activate your StockTracker account.",
          buttonText: "Verify email address",
          buttonUrl: url,
          note: "This link expires in 1 hour. If you didn't create a StockTracker account, you can safely ignore this email.",
        }),
      });
    },
  },
  accountLinking: {
    enabled: true,
    trustedProviders: ["google", "github", "microsoft"],
    disableImplicitLinking: false,
  },
  trustedOrigins: [
    "stocktracker://",
    "stocktracker://auth-callback",
    ...(process.env.DEV_ORIGIN ? [process.env.DEV_ORIGIN] : []),
  ],
  database: drizzleAdapter(db, { provider: "sqlite" }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socialProviders: ((): any => {
    const providers: Record<string, unknown> = {
      google: {
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        prompt: "select_account",
      },
    };
    if (githubClientId && githubClientSecret)
      providers.github = { clientId: githubClientId, clientSecret: githubClientSecret };
    if (microsoftClientId && microsoftClientSecret)
      providers.microsoft = {
        clientId: microsoftClientId,
        clientSecret: microsoftClientSecret,
        tenantId: "common",
      };
    if (appleClientId && appleTeamId && appleKeyId && applePrivateKey)
      providers.apple = {
        clientId: appleClientId,
        teamId: appleTeamId,
        keyId: appleKeyId,
        privateKey: applePrivateKey,
      };
    return providers;
  })(),
  plugins: [expo(), bearer(), tanstackStartCookies()],
});
