import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
  const hasAdminSession = request.cookies.has('admin_session');

  if (isAdminRoute && !hasAdminSession) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect to admin if already logged in and trying to access login page
  const isLoginRoute = request.nextUrl.pathname.startsWith('/login');
  if (isLoginRoute && hasAdminSession) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};
