'use client';

export default function TestMinimalPage() {
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: '30px' }}>Minimal Component Test</h1>

      {/* Native Theme Toggle */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '20px' }}>Native Theme Toggle</h2>
        <button
          onClick={() => {
            console.log('Theme toggle clicked!');
            alert('Theme toggle works!');
          }}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          🌓 Toggle Theme
        </button>
      </div>

      {/* Native OAuth Buttons */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '20px' }}>Native OAuth Buttons</h2>
        <div
          style={{
            display: 'flex',
            gap: '10px',
            flexDirection: 'column',
            maxWidth: '300px',
          }}
        >
          <button
            onClick={() => {
              console.log('Google sign in clicked!');
              alert('Google sign in works!');
            }}
            style={{
              padding: '12px 20px',
              fontSize: '16px',
              backgroundColor: '#4285F4',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            🔍 Sign in with Google
          </button>

          <button
            onClick={() => {
              console.log('GitHub sign in clicked!');
              alert('GitHub sign in works!');
            }}
            style={{
              padding: '12px 20px',
              fontSize: '16px',
              backgroundColor: '#24292e',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            🐙 Sign in with GitHub
          </button>

          <button
            onClick={() => {
              console.log('Email sign in clicked!');
              alert('Email sign in works!');
            }}
            style={{
              padding: '12px 20px',
              fontSize: '16px',
              backgroundColor: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✉️ Sign in with Email
          </button>
        </div>
      </div>

      {/* Test Radix UI Slot Issue */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '20px' }}>Progressive Enhancement Test</h2>
        <p style={{ marginBottom: '10px' }}>
          If the buttons above work, we'll add complexity here:
        </p>

        {/* Step 1: Basic div that looks like a button */}
        <div
          onClick={() => console.log('Div button clicked!')}
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            backgroundColor: '#e5e7eb',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '10px',
          }}
        >
          Div as Button
        </div>

        <br />

        {/* Step 2: Button with more complex structure */}
        <button
          onClick={() => console.log('Complex button clicked!')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚡</span>
            <span>Button with nested elements</span>
          </span>
        </button>
      </div>

      {/* Console output helper */}
      <div
        style={{
          marginTop: '40px',
          padding: '20px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
        }}
      >
        <h3 style={{ marginBottom: '10px' }}>Instructions:</h3>
        <ol style={{ marginLeft: '20px' }}>
          <li>Open browser console (F12)</li>
          <li>Click each button above</li>
          <li>Check console for log messages</li>
          <li>All buttons should show both console.log and alert</li>
        </ol>
      </div>
    </div>
  );
}
