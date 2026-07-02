import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  redirect,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { RouteProgress } from "@/components/RouteProgress";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ThemeProvider, themeInitScript } from "@/components/ThemeProvider";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { getSession } from "@/fns/auth";
import { getSettings } from "@/fns/settings";

const PUBLIC_PATHS = ["/", "/community", "/login"];

/** Low-opacity brand gradient ribbon echo for the full-screen state bands. */
function StateRibbon() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-[0.18]"
      style={{
        background:
          "radial-gradient(60% 55% at 78% 30%, rgba(189,187,255,0.5) 0%, transparent 60%)," +
          "radial-gradient(50% 50% at 20% 80%, rgba(252,76,2,0.45) 0%, transparent 55%)",
      }}
    />
  );
}

function NotFoundComponent() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--canvas-dark)] px-6 text-[var(--on-dark)]">
      <StateRibbon />
      <div className="relative max-w-lg text-center">
        <div className="mb-8 flex items-center justify-center">
          <Logo size={22} showWordmark onDark />
        </div>
        <p className="eyebrow text-white/50">404 Not Found</p>
        <h1 className="mt-4 text-6xl font-medium leading-[1.05] tracking-[-0.02em] text-[var(--on-dark)] md:text-7xl">
          Page not found
        </h1>
        <p className="mt-4 text-white/60">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-8 flex justify-center">
          <Button variant="mint" asChild>
            <Link to="/">Go home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--canvas-dark)] px-6 text-[var(--on-dark)]">
      <StateRibbon />
      <div className="relative max-w-lg text-center">
        <div className="mb-8 flex items-center justify-center">
          <Logo size={22} showWordmark onDark />
        </div>
        <p className="eyebrow text-white/50">Error</p>
        <h1 className="mt-4 text-5xl font-medium leading-[1.05] tracking-[-0.02em] text-[var(--on-dark)] md:text-6xl">
          This page didn't load
        </h1>
        <p className="mt-4 text-white/60">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button
            variant="mint"
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Try again
          </Button>
          <Button
            variant="ghost-line"
            className="border-[rgba(242,239,231,0.25)] text-[var(--on-dark)] hover:bg-[rgba(242,239,231,0.08)]"
            asChild
          >
            <a href="/">Go home</a>
          </Button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async ({ location, context }) => {
    const isPublic =
      PUBLIC_PATHS.includes(location.pathname) ||
      location.pathname.startsWith("/api") ||
      location.pathname.startsWith("/profiles/");

    // Cache session for 60s — avoids a server round-trip on every client navigation
    // while still catching expiry within a reasonable window.
    const session = await context.queryClient.fetchQuery({
      queryKey: ["session"],
      queryFn: () => getSession(),
      staleTime: 60_000,
    });

    if (!session) {
      if (!isPublic) throw redirect({ to: "/login" });
      return {};
    }

    // Onboarding gate: redirect new users to /welcome on first login.
    // Cache for 5 min — onboarded flag rarely changes after first login.
    if (location.pathname !== "/welcome" && location.pathname !== "/login") {
      const settings = await context.queryClient.fetchQuery({
        queryKey: ["settings"],
        queryFn: () => getSettings(),
        staleTime: 5 * 60_000,
      });
      if (!settings.onboarded) throw redirect({ to: "/welcome" });
    }

    return { session };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "StockTracker" },
      { name: "description", content: "Stock portfolio tracker." },
      { name: "theme-color", content: "#ffffff" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400;0,14..32,500;0,14..32,600;1,14..32,400&family=JetBrains+Mono:wght@400;500;600;700&display=swap",
      },
    ],
    scripts: [{ children: themeInitScript }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouteProgress />
        <Outlet />
        <Toaster richColors position="bottom-right" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
