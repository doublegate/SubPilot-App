import { NextResponse } from 'next/server';
import { env } from '@/env';
import { authConfig } from '@/server/auth.config';

// Diagnostic endpoint to check OAuth configuration
export async function GET() {
  try {
    // Check raw process.env values
    const rawEnvVars = {
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? '[REDACTED]' : undefined,
      GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET ? '[REDACTED]' : undefined,
      NODE_ENV: process.env.NODE_ENV,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '[SET]' : undefined,
    };

    // Check env.js parsed values
    const parsedEnvVars = {
      GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET ? '[REDACTED]' : undefined,
      GITHUB_CLIENT_ID: env.GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET: env.GITHUB_CLIENT_SECRET ? '[REDACTED]' : undefined,
      NODE_ENV: env.NODE_ENV,
      NEXTAUTH_URL: env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: env.NEXTAUTH_SECRET ? '[SET]' : undefined,
    };

    // Check if values are empty strings
    const emptyStringChecks = {
      GOOGLE_CLIENT_ID_isEmpty: process.env.GOOGLE_CLIENT_ID === '',
      GOOGLE_CLIENT_SECRET_isEmpty: process.env.GOOGLE_CLIENT_SECRET === '',
      GITHUB_CLIENT_ID_isEmpty: process.env.GITHUB_CLIENT_ID === '',
      GITHUB_CLIENT_SECRET_isEmpty: process.env.GITHUB_CLIENT_SECRET === '',
    };

    // Check provider configuration logic
    const providerChecks = {
      googleProviderWouldBeIncluded: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
      githubProviderWouldBeIncluded: !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
      credentialsProviderIncluded: env.NODE_ENV === 'development',
    };

    // Get actual configured providers
    const configuredProviders = authConfig.providers.map(provider => {
      if ('id' in provider) {
        return {
          id: provider.id,
          name: provider.name,
          type: provider.type,
        };
      }
      return { type: 'unknown' };
    });

    // Log to server console for debugging
    console.log('=== OAuth Debug Information ===');
    console.log('Raw env vars:', JSON.stringify(rawEnvVars, null, 2));
    console.log('Parsed env vars:', JSON.stringify(parsedEnvVars, null, 2));
    console.log('Empty string checks:', JSON.stringify(emptyStringChecks, null, 2));
    console.log('Provider checks:', JSON.stringify(providerChecks, null, 2));
    console.log('Configured providers:', JSON.stringify(configuredProviders, null, 2));
    console.log('==============================');

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      rawEnvVars,
      parsedEnvVars,
      emptyStringChecks,
      providerChecks,
      configuredProviders,
      authConfigProvidersCount: authConfig.providers.length,
      env: {
        skipValidation: !!process.env.SKIP_ENV_VALIDATION,
        emptyStringAsUndefined: true,
      },
    });
  } catch (error) {
    console.error('OAuth debug error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to debug OAuth configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}