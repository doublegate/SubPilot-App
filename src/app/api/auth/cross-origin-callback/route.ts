/**
 * Cross-origin OAuth callback handler
 * This endpoint handles OAuth callbacks when the user is accessing via a different domain
 * than the OAuth callback URL (e.g., Vercel preview deployments)
 */
import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const timestamp = new Date().toISOString();

  console.log(`[Cross-Origin Callback ${timestamp}] Processing request:`, {
    url: request.url,
    origin: request.headers.get('origin'),
    referer: request.headers.get('referer'),
    searchParams: Object.fromEntries(searchParams.entries()),
  });

  // Get the target URL from the state parameter or referer
  const state = searchParams.get('state');
  const referer = request.headers.get('referer');
  let targetUrl = '';

  // Try to extract the original URL from state
  if (state) {
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString()) as {
        returnUrl?: string;
      };
      targetUrl = stateData.returnUrl ?? '';
    } catch {
      // State is not our custom format, ignore
    }
  }

  // Fallback to referer if no target URL in state
  if (!targetUrl && referer) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.hostname.endsWith('.vercel.app')) {
        targetUrl = refererUrl.origin;
      }
    } catch {
      // Invalid referer, ignore
    }
  }

  // If we have a target URL and it's a Vercel preview
  if (targetUrl.includes('.vercel.app')) {
    console.log(
      `[Cross-Origin Callback ${timestamp}] Redirecting to preview URL:`,
      targetUrl
    );

    // Get all cookies from the current request
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    // Create response with redirect
    const response = NextResponse.redirect(new URL('/dashboard', targetUrl));

    // Copy all auth cookies to the response with adjusted settings
    for (const cookie of allCookies) {
      if (
        cookie.name.startsWith('authjs.') ||
        cookie.name.startsWith('next-auth.')
      ) {
        console.log(
          `[Cross-Origin Callback ${timestamp}] Copying cookie:`,
          cookie.name
        );

        response.cookies.set({
          name: cookie.name,
          value: cookie.value,
          httpOnly: true,
          secure: true,
          sameSite: 'none', // Allow cross-site for preview deployments
          path: '/',
          // Don't set domain to let browser handle it
        });
      }
    }

    return response;
  }

  // Default redirect to dashboard on current domain
  console.log(
    `[Cross-Origin Callback ${timestamp}] Default redirect to dashboard`
  );
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
