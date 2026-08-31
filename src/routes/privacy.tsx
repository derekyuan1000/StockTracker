import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/PublicShell";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold tracking-tight text-[var(--text-strong)]">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-[var(--text-body)]">
        {children}
      </div>
    </section>
  );
}

function PrivacyPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-[720px] py-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
          Last updated: 31 August 2026
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--text-strong)]">
          Privacy Policy
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-[var(--text-body)]">
          StockTracker ("we", "us", or "our") is a personal portfolio tracking tool operated by
          Derek Yuan. This policy explains what data we collect, why we collect it, and how it is
          stored and protected.
        </p>

        <Section title="1. Information we collect">
          <p>
            <strong className="font-medium text-[var(--text-strong)]">Account information.</strong>{" "}
            When you sign in with Google, we receive your name, email address, and profile picture
            from Google. This information is stored in our database to identify your account.
          </p>
          <p>
            <strong className="font-medium text-[var(--text-strong)]">Portfolio data.</strong> We
            store the investment holdings, purchase lots, transactions, cash entries, and research
            notes that you enter into the app. This data is associated with your account and is
            required to provide the core service.
          </p>
          <p>
            <strong className="font-medium text-[var(--text-strong)]">
              Settings and preferences.
            </strong>{" "}
            We store your app preferences (theme, portfolio visibility, default chart ranges) and
            onboarding status.
          </p>
          <p>
            <strong className="font-medium text-[var(--text-strong)]">Session data.</strong> We use
            session cookies to keep you signed in. These are managed by Better Auth and are required
            for authentication to work.
          </p>
        </Section>

        <Section title="2. How we use your information">
          <p>We use your data solely to provide and improve the StockTracker service:</p>
          <ul className="ml-5 list-disc space-y-1">
            <li>To authenticate you and maintain your session</li>
            <li>To store and display your portfolio, transactions, and research notes</li>
            <li>To calculate portfolio performance and analytics</li>
            <li>
              To show your public profile and trades on the community feed (only if you opt in)
            </li>
            <li>To remember your display preferences</li>
          </ul>
          <p>
            We do not sell, rent, or share your personal data with third parties for marketing
            purposes. We do not serve advertisements.
          </p>
        </Section>

        <Section title="3. Data storage and security">
          <p>
            Your data is stored in a hosted SQLite database provided by Turso, and the web
            application is hosted on Vercel. Both providers operate data centres in the United
            States and European Union. By using StockTracker you consent to your data being
            processed in these locations.
          </p>
          <p>
            All data is transmitted over HTTPS. Access to your portfolio data is restricted to your
            account. We apply reasonable technical and organisational measures to protect your
            information, though no system is completely secure.
          </p>
        </Section>

        <Section title="4. Third-party services">
          <p>StockTracker integrates with the following third-party services:</p>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <strong className="font-medium text-[var(--text-strong)]">Google OAuth</strong> — used
              for sign-in. Your use of Google's authentication is subject to{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent-mint)] underline-offset-2 hover:underline"
              >
                Google's Privacy Policy
              </a>
              .
            </li>
            <li>
              <strong className="font-medium text-[var(--text-strong)]">Yahoo Finance</strong> —
              used to fetch real-time and historical market data. We retrieve publicly available
              price data; no personal data is sent to Yahoo.
            </li>
            <li>
              <strong className="font-medium text-[var(--text-strong)]">Vercel</strong> — our
              hosting provider, which processes request logs and may store IP addresses transiently
              for security and performance purposes.
            </li>
          </ul>
        </Section>

        <Section title="5. Community and public profiles">
          <p>
            If you enable <em>Public portfolio</em> in Settings, your name and trade history will be
            visible to other users on the community feed and leaderboard. You can turn this off at
            any time in Settings, which will immediately hide your data from the public feed.
          </p>
        </Section>

        <Section title="6. Data retention and deletion">
          <p>
            We retain your data for as long as your account is active. If you wish to delete your
            account and all associated data, please contact us at{" "}
            <a
              href="mailto:contact@derekyuan.co.uk"
              className="text-[var(--accent-mint)] underline-offset-2 hover:underline"
            >
              contact@derekyuan.co.uk
            </a>{" "}
            and we will process your request within 30 days.
          </p>
        </Section>

        <Section title="7. Your rights (GDPR / UK GDPR)">
          <p>
            If you are located in the United Kingdom or European Economic Area, you have the
            following rights regarding your personal data:
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <strong className="font-medium text-[var(--text-strong)]">Access</strong> — request a
              copy of the personal data we hold about you
            </li>
            <li>
              <strong className="font-medium text-[var(--text-strong)]">Rectification</strong> —
              request correction of inaccurate data
            </li>
            <li>
              <strong className="font-medium text-[var(--text-strong)]">Erasure</strong> — request
              deletion of your account and data
            </li>
            <li>
              <strong className="font-medium text-[var(--text-strong)]">Portability</strong> —
              request your data in a machine-readable format
            </li>
            <li>
              <strong className="font-medium text-[var(--text-strong)]">Objection</strong> — object
              to certain processing of your data
            </li>
          </ul>
          <p>
            To exercise any of these rights, contact us at{" "}
            <a
              href="mailto:contact@derekyuan.co.uk"
              className="text-[var(--accent-mint)] underline-offset-2 hover:underline"
            >
              contact@derekyuan.co.uk
            </a>
            .
          </p>
        </Section>

        <Section title="8. Cookies">
          <p>
            StockTracker uses only strictly necessary cookies to maintain your authenticated
            session. We do not use tracking cookies or third-party analytics cookies. You can delete
            session cookies by signing out or clearing your browser cookies, but doing so will
            require you to sign in again.
          </p>
        </Section>

        <Section title="9. Children's privacy">
          <p>
            StockTracker is not directed at children under 13 years of age. We do not knowingly
            collect personal data from children. If you believe a child has provided us with
            personal information, please contact us and we will delete it promptly.
          </p>
        </Section>

        <Section title="10. Changes to this policy">
          <p>
            We may update this Privacy Policy from time to time. The date at the top of this page
            indicates when it was last revised. Continued use of StockTracker after any changes
            constitutes acceptance of the updated policy.
          </p>
        </Section>

        <Section title="11. Contact">
          <p>
            If you have any questions or concerns about this Privacy Policy, please contact:{" "}
            <a
              href="mailto:contact@derekyuan.co.uk"
              className="text-[var(--accent-mint)] underline-offset-2 hover:underline"
            >
              contact@derekyuan.co.uk
            </a>
          </p>
        </Section>
      </div>
    </PublicShell>
  );
}
