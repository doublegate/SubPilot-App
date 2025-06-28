'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register service worker
      window.addEventListener('load', async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker registered:', registration);

          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                // New update available
                toast.info(
                  'Update available! Refresh to get the latest version.',
                  {
                    duration: 10000,
                    action: {
                      label: 'Refresh',
                      onClick: () => window.location.reload(),
                    },
                  }
                );
              }
            });
          });

          // Check for updates periodically
          setInterval(
            () => {
              registration.update();
            },
            60 * 60 * 1000
          ); // Check every hour
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      });

      // Handle offline/online events
      window.addEventListener('online', () => {
        toast.success("You're back online!");
      });

      window.addEventListener('offline', () => {
        toast.warning("You're offline. Some features may be limited.");
      });
    }
  }, []);

  return null;
}
