import "server-only"

import { headers } from "next/headers"
import { cache } from "react"

import { appRouter } from "@/server/api/root"
import { createTRPCContext } from "@/server/api/trpc"

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
/**
 * The server-side tRPC API.
 * @example const hello = await api.example.hello({ text: "from tRPC" });
 */
export const api = appRouter.createCaller(
  cache(async () => {
    const heads = new Headers(await headers())
    heads.set("x-trpc-source", "rsc")

    return createTRPCContext({
      headers: heads,
    })
  })
)