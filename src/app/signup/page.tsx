import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/server/auth';
import { LoginForm } from '@/components/auth/login-form';
import { ThemeToggleStandalone } from '@/components/theme-toggle-standalone';
import { getAvailableProviders } from '@/lib/auth-providers';

export default async function SignUpPage() {
  const session = await auth();

  if (session?.user) {
    redirect('/dashboard');
  }

  const availableProviders = getAvailableProviders();

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <Link href="/" className="absolute left-4 top-4 md:left-8 md:top-8">
        <span className="text-lg font-semibold">SubPilot</span>
      </Link>
      <ThemeToggleStandalone />
      <main className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Create an account
          </h1>
          <p className="text-sm text-muted-foreground">
            Get started with your subscription management
          </p>
        </div>
        <LoginForm availableProviders={availableProviders} />
        <p className="px-8 text-center text-sm text-muted-foreground">
          <Link
            href="/login"
            className="hover:text-brand underline underline-offset-4"
          >
            Already have an account? Sign In
          </Link>
        </p>
      </main>
    </div>
  );
}
