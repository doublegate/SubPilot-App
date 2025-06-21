import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function useAuth(requireAuth = false) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (requireAuth && status === 'unauthenticated') {
      router.push('/login');
    }
  }, [requireAuth, status, router]);

  const login = (provider?: string) => {
    void signIn(provider, { callbackUrl: '/dashboard' });
  };

  const logout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return {
    user: session?.user,
    session,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    login,
    logout,
  };
}
