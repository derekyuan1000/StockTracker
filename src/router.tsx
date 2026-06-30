import { QueryClient, dehydrate, hydrate } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { DashboardSkeleton } from "./components/Skeletons";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Loaders block on slow upstream APIs (Yahoo Finance), so surface a
    // skeleton instead of freezing the previous page. The top progress bar
    // (mounted in __root) covers sub-threshold transitions.
    defaultPendingComponent: DashboardSkeleton,
    defaultPendingMs: 250,
    defaultPendingMinMs: 400,
    // Transfer the React Query cache from server → client. Without this the
    // server fills the cache (SSR renders real values) but the client boots
    // with an empty cache, causing a hydration mismatch.
    // Cast past the router's serializable-shape guard: DehydratedState carries an
    // optional in-flight `promise` field that the guard rejects, but React Query
    // strips it during transport. This mirrors the official query integration.
    dehydrate: () => ({ queryClientState: dehydrate(queryClient) }) as { queryClientState: never },
    hydrate: (dehydrated: { queryClientState: unknown }) => {
      hydrate(queryClient, dehydrated.queryClientState as Parameters<typeof hydrate>[1]);
    },
  });

  return router;
};
