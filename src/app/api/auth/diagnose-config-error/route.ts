import { NextResponse } from 'next/server';

// Comprehensive diagnostic for Auth.js configuration errors
export async function GET() {
  try {
    // Import fresh to ensure latest configuration
    const authModule = await import('@/server/auth.config');
    const { authConfig } = authModule;
    const { env } = await import('@/env');

    // Deep inspection of provider configuration
    const providerAnalysis = authConfig.providers.map((provider: any) => {
      const analysis: any = {
        id: provider.id || 'N/A',
        type: provider.type || 'unknown',
        name: provider.name || 'N/A',
      };

      // For OAuth providers, check configuration
      if (provider.type === 'oauth' || provider.type === 'oidc') {
        // Check if provider has the expected structure
        analysis.hasOptions = !!provider.options;
        analysis.hasClientId = !!provider.options?.clientId;
        analysis.hasClientSecret = !!provider.options?.clientSecret;

        // For Google provider
        if (provider.id === 'google') {
          analysis.expectedClientId = !!env.GOOGLE_CLIENT_ID;
          analysis.expectedClientSecret = !!env.GOOGLE_CLIENT_SECRET;
          analysis.configMismatch =
            analysis.expectedClientId !== analysis.hasClientId ||
            analysis.expectedClientSecret !== analysis.hasClientSecret;
        }

        // For GitHub provider
        if (provider.id === 'github') {
          analysis.expectedClientId = !!env.GITHUB_CLIENT_ID;
          analysis.expectedClientSecret = !!env.GITHUB_CLIENT_SECRET;
          analysis.configMismatch =
            analysis.expectedClientId !== analysis.hasClientId ||
            analysis.expectedClientSecret !== analysis.hasClientSecret;
        }
      }

      return analysis;
    });

    // Check for empty string issue
    const emptyStringIssue = {
      googleIdEmpty: process.env.GOOGLE_CLIENT_ID === '',
      googleSecretEmpty: process.env.GOOGLE_CLIENT_SECRET === '',
      githubIdEmpty: process.env.GITHUB_CLIENT_ID === '',
      githubSecretEmpty: process.env.GITHUB_CLIENT_SECRET === '',
      hasEmptyStrings: false,
    };

    emptyStringIssue.hasEmptyStrings = Object.values(emptyStringIssue).some(
      v => v === true
    );

    // Provider inclusion logic analysis
    const providerLogic = {
      googleShouldBeIncluded: !!(
        env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ),
      githubShouldBeIncluded: !!(
        env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
      ),
      googleActuallyIncluded: providerAnalysis.some(
        (p: any) => p.id === 'google'
      ),
      githubActuallyIncluded: providerAnalysis.some(
        (p: any) => p.id === 'github'
      ),
    };

    // Configuration error scenarios
    const errorScenarios = [];

    if (emptyStringIssue.hasEmptyStrings) {
      errorScenarios.push({
        type: 'EMPTY_STRING_ENV_VARS',
        severity: 'critical',
        message:
          'OAuth credentials are set as empty strings in environment variables',
        solution:
          'Remove the environment variables from Vercel if not using OAuth, or set proper values',
        affected: Object.entries(emptyStringIssue)
          .filter(([key, value]) => value === true && key !== 'hasEmptyStrings')
          .map(([key]) => key),
      });
    }

    if (
      providerLogic.googleShouldBeIncluded &&
      !providerLogic.googleActuallyIncluded
    ) {
      errorScenarios.push({
        type: 'GOOGLE_PROVIDER_MISSING',
        severity: 'high',
        message: 'Google OAuth credentials exist but provider not included',
        solution: 'Check if env vars are being parsed correctly by env.js',
      });
    }

    if (
      providerLogic.githubShouldBeIncluded &&
      !providerLogic.githubActuallyIncluded
    ) {
      errorScenarios.push({
        type: 'GITHUB_PROVIDER_MISSING',
        severity: 'high',
        message: 'GitHub OAuth credentials exist but provider not included',
        solution: 'Check if env vars are being parsed correctly by env.js',
      });
    }

    // NextAuth URL configuration
    const urlConfig = {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'not-set',
      VERCEL_URL: process.env.VERCEL_URL || 'not-set',
      isProduction: process.env.NODE_ENV === 'production',
      urlRequired: process.env.NODE_ENV === 'production',
    };

    // Final diagnosis
    const diagnosis = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      providerCount: authConfig.providers.length,
      providerAnalysis,
      emptyStringIssue,
      providerLogic,
      errorScenarios,
      urlConfig,
      recommendations: generateRecommendations(
        errorScenarios,
        emptyStringIssue,
        providerLogic
      ),
    };

    // Log critical findings
    if (errorScenarios.length > 0) {
      console.error('=== CRITICAL AUTH CONFIGURATION ISSUES FOUND ===');
      errorScenarios.forEach(scenario => {
        console.error(
          `[${scenario.severity.toUpperCase()}] ${scenario.type}: ${scenario.message}`
        );
        console.error(`Solution: ${scenario.solution}`);
      });
      console.error('===============================================');
    }

    return NextResponse.json(diagnosis);
  } catch (error) {
    console.error('Diagnosis error:', error);
    return NextResponse.json(
      {
        error: 'Failed to diagnose configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

function generateRecommendations(
  errorScenarios: any[],
  emptyStringIssue: any,
  providerLogic: any
): string[] {
  const recommendations = [];

  if (emptyStringIssue.hasEmptyStrings) {
    recommendations.push(
      '🚨 CRITICAL: Remove empty OAuth environment variables from Vercel dashboard',
      'Go to Vercel > Settings > Environment Variables and DELETE (not just empty) unused OAuth vars'
    );
  }

  if (
    !providerLogic.googleActuallyIncluded &&
    !providerLogic.githubActuallyIncluded
  ) {
    recommendations.push(
      'No OAuth providers are configured - users can only use email authentication',
      'To enable OAuth, add proper CLIENT_ID and CLIENT_SECRET values in Vercel'
    );
  }

  if (errorScenarios.length === 0) {
    recommendations.push('✅ No configuration errors detected');
  }

  return recommendations;
}
