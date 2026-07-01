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
import { ThemeProvider, themeInitScript } from "@/components/ThemeProvider";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { getSession } from "@/fns/auth";
import { getSettings } from "@/fns/settings";

const PUBLIC_PATHS = ["/", "/community", "/login"];

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 text-text-body">
      <div className="max-w-md text-center">
        <div className="mb-6 flex items-center justify-center">
          <Logo size={20} showWordmark />
        </div>
        <h1 className="num text-7xl font-bold leading-none text-text-strong">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-text-strong">Page not found</h2>
        <p className="mt-2 text-sm text-text-muted">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[#181a20] transition-colors hover:bg-[var(--primary-active)]"
          >
            Go home
          </Link>
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
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 text-text-body">
      <div className="max-w-md text-center">
        <div className="mb-6 flex items-center justify-center">
          <Logo size={20} showWordmark />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-text-strong">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[#181a20] transition-colors hover:bg-[var(--primary-active)]"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-hairline bg-surface px-4 py-2 text-sm font-medium text-text-body transition-colors hover:bg-[var(--surface-elevated)]"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async ({ location }) => {
    const isPublic =
      PUBLIC_PATHS.includes(location.pathname) ||
      location.pathname.startsWith("/api") ||
      location.pathname.startsWith("/profiles/");

    const session = await getSession();

    if (!session) {
      if (!isPublic) throw redirect({ to: "/login" });
      return {};
    }

    // Onboarding gate: redirect new users to /welcome on first login
    if (location.pathname !== "/welcome" && location.pathname !== "/login") {
      const settings = await getSettings();
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
      { name: "theme-color", content: "#0b0e11" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap",
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
    <html lang="en" className="dark">
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
