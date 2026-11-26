import { type NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/verify-email',
  '/auth/forgot-password',
  '/auth/reset-password',
];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('refresh_token');

  if (!token) {
    const loginUrl = new URL('/auth/login', request.url);
    // Keep the query string so e.g. /warehouses?page=3 is restored exactly.
    loginUrl.searchParams.set('from', `${pathname}${search}`);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|api/).*)'],
};
