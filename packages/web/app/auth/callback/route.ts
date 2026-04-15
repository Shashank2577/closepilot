import { NextRequest, NextResponse } from 'next/server';

/**
 * Google OAuth callback handler
 * This will be implemented by Jules session J-113
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // TODO: Implement OAuth callback
  // - Exchange code for tokens
  // - Store tokens securely
  // - Redirect to dashboard

  return NextResponse.redirect(new URL('/', request.url));
}
