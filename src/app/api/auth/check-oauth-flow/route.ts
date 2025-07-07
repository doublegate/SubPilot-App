import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider') || 'google';

  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    provider,

    // Environment check
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      VERCEL_URL: process.env.VERCEL_URL,
      hasSecret: !!process.env.NEXTAUTH_SECRET,
      envModuleLoaded: false,
      envValues: null,
      envError: null,
    },

    // Provider credentials check
    credentials: {
      google: {
        hasId: !!process.env.GOOGLE_CLIENT_ID,
        hasSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        idLength: process.env.GOOGLE_CLIENT_ID?.length || 0,
        secretLength: process.env.GOOGLE_CLIENT_SECRET?.length || 0,
        idPreview: process.env.GOOGLE_CLIENT_ID?.substring(0, 15) + '...',
      },
      github: {
        hasId: !!process.env.GITHUB_CLIENT_ID,
        hasSecret: !!process.env.GITHUB_CLIENT_SECRET,
        idLength: process.env.GITHUB_CLIENT_ID?.length || 0,
        secretLength: process.env.GITHUB_CLIENT_SECRET?.length || 0,
        idPreview: process.env.GITHUB_CLIENT_ID?.substring(0, 15) + '...',
      },
    },

    // NextAuth endpoints check
    authEndpoints: {
      providers: null as any,
      signin: null as any,
      session: null as any,
      csrf: null as any,
    },

    // OAuth URLs
    oauthUrls: {
      callbackUrl: null as string | null,
      signInUrl: null as string | null,
    },
  };

  // Determine base URL
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    `http://localhost:${process.env.PORT || 3000}`;

  // Check NextAuth endpoints
  const checkEndpoint = async (path: string) => {
    try {
      const response = await fetch(`${baseUrl}/api/auth/${path}`, {
        headers: {
          Accept: 'application/json',
        },
      });

      const result = {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(
          [...response.headers.entries()].filter(
            ([key]) => !key.toLowerCase().includes('cookie')
          )
        ),
        data: null as any,
      };

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          result.data = await response.json();
        } else {
          result.data = await response.text();
        }
      }

      return result;
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  // Check each endpoint
  diagnostics.authEndpoints.providers = await checkEndpoint('providers');
  diagnostics.authEndpoints.signin = await checkEndpoint('signin');
  diagnostics.authEndpoints.session = await checkEndpoint('session');
  diagnostics.authEndpoints.csrf = await checkEndpoint('csrf');

  // Generate OAuth URLs
  diagnostics.oauthUrls.callbackUrl = `${baseUrl}/api/auth/callback/${provider}`;
  diagnostics.oauthUrls.signInUrl = `${baseUrl}/api/auth/signin/${provider}`;

  // Check if the environment validation is the issue
  try {
    // Try to require the env file
    const envModule = await import('@/env');
    diagnostics.environment.envModuleLoaded = true;
    diagnostics.environment.envValues = {
      GOOGLE_CLIENT_ID: !!envModule.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!envModule.env.GOOGLE_CLIENT_SECRET,
      GITHUB_CLIENT_ID: !!envModule.env.GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET: !!envModule.env.GITHUB_CLIENT_SECRET,
    };
  } catch (error) {
    diagnostics.environment.envModuleLoaded = false;
    diagnostics.environment.envError =
      error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(diagnostics, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
