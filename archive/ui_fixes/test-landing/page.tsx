'use client';

export default function TestLandingPage() {
  return (
    <div
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      {/* Header mimicking landing page */}
      <header
        style={{
          padding: '20px 40px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>SubPilot</div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Theme Toggle - Pure HTML */}
          <button
            onClick={() => {
              console.log('Theme toggle in header clicked!');
              document.body.classList.toggle('dark');
            }}
            style={{
              width: '40px',
              height: '40px',
              padding: '0',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            🌓
          </button>

          {/* Sign In Button - Pure HTML */}
          <button
            onClick={() => console.log('Sign in clicked!')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Sign In
          </button>
        </div>
      </header>

      {/* Main content area */}
      <main style={{ flex: 1, padding: '40px' }}>
        <div
          style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}
        >
          <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>
            Welcome to SubPilot
          </h1>
          <p
            style={{ fontSize: '20px', marginBottom: '40px', color: '#6b7280' }}
          >
            Your subscription management platform
          </p>

          {/* CTA Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '20px',
              justifyContent: 'center',
              marginBottom: '60px',
            }}
          >
            <button
              onClick={() => console.log('Get Started clicked!')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
              }}
            >
              Get Started
            </button>
            <button
              onClick={() => console.log('Learn More clicked!')}
              style={{
                padding: '12px 24px',
                backgroundColor: 'transparent',
                color: '#3b82f6',
                border: '2px solid #3b82f6',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
              }}
            >
              Learn More
            </button>
          </div>

          {/* Test section for OAuth buttons */}
          <div
            style={{
              padding: '40px',
              backgroundColor: '#f9fafb',
              borderRadius: '12px',
              maxWidth: '400px',
              margin: '0 auto',
            }}
          >
            <h2 style={{ marginBottom: '20px' }}>Sign In Options</h2>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
              <button
                onClick={() => console.log('Google OAuth clicked!')}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#fff',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <span>🔍</span> Continue with Google
              </button>
              <button
                onClick={() => console.log('GitHub OAuth clicked!')}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#24292e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <span>🐙</span> Continue with GitHub
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Debug info */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '20px',
          backgroundColor: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          maxWidth: '300px',
        }}
      >
        <h4 style={{ marginBottom: '10px' }}>Debug Panel</h4>
        <p style={{ fontSize: '12px', color: '#6b7280' }}>
          All buttons should log to console when clicked. This page uses NO
          external components.
        </p>
      </div>
    </div>
  );
}
