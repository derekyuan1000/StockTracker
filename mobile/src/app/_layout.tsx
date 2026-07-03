import { useEffect, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getToken } from "@/api/client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    getToken().then((t) => setIsAuthenticated(!!t));
  }, []);

  useEffect(() => {
    if (isAuthenticated === null) return;
    const inAuthGroup = segments[0] === "(tabs)";
    if (!isAuthenticated && inAuthGroup) {
      router.replace("/login");
    } else if (
      isAuthenticated &&
      !inAuthGroup &&
      segments[0] !== "welcome" &&
      segments[0] !== "auth-callback"
    ) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, segments]);

  return (
    <QueryClientProvider client={queryClient}>
      <Slot />
    </QueryClientProvider>
  );
}
