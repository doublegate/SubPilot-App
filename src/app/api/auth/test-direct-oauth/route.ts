import { NextResponse } from 'next/server';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';

export async function GET() {
  // Test direct provider instantiation without any validation
  const results = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    
    // Raw environment variable checks
    rawEnvVars: {
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 10)}...` : 'NOT_SET',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT_SET',
      GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID ? `${process.env.GITHUB_CLIENT_ID.substring(0, 10)}...` : 'NOT_SET',
      GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET ? 'SET' : 'NOT_SET',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? 'NOT_SET',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT_SET',
      AUTH_URL: process.env.AUTH_URL ?? 'NOT_SET',
      AUTH_SECRET: process.env.AUTH_SECRET ? 'SET' : 'NOT_SET',
    },
    
    // Test provider creation
    providerTests: {
      google: null as any,
      github: null as any,
    },
    
    // Errors
    errors: [] as string[],
  };
  
  // Test Google Provider
  try {
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      const googleProvider = GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      });
      results.providerTests.google = {
        success: true,
        id: googleProvider.id,
        name: googleProvider.name,
        type: googleProvider.type,
      };
    } else {
      results.providerTests.google = {
        success: false,
        reason: 'Missing credentials',
      };
    }
  } catch (error) {
    results.providerTests.google = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    results.errors.push(`Google provider error: ${error}`);
  }
  
  // Test GitHub Provider
  try {
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
      const githubProvider = GitHubProvider({
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
      });
      results.providerTests.github = {
        success: true,
        id: githubProvider.id,
        name: githubProvider.name,
        type: githubProvider.type,
      };
    } else {
      results.providerTests.github = {
        success: false,
        reason: 'Missing credentials',
      };
    }
  } catch (error) {
    results.providerTests.github = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    results.errors.push(`GitHub provider error: ${error}`);
  }
  
  // Check for NextAuth v5 vs v4 naming
  const v5Check = {
    hasAuthSecret: !!process.env.AUTH_SECRET,
    hasAuthUrl: !!process.env.AUTH_URL,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
  };
  
  // Recommendations
  const recommendations = [];
  
  if (!v5Check.hasAuthSecret && !v5Check.hasNextAuthSecret) {
    recommendations.push('Missing AUTH_SECRET or NEXTAUTH_SECRET - this is required for production');
  }
  
  if (!v5Check.hasAuthUrl && !v5Check.hasNextAuthUrl) {
    recommendations.push('Missing AUTH_URL or NEXTAUTH_URL - this is required for OAuth callbacks');
  }
  
  if (!results.providerTests.google.success && !results.providerTests.github.success) {
    recommendations.push('No OAuth providers are configured - check your environment variables');
  }
  
  return NextResponse.json({
    ...results,
    v5Check,
    recommendations,
    message: 'This endpoint tests OAuth provider configuration directly without env validation',
  });
}