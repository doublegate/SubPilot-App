// Use the consolidated auth configuration
import {
  auth,
  handlers,
  signIn,
  signOut,
  getServerAuthSession,
} from '@/server/auth.consolidated';

// Export everything
export { auth, handlers, signIn, signOut, getServerAuthSession };
