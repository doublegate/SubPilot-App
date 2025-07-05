'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ThemeToggleStandalone } from '@/components/theme-toggle-standalone';

// Dynamically import ParticleBackground with loading state and error boundary
const ParticleBackground = dynamic(
  () => import('@/components/ui/particle-background'),
  {
    loading: () => null, // No loading spinner to avoid layout shift
    ssr: false, // Disable SSR for client-side animation
  }
);

export default function HomePage() {
  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-cyan-50 to-purple-50 dark:from-gray-900 dark:to-gray-800"
    >
      <ParticleBackground
        particleCount={150}
        opacity={0.3}
        className="transition-opacity duration-500"
      />
      <ThemeToggleStandalone />
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 relative z-10">
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 sm:text-[5rem]">
          Sub<span className="text-cyan-600 dark:text-cyan-400">Pilot</span>
        </h1>
        <p className="max-w-lg text-center text-xl text-gray-600 dark:text-gray-300">
          The command center for recurring finances ... monitor, manage, and
          cancel subscriptions automatically.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
          <Link
            className="flex h-48 max-w-xs flex-col items-center justify-center gap-4 rounded-xl bg-white/80 p-6 text-left text-gray-900 shadow-lg hover:bg-white/90 dark:bg-gray-800/80 dark:text-gray-100 dark:hover:bg-gray-800/90"
            href="/dashboard"
          >
            <h2 className="text-2xl font-bold">Get Started →</h2>
            <div className="text-lg">
              Connect your bank account and track subscriptions ...
            </div>
          </Link>
          <Link
            className="flex h-48 max-w-xs flex-col items-center justify-center gap-4 rounded-xl bg-white/80 p-6 text-left text-gray-900 shadow-lg hover:bg-white/90 dark:bg-gray-800/80 dark:text-gray-100 dark:hover:bg-gray-800/90"
            href="/login"
          >
            <h2 className="text-2xl font-bold">Sign In →</h2>
            <div className="text-lg">
              Already have an account? Sign in and view the dashboard ...
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
