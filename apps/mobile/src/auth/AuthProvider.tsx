import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { authClient, useSession } from "./client";
import { setUnauthorizedHandler } from "@/api/client";

type AuthContextValue = {
  session: ReturnType<typeof useSession>["data"];
  isPending: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const qc = useQueryClient();

  async function signOut() {
    await authClient.signOut();
    qc.clear();
    router.replace("/login");
  }

  // A 401 from the REST API (expired/invalid session cookie) triggers the same
  // cleanup as an explicit sign-out.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      qc.clear();
      router.replace("/login");
    });
    return () => setUnauthorizedHandler(null);
  }, [qc, router]);

  return (
    <AuthContext.Provider value={{ session, isPending, signOut }}>{children}</AuthContext.Provider>
  );
}
