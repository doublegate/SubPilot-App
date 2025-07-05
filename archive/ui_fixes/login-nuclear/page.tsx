import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/server/auth';
import { NuclearLoginForm } from '@/components/auth/nuclear-login-form';
import { headers } from 'next/headers';

// Nuclear Theme Toggle - Server Component compatible
function NuclearThemeToggleServer() {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              const theme = localStorage.getItem('theme') || 'light';
              if (theme === 'dark') {
                document.documentElement.classList.add('dark');
              }
              
              window.toggleTheme = function() {
                const isDark = document.documentElement.classList.contains('dark');
                const newTheme = isDark ? 'light' : 'dark';
                
                if (newTheme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
                
                localStorage.setItem('theme', newTheme);
                
                // Update button text
                const btn = document.getElementById('nuclear-theme-btn');
                if (btn) btn.textContent = newTheme === 'light' ? '🌙' : '☀️';
              }
            })();
          `,
        }}
      />
      <button
        id="nuclear-theme-btn"
        onClick={() => {}}
        className="fixed right-4 top-4 z-50 rounded-md bg-gray-200 p-2 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
        dangerouslySetInnerHTML={{
          __html: `
            <script>
              document.currentScript.parentElement.onclick = window.toggleTheme;
              document.currentScript.parentElement.textContent = 
                document.documentElement.classList.contains('dark') ? '☀️' : '🌙';
            </script>
          `,
        }}
      />
    </>
  );
}

export default async function NuclearLoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect('/dashboard');
  }

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <Link href="/" className="absolute left-4 top-4 md:left-8 md:top-8">
        <span className="text-lg font-semibold">SubPilot (Nuclear)</span>
      </Link>
      <NuclearThemeToggleServer />
      <main className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back (Nuclear Version)
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your account to continue
          </p>
        </div>
        <NuclearLoginForm />
        <p className="px-8 text-center text-sm text-muted-foreground">
          <Link
            href="/signup"
            className="hover:text-brand underline underline-offset-4"
          >
            Don&apos;t have an account? Sign Up
          </Link>
        </p>
      </main>
    </div>
  );
}
