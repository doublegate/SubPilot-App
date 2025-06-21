import "server-only"

import { headers } from "next/headers"
import { cache } from "react"

import { appRouter } from "@/server/api/root"
import { createTRPCContext } from "@/server/api/trpc"
import { createTRPCProxyClient, loggerLink, TRPCClientError } from "@trpc/client"
import { callProcedure } from "@trpc/server"
import type { TRPCErrorResponse } from "@trpc/server/rpc"
import { transformer } from "./shared"

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
const createContext = cache(() => {
  const heads = new Headers(headers())
  heads.set("x-trpc-source", "rsc")

  return createTRPCContext({
    headers: heads,
  })
})

export const api = createTRPCProxyClient<typeof appRouter>({
  transformer,
  links: [
    loggerLink({
      enabled: (op) =>
        process.env.NODE_ENV === "development" ||
        (op.direction === "down" && op.result instanceof Error),
    }),
    /**
     * Custom RSC link that lets us invoke procedures without using http requests. Since Server
     * Components always run on the server, we can just call the procedure as a function.
     */
    () =>
      ({ op }) =>
        callProcedure({
          procedures: appRouter._def.procedures,
          path: op.path,
          rawInput: op.input,
          ctx: createContext(),
          type: op.type,
        }),
  ],
})