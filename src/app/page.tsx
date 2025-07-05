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
      className="flex min-h-screen flex-col items-center justify-center bg-black"
    >
      <ParticleBackground
        particleCount={500} // Increased to be similar to Universal-Blue
        opacity={0.4} // Slightly higher opacity
        stopOnScroll={true} // Stop animation when scrolling (Universal-Blue behavior)
        useImageSeeding={true} // Enable unique patterns based on JSON data
        className="transition-opacity duration-500"
      />
      <ThemeToggleStandalone />
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 relative z-10">
        <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
          Sub<span className="text-cyan-400">Pilot</span>
        </h1>
        <p className="max-w-lg text-center text-xl text-gray-300">
          The command center for recurring finances ... monitor, manage, and
          cancel subscriptions automatically.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
          <Link
            className="flex h-48 max-w-xs flex-col items-center justify-center gap-4 rounded-xl bg-gray-900/80 border border-gray-800 p-6 text-left text-gray-100 shadow-lg hover:bg-gray-900/90 hover:border-gray-700 transition-all"
            href="/dashboard"
          >
            <h2 className="text-2xl font-bold">Get Started →</h2>
            <div className="text-lg text-gray-400">
              Connect your bank account and track subscriptions ...
            </div>
          </Link>
          <Link
            className="flex h-48 max-w-xs flex-col items-center justify-center gap-4 rounded-xl bg-gray-900/80 border border-gray-800 p-6 text-left text-gray-100 shadow-lg hover:bg-gray-900/90 hover:border-gray-700 transition-all"
            href="/login"
          >
            <h2 className="text-2xl font-bold">Sign In →</h2>
            <div className="text-lg text-gray-400">
              Already have an account? Sign in and view the dashboard ...
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
