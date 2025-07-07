import { NextResponse } from 'next/server';

export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    vercelUrl: process.env.VERCEL_URL,

    // 1. Raw environment variables
    rawEnvironment: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      GOOGLE_CLIENT_ID: {
        exists: process.env.GOOGLE_CLIENT_ID !== undefined,
        isEmpty: process.env.GOOGLE_CLIENT_ID === '',
        length: process.env.GOOGLE_CLIENT_ID?.length || 0,
        preview: process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...',
      },
      GOOGLE_CLIENT_SECRET: {
        exists: process.env.GOOGLE_CLIENT_SECRET !== undefined,
        isEmpty: process.env.GOOGLE_CLIENT_SECRET === '',
        length: process.env.GOOGLE_CLIENT_SECRET?.length || 0,
      },
      GITHUB_CLIENT_ID: {
        exists: process.env.GITHUB_CLIENT_ID !== undefined,
        isEmpty: process.env.GITHUB_CLIENT_ID === '',
        length: process.env.GITHUB_CLIENT_ID?.length || 0,
        preview: process.env.GITHUB_CLIENT_ID?.substring(0, 20) + '...',
      },
      GITHUB_CLIENT_SECRET: {
        exists: process.env.GITHUB_CLIENT_SECRET !== undefined,
        isEmpty: process.env.GITHUB_CLIENT_SECRET === '',
        length: process.env.GITHUB_CLIENT_SECRET?.length || 0,
      },
    },

    // 2. Check env validation
    envValidation: {
      skipValidation: process.env.SKIP_ENV_VALIDATION,
      validatedEnv: null as any,
      envError: null as any,
    },

    // 3. Check available providers
    providers: {
      available: null as any,
      error: null as any,
    },

    // 4. Check auth config
    authConfig: {
      providers: null as any,
      error: null as any,
    },

    // 5. NextAuth endpoints
    endpoints: {
      providers: null as any,
      session: null as any,
      csrf: null as any,
    },

    // 6. Recommendations
    recommendations: [] as string[],
  };

  // Check validated env
  try {
    const { env } = await import('@/env');
    diagnostics.envValidation.validatedEnv = {
      GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID || 'undefined',
      GOOGLE_CLIENT_SECRET: !!env.GOOGLE_CLIENT_SECRET,
      GITHUB_CLIENT_ID: env.GITHUB_CLIENT_ID || 'undefined',
      GITHUB_CLIENT_SECRET: !!env.GITHUB_CLIENT_SECRET,
    };
  } catch (error) {
    diagnostics.envValidation.envError =
      error instanceof Error ? error.message : String(error);
  }

  // Check available providers
  try {
    const { getAvailableProviders } = await import('@/lib/auth-providers');
    diagnostics.providers.available = getAvailableProviders();
  } catch (error) {
    diagnostics.providers.error =
      error instanceof Error ? error.message : String(error);
  }

  // Check auth config
  try {
    const { authConfig } = await import('@/server/auth.config');
    diagnostics.authConfig.providers = authConfig.providers.map((p: any) => ({
      id: p.id || p.type,
      type: p.type,
      name: p.name,
    }));
  } catch (error) {
    diagnostics.authConfig.error =
      error instanceof Error ? error.message : String(error);
  }

  // Check NextAuth endpoints
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'http://localhost:3000';

  const checkEndpoint = async (path: string) => {
    try {
      const response = await fetch(`${baseUrl}/api/auth/${path}`);
      return {
        status: response.status,
        ok: response.ok,
        data: response.ok
          ? await response.text().then(text => {
              try {
                return JSON.parse(text);
              } catch {
                return text;
              }
            })
          : null,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  };

  diagnostics.endpoints.providers = await checkEndpoint('providers');
  diagnostics.endpoints.session = await checkEndpoint('session');
  diagnostics.endpoints.csrf = await checkEndpoint('csrf');

  // Generate recommendations
  if (
    diagnostics.rawEnvironment.GOOGLE_CLIENT_ID.isEmpty ||
    diagnostics.rawEnvironment.GOOGLE_CLIENT_SECRET.isEmpty
  ) {
    diagnostics.recommendations.push(
      'Google OAuth credentials appear to be empty strings. Check Vercel environment variables.'
    );
  }

  if (
    diagnostics.rawEnvironment.GITHUB_CLIENT_ID.isEmpty ||
    diagnostics.rawEnvironment.GITHUB_CLIENT_SECRET.isEmpty
  ) {
    diagnostics.recommendations.push(
      'GitHub OAuth credentials appear to be empty strings. Check Vercel environment variables.'
    );
  }

  if (!diagnostics.rawEnvironment.NEXTAUTH_URL && !process.env.VERCEL_URL) {
    diagnostics.recommendations.push(
      'NEXTAUTH_URL is not set and VERCEL_URL is not available. OAuth callbacks may fail.'
    );
  }

  if (
    diagnostics.envValidation.validatedEnv &&
    !diagnostics.envValidation.validatedEnv.GOOGLE_CLIENT_ID &&
    diagnostics.rawEnvironment.GOOGLE_CLIENT_ID.exists
  ) {
    diagnostics.recommendations.push(
      'Environment validation is stripping out OAuth credentials. Check for empty strings or validation rules.'
    );
  }

  return NextResponse.json(diagnostics, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
