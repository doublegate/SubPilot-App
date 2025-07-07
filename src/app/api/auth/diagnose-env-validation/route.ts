import { NextResponse } from 'next/server';

interface EnvValue {
  value?: string;
  exists?: boolean;
  length?: number;
  isEmptyString?: boolean;
  isUndefined?: boolean;
  type?: string;
}

interface RawEnv {
  GOOGLE_CLIENT_ID: EnvValue;
  GOOGLE_CLIENT_SECRET: EnvValue;
  GITHUB_CLIENT_ID: EnvValue;
  GITHUB_CLIENT_SECRET: EnvValue;
}

interface ValidatedEnv {
  GOOGLE_CLIENT_ID: EnvValue;
  GOOGLE_CLIENT_SECRET: EnvValue;
  GITHUB_CLIENT_ID: EnvValue;
  GITHUB_CLIENT_SECRET: EnvValue;
}

interface EmptyStringTest {
  rawGoogleId: string | undefined;
  trimmedGoogleId: string | undefined;
  rawGithubId: string | undefined;
  trimmedGithubId: string | undefined;
}

interface Diagnostics {
  timestamp: string;
  rawEnv: RawEnv;
  validatedEnv: ValidatedEnv | null;
  envValidationError: string | null;
  availableProviders: unknown;
  availableProvidersError: string | null;
  emptyStringTest?: EmptyStringTest;
}

export async function GET() {
  const diagnostics: Diagnostics = {
    timestamp: new Date().toISOString(),

    // Raw process.env values
    rawEnv: {
      GOOGLE_CLIENT_ID: {
        value: process.env.GOOGLE_CLIENT_ID,
        length: process.env.GOOGLE_CLIENT_ID?.length ?? 0,
        isEmptyString: process.env.GOOGLE_CLIENT_ID === '',
        isUndefined: process.env.GOOGLE_CLIENT_ID === undefined,
        type: typeof process.env.GOOGLE_CLIENT_ID,
      },
      GOOGLE_CLIENT_SECRET: {
        exists: !!process.env.GOOGLE_CLIENT_SECRET,
        length: process.env.GOOGLE_CLIENT_SECRET?.length ?? 0,
        isEmptyString: process.env.GOOGLE_CLIENT_SECRET === '',
        isUndefined: process.env.GOOGLE_CLIENT_SECRET === undefined,
      },
      GITHUB_CLIENT_ID: {
        value: process.env.GITHUB_CLIENT_ID,
        length: process.env.GITHUB_CLIENT_ID?.length ?? 0,
        isEmptyString: process.env.GITHUB_CLIENT_ID === '',
        isUndefined: process.env.GITHUB_CLIENT_ID === undefined,
        type: typeof process.env.GITHUB_CLIENT_ID,
      },
      GITHUB_CLIENT_SECRET: {
        exists: !!process.env.GITHUB_CLIENT_SECRET,
        length: process.env.GITHUB_CLIENT_SECRET?.length ?? 0,
        isEmptyString: process.env.GITHUB_CLIENT_SECRET === '',
        isUndefined: process.env.GITHUB_CLIENT_SECRET === undefined,
      },
    },

    // Validated env values
    validatedEnv: null,
    envValidationError: null,

    // Check getAvailableProviders
    availableProviders: null,
    availableProvidersError: null,
  };

  // Try to import validated env
  try {
    const { env } = await import('@/env');
    diagnostics.validatedEnv = {
      GOOGLE_CLIENT_ID: {
        value: env.GOOGLE_CLIENT_ID,
        exists: !!env.GOOGLE_CLIENT_ID,
        isUndefined: env.GOOGLE_CLIENT_ID === undefined,
        type: typeof env.GOOGLE_CLIENT_ID,
      },
      GOOGLE_CLIENT_SECRET: {
        exists: !!env.GOOGLE_CLIENT_SECRET,
        isUndefined: env.GOOGLE_CLIENT_SECRET === undefined,
      },
      GITHUB_CLIENT_ID: {
        value: env.GITHUB_CLIENT_ID,
        exists: !!env.GITHUB_CLIENT_ID,
        isUndefined: env.GITHUB_CLIENT_ID === undefined,
        type: typeof env.GITHUB_CLIENT_ID,
      },
      GITHUB_CLIENT_SECRET: {
        exists: !!env.GITHUB_CLIENT_SECRET,
        isUndefined: env.GITHUB_CLIENT_SECRET === undefined,
      },
    };
  } catch (error) {
    diagnostics.envValidationError =
      error instanceof Error ? error.message : String(error);
  }

  // Try to check available providers
  try {
    const { getAvailableProviders } = await import('@/lib/auth-providers');
    diagnostics.availableProviders = getAvailableProviders();
  } catch (error) {
    diagnostics.availableProvidersError =
      error instanceof Error ? error.message : String(error);
  }

  // Test if empty string handling is the issue
  diagnostics.emptyStringTest = {
    rawGoogleId: process.env.GOOGLE_CLIENT_ID,
    trimmedGoogleId: process.env.GOOGLE_CLIENT_ID?.trim(),
    rawGithubId: process.env.GITHUB_CLIENT_ID,
    trimmedGithubId: process.env.GITHUB_CLIENT_ID?.trim(),
  };

  return NextResponse.json(diagnostics, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
