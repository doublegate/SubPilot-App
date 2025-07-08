import { NextResponse } from 'next/server';
import { auth } from '@/server/auth';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    // Get session
    const session = await auth();
    
    // Get cookies
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    // Environment variables (masked for security)
    const envVars = {
      AUTH_URL: process.env.AUTH_URL ?? 'NOT SET',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? 'NOT SET',
      VERCEL_URL: process.env.VERCEL_URL ?? 'NOT SET',
      NODE_ENV: process.env.NODE_ENV ?? 'NOT SET',
      hasAuthSecret: !!process.env.AUTH_SECRET,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasGoogleClientId: !!(process.env.GOOGLE_CLIENT_ID ?? process.env.AUTH_GOOGLE_ID),
      hasGoogleClientSecret: !!(process.env.GOOGLE_CLIENT_SECRET ?? process.env.AUTH_GOOGLE_SECRET),
      hasGithubClientId: !!(process.env.GITHUB_CLIENT_ID ?? process.env.AUTH_GITHUB_ID),
      hasGithubClientSecret: !!(process.env.GITHUB_CLIENT_SECRET ?? process.env.AUTH_GITHUB_SECRET),
    };
    
    // Auth configuration
    const authConfig = {
      providers: [
        process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID ? 'google' : null,
        process.env.GITHUB_CLIENT_ID || process.env.AUTH_GITHUB_ID ? 'github' : null,
        'email',
      ].filter(Boolean),
      callbackUrls: {
        google: `${envVars.AUTH_URL || envVars.NEXTAUTH_URL || `https://${envVars.VERCEL_URL}`}/api/auth/callback/google`,
        github: `${envVars.AUTH_URL || envVars.NEXTAUTH_URL || `https://${envVars.VERCEL_URL}`}/api/auth/callback/github`,
      },
    };
    
    // Cookie analysis
    const cookieAnalysis = {
      total: allCookies.length,
      authRelated: allCookies.filter(c => 
        c.name.includes('auth') || 
        c.name.includes('session') || 
        c.name.includes('csrf')
      ).map(c => ({
        name: c.name,
        hasValue: !!c.value,
        // Note: RequestCookie type doesn't expose httpOnly, secure, sameSite properties
        valueLength: c.value?.length ?? 0,
      })),
    };
    
    // Redirect loop detection
    const referrer = cookieStore.get('__Host-authjs.csrf-token')?.value;
    const sessionToken = cookieStore.get('authjs.session-token')?.value ?? 
                       cookieStore.get('__Secure-authjs.session-token')?.value;
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      session: {
        exists: !!session,
        user: session?.user ? {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
        } : null,
      },
      environment: envVars,
      authConfig,
      cookies: cookieAnalysis,
      redirectLoopIndicators: {
        hasSessionToken: !!sessionToken,
        hasCsrfToken: !!referrer,
        middlewareDisabled: true, // Currently true for debugging
      },
      recommendations: [
        !envVars.AUTH_URL && !envVars.NEXTAUTH_URL ? 
          'Set AUTH_URL or NEXTAUTH_URL to your deployment URL' : null,
        !sessionToken && session ? 
          'Session exists but no session cookie - possible cookie issue' : null,
        sessionToken && !session ? 
          'Session cookie exists but no session - possible secret mismatch' : null,
        'Check browser network tab for redirect chain',
        'Verify OAuth callback URLs match in provider settings',
      ].filter(Boolean),
    };
    
    return NextResponse.json(debugInfo, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get debug information',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}