import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'keypulse-auth';

export function proxy(request: NextRequest) {
  const authPassword = process.env.AUTH_PASSWORD;

  // If no password is configured, skip auth
  if (!authPassword) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Allow access to login page and login API
  if (pathname === '/login' || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Check authentication for all other routes
  const authCookie = request.cookies.get(AUTH_COOKIE_NAME);

  if (authCookie?.value !== authPassword) {
    // Redirect to login for pages, return 401 for API
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and _next
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
