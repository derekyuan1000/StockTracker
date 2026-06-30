import { createAuthClient } from "better-auth/react";

// Browser auth client. baseURL defaults to the current origin, which is what we
// want (the /api/auth/* handler lives on the same app).
export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;
