import { Link } from "@tanstack/react-router";
import { Github, Linkedin, Mail, Coffee, Globe } from "lucide-react";

const social = [
  {
    href: "https://github.com/derekyuan1000",
    icon: <Github className="size-4" />,
    label: "GitHub",
  },
  {
    href: "https://www.linkedin.com/in/derek-yuan-6900a6406/",
    icon: <Linkedin className="size-4" />,
    label: "LinkedIn",
  },
  { href: "mailto:contact@derekyuan.co.uk", icon: <Mail className="size-4" />, label: "Email" },
  { href: "https://ko-fi.com/derekyuan", icon: <Coffee className="size-4" />, label: "Ko-fi" },
  {
    href: "https://www.derekyuan.co.uk",
    icon: <Globe className="size-4" />,
    label: "derekyuan.co.uk",
  },
];

const navColumns: {
  heading: string;
  links: { label: string; to?: string; href?: string }[];
}[] = [
  {
    heading: "Portfolio",
    links: [
      { label: "Summary", to: "/dashboard" },
      { label: "Holdings", to: "/holdings" },
      { label: "Transactions", to: "/transactions" },
      { label: "Cash", to: "/cash" },
    ],
  },
  {
    heading: "Research",
    links: [
      { label: "Fundamentals", to: "/fundamentals" },
      { label: "Research", to: "/research" },
      { label: "Community", to: "/community" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Settings", to: "/settings" },
      { label: "Sign in", to: "/login" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-[var(--canvas-dark)] text-[var(--on-dark)]">
      <div className="mx-auto max-w-[1200px] px-6 py-20">
        {/* Upper: nav columns */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4">
          {navColumns.map((col) => (
            <div key={col.heading}>
              <p className="eyebrow text-white/40">{col.heading}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="text-[15px] text-white/70 transition-colors hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="eyebrow text-white/40">Connect</p>
            <ul className="mt-4 space-y-2.5">
              {social.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    target={l.href.startsWith("mailto") ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[15px] text-white/70 transition-colors hover:text-white"
                  >
                    <span className="text-white/50">{l.icon}</span>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Massive gradient-hairline wordmark banner */}
        <div className="mt-16 overflow-hidden border-t border-white/10 pt-8">
          <p
            className="select-none pointer-events-none text-[clamp(4rem,15vw,12rem)] font-medium leading-none tracking-[-0.03em]"
            style={{
              background: "var(--gradient-brand)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              opacity: 0.15,
            }}
          >
            STOCKTRACKER
          </p>
        </div>

        {/* Legal / copyright */}
        <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-white/40">
            &copy; 2026 Derek Yuan · All rights reserved
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-white/30">
            Prices delayed up to 15 min · Demonstration data · Not investment advice
          </p>
        </div>
      </div>
    </footer>
  );
}
