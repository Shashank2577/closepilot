import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to protect routes that require authentication
 */
export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('access_token')?.value;
  const tokenExpiry = request.cookies.get('token_expiry')?.value;
  const path = request.nextUrl.pathname;

  // Public routes that don't require authentication
  const publicRoutes = ['/auth/signin', '/auth/callback'];
  const isPublicRoute = publicRoutes.some(route => path.startsWith(route));

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check if token exists and is not expired
  const isTokenValid = accessToken && tokenExpiry && Date.now() < parseInt(tokenExpiry);

  if (!isTokenValid) {
    // Redirect to signin if accessing protected route
    const url = request.nextUrl.clone();
    url.pathname = '/auth/signin';

    // Add redirect parameter to return after login
    if (path !== '/') {
      url.searchParams.set('redirect', path);
    }

    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
