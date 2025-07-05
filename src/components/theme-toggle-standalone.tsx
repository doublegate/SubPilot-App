'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { ButtonNoSlot } from '@/components/ui/button-no-slot';

export function ThemeToggleStandalone() {
  console.log('🌓 ThemeToggleStandalone: Component rendering');
  
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  
  console.log('🌓 ThemeToggleStandalone: Current state', { theme, mounted });

  React.useEffect(() => {
    console.log('🌓 ThemeToggleStandalone: useEffect mounting');
    setMounted(true);
    
    // Debug DOM state
    setTimeout(() => {
      const button = document.querySelector('.absolute.right-4.top-4 button');
      console.log('🌓 ThemeToggleStandalone: Button in DOM?', button);
      if (button) {
        const rect = button.getBoundingClientRect();
        const styles = window.getComputedStyle(button);
        console.log('🌓 ThemeToggleStandalone: Button rect', rect);
        console.log('🌓 ThemeToggleStandalone: Button styles', {
          display: styles.display,
          visibility: styles.visibility,
          opacity: styles.opacity,
          zIndex: styles.zIndex,
          pointerEvents: styles.pointerEvents
        });
      }
    }, 100);
  }, []);

  const toggleTheme = React.useCallback(() => {
    console.log('🌓 ThemeToggleStandalone: Toggle clicked!', { currentTheme: theme });
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [setTheme, theme]);

  // Return a placeholder with the same dimensions to prevent layout shift
  if (!mounted) {
    console.log('🌓 ThemeToggleStandalone: Returning placeholder (not mounted)');
    return (
      <div className="absolute right-4 top-4 md:right-8 md:top-8 h-10 w-10" />
    );
  }

  console.log('🌓 ThemeToggleStandalone: Rendering button');
  return (
    <ButtonNoSlot
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
    </ButtonNoSlot>
  );
}
