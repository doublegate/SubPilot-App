// Use the production fix configuration
import {
  auth,
  handlers,
  signIn,
  signOut,
  debugAuth,
} from '@/server/auth-production-fix';

// Re-export auth as getServerAuthSession for backward compatibility
export const getServerAuthSession = auth;

// Export everything
export { auth, handlers, signIn, signOut, debugAuth };
