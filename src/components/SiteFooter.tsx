import { Github, Linkedin, Mail, Coffee, Globe } from "lucide-react";

export function SiteFooter() {
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

  return (
    <footer className="border-t border-hairline bg-canvas">
      <div className="mx-auto max-w-[1440px] px-6 py-6">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-4">
            {social.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target={l.href.startsWith("mailto") ? undefined : "_blank"}
                rel="noopener noreferrer"
                aria-label={l.label}
                className="text-text-muted transition-colors hover:text-text-body"
              >
                {l.icon}
              </a>
            ))}
          </div>
          <p className="text-[11px] text-text-muted">
            &copy; 2026 Derek Yuan. All rights reserved.
          </p>
        </div>
        <p className="mt-3 text-[10px] text-text-muted opacity-70">
          Prices delayed up to 15 min. Demonstration data. Not investment advice.
        </p>
      </div>
    </footer>
  );
}
