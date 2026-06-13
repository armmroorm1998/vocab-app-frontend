import { NextRequest, NextResponse } from 'next/server';
import { FEATURE_FILL_BLANK_ENABLED } from '@/lib/features';

// List of public routes that don't require authentication
const PUBLIC_PATHS = ['/login', '/_next', '/favicon.ico', '/api'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!FEATURE_FILL_BLANK_ENABLED && pathname.startsWith('/fill-blank')) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = '/';
    return NextResponse.redirect(homeUrl);
  }

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Read cookies (set by client after login)
  const uid = request.cookies.get('uid')?.value;
  const recoverKey = request.cookies.get('recoverKey')?.value;

  // If not authenticated, redirect to /login
  if (!uid || !recoverKey) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)'],
};
