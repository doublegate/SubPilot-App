import { NextResponse } from 'next/server';

interface DirectEnv {
  GOOGLE_CLIENT_ID: string | undefined;
  GOOGLE_CLIENT_SECRET: boolean;
  GITHUB_CLIENT_ID: string | undefined;
  GITHUB_CLIENT_SECRET: boolean;
  NEXTAUTH_URL: string | undefined;
  NEXTAUTH_SECRET: boolean;
}

interface Provider {
  id?: string;
  type?: string;
  name?: string;
}

interface ProviderInfo {
  id: string | undefined;
  type: string | undefined;
  name: string | undefined;
}

interface AuthConfigProvidersTest {
  success: boolean;
  providersCount?: number;
  providers?: ProviderInfo[];
  error?: string;
  stack?: string;
}

interface ManualProviderCreationTest {
  success: boolean;
  providersCount?: number;
  providers?: ProviderInfo[];
  error?: string;
}

interface NextAuthInstanceTest {
  success: boolean;
  providersCount?: number;
  hasHandlers?: boolean;
  error?: string;
}

interface TestResult {
  timestamp: string;
  tests: {
    directEnv: DirectEnv | null;
    authConfigProviders: AuthConfigProvidersTest | null;
    manualProviderCreation: ManualProviderCreationTest | null;
    nextAuthInstance: NextAuthInstanceTest | null;
  };
}

// Test directly importing and using providers without env validation
export async function GET() {
  const result: TestResult = {
    timestamp: new Date().toISOString(),
    tests: {
      directEnv: null,
      authConfigProviders: null,
      manualProviderCreation: null,
      nextAuthInstance: null,
    },
  };

  // Test 1: Direct environment variables
  result.tests.directEnv = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: !!process.env.GITHUB_CLIENT_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
  };

  // Test 2: Import auth config and check providers
  try {
    const authModule = await import('@/server/auth.config');
    const config = authModule.authConfig;

    result.tests.authConfigProviders = {
      success: true,
      providersCount: config.providers?.length || 0,
      providers: config.providers?.map((p): ProviderInfo => {
        // Handle both provider objects and provider functions
        const provider = typeof p === 'function' ? p() : p;
        return {
          id: (provider as Provider).id,
          type: (provider as Provider).type,
          name: (provider as Provider).name,
        };
      }),
    };
  } catch (error) {
    result.tests.authConfigProviders = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    };
  }

  // Test 3: Manually create providers
  try {
    const GoogleProvider = (await import('next-auth/providers/google')).default;
    const GitHubProvider = (await import('next-auth/providers/github')).default;

    const providers = [];

    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      const googleProvider = GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      });
      providers.push({
        id: googleProvider.id,
        type: googleProvider.type,
        name: googleProvider.name,
      });
    }

    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
      const githubProvider = GitHubProvider({
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
      });
      providers.push({
        id: githubProvider.id,
        type: githubProvider.type,
        name: githubProvider.name,
      });
    }

    result.tests.manualProviderCreation = {
      success: true,
      providersCount: providers.length,
      providers,
    };
  } catch (error) {
    result.tests.manualProviderCreation = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // Test 4: Try creating a NextAuth instance without env validation
  try {
    process.env.SKIP_ENV_VALIDATION = 'true';

    const NextAuth = (await import('next-auth')).default;
    const GoogleProvider = (await import('next-auth/providers/google')).default;
    const GitHubProvider = (await import('next-auth/providers/github')).default;

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

    const auth = NextAuth({
      providers,
      secret: process.env.NEXTAUTH_SECRET,
    });

    result.tests.nextAuthInstance = {
      success: true,
      providersCount: providers.length,
      hasHandlers: !!auth.handlers,
    };
  } catch (error) {
    result.tests.nextAuthInstance = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  return NextResponse.json(result, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
