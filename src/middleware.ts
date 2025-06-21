import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getAuthForEdge } from "@/server/auth-edge"

export async function middleware(req: NextRequest) {
  const { auth } = await getAuthForEdge(req)
  const isLoggedIn = !!auth
  const { pathname } = req.nextUrl

  // Define protected routes
  const protectedRoutes = ["/dashboard", "/profile", "/settings"]
  const authRoutes = ["/login", "/signup", "/verify-request", "/auth-error"]

  // Check if the current path is protected
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route))

  // Redirect to login if accessing protected route without auth
  if (isProtectedRoute && !isLoggedIn) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(url)
  }

  // Redirect to dashboard if accessing auth routes while logged in
  if (isAuthRoute && isLoggedIn) {
    const url = req.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|.*\\.png$).*)",
    "/dashboard/:path*",
    "/profile/:path*",
    "/settings/:path*",
  ],
}