import { type GetServerSidePropsContext } from "next";
import { auth, authConfig } from "~/server/auth.config";

/**
 * Wrapper for `auth` so that you don't need to import the auth config in every file.
 *
 * @see https://authjs.dev/getting-started/session-management/protecting#nextjs-middleware
 */
export const getServerAuthSession = async (ctx: {
  req: GetServerSidePropsContext["req"];
  res: GetServerSidePropsContext["res"];
}) => {
  return await auth();
};

export { authConfig as authOptions };