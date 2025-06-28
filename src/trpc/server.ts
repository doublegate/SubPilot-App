import 'server-only';

import { headers } from 'next/headers';

import { appRouter } from '~/server/api/root';
import { createInnerTRPCContext } from '~/server/api/trpc';
import { auth } from '~/server/auth';

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
/**
 * The server-side tRPC API.
 * @example const hello = await api.example.hello({ text: "from tRPC" });
 */
export const api = appRouter.createCaller(async () => {
  // Get the session in the server component context where auth() works properly
  const session = await auth();
  const heads = new Headers(await headers());
  heads.set('x-trpc-source', 'rsc');

  return createInnerTRPCContext({
    session,
    headers: heads,
  });
});
