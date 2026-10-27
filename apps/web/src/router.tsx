import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { routeTree } from "./routeTree.gen";
import type { RouterContext } from "./routes/__root";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    context: { queryClient } satisfies RouterContext,
    defaultPreload: "intent",
    scrollRestoration: true,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}

declare module "@tanstack/react-router" {
  interface RouterContext {
    queryClient: QueryClient;
  }
}
