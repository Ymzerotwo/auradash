import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get the session cookie (This is the cookie our Hono backend will set)
  const sessionId = request.cookies.get('session_id')?.value;

  // Define public routes that don't require authentication
  const publicRoutes = ['/login', '/forgot-password', '/banned'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // 1. If the user does NOT have a session and tries to access a protected route
  if (!sessionId && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 2. If the user HAS a session and tries to access the login page again
  if (sessionId && isPublicRoute) {
    const dashboardUrl = new URL('/', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // 3. Otherwise, let them proceed
  return NextResponse.next();
}

// Ensure the middleware only runs on page routes, not on static files or Next.js internals
export const config = {
  runtime: 'experimental-edge',
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

// Fix for OpenNext components.ComponentMod.handler error
export const handler = middleware;

