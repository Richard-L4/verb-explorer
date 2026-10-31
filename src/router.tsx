/*
 * Creates the router used by TanStack Start from routeTree.gen.ts (generated, not edited).
 * A fresh QueryClient holds cached request data for each router; __root.tsx shares it
 * with child pages through React context, so they use the same cache.
 */
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Treat preloaded route data as stale immediately so navigation can refresh it.
    defaultPreloadStaleTime: 0,
  });

  return router;
};
