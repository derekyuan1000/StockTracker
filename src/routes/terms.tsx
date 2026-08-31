import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell } from "@/components/PublicShell";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
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

function TermsPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-[720px] py-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
          Last updated: 31 August 2026
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--text-strong)]">
          Terms &amp; Conditions
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-[var(--text-body)]">
          Please read these Terms &amp; Conditions ("Terms") carefully before using StockTracker
          ("the Service"). By accessing or using StockTracker you agree to be bound by these Terms.
          If you do not agree, do not use the Service.
        </p>

        <Section title="1. About the Service">
          <p>
            StockTracker is a personal portfolio tracking tool operated by Derek Yuan, an individual
            developer based in the United Kingdom. The Service allows you to record and analyse your
            own investment portfolio for personal, non-commercial purposes.
          </p>
        </Section>

        <Section title="2. Not financial advice">
          <p className="rounded-md border border-amber-500/30 bg-amber-500/8 px-4 py-3 font-medium text-amber-700 dark:text-amber-400">
            StockTracker is a portfolio tracking and organisational tool only. Nothing on this
            platform constitutes financial, investment, tax, or legal advice. All information
            displayed — including prices, performance figures, and research notes — is for
            informational purposes only and should not be relied upon when making investment
            decisions.
          </p>
          <p>
            Always consult a qualified financial adviser before making investment decisions. Past
            performance shown in the app is not indicative of future results.
          </p>
        </Section>

        <Section title="3. Data accuracy">
          <p>
            Market data (prices, fundamentals, and historical data) is sourced from Yahoo Finance
            and may be delayed, incomplete, or inaccurate. We make no warranties as to the accuracy,
            timeliness, or completeness of any market data displayed. You are solely responsible for
            verifying any information before acting on it.
          </p>
        </Section>

        <Section title="4. Eligibility and accounts">
          <p>
            You must be at least 13 years old to use StockTracker. By creating an account you
            represent that you meet this requirement. You are responsible for maintaining the
            security of your account and all activity that occurs under it.
          </p>
          <p>
            We reserve the right to suspend or terminate accounts that we reasonably believe are
            being used in violation of these Terms, without prior notice.
          </p>
        </Section>

        <Section title="5. Acceptable use">
          <p>You agree not to:</p>
          <ul className="ml-5 list-disc space-y-1">
            <li>Use the Service for any unlawful purpose or in violation of any applicable law</li>
            <li>Attempt to gain unauthorised access to other users' accounts or data</li>
            <li>Scrape, crawl, or systematically extract data from the Service</li>
            <li>
              Reverse-engineer, decompile, or otherwise attempt to derive the source code (beyond
              what is publicly available under the MIT licence)
            </li>
            <li>Upload or transmit any malicious code, viruses, or disruptive content</li>
            <li>
              Use the Service in a way that could damage, disable, or impair our servers or networks
            </li>
          </ul>
        </Section>

        <Section title="6. Community and public profiles">
          <p>
            If you opt in to a public portfolio, you grant us a non-exclusive, royalty-free licence
            to display your name and trade history to other users of the Service. You can revoke
            this at any time by disabling public portfolio in Settings.
          </p>
          <p>
            You are solely responsible for any content you enter into the Service, including
            research notes, thesis text, and community-visible trades. Do not enter confidential,
            defamatory, or unlawful content.
          </p>
        </Section>

        <Section title="7. Intellectual property">
          <p>
            The StockTracker source code is released under the{" "}
            <a
              href="https://github.com/derekyuan1000/StockTracker/blob/master/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent-mint)] underline-offset-2 hover:underline"
            >
              MIT Licence
            </a>
            . The StockTracker name, logo, and visual design remain the intellectual property of
            Derek Yuan and may not be reused without permission.
          </p>
          <p>
            Your portfolio data remains your own. We claim no ownership over the investment
            information you enter.
          </p>
        </Section>

        <Section title="8. Availability and changes">
          <p>
            We provide the Service on a best-effort basis with no uptime guarantee. We may modify,
            suspend, or discontinue the Service (or any part of it) at any time, with or without
            notice. We will not be liable to you for any such modification or discontinuation.
          </p>
        </Section>

        <Section title="9. Limitation of liability">
          <p>
            To the fullest extent permitted by applicable law, Derek Yuan shall not be liable for
            any indirect, incidental, special, consequential, or punitive damages arising from your
            use of — or inability to use — the Service. This includes, without limitation, any
            investment losses, loss of data, or loss of profits, even if we have been advised of the
            possibility of such damages.
          </p>
          <p>
            Our total liability to you for any claim arising from these Terms or your use of the
            Service shall not exceed the amount you paid us in the twelve months preceding the claim
            (which, given the Service is currently free, is zero).
          </p>
        </Section>

        <Section title="10. Disclaimer of warranties">
          <p>
            The Service is provided "as is" and "as available" without warranty of any kind, express
            or implied, including but not limited to warranties of merchantability, fitness for a
            particular purpose, or non-infringement. We do not warrant that the Service will be
            error-free, secure, or uninterrupted.
          </p>
        </Section>

        <Section title="11. Governing law">
          <p>
            These Terms are governed by and construed in accordance with the laws of England and
            Wales. Any disputes arising under or in connection with these Terms shall be subject to
            the exclusive jurisdiction of the courts of England and Wales.
          </p>
        </Section>

        <Section title="12. Changes to these Terms">
          <p>
            We may update these Terms from time to time. The date at the top of this page indicates
            when they were last revised. Continued use of the Service after any changes constitutes
            acceptance of the updated Terms.
          </p>
        </Section>

        <Section title="13. Contact">
          <p>
            If you have any questions about these Terms, please contact:{" "}
            <a
              href="mailto:contact@derekyuan.co.uk"
              className="text-[var(--accent-mint)] underline-offset-2 hover:underline"
            >
              contact@derekyuan.co.uk
            </a>
          </p>
          <p className="mt-4">
            See also:{" "}
            <Link
              to="/privacy"
              className="text-[var(--accent-mint)] underline-offset-2 hover:underline"
            >
              Privacy Policy
            </Link>
          </p>
        </Section>
      </div>
    </PublicShell>
  );
}
