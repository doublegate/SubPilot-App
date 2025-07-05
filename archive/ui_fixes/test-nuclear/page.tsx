'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

export default function TestNuclearPage() {
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toISOString()}: ${result}`]);
  };

  const testOAuthDirect = async (provider: string) => {
    addResult(`Testing direct OAuth with ${provider}...`);
    try {
      await signIn(provider, { redirect: false });
      addResult(`✅ OAuth ${provider} call successful (redirect prevented)`);
    } catch (error) {
      addResult(`❌ OAuth ${provider} error: ${error}`);
    }
  };

  const testLocalStorage = () => {
    addResult('Testing localStorage access...');
    try {
      localStorage.setItem('test-nuclear', 'working');
      const value = localStorage.getItem('test-nuclear');
      if (value === 'working') {
        addResult('✅ localStorage working');
      } else {
        addResult('❌ localStorage read failed');
      }
      localStorage.removeItem('test-nuclear');
    } catch (error) {
      addResult(`❌ localStorage error: ${error}`);
    }
  };

  const testThemeToggle = () => {
    addResult('Testing theme toggle...');
    try {
      const isDark = document.documentElement.classList.contains('dark');
      if (isDark) {
        document.documentElement.classList.remove('dark');
        addResult('✅ Removed dark class');
      } else {
        document.documentElement.classList.add('dark');
        addResult('✅ Added dark class');
      }
    } catch (error) {
      addResult(`❌ Theme toggle error: ${error}`);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="mb-8 text-3xl font-bold">Nuclear Option Test Page</h1>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Test Controls</h2>

          <div className="space-y-2">
            <button
              onClick={() => testOAuthDirect('google')}
              className="w-full rounded bg-blue-500 p-2 text-white hover:bg-blue-600"
            >
              Test Google OAuth Direct
            </button>

            <button
              onClick={() => testOAuthDirect('github')}
              className="w-full rounded bg-gray-800 p-2 text-white hover:bg-gray-900"
            >
              Test GitHub OAuth Direct
            </button>

            <button
              onClick={testLocalStorage}
              className="w-full rounded bg-green-500 p-2 text-white hover:bg-green-600"
            >
              Test localStorage
            </button>

            <button
              onClick={testThemeToggle}
              className="w-full rounded bg-purple-500 p-2 text-white hover:bg-purple-600"
            >
              Test Theme Toggle
            </button>
          </div>

          <div className="space-y-2 pt-4">
            <h3 className="font-semibold">Navigation</h3>
            <Link href="/" className="block text-blue-500 hover:underline">
              → Home (with theme toggle)
            </Link>
            <Link href="/login" className="block text-blue-500 hover:underline">
              → Login (original)
            </Link>
            <Link
              href="/login-nuclear"
              className="block text-blue-500 hover:underline"
            >
              → Login (nuclear)
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Test Results</h2>
          <div className="h-96 overflow-y-auto rounded bg-gray-100 p-4 dark:bg-gray-800">
            {testResults.length === 0 ? (
              <p className="text-gray-500">No tests run yet...</p>
            ) : (
              <pre className="whitespace-pre-wrap text-xs">
                {testResults.join('\n')}
              </pre>
            )}
          </div>
          <button
            onClick={() => setTestResults([])}
            className="text-sm text-red-500 hover:underline"
          >
            Clear results
          </button>
        </div>
      </div>

      <div className="mt-8 rounded bg-yellow-100 p-4 dark:bg-yellow-900">
        <h3 className="mb-2 font-semibold">Nuclear Implementation Status</h3>
        <ul className="list-inside list-disc space-y-1 text-sm">
          <li>✅ Theme toggle without shadcn/ui Button component</li>
          <li>✅ OAuth buttons without shadcn/ui components</li>
          <li>✅ Direct localStorage access</li>
          <li>✅ Native HTML elements only</li>
          <li>✅ No Radix UI dependencies</li>
        </ul>
      </div>
    </div>
  );
}
