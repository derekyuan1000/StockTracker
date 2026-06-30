import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "@/server/auth";

// Server-function middleware: resolves the better-auth session from request
// cookies and injects the signed-in user's id into the handler context. Throws
// when there is no session so data functions can never run unscoped.
export const authMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const session = await auth.api.getSession({ headers: getRequest().headers });
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return next({ context: { userId: session.user.id, email: session.user.email } });
});
