import { NextResponse } from 'next/server';

// COMPREHENSIVE OAuth DIAGNOSTIC - RUN THIS TO IDENTIFY THE ISSUE
export async function GET() {
  try {
    console.log('\n🔍 === STARTING FULL OAUTH DIAGNOSTIC ===\n');

    // 1. Check raw environment variables
    const rawEnvCheck = {
      GOOGLE_CLIENT_ID: {
        exists: 'GOOGLE_CLIENT_ID' in process.env,
        value: process.env.GOOGLE_CLIENT_ID,
        isEmpty: process.env.GOOGLE_CLIENT_ID === '',
        isUndefined: process.env.GOOGLE_CLIENT_ID === undefined,
        length: process.env.GOOGLE_CLIENT_ID?.length || 0,
      },
      GOOGLE_CLIENT_SECRET: {
        exists: 'GOOGLE_CLIENT_SECRET' in process.env,
        isEmpty: process.env.GOOGLE_CLIENT_SECRET === '',
        isUndefined: process.env.GOOGLE_CLIENT_SECRET === undefined,
        hasValue: !!process.env.GOOGLE_CLIENT_SECRET,
      },
      GITHUB_CLIENT_ID: {
        exists: 'GITHUB_CLIENT_ID' in process.env,
        value: process.env.GITHUB_CLIENT_ID,
        isEmpty: process.env.GITHUB_CLIENT_ID === '',
        isUndefined: process.env.GITHUB_CLIENT_ID === undefined,
        length: process.env.GITHUB_CLIENT_ID?.length || 0,
      },
      GITHUB_CLIENT_SECRET: {
        exists: 'GITHUB_CLIENT_SECRET' in process.env,
        isEmpty: process.env.GITHUB_CLIENT_SECRET === '',
        isUndefined: process.env.GITHUB_CLIENT_SECRET === undefined,
        hasValue: !!process.env.GITHUB_CLIENT_SECRET,
      },
    };

    // 2. Check parsed env values
    const { env } = await import('@/env');
    const parsedEnvCheck = {
      GOOGLE_CLIENT_ID: {
        value: env.GOOGLE_CLIENT_ID,
        hasValue: !!env.GOOGLE_CLIENT_ID,
        type: typeof env.GOOGLE_CLIENT_ID,
      },
      GOOGLE_CLIENT_SECRET: {
        hasValue: !!env.GOOGLE_CLIENT_SECRET,
        type: typeof env.GOOGLE_CLIENT_SECRET,
      },
      GITHUB_CLIENT_ID: {
        value: env.GITHUB_CLIENT_ID,
        hasValue: !!env.GITHUB_CLIENT_ID,
        type: typeof env.GITHUB_CLIENT_ID,
      },
      GITHUB_CLIENT_SECRET: {
        hasValue: !!env.GITHUB_CLIENT_SECRET,
        type: typeof env.GITHUB_CLIENT_SECRET,
      },
    };

    // 3. Check actual provider configuration
    const { authConfig } = await import('@/server/auth.config');
    const configuredProviders = authConfig.providers.map((p: any) => ({
      id: p.id || p.type,
      type: p.type,
      name: p.name,
    }));

    // 4. Identify the exact issue
    const issues = [];
    
    // Check for empty string issue
    if (rawEnvCheck.GOOGLE_CLIENT_ID.isEmpty || rawEnvCheck.GOOGLE_CLIENT_SECRET.isEmpty) {
      issues.push({
        severity: 'CRITICAL',
        issue: 'Google OAuth credentials are empty strings',
        impact: 'Provider will not be included due to emptyStringAsUndefined setting',
        solution: 'In Vercel dashboard, DELETE the Google OAuth env vars completely (dont leave them empty)',
      });
    }
    
    if (rawEnvCheck.GITHUB_CLIENT_ID.isEmpty || rawEnvCheck.GITHUB_CLIENT_SECRET.isEmpty) {
      issues.push({
        severity: 'CRITICAL',
        issue: 'GitHub OAuth credentials are empty strings',
        impact: 'Provider will not be included due to emptyStringAsUndefined setting',
        solution: 'In Vercel dashboard, DELETE the GitHub OAuth env vars completely (dont leave them empty)',
      });
    }

    // Check for provider inclusion logic
    const providerLogicCheck = {
      google: {
        envVarsPresent: parsedEnvCheck.GOOGLE_CLIENT_ID.hasValue && parsedEnvCheck.GOOGLE_CLIENT_SECRET.hasValue,
        providerIncluded: configuredProviders.some((p: any) => p.id === 'google'),
      },
      github: {
        envVarsPresent: parsedEnvCheck.GITHUB_CLIENT_ID.hasValue && parsedEnvCheck.GITHUB_CLIENT_SECRET.hasValue,
        providerIncluded: configuredProviders.some((p: any) => p.id === 'github'),
      },
    };

    // 5. Generate clear action items
    const actionItems = [];
    
    if (issues.length > 0) {
      actionItems.push('🚨 IMMEDIATE ACTIONS REQUIRED:');
      issues.forEach(issue => {
        actionItems.push(`- ${issue.solution}`);
      });
    }

    if (!providerLogicCheck.google.providerIncluded && !providerLogicCheck.github.providerIncluded) {
      actionItems.push('ℹ️ Currently only email authentication is available');
    }

    // Final diagnostic output
    const diagnostic = {
      summary: {
        hasOAuthConfigured: providerLogicCheck.google.providerIncluded || providerLogicCheck.github.providerIncluded,
        googleConfigured: providerLogicCheck.google.providerIncluded,
        githubConfigured: providerLogicCheck.github.providerIncluded,
        totalProviders: configuredProviders.length,
        issueCount: issues.length,
      },
      rawEnvironmentVariables: rawEnvCheck,
      parsedEnvironmentVariables: parsedEnvCheck,
      configuredProviders,
      providerLogicCheck,
      criticalIssues: issues,
      actionItems,
      rootCause: issues.length > 0 ? 
        'Empty string environment variables are being treated as undefined by env.js' :
        'No issues detected - check if OAuth apps are properly configured in Google/GitHub',
    };

    // Log the summary for server logs
    console.log('📊 DIAGNOSTIC SUMMARY:');
    console.log(`- OAuth Providers Configured: ${diagnostic.summary.hasOAuthConfigured}`);
    console.log(`- Google: ${diagnostic.summary.googleConfigured}`);
    console.log(`- GitHub: ${diagnostic.summary.githubConfigured}`);
    console.log(`- Critical Issues: ${diagnostic.summary.issueCount}`);
    
    if (issues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES FOUND:');
      issues.forEach(issue => {
        console.log(`- ${issue.issue}`);
        console.log(`  Solution: ${issue.solution}`);
      });
    }
    
    console.log('\n✅ DIAGNOSTIC COMPLETE\n');

    return NextResponse.json(diagnostic, {
      status: issues.length > 0 ? 400 : 200,
    });
  } catch (error) {
    console.error('Diagnostic error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to run diagnostic',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}