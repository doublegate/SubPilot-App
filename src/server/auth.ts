// Temporarily use the v5 fix config to resolve OAuth issues
import { auth } from '@/server/auth-v5-fix.config';
export { auth, handlers, signIn, signOut } from '@/server/auth-v5-fix.config';

// Re-export auth as getServerAuthSession for backward compatibility
export const getServerAuthSession = auth;
