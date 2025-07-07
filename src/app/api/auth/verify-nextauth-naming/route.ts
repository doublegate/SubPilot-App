import { NextResponse } from 'next/server';

export async function GET() {
  // NextAuth v5 uses AUTH_* prefix, not NEXTAUTH_*
  const results = {
    currentNaming: {
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? 'NOT_SET',
    },
    v5Naming: {
      AUTH_SECRET: !!process.env.AUTH_SECRET,
      AUTH_URL: process.env.AUTH_URL ?? 'NOT_SET',
    },
    oauthProviders: {
      // Google - both v4 and v5 naming patterns
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      AUTH_GOOGLE_ID: !!process.env.AUTH_GOOGLE_ID,
      AUTH_GOOGLE_SECRET: !!process.env.AUTH_GOOGLE_SECRET,
      
      // GitHub - both v4 and v5 naming patterns
      GITHUB_CLIENT_ID: !!process.env.GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET: !!process.env.GITHUB_CLIENT_SECRET,
      AUTH_GITHUB_ID: !!process.env.AUTH_GITHUB_ID,
      AUTH_GITHUB_SECRET: !!process.env.AUTH_GITHUB_SECRET,
    },
    
    recommendation: '',
  };
  
  // Determine the issue
  if (!results.v5Naming.AUTH_SECRET && !results.currentNaming.NEXTAUTH_SECRET) {
    results.recommendation = 'CRITICAL: Missing AUTH_SECRET (v5) or NEXTAUTH_SECRET (v4). Add AUTH_SECRET to Vercel.';
  } else if (!results.v5Naming.AUTH_URL && !results.currentNaming.NEXTAUTH_URL) {
    results.recommendation = 'CRITICAL: Missing AUTH_URL (v5) or NEXTAUTH_URL (v4). Add AUTH_URL to Vercel.';
  } else if (!results.oauthProviders.AUTH_GOOGLE_ID && !results.oauthProviders.GOOGLE_CLIENT_ID) {
    results.recommendation = 'OAuth providers use AUTH_[PROVIDER]_ID pattern in v5. Try AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET.';
  } else {
    results.recommendation = 'Environment variables appear to be set. Check the values are not empty strings.';
  }
  
  return NextResponse.json({
    message: 'NextAuth v5 uses AUTH_* prefix, not NEXTAUTH_*',
    ...results,
    correctNaming: {
      secret: 'AUTH_SECRET',
      url: 'AUTH_URL', 
      googleId: 'AUTH_GOOGLE_ID or GOOGLE_CLIENT_ID',
      googleSecret: 'AUTH_GOOGLE_SECRET or GOOGLE_CLIENT_SECRET',
      githubId: 'AUTH_GITHUB_ID or GITHUB_CLIENT_ID',
      githubSecret: 'AUTH_GITHUB_SECRET or GITHUB_CLIENT_SECRET',
    },
  });
}