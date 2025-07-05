'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';

export default function TestIsolationPage() {
  const [mounted, setMounted] = useState(false);
  const [clicks, setClicks] = useState({ theme: 0, google: 0, github: 0 });

  useEffect(() => {
    setMounted(true);
    console.log('Test Isolation Page mounted');
  }, []);

  const handleThemeClick = () => {
    console.log('Theme button clicked!');
    setClicks(prev => ({ ...prev, theme: prev.theme + 1 }));
    
    // Toggle theme
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  };

  const handleOAuthClick = async (provider: string) => {
    console.log(`OAuth ${provider} clicked!`);
    setClicks(prev => ({ ...prev, [provider]: prev[provider] + 1 }));
    
    try {
      await signIn(provider, { callbackUrl: '/dashboard' });
    } catch (error) {
      console.error(`OAuth ${provider} error:`, error);
    }
  };

  if (!mounted) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen p-8 bg-white dark:bg-black">
      <h1 className="text-2xl font-bold mb-8 text-black dark:text-white">
        Isolation Test - Basic HTML Buttons Only
      </h1>

      <div className="space-y-8">
        {/* Test 1: Basic Theme Toggle */}
        <div className="border p-4 rounded">
          <h2 className="font-bold mb-4">Test 1: Theme Toggle (Basic HTML)</h2>
          <button
            onClick={handleThemeClick}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            style={{ cursor: 'pointer' }}
          >
            Toggle Theme (Clicked: {clicks.theme})
          </button>
          <p className="mt-2 text-sm">Current theme: {document.documentElement.classList.contains('dark') ? 'dark' : 'light'}</p>
        </div>

        {/* Test 2: OAuth Buttons (Basic HTML) */}
        <div className="border p-4 rounded">
          <h2 className="font-bold mb-4">Test 2: OAuth Buttons (Basic HTML)</h2>
          <div className="space-y-2">
            <button
              onClick={() => handleOAuthClick('google')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              style={{ cursor: 'pointer' }}
            >
              Sign in with Google (Clicked: {clicks.google})
            </button>
            <button
              onClick={() => handleOAuthClick('github')}
              className="w-full px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900"
              style={{ cursor: 'pointer' }}
            >
              Sign in with GitHub (Clicked: {clicks.github})
            </button>
          </div>
        </div>

        {/* Test 3: Inline Button Test */}
        <div className="border p-4 rounded">
          <h2 className="font-bold mb-4">Test 3: Inline onClick Test</h2>
          <button
            onClick={() => alert('Inline button clicked!')}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            Click for Alert
          </button>
        </div>

        {/* Debug Info */}
        <div className="border p-4 rounded bg-gray-100 dark:bg-gray-900">
          <h2 className="font-bold mb-4">Debug Info</h2>
          <pre className="text-xs">
            {JSON.stringify({ 
              mounted, 
              clicks,
              userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR'
            }, null, 2)}
          </pre>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8 p-4 bg-yellow-100 dark:bg-yellow-900 rounded">
        <h3 className="font-bold">Instructions:</h3>
        <ol className="list-decimal list-inside mt-2">
          <li>Open browser console (F12)</li>
          <li>Click each button and check console logs</li>
          <li>If these work, the issue is with UI component library</li>
          <li>If these don't work, it's a deeper React/Next.js issue</li>
        </ol>
      </div>
    </div>
  );
}