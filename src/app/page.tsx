'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

// Dynamically import ParticleBackground with SSR disabled
const ParticleBackground = dynamic(
  () => import('@/components/ui/particle-background'),
  {
    loading: () => <div className="fixed inset-0 pointer-events-none z-0" />,
    ssr: false, // Disable SSR for client-side animation
  }
);

// Nuclear Option: Direct theme toggle implementation
function NuclearThemeToggle() {
  console.log('🔥 NuclearThemeToggle: Component rendering');
  
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.log('🔥 NuclearThemeToggle: useEffect mounting');
    setMounted(true);
    // Get theme from localStorage
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const currentTheme = savedTheme || systemTheme;
    
    console.log('🔥 NuclearThemeToggle: Theme detection', { savedTheme, systemTheme, currentTheme });
    
    setTheme(currentTheme);
    
    // Apply theme to document
    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Debug DOM state after mount
    setTimeout(() => {
      const button = document.querySelector('button[aria-label="Toggle theme"]');
      console.log('🔥 NuclearThemeToggle: Button in DOM?', button);
      if (button) {
        const rect = button.getBoundingClientRect();
        const styles = window.getComputedStyle(button);
        console.log('🔥 NuclearThemeToggle: Button rect', rect);
        console.log('🔥 NuclearThemeToggle: Button styles', {
          display: styles.display,
          visibility: styles.visibility,
          position: styles.position,
          zIndex: styles.zIndex
        });
      }
    }, 100);
  }, []);

  const toggleTheme = () => {
    console.log('🔥 NuclearThemeToggle: Toggle clicked!', { currentTheme: theme });
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    // Save to localStorage
    localStorage.setItem('theme', newTheme);
    
    // Apply to document
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  if (!mounted) {
    console.log('🔥 NuclearThemeToggle: Not mounted, returning null');
    return null;
  }

  console.log('🔥 NuclearThemeToggle: Rendering button, current theme:', theme);
  return (
    <button
      onClick={toggleTheme}
      className="fixed top-4 right-4 z-50 p-2 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}

export default function HomePage() {
  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-cyan-50 to-purple-50 dark:from-gray-900 dark:to-gray-800"
    >
      <ParticleBackground
        particleCount={500} // Increased to match Universal-Blue
        opacity={0.4} // Slightly higher opacity
        stopOnScroll={true} // Stop animation when scrolling (Universal-Blue behavior)
        useImageSeeding={true} // Enable unique patterns based on JSON data
        className="transition-opacity duration-500"
      />
      <NuclearThemeToggle />
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
