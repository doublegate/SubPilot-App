'use client';

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function TestThemePage() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div style={{ padding: '40px' }}>
        <p>Loading theme test...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: '30px' }}>Theme System Test</h1>
      
      {/* Display current theme info */}
      <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
        <h3>Current Theme State:</h3>
        <p>Theme: {theme}</p>
        <p>Resolved Theme: {resolvedTheme}</p>
        <p>Mounted: {mounted ? 'Yes' : 'No'}</p>
      </div>

      {/* Test 1: Basic theme toggle with native button */}
      <div style={{ marginBottom: '30px' }}>
        <h3>Test 1: Native Button Theme Toggle</h3>
        <button
          onClick={() => {
            const newTheme = theme === 'dark' ? 'light' : 'dark';
            console.log(`Switching theme from ${theme} to ${newTheme}`);
            setTheme(newTheme);
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: theme === 'dark' ? '#374151' : '#e5e7eb',
            color: theme === 'dark' ? '#fff' : '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Toggle Theme (Current: {theme})
        </button>
      </div>

      {/* Test 2: Three-way toggle */}
      <div style={{ marginBottom: '30px' }}>
        <h3>Test 2: Three-way Toggle (Light/Dark/System)</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              console.log('Setting theme to light');
              setTheme('light');
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: theme === 'light' ? '#3b82f6' : '#e5e7eb',
              color: theme === 'light' ? '#fff' : '#000',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ☀️ Light
          </button>
          <button
            onClick={() => {
              console.log('Setting theme to dark');
              setTheme('dark');
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: theme === 'dark' ? '#3b82f6' : '#e5e7eb',
              color: theme === 'dark' ? '#fff' : '#000',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🌙 Dark
          </button>
          <button
            onClick={() => {
              console.log('Setting theme to system');
              setTheme('system');
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: theme === 'system' ? '#3b82f6' : '#e5e7eb',
              color: theme === 'system' ? '#fff' : '#000',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            💻 System
          </button>
        </div>
      </div>

      {/* Test 3: Icon-based toggle */}
      <div style={{ marginBottom: '30px' }}>
        <h3>Test 3: Icon Toggle (Mimics ThemeToggleStandalone)</h3>
        <button
          onClick={() => {
            const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
            console.log(`Icon toggle: ${resolvedTheme} -> ${newTheme}`);
            setTheme(newTheme);
          }}
          style={{
            width: '40px',
            height: '40px',
            padding: '0',
            backgroundColor: 'transparent',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px'
          }}
        >
          {resolvedTheme === 'dark' ? '🌙' : '☀️'}
        </button>
      </div>

      {/* Console helper */}
      <div style={{ 
        marginTop: '40px', 
        padding: '20px', 
        backgroundColor: '#f9fafb',
        borderRadius: '8px'
      }}>
        <h3>Debug Info:</h3>
        <ul>
          <li>Open console to see theme changes</li>
          <li>All buttons should work and change the theme</li>
          <li>The theme state should update above</li>
        </ul>
      </div>
    </div>
  );
}