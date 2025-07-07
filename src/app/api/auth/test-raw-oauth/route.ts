import { NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';

export async function GET() {
  // Test OAuth configuration without env validation
  const result = {
    timestamp: new Date().toISOString(),
    
    // Raw environment check
    rawEnvCheck: {
      googleId: process.env.GOOGLE_CLIENT_ID,
      googleSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      githubId: process.env.GITHUB_CLIENT_ID,
      githubSecret: !!process.env.GITHUB_CLIENT_SECRET,
    },
    
    // Test provider creation
    providerTests: {
      google: null as any,
      github: null as any,
    },
    
    // Test NextAuth creation
    nextAuthTest: null as any,
  };
  
  // Test creating Google provider
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    try {
      const googleProvider = GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      });
      result.providerTests.google = {
        success: true,
        id: googleProvider.id,
        type: googleProvider.type,
        name: googleProvider.name,
      };
    } catch (error) {
      result.providerTests.google = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  } else {
    result.providerTests.google = {
      success: false,
      error: 'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET',
    };
  }
  
  // Test creating GitHub provider
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    try {
      const githubProvider = GitHubProvider({
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
      });
      result.providerTests.github = {
        success: true,
        id: githubProvider.id,
        type: githubProvider.type,
        name: githubProvider.name,
      };
    } catch (error) {
      result.providerTests.github = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  } else {
    result.providerTests.github = {
      success: false,
      error: 'Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET',
    };
  }
  
  // Test creating NextAuth instance
  try {
    const providers = [];
    
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      providers.push(
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })
      );
    }
    
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
      providers.push(
        GitHubProvider({
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
        })
      );
    }
    
    const authInstance = NextAuth({
      providers,
      secret: process.env.NEXTAUTH_SECRET,
    });
    
    result.nextAuthTest = {
      success: true,
      providersCount: providers.length,
      hasHandlers: !!authInstance.handlers,
    };
  } catch (error) {
    result.nextAuthTest = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  
  return NextResponse.json(result, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    }
  });
}