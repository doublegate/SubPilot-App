import { NextResponse } from 'next/server';

interface RawEnv {
  NEXTAUTH_URL: string | undefined;
  NEXTAUTH_SECRET: boolean;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: boolean;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: boolean;
  googleIdEmpty: boolean;
  googleSecretEmpty: boolean;
  githubIdEmpty: boolean;
  githubSecretEmpty: boolean;
  googleIdExists: boolean;
  googleSecretExists: boolean;
  githubIdExists: boolean;
  githubSecretExists: boolean;
}

interface EnvImport {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: boolean;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: boolean;
  NEXTAUTH_URL: string | undefined;
  NEXTAUTH_SECRET: boolean;
}

interface AuthConfigImport {
  providersCount: number;
  providerTypes: string[];
  sessionStrategy: string | undefined;
  hasAdapter: boolean;
  hasCallbacks: boolean;
}

interface NextAuthRoute {
  status?: number;
  ok?: boolean;
  headers?: Record<string, string>;
  data?: unknown;
  error?: string;
}

interface Provider {
  id?: string;
  type?: string;
}

interface Diagnostics {
  timestamp: string;
  nodeEnv: string | undefined;
  rawEnv: RawEnv;
  envImport: EnvImport | null;
  envImportError: string | null;
  authConfigImport: AuthConfigImport | null;
  authConfigError: string | null;
  nextAuthRoute: NextAuthRoute | null;
  skipValidation: string | undefined;
}

export async function GET() {
  // Comprehensive OAuth diagnostics
  const diagnostics: Diagnostics = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,

    // Raw environment variables (safely)
    rawEnv: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID?.substring(0, 10) + '...',
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID?.substring(0, 10) + '...',
      GITHUB_CLIENT_SECRET: !!process.env.GITHUB_CLIENT_SECRET,
      // Check for empty strings
      googleIdEmpty: process.env.GOOGLE_CLIENT_ID === '',
      googleSecretEmpty: process.env.GOOGLE_CLIENT_SECRET === '',
      githubIdEmpty: process.env.GITHUB_CLIENT_ID === '',
      githubSecretEmpty: process.env.GITHUB_CLIENT_SECRET === '',
      // Check actual presence
      googleIdExists: process.env.GOOGLE_CLIENT_ID !== undefined,
      googleSecretExists: process.env.GOOGLE_CLIENT_SECRET !== undefined,
      githubIdExists: process.env.GITHUB_CLIENT_ID !== undefined,
      githubSecretExists: process.env.GITHUB_CLIENT_SECRET !== undefined,
    },

    // Try to import env without validation
    envImport: null,
    envImportError: null,

    // Try to import auth config
    authConfigImport: null,
    authConfigError: null,

    // Check NextAuth route
    nextAuthRoute: null,

    // Environment validation bypass
    skipValidation: process.env.SKIP_ENV_VALIDATION,
  };

  // Try importing env.js
  try {
    const { env } = await import('@/env');
    diagnostics.envImport = {
      GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID?.substring(0, 10) + '...',
      GOOGLE_CLIENT_SECRET: !!env.GOOGLE_CLIENT_SECRET,
      GITHUB_CLIENT_ID: env.GITHUB_CLIENT_ID?.substring(0, 10) + '...',
      GITHUB_CLIENT_SECRET: !!env.GITHUB_CLIENT_SECRET,
      NEXTAUTH_URL: env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: !!env.NEXTAUTH_SECRET,
    };
  } catch (error) {
    diagnostics.envImportError =
      error instanceof Error ? error.message : String(error);
  }

  // Try importing auth config
  try {
    const { authConfig } = await import('@/server/auth.config');
    diagnostics.authConfigImport = {
      providersCount: authConfig.providers?.length ?? 0,
      providerTypes: authConfig.providers?.map(
        (p) => {
          // Handle both provider objects and provider functions
          const provider = typeof p === 'function' ? p() : p;
          return (provider as Provider).id ?? (provider as Provider).type ?? 'unknown';
        }
      ),
      sessionStrategy: authConfig.session?.strategy,
      hasAdapter: !!authConfig.adapter,
      hasCallbacks: !!authConfig.callbacks,
    };
  } catch (error) {
    diagnostics.authConfigError =
      error instanceof Error ? error.message : String(error);
  }

  // Check if NextAuth route exists
  try {
    const routePath = '/api/auth/providers';
    const baseUrl =
      process.env.NEXTAUTH_URL ??
      `http://localhost:${process.env.PORT ?? 3000}`;
    const response = await fetch(`${baseUrl}${routePath}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    diagnostics.nextAuthRoute = {
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
    };
    if (response.ok) {
      diagnostics.nextAuthRoute.data = await response.json();
    }
  } catch (error) {
    diagnostics.nextAuthRoute = {
      error: error instanceof Error ? error.message : String(error),
    };
  }

  return NextResponse.json(diagnostics, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
