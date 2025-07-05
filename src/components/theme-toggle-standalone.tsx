'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggleStandalone() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = React.useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [setTheme, theme]);

  // Return a placeholder with the same dimensions to prevent layout shift
  if (!mounted) {
    return (
      <div className="absolute right-4 top-4 md:right-8 md:top-8 h-10 w-10" />
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="absolute right-4 top-4 md:right-8 md:top-8 z-50 border border-border/50 bg-background/50 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground"
      style={{ pointerEvents: 'auto' }}
      data-testid="theme-toggle-button"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
