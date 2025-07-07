import { NextResponse } from 'next/server';

// This endpoint checks NextAuth providers at runtime
export async function GET() {
  try {
    // Dynamically import to ensure fresh provider configuration
    const { authConfig } = await import('@/server/auth.config');
    
    // Get provider details without exposing secrets
    const providers = authConfig.providers.map((provider: any) => {
      const safeProvider: any = {
        id: provider.id || 'unknown',
        name: provider.name || 'unknown',
        type: provider.type || 'unknown',
      };

      // Check if OAuth provider has required configuration
      if (provider.type === 'oauth' || provider.type === 'oidc') {
        safeProvider.hasClientId = !!provider.options?.clientId;
        safeProvider.hasClientSecret = !!provider.options?.clientSecret;
        safeProvider.clientIdLength = provider.options?.clientId?.length || 0;
        safeProvider.authorization = provider.options?.authorization || 'default';
      }

      // Check email provider
      if (provider.type === 'email') {
        safeProvider.hasServer = !!provider.options?.server;
        safeProvider.from = provider.options?.from || 'not-set';
      }

      return safeProvider;
    });

    // Check NextAuth configuration
    const nextAuthChecks = {
      hasProviders: providers.length > 0,
      providerCount: providers.length,
      hasOAuthProviders: providers.some((p: any) => p.type === 'oauth' || p.type === 'oidc'),
      hasEmailProvider: providers.some((p: any) => p.type === 'email'),
      hasCredentialsProvider: providers.some((p: any) => p.type === 'credentials'),
    };

    // Get environment status
    const envStatus = {
      NODE_ENV: process.env.NODE_ENV,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'not-set',
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      vercelUrl: process.env.VERCEL_URL || 'not-set',
      isVercel: !!process.env.VERCEL,
    };

    console.log('=== Provider Debug ===');
    console.log('Providers:', JSON.stringify(providers, null, 2));
    console.log('NextAuth checks:', JSON.stringify(nextAuthChecks, null, 2));
    console.log('Environment:', JSON.stringify(envStatus, null, 2));
    console.log('====================');

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      providers,
      nextAuthChecks,
      envStatus,
      authPages: authConfig.pages || {},
    });
  } catch (error) {
    console.error('Provider debug error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to debug providers',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}