import { auth } from '~/server/auth.config';
export { auth, handlers, signIn, signOut } from '~/server/auth.config';

// Re-export auth as getServerAuthSession for backward compatibility
export const getServerAuthSession = auth;
