import { auth } from "@/server/auth";
import { ZodError } from "zod";

export type RouteContext = {
  request: Request;
  params: Record<string, string>;
  query: URLSearchParams;
  userId: string | null;
};

export type RouteEntry = {
  method: string;
  pattern: string; // e.g. "/api/v1/portfolio" or "/api/v1/holdings/:ticker"
  requireAuth: boolean;
  handler: (ctx: RouteContext) => Promise<unknown>;
};

export function ok(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ ok: true, data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function err(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ ok: false, error: { code, message } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function matchRoute(pattern: string, pathname: string): Record<string, string> | null {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    const pp = patternParts[i];
    const up = pathParts[i];
    if (pp.startsWith(":")) {
      params[pp.slice(1)] = decodeURIComponent(up);
    } else if (pp !== up) {
      return null;
    }
  }
  return params;
}

const routes: RouteEntry[] = [];

export function registerRoutes(entries: RouteEntry[]) {
  routes.push(...entries);
}

export async function handleV1(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const pathname = url.pathname;

  for (const route of routes) {
    if (route.method !== method && route.method !== "*") continue;
    const params = matchRoute(route.pattern, pathname);
    if (params === null) continue;

    let userId: string | null = null;
    if (route.requireAuth) {
      const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
      if (!session?.user) {
        // Also check CRON_SECRET for cron endpoints
        const cronSecret = process.env.CRON_SECRET;
        const authHeader = request.headers.get("authorization");
        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
          return err(401, "UNAUTHORIZED", "Authentication required");
        }
      } else {
        userId = session.user.id;
      }
    }

    try {
      const result = await route.handler({
        request,
        params,
        query: url.searchParams,
        userId,
      });
      return ok(result);
    } catch (e) {
      if (e instanceof ZodError) {
        return err(400, "VALIDATION_ERROR", e.errors.map((x) => x.message).join("; "));
      }
      const message = e instanceof Error ? e.message : "Internal server error";
      if (message === "Unauthorized") return err(401, "UNAUTHORIZED", "Authentication required");
      console.error("[API v1]", method, pathname, e);
      return err(500, "INTERNAL_ERROR", "Internal server error");
    }
  }

  return err(404, "NOT_FOUND", `${method} ${pathname} not found`);
}
