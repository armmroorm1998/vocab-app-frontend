import { NextRequest, NextResponse } from 'next/server';
import { FEATURE_FILL_BLANK_ENABLED } from '@/lib/features';

// List of public routes that don't require authentication
const PUBLIC_PATHS = ['/login', '/_next', '/favicon.ico', '/api'];

// Feature pages that require an active subscription or free-access bonus.
// Home, dashboard, and /contribute (the way to earn free access) stay open.
const GATED_PATHS = [
  '/vocabulary',
  '/flashcard',
  '/quiz',
  '/conversation-quiz',
  '/verb-forms',
  '/dictation',
  '/sentence-drill',
  '/fill-blank',
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function hasActiveAccess(uid: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/user/me`, { headers: { 'x-uid': uid } });
    // Fail-open on backend errors — this gate is a business rule, not a
    // security boundary, so a backend blip shouldn't lock everyone out.
    if (!res.ok) return true;
    const json = await res.json();
    const freeAccessUntil = json?.body?.freeAccessUntil;
    return !!freeAccessUntil && new Date(freeAccessUntil) > new Date();
  } catch {
    return true;
  }
}

export async function middleware(request: NextRequest) {
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

  const isGated = GATED_PATHS.some((path) => pathname.startsWith(path));
  if (isGated && !(await hasActiveAccess(uid))) {
    const contributeUrl = request.nextUrl.clone();
    contributeUrl.pathname = '/contribute';
    contributeUrl.search = '';
    contributeUrl.searchParams.set('locked', '1');
    return NextResponse.redirect(contributeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)'],
};
