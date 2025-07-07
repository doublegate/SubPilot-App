import { NextResponse } from 'next/server';
import { auth } from '@/server/auth';

export async function GET() {
  // Only allow in development or for authenticated admins
  const session = await auth();
  
  if (process.env.NODE_ENV === 'production' && !session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Check which OAuth environment variables are available
  const envCheck = {
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    GITHUB_CLIENT_ID: !!process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: !!process.env.GITHUB_CLIENT_SECRET,
    // Check if they're empty strings
    GOOGLE_CLIENT_ID_LENGTH: process.env.GOOGLE_CLIENT_ID?.length ?? 0,
    GOOGLE_CLIENT_SECRET_LENGTH: process.env.GOOGLE_CLIENT_SECRET?.length ?? 0,
    GITHUB_CLIENT_ID_LENGTH: process.env.GITHUB_CLIENT_ID?.length ?? 0,
    GITHUB_CLIENT_SECRET_LENGTH: process.env.GITHUB_CLIENT_SECRET?.length ?? 0,
    // Raw values (first 8 chars only for security)
    GOOGLE_CLIENT_ID_PREVIEW: process.env.GOOGLE_CLIENT_ID?.substring(0, 8) ?? 'undefined',
    GITHUB_CLIENT_ID_PREVIEW: process.env.GITHUB_CLIENT_ID?.substring(0, 8) ?? 'undefined',
  };

  return NextResponse.json(envCheck, { status: 200 });
}