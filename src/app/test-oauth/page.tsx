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
    <div className="container mx-auto p-8 max-w-md">
      <h1 className="text-2xl font-bold mb-6">OAuth Button Test</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">Simple Button Test</h2>
          <button
            onClick={() => addLog('Simple button clicked')}
            className="w-full p-2 bg-gray-200 hover:bg-gray-300 rounded"
          >
            Test Simple Click
          </button>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Google OAuth</h2>
          <button
            type="button"
            onClick={() => handleOAuthClick('google')}
            disabled={isLoading}
            className="w-full p-3 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Sign in with Google'}
          </button>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">GitHub OAuth</h2>
          <button
            type="button"
            onClick={() => handleOAuthClick('github')}
            disabled={isLoading}
            className="w-full p-3 bg-gray-800 text-white rounded hover:bg-gray-900 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Sign in with GitHub'}
          </button>
        </div>

        <div className="mt-8 p-4 bg-gray-100 rounded">
          <h2 className="text-lg font-semibold mb-2">Event Log</h2>
          <div className="space-y-1 text-sm font-mono max-h-64 overflow-y-auto">
            {log.length === 0 ? (
              <p className="text-gray-500">No events yet. Click a button!</p>
            ) : (
              log.map((entry, i) => (
                <div key={i} className="text-gray-700 text-xs">{entry}</div>
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