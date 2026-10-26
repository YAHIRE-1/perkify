import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { AppRouterClient } from "@perkify/api/routers/index";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ENV } from "../src/env";

export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        toast.error(`Error: ${error.message}`, {
          action: {
            label: "retry",
            onClick: () => {
              query.invalidate();
            },
          },
        });
      },
    }),
  });
}

export const queryClient = createQueryClient();

function getServerUrl(url: string) {
  // SAFETY: server-side runtimes expose process.env on globalThis when SERVER_URL is available.
  const processEnv = (
    globalThis as {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env;

  if (typeof window === "undefined" && processEnv?.SERVER_URL) {
    return processEnv.SERVER_URL.endsWith("/")
      ? processEnv.SERVER_URL.slice(0, -1)
      : processEnv.SERVER_URL;
  }

  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export const link = new RPCLink({
  url: `${getServerUrl(ENV.NEXT_PUBLIC_PERKIFY_API_URL)}/rpc`,
  fetch(url, options) {
    return fetch(url, {
      ...options,
      credentials: "include",
    });
  },
});

export const client: AppRouterClient = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
