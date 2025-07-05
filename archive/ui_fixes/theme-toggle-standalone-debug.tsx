'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggleStandaloneDebug() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = React.useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [setTheme, theme]);

  // Don't render anything on the server
  if (!mounted) {
    return (
      <div className="absolute right-4 top-4 h-10 w-10 md:right-8 md:top-8" />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="hover:text-accent-foreground absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:right-8 md:top-8"
      aria-label="Toggle theme"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
