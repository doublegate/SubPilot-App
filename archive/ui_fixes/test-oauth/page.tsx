'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function TestOAuthPage() {
  const [log, setLog] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    setLog(prev => [...prev, `${timestamp}: ${message}`]);
    console.log(`${timestamp}: ${message}`);
  };

  const handleOAuthClick = async (provider: 'google' | 'github') => {
    addLog(`OAuth button clicked: ${provider}`);
    setIsLoading(true);

    try {
      addLog(`Calling signIn for ${provider}...`);
      await signIn(provider, { callbackUrl: '/dashboard' });
      addLog(`signIn called successfully for ${provider}`);
    } catch (error) {
      addLog(`Error: ${error}`);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-md p-8">
      <h1 className="mb-6 text-2xl font-bold">OAuth Button Test</h1>

      <div className="space-y-4">
        <div>
          <h2 className="mb-2 text-lg font-semibold">Simple Button Test</h2>
          <button
            onClick={() => addLog('Simple button clicked')}
            className="w-full rounded bg-gray-200 p-2 hover:bg-gray-300"
          >
            Test Simple Click
          </button>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">Google OAuth</h2>
          <button
            type="button"
            onClick={() => handleOAuthClick('google')}
            disabled={isLoading}
            className="w-full rounded bg-blue-500 p-3 text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Sign in with Google'}
          </button>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">GitHub OAuth</h2>
          <button
            type="button"
            onClick={() => handleOAuthClick('github')}
            disabled={isLoading}
            className="w-full rounded bg-gray-800 p-3 text-white hover:bg-gray-900 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Sign in with GitHub'}
          </button>
        </div>

        <div className="mt-8 rounded bg-gray-100 p-4">
          <h2 className="mb-2 text-lg font-semibold">Event Log</h2>
          <div className="max-h-64 space-y-1 overflow-y-auto font-mono text-sm">
            {log.length === 0 ? (
              <p className="text-gray-500">No events yet. Click a button!</p>
            ) : (
              log.map((entry, i) => (
                <div key={i} className="text-xs text-gray-700">
                  {entry}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="text-sm text-gray-600">
          <p>Open Developer Console (F12) to see console logs</p>
        </div>
      </div>
    </div>
  );
}
