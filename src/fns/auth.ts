import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "@/server/auth";

// Reads the better-auth session from the incoming request cookies. Returns
// null when the caller is not signed in. Used by the root route guard and the
// header to decide auth state.
export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const session = await auth.api.getSession({ headers: getRequest().headers });
  return session ?? null;
});
