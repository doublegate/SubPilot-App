import { NextResponse } from 'next/server';

export async function GET() {
  // Comprehensive OAuth diagnostics
  const diagnostics = {
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
    envImport: null as any,
    envImportError: null as any,
    
    // Try to import auth config
    authConfigImport: null as any,
    authConfigError: null as any,
    
    // Check NextAuth route
    nextAuthRoute: null as any,
    
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
    diagnostics.envImportError = error instanceof Error ? error.message : String(error);
  }
  
  // Try importing auth config
  try {
    const { authConfig } = await import('@/server/auth.config');
    diagnostics.authConfigImport = {
      providersCount: authConfig.providers?.length || 0,
      providerTypes: authConfig.providers?.map((p: any) => p.id || p.type || 'unknown'),
      sessionStrategy: authConfig.session?.strategy,
      hasAdapter: !!authConfig.adapter,
      hasCallbacks: !!authConfig.callbacks,
    };
  } catch (error) {
    diagnostics.authConfigError = error instanceof Error ? error.message : String(error);
  }
  
  // Check if NextAuth route exists
  try {
    const routePath = '/api/auth/providers';
    const baseUrl = process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 3000}`;
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
    }
  });
}