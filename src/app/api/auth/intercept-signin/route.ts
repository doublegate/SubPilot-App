import { NextRequest, NextResponse } from 'next/server';

// Intercept OAuth signin attempts to debug configuration errors
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const provider = url.searchParams.get('provider');
    const callbackUrl = url.searchParams.get('callbackUrl');
    const error = url.searchParams.get('error');

    // Log the signin attempt
    console.log('=== OAuth Signin Attempt ===');
    console.log('Provider:', provider);
    console.log('Callback URL:', callbackUrl);
    console.log('Error:', error);
    console.log('Full URL:', request.url);
    console.log('Headers:', Object.fromEntries(request.headers.entries()));

    // Check provider configuration at the moment of signin
    const { authConfig } = await import('@/server/auth.config');
    const configuredProviders = authConfig.providers.map((p: any) => p.id || p.type);
    
    console.log('Configured providers at signin:', configuredProviders);
    console.log('Provider requested:', provider);
    console.log('Provider exists:', configuredProviders.includes(provider));

    // Check if this is a configuration error scenario
    const isConfigError = provider && !configuredProviders.includes(provider);
    
    if (isConfigError) {
      console.error(`CONFIGURATION ERROR: Provider "${provider}" requested but not configured!`);
      console.log('Available providers:', configuredProviders);
      
      // Check why the provider might not be configured
      if (provider === 'google') {
        console.log('Google OAuth check:');
        console.log('- GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET');
        console.log('- GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');
        console.log('- ID is empty string:', process.env.GOOGLE_CLIENT_ID === '');
        console.log('- Secret is empty string:', process.env.GOOGLE_CLIENT_SECRET === '');
      }
      
      if (provider === 'github') {
        console.log('GitHub OAuth check:');
        console.log('- GITHUB_CLIENT_ID:', process.env.GITHUB_CLIENT_ID ? 'SET' : 'NOT SET');
        console.log('- GITHUB_CLIENT_SECRET:', process.env.GITHUB_CLIENT_SECRET ? 'SET' : 'NOT SET');
        console.log('- ID is empty string:', process.env.GITHUB_CLIENT_ID === '');
        console.log('- Secret is empty string:', process.env.GITHUB_CLIENT_SECRET === '');
      }
    }

    console.log('=========================');

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      provider,
      callbackUrl,
      error,
      configuredProviders,
      isConfigError,
      diagnostics: {
        providerRequested: provider,
        providerConfigured: provider ? configuredProviders.includes(provider) : false,
        totalProviders: configuredProviders.length,
      },
    });
  } catch (error) {
    console.error('Signin intercept error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to intercept signin',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}